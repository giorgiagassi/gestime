import { Component, OnInit, HostListener } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { TimbraService } from '../../providers/timbra.service';
import { AlertService } from '../../providers/alert.service';
import { Router } from '@angular/router';
import { Storage } from '@capacitor/storage';


@Component({
  selector: 'app-timbra',
  templateUrl: './timbra.page.html',
  styleUrls: ['./timbra.page.scss'],
})
export class TimbraPage implements OnInit {
  user: any;
  isNearLocation: boolean = false;
  targetLocation = { latitude: 40.9701101, longitude: 17.1134034 };
  distanceThreshold = 30;
  canCheckIn: boolean = false;
  canCheckOut: boolean = false;
  canStartBreak: boolean = false;
  canEndBreak: boolean = false;
  timbrature: any[] = [];

  constructor(
    private alertController: AlertController,
    private alertService: AlertService,
    private router: Router,
    private timbratureService: TimbraService,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    console.log('ngOnInit - Loading user data');
    const navigation = this.router.getCurrentNavigation();

    if (navigation && navigation.extras && navigation.extras.state && navigation.extras.state['user']) {
      this.user = navigation.extras.state['user'];
      console.log('User data loaded from navigation:', this.user);
    } else {
      const userStringLocalStorage = localStorage.getItem('user');
      if (userStringLocalStorage) {
        this.user = JSON.parse(userStringLocalStorage);
        console.log('User data loaded from localStorage:', this.user);
      } else {
        const { value } = await Storage.get({ key: 'user' });
        if (value) {
          this.user = JSON.parse(value);
          console.log('User data loaded from storage:', this.user);
        } else {
          console.error('Failed to load user data');
          this.showAlert('Errore', 'Impossibile caricare i dati utente.');
        }
      }
    }

    if (this.user) {
      this.updateButtonStates();
      this.timbrature = this.getUserTimbrature();
    }

    await this.requestGeolocationPermission();
    this.checkCurrentLocation();
  }


  async presentLoading(message: string) {
    const loading = await this.loadingController.create({
      message: message,
    });
    await loading.present();
    return loading;
  }

  async dismissLoading(loading: any) {
    await loading.dismiss();
  }

  async requestGeolocationPermission() {
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    try {
      const hasPermission = await Geolocation.checkPermissions();
      if (hasPermission.location !== 'granted') {
        const requestPermission = await Geolocation.requestPermissions();
        if (requestPermission.location !== 'granted') {
          this.showAlert('Permesso Negato', 'Impossibile ottenere la posizione. Assicurati di avere i permessi necessari.');
        }
      }
    } catch (error) {
      this.showAlert('Errore di Permesso', 'Errore durante la richiesta dei permessi di geolocalizzazione.');
    }
  }

