import { accumulateDistance, distanceBetween, pathLength } from './geo.util';

describe('geo utils', () => {
  it('returns 0 for identical points', () => {
    expect(distanceBetween({ latitude: 1, longitude: 1 }, { latitude: 1, longitude: 1 })).toBe(0);
  });

  it('computes one degree of latitude as ~111.2 km', () => {
    const meters = distanceBetween({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(meters).toBeGreaterThan(111_000);
    expect(meters).toBeLessThan(111_400);
  });

  it('computes Berlin → Paris as ~878 km', () => {
    const meters = distanceBetween(
      { latitude: 52.52, longitude: 13.405 },
      { latitude: 48.8566, longitude: 2.3522 },
    );
    expect(meters / 1000).toBeCloseTo(878, -1);
  });

  it('sums consecutive segments and handles short paths', () => {
    const a = { latitude: 0, longitude: 0 };
    const b = { latitude: 0, longitude: 1 };
    expect(pathLength([])).toBe(0);
    expect(pathLength([a])).toBe(0);
    expect(pathLength([a, b, a])).toBeCloseTo(2 * distanceBetween(a, b), 6);
  });
});

describe('accumulateDistance', () => {
  const options = { maxAccuracyMeters: 100, movingSpeedMps: 0.5 };
  const fix = (latitude: number, accuracy = 5, speed: number | null = null) => ({
    latitude,
    longitude: 0,
    accuracy,
    speed,
  });

  it('anchors on the first usable fix without adding distance', () => {
    const step = accumulateDistance(null, fix(0), options);
    expect(step.addedMeters).toBe(0);
    expect(step.anchor).toEqual({ latitude: 0, longitude: 0, accuracy: 5 });
  });

  it('counts moderately inaccurate fixes (typical 30-65 m phone accuracy)', () => {
    const anchor = { latitude: 0, longitude: 0, accuracy: 65 };
    const step = accumulateDistance(anchor, fix(0.001, 65), options);
    expect(step.addedMeters).toBeCloseTo(111.2, 0);
  });

  it('ignores fixes worse than the accuracy limit', () => {
    const anchor = { latitude: 0, longitude: 0, accuracy: 5 };
    expect(accumulateDistance(anchor, fix(0.01, 500), options)).toEqual({ anchor, addedMeters: 0 });
  });

  it('keeps the anchor for moves within GPS noise so slow movement adds up', () => {
    const anchor = { latitude: 0, longitude: 0, accuracy: 40 };
    const small = accumulateDistance(anchor, fix(0.0001, 40), options); // ~11 m < 20 m noise
    expect(small).toEqual({ anchor, addedMeters: 0 });
    const later = accumulateDistance(small.anchor, fix(0.0003, 40), options); // ~33 m
    expect(later.addedMeters).toBeCloseTo(33.4, 0);
  });

  it('trusts the OS speed for small moves', () => {
    const anchor = { latitude: 0, longitude: 0, accuracy: 40 };
    expect(accumulateDistance(anchor, fix(0.0001, 40, 1.4), options).addedMeters).toBeCloseTo(11.1, 0);
  });
});
