export enum SignalResultType {
    unknown = 'UNKNOWN',
    success = 'SUCCESS',
    invalidRoom = 'INVALID_ROOM',
    invalidClient = 'INVALID_CLIENT'
}
export interface SignalResponse {
    result: SignalResultType;
    [key: string]: any;
}


export enum RegisterResultType {
    unknown = 'UNKNOWN',
    success = 'SUCCESS',
    full = 'FULL'
}
export interface RegisterParams {
    is_initiator: boolean;
    is_loopback: boolean;
    room_link: string;
    room_id: string;
    client_id: string;
    messages: Message[];
    warning_messages: any[];
    error_messages: any[];
    pc_config: RTCConfiguration;
    pc_constraints: any;
    media_constraints: MediaStreamConstraints;
    offer_options: RTCOfferOptions;
    ice_server_url: string;
    turn_transports: string;
    turn_url: string;
    wss_url: string;
    wss_post_url: string;
}
export interface RegisterResponse {
    result: RegisterResultType;
    params: RegisterParams;
}


export enum MessageType {
    offer = 'offer',
    answer = 'answer',
    candidate = 'candidate',
    bye = 'bye'
}
export interface Message {
    type: MessageType;
    [key: string]: any;
}
