import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { environment } from 'src/environments/environment';

const routes: Routes = [];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: environment.router_use_hash })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
