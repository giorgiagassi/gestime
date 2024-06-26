import {Component, HostListener, OnInit} from '@angular/core';
import {Storage} from "@capacitor/storage";
import {AlertService} from "../../providers/alert.service";
import {Router} from "@angular/router";
import {TimbraService} from "../../providers/timbra.service";
import {Geolocation, PositionOptions} from "@capacitor/geolocation";
import {LoginService} from "../../providers/login.service";
import { LoadingService } from '../../providers/loading.service';
import {NotificationService} from "../../providers/notification.service"; // Importa il servizio

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
    },
    {
      text: 'Fine Pausa',
      data: {
        action: 'fine_pausa',
      },

    }
  ];
  isNearLocation: boolean = false;
  targetLocation = { latitude: 40.970163133756444, longitude: 17.113191914512015 };
  distanceThreshold = 30;
  timbrature: any[] = [];
  isLocationEnabled: boolean = true;
  unreadNotificationsCount: number = 0;

  constructor(
    private alertService: AlertService, // Usa il servizio
    private router: Router,
    private timbratureService: TimbraService,
    private loadingService: LoadingService, // Usa il servizio
    private loginService: LoginService,
    private notificationService: NotificationService
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
          // Calcola il numero di notifiche non lette all'avvio dell'applicazione
          this.unreadNotificationsCount = this.notificationService.getUnreadNotificationsCount();

          // Ascolta i cambiamenti nelle notifiche per aggiornare il conteggio delle notifiche non lette
          this.notificationService.notificationsChanged.subscribe(() => {
            this.unreadNotificationsCount = this.notificationService.getUnreadNotificationsCount();
          });
        } catch (error) {
          console.error('Failed to load user data from API:', error);
          await this.alertService.presentErrorAlert('Impossibile caricare i dati utente.');
        }
      } else {
        const { value } = await Storage.get({ key: 'userId' });
        if (value) {
          try {
            this.user = await this.loginService.getuserData(value).toPromise();
            console.log('User data loaded from API:', this.user);
          } catch (error) {
            console.error('Failed to load user data from API:', error);
            await this.alertService.presentErrorAlert('Impossibile caricare i dati utente.');
          }
        } else {
          console.error('Failed to load user ID');
          await this.alertService.presentErrorAlert('Impossibile caricare i dati utente.');
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
          await this.alertService.presentErrorAlert('Impossibile ottenere la posizione. Assicurati di avere i permessi necessari.');
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
        await this.alertService.presentErrorAlert('Sei troppo lontano dalla posizione richiesta.');
        return false;
      }
    } catch (error) {
      await this.alertService.presentErrorAlert('Impossibile ottenere la posizione. Assicurati che la geolocalizzazione sia attiva e riprova.');
      await this.promptEnableLocation();
      return false;
    }
  }

  async promptEnableLocation() {
    const alert = await this.alertService.presentAlert(
      'Attiva Geolocalizzazione',
      'La geolocalizzazione non è attiva. Vuoi attivarla adesso?',
      ['No', 'Sì']
    );

    if (alert.role === 'cancel') {
      console.log('Geolocalizzazione non attivata');
      this.isLocationEnabled = false;
      return;
    }

    await this.openLocationSettings();
    await this.loadingService.presentLoading('Caricamento...');
    setTimeout(async () => {
      await this.loadingService.dismissLoading();
      const isNear = await this.checkDistance();
      this.isLocationEnabled = isNear;
    }, 5000);
  }

  async openLocationSettings() {
    await this.alertService.presentAlert(
      'Istruzioni',
      'Per favore, vai nelle impostazioni del dispositivo e attiva la geolocalizzazione.',
      ['OK']
    );
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
      await this.alertService.presentErrorAlert('Impossibile ottenere la posizione. Assicurati che la geolocalizzazione sia attiva e riprova.');
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
          await this.alertService.presentErrorAlert('Impossibile ottenere la posizione. Assicurati di avere i permessi necessari.');
        }
      }
    } catch (error) {
      await this.alertService.presentErrorAlert('Errore durante la richiesta dei permessi di geolocalizzazione.');
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
        await this.alertService.presentErrorAlert('Sei troppo lontano dalla posizione richiesta.');
      }
    } catch (error) {
      await this.alertService.presentErrorAlert('Impossibile ottenere la posizione. Assicurati che la geolocalizzazione sia attiva e riprova.');
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

    await this.loadingService.presentLoading('Registrando l\'entrata...');

    this.timbratureService.entrata(this.user.id).subscribe(
      async (response) => {
        console.log('Entrata', response);
        this.user.checkInTime = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
        await this.loadingService.dismissLoading();
        await this.alertService.presentSuccessAlert('Entrata registrata con successo');
      },
      async (error) => {
        console.error('Errore Entrata', error);
        await this.loadingService.dismissLoading();
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

    await this.loadingService.presentLoading('Registrando l\'uscita...');

    this.timbratureService.uscita(this.user.id).subscribe(
      async (response) => {
        console.log('Uscita', response);
        this.user.checkOutTime = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
            await this.loadingService.dismissLoading();
        await this.alertService.presentSuccessAlert('Uscita registrata con successo');
      },
      async (error) => {
        console.error('Errore Uscita', error);
        await this.loadingService.dismissLoading();
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

    await this.loadingService.presentLoading('Registrando Inizio pausa...');

    this.timbratureService.uscita(this.user.id).subscribe(
      async (response) => {
        this.user.checkOutTimePausa = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
        await this.loadingService.dismissLoading();
        await this.alertService.presentSuccessAlert('Inizio pausa registrata con successo');
      },
      async (error) => {
        await this.loadingService.dismissLoading();
        await this.alertService.presentErrorAlert(error.message);
      }
    );
  }

  async onEndBreak() {
    if (!this.user || !this.user.id) {
      console.error('User data is not available');
      return;
    }

    await this.loadingService.presentLoading('Registrando la fine pausa...');

    this.timbratureService.entrata(this.user.id).subscribe(
      async (response) => {
        console.log('Fine Pausa', response);
        this.user.checkInTimePausa = new Date().toISOString();
        this.timbrature = this.getUserTimbrature();
        await this.loadingService.dismissLoading();
        await this.alertService.presentSuccessAlert('Fine Pausa registrata con successo');
      },
      async (error) => {
        console.error('Errore Fine Pausa', error);
        await this.loadingService.dismissLoading();
        await this.alertService.presentErrorAlert(error.message);
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


  isInizioPausaDisabled(): boolean {
    return !!this.user?.checkOutTimePausa && !this.user?.checkInTimePausa;
  }

  isFinePausaDisabled(): boolean {
    return !this.user?.checkOutTimePausa || !!this.user?.checkInTimePausa;
  }


  isModalOpen = false;

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }

  isModalOpenNotifiche = false;

  setOpenNotifiche(isOpen: boolean) {
    this.isModalOpenNotifiche = isOpen;
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
  async handleModalDismissNotifiche() {
    this.isModalOpenNotifiche = false;
  }

  isPausaPranzoDisabled(): boolean {
    return !!this.user?.checkOutTimePausa && !!this.user?.checkInTimePausa;
  }
  // Aggiorna la variabile quando il numero di notifiche non lette cambia
  updateUnreadNotificationsCount() {
    this.unreadNotificationsCount = this.notificationService.getUnreadNotificationsCount();
  }
}
