import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export type AppPlatform = 'android' | 'ios' | 'web';

/** Single source of truth for "which platform are we running on". */
@Injectable({ providedIn: 'root' })
export class NativePlatformService {
  readonly platform: AppPlatform = Capacitor.getPlatform() as AppPlatform;
  readonly isNative: boolean = Capacitor.isNativePlatform();
  readonly isAndroid: boolean = this.platform === 'android';
  readonly isIos: boolean = this.platform === 'ios';
}
