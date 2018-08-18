import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Message } from './messages-types';

export enum WebSocketChannelState {
    closed, // State when disconnected.
    opened, // State when connection is established but not ready for use.
    registered, // State when connection is established and registered.
    error // State when connection encounters a fatal error.
}

export interface WebSocketChannelDelegate {
    websocketState(state: WebSocketChannelState);
    websocketMessage(message: any);
}

const errorKey = 'error';
const payloadKey = 'msg';

export class WebSocketChannel {
    state: WebSocketChannelState;
    roomId: string;
    clientId: string;

    private socket: WebSocket;

    constructor(
        private http: HttpClient,
        private url: string,
        private restURL: string,
        private delegate: WebSocketChannelDelegate
    ) {
        this.state = WebSocketChannelState.closed;
        this.roomId = '';
        this.clientId = '';

        this.start();
    }

    /**
     * Listeners de websocket
     */
    start() {
        console.log('Opening WebSocket.');
        this.socket = new WebSocket(this.url);
        this.socket.onopen = (event: Event) => {
            console.log('Websocket opened');
            this.setState(WebSocketChannelState.opened);
            if (this.roomId.length !== 0 && this.clientId.length !== 0) {
                this.registerWithCollider();
            }
        };

        this.socket.onerror = (event: Event) => {
            console.log('Websocket error: ' + event);
        };

        this.socket.onclose = (event: CloseEvent) => {
            console.log('Websocket closed: ' + event.code);
            this.setState(WebSocketChannelState.closed);
        };

        this.socket.onmessage = (event: MessageEvent) => {
            console.log('WSS->C: ' + event.data);

            const message = JSON.parse(event.data);
            const error = message[errorKey];
            const payload = message[payloadKey];
            if (error.length !== 0) { console.log('WSS error: \(error)'); return; }

            this.delegate.websocketMessage(payload);
        };
    }

    setState(state: WebSocketChannelState) {
        if (this.state === state) { return; }
        this.state = state;
        this.delegate.websocketState(this.state);
    }

    register(roomId: string, clientId: string) {
        this.roomId = roomId;
        this.clientId = clientId;
        if (this.state === WebSocketChannelState.opened) {
            this.registerWithCollider();
        }
    }

    private registerWithCollider() {
        if (this.state === WebSocketChannelState.registered) { return; }
        // Registration can fail if server rejects it. For example, if the room is full.
        const message = {
            cmd: 'register',
            roomid: this.roomId,
            clientid: this.clientId
        };
        console.log('C->WSS: ' + JSON.stringify(message));
        this.socket.send(JSON.stringify(message));
        this.setState(WebSocketChannelState.registered);
    }

    send(message: Message) {
        if (this.state === WebSocketChannelState.registered) {
            const body = {
                cmd: 'send',
                msg: message
            };
            console.log('C->WSS: ' + JSON.stringify(body));
            this.socket.send(JSON.stringify(body));
        } else {
            const url = this.restURL + '/' + this.roomId + '/' + this.clientId;
            const httpOptions = { headers: new HttpHeaders({}) };
            console.log('C->WSS POST: ' + JSON.stringify(message));
            this.http.post<any>(url, message, httpOptions)
                .pipe(catchError(this.handleError))
                .subscribe(
                    data => console.log('C->WSS POST response OK: ' + data),
                    error => console.log('C->WSS POST response ERROR: ' + error)
                );
        }
    }

    disconnect() {
        if (this.state === WebSocketChannelState.closed || this.state === WebSocketChannelState.error) { return; }
        this.socket.close();
        console.log('C->WSS DELETE rid:' + this.roomId + 'cid:' + this.clientId);
        const url = this.restURL + '/' + this.roomId + '/' + this.clientId;
        const httpOptions = { headers: new HttpHeaders({}) };
        this.http.delete<any>(url, httpOptions)
            .pipe(catchError(this.handleError))
            .subscribe(
                data => console.log('C->WSS DELETE response OK'),
                error => console.log('C->WSS DELETE response ERROR: ' + error)
            );
    }

    private handleError(error: HttpErrorResponse) {
        if (error.error instanceof ErrorEvent) {
            // A client-side or network error occurred. Handle it accordingly.
            console.error('An error occurred:', error.error.message);
        } else {
            // The backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong,
            console.error('Backend returned code ' + error.status + ' body was: ' + JSON.stringify(error.error));
        }
        // return an ErrorObservable with a user-facing error message
        return throwError('Something bad happened; please try again later.');
    }

}
