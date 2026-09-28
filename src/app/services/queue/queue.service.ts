import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  GetQueueStatusResult,
  QueuedPosition,
} from '@capawesome-team/capacitor-background-geolocation';
import { QUEUE_DRAIN_PAGE_SIZE, QUEUE_PREVIEW_LIMIT } from '../../enums/app-constants.enum';
import { BACKGROUND_GEOLOCATION } from '../../tokens/native-plugins.tokens';
import { toPluginError } from '../../utils/plugin-error.util';
import { NativePlatformService } from '../platform/native-platform.service';
import { ToastService } from '../toast/toast.service';
import { TrackHistoryService } from '../track-history/track-history.service';

/**
 * Reads, drains and clears the plugin's native SQLite queue — the durable
 * record of a watch session that survives a suspended web view.
 */
@Injectable({ providedIn: 'root' })
export class QueueService {
  private readonly plugin = inject(BACKGROUND_GEOLOCATION);
  private readonly platform = inject(NativePlatformService);
  private readonly history = inject(TrackHistoryService);
  private readonly toast = inject(ToastService);

  private readonly _status = signal<GetQueueStatusResult | null>(null);
  private readonly _preview = signal<QueuedPosition[]>([]);
  private readonly _hasMore = signal(false);
  private readonly _busy = signal(false);

  readonly status = this._status.asReadonly();
  /** Oldest first, up to QUEUE_PREVIEW_LIMIT (read-only peek, nothing deleted). */
  readonly preview = this._preview.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly pendingCount = computed(() => this._status()?.pendingCount ?? 0);

  async refresh(): Promise<void> {
    if (!this.platform.isNative) {
      return;
    }
    try {
      const [status, page] = await Promise.all([
        this.plugin.getQueueStatus(),
        this.plugin.getQueuedPositions({ limit: QUEUE_PREVIEW_LIMIT }),
      ]);
      this._status.set(status);
      this._preview.set(page.positions);
      this._hasMore.set(page.hasMore);
    } catch (error) {
      this.toast.error(`Could not read the queue: ${toPluginError(error).message}`);
    }
  }

  /**
   * Drain loop from the plugin docs: read a page, persist it, then delete up
   * to the last persisted id. Returns the number of drained positions.
   */
  async drain(): Promise<number> {
    if (!this.platform.isNative || this._busy()) {
      return 0;
    }
    this._busy.set(true);
    let drained = 0;
    try {
      let hasMore = true;
      while (hasMore) {
        const result = await this.plugin.getQueuedPositions({ limit: QUEUE_DRAIN_PAGE_SIZE });
        if (!result.positions.length) {
          break;
        }
        await this.history.append(result.positions);
        await this.plugin.deleteQueuedPositions({
          upToId: result.positions[result.positions.length - 1].id,
        });
        drained += result.positions.length;
        hasMore = result.hasMore;
      }
      this.toast.success(`Saved ${drained} position${drained === 1 ? '' : 's'} to history.`);
    } catch (error) {
      this.toast.error(`Drain stopped: ${toPluginError(error).message}`);
    } finally {
      this._busy.set(false);
      await this.refresh();
    }
    return drained;
  }

  /** Deletes every queued position and resets the dropped counter. */
  async clear(): Promise<void> {
    if (!this.platform.isNative) {
      return;
    }
    this._busy.set(true);
    try {
      await this.plugin.clearQueue();
      this.toast.show('Queue cleared.');
    } catch (error) {
      this.toast.error(`Could not clear the queue: ${toPluginError(error).message}`);
    } finally {
      this._busy.set(false);
      await this.refresh();
    }
  }
}
