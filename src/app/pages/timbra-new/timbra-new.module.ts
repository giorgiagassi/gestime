import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TimbraNewPageRoutingModule } from './timbra-new-routing.module';

import { TimbraNewPage } from './timbra-new.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TimbraNewPageRoutingModule
  ],
  declarations: [TimbraNewPage]
})
export class TimbraNewPageModule {}
