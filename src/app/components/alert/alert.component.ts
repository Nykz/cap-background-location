import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonAlert } from '@ionic/angular';
import { AlertService } from '../../services/alert/alert.service';

/** Single declarative confirmation dialog, mounted once in the app shell. */
@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  imports: [IonAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  protected readonly alert = inject(AlertService);
}
