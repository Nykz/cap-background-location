import { Injectable, computed, inject, signal } from '@angular/core';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  ErrorCode,
  type Position,
  type PositionErrorEvent,
} from '@capawesome-team/capacitor-background-geolocation';
import {
  CURRENT_POSITION_HARD_TIMEOUT_MS,
  CURRENT_POSITION_TIMEOUT_MS,
  LIVE_FEED_LIMIT,
  MAX_DISTANCE_ACCURACY_METERS,
  MOVING_SPEED_MPS,
  QUEUE_DRAIN_PAGE_SIZE,
  SPEED_DERIVATION_MAX_ACCURACY_METERS,
  SPEED_DERIVATION_MAX_GAP_MS,
} from '../../enums/app-constants.enum';
import { StorageKey } from '../../enums/storage-keys.enum';
import type { PluginError } from '../../interfaces/plugin-error.interface';
import type { SessionProgress } from '../../interfaces/session-progress.interface';
import { BACKGROUND_GEOLOCATION } from '../../tokens/native-plugins.tokens';
import { accumulateDistance, distanceBetween } from '../../utils/geo.util';
import { toPluginError } from '../../utils/plugin-error.util';
import { AlertService } from '../alert/alert.service';
import { HapticsService } from '../haptics/haptics.service';
import { PermissionsService } from '../permissions/permissions.service';
import { NativePlatformService } from '../platform/native-platform.service';
import { StorageService } from '../storage/storage.service';
import { ToastService } from '../toast/toast.service';
import { WatchSettingsService } from '../watch-settings/watch-settings.service';

const emptyProgress = (): SessionProgress => ({
  distanceMeters: 0,
  points: 0,
  anchor: null,
  lastQueueId: 0,
});

/**
 * Current speed of a fix: the OS value when present (Android network fixes often
 * have none), otherwise derived from the previous live fix.
 */
function speedOf(position: Position, previous: Position | null): number | null {
  if (position.speed !== null && position.speed >= 0) {
    return position.speed;
  }
  if (!previous || previous.accuracy > SPEED_DERIVATION_MAX_ACCURACY_METERS) {
    return null;
  }
  const seconds = (position.timestamp - previous.timestamp) / 1000;
  if (seconds <= 0 || seconds > SPEED_DERIVATION_MAX_GAP_MS / 1000) {
    return null;
  }
  if (position.accuracy > SPEED_DERIVATION_MAX_ACCURACY_METERS) {
    return null;
  }
  return distanceBetween(previous, position) / seconds;
}

