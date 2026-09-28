import { TestBed } from '@angular/core/testing';
import { NotificationType } from '@capacitor/haptics';
import { createNativeTestContext, type NativeTestContext } from '../../../testing/native-mocks';
import { HapticsService } from './haptics.service';

describe('HapticsService', () => {
  function setup(platform: 'android' | 'web'): { ctx: NativeTestContext; service: HapticsService } {
    const ctx = createNativeTestContext(platform);
    TestBed.configureTestingModule({ providers: ctx.providers });
    return { ctx, service: TestBed.inject(HapticsService) };
  }

  it('triggers native haptics on devices', async () => {
    const { ctx, service } = setup('android');
    await service.impact();
    await service.success();
    await service.warning();
    expect(ctx.haptics.impact).toHaveBeenCalled();
    expect(ctx.haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
    expect(ctx.haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });
  });

  it('does nothing on the web', async () => {
    const { ctx, service } = setup('web');
    await service.impact();
    await service.success();
    expect(ctx.haptics.impact).not.toHaveBeenCalled();
    expect(ctx.haptics.notification).not.toHaveBeenCalled();
  });

  it('swallows hardware errors', async () => {
    const { ctx, service } = setup('android');
    ctx.haptics.impact.mockRejectedValue(new Error('no vibrator'));
    await expect(service.impact()).resolves.toBeUndefined();
  });
});
