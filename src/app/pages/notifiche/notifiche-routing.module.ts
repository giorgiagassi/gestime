import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NotifichePage } from './notifiche.page';

const routes: Routes = [
  {
    path: '',
    component: NotifichePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NotifichePageRoutingModule {}
