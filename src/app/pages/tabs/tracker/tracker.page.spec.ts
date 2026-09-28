import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { ErrorCode } from '@capawesome-team/capacitor-background-geolocation';
import { TrackingService } from '../../../services/tracking/tracking.service';
import {
  createNativeTestContext,
  createPosition,
  type NativeTestContext,
} from '../../../../testing/native-mocks';
import { TrackerPage } from './tracker.page';

describe('TrackerPage', () => {
  let ctx: NativeTestContext;
  let fixture: ComponentFixture<TrackerPage>;
  let element: HTMLElement;

  const byTestId = (id: string) => element.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

  async function render(platform: 'android' | 'web' = 'android'): Promise<void> {
    ctx = createNativeTestContext(platform);
    await TestBed.configureTestingModule({
      imports: [TrackerPage],
      providers: [...ctx.providers, provideRouter([]), provideIonicAngular()],
    }).compileComponents();
    fixture = TestBed.createComponent(TrackerPage);
    element = fixture.nativeElement;
    await TestBed.inject(TrackingService).initialize();
    await fixture.whenStable();
  }

  afterEach(() => vi.useRealTimers());

  it('starts idle with an empty state', async () => {
    await render();
    expect(byTestId('status-chip')?.textContent).toContain('Idle');
    expect(byTestId('session-title')?.textContent).toContain('Ready to track');
    expect(byTestId('toggle-tracking')?.textContent).toContain('Start tracking');
    expect(element.textContent).toContain('No fix yet');
  });

  it('starts and stops tracking from the main button', async () => {
    await render();
    byTestId('toggle-tracking')!.click();
    await vi.waitFor(() => expect(ctx.plugin.startWatching).toHaveBeenCalled());
    await fixture.whenStable();
    expect(byTestId('status-chip')?.textContent).toContain('Live');
    expect(byTestId('toggle-tracking')?.textContent).toContain('Stop tracking');

    byTestId('toggle-tracking')!.click();
    await vi.waitFor(() => expect(ctx.plugin.stopWatching).toHaveBeenCalled());
    await fixture.whenStable();
    expect(byTestId('status-chip')?.textContent).toContain('Idle');
  });

  it('renders live positions and trip stats', async () => {
    await render();
    await TestBed.inject(TrackingService).start();
    ctx.plugin.emit('positionChange', { position: createPosition({ latitude: 0, longitude: 0, timestamp: 1 }) });
    ctx.plugin.emit('positionChange', { position: createPosition({ latitude: 0.01, longitude: 0, timestamp: 2 }) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    expect(byTestId('stat-points')?.textContent?.trim()).toBe('2');
    expect(byTestId('stat-distance')?.textContent?.trim()).toBe('1.11 km');
    expect(byTestId('position-latitude')?.textContent).toContain('0.010000° N');
  });

  it('ticks the session clock while tracking', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    await render();
    await TestBed.inject(TrackingService).start();
    await fixture.whenStable();
    vi.advanceTimersByTime(3_000);
    await fixture.whenStable();
    expect(byTestId('stat-duration')?.textContent?.trim()).toBe('00:03');
  });

  it('shows the current position on request', async () => {
    await render();
    byTestId('current-position')!.click();
    await vi.waitFor(() => expect(ctx.plugin.getCurrentPosition).toHaveBeenCalled());
    await fixture.whenStable();
    expect(byTestId('position-latitude')?.textContent).toContain('52.520000° N');
  });

  it('shows positionError events', async () => {
    await render();
    ctx.plugin.emit('positionError', { code: ErrorCode.LocationServicesDisabled, message: 'GPS is off' });
    await fixture.whenStable();
    expect(byTestId('tracking-error')?.textContent).toContain('GPS is off');
  });

  it('disables native actions in the browser', async () => {
    await render('web');
    expect(byTestId('native-only-banner')).not.toBeNull();
    expect((byTestId('toggle-tracking') as unknown as { disabled: boolean }).disabled).toBe(true);
    expect((byTestId('current-position') as unknown as { disabled: boolean }).disabled).toBe(true);
  });
});
