import {Component, HostListener, OnInit} from '@angular/core';
import {Storage} from "@capacitor/storage";
import {AlertController, LoadingController} from "@ionic/angular";
import {AlertService} from "../../providers/alert.service";
import {Router} from "@angular/router";
import {TimbraService} from "../../providers/timbra.service";
import {Geolocation, PositionOptions} from "@capacitor/geolocation";
import {LoginService} from "../../providers/login.service";

@Component({
  selector: 'app-timbra-new',
  templateUrl: './timbra-new.page.html',
  styleUrls: ['./timbra-new.page.scss'],
})
export class TimbraNewPage implements OnInit {
  user: any;
  public actionSheetButtonsUscita = [
    {
      text: 'Uscita',
      role: 'destructive',
      data: {
        action: 'uscita',
      },
    },
    {
      text: 'Uscita di servizio',
      data: {
        action: 'share',
      },
    },
    {
      text: 'Permesso personale',
      data: {
        action: 'share',
      },
    },
    {
      text: 'Cambio sede',
      data: {
        action: 'share',
      },
    },
    {
      text: 'Recupero ore',
      data: {
        action: 'share',
      },
    },
  ];
  public actionSheetButtonsPausa = [
    {
      text: 'Inizio Pausa',
      role: 'destructive',
      data: {
        action: 'inizio_pausa',
      },
      disabled: this.isInizioPausaDisabled()
    },
    {
      text: 'Fine Pausa',
      data: {
        action: 'fine_pausa',
      },
      disabled: this.isFinePausaDisabled()
    }
  ];
  isNearLocation: boolean = false;
  targetLocation = { latitude: 40.970163133756444, longitude: 17.113191914512015 };
  distanceThreshold = 30;
  timbrature: any[] = [];
  isLocationEnabled: boolean = true;

  constructor(
    private alertController: AlertController,
    private alertService: AlertService,
    private router: Router,
    private timbratureService: TimbraService,
    private loadingController: LoadingController,
    private loginService: LoginService
  ) { }

