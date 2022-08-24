import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { environment } from 'src/environments/environment';
import { HomeComponent } from './pages/home/home.component';
import { TrackComponent } from './pages/track/track.component';

const routes: Routes = [
    {
        path: 'home',
        component: HomeComponent,
    },
    {
        path: 'track',
        component: TrackComponent,
    },
    {
        path: '',
        redirectTo: '/home',
        pathMatch: 'full',
    }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: environment.router_use_hash })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
