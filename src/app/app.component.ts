import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AlertComponent } from './components/alert/alert.component';
import { ToastComponent } from './components/toast/toast.component';

/** Root shell only: router outlet plus the single toast/alert outlets. */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [IonApp, IonRouterOutlet, ToastComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
