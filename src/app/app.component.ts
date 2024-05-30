import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { LoginService } from './providers/login.service';
import { Router } from '@angular/router';
import { LoadingService } from './providers/loading.service';
import { AlertService } from './providers/alert.service';
import {CustomNotification, NotificationService} from "./providers/notification.service"; // Importa il servizio

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    private alertService: AlertService, // Usa il servizio
    private loginService: LoginService,
    private platform: Platform,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.initializeApp();
  }

  async ngOnInit() {

    try {
      await this.checkLocationPermissions();
      await this.requestNotificationPermissions();
      this.scheduleNotifications();
      await this.loginService.checkAuthenticationStatus(); // Ensure this completes before navigating

      if (this.loginService.isAuthenticated()) {
        const userId = this.loginService.user().id; // Prendi l'ID dell'utente
        this.loginService.getuserData(userId).subscribe(
          userData => {
            this.loginService.setUser(userData); // Aggiorna i dati dell'utente nel servizio
            this.router.navigate(['/timbra-new']);
          },
          error => {
            console.error('Error fetching user data:', error);
            this.router.navigate(['/home']);
          }
        );
      } else {
        this.router.navigate(['/home']);
      }
      // Listen for notification events
      LocalNotifications.addListener('localNotificationReceived', (notification: LocalNotificationSchema) => {
        // Effettua un cast dell'oggetto notification al tipo CustomNotification
        const customNotification: CustomNotification = {
          ...notification,
          read: false // Imposta la proprietà read a false
        };
        this.notificationService.addNotification(customNotification);
        console.log('Notification received:', customNotification);
      });

    } catch (error) {
      console.error(error);
    }
  }

  private async requestNotificationPermissions() {
    const result = await LocalNotifications.requestPermissions();
    if (result.display !== 'granted') {
      await this.alertService.presentErrorAlert('È necessario concedere il permesso per le notifiche per utilizzare l\'applicazione correttamente.');
    }
  }

  async scheduleNotifications() {
    const notifications = [
      { id: 1, title: 'Promemoria', body: 'Ricordati di fare il caffè', hour: 11, minute: 0 },
      { id: 2, title: 'Promemoria', body: 'Mo puoi scendere', hour: 11, minute: 5 },
      { id: 3, title: 'Promemoria', body: 'Si Mangia', hour: 13, minute: 35 },
      { id: 4, title: 'Promemoria', body: 'Torna a lavoro', hour: 14, minute: 35 },
      { id: 5, title: 'Promemoria', body: 'C N\' AMMA IJ', hour: 17, minute: 45 },
      { id: 6, title: 'Promemoria', body: 'Caffè', hour: 16, minute: 0 },
      { id: 7, title: 'Promemoria', body: 'ciao', hour: 15, minute: 35 },
    ];

    const now = new Date();

    const notificationsToSchedule = notifications.map(notification => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), notification.hour, notification.minute, 0);
      if (date > now) {
        return {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          schedule: { at: date },
          sound: undefined,
          attachments: undefined,
          actionTypeId: "",
          extra: null,
          smallIcon: 'res://splash'
        };
      } else {
        return null;
      }
    }).filter(n => n !== null) as LocalNotificationSchema[];

    console.log('Notifiche da schedulare:', notificationsToSchedule);

    await LocalNotifications.schedule({
      notifications: notificationsToSchedule
    });
  }

  initializeApp() {
    this.platform.ready().then(() => {
    });
  }

  private async checkLocationPermissions() {

    try {
      let permissions = await Geolocation.checkPermissions();
      while (permissions.location !== 'granted') {
        await this.alertService.presentErrorAlert("L'app ha bisogno della geolocalizzazione per funzionare.");
        await Geolocation.requestPermissions();
        permissions = await Geolocation.checkPermissions();
        if (permissions.location === 'granted') {
          try {
            await Geolocation.getCurrentPosition();
            break;
          } catch (e) {
            await this.alertService.presentErrorAlert('Il servizio di geolocalizzazione non è attivo. Per favore, attiva la geolocalizzazione per continuare.');
            break;
          }
        }
      }
      if (permissions.location !== 'granted') {
        await this.alertService.presentErrorAlert("Permessi di geolocalizzazione non concessi. L'app non può funzionare correttamente.");
      }
    } catch (error) {
      console.error(error);
    }
  }
}
