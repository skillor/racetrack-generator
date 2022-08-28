import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TrackComponent } from './pages/track/track.component';
import { HomeComponent } from './pages/home/home.component';
import { LevelComponent } from './components/level/level.component';

@NgModule({
    declarations: [
        AppComponent,
        TrackComponent,
        HomeComponent,
        LevelComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        FormsModule,
        HttpClientModule,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
