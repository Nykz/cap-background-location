import { TestBed } from '@angular/core/testing';
import { QUEUE_DRAIN_PAGE_SIZE, QUEUE_PREVIEW_LIMIT } from '../../enums/app-constants.enum';
import {
  createNativeTestContext,
  createQueuedPosition,
  type NativeTestContext,
} from '../../../testing/native-mocks';
import { TrackHistoryService } from '../track-history/track-history.service';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let ctx: NativeTestContext;
  let service: QueueService;
  let history: TrackHistoryService;

  function setup(platform: 'android' | 'web' = 'android'): void {
    ctx = createNativeTestContext(platform);
    TestBed.configureTestingModule({ providers: ctx.providers });
    service = TestBed.inject(QueueService);
    history = TestBed.inject(TrackHistoryService);
  }

  it('refreshes status and a read-only preview', async () => {
    setup();
    ctx.plugin.getQueueStatus.mockResolvedValue({ pendingCount: 3, droppedCount: 1, lastUploadedAt: 5 });
    ctx.plugin.getQueuedPositions.mockResolvedValue({ positions: [createQueuedPosition(1)], hasMore: true });
    await service.refresh();
    expect(ctx.plugin.getQueuedPositions).toHaveBeenCalledWith({ limit: QUEUE_PREVIEW_LIMIT });
    expect(service.pendingCount()).toBe(3);
    expect(service.status()?.droppedCount).toBe(1);
    expect(service.preview()).toHaveLength(1);
    expect(service.hasMore()).toBe(true);
    expect(ctx.plugin.deleteQueuedPositions).not.toHaveBeenCalled();
  });

  it('drains page by page: persist first, then delete up to the last id', async () => {
    setup();
    const order: string[] = [];
    const page1 = [createQueuedPosition(1), createQueuedPosition(2)];
    const page2 = [createQueuedPosition(3)];
    ctx.plugin.getQueuedPositions
      .mockResolvedValueOnce({ positions: page1, hasMore: true })
      .mockResolvedValueOnce({ positions: page2, hasMore: false })
      .mockResolvedValue({ positions: [], hasMore: false });
    vi.spyOn(history, 'append').mockImplementation(async () => {
      order.push('persist');
    });
    ctx.plugin.deleteQueuedPositions.mockImplementation(async ({ upToId }: { upToId: number }) => {
      order.push(`delete:${upToId}`);
    });

    expect(await service.drain()).toBe(3);
    expect(ctx.plugin.getQueuedPositions).toHaveBeenCalledWith({ limit: QUEUE_DRAIN_PAGE_SIZE });
    expect(order).toEqual(['persist', 'delete:2', 'persist', 'delete:3']);
    expect(service.busy()).toBe(false);
  });

  it('stops on an empty page', async () => {
    setup();
    expect(await service.drain()).toBe(0);
    expect(ctx.plugin.deleteQueuedPositions).not.toHaveBeenCalled();
  });

  it('never deletes positions that failed to persist', async () => {
    setup();
    ctx.plugin.getQueuedPositions.mockResolvedValue({ positions: [createQueuedPosition(1)], hasMore: true });
    vi.spyOn(history, 'append').mockRejectedValue(new Error('disk full'));
    expect(await service.drain()).toBe(0);
    expect(ctx.plugin.deleteQueuedPositions).not.toHaveBeenCalled();
  });

  it('actually stores drained positions in the history', async () => {
    setup();
    ctx.plugin.getQueuedPositions
      .mockResolvedValueOnce({ positions: [createQueuedPosition(7)], hasMore: false })
      .mockResolvedValue({ positions: [], hasMore: false });
    await service.drain();
    expect(history.positions().map((p) => p.id)).toEqual([7]);
  });

  it('clears the queue and refreshes', async () => {
    setup();
    await service.clear();
    expect(ctx.plugin.clearQueue).toHaveBeenCalled();
    expect(ctx.plugin.getQueueStatus).toHaveBeenCalled();
  });

  it('does nothing on the web', async () => {
    setup('web');
    await service.refresh();
    expect(await service.drain()).toBe(0);
    await service.clear();
    expect(ctx.plugin.getQueueStatus).not.toHaveBeenCalled();
    expect(ctx.plugin.clearQueue).not.toHaveBeenCalled();
  });
});
