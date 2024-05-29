import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clonare la richiesta e aggiungere l'intestazione Referrer
    const modifiedReq = req.clone({
      setHeaders: {
        Referrer: 'your-referrer-url' // Sostituisci con l'URL del tuo referrer
      }
    });

    console.log('Request:', modifiedReq);
    return next.handle(modifiedReq).pipe(
      tap(
        event => {
          console.log('Response:', event);
        },
        error => {
          console.error('Error:', error);
        }
      )
    );
  }
}
