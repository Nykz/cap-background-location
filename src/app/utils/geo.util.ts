import type { Position } from '@capawesome-team/capacitor-background-geolocation';

const EARTH_RADIUS_METERS = 6_371_008.8;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two positions (haversine), in meters. */
export function distanceBetween(
  from: Pick<Position, 'latitude' | 'longitude'>,
  to: Pick<Position, 'latitude' | 'longitude'>,
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Total path length of an ordered list of positions, in meters. */
export function pathLength(positions: readonly Pick<Position, 'latitude' | 'longitude'>[]): number {
  let total = 0;
  for (let i = 1; i < positions.length; i++) {
    total += distanceBetween(positions[i - 1], positions[i]);
  }
  return total;
}

export type DistanceAnchor = Pick<Position, 'latitude' | 'longitude' | 'accuracy'>;

export interface DistanceStep {
  /** Reference point the next fix is measured from. */
  anchor: DistanceAnchor | null;
  /** Meters to add to the trip distance (0 when the move is within GPS noise). */
  addedMeters: number;
}

export interface DistanceFilterOptions {
  /** Fixes less accurate than this (meters) are ignored entirely. */
  maxAccuracyMeters: number;
  /** An OS-reported speed at or above this (m/s) counts as real movement. */
  movingSpeedMps: number;
}

/**
 * Advances a trip-distance accumulator by one fix. A move only counts once it
 * exceeds the GPS noise (half the worse accuracy of the two fixes) or the OS
 * reports the device as moving; otherwise the anchor stays put so slow
 * movement still adds up over several fixes instead of being dropped.
 */
export function accumulateDistance(
  anchor: DistanceAnchor | null,
  position: Pick<Position, 'latitude' | 'longitude' | 'accuracy' | 'speed'>,
  options: DistanceFilterOptions,
): DistanceStep {
  if (!Number.isFinite(position.accuracy) || position.accuracy > options.maxAccuracyMeters) {
    return { anchor, addedMeters: 0 };
  }
  const next: DistanceAnchor = {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
  };
  if (!anchor) {
    return { anchor: next, addedMeters: 0 };
  }
  const meters = distanceBetween(anchor, position);
  const noise = Math.max(anchor.accuracy, position.accuracy) / 2;
  const moving = (position.speed ?? 0) >= options.movingSpeedMps;
  if (meters >= noise || (moving && meters > 0)) {
    return { anchor: next, addedMeters: meters };
  }
  return { anchor, addedMeters: 0 };
}