/**
 * Owns the single watch session: start/stop, the live `positionChange` feed
 * (UI only — the native queue is the durable record) and `positionError`s.
 * Trip totals are fed by live fixes and caught up from the native queue on
 * resume, because `positionChange` is not delivered while the web view is suspended.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly plugin = inject(BACKGROUND_GEOLOCATION);
  private readonly platform = inject(NativePlatformService);
  private readonly permissions = inject(PermissionsService);
  private readonly watchSettings = inject(WatchSettingsService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly alert = inject(AlertService);
  private readonly haptics = inject(HapticsService);

  private listeners: PluginListenerHandle[] = [];
  private progress: SessionProgress = emptyProgress();
  private progressLoaded = false;
  private queuePull: Promise<void> = Promise.resolve();
  private previousLiveFix: Position | null = null;

  private readonly _watching = signal(false);
  private readonly _busy = signal(false);
  private readonly _livePositions = signal<Position[]>([]);
  private readonly _currentPosition = signal<Position | null>(null);
  private readonly _lastError = signal<PluginError | null>(null);
  private readonly _sessionStartedAt = signal<number | null>(null);
  private readonly _sessionDistanceMeters = signal(0);
  private readonly _sessionPoints = signal(0);

  readonly watching = this._watching.asReadonly();
  readonly busy = this._busy.asReadonly();
  /** Newest first, capped to LIVE_FEED_LIMIT. */
  readonly livePositions = this._livePositions.asReadonly();
  readonly currentPosition = this._currentPosition.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly sessionStartedAt = this._sessionStartedAt.asReadonly();
  readonly sessionDistanceMeters = this._sessionDistanceMeters.asReadonly();
  readonly sessionPoints = this._sessionPoints.asReadonly();
  private readonly _currentSpeedMps = signal<number | null>(null);
  private readonly _lastFixReceivedAt = signal<number | null>(null);
  /** Speed of the newest live fix in m/s (null when unknown). */
  readonly currentSpeedMps = this._currentSpeedMps.asReadonly();
  /** Device time the newest live fix arrived (fix timestamps can use the GPS clock). */
  readonly lastFixReceivedAt = this._lastFixReceivedAt.asReadonly();
  /** True while live fixes are too inaccurate to be added to the trip distance. */
  readonly accuracyTooLow = computed(() => {
    const newest = this._livePositions()[0];
    return this._watching() && !!newest && newest.accuracy > MAX_DISTANCE_ACCURACY_METERS;
  });
  /** Most recent fix from either the live feed or a one-shot request. */
  readonly latestPosition = computed(() => {
    const live = this._livePositions()[0] ?? null;
    const oneShot = this._currentPosition();
    if (!live || !oneShot) {
      return live ?? oneShot;
    }
    return live.timestamp >= oneShot.timestamp ? live : oneShot;
  });

  /** Registers native listeners once and restores an in-flight session. */
  async initialize(): Promise<void> {
    if (!this.platform.isNative || this.listeners.length) {
      return;
    }
    this.listeners = await Promise.all([
      this.plugin.addListener('positionChange', ({ position }) => this.onPosition(position)),
      this.plugin.addListener('positionError', (event) => this.onPositionError(event)),
    ]);
    await this.syncWatching();
  }

  async destroy(): Promise<void> {
    await Promise.all(this.listeners.map((handle) => handle.remove()));
    this.listeners = [];
  }

  /** Re-reads the native session state (e.g. after the app resumes). */
  async syncWatching(): Promise<boolean> {
    if (!this.platform.isNative) {
      return false;
    }
    try {
      const { watching } = await this.plugin.isWatching();
      this._watching.set(watching);
      if (watching) {
        const startedAt = await this.storage.get<number>(StorageKey.SessionStartedAt);
        this._sessionStartedAt.set(startedAt ?? Date.now());
        await this.restoreProgress();
        await this.pullQueue(null);
      } else {
        this._sessionStartedAt.set(null);
        await this.storage.remove(StorageKey.SessionStartedAt);
        await this.storage.remove(StorageKey.SessionProgress);
      }
      return watching;
    } catch (error) {
      this._lastError.set(toPluginError(error));
      return false;
    }
  }

  async start(): Promise<boolean> {
    if (!this.platform.isNative || this._watching() || this._busy()) {
      return this._watching();
    }
    this._busy.set(true);
    try {
      if (!(await this.ensureForegroundPermission())) {
        return false;
      }
      if (!this.permissions.backgroundGranted()) {
        this.toast.warning(
          'Background location not granted — updates may pause while the app is in the background.',
        );
      }
      const queueTailId = await this.readQueueTailId();
      await this.plugin.startWatching(this.watchSettings.toStartWatchingOptions());
      await this.beginSession(queueTailId);
      await this.haptics.success();
      this.toast.success('Tracking started.');
      return true;
    } catch (error) {
      const pluginError = toPluginError(error);
      if (pluginError.code === ErrorCode.AlreadyWatching) {
        await this.syncWatching();
        return true;
      }
      this._lastError.set(pluginError);
      this.toast.error(`Could not start tracking: ${pluginError.message}`);
      await this.haptics.warning();
      return false;
    } finally {
      this._busy.set(false);
    }
  }

  async stop(): Promise<void> {
    if (!this.platform.isNative || this._busy()) {
      return;
    }
    this._busy.set(true);
    try {
      await this.plugin.stopWatching();
      this._watching.set(false);
      this._sessionStartedAt.set(null);
      await this.storage.remove(StorageKey.SessionStartedAt);
      await this.storage.remove(StorageKey.SessionProgress);
      await this.haptics.impact();
      this.toast.show('Tracking stopped.');
    } catch (error) {
      this.toast.error(`Could not stop tracking: ${toPluginError(error).message}`);
    } finally {
      this._busy.set(false);
    }
  }

  async getCurrentPosition(): Promise<Position | null> {
    if (!this.platform.isNative) {
      return null;
    }
    this._busy.set(true);
    try {
      const settings = this.watchSettings.settings();
      const { position } = await this.withHardTimeout(
        this.plugin.getCurrentPosition({
          accuracy: settings.accuracy,
          androidForceLocationManager: settings.androidForceLocationManager,
          timeout: CURRENT_POSITION_TIMEOUT_MS,
          maximumAge: 0,
        }),
      );
      this._currentPosition.set(position);
      this._lastError.set(null);
      await this.haptics.impact();
      return position;
    } catch (error) {
      const pluginError = toPluginError(error);
      this._lastError.set(pluginError);
      this.toast.error(`Could not get position: ${pluginError.message}`);
      return null;
    } finally {
      this._busy.set(false);
      await this.permissions.check();
    }
  }

  clearLiveFeed(): void {
    this._livePositions.set([]);
  }

  private async ensureForegroundPermission(): Promise<boolean> {
    let status = await this.permissions.check();
    if (status?.location !== 'granted') {
      status = await this.permissions.requestForeground();
    }
    if (status?.location === 'granted') {
      return true;
    }
    const openSettings = await this.alert.confirm(
      'Location permission is required to start tracking. Open the app settings to grant it?',
      { header: 'Permission required', confirmText: 'Open settings' },
    );
    if (openSettings) {
      await this.permissions.openSettings();
    }
    return false;
  }

  private withHardTimeout<T>(request: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject({
            code: ErrorCode.Timeout,
            message: 'No response from location services. Check the location permission in Settings.',
          }),
        CURRENT_POSITION_HARD_TIMEOUT_MS,
      );
    });
    return Promise.race([request, timeout]).finally(() => clearTimeout(timer));
  }

  private async beginSession(queueTailId: number): Promise<void> {
    const startedAt = Date.now();
    this.progress = { ...emptyProgress(), lastQueueId: queueTailId };
    this.progressLoaded = true;
    this.previousLiveFix = null;
    this._currentSpeedMps.set(null);
    this._lastFixReceivedAt.set(null);
    this._watching.set(true);
    this._lastError.set(null);
    this._livePositions.set([]);
    this._sessionStartedAt.set(startedAt);
    this.commitProgress();
    await this.storage.set(StorageKey.SessionStartedAt, startedAt);
  }

  /** Reloads the persisted totals after the app was killed mid-session. */
  private async restoreProgress(): Promise<void> {
    if (this.progressLoaded) {
      return;
    }
    this.progressLoaded = true;
    const stored = await this.storage.get<SessionProgress>(StorageKey.SessionProgress);
    if (stored) {
      this.progress = { ...emptyProgress(), ...stored };
      this.publishProgress();
    }
  }

  /**
   * Id of the newest position already in the native queue, so a new session
   * only counts what it records itself. Queue ids are AUTOINCREMENT (never reused).
   */
  private async readQueueTailId(): Promise<number> {
    let tail = 0;
    try {
      let hasMore = true;
      while (hasMore) {
        const page = await this.plugin.getQueuedPositions({ afterId: tail, limit: QUEUE_DRAIN_PAGE_SIZE });
        tail = page.positions.reduce((max, p) => Math.max(max, p.id), tail);
        hasMore = page.hasMore && page.positions.length > 0;
      }
    } catch {
      // Queue unavailable: totals fall back to the live feed.
    }
    return tail;
  }

  /** Serializes queue reads so positions are always folded in queue order, exactly once. */
  private pullQueue(liveFix: Position | null): Promise<void> {
    this.queuePull = this.queuePull.then(() => this.pullQueueNow(liveFix));
    return this.queuePull;
  }

  /**
   * The native queue holds every fix in the order it was recorded (including while
   * the web view was suspended), so the totals are built from it by queue id —
   * no timestamp comparisons, which break on Android where GPS and network fixes
   * carry different clocks. When the queue yields nothing new (queue disabled, or
   * the fix was already uploaded and deleted), the live fix is counted directly.
   */
  private async pullQueueNow(liveFix: Position | null): Promise<void> {
    let added = 0;
    try {
      let hasMore = true;
      while (hasMore) {
        const page = await this.plugin.getQueuedPositions({
          afterId: this.progress.lastQueueId,
          limit: QUEUE_DRAIN_PAGE_SIZE,
        });
        for (const queued of page.positions) {
          if (queued.id > this.progress.lastQueueId) {
            this.progress.lastQueueId = queued.id;
            this.recordFix(queued);
            added++;
          }
        }
        hasMore = page.hasMore && page.positions.length > 0;
      }
    } catch {
      // Queue unavailable: fall through to the live fix.
    }
    if (!added && liveFix) {
      this.recordFix(liveFix);
      added++;
    }
    if (added) {
      this.commitProgress();
    }
  }

  private recordFix(position: Position): void {
    const step = accumulateDistance(this.progress.anchor, position, {
      maxAccuracyMeters: MAX_DISTANCE_ACCURACY_METERS,
      movingSpeedMps: MOVING_SPEED_MPS,
    });
    this.progress.anchor = step.anchor;
    this.progress.distanceMeters += step.addedMeters;
    this.progress.points += 1;
  }

  private publishProgress(): void {
    this._sessionDistanceMeters.set(this.progress.distanceMeters);
    this._sessionPoints.set(this.progress.points);
  }

  private commitProgress(): void {
    this.publishProgress();
    void this.storage.set(StorageKey.SessionProgress, { ...this.progress });
  }

  private onPosition(position: Position): void {
    this._currentSpeedMps.set(speedOf(position, this.previousLiveFix));
    this._lastFixReceivedAt.set(Date.now());
    this.previousLiveFix = position;
    this._livePositions.update((list) => [position, ...list].slice(0, LIVE_FEED_LIMIT));
    this._lastError.set(null);
    void this.pullQueue(position);
  }

  private onPositionError(event: PositionErrorEvent): void {
    this._lastError.set({ code: event.code, message: event.message });
    this.toast.error(event.message);
    if (
      event.code === ErrorCode.PermissionDenied ||
      event.code === ErrorCode.LocationServicesDisabled
    ) {
      void this.syncWatching();
      void this.permissions.check();
    }
  }
}
