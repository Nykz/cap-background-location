export interface TripStats {
  points: number;
  distanceMeters: number;
  durationMs: number;
  averageSpeedMps: number | null;
  /** OS-reported speed of the newest fix. */
  currentSpeedMps: number | null;
}
