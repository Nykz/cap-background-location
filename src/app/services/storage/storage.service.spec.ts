import { TestBed } from '@angular/core/testing';
import { StorageKey } from '../../enums/storage-keys.enum';
import { PREFERENCES } from '../../tokens/native-plugins.tokens';
import { createPreferencesMock } from '../../../testing/native-mocks';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let preferences: ReturnType<typeof createPreferencesMock>;
  let service: StorageService;

  beforeEach(() => {
    preferences = createPreferencesMock();
    TestBed.configureTestingModule({ providers: [{ provide: PREFERENCES, useValue: preferences }] });
    service = TestBed.inject(StorageService);
  });

  it('round-trips JSON values', async () => {
    await service.set(StorageKey.WatchSettings, { distanceFilter: 25 });
    expect(await service.get(StorageKey.WatchSettings)).toEqual({ distanceFilter: 25 });
  });

  it('returns null for missing keys', async () => {
    expect(await service.get(StorageKey.TrackHistory)).toBeNull();
  });

  it('drops corrupted values instead of throwing', async () => {
    preferences.store.set(StorageKey.UploadConfig, '{not json');
    expect(await service.get(StorageKey.UploadConfig)).toBeNull();
    expect(preferences.remove).toHaveBeenCalledWith({ key: StorageKey.UploadConfig });
  });

  it('removes keys', async () => {
    await service.set(StorageKey.SessionStartedAt, 1);
    await service.remove(StorageKey.SessionStartedAt);
    expect(preferences.store.has(StorageKey.SessionStartedAt)).toBe(false);
  });
});
