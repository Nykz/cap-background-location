import { TestBed } from '@angular/core/testing';
import { TRACK_HISTORY_LIMIT } from '../../enums/app-constants.enum';
import { StorageKey } from '../../enums/storage-keys.enum';
import {
  createNativeTestContext,
  createQueuedPosition,
  type NativeTestContext,
} from '../../../testing/native-mocks';
import { TrackHistoryService } from './track-history.service';

describe('TrackHistoryService', () => {
  let ctx: NativeTestContext;
  let service: TrackHistoryService;

  beforeEach(() => {
    ctx = createNativeTestContext();
    TestBed.configureTestingModule({ providers: ctx.providers });
    service = TestBed.inject(TrackHistoryService);
  });

  it('loads persisted positions', async () => {
    ctx.preferences.store.set(StorageKey.TrackHistory, JSON.stringify([createQueuedPosition(1)]));
    await service.load();
    expect(service.count()).toBe(1);
  });

  it('treats corrupt data as empty', async () => {
    ctx.preferences.store.set(StorageKey.TrackHistory, JSON.stringify({ not: 'an array' }));
    await service.load();
    expect(service.count()).toBe(0);
  });

  it('appends idempotently by id, sorted, and persists', async () => {
    await service.append([createQueuedPosition(2), createQueuedPosition(1)]);
    await service.append([createQueuedPosition(2), createQueuedPosition(3)]);
    expect(service.positions().map((p) => p.id)).toEqual([1, 2, 3]);
    expect(service.newestFirst().map((p) => p.id)).toEqual([3, 2, 1]);
    expect(JSON.parse(ctx.preferences.store.get(StorageKey.TrackHistory)!)).toHaveLength(3);
  });

  it('computes the path distance', async () => {
    await service.append([
      createQueuedPosition(1, { latitude: 0, longitude: 0 }),
      createQueuedPosition(2, { latitude: 0.001, longitude: 0 }),
    ]);
    expect(service.distanceMeters()).toBeCloseTo(111.2, 0);
  });

  it('keeps only the newest positions beyond the limit', async () => {
    const many = Array.from({ length: TRACK_HISTORY_LIMIT + 5 }, (_, i) => createQueuedPosition(i + 1));
    await service.append(many);
    expect(service.count()).toBe(TRACK_HISTORY_LIMIT);
    expect(service.positions()[0].id).toBe(6);
  });

  it('ignores empty appends and clears', async () => {
    await service.append([]);
    expect(ctx.preferences.set).not.toHaveBeenCalled();
    await service.append([createQueuedPosition(1)]);
    await service.clear();
    expect(service.count()).toBe(0);
    expect(ctx.preferences.store.has(StorageKey.TrackHistory)).toBe(false);
  });
});