  async checkCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      const distance = this.calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        this.targetLocation.latitude,
        this.targetLocation.longitude
      );

      this.isNearLocation = distance <= this.distanceThreshold;

      if (!this.isNearLocation) {
        this.showAlert('Troppo distante', 'Sei troppo lontano dalla posizione richiesta.');
      }
    } catch (error) {
      this.showAlert('Errore di geolocalizzazione', 'Impossibile ottenere la posizione. Assicurati che la geolocalizzazione sia attiva e riprova.');
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }

  updateButtonStates() {
    if (this.user) {
      this.canCheckIn = !this.user.checkInTime;
      this.canEndBreak = this.user.checkInTime && !this.user.checkOutTimePausa && !this.user.checkInTimePausa && !this.user.checkOutTime;
      this.canStartBreak = this.user.checkInTime && this.user.checkOutTimePausa && !this.user.checkInTimePausa && !this.user.checkOutTime;
      this.canCheckOut = this.user.checkInTimePausa && !this.user.checkOutTime;

      if (this.user.checkInTime && this.user.checkOutTime && this.user.checkOutTimePausa && this.user.checkInTimePausa) {
        this.canCheckIn = false;
        this.canCheckOut = false;
        this.canStartBreak = false;
        this.canEndBreak = false;
      }
    }
  }

  getUserTimbrature(): any[] {
    const timbrature = [];

    if (this.user) {
      if (this.user.checkInTime) {
        timbrature.push({ type: 'Entrata', time: this.user.checkInTime, order: 1 });
      }
      if (this.user.checkOutTimePausa) {
        timbrature.push({ type: 'Uscita Pausa', time: this.user.checkOutTimePausa, order: 2 });
      }
      if (this.user.checkInTimePausa) {
        timbrature.push({ type: 'Entrata Pausa', time: this.user.checkInTimePausa, order: 3 });
      }
      if (this.user.checkOutTime) {
        timbrature.push({ type: 'Uscita', time: this.user.checkOutTime, order: 4 });
      }
    }

    return timbrature.sort((a, b) => a.order - b.order);
  }

  async onCheckIn() {
    if (!this.user || !this.user.id) {
      console.error('User data is not available');
      return;
    }

    const loading = await this.presentLoading('Registrando l\'entrata...');

    this.timbratureService.entrata(this.user.id).subscribe(
      async (response) => {
        console.log('Entrata', response);
        this.user.checkInTime = new Date().toISOString();
        await this.updateUserSessionData();
        this.updateButtonStates();
        this.timbrature = this.getUserTimbrature();
        await this.dismissLoading(loading);
        await this.alertService.presentSuccessAlert('Entrata registrata con successo');
      },
      async (error) => {
        console.error('Errore Entrata', error);
        await this.dismissLoading(loading);
        await this.alertService.presentErrorAlert('Errore durante la registrazione dell\'entrata.');
      }
    );
  }

  async onCheckOut() {
    if (!this.user || !this.user.id) {
      console.error('User data is not available');
      return;
    }

    const loading = await this.presentLoading('Registrando l\'uscita...');

    this.timbratureService.uscita(this.user.id).subscribe(
      async (response) => {
        console.log('Uscita', response);
        this.user.checkOutTime = new Date().toISOString();
        await this.updateUserSessionData();
        this.updateButtonStates();
        this.timbrature = this.getUserTimbrature();
        await this.dismissLoading(loading);
        await this.alertService.presentSuccessAlert('Uscita registrata con successo');
      },
      async (error) => {
        console.error('Errore Uscita', error);
        await this.dismissLoading(loading);
        await this.alertService.presentErrorAlert('Errore durante la registrazione dell\'uscita.');
      }
    );
  }

  async onStartBreak() {
    if (!this.user || !this.user.id) {
      console.error('User data is not available');
      return;
    }

    const loading = await this.presentLoading('Registrando l\'entrata pausa...');

    this.timbratureService.entrata(this.user.id).subscribe(
      async (response) => {
        console.log('Entrata Pausa', response);
        this.user.checkInTimePausa = new Date().toISOString();
        await this.updateUserSessionData();
        this.updateButtonStates();
        this.timbrature = this.getUserTimbrature();
        await this.dismissLoading(loading);
        await this.alertService.presentSuccessAlert('Entrata Pausa registrata con successo');
      },
      async (error) => {
        console.error('Errore Entrata Pausa', error);
        await this.dismissLoading(loading);
        await this.alertService.presentErrorAlert('Errore durante la registrazione dell\'entrata pausa.');
      }
    );
  }

  async onEndBreak() {
    if (!this.user || !this.user.id) {
      console.error('User data is not available');
      return;
    }

    const loading = await this.presentLoading('Registrando l\'uscita pausa...');

    this.timbratureService.uscita(this.user.id).subscribe(
      async (response) => {
        console.log('Uscita Pausa', response);
        this.user.checkOutTimePausa = new Date().toISOString();
        await this.updateUserSessionData();
        this.updateButtonStates();
        this.timbrature = this.getUserTimbrature();
        await this.dismissLoading(loading);
        await this.alertService.presentSuccessAlert('Uscita Pausa registrata con successo');
      },
      async (error) => {
        console.error('Errore Uscita Pausa', error);
        await this.dismissLoading(loading);
        await this.alertService.presentErrorAlert('Errore durante la registrazione dell\'uscita pausa.');
      }
    );
  }

  async doRefresh(event: any) {
    console.log('Begin async operation');

    await this.ngOnInit(); // Reload data

    console.log('Async operation has ended');
    event.target.complete();
  }

  @HostListener('document:input', ['$event'])
  handleInput(event: Event) {
    this.updateUserSessionData();
  }

  async updateUserSessionData() {
    const userString = JSON.stringify(this.user);
    localStorage.setItem('user', userString); // Salva i dati dell'utente nel localStorage
    console.log('User data updated in localStorage:', localStorage.getItem('user'));
  }

}
