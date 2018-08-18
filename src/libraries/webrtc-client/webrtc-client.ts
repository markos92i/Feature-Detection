import { Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TURNClient } from './turn-client';
import { ResponseParser } from './register-response';
import { SignalResponse, SignalResultType, RegisterResponse, RegisterResultType, Message, MessageType } from './messages-types';
import { WebSocketChannel, WebSocketChannelDelegate, WebSocketChannelState } from './websocket-client';

export enum WebRTCClientState {
    disconnected,
    connecting,
    connected,
    registered,
    call
}

export interface WebRTCClientDelegate {
    webrtcClientState(state: WebRTCClientState);
    webrtcClientLocalStream(localVideoTrack: MediaStream);
    webrtcClientRemoteStream(remoteVideoTrack: MediaStream);
    webrtcClientError(error: Error);
}

const serverHost = environment.webrtc_server;
const serverContext = '';
const serverRegister = '/join';
const serverMessage = '/message';
const serverBye = '/leave';

const turnRequestUrl = environment.webrtc_turn_request_url;
const turnRefererUrl = environment.webrtc_turn_referer_url;

const defaultSTUNServerUrl = environment.webrtc_default_stun_server;
const defaultTURNServerUrl = environment.webrtc_default_turn_server;
const defaultTURNServerUser = environment.webrtc_default_turn_server_user;
const defaultTURNServerPass = environment.webrtc_default_turn_server_pass;

export class WebRTCClient implements WebSocketChannelDelegate {
    private state: WebRTCClientState;
    private messageQueue: any[];
    private config: RTCConfiguration;
    private serverHostUrl: string;
    private turnClient: TURNClient;

    private channel: WebSocketChannel;

    private peerConnection: RTCPeerConnection;
    private isTurnComplete = false;
    private isHasReceivedSdp = false;
    private roomId = '';
    private clientId = '';
    private isNegotiationNeeded = true;
    private isInitiator = false;
    private webSocketURL: string;
    private webSocketRestURL: string;

    private localStream: MediaStream;

    constructor(
        private injector: Injector,
        private http: HttpClient,
        private delegate: WebRTCClientDelegate
    ) {
        this.delegate = delegate;
        this.state = WebRTCClientState.disconnected;
        this.messageQueue = [];
        this.config = { iceServers: [] };
        this.serverHostUrl = serverHost;
        this.turnClient = new TURNClient(this.injector.get(HttpClient), turnRefererUrl);
    }

    setState(state: WebRTCClientState) {
        if (this.state === state) { return; }
        this.state = state;
        this.delegate.webrtcClientState(this.state);
    }

    connectToRoom(roomId: string) {
        this.setState(WebRTCClientState.connecting);
        // Register with room server.
        this.registerWithRoomServer(roomId)
            .subscribe(
                (response: RegisterResponse) => {
                    console.log(JSON.stringify(response));
                    if (response.result !== RegisterResultType.success) {
                        console.log('Failed to register with room server. Result: ' + response.result);
                        this.disconnect();
                        const error = Error('Room is full.');
                        this.delegate.webrtcClientError(error);
                        return;
                    }
                    console.log('Registered with room server.');
                    this.roomId = response.params.room_id;
                    this.clientId = response.params.client_id;
                    this.isInitiator = response.params.is_initiator;
                    response.params.messages.forEach((message: Message) => {
                        if (message.type === MessageType.offer || message.type === MessageType.answer) {
                            this.isHasReceivedSdp = true;
                            this.messageQueue.splice(0, 0, message);
                        } else {
                            this.messageQueue.push(message);
                        }
                    });
                    this.webSocketURL = response.params.wss_url;
                    if (response.params.wss_post_url) {
                        this.webSocketRestURL = response.params.wss_post_url;
                    } else {
                        this.webSocketRestURL = environment.webrtc_turn_request_url;
                    }
                    if (response.params.pc_config.iceServers != null) {
                        const iceServers = ResponseParser.parseIceServers(response.params.pc_config.iceServers);
                        this.config.iceServers = this.config.iceServers.concat(iceServers);
                        this.isTurnComplete = true;
                        this.registerWithColliderIfReady();
                    } else {
                        // Request STUN and TURN servers.
                        this.turnClient.requestTurnServers(
                            response.params.ice_server_url,
                            (turnServers: RTCIceServer[]) => {
                                if (turnServers != null) {
                                    this.config.iceServers = this.config.iceServers.concat(turnServers);
                                } else {
                                    this.config.iceServers = this.defaultSTUNServer();
                                }
                                this.isTurnComplete = true;
                                this.registerWithColliderIfReady();
                            }
                        );
                    }
                },
                error => {
                    console.log('Error ' + error);
                    const errorData = Error('Room server network error');
                    this.delegate.webrtcClientError(errorData);
                    console.log('Error registering with room server');
                }
            );
    }

