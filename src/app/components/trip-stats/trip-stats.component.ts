import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonCol, IonGrid, IonRow, IonText } from '@ionic/angular';
import type { TripStats } from '../../interfaces/trip-stats.interface';
import { DistancePipe } from '../../pipes/distance.pipe';
import { DurationPipe } from '../../pipes/duration.pipe';
import { SpeedPipe } from '../../pipes/speed.pipe';

/** Grid of session figures: duration, distance, current/average speed, points. */
@Component({
  selector: 'app-trip-stats',
  templateUrl: './trip-stats.component.html',
  styleUrls: ['./trip-stats.component.scss'],
  imports: [IonGrid, IonRow, IonCol, IonText, DistancePipe, DurationPipe, SpeedPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripStatsComponent {
  readonly stats = input.required<TripStats>();
}
