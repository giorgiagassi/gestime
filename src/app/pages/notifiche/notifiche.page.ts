import { Component, OnInit } from '@angular/core';
import {LocalNotificationSchema} from "@capacitor/local-notifications";
import {NotificationService} from "../../providers/notification.service";

@Component({
  selector: 'app-notifiche',
  templateUrl: './notifiche.page.html',
  styleUrls: ['./notifiche.page.scss'],
})
export class NotifichePage implements OnInit {
  notifications: LocalNotificationSchema[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notifications = this.notificationService.getNotifications();
    console.log(this.notifications, 'Notifications');
  }

}
