import { TestBed } from '@angular/core/testing';
import { NativePlatformService } from '../../services/platform/native-platform.service';
import { platformStub } from '../../../testing/native-mocks';
import { NativeOnlyBannerComponent } from './native-only-banner.component';

describe('NativeOnlyBannerComponent', () => {
  async function render(platform: 'web' | 'ios'): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [NativeOnlyBannerComponent],
      providers: [{ provide: NativePlatformService, useValue: platformStub(platform) }],
    }).compileComponents();
    const fixture = TestBed.createComponent(NativeOnlyBannerComponent);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('is shown in the browser', async () => {
    const element = await render('web');
    expect(element.querySelector('[data-testid="native-only-banner"]')).not.toBeNull();
    expect(element.textContent).toContain('Runs on Android & iOS only');
  });

  it('is hidden on a device', async () => {
    const element = await render('ios');
    expect(element.querySelector('[data-testid="native-only-banner"]')).toBeNull();
  });
});
