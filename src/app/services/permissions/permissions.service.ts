import { Injectable, computed, inject, signal } from '@angular/core';
import type { PermissionStatus } from '@capawesome-team/capacitor-background-geolocation';
import { TEMPORARY_FULL_ACCURACY_PURPOSE_KEY } from '../../enums/app-constants.enum';
import { BACKGROUND_GEOLOCATION } from '../../tokens/native-plugins.tokens';
import { toPluginError } from '../../utils/plugin-error.util';
import { NativePlatformService } from '../platform/native-platform.service';
import { ToastService } from '../toast/toast.service';

/**
 * Owns location / background location / notification permission state and
 * the two-step background upgrade flow described in the plugin docs.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly plugin = inject(BACKGROUND_GEOLOCATION);
  private readonly platform = inject(NativePlatformService);
  private readonly toast = inject(ToastService);

  private readonly _status = signal<PermissionStatus | null>(null);
  private readonly _busy = signal(false);

  readonly status = this._status.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly locationGranted = computed(() => this._status()?.location === 'granted');
  readonly backgroundGranted = computed(() => this._status()?.backgroundLocation === 'granted');
  readonly notificationsGranted = computed(() => this._status()?.notifications === 'granted');
  readonly locationDenied = computed(() => this._status()?.location === 'denied');

  async check(): Promise<PermissionStatus | null> {
    if (!this.platform.isNative) {
      return null;
    }
    try {
      const status = await this.plugin.checkPermissions();
      this._status.set(status);
      return status;
    } catch (error) {
      this.toast.error(`Could not check permissions: ${toPluginError(error).message}`);
      return null;
    }
  }

  /** Step 1: foreground location (+ notifications for the Android foreground service). */
  requestForeground(): Promise<PermissionStatus | null> {
    return this.request(['location', 'notifications']);
  }

  /**
   * Step 2: background location. Must be a separate call after step 1.
   * Android 11+ opens the app's location settings; iOS shows the "Always" upgrade prompt.
   */
  async requestBackground(): Promise<PermissionStatus | null> {
    if (!this.locationGranted()) {
      const status = await this.requestForeground();
      if (status?.location !== 'granted') {
        return status;
      }
    }
    return this.request(['backgroundLocation']);
  }

  async openSettings(): Promise<void> {
    if (!this.platform.isNative) {
      return;
    }
    try {
      await this.plugin.openSettings();
    } catch (error) {
      this.toast.error(`Could not open settings: ${toPluginError(error).message}`);
    }
  }

  /** iOS only: asks users who granted "approximate" location for precise location. */
  async requestTemporaryFullAccuracy(): Promise<void> {
    if (!this.platform.isIos) {
      return;
    }
    try {
      await this.plugin.requestTemporaryFullAccuracy({
        purposeKey: TEMPORARY_FULL_ACCURACY_PURPOSE_KEY,
      });
      this.toast.success('Full accuracy request completed.');
    } catch (error) {
      this.toast.error(`Full accuracy request failed: ${toPluginError(error).message}`);
    }
  }

  private async request(
    permissions: ('location' | 'notifications' | 'backgroundLocation')[],
  ): Promise<PermissionStatus | null> {
    if (!this.platform.isNative) {
      return null;
    }
    this._busy.set(true);
    try {
      const status = await this.plugin.requestPermissions({ permissions });
      this._status.set(status);
      return status;
    } catch (error) {
      this.toast.error(`Permission request failed: ${toPluginError(error).message}`);
      return null;
    } finally {
      this._busy.set(false);
    }
  }
}
