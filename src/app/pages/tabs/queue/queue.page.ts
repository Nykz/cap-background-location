import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  type RefresherCustomEvent,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { downloadOutline, refreshOutline, trashOutline } from 'ionicons/icons';
import { NativeOnlyBannerComponent } from '../../../components/native-only-banner/native-only-banner.component';
import { PositionListComponent } from '../../../components/position-list/position-list.component';
import { QueueStatusComponent } from '../../../components/queue-status/queue-status.component';
import { DistancePipe } from '../../../pipes/distance.pipe';
import { AlertService } from '../../../services/alert/alert.service';
import { NativePlatformService } from '../../../services/platform/native-platform.service';
import { QueueService } from '../../../services/queue/queue.service';
import { TrackHistoryService } from '../../../services/track-history/track-history.service';
import { UploadService } from '../../../services/upload/upload.service';

export type QueueView = 'queued' | 'history';

@Component({
  selector: 'app-queue',
  templateUrl: './queue.page.html',
  styleUrls: ['./queue.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    NativeOnlyBannerComponent,
    QueueStatusComponent,
    PositionListComponent,
    DistancePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueuePage implements ViewWillEnter {
  protected readonly queue = inject(QueueService);
  protected readonly history = inject(TrackHistoryService);
  protected readonly upload = inject(UploadService);
  protected readonly platform = inject(NativePlatformService);
  private readonly alert = inject(AlertService);

  protected readonly view = signal<QueueView>('queued');

  constructor() {
    addIcons({ refreshOutline, downloadOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    void this.queue.refresh();
    void this.upload.refreshActiveConfig();
  }

  protected setView(value: unknown): void {
    if (value === 'queued' || value === 'history') {
      this.view.set(value);
    }
  }

  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.queue.refresh();
    await event.target.complete();
  }

  /** The uploader and a manual drain share one queue — warn before mixing them. */
  protected async drain(): Promise<void> {
    if (this.upload.uploadActive()) {
      const proceed = await this.alert.confirm(
        'HTTP upload is enabled. Positions you save here are deleted from the queue and will never be uploaded. Continue?',
        { header: 'Upload is active', confirmText: 'Save anyway' },
      );
      if (!proceed) {
        return;
      }
    }
    await this.queue.drain();
  }

  protected async clearQueue(): Promise<void> {
    const confirmed = await this.alert.confirm(
      'Delete every queued position and reset the dropped counter? This cannot be undone.',
      { header: 'Clear queue', confirmText: 'Clear', destructive: true },
    );
    if (confirmed) {
      await this.queue.clear();
    }
  }

  protected async clearHistory(): Promise<void> {
    const confirmed = await this.alert.confirm('Delete all saved positions from this device?', {
      header: 'Clear history',
      confirmText: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      await this.history.clear();
    }
  }
}
