import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private alertController: AlertController) {}

  async presentAlert(header: string, message: string, buttons: string[] = ['OK']) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons
    });

    await alert.present();
    return await alert.onDidDismiss();
  }

  async presentSuccessAlert(message: string) {
    await this.presentAlert('Successo', message);
  }

  async presentErrorAlert(message: string) {
    await this.presentAlert('Errore', message);
  }
}
