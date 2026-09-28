import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { Accuracy } from '@capawesome-team/capacitor-background-geolocation';
import type { AppPlatform } from '../../../services/platform/native-platform.service';
import { AlertService } from '../../../services/alert/alert.service';
import { TrackingService } from '../../../services/tracking/tracking.service';
import { ToastService } from '../../../services/toast/toast.service';
import { WatchSettingsService } from '../../../services/watch-settings/watch-settings.service';
import { createNativeTestContext, type NativeTestContext } from '../../../../testing/native-mocks';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let ctx: NativeTestContext;
  let fixture: ComponentFixture<SettingsPage>;
  let page: SettingsPage;

  async function render(platform: AppPlatform = 'android'): Promise<void> {
    ctx = createNativeTestContext(platform);
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [...ctx.providers, provideRouter([]), provideIonicAngular()],
    }).compileComponents();
    fixture = TestBed.createComponent(SettingsPage);
    page = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('checks permissions on enter and shows them', async () => {
    await render();
    page.ionViewWillEnter();
    await vi.waitFor(() => expect(ctx.plugin.checkPermissions).toHaveBeenCalled());
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="perm-location"]')?.textContent).toContain('Granted');
  });

  it('shows only Android options on Android', async () => {
    await render('android');
    expect(fixture.nativeElement.textContent).toContain('Force platform LocationManager');
    expect(fixture.nativeElement.textContent).not.toContain('Pause automatically');
  });

  it('shows only iOS options on iOS', async () => {
    await render('ios');
    expect(fixture.nativeElement.textContent).toContain('Pause automatically');
    expect(fixture.nativeElement.textContent).not.toContain('Force platform LocationManager');
  });

  it('requires a notification title and text', async () => {
    await render();
    page['form'].notificationTitle().value.set('');
    expect(page['form'].notificationTitle().invalid()).toBe(true);
    await page['save']();
    expect(TestBed.inject(WatchSettingsService).settings().notificationTitle).toBe('Location Tracking');
  });

  it('saves valid settings', async () => {
    await render();
    page['form'].accuracy().value.set(Accuracy.Balanced);
    page['form'].distanceFilter().value.set(25);
    await page['save']();
    const saved = TestBed.inject(WatchSettingsService).settings();
    expect(saved.accuracy).toBe(Accuracy.Balanced);
    expect(saved.distanceFilter).toBe(25);
    expect(TestBed.inject(ToastService).current()?.message).toBe('Tracking settings saved.');
  });

  it('tells the user to restart an active session', async () => {
    await render();
    await TestBed.inject(TrackingService).start();
    await page['save']();
    expect(TestBed.inject(ToastService).current()?.message).toContain('Stop and start tracking');
  });

  it('restores defaults after confirmation', async () => {
    await render();
    const service = TestBed.inject(WatchSettingsService);
    await service.save({ ...service.settings(), distanceFilter: 99 });
    vi.spyOn(TestBed.inject(AlertService), 'confirm').mockResolvedValue(true);
    await page['restoreDefaults']();
    expect(service.settings().distanceFilter).toBe(5);
  });

  it('formats the range pin', async () => {
    await render();
    expect(page['formatMeters'](15)).toBe('15 m');
  });
});
