export class ResponseParser {
    public static parseIceServers(iceServers: RTCIceServer[]): RTCIceServer[] {
        const servers: RTCIceServer[] = [];
        iceServers.forEach(value => {
            let url = value['url'];
            let username = value['username'];
            let credential = value['credential'];

            const uri = new URL(url);
            const hasUser = uri.pathname.split('@');
            const hasPass = hasUser[0].split(':');

            if (hasUser.length > 1) {
                url = uri.protocol + hasUser[1];
                if (hasPass.length > 1) {
                    username = hasPass[0];
                    credential = hasPass[1];
                } else {
                    username = hasUser[0];
                }
            }

            const iceServer: RTCIceServer = { urls: url, username: username, credential: credential };
            servers.push(iceServer);
        });
        return servers;
    }
}
