import { Pipe, type PipeTransform } from '@angular/core';

/** Formats a latitude/longitude with 6 decimals (~0.1 m) and a hemisphere letter. */
@Pipe({ name: 'coordinate' })
export class CoordinatePipe implements PipeTransform {
  transform(value: number | null | undefined, axis: 'lat' | 'lng'): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(6)}° ${hemisphere}`;
  }
}
