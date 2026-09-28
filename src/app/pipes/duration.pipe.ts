import { Pipe, type PipeTransform } from '@angular/core';

const pad = (value: number): string => value.toString().padStart(2, '0');

/** Formats milliseconds as "mm:ss" or "h:mm:ss". */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(milliseconds: number | null | undefined): string {
    if (milliseconds === null || milliseconds === undefined || milliseconds < 0) {
      return '—';
    }
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  }
}
