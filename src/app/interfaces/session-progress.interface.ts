import type { DistanceAnchor } from '../utils/geo.util';

/** Running trip totals, persisted so they survive the web view being suspended or killed. */
export interface SessionProgress {
  distanceMeters: number;
  points: number;
  anchor: DistanceAnchor | null;
  /** Highest native queue id already accounted for. */
  lastQueueId: number;
}
