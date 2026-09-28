import { Injectable, computed, inject, signal } from '@angular/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type {
  SetConfigOptions,
  UploadFailedEvent,
} from '@capawesome-team/capacitor-background-geolocation';
import { PLAYGROUND_UPLOAD_URL, UPLOAD_FAILURE_LOG_LIMIT } from '../../enums/app-constants.enum';
import { StorageKey } from '../../enums/storage-keys.enum';
import type { UploadFailure } from '../../interfaces/upload-failure.interface';
import type { UploadSettings } from '../../interfaces/upload-settings.interface';
import { BACKGROUND_GEOLOCATION } from '../../tokens/native-plugins.tokens';
import { toPluginError } from '../../utils/plugin-error.util';
import { NativePlatformService } from '../platform/native-platform.service';
import { StorageService } from '../storage/storage.service';
import { ToastService } from '../toast/toast.service';

export const DEFAULT_UPLOAD_SETTINGS: Readonly<UploadSettings> = {
  queueEnabled: true,
  maxSize: 50_000,
  uploadEnabled: false,
  url: PLAYGROUND_UPLOAD_URL,
  bearerToken: '',
  batchSize: 100,
  flushInterval: 60_000,
  deviceLabel: '',
};

/** Maps the form model to the plugin's SetConfigOptions (null = no queue, no upload). */
export function toSetConfigOptions(settings: UploadSettings): SetConfigOptions | null {
  if (!settings.queueEnabled && !settings.uploadEnabled) {
    return null;
  }
  const options: SetConfigOptions = { maxSize: settings.maxSize };
  if (settings.uploadEnabled) {
    options.url = settings.url.trim();
    options.batchSize = Math.min(settings.batchSize, settings.maxSize);
    options.flushInterval = settings.flushInterval;
    const token = settings.bearerToken.trim();
    if (token) {
      options.headers = { Authorization: `Bearer ${token}` };
    }
    const label = settings.deviceLabel.trim();
    if (label) {
      options.extras = { device: label };
    }
  }
  return options;
}

/**
 * Owns the persisted queue/upload configuration. The config is re-applied on
 * every app start, as recommended by the plugin docs, because the native copy
 * is only a cache of the last `setConfig(...)` call.
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly plugin = inject(BACKGROUND_GEOLOCATION);
  private readonly platform = inject(NativePlatformService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  private listener: PluginListenerHandle | null = null;

  private readonly _settings = signal<UploadSettings>({ ...DEFAULT_UPLOAD_SETTINGS });
  private readonly _activeConfig = signal<SetConfigOptions>({});
  private readonly _failures = signal<UploadFailure[]>([]);
  private readonly _busy = signal(false);

  readonly settings = this._settings.asReadonly();
  /** What the native side currently has (read back via getConfig()). */
  readonly activeConfig = this._activeConfig.asReadonly();
  readonly failures = this._failures.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly uploadActive = computed(() => !!this._activeConfig().url);
  readonly queueActive = computed(() => {
    const config = this._activeConfig();
    return config.maxSize !== undefined || !!config.url;
  });

  async initialize(): Promise<void> {
    const stored = await this.storage.get<Partial<UploadSettings>>(StorageKey.UploadConfig);
    this._settings.set({ ...DEFAULT_UPLOAD_SETTINGS, ...(stored ?? {}) });
    if (!this.platform.isNative) {
      return;
    }
    if (!this.listener) {
      this.listener = await this.plugin.addListener('uploadFailed', (event) =>
        this.onUploadFailed(event),
      );
    }
    await this.applyToNative(this._settings());
  }

  async destroy(): Promise<void> {
    await this.listener?.remove();
    this.listener = null;
  }

  /** Persists and applies a new configuration (replaces the whole native config). */
  async save(settings: UploadSettings): Promise<boolean> {
    this._busy.set(true);
    try {
      this._settings.set({ ...settings });
      await this.storage.set(StorageKey.UploadConfig, settings);
      if (!this.platform.isNative) {
        return true;
      }
      await this.applyToNative(settings);
      this.toast.success('Configuration applied.');
      return true;
    } catch (error) {
      this.toast.error(`Could not apply configuration: ${toPluginError(error).message}`);
      return false;
    } finally {
      this._busy.set(false);
    }
  }

  /** Discards the configuration. Already queued positions are kept. */
  async reset(): Promise<void> {
    this._busy.set(true);
    try {
      const disabled: UploadSettings = {
        ...this._settings(),
        queueEnabled: false,
        uploadEnabled: false,
      };
      this._settings.set(disabled);
      await this.storage.set(StorageKey.UploadConfig, disabled);
      if (this.platform.isNative) {
        await this.plugin.resetConfig();
        await this.refreshActiveConfig();
      }
      this.toast.show('Configuration discarded. Queued positions were kept.');
    } catch (error) {
      this.toast.error(`Could not reset configuration: ${toPluginError(error).message}`);
    } finally {
      this._busy.set(false);
    }
  }

  async triggerUpload(): Promise<void> {
    if (!this.platform.isNative) {
      return;
    }
    try {
      await this.plugin.triggerUpload();
      this.toast.success('Upload attempt scheduled.');
    } catch (error) {
      this.toast.error(`Upload not possible: ${toPluginError(error).message}`);
    }
  }

  async refreshActiveConfig(): Promise<void> {
    if (!this.platform.isNative) {
      return;
    }
    try {
      this._activeConfig.set(await this.plugin.getConfig());
    } catch (error) {
      this.toast.error(`Could not read configuration: ${toPluginError(error).message}`);
    }
  }

  clearFailures(): void {
    this._failures.set([]);
  }

  private async applyToNative(settings: UploadSettings): Promise<void> {
    const options = toSetConfigOptions(settings);
    if (options) {
      await this.plugin.setConfig(options);
    } else {
      await this.plugin.resetConfig();
    }
    await this.refreshActiveConfig();
  }

  private onUploadFailed(event: UploadFailedEvent): void {
    const failure: UploadFailure = { ...event, occurredAt: Date.now() };
    this._failures.update((list) => [failure, ...list].slice(0, UPLOAD_FAILURE_LOG_LIMIT));
    const status = event.statusCode ? ` (HTTP ${event.statusCode})` : '';
    this.toast.warning(`Upload failed${status}: ${event.message}`);
  }
}
