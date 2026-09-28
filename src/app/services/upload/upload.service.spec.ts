import { TestBed } from '@angular/core/testing';
import { StorageKey } from '../../enums/storage-keys.enum';
import { createNativeTestContext, type NativeTestContext } from '../../../testing/native-mocks';
import { ToastService } from '../toast/toast.service';
import { DEFAULT_UPLOAD_SETTINGS, UploadService, toSetConfigOptions } from './upload.service';

describe('toSetConfigOptions', () => {
  it('returns null when neither queue nor upload is enabled', () => {
    expect(toSetConfigOptions({ ...DEFAULT_UPLOAD_SETTINGS, queueEnabled: false })).toBeNull();
  });

  it('enables the queue only', () => {
    expect(toSetConfigOptions(DEFAULT_UPLOAD_SETTINGS)).toEqual({ maxSize: 50_000 });
  });

  it('maps upload options, bearer header and extras', () => {
    expect(
      toSetConfigOptions({
        ...DEFAULT_UPLOAD_SETTINGS,
        uploadEnabled: true,
        url: ' https://api.example.com/positions ',
        bearerToken: ' abc ',
        deviceLabel: 'Pixel',
        batchSize: 10,
        flushInterval: 30_000,
      }),
    ).toEqual({
      maxSize: 50_000,
      url: 'https://api.example.com/positions',
      batchSize: 10,
      flushInterval: 30_000,
      headers: { Authorization: 'Bearer abc' },
      extras: { device: 'Pixel' },
    });
  });

  it('omits empty headers/extras and clamps batchSize to maxSize', () => {
    const options = toSetConfigOptions({
      ...DEFAULT_UPLOAD_SETTINGS,
      queueEnabled: false,
      uploadEnabled: true,
      maxSize: 5,
      batchSize: 100,
    });
    expect(options?.batchSize).toBe(5);
    expect(options?.headers).toBeUndefined();
    expect(options?.extras).toBeUndefined();
  });
});

describe('UploadService', () => {
  let ctx: NativeTestContext;
  let service: UploadService;

  function setup(platform: 'android' | 'web' = 'android'): void {
    ctx = createNativeTestContext(platform);
    TestBed.configureTestingModule({ providers: ctx.providers });
    service = TestBed.inject(UploadService);
  }

  it('re-applies the stored configuration on every start (docs recommendation)', async () => {
    setup();
    ctx.preferences.store.set(StorageKey.UploadConfig, JSON.stringify({ maxSize: 1234 }));
    ctx.plugin.getConfig.mockResolvedValue({ maxSize: 1234 });
    await service.initialize();
    expect(ctx.plugin.setConfig).toHaveBeenCalledWith({ maxSize: 1234 });
    expect(ctx.plugin.addListener).toHaveBeenCalledWith('uploadFailed', expect.any(Function));
    expect(service.queueActive()).toBe(true);
    expect(service.uploadActive()).toBe(false);
  });

  it('calls resetConfig when everything is disabled', async () => {
    setup();
    await service.save({ ...DEFAULT_UPLOAD_SETTINGS, queueEnabled: false });
    expect(ctx.plugin.resetConfig).toHaveBeenCalled();
    expect(ctx.plugin.setConfig).not.toHaveBeenCalled();
  });

  it('persists and applies a new configuration', async () => {
    setup();
    ctx.plugin.getConfig.mockResolvedValue({ maxSize: 50_000, url: 'https://x.test' });
    const ok = await service.save({ ...DEFAULT_UPLOAD_SETTINGS, uploadEnabled: true, url: 'https://x.test' });
    expect(ok).toBe(true);
    expect(ctx.plugin.setConfig).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://x.test' }));
    expect(JSON.parse(ctx.preferences.store.get(StorageKey.UploadConfig)!).url).toBe('https://x.test');
    expect(service.uploadActive()).toBe(true);
    expect(service.busy()).toBe(false);
  });

  it('reports a rejected setConfig', async () => {
    setup();
    ctx.plugin.setConfig.mockRejectedValue({ message: 'batchSize > maxSize' });
    expect(await service.save(DEFAULT_UPLOAD_SETTINGS)).toBe(false);
    expect(TestBed.inject(ToastService).current()?.message).toContain('batchSize > maxSize');
  });

  it('reset discards the native config but keeps the queue', async () => {
    setup();
    await service.reset();
    expect(ctx.plugin.resetConfig).toHaveBeenCalled();
    expect(ctx.plugin.clearQueue).not.toHaveBeenCalled();
    expect(service.settings().queueEnabled).toBe(false);
    expect(service.settings().uploadEnabled).toBe(false);
  });

  it('triggers an upload and reports when no url is set', async () => {
    setup();
    await service.triggerUpload();
    expect(ctx.plugin.triggerUpload).toHaveBeenCalled();
    ctx.plugin.triggerUpload.mockRejectedValue({ message: 'No url configured' });
    await service.triggerUpload();
    expect(TestBed.inject(ToastService).current()?.message).toContain('No url configured');
  });

  it('logs uploadFailed events newest first', async () => {
    setup();
    await service.initialize();
    ctx.plugin.emit('uploadFailed', { message: 'Server error', statusCode: 503 });
    ctx.plugin.emit('uploadFailed', { message: 'Offline' });
    expect(service.failures().map((f) => f.message)).toEqual(['Offline', 'Server error']);
    expect(service.failures()[1].statusCode).toBe(503);
    service.clearFailures();
    expect(service.failures()).toEqual([]);
  });

  it('persists settings but skips native calls on the web', async () => {
    setup('web');
    await service.initialize();
    expect(await service.save(DEFAULT_UPLOAD_SETTINGS)).toBe(true);
    await service.triggerUpload();
    expect(ctx.plugin.setConfig).not.toHaveBeenCalled();
    expect(ctx.plugin.triggerUpload).not.toHaveBeenCalled();
    expect(ctx.preferences.store.has(StorageKey.UploadConfig)).toBe(true);
  });
});
