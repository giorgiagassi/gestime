import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { Http } from '@capacitor-community/http';

@Injectable({
  providedIn: 'root'
})
export class TimbraService {
  private apiEntrata = 'https://www.gestime.it/Account/Entrata';
  private apiUscita = 'https://www.gestime.it/Account/Uscita';
  private _user = signal<any>(null);

  constructor(private http: HttpClient) { }

  get user() {
    return this._user.asReadonly();
  }

  setUser(userData: any) {
    this._user.set(userData);
  }

  entrata(userId: string): Observable<any> {
    const headers = { 'Content-Type': 'application/json', 'User': userId };

      const httpOptions = {
        headers: new HttpHeaders(headers)
      };
      return this.http.get(this.apiEntrata, httpOptions)
        .pipe(
          map(response => {
            console.log('Entrata response:', response); // Log di debug
            return response;
          }),
          catchError(this.handleError)
        );

  }

  uscita(userId: string): Observable<any> {
    const headers = { 'Content-Type': 'application/json', 'User': userId };

      const httpOptions = {
        headers: new HttpHeaders(headers)
      };
      return this.http.get(this.apiUscita, httpOptions)
        .pipe(
          map(response => {
            console.log('Uscita response:', response); // Log di debug
            return response;
          }),
          catchError(this.handleError)
        );

  }

  private handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(errorMessage);
  }
}
