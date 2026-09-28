import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  type RefresherCustomEvent,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  locateOutline,
  locationOutline,
  playOutline,
  radioButtonOnOutline,
  stopOutline,
  trashOutline,
} from 'ionicons/icons';
import { CURRENT_SPEED_STALE_MS } from '../../../enums/app-constants.enum';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { NativeOnlyBannerComponent } from '../../../components/native-only-banner/native-only-banner.component';
import { PositionDetailsComponent } from '../../../components/position-details/position-details.component';
import { PositionListComponent } from '../../../components/position-list/position-list.component';
import { TripStatsComponent } from '../../../components/trip-stats/trip-stats.component';
import type { TripStats } from '../../../interfaces/trip-stats.interface';
import { AppLifecycleService } from '../../../services/app-lifecycle/app-lifecycle.service';
import { NativePlatformService } from '../../../services/platform/native-platform.service';
import { TrackingService } from '../../../services/tracking/tracking.service';

const CLOCK_TICK_MS = 1000;

@Component({
  selector: 'app-tracker',
  templateUrl: './tracker.page.html',
  styleUrls: ['./tracker.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
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
    IonChip,
    IonLabel,
    IonSpinner,
    IonText,
    NativeOnlyBannerComponent,
    TripStatsComponent,
    PositionDetailsComponent,
    PositionListComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackerPage implements ViewWillEnter {
  protected readonly tracking = inject(TrackingService);
  protected readonly platform = inject(NativePlatformService);
  private readonly lifecycle = inject(AppLifecycleService);

  /** Wall clock that ticks only while a session is active. */
  private readonly now = signal(Date.now());

  /** Live speed; drops to 0 when the OS stops sending fixes (device standing still). */
  private readonly currentSpeed = computed(() => {
    if (!this.tracking.watching()) {
      return null;
    }
    const receivedAt = this.tracking.lastFixReceivedAt();
    if (receivedAt === null) {
      return null;
    }
    return this.now() - receivedAt > CURRENT_SPEED_STALE_MS ? 0 : this.tracking.currentSpeedMps();
  });

  protected readonly stats = computed<TripStats>(() => {
    const startedAt = this.tracking.sessionStartedAt();
    const durationMs = startedAt ? Math.max(0, this.now() - startedAt) : 0;
    const distanceMeters = this.tracking.sessionDistanceMeters();
    return {
      points: this.tracking.sessionPoints(),
      distanceMeters,
      durationMs,
      averageSpeedMps: durationMs > 0 ? distanceMeters / (durationMs / 1000) : null,
      currentSpeedMps: this.currentSpeed(),
    };
  });

  constructor() {
    addIcons({
      playOutline,
      stopOutline,
      locateOutline,
      locationOutline,
      trashOutline,
      alertCircleOutline,
      radioButtonOnOutline,
    });

    effect((onCleanup) => {
      if (!this.tracking.watching()) {
        return;
      }
      this.now.set(Date.now());
      const timer = setInterval(() => this.now.set(Date.now()), CLOCK_TICK_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  ionViewWillEnter(): void {
    void this.tracking.syncWatching();
  }

  protected toggleTracking(): void {
    void (this.tracking.watching() ? this.tracking.stop() : this.tracking.start());
  }

  protected getCurrentPosition(): void {
    void this.tracking.getCurrentPosition();
  }

  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.lifecycle.refreshNativeState();
    await event.target.complete();
  }
}
