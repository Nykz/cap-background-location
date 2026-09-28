import { Injectable, inject } from '@angular/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { CAPACITOR_APP } from '../../tokens/native-plugins.tokens';
import { PermissionsService } from '../permissions/permissions.service';
import { NativePlatformService } from '../platform/native-platform.service';
import { QueueService } from '../queue/queue.service';
import { TrackHistoryService } from '../track-history/track-history.service';
import { TrackingService } from '../tracking/tracking.service';
import { UploadService } from '../upload/upload.service';
import { WatchSettingsService } from '../watch-settings/watch-settings.service';

/**
 * Boots the geolocation stack once per app start and re-syncs native state
 * whenever the app returns to the foreground (permissions may have changed
 * in system settings and the queue kept filling in the background).
 */
@Injectable({ providedIn: 'root' })
export class AppLifecycleService {
  private readonly app = inject(CAPACITOR_APP);
  private readonly platform = inject(NativePlatformService);
  private readonly watchSettings = inject(WatchSettingsService);
  private readonly history = inject(TrackHistoryService);
  private readonly upload = inject(UploadService);
  private readonly tracking = inject(TrackingService);
  private readonly permissions = inject(PermissionsService);
  private readonly queue = inject(QueueService);

  private resumeListener: PluginListenerHandle | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await Promise.all([this.watchSettings.load(), this.history.load()]);
    await this.upload.initialize();
    if (!this.platform.isNative) {
      return;
    }
    await this.tracking.initialize();
    await this.refreshNativeState();
    this.resumeListener = await this.app.addListener('resume', () => {
      void this.refreshNativeState();
    });
  }

  async refreshNativeState(): Promise<void> {
    await Promise.all([
      this.permissions.check(),
      this.tracking.syncWatching(),
      this.queue.refresh(),
      this.upload.refreshActiveConfig(),
    ]);
  }

  async destroy(): Promise<void> {
    await this.resumeListener?.remove();
    this.resumeListener = null;
    await Promise.all([this.tracking.destroy(), this.upload.destroy()]);
    this.initialized = false;
  }
}
