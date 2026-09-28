import { Injectable, inject } from '@angular/core';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';
import { HAPTICS } from '../../tokens/native-plugins.tokens';
import { NativePlatformService } from '../platform/native-platform.service';

/** Native haptic feedback; silently no-ops on web or unsupported hardware. */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly haptics = inject(HAPTICS);
  private readonly platform = inject(NativePlatformService);

  async impact(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
    if (!this.platform.isNative) {
      return;
    }
    await this.haptics.impact({ style }).catch(() => undefined);
  }

  async success(): Promise<void> {
    await this.notify(NotificationType.Success);
  }

  async warning(): Promise<void> {
    await this.notify(NotificationType.Warning);
  }

  private async notify(type: NotificationType): Promise<void> {
    if (!this.platform.isNative) {
      return;
    }
    await this.haptics.notification({ type }).catch(() => undefined);
  }
}
