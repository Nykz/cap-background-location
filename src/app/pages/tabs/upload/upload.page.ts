import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import {
  FormField,
  applyWhen,
  form,
  max,
  maxLength,
  min,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import {
  IonBadge,
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
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, flaskOutline, refreshOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { NativeOnlyBannerComponent } from '../../../components/native-only-banner/native-only-banner.component';
import { PLAYGROUND_UPLOAD_URL, PLAYGROUND_WEBSITE_URL } from '../../../enums/app-constants.enum';
import type { UploadSettings } from '../../../interfaces/upload-settings.interface';
import { AlertService } from '../../../services/alert/alert.service';
import { NativePlatformService } from '../../../services/platform/native-platform.service';
import { UploadService } from '../../../services/upload/upload.service';
import { urlError, visibleError } from '../../../utils/form-errors.util';

export const FLUSH_INTERVAL_OPTIONS: readonly { label: string; value: number }[] = [
  { label: '10 seconds', value: 10_000 },
  { label: '30 seconds', value: 30_000 },
  { label: '1 minute (default)', value: 60_000 },
  { label: '5 minutes', value: 300_000 },
  { label: '15 minutes', value: 900_000 },
];

@Component({
  selector: 'app-upload',
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
  imports: [
    FormField,
    DatePipe,
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
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonInput,
    IonInputPasswordToggle,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonSpinner,
    NativeOnlyBannerComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadPage implements ViewWillEnter {
  protected readonly upload = inject(UploadService);
  protected readonly platform = inject(NativePlatformService);
  private readonly alert = inject(AlertService);

  protected readonly flushOptions = FLUSH_INTERVAL_OPTIONS;
  protected readonly playgroundWebsite = PLAYGROUND_WEBSITE_URL;
  protected readonly visibleError = visibleError;

  /** Editable copy of the persisted settings; re-syncs when the service reloads them. */
  protected readonly model = linkedSignal<UploadSettings>(() => ({ ...this.upload.settings() }));

  protected readonly form = form(this.model, (path) => {
    // Validate only what is switched on, so hidden fields never block saving.
    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.queueEnabled) || valueOf(path.uploadEnabled),
      (config) => {
        required(config.maxSize, { message: 'Queue size is required' });
        min(config.maxSize, 1, { message: 'Must be at least 1' });
        max(config.maxSize, 1_000_000, { message: 'Keep it under 1,000,000' });
      },
    );

    applyWhen(
      path,
      ({ valueOf }) => valueOf(path.uploadEnabled),
      (config) => {
        required(config.url, { message: 'Upload URL is required' });
        validate(config.url, ({ value }) => {
          const message = value() ? urlError(value()) : null;
          return message ? { kind: 'url', message } : null;
        });
        required(config.batchSize, { message: 'Batch size is required' });
        min(config.batchSize, 1, { message: 'Must be at least 1' });
        max(config.batchSize, ({ valueOf }) => valueOf(config.maxSize) ?? undefined, {
          message: 'Cannot exceed the queue size',
        });
        maxLength(config.bearerToken, 4096);
        maxLength(config.deviceLabel, 64, { message: 'Max. 64 characters' });
      },
    );
  });

  constructor() {
    addIcons({ saveOutline, cloudUploadOutline, flaskOutline, refreshOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    void this.upload.refreshActiveConfig();
  }

  protected usePlayground(): void {
    this.form.url().value.set(PLAYGROUND_UPLOAD_URL);
    this.form.uploadEnabled().value.set(true);
  }

  protected async apply(): Promise<void> {
    await submit(this.form, async () => {
      await this.upload.save(this.model());
      return undefined;
    });
  }

  protected async reset(): Promise<void> {
    const confirmed = await this.alert.confirm(
      'Stop storing and uploading positions? Positions already in the queue are kept.',
      { header: 'Discard configuration', confirmText: 'Discard', destructive: true },
    );
    if (confirmed) {
      await this.upload.reset();
    }
  }
}
