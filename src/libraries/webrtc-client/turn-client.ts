import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export class TURNClient {
    constructor(
        private http: HttpClient,
        private referer: string
    ) {
    }

    requestTurnServers(url: string, callback: (turnServers: RTCIceServer[]) => void) {
        this.http.get<any>(url)
            .pipe(catchError(this.handleError))
            .subscribe(
                data => {
                    const iceServerUrl = data['ice_server_url'];
                    this.makeTurnServerRequest(iceServerUrl, callback);
                },
                error => {
                    console.log('Error ' + error);
                    callback(null);
                }
            );
    }

    private makeTurnServerRequest(url: string, callback: (turnServers: RTCIceServer[]) => void) {
        const httpOptions = {
            headers: new HttpHeaders({ 'referer': this.referer })
        };

        this.http.post<any>(url, null, httpOptions)
            .pipe(catchError(this.handleError))
            .subscribe(
                data => {
                    const iceServers: RTCIceServer[] = data['iceServers'];
                    callback(iceServers);
                },
                error => {
                    console.log('Error ' + error);
                    callback(null);
                }
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
