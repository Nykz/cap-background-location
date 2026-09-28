import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { AlertService } from '../../../services/alert/alert.service';
import { QueueService } from '../../../services/queue/queue.service';
import { TrackHistoryService } from '../../../services/track-history/track-history.service';
import { UploadService } from '../../../services/upload/upload.service';
import {
  createNativeTestContext,
  createQueuedPosition,
  type NativeTestContext,
} from '../../../../testing/native-mocks';
import { QueuePage } from './queue.page';

describe('QueuePage', () => {
  let ctx: NativeTestContext;
  let fixture: ComponentFixture<QueuePage>;
  let page: QueuePage;

  beforeEach(async () => {
    ctx = createNativeTestContext('android');
    ctx.plugin.getQueueStatus.mockResolvedValue({ pendingCount: 2, droppedCount: 0, lastUploadedAt: null });
    ctx.plugin.getQueuedPositions.mockResolvedValue({
      positions: [createQueuedPosition(1), createQueuedPosition(2)],
      hasMore: false,
    });
    await TestBed.configureTestingModule({
      imports: [QueuePage],
      providers: [...ctx.providers, provideRouter([]), provideIonicAngular()],
    }).compileComponents();
    fixture = TestBed.createComponent(QueuePage);
    page = fixture.componentInstance;
    page.ionViewWillEnter();
    await vi.waitFor(() => expect(TestBed.inject(QueueService).pendingCount()).toBe(2));
    await fixture.whenStable();
  });

  it('shows the queue status and preview', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-testid="queue-pending"]')?.textContent?.trim()).toBe('2');
    expect(element.textContent).toContain('#1');
    expect(element.textContent).toContain('Queued (2)');
  });

  it('drains without confirmation when upload is off', async () => {
    const confirm = vi.spyOn(TestBed.inject(AlertService), 'confirm');
    ctx.plugin.getQueuedPositions
      .mockResolvedValueOnce({ positions: [createQueuedPosition(1), createQueuedPosition(2)], hasMore: false })
      .mockResolvedValue({ positions: [], hasMore: false });
    await page['drain']();
    expect(confirm).not.toHaveBeenCalled();
    expect(ctx.plugin.deleteQueuedPositions).toHaveBeenCalledWith({ upToId: 2 });
    expect(TestBed.inject(TrackHistoryService).count()).toBe(2);
  });

  it('asks before draining while the HTTP upload shares the queue', async () => {
    ctx.plugin.getConfig.mockResolvedValue({ url: 'https://x.test' });
    await TestBed.inject(UploadService).refreshActiveConfig();
    const confirm = vi.spyOn(TestBed.inject(AlertService), 'confirm').mockResolvedValue(false);
    await page['drain']();
    expect(confirm).toHaveBeenCalled();
    expect(ctx.plugin.deleteQueuedPositions).not.toHaveBeenCalled();
  });

  it('clears the queue only after confirmation', async () => {
    const confirm = vi.spyOn(TestBed.inject(AlertService), 'confirm').mockResolvedValueOnce(false);
    await page['clearQueue']();
    expect(ctx.plugin.clearQueue).not.toHaveBeenCalled();
    confirm.mockResolvedValueOnce(true);
    await page['clearQueue']();
    expect(ctx.plugin.clearQueue).toHaveBeenCalled();
  });

  it('switches to the history view and clears it after confirmation', async () => {
    const history = TestBed.inject(TrackHistoryService);
    await history.append([createQueuedPosition(9)]);
    page['setView']('history');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="history-summary"]')?.textContent).toContain('1 saved');

    vi.spyOn(TestBed.inject(AlertService), 'confirm').mockResolvedValue(true);
    await page['clearHistory']();
    expect(history.count()).toBe(0);
  });

  it('ignores unknown segment values', () => {
    page['setView']('bogus');
    expect(page['view']()).toBe('queued');
  });
});
