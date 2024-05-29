import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Storage } from '@capacitor/storage';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private apiUrl = 'https://www.gestime.it/Account/LoginSmart';
  private _isAuthenticated = signal<boolean>(false);
  private _user = signal<any>(null);

  constructor(private httpClient: HttpClient, private router: Router) {}

  get isAuthenticated() {
    return this._isAuthenticated.asReadonly();
  }

  get user() {
    return this._user.asReadonly();
  }

  async login(userEmail: string, password: string, rememberMe: boolean): Promise<any> {
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
          await this.setSession(responseData, rememberMe);
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

  private async setSession(user: any, rememberMe: boolean) {
    this._isAuthenticated.set(true);
    this._user.set(user);

    const userString = JSON.stringify(user); // Serialize the user object
    console.log('Saving user:', userString, 'Remember me:', rememberMe);
    if (rememberMe) {
      localStorage.setItem('user', userString); // Save user data to localStorage
      console.log('User saved in localStorage:', userString);
    } else {
      sessionStorage.setItem('user', userString);
      console.log('User saved in sessionStorage:', userString);
    }
  }


  async checkAuthenticationStatus() {
    const userStringLocalStorage = localStorage.getItem('user');
    console.log('User from localStorage:', userStringLocalStorage);
    if (userStringLocalStorage) {
      const user = JSON.parse(userStringLocalStorage); // Deserialize the user object
      this._isAuthenticated.set(true);
      this._user.set(user);
    } else {
      const { value: userString } = await Storage.get({ key: 'user' });
      console.log('User from Capacitor Storage:', userString);
      if (userString) {
        const user = JSON.parse(userString); // Deserialize the user object
        this._isAuthenticated.set(true);
        this._user.set(user);
      } else {
        this._isAuthenticated.set(false);
        this._user.set(null);
      }
    }
  }
  setUser(user: any) {
    this._user.set(user);
  }



}
