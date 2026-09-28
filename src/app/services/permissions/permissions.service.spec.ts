import { TestBed } from '@angular/core/testing';
import type { PermissionStatus } from '@capawesome-team/capacitor-background-geolocation';
import { TEMPORARY_FULL_ACCURACY_PURPOSE_KEY } from '../../enums/app-constants.enum';
import { createNativeTestContext, GRANTED, type NativeTestContext } from '../../../testing/native-mocks';
import { ToastService } from '../toast/toast.service';
import { PermissionsService } from './permissions.service';

const PROMPT: PermissionStatus = { location: 'prompt', backgroundLocation: 'prompt', notifications: 'prompt' };

describe('PermissionsService', () => {
  let ctx: NativeTestContext;
  let service: PermissionsService;

  function setup(platform: 'android' | 'ios' | 'web' = 'android'): void {
    ctx = createNativeTestContext(platform);
    TestBed.configureTestingModule({ providers: ctx.providers });
    service = TestBed.inject(PermissionsService);
  }

  it('checks and exposes permission state', async () => {
    setup();
    ctx.plugin.checkPermissions.mockResolvedValue({ ...PROMPT, location: 'granted' });
    await service.check();
    expect(service.locationGranted()).toBe(true);
    expect(service.backgroundGranted()).toBe(false);
    expect(service.notificationsGranted()).toBe(false);
  });

  it('requests foreground location and notifications together', async () => {
    setup();
    await service.requestForeground();
    expect(ctx.plugin.requestPermissions).toHaveBeenCalledWith({ permissions: ['location', 'notifications'] });
    expect(service.status()).toEqual(GRANTED);
    expect(service.busy()).toBe(false);
  });

  it('requests background location as a separate second step', async () => {
    setup();
    ctx.plugin.requestPermissions
      .mockResolvedValueOnce({ ...PROMPT, location: 'granted' })
      .mockResolvedValueOnce(GRANTED);
    await service.requestBackground();
    expect(ctx.plugin.requestPermissions).toHaveBeenNthCalledWith(1, { permissions: ['location', 'notifications'] });
    expect(ctx.plugin.requestPermissions).toHaveBeenNthCalledWith(2, { permissions: ['backgroundLocation'] });
  });

  it('does not ask for background when foreground was denied', async () => {
    setup();
    ctx.plugin.requestPermissions.mockResolvedValue({ ...PROMPT, location: 'denied' });
    await service.requestBackground();
    expect(ctx.plugin.requestPermissions).toHaveBeenCalledTimes(1);
    expect(service.locationDenied()).toBe(true);
  });

  it('reports failures through a toast', async () => {
    setup();
    ctx.plugin.checkPermissions.mockRejectedValue({ message: 'boom' });
    expect(await service.check()).toBeNull();
    expect(TestBed.inject(ToastService).current()?.message).toContain('boom');
  });

  it('opens the native settings page', async () => {
    setup();
    await service.openSettings();
    expect(ctx.plugin.openSettings).toHaveBeenCalled();
  });

  it('requests temporary full accuracy on iOS only', async () => {
    setup('ios');
    await service.requestTemporaryFullAccuracy();
    expect(ctx.plugin.requestTemporaryFullAccuracy).toHaveBeenCalledWith({
      purposeKey: TEMPORARY_FULL_ACCURACY_PURPOSE_KEY,
    });
  });

  it('skips temporary full accuracy on Android', async () => {
    setup('android');
    await service.requestTemporaryFullAccuracy();
    expect(ctx.plugin.requestTemporaryFullAccuracy).not.toHaveBeenCalled();
  });

  it('never calls the plugin on the web', async () => {
    setup('web');
    expect(await service.check()).toBeNull();
    expect(await service.requestForeground()).toBeNull();
    await service.openSettings();
    expect(ctx.plugin.checkPermissions).not.toHaveBeenCalled();
    expect(ctx.plugin.requestPermissions).not.toHaveBeenCalled();
    expect(ctx.plugin.openSettings).not.toHaveBeenCalled();
  });
});
