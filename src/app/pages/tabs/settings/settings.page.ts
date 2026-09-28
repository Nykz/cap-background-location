import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { Accuracy, ActivityType } from '@capawesome-team/capacitor-background-geolocation';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRange,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline, saveOutline } from 'ionicons/icons';
import { NativeOnlyBannerComponent } from '../../../components/native-only-banner/native-only-banner.component';
import { PermissionStatusComponent } from '../../../components/permission-status/permission-status.component';
import type { WatchSettings } from '../../../interfaces/watch-settings.interface';
import { AlertService } from '../../../services/alert/alert.service';
import { PermissionsService } from '../../../services/permissions/permissions.service';
import { NativePlatformService } from '../../../services/platform/native-platform.service';
import { ToastService } from '../../../services/toast/toast.service';
import { TrackingService } from '../../../services/tracking/tracking.service';
import { WatchSettingsService } from '../../../services/watch-settings/watch-settings.service';
import { visibleError } from '../../../utils/form-errors.util';

export const ACCURACY_OPTIONS: readonly { label: string; value: Accuracy }[] = [
  { label: 'High (GPS, most power)', value: Accuracy.High },
  { label: 'Balanced (~100 m)', value: Accuracy.Balanced },
  { label: 'Low (~1 km, least power)', value: Accuracy.Low },
];

export const INTERVAL_OPTIONS: readonly { label: string; value: number }[] = [
  { label: '1 second', value: 1_000 },
  { label: '5 seconds (default)', value: 5_000 },
  { label: '10 seconds', value: 10_000 },
  { label: '30 seconds', value: 30_000 },
  { label: '1 minute', value: 60_000 },
];

export const ACTIVITY_OPTIONS: readonly { label: string; value: ActivityType }[] = [
  { label: 'Fitness', value: ActivityType.Fitness },
  { label: 'Automotive navigation', value: ActivityType.AutomotiveNavigation },
  { label: 'Other navigation', value: ActivityType.OtherNavigation },
  { label: 'Airborne', value: ActivityType.Airborne },
  { label: 'Other', value: ActivityType.Other },
];

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [
    FormField,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonInput,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonButton,
    IonIcon,
    NativeOnlyBannerComponent,
    PermissionStatusComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements ViewWillEnter {
  protected readonly permissions = inject(PermissionsService);
  protected readonly platform = inject(NativePlatformService);
  private readonly watchSettings = inject(WatchSettingsService);
  private readonly tracking = inject(TrackingService);
  private readonly toast = inject(ToastService);
  private readonly alert = inject(AlertService);

  protected readonly accuracyOptions = ACCURACY_OPTIONS;
  protected readonly intervalOptions = INTERVAL_OPTIONS;
  protected readonly activityOptions = ACTIVITY_OPTIONS;
  protected readonly visibleError = visibleError;
  /** Platform-specific sections are all shown in the browser for review. */
  protected readonly showAndroid = !this.platform.isIos;
  protected readonly showIos = !this.platform.isAndroid;

  protected readonly model = linkedSignal<WatchSettings>(() => ({ ...this.watchSettings.settings() }));

  protected readonly form = form(this.model, (path) => {
    min(path.distanceFilter, 0);
    max(path.distanceFilter, 500);
    required(path.notificationTitle, { message: 'A notification title is required on Android' });
    maxLength(path.notificationTitle, 60, { message: 'Max. 60 characters' });
    required(path.notificationText, { message: 'A notification text is required on Android' });
    maxLength(path.notificationText, 120, { message: 'Max. 120 characters' });
  });

  constructor() {
    addIcons({ saveOutline, refreshOutline });
  }

  ionViewWillEnter(): void {
    void this.permissions.check();
  }

  protected async save(): Promise<void> {
    await submit(this.form, async () => {
      await this.watchSettings.save(this.model());
      this.toast.success(
        this.tracking.watching()
          ? 'Saved. Stop and start tracking to apply the new settings.'
          : 'Tracking settings saved.',
      );
      return undefined;
    });
  }

  protected async restoreDefaults(): Promise<void> {
    const confirmed = await this.alert.confirm('Restore the default tracking settings?', {
      header: 'Restore defaults',
      confirmText: 'Restore',
    });
    if (confirmed) {
      await this.watchSettings.reset();
      this.toast.show('Defaults restored.');
    }
  }

  protected formatMeters = (value: number): string => `${value} m`;
}
