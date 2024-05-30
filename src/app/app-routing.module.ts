import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'timbra',
    loadChildren: () => import('./pages/timbra/timbra.module').then(m => m.TimbraPageModule)
  },
  {
    path: 'timbra-new',
    loadChildren: () => import('./pages/timbra-new/timbra-new.module').then(m => m.TimbraNewPageModule)
  },
  {
    path: 'notifiche',
    loadChildren: () => import('./pages/notifiche/notifiche.module').then( m => m.NotifichePageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
