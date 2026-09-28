import { InjectionToken } from '@angular/core';
import { App } from '@capacitor/app';
import { Haptics } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import {
  BackgroundGeolocation,
  type BackgroundGeolocationPlugin,
} from '@capawesome-team/capacitor-background-geolocation';

/**
 * Native plugins are provided through injection tokens (Dependency Inversion):
 * services depend on the plugin *contract*, never on the global singleton,
 * so every service can be unit-tested with a plain mock object.
 */
export const BACKGROUND_GEOLOCATION = new InjectionToken<BackgroundGeolocationPlugin>(
  'BACKGROUND_GEOLOCATION',
  { providedIn: 'root', factory: () => BackgroundGeolocation },
);

export type PreferencesPlugin = Pick<typeof Preferences, 'get' | 'set' | 'remove'>;
export const PREFERENCES = new InjectionToken<PreferencesPlugin>('PREFERENCES', {
  providedIn: 'root',
  factory: () => Preferences,
});

export type AppPlugin = Pick<typeof App, 'addListener'>;
export const CAPACITOR_APP = new InjectionToken<AppPlugin>('CAPACITOR_APP', {
  providedIn: 'root',
  factory: () => App,
});

export type HapticsPlugin = Pick<typeof Haptics, 'impact' | 'notification'>;
export const HAPTICS = new InjectionToken<HapticsPlugin>('HAPTICS', {
  providedIn: 'root',
  factory: () => Haptics,
});
