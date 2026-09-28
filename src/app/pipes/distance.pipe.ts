import { Pipe, type PipeTransform } from '@angular/core';

/** Formats meters as "850 m" or "1.25 km". */
@Pipe({ name: 'distance' })
export class DistancePipe implements PipeTransform {
  transform(meters: number | null | undefined): string {
    if (meters === null || meters === undefined || !Number.isFinite(meters)) {
      return '—';
    }
    if (Math.abs(meters) < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  }
}
