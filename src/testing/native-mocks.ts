import type { Provider } from '@angular/core';
import type {
  BackgroundGeolocationPlugin,
  PermissionStatus,
  Position,
  QueuedPosition,
} from '@capawesome-team/capacitor-background-geolocation';
import type { Mock } from 'vitest';
import { NativePlatformService, type AppPlatform } from '../app/services/platform/native-platform.service';
import {
  BACKGROUND_GEOLOCATION,
  CAPACITOR_APP,
  HAPTICS,
  PREFERENCES,
} from '../app/tokens/native-plugins.tokens';

type Listener = (event: unknown) => void;

export type PluginMock = {
  [K in keyof BackgroundGeolocationPlugin]: Mock;
} & {
  /** Invokes every listener registered for `eventName` (simulates a native event). */
  emit(eventName: string, event: unknown): void;
};

export const GRANTED: PermissionStatus = {
  location: 'granted',
  backgroundLocation: 'granted',
  notifications: 'granted',
};

export function createPosition(overrides: Partial<Position> = {}): Position {
  return {
    latitude: 52.52,
    longitude: 13.405,
    accuracy: 5,
    altitude: null,
    altitudeAccuracy: null,
    bearing: null,
    speed: null,
    simulated: false,
    timestamp: 1_723_291_200_000,
    ...overrides,
  };
}

export function createQueuedPosition(id: number, overrides: Partial<Position> = {}): QueuedPosition {
  return { id, ...createPosition({ timestamp: 1_723_291_200_000 + id * 1000, ...overrides }) };
}

/** In-memory stand-in for the native BackgroundGeolocation plugin. */
export function createPluginMock(): PluginMock {
  const listeners = new Map<string, Listener[]>();
  const mock = {
    checkPermissions: vi.fn().mockResolvedValue(GRANTED),
    requestPermissions: vi.fn().mockResolvedValue(GRANTED),
    openSettings: vi.fn().mockResolvedValue(undefined),
    requestTemporaryFullAccuracy: vi.fn().mockResolvedValue(undefined),
    getCurrentPosition: vi.fn().mockResolvedValue({ position: createPosition() }),
    startWatching: vi.fn().mockResolvedValue(undefined),
    stopWatching: vi.fn().mockResolvedValue(undefined),
    isWatching: vi.fn().mockResolvedValue({ watching: false }),
    setConfig: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockResolvedValue({}),
    resetConfig: vi.fn().mockResolvedValue(undefined),
    triggerUpload: vi.fn().mockResolvedValue(undefined),
    getQueueStatus: vi
      .fn()
      .mockResolvedValue({ pendingCount: 0, droppedCount: 0, lastUploadedAt: null }),
    getQueuedPositions: vi.fn().mockResolvedValue({ positions: [], hasMore: false }),
    deleteQueuedPositions: vi.fn().mockResolvedValue(undefined),
    clearQueue: vi.fn().mockResolvedValue(undefined),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn((eventName: string, fn: Listener) => {
      listeners.set(eventName, [...(listeners.get(eventName) ?? []), fn]);
      return Promise.resolve({
        remove: vi.fn(() => {
          listeners.set(eventName, (listeners.get(eventName) ?? []).filter((l) => l !== fn));
          return Promise.resolve();
        }),
      });
    }),
    emit(eventName: string, event: unknown): void {
      (listeners.get(eventName) ?? []).forEach((fn) => fn(event));
    },
  };
  return mock as unknown as PluginMock;
}

/** In-memory Preferences (SharedPreferences / UserDefaults) stand-in. */
export function createPreferencesMock(initial: Record<string, unknown> = {}) {
  const store = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  return {
    store,
    get: vi.fn(({ key }: { key: string }) => Promise.resolve({ value: store.get(key) ?? null })),
    set: vi.fn(({ key, value }: { key: string; value: string }) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    remove: vi.fn(({ key }: { key: string }) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
}

export function createAppMock() {
  const listeners = new Map<string, (() => void)[]>();
  return {
    addListener: vi.fn((eventName: string, fn: () => void) => {
      listeners.set(eventName, [...(listeners.get(eventName) ?? []), fn]);
      return Promise.resolve({ remove: vi.fn().mockResolvedValue(undefined) });
    }),
    emit(eventName: string): void {
      (listeners.get(eventName) ?? []).forEach((fn) => fn());
    },
  };
}

export function platformStub(platform: AppPlatform): NativePlatformService {
  return {
    platform,
    isNative: platform !== 'web',
    isAndroid: platform === 'android',
    isIos: platform === 'ios',
  };
}

export interface NativeTestContext {
  plugin: PluginMock;
  preferences: ReturnType<typeof createPreferencesMock>;
  app: ReturnType<typeof createAppMock>;
  haptics: { impact: Mock; notification: Mock };
  providers: Provider[];
}

/** Providers that replace every native plugin and the platform detection. */
export function createNativeTestContext(platform: AppPlatform = 'android'): NativeTestContext {
  const plugin = createPluginMock();
  const preferences = createPreferencesMock();
  const app = createAppMock();
  const haptics = {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
  };
  return {
    plugin,
    preferences,
    app,
    haptics,
    providers: [
      { provide: BACKGROUND_GEOLOCATION, useValue: plugin },
      { provide: PREFERENCES, useValue: preferences },
      { provide: CAPACITOR_APP, useValue: app },
      { provide: HAPTICS, useValue: haptics },
      { provide: NativePlatformService, useValue: platformStub(platform) },
    ],
  };
}
