import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { PreloadAllModules, RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { routes } from './app.routes';
import { AppLifecycleService } from './services/app-lifecycle/app-lifecycle.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // No global mode: iOS styling on iOS, Material Design on Android/web.
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // Signal Forms → ng-* status classes; Ionic mirrors them to ion-invalid / ion-touched
    // so <ion-input errorText> shows validation messages.
    provideSignalFormsConfig({
      classes: {
        'ng-valid': ({ state }) => state().valid(),
        'ng-invalid': ({ state }) => state().invalid(),
        'ng-touched': ({ state }) => state().touched(),
        'ng-untouched': ({ state }) => !state().touched(),
        'ng-dirty': ({ state }) => state().dirty(),
        'ng-pristine': ({ state }) => !state().dirty(),
      },
    }),
    // Boot the geolocation stack (listeners, persisted config) before first render.
    provideAppInitializer(() => inject(AppLifecycleService).initialize()),
  ],
};
