import { Injectable } from '@angular/core';
import {LocalNotificationSchema} from "@capacitor/local-notifications";
import {Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: CustomNotification[] = [];
  notificationsChanged: Subject<void> = new Subject<void>(); // Definisci la proprietà notificationsChanged

  constructor() { }

  addNotification(notification: CustomNotification) {
    this.notifications.push(notification);
    this.notificationsChanged.next(); // Emetti un evento quando le notifiche cambiano
  }

  getNotifications(): CustomNotification[] {
    return this.notifications;
  }

  getUnreadNotificationsCount(): number {
    return this.notifications.filter(notification => !notification.read).length;
  }
}
export interface CustomNotification extends LocalNotificationSchema {
  read: boolean; // Aggiungi una nuova proprietà per lo stato di lettura
}
