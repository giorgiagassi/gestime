import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NotifichePageRoutingModule } from './notifiche-routing.module';

import { NotifichePage } from './notifiche.page';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        NotifichePageRoutingModule
    ],
    exports: [
        NotifichePage
    ],
    declarations: [NotifichePage]
})
export class NotifichePageModule {}
