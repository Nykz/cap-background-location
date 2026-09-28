import { TestBed } from '@angular/core/testing';
import { Accuracy, ActivityType } from '@capawesome-team/capacitor-background-geolocation';
import { StorageKey } from '../../enums/storage-keys.enum';
import { createNativeTestContext, type NativeTestContext } from '../../../testing/native-mocks';
import { DEFAULT_WATCH_SETTINGS, WatchSettingsService } from './watch-settings.service';

describe('WatchSettingsService', () => {
  let ctx: NativeTestContext;
  let service: WatchSettingsService;

  beforeEach(() => {
    ctx = createNativeTestContext();
    TestBed.configureTestingModule({ providers: ctx.providers });
    service = TestBed.inject(WatchSettingsService);
  });

  it('starts with the documented defaults', () => {
    expect(service.settings()).toEqual(DEFAULT_WATCH_SETTINGS);
    expect(service.settings().distanceFilter).toBe(5);
    expect(service.settings().androidInterval).toBe(3000);
  });

  it('merges stored values over the defaults', async () => {
    ctx.preferences.store.set(StorageKey.WatchSettings, JSON.stringify({ distanceFilter: 50 }));
    await service.load();
    expect(service.settings()).toEqual({ ...DEFAULT_WATCH_SETTINGS, distanceFilter: 50 });
  });

  it('persists and resets', async () => {
    await service.save({ ...DEFAULT_WATCH_SETTINGS, accuracy: Accuracy.Low });
    expect(service.settings().accuracy).toBe(Accuracy.Low);
    expect(ctx.preferences.store.has(StorageKey.WatchSettings)).toBe(true);
    await service.reset();
    expect(service.settings()).toEqual(DEFAULT_WATCH_SETTINGS);
    expect(ctx.preferences.store.has(StorageKey.WatchSettings)).toBe(false);
  });

  it('maps settings to StartWatchingOptions with a required Android notification', () => {
    const options = service.toStartWatchingOptions({
      ...DEFAULT_WATCH_SETTINGS,
      iosActivityType: ActivityType.AutomotiveNavigation,
    });
    expect(options).toEqual({
      accuracy: Accuracy.High,
      distanceFilter: 5,
      androidInterval: 3000,
      androidForceLocationManager: false,
      androidNotification: {
        title: 'Location Tracking',
        text: 'Your trip is being recorded.',
        channelName: 'Background Geolocation',
        icon: 'ic_stat_location',
      },
      iosActivityType: ActivityType.AutomotiveNavigation,
      iosPausesAutomatically: false,
      iosShowBackgroundIndicator: true,
    });
  });
});
