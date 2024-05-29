import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { NativeBiometric } from 'capacitor-native-biometric';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private apiUrl = 'https://www.gestime.it/Account/LoginSmart';
  private urlUserData = 'https://www.gestime.it/Account/GetUserData';
  private _isAuthenticated = signal<boolean>(false);
  private _user = signal<any>(null);

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private alertController: AlertController
  ) {}

  get isAuthenticated() {
    return this._isAuthenticated.asReadonly();
  }

  get user() {
    return this._user.asReadonly();
  }

  async login(userEmail: string, password: string, rememberMe: boolean, enableBiometrics: boolean): Promise<any> {
    const loginData = {
      UserEmail: userEmail,
      Password: password,
      RememberMe: rememberMe
    };

    const headers = { 'Content-Type': 'application/json' };

    console.log('Request:', { url: this.apiUrl, headers, data: loginData });

    return this.httpClient.post(this.apiUrl, loginData, { headers: new HttpHeaders(headers) }).toPromise().then(async response => {
      console.log('Response received:', response);

      if (response) {
        let responseData;
        try {
          responseData = typeof response === 'string' ? JSON.parse(response) : response;
        } catch (error) {
          console.error('Error parsing response data:', error);
          throw new Error('Error parsing response data');
        }

        if (responseData && responseData.id) {
          await this.setSession(responseData.id, rememberMe);

          // Abilita l'autenticazione biometrica se la checkbox è selezionata
          if (enableBiometrics) {
            await this.storeBiometricCredentials(userEmail, password);
            localStorage.setItem('BiometricsEnabled', 'true');
          }

          return responseData;
        } else {
          console.error('Invalid response format: User data not found');
          throw new Error('Invalid response format: User data not found');
        }
      } else {
        console.error('No response data');
        throw new Error('No response data');
      }
    }).catch(error => {
      console.error('Error during login:', error);
      return Promise.reject(error);
    });
  }

  private async setSession(userId: string, rememberMe: boolean) {
    this._isAuthenticated.set(true);
    this._user.set({ id: userId });

    console.log('Saving user ID:', userId, 'Remember me:', rememberMe);
    if (rememberMe) {
      localStorage.setItem('User', userId); // Save user ID to localStorage
      localStorage.setItem('RememberMe', 'true'); // Save remember me status to localStorage
      console.log('User ID and Remember Me status saved in localStorage:', userId);
    } else {
      sessionStorage.setItem('User', userId); // Save user ID to sessionStorage
      sessionStorage.setItem('RememberMe', 'false'); // Save remember me status to sessionStorage
      console.log('User ID saved in sessionStorage:', userId);
    }
  }

  async checkAuthenticationStatus() {
    const rememberMe = localStorage.getItem('RememberMe') === 'true';
    const userId = rememberMe ? localStorage.getItem('User') : sessionStorage.getItem('User');
    console.log('User ID from storage:', userId);
    if (userId) {
      try {
        const user = await this.getuserData(userId).toPromise();
        this._isAuthenticated.set(true);
        this._user.set(user);
      } catch (error) {
        console.error('Failed to load user data from API:', error);
        this._isAuthenticated.set(false);
        this._user.set(null);
      }
    } else {
      this._isAuthenticated.set(false);
      this._user.set(null);
    }
  }

  async storeBiometricCredentials(username: string, password: string): Promise<void> {
    try {
      await NativeBiometric.setCredentials({
        username: username,
        password: password,
        server: "www.gestime.it"
      });
    } catch (e) {
      console.error('Failed to store biometric credentials', e);
    }
  }

  setUser(user: any) {
    this._user.set(user);
  }

  getuserData(userId: string): Observable<any> {
    const headers = { 'Content-Type': 'application/json', 'User': userId };

    const httpOptions = {
      headers: new HttpHeaders(headers)
    };
    return this.httpClient.get(this.urlUserData, httpOptions)
      .pipe(
        map(response => {
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
