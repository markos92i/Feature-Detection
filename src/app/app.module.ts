import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';

import { RectangleDetectionComponent } from '../pages/rectangle-detection/rectangle-detection';

const appRoutes: Routes = [
  { path: 'rectangle-detection', component: RectangleDetectionComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    RectangleDetectionComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: false } // <-- debugging purposes only
    ),
    NgbModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
