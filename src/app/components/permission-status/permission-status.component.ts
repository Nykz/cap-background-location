import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PermissionState } from '@capacitor/core';
import type { PermissionStatus } from '@capawesome-team/capacitor-background-geolocation';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locateOutline, navigateCircleOutline, notificationsOutline } from 'ionicons/icons';
import type { AppPlatform } from '../../services/platform/native-platform.service';

type BadgeColor = 'success' | 'danger' | 'warning' | 'medium';

/** Presentational card: the three permission states plus the two-step request flow. */
@Component({
  selector: 'app-permission-status',
  templateUrl: './permission-status.component.html',
  styleUrls: ['./permission-status.component.scss'],
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonBadge,
    IonButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionStatusComponent {
  readonly status = input<PermissionStatus | null>(null);
  readonly busy = input(false);
  readonly platform = input<AppPlatform>('web');

  readonly requestForeground = output<void>();
  readonly requestBackground = output<void>();
  readonly openSettings = output<void>();
  readonly requestFullAccuracy = output<void>();

  constructor() {
    addIcons({ locateOutline, navigateCircleOutline, notificationsOutline });
  }

  protected badgeColor(state: PermissionState | undefined): BadgeColor {
    switch (state) {
      case 'granted':
        return 'success';
      case 'denied':
        return 'danger';
      case 'prompt':
      case 'prompt-with-rationale':
        return 'warning';
      default:
        return 'medium';
    }
  }

  protected label(state: PermissionState | undefined): string {
    switch (state) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'prompt':
      case 'prompt-with-rationale':
        return 'Not asked';
      default:
        return 'Unknown';
    }
  }
}