    disconnect() {
        if (this.state === WebRTCClientState.disconnected) { return; }
        if (this.isRegisteredWithRoomServer()) {
            this.unregisterWithRoomServer();
        }
        if (this.channel != null) {
            // Tell the other client we're hanging up.
            const byeMessage = { type: MessageType.bye };
            this.channel.send(byeMessage);
            // Disconnect from collider.
            this.channel.disconnect();
        }
        this.stopVideoStream(); // Stop video stream
        this.clientId = '';
        this.roomId = '';
        this.isInitiator = false;
        this.isHasReceivedSdp = false;
        this.messageQueue = [];
        if (this.peerConnection) { this.peerConnection.close(); }
        this.setState(WebRTCClientState.disconnected);
    }

    private isRegisteredWithRoomServer(): boolean {
        return this.clientId.length > 0;
    }

    private startSignalingIfReady() {
        if (!this.isTurnComplete || !this.isRegisteredWithRoomServer()) { return; }
        this.setState(WebRTCClientState.connected);

        try {
            // Create peer connection.
            this.peerConnection = new RTCPeerConnection(this.config);
            this.setPeerConnectionListeners();

            // Add local stream
            const constraints: MediaStreamConstraints = this.defaultStreamConstraints();
            navigator.mediaDevices
                .getUserMedia(constraints)
                .then((stream: MediaStream) => {
                    const videoConstraints = { aspectRatio: 1 };
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks.length) {
                        const videoTrack = videoTracks[0];
                        const ratio = videoTrack.getSettings().aspectRatio;
                        if (ratio) { videoTrack.applyConstraints(videoConstraints); }
                    }

                    this.localStream = stream;
                    this.peerConnection.addStream(stream);
                    this.delegate.webrtcClientLocalStream(stream);
                    if (this.isInitiator) {
                        this.isNegotiationNeeded = false;
                        const offerOptions = this.defaultOfferConstraints();
                        // this.peerConnection.createOffer(offerOptions)
                        //     .then((desc: RTCSessionDescriptionInit) => {
                        //         this.didCreateSessionDescription(new RTCSessionDescription(desc));
                        //         this.isNegotiationNeeded = true;
                        //     })
                        //     .catch((error: DOMError) => { console.log('Error setting remote description: ' + error); });
                        this.peerConnection.createOffer(
                            (desc: RTCSessionDescriptionInit) => {
                                this.didCreateSessionDescription(new RTCSessionDescription(desc));
                                this.isNegotiationNeeded = true;
                            },
                            (error: DOMError) => { console.log('Error setting remote description: ' + error); },
                            offerOptions
                        );
                    } else {
                        this.processMessageQueueIfReady();
                    }
                })
                .catch((error: Error) => {
                    console.log('Error name: ' + error.name);
                    console.log('Error message: ' + error.message);
                    console.log('Error stack trace: ' + error.stack);
                });
        } catch (error) {
            this.delegate.webrtcClientError(new Error('Error al iniciar la videollamada'));
        }

    }

    private processMessageQueueIfReady() {
        if (!this.peerConnection || !this.isHasReceivedSdp) { return; }
        this.messageQueue.forEach(message => {
            this.processSignalingMessage(message);
        });
        this.messageQueue = [];
    }

    private processSignalingMessage(message: any) {
        switch (message.type) {
            case 'offer':
                this.peerConnection.setRemoteDescription(new RTCSessionDescription(message))
                    .then(() => { console.log('setRemoteDescription() -> success'); })
                    .catch((error: Error) => { this.didSetSessionDescriptionError(error); });
                this.peerConnection.createAnswer()
                    .then((desc: RTCSessionDescriptionInit) => { this.didCreateSessionDescription(new RTCSessionDescription(desc)); })
                    .catch((error: Error) => { this.didSetSessionDescriptionError(error); });
                break;
            case 'answer':
                this.peerConnection.setRemoteDescription(new RTCSessionDescription(message))
                .then(() => { console.log('setRemoteDescription() -> success'); })
                .catch((error: Error) => { this.didSetSessionDescriptionError(error); });
                break;
            case 'candidate':
                const candidate = new RTCIceCandidate({ sdpMLineIndex: message.label, candidate: message.candidate });
                this.peerConnection.addIceCandidate(candidate)
                    .then(() => { console.log('addIceCandidate(candidate) -> Success'); })
                    .catch(error => { console.log('addIceCandidate(candidate) -> Failure ' + error); });
                break;
            case 'bye':
                this.disconnect();
                break;
            default: console.warn('WARNING: unexpected message: ' + JSON.stringify(message));
        }
    }

    private send(message: any) {
        if (this.isInitiator) {
            this.sendSignalingMessage(message);
        } else {
            this.channel.send(message);
        }
    }

    private sendSignalingMessage(message: Message) {
        const data = JSON.stringify(message);
        const url = this.serverHostUrl + serverContext + serverMessage + '/' + this.roomId + '/' + this.clientId;
        const httpOptions = { headers: new HttpHeaders({}) };

        console.log('C->RS POST: ' + data);

        this.http.post<HttpResponse<SignalResponse>>(url, data, httpOptions)
            .pipe(catchError(this.handleError))
            .subscribe(
                (response: HttpResponse<SignalResponse>) => {
                    switch (response.body.result) {
                        case SignalResultType.success: break;
                        case SignalResultType.unknown: this.delegate.webrtcClientError(new Error('Unknown error.')); break;
                        case SignalResultType.invalidClient: this.delegate.webrtcClientError(new Error('Invalid client.')); break;
                        case SignalResultType.invalidRoom: this.delegate.webrtcClientError(new Error('Invalid room.')); break;
                    }
                },
                error => {
                    console.log('Error ' + error);
                    this.delegate.webrtcClientError(error);
                }
            );
    }

    // MARK: - Room server methods
    registerWithRoomServer(roomId: string): Observable<any> {
        console.log('Registering with room server.');
        const url = this.serverHostUrl + serverContext + serverRegister + '/' + roomId;
        const httpOptions = { headers: new HttpHeaders({}) };

        console.log('C->RS: JOIN');

        return this.http.post<HttpResponse<any>>(url, null, httpOptions)
            .pipe(catchError(this.handleError));
    }

    unregisterWithRoomServer() {
        console.log('Unregistering with room server.');
        const url = this.serverHostUrl + serverContext + serverBye + '/' + this.roomId + '/' + this.clientId;
        const httpOptions = { headers: new HttpHeaders({}) };

        console.log('C->RS: BYE');

        this.http.post<HttpResponse<any>>(url, null, httpOptions)
            .pipe(catchError(this.handleError))
            .subscribe(
                data => console.log('Unregistered from room server.'),
                error => console.log('Failed to unregister from room server.')
            );
    }

    // MARK: - Defaults
    defaultStreamConstraints(): MediaStreamConstraints {
        const constraints: MediaStreamConstraints = {
            video: {
                width: 1920,
                height: 1080,
                facingMode: 'user', // user || environment
            },
            audio: true
        };

        return constraints;
    }
    defaultOfferConstraints(): RTCOfferOptions {
        return { offerToReceiveAudio: 1, offerToReceiveVideo: 1, iceRestart: true, voiceActivityDetection: true };
    }
    defaultSTUNServer(): RTCIceServer[] {
        return [{ urls: defaultSTUNServerUrl }];
    }
    defaultTURNServer(): RTCIceServer[] {
        return [{ urls: defaultTURNServerUrl, username: defaultTURNServerUser, credential: defaultTURNServerPass }];
    }

    // MARK: - Stop video stream
    stopVideoStream() {
        if (this.localStream) {
            const tracks = this.localStream.getTracks();
            tracks.forEach((track) => { track.stop(); });
        }
    }


    // MARK: - Collider methods
    private registerWithColliderIfReady() {
        if (!this.isRegisteredWithRoomServer()) { return; }
        // Open WebSocket connection.
        this.channel = new WebSocketChannel(this.injector.get(HttpClient), this.webSocketURL, this.webSocketRestURL, this);
        this.channel.register(this.roomId, this.clientId);
    }

    // MARK: - WebSocketChannelDelegate
    websocketState(state: WebSocketChannelState) {
        switch (state) {
            case WebSocketChannelState.opened: break;
            case WebSocketChannelState.registered: this.startSignalingIfReady(); break;
            case WebSocketChannelState.closed: this.disconnect(); break;
            case WebSocketChannelState.error: this.disconnect(); break;
        }
    }
    websocketMessage(message: any) {
        switch (message.type) {
            case 'offer':
                this.isHasReceivedSdp = true;
                this.messageQueue.splice(0, 0, message);
                break;

            case 'answer':
                this.isHasReceivedSdp = true;
                this.messageQueue.splice(0, 0, message);
                break;

            case 'candidate':
                this.messageQueue.push(message);
                break;

            case 'bye':
                this.processSignalingMessage(message);
                return;
        }
        this.processMessageQueueIfReady();
    }

    didCreateSessionDescription(sdp: RTCSessionDescription) {
        console.log('Setting local description');
        this.peerConnection.setLocalDescription(sdp)
            .then(
                () => { console.log('setLocalDescription() -> success'); },
                (error) => { this.didSetSessionDescriptionError(error); }
            );
        // Signal to server to pass this sdp with for the session call
        // const message = new SessionDescriptionMessage(sdp);
        this.send(sdp);
    }

    didSetSessionDescriptionError(errorMsg: Error) {
        console.log('didSetSessionDescriptionError');
        if (!this.isInitiator && this.peerConnection.localDescription == null) {
            // const constraints: RTCOfferAnswerOptions = this.defaultOfferConstraints();
            this.peerConnection.createAnswer()
                .then((desc: RTCSessionDescriptionInit) => { this.didCreateSessionDescription(new RTCSessionDescription(desc)); })
                .catch((error: Error) => { console.log('Error setting remote description: ' + error); });
        }
    }

    setPeerConnectionListeners() {
        this.peerConnection.onsignalingstatechange = (ev: Event) => {
            console.log(ev.type + ' ' + this.peerConnection.signalingState);
        };
        this.peerConnection.oniceconnectionstatechange = (ev: Event) => {
            console.log(ev.type + ' ' + this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState === 'failed') {
                this.delegate.webrtcClientError(new Error('Error al iniciar la videollamada'));
            }
        };
        this.peerConnection.onnegotiationneeded = (ev: Event) => {
            console.log(ev.type);
            if (this.isNegotiationNeeded) {
                this.isNegotiationNeeded = false;
                const offerOptions = this.defaultOfferConstraints();
                this.peerConnection.createOffer(
                    (desc: RTCSessionDescriptionInit) => {
                        this.didCreateSessionDescription(new RTCSessionDescription(desc));
                        this.isNegotiationNeeded = true;
                    },
                    (error: DOMError) => { console.log('Error setting remote description: ' + error); },
                    offerOptions
                );
                // this.peerConnection.createOffer(offerOptions)
                //     .then((desc: RTCSessionDescriptionInit) => {
                //         this.didCreateSessionDescription(new RTCSessionDescription(desc));
                //         this.isNegotiationNeeded = true;
                //     })
                //     .catch((error: DOMError) => { console.log('Error setting remote description: ' + error); });
            }
        };
        this.peerConnection.onicegatheringstatechange = (ev: Event) => {
            console.log(ev.type + ' ' + this.peerConnection.iceGatheringState);
        };
        this.peerConnection.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
            console.log(ev.type);
            if (ev.candidate) {
                const message = {
                    type: 'candidate',
                    candidate: ev.candidate.candidate,
                    id: ev.candidate.sdpMid,
                    label: ev.candidate.sdpMLineIndex
                };
                this.send(message);
            } else {
                console.log('End of candidates.');
            }
        };

        this.peerConnection.onaddstream = (ev: MediaStreamEvent) => {
            console.log(ev.type);
            this.delegate.webrtcClientRemoteStream(ev.stream);
        };

        // this.peerConnection.ontrack = (ev: RTCTrackEvent) => {
        //     console.log(ev.type);
        //     const stream = ev.streams[0];
        //     if (stream) {
        //         this.delegate.appClientRemoteStream(this, stream);
        //     }
        // };

        this.peerConnection.onremovestream = (ev: MediaStreamEvent) => {
            console.log(ev.type);
        };
    }

    private handleError(error: HttpErrorResponse) {
        if (error.error instanceof ErrorEvent) {
            // A client-side or network error occurred. Handle it accordingly.
            console.error('An error occurred:', error.error.message);
        } else {
            // The backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong,
            console.error('Backend returned code ' + error.status + ' body was: ' + error.error);
        }
        // Return an ErrorObservable with a user-facing error message
        return throwError('Something bad happened; please try again later.');
    }

}
