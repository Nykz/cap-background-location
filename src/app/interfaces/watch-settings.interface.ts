import type { Accuracy, ActivityType } from '@capawesome-team/capacitor-background-geolocation';

/** User-tunable options for a watch session (mapped to StartWatchingOptions). */
export interface WatchSettings {
  accuracy: Accuracy;
  distanceFilter: number;
  androidInterval: number;
  androidForceLocationManager: boolean;
  notificationTitle: string;
  notificationText: string;
  iosActivityType: ActivityType;
  iosPausesAutomatically: boolean;
  iosShowBackgroundIndicator: boolean;
}
