import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TimbraPage } from './timbra.page';

const routes: Routes = [
  {
    path: '',
    component: TimbraPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TimbraPageRoutingModule {}
