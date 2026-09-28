import { TestBed } from '@angular/core/testing';
import { TripStatsComponent } from './trip-stats.component';

describe('TripStatsComponent', () => {
  it('formats every figure', async () => {
    const fixture = TestBed.createComponent(TripStatsComponent);
    fixture.componentRef.setInput('stats', {
      points: 42,
      distanceMeters: 2500,
      durationMs: 125_000,
      averageSpeedMps: 20,
      currentSpeedMps: 1.5,
    });
    await fixture.whenStable();
    const text = (id: string) =>
      fixture.nativeElement.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();
    expect(text('stat-points')).toBe('42');
    expect(text('stat-distance')).toBe('2.50 km');
    expect(text('stat-duration')).toBe('02:05');
    expect(text('stat-speed')).toBe('72.0 km/h');
    expect(text('stat-current-speed')).toBe('5.4 km/h');
  });

  it('shows a dash when the speed is unknown', async () => {
    const fixture = TestBed.createComponent(TripStatsComponent);
    fixture.componentRef.setInput('stats', { points: 0, distanceMeters: 0, durationMs: 0, averageSpeedMps: null, currentSpeedMps: -1 });
    await fixture.whenStable();
    const text = (id: string) =>
      fixture.nativeElement.querySelector(`[data-testid="${id}"]`).textContent.trim();
    expect(text('stat-speed')).toBe('—');
    expect(text('stat-current-speed')).toBe('—');
  });
});
