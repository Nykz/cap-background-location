import { TestBed } from '@angular/core/testing';
import { NativePlatformService } from './native-platform.service';

describe('NativePlatformService', () => {
  it('detects the web platform under test (jsdom)', () => {
    const service = TestBed.inject(NativePlatformService);
    expect(service.platform).toBe('web');
    expect(service.isNative).toBe(false);
    expect(service.isAndroid).toBe(false);
    expect(service.isIos).toBe(false);
  });
});
