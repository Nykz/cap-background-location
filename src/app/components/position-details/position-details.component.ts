import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Position } from '@capawesome-team/capacitor-background-geolocation';
import { IonBadge, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular';
import { CoordinatePipe } from '../../pipes/coordinate.pipe';
import { SpeedPipe } from '../../pipes/speed.pipe';

/** Every field of a Position, including the Android mock-location flag. */
@Component({
  selector: 'app-position-details',
  templateUrl: './position-details.component.html',
  styleUrls: ['./position-details.component.scss'],
  imports: [IonList, IonItem, IonLabel, IonNote, IonBadge, DatePipe, DecimalPipe, CoordinatePipe, SpeedPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionDetailsComponent {
  readonly position = input.required<Position>();
}
