import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { AlertService } from '../../providers/alert.service';
import { LoginService } from '../../providers/login.service';
import { TimbraService } from '../../providers/timbra.service';
import { LoadingService } from '../../providers/loading.service';
import { NativeBiometric } from 'capacitor-native-biometric';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  userEmail: string = '';
  password: string = '';
  rememberMe: boolean = false;
  enableBiometrics: boolean = false; // Aggiunta questa proprietà
  isPwd: boolean = false;
  isToast: boolean = false;
  toastMessage: string = '';
  biometricsEnabled: boolean = false;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private alertService: AlertService,
    private timbratureService: TimbraService,
    private loadingService: LoadingService // Usa il servizio
  ) {}

  async ngOnInit() {
    // Controlla se l'autenticazione biometrica è abilitata
    this.biometricsEnabled = localStorage.getItem('BiometricsEnabled') === 'true';
    if (this.biometricsEnabled) {
      await this.biometricLogin();
    }
  }

  togglePwd() {
    this.isPwd = !this.isPwd;
  }

  async login() {
    try {
      const response = await this.loginService.login(this.userEmail, this.password, this.rememberMe, this.enableBiometrics);
      console.log('Login successful', response);
      this.timbratureService.setUser(response);
      await this.alertService.presentSuccessAlert('Login effettuato con successo');
      const navigationExtras: NavigationExtras = {
        state: {
          user: response
        }
      };
      this.router.navigate(['/timbra-new'], navigationExtras);
    } catch (error) {
      console.log('Login failed', error);
      await this.alertService.presentErrorAlert('Email o password errata. Per favore riprova.');
    }
  }

  async biometricLogin() {
    try {
      const result = await NativeBiometric.isAvailable();
      if (!result.isAvailable) {
        return;
      }

      const verified = await NativeBiometric.verifyIdentity({
        reason: 'Authentication',
        title: 'Log in',
        useFallback: true,
        maxAttempts: 2,
      })
        .then(() => true)
        .catch(() => false);

      if (!verified) {
        return;
      }

      const credentials = await NativeBiometric.getCredentials({
        server: 'www.gestime.it',
      });

      if (credentials) {
        this.userEmail = credentials.username;
        this.password = credentials.password;
        await this.login();
      }
    } catch (e) {
      console.error('Biometric authentication failed', e);
      await this.alertService.presentErrorAlert('Autenticazione biometrica fallita. Per favore riprova.');
    }
  }

  openToast(msg: string) {
    this.isToast = true;
    this.toastMessage = msg;
  }
}
