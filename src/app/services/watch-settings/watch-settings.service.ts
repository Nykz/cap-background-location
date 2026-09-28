import { Injectable, inject, signal } from '@angular/core';
import {
  Accuracy,
  ActivityType,
  type StartWatchingOptions,
} from '@capawesome-team/capacitor-background-geolocation';
import { StorageKey } from '../../enums/storage-keys.enum';
import type { WatchSettings } from '../../interfaces/watch-settings.interface';
import { StorageService } from '../storage/storage.service';

export const DEFAULT_WATCH_SETTINGS: Readonly<WatchSettings> = {
  accuracy: Accuracy.High,
  distanceFilter: 5,
  androidInterval: 3000,
  androidForceLocationManager: false,
  notificationTitle: 'Location Tracking',
  notificationText: 'Your trip is being recorded.',
  iosActivityType: ActivityType.Fitness,
  iosPausesAutomatically: false,
  iosShowBackgroundIndicator: true,
};

/** Persists the watch-session tuning knobs and maps them to StartWatchingOptions. */
@Injectable({ providedIn: 'root' })
export class WatchSettingsService {
  private readonly storage = inject(StorageService);
  private readonly _settings = signal<WatchSettings>({ ...DEFAULT_WATCH_SETTINGS });

  readonly settings = this._settings.asReadonly();

  async load(): Promise<void> {
    const stored = await this.storage.get<Partial<WatchSettings>>(StorageKey.WatchSettings);
    this._settings.set({ ...DEFAULT_WATCH_SETTINGS, ...(stored ?? {}) });
  }

  async save(settings: WatchSettings): Promise<void> {
    this._settings.set({ ...settings });
    await this.storage.set(StorageKey.WatchSettings, settings);
  }

  async reset(): Promise<void> {
    this._settings.set({ ...DEFAULT_WATCH_SETTINGS });
    await this.storage.remove(StorageKey.WatchSettings);
  }

  toStartWatchingOptions(settings: WatchSettings = this._settings()): StartWatchingOptions {
    return {
      accuracy: settings.accuracy,
      distanceFilter: settings.distanceFilter,
      androidInterval: settings.androidInterval,
      androidForceLocationManager: settings.androidForceLocationManager,
      androidNotification: {
        title: settings.notificationTitle,
        text: settings.notificationText,
        channelName: 'Background Geolocation',
        icon: 'ic_stat_location',
      },
      iosActivityType: settings.iosActivityType,
      iosPausesAutomatically: settings.iosPausesAutomatically,
      iosShowBackgroundIndicator: settings.iosShowBackgroundIndicator,
    };
  }
}
