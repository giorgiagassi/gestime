import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TimbraPageRoutingModule } from './timbra-routing.module';

import { TimbraPage } from './timbra.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TimbraPageRoutingModule
  ],
  declarations: [TimbraPage]
})
export class TimbraPageModule {}
