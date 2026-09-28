import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { QueueService } from '../../services/queue/queue.service';
import { TrackingService } from '../../services/tracking/tracking.service';
import { createNativeTestContext, type NativeTestContext } from '../../../testing/native-mocks';
import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  let ctx: NativeTestContext;

  async function render() {
    ctx = createNativeTestContext('android');
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [...ctx.providers, provideRouter([]), provideIonicAngular()],
    }).compileComponents();
    const fixture = TestBed.createComponent(TabsPage);
    await fixture.whenStable();
    return fixture;
  }

  it('renders the four tabs', async () => {
    const fixture = await render();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('ion-tab-button ion-label')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Tracker', 'Queue', 'Upload', 'Settings']);
  });

  it('shows the Live badge while tracking and the pending queue count', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.textContent).not.toContain('Live');

    await TestBed.inject(TrackingService).start();
    ctx.plugin.getQueueStatus.mockResolvedValue({ pendingCount: 1500, droppedCount: 0, lastUploadedAt: null });
    await TestBed.inject(QueueService).refresh();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Live');
    expect(fixture.nativeElement.textContent).toContain('999+');
  });
});