  async ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras && navigation.extras.state && navigation.extras.state['User']) {
      this.user = navigation.extras.state['User'];
      console.log('User data loaded from navigation:', this.user);
    } else {
      const userId = localStorage.getItem('User') || sessionStorage.getItem('User');
      if (userId) {
        try {
          const userData = await this.loginService.getuserData(userId).toPromise();
          this.user = userData;
          console.log('User data loaded from API:', this.user);
        } catch (error) {
          console.error('Failed to load user data from API:', error);
          this.showAlert('Errore', 'Impossibile caricare i dati utente.');
        }
      } else {
        const { value } = await Storage.get({ key: 'userId' });
        if (value) {
          try {
            this.user = await this.loginService.getuserData(value).toPromise();
            console.log('User data loaded from API:', this.user);
          } catch (error) {
            console.error('Failed to load user data from API:', error);
            this.showAlert('Errore', 'Impossibile caricare i dati utente.');
          }
        } else {
          console.error('Failed to load user ID');
          this.showAlert('Errore', 'Impossibile caricare i dati utente.');
        }
      }
    }
    if (this.user) {
      this.timbrature = this.getUserTimbrature();
    }
    await this.requestGeolocationPermission();
    this.checkCurrentLocation();
  }

  async doRefresh(event: any) {
    await this.ngOnInit(); // Reload data
    event.target.complete();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }

  async ensureLocationEnabled(): Promise<boolean> {
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
          return false;
        }
      }

      const position = await Geolocation.getCurrentPosition();
      const distance = this.calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        this.targetLocation.latitude,
        this.targetLocation.longitude
      );

      if (distance <= this.distanceThreshold) {
        return true;
      } else {
        this.showAlert('Troppo distante', 'Sei troppo lontano dalla posizione richiesta.');
        return false;
      }
    } catch (error) {
      this.showAlert('Errore di geolocalizzazione', 'Impossibile ottenere la posizione. Assicurati che la geolocalizzazione sia attiva e riprova.');
      await this.promptEnableLocation();
      return false;
    }
  }

  async promptEnableLocation() {
    const alert = await this.alertController.create({
      header: 'Attiva Geolocalizzazione',
      message: 'La geolocalizzazione non è attiva. Vuoi attivarla adesso?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Geolocalizzazione non attivata');
            this.isLocationEnabled = false;
          }
        },
        {
          text: 'Sì',
          handler: async () => {
            await this.openLocationSettings();
            const loading = await this.presentLoading('Caricamento...');
            setTimeout(async () => {
              await this.dismissLoading(loading);
              const isNear = await this.checkDistance();
              this.isLocationEnabled = isNear;
            }, 5000);
          }
        }
      ]
    });
    await alert.present();
  }

  async openLocationSettings() {
    const alert = await this.alertController.create({
      header: 'Istruzioni',
      message: 'Per favore, vai nelle impostazioni del dispositivo e attiva la geolocalizzazione.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async checkDistance() {
    try {
      const position = await Geolocation.getCurrentPosition();
      const distance = this.calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        this.targetLocation.latitude,
        this.targetLocation.longitude
      );

      return distance <= this.distanceThreshold;
    } catch (error) {
      this.showAlert('Errore di geolocalizzazione', 'Impossibile ottenere la posizione. Assicurati che la geolocalizzazione sia attiva e riprova.');
      return false;
    }
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
      await this.promptEnableLocation();
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Calcolo della distanza in metri tra due coordinate GPS
    const R = 6371e3; // Raggio della Terra in metri
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

  getUserTimbrature(): any[] {
    const timbrature = [];

    if (this.user) {
      if (this.user.checkInTime) {
        timbrature.push({ type: 'Entrata', time: this.user.checkInTime, order: 1 });
      }
      if (this.user.checkOutTimePausa) {
        timbrature.push({ type: 'Inzio Pausa', time: this.user.checkOutTimePausa, order: 2 });
      }
      if (this.user.checkInTimePausa) {
        timbrature.push({ type: 'Fine Pausa', time: this.user.checkInTimePausa, order: 3 });
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

    const isNear = await this.ensureLocationEnabled();
    if (!isNear) {
      return;
    }

    const loading = await this.presentLoading('Registrando l\'entrata...');

    this.timbratureService.entrata(this.user.id).subscribe(
      async (response) => {
        console.log('Entrata', response);
        this.user.checkInTime = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
        this.updateActionSheetButtons();
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

    const isNear = await this.ensureLocationEnabled();
    if (!isNear) {
      return;
    }

    const loading = await this.presentLoading('Registrando l\'uscita...');

    this.timbratureService.uscita(this.user.id).subscribe(
      async (response) => {
        console.log('Uscita', response);
        this.user.checkOutTime = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
        this.updateActionSheetButtons();
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

    const isNear = await this.ensureLocationEnabled();
    if (!isNear) {
      return;
    }

    const loading = await this.presentLoading('Registrando Inzio pausa...');

    this.timbratureService.uscita(this.user.id).subscribe(
      async (response) => {
        this.user.checkOutTimePausa = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
        this.updateActionSheetButtons();
        await this.dismissLoading(loading);
        await this.alertService.presentSuccessAlert('Inzio pausa registrata con successo');
      },
      async (error) => {
        await this.dismissLoading(loading);
        await this.alertService.presentErrorAlert('Errore durante la registrazione di Inzio pausa.');
      }
    );
  }

  async onEndBreak() {
    if (!this.user || !this.user.id) {
      console.error('User data is not available');
      return;
    }

    const loading = await this.presentLoading('Registrando la fine pausa...');

    this.timbratureService.entrata(this.user.id).subscribe(
      async (response) => {
        console.log('Fine Pausa', response);
        this.user.checkInTimePausa = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
        this.updateActionSheetButtons();
        await this.dismissLoading(loading);
        await this.alertService.presentSuccessAlert('Fine Pausa registrata con successo');
      },
      async (error) => {
        console.error('Errore Fine Pausa', error);
        await this.dismissLoading(loading);
        await this.alertService.presentErrorAlert('Errore durante la registrazione della fine pausa.');
      }
    );
  }



  async handleActionSheetDismiss(event: any) {
    const role = event.detail.role;
    const action = event.detail.data?.action;

    if (action === 'uscita') {
      await this.onCheckOut();
    }
  }

  async handleActionSheetDismissPausa(event: any) {
    const role = event.detail.role;
    const action = event.detail.data?.action;

    if (action === 'inizio_pausa') {
      await this.onStartBreak();
    }
    if (action === 'fine_pausa') {
      await this.onEndBreak();
    }
  }

  updateActionSheetButtons() {
    this.actionSheetButtonsPausa = [
      {
        text: 'Inizio Pausa',
        role: 'destructive',
        data: {
          action: 'inizio_pausa',
        },
        disabled: this.isInizioPausaDisabled()
      },
      {
        text: 'Fine Pausa',
        data: {
          action: 'fine_pausa',
        },
        disabled: this.isFinePausaDisabled()
      }
    ];
  }

  isInizioPausaDisabled(): boolean {
    return !!this.user?.checkOutTimePausa;
  }

  isFinePausaDisabled(): boolean {
    return !this.user?.checkOutTimePausa;
  }

  isModalOpen = false;

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
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

  getFormattedTotOre(): string {
    if (!this.user?.checkInTime) {
      return '';
    }

    const checkInTime = new Date(this.user.checkInTime);
    const currentTime = this.user.checkOutTime ? new Date(this.user.checkOutTime) : new Date();
    let diffMs = currentTime.getTime() - checkInTime.getTime();

    // Calcola la differenza tra checkOutTimePausa e checkInTimePausa
    if (this.user.checkOutTimePausa && this.user.checkInTimePausa) {
      const checkOutTimePausa = new Date(this.user.checkOutTimePausa);
      const checkInTimePausa = new Date(this.user.checkInTimePausa);
      let pausaDiffMs = checkInTimePausa.getTime() - checkOutTimePausa.getTime();

      // Se la differenza è inferiore a un'ora, sottrai comunque un'ora
      const oneHourMs = 60 * 60 * 1000;
      if (pausaDiffMs < oneHourMs) {
        pausaDiffMs = oneHourMs;
      }

      diffMs -= pausaDiffMs;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${this.padToTwo(hours)}:${this.padToTwo(minutes)}:${this.padToTwo(seconds)}`;
  }

  padToTwo(number: number): string {
    return number <= 9 ? `0${number}` : `${number}`;
  }
  async handleModalDismiss() {
    this.isModalOpen = false;
  }

  isPausaPranzoDisabled(): boolean {
    return !!this.user?.checkOutTimePausa && !!this.user?.checkInTimePausa;
  }

}
