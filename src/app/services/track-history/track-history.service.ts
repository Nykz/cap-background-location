import { Injectable, computed, inject, signal } from '@angular/core';
import type { QueuedPosition } from '@capawesome-team/capacitor-background-geolocation';
import { TRACK_HISTORY_LIMIT } from '../../enums/app-constants.enum';
import { StorageKey } from '../../enums/storage-keys.enum';
import { pathLength } from '../../utils/geo.util';
import { StorageService } from '../storage/storage.service';

/**
 * App-side persistence target for positions drained from the native queue.
 * Stored in Preferences, deduplicated by queue id, capped to the newest N.
 */
@Injectable({ providedIn: 'root' })
export class TrackHistoryService {
  private readonly storage = inject(StorageService);
  private readonly _positions = signal<QueuedPosition[]>([]);

  readonly positions = this._positions.asReadonly();
  readonly count = computed(() => this._positions().length);
  readonly distanceMeters = computed(() => pathLength(this._positions()));
  readonly newestFirst = computed(() => [...this._positions()].reverse());

  async load(): Promise<void> {
    const stored = await this.storage.get<QueuedPosition[]>(StorageKey.TrackHistory);
    this._positions.set(Array.isArray(stored) ? stored : []);
  }

  /** Appends positions (idempotent by id) and persists them. */
  async append(positions: readonly QueuedPosition[]): Promise<void> {
    if (!positions.length) {
      return;
    }
    const known = new Set(this._positions().map((p) => p.id));
    const merged = [...this._positions(), ...positions.filter((p) => !known.has(p.id))]
      .sort((a, b) => a.id - b.id)
      .slice(-TRACK_HISTORY_LIMIT);
    this._positions.set(merged);
    await this.storage.set(StorageKey.TrackHistory, merged);
  }

  async clear(): Promise<void> {
    this._positions.set([]);
    await this.storage.remove(StorageKey.TrackHistory);
  }
}
