import { Pipe, type PipeTransform } from '@angular/core';

/** Formats meters per second as km/h. */
@Pipe({ name: 'speed' })
export class SpeedPipe implements PipeTransform {
  transform(metersPerSecond: number | null | undefined): string {
    if (metersPerSecond === null || metersPerSecond === undefined || metersPerSecond < 0) {
      return '—';
    }
    return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
  }
}
