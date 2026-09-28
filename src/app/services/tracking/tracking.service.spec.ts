import { TestBed } from '@angular/core/testing';
import { ErrorCode } from '@capawesome-team/capacitor-background-geolocation';
import { CURRENT_POSITION_HARD_TIMEOUT_MS, LIVE_FEED_LIMIT } from '../../enums/app-constants.enum';
import { StorageKey } from '../../enums/storage-keys.enum';
import {
  createNativeTestContext,
  createPosition,
  GRANTED,
  type NativeTestContext,
} from '../../../testing/native-mocks';
import { AlertService } from '../alert/alert.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ToastService } from '../toast/toast.service';
import { TrackingService } from './tracking.service';

/** Lets the serialized queue reads triggered by positionChange settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('TrackingService', () => {
  let ctx: NativeTestContext;
  let service: TrackingService;

  function setup(platform: 'android' | 'ios' | 'web' = 'android'): void {
    ctx = createNativeTestContext(platform);
    TestBed.configureTestingModule({ providers: ctx.providers });
    service = TestBed.inject(TrackingService);
  }

  describe('initialize', () => {
    it('registers positionChange and positionError listeners once', async () => {
      setup();
      await service.initialize();
      await service.initialize();
      expect(ctx.plugin.addListener).toHaveBeenCalledTimes(2);
      expect(ctx.plugin.addListener).toHaveBeenCalledWith('positionChange', expect.any(Function));
      expect(ctx.plugin.addListener).toHaveBeenCalledWith('positionError', expect.any(Function));
    });

    it('restores an in-flight session and its start time', async () => {
      setup();
      ctx.plugin.isWatching.mockResolvedValue({ watching: true });
      ctx.preferences.store.set(StorageKey.SessionStartedAt, '1000');
      await service.initialize();
      expect(service.watching()).toBe(true);
      expect(service.sessionStartedAt()).toBe(1000);
    });

    it('is a no-op on the web', async () => {
      setup('web');
      await service.initialize();
      expect(ctx.plugin.addListener).not.toHaveBeenCalled();
      expect(await service.start()).toBe(false);
      expect(ctx.plugin.startWatching).not.toHaveBeenCalled();
    });

    it('removes listeners on destroy', async () => {
      setup();
      await service.initialize();
      await service.destroy();
      ctx.plugin.emit('positionChange', { position: createPosition() });
      expect(service.livePositions()).toHaveLength(0);
    });
  });

  describe('start', () => {
    it('starts watching with the persisted settings when permissions are granted', async () => {
      setup();
      expect(await service.start()).toBe(true);
      expect(ctx.plugin.startWatching).toHaveBeenCalledWith(
        expect.objectContaining({
          distanceFilter: 5,
          androidNotification: expect.objectContaining({ title: 'Location Tracking' }),
        }),
      );
      expect(service.watching()).toBe(true);
      expect(service.sessionStartedAt()).not.toBeNull();
      expect(ctx.preferences.store.has(StorageKey.SessionStartedAt)).toBe(true);
      expect(ctx.haptics.notification).toHaveBeenCalled();
    });

    it('requests foreground permission first when not yet granted', async () => {
      setup();
      ctx.plugin.checkPermissions.mockResolvedValue({ ...GRANTED, location: 'prompt' });
      await service.start();
      expect(ctx.plugin.requestPermissions).toHaveBeenCalledWith({ permissions: ['location', 'notifications'] });
      expect(ctx.plugin.startWatching).toHaveBeenCalled();
    });

    it('warns (but still starts) without background permission', async () => {
      setup();
      ctx.plugin.checkPermissions.mockResolvedValue({ ...GRANTED, backgroundLocation: 'prompt' });
      const warning = vi.spyOn(TestBed.inject(ToastService), 'warning');
      await service.start();
      expect(ctx.plugin.startWatching).toHaveBeenCalled();
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('Background location not granted'));
      expect(TestBed.inject(PermissionsService).backgroundGranted()).toBe(false);
    });

    it('offers the app settings when location is denied', async () => {
      setup();
      const denied = { ...GRANTED, location: 'denied' as const };
      ctx.plugin.checkPermissions.mockResolvedValue(denied);
      ctx.plugin.requestPermissions.mockResolvedValue(denied);
      const alert = TestBed.inject(AlertService);
      const confirm = vi.spyOn(alert, 'confirm').mockResolvedValue(true);
      expect(await service.start()).toBe(false);
      expect(confirm).toHaveBeenCalled();
      expect(ctx.plugin.openSettings).toHaveBeenCalled();
      expect(ctx.plugin.startWatching).not.toHaveBeenCalled();
    });

    it('treats ALREADY_WATCHING as an active session', async () => {
      setup();
      ctx.plugin.startWatching.mockRejectedValue({ code: ErrorCode.AlreadyWatching, message: 'busy' });
      ctx.plugin.isWatching.mockResolvedValue({ watching: true });
      expect(await service.start()).toBe(true);
      expect(service.watching()).toBe(true);
    });

    it('surfaces other start failures', async () => {
      setup();
      ctx.plugin.startWatching.mockRejectedValue({ code: ErrorCode.LocationServicesDisabled, message: 'GPS off' });
      expect(await service.start()).toBe(false);
      expect(service.lastError()).toEqual({ code: ErrorCode.LocationServicesDisabled, message: 'GPS off' });
      expect(TestBed.inject(ToastService).current()?.color).toBe('danger');
      expect(service.busy()).toBe(false);
    });
  });

  describe('live feed', () => {
    const emit = (overrides: Parameters<typeof createPosition>[0]) =>
      ctx.plugin.emit('positionChange', { position: createPosition(overrides) });

    beforeEach(async () => {
      setup();
      await service.initialize();
    });

    it('prepends positions and accumulates distance and points (queue disabled)', async () => {
      emit({ latitude: 0, longitude: 0, timestamp: 1 });
      emit({ latitude: 0.001, longitude: 0, timestamp: 2 });
      await settle();
      expect(service.livePositions()[0].timestamp).toBe(2);
      expect(service.sessionPoints()).toBe(2);
      expect(service.sessionDistanceMeters()).toBeCloseTo(111.2, 0);
      expect(service.latestPosition()?.timestamp).toBe(2);
    });

    it('does not depend on timestamps (Android mixes GPS and network clocks)', async () => {
      emit({ latitude: 0, longitude: 0, timestamp: 5000 });
      emit({ latitude: 0.001, longitude: 0, timestamp: 3000 }); // older clock
      emit({ latitude: 0.002, longitude: 0, timestamp: 3000 }); // same timestamp
      await settle();
      expect(service.sessionPoints()).toBe(3);
      expect(service.sessionDistanceMeters()).toBeCloseTo(222.4, 0);
    });

    it('keeps inaccurate fixes out of the distance but still counts them', async () => {
      emit({ latitude: 0, longitude: 0, timestamp: 1 });
      emit({ latitude: 0.01, longitude: 0, accuracy: 500, timestamp: 2 });
      await settle();
      expect(service.sessionDistanceMeters()).toBe(0);
      emit({ latitude: 0.001, longitude: 0, timestamp: 3 });
      await settle();
      expect(service.sessionDistanceMeters()).toBeCloseTo(111.2, 0);
      expect(service.sessionPoints()).toBe(3);
    });

    it('counts typical 30-65 m phone accuracy toward the distance', async () => {
      emit({ latitude: 0, longitude: 0, accuracy: 65, timestamp: 1 });
      emit({ latitude: 0.001, longitude: 0, accuracy: 65, timestamp: 2 });
      await settle();
      expect(service.sessionDistanceMeters()).toBeCloseTo(111.2, 0);
      expect(service.accuracyTooLow()).toBe(false);
    });

    it('uses the OS speed when reported', () => {
      emit({ speed: 1.4, timestamp: 1 });
      expect(service.currentSpeedMps()).toBe(1.4);
      expect(service.lastFixReceivedAt()).not.toBeNull();
    });

    it('derives the speed from two fixes when the OS reports none', () => {
      emit({ latitude: 0, longitude: 0, speed: null, timestamp: 0 });
      emit({ latitude: 0.0001, longitude: 0, speed: null, timestamp: 10_000 });
      expect(service.currentSpeedMps()).toBeCloseTo(1.11, 2);
    });

    it('flags fixes too inaccurate for distance', async () => {
      await service.start();
      emit({ accuracy: 1500, timestamp: 1 });
      expect(service.accuracyTooLow()).toBe(true);
    });

    it('persists the running totals', async () => {
      emit({ latitude: 0, longitude: 0, timestamp: 1 });
      emit({ latitude: 0.001, longitude: 0, timestamp: 2 });
      await settle();
      const stored = JSON.parse(ctx.preferences.store.get(StorageKey.SessionProgress)!);
      expect(stored.points).toBe(2);
      expect(stored.distanceMeters).toBeCloseTo(111.2, 0);
    });

    it('caps the live feed', () => {
      for (let i = 0; i < LIVE_FEED_LIMIT + 10; i++) {
        emit({ timestamp: i });
      }
      expect(service.livePositions()).toHaveLength(LIVE_FEED_LIMIT);
      service.clearLiveFeed();
      expect(service.livePositions()).toHaveLength(0);
    });

    it('records positionError events and re-syncs on permission loss', () => {
      ctx.plugin.isWatching.mockClear();
      ctx.plugin.emit('positionError', { code: ErrorCode.PermissionDenied, message: 'revoked' });
      expect(service.lastError()).toEqual({ code: ErrorCode.PermissionDenied, message: 'revoked' });
      expect(ctx.plugin.isWatching).toHaveBeenCalled();
    });
  });

  describe('native queue as the source of truth', () => {
    const queued = (id: number, latitude: number) => ({
      id,
      ...createPosition({ latitude, longitude: 0, timestamp: id }),
    });
    const page = (...positions: ReturnType<typeof queued>[]) => ({ positions, hasMore: false });

    it('starts after the positions already queued by earlier sessions', async () => {
      setup();
      await service.initialize();
      ctx.plugin.getQueuedPositions.mockResolvedValueOnce(page(queued(41, 1), queued(42, 2)));
      await service.start();
      ctx.plugin.getQueuedPositions.mockResolvedValueOnce(page(queued(43, 0)));
      ctx.plugin.emit('positionChange', { position: createPosition({ latitude: 0, longitude: 0 }) });
      await settle();
      expect(ctx.plugin.getQueuedPositions).toHaveBeenLastCalledWith(expect.objectContaining({ afterId: 42 }));
      expect(service.sessionPoints()).toBe(1);
      expect(service.sessionDistanceMeters()).toBe(0);
    });

    it('folds in fixes recorded while suspended, in queue order, exactly once', async () => {
      setup();
      await service.initialize();
      await service.start();
      ctx.plugin.isWatching.mockResolvedValue({ watching: true });
      ctx.plugin.getQueuedPositions.mockResolvedValueOnce(page(queued(1, 0), queued(2, 0.001), queued(3, 0.002)));
      await service.syncWatching();
      expect(service.sessionPoints()).toBe(3);
      expect(service.sessionDistanceMeters()).toBeCloseTo(222.4, 0);

      // The live event for a fix already read from the queue is not counted again.
      ctx.plugin.getQueuedPositions.mockResolvedValueOnce(page(queued(4, 0.003)));
      ctx.plugin.emit('positionChange', { position: createPosition({ latitude: 0.003, longitude: 0 }) });
      await settle();
      expect(ctx.plugin.getQueuedPositions).toHaveBeenLastCalledWith(expect.objectContaining({ afterId: 3 }));
      expect(service.sessionPoints()).toBe(4);
      expect(service.sessionDistanceMeters()).toBeCloseTo(333.6, 0);
    });

    it('restores the totals after the app was killed mid-session', async () => {
      setup();
      ctx.plugin.isWatching.mockResolvedValue({ watching: true });
      ctx.preferences.store.set(StorageKey.SessionStartedAt, '1000');
      ctx.preferences.store.set(
        StorageKey.SessionProgress,
        JSON.stringify({ distanceMeters: 500, points: 7, anchor: null, lastQueueId: 9 }),
      );
      await service.initialize();
      expect(service.sessionDistanceMeters()).toBe(500);
      expect(service.sessionPoints()).toBe(7);
      expect(ctx.plugin.getQueuedPositions).toHaveBeenCalledWith(expect.objectContaining({ afterId: 9 }));
    });

    it('falls back to the live feed when the queue is unavailable', async () => {
      setup();
      ctx.plugin.isWatching.mockResolvedValue({ watching: true });
      ctx.plugin.getQueuedPositions.mockRejectedValue({ message: 'queue disabled' });
      await service.initialize();
      ctx.plugin.emit('positionChange', { position: createPosition({ latitude: 0, longitude: 0 }) });
      ctx.plugin.emit('positionChange', { position: createPosition({ latitude: 0.001, longitude: 0 }) });
      await settle();
      expect(service.sessionDistanceMeters()).toBeCloseTo(111.2, 0);
    });
  });

  describe('stop', () => {
    it('stops the session and clears the stored start time', async () => {
      setup();
      await service.start();
      await service.stop();
      expect(ctx.plugin.stopWatching).toHaveBeenCalled();
      expect(service.watching()).toBe(false);
      expect(service.sessionStartedAt()).toBeNull();
      expect(ctx.preferences.store.has(StorageKey.SessionStartedAt)).toBe(false);
      expect(ctx.preferences.store.has(StorageKey.SessionProgress)).toBe(false);
    });

    it('keeps the session when stopping fails', async () => {
      setup();
      await service.start();
      ctx.plugin.stopWatching.mockRejectedValue({ message: 'nope' });
      await service.stop();
      expect(service.watching()).toBe(true);
    });
  });

  describe('getCurrentPosition', () => {
    it('requests a fresh fix with the configured accuracy', async () => {
      setup();
      const position = await service.getCurrentPosition();
      expect(ctx.plugin.getCurrentPosition).toHaveBeenCalledWith({
        accuracy: 'HIGH',
        androidForceLocationManager: false,
        timeout: 15000,
        maximumAge: 0,
      });
      expect(service.currentPosition()).toEqual(position);
      expect(service.latestPosition()).toEqual(position);
    });

    it('reports a timeout', async () => {
      setup();
      ctx.plugin.getCurrentPosition.mockRejectedValue({ code: ErrorCode.Timeout, message: 'Timed out' });
      expect(await service.getCurrentPosition()).toBeNull();
      expect(service.lastError()?.code).toBe(ErrorCode.Timeout);
    });

    it('gives up when the native call never settles', async () => {
      vi.useFakeTimers();
      try {
        setup();
        ctx.plugin.getCurrentPosition.mockReturnValue(new Promise(() => undefined));
        const result = service.getCurrentPosition();
        await vi.advanceTimersByTimeAsync(CURRENT_POSITION_HARD_TIMEOUT_MS);
        expect(await result).toBeNull();
        expect(service.lastError()?.code).toBe(ErrorCode.Timeout);
        expect(service.busy()).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
