import { Component } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { AlertService } from '../../providers/alert.service';
import { LoginService } from '../../providers/login.service';
import { TimbraService } from '../../providers/timbra.service';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  userEmail = '';
  password = '';
  rememberMe = false;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private alertService: AlertService,
    private timbratureService: TimbraService,
    private loadingController: LoadingController // Aggiungi questa linea
  ) {}

  async presentLoading(message: string) {
    const loading = await this.loadingController.create({
      message: message,
    });
    await loading.present();
    return loading;
  }

  async dismissLoading(loading:any) {
    await loading.dismiss();
  }

  async login() {
    const loading = await this.presentLoading('Accedendo...');

    try {
      const response = await this.loginService.login(this.userEmail, this.password, this.rememberMe);
      console.log('Login successful', response);
      this.timbratureService.setUser(response); // Assuming setUser is synchronous
      await this.dismissLoading(loading);
      await this.alertService.presentSuccessAlert('Login effettuato con successo');

      // Save user data to localStorage if rememberMe is checked
      if (this.rememberMe) {
        localStorage.setItem('user', JSON.stringify(response));
      }

      setTimeout(() => {
        const navigationExtras: NavigationExtras = {
          state: {
            user: response
          }
        };
        this.router.navigate(['/timbra-new'], navigationExtras);
      }, 500); // Delay of 500 milliseconds
    } catch (error) {
      console.log('Login failed', error);
      await this.dismissLoading(loading);
      await this.alertService.presentErrorAlert('Email o password errata. Per favore riprova.');
    }
  }

}
