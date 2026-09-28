import { TestBed } from '@angular/core/testing';
import { createNativeTestContext, type NativeTestContext } from '../../../testing/native-mocks';
import { AppLifecycleService } from './app-lifecycle.service';

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('AppLifecycleService', () => {
  let ctx: NativeTestContext;
  let service: AppLifecycleService;

  function setup(platform: 'android' | 'web' = 'android'): void {
    ctx = createNativeTestContext(platform);
    TestBed.configureTestingModule({ providers: ctx.providers });
    service = TestBed.inject(AppLifecycleService);
  }

  it('boots config, listeners and native state once', async () => {
    setup();
    await service.initialize();
    await service.initialize();
    expect(ctx.plugin.setConfig).toHaveBeenCalledTimes(1);
    expect(ctx.plugin.addListener).toHaveBeenCalledWith('positionChange', expect.any(Function));
    expect(ctx.plugin.addListener).toHaveBeenCalledWith('uploadFailed', expect.any(Function));
    expect(ctx.plugin.checkPermissions).toHaveBeenCalled();
    expect(ctx.plugin.getQueueStatus).toHaveBeenCalled();
    expect(ctx.app.addListener).toHaveBeenCalledWith('resume', expect.any(Function));
  });

  it('re-syncs native state when the app resumes', async () => {
    setup();
    await service.initialize();
    ctx.plugin.getQueueStatus.mockClear();
    ctx.plugin.isWatching.mockClear();
    ctx.app.emit('resume');
    await flush();
    expect(ctx.plugin.getQueueStatus).toHaveBeenCalled();
    expect(ctx.plugin.isWatching).toHaveBeenCalled();
  });

  it('only loads persisted state on the web', async () => {
    setup('web');
    await service.initialize();
    expect(ctx.preferences.get).toHaveBeenCalled();
    expect(ctx.plugin.addListener).not.toHaveBeenCalled();
    expect(ctx.app.addListener).not.toHaveBeenCalled();
  });

  it('tears down listeners and can initialize again', async () => {
    setup();
    await service.initialize();
    await service.destroy();
    await service.initialize();
    expect(ctx.plugin.setConfig).toHaveBeenCalledTimes(2);
  });
});
