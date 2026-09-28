import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { GetQueueStatusResult } from '@capawesome-team/capacitor-background-geolocation';
import { IonBadge, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular';

/** pendingCount / droppedCount / lastUploadedAt from getQueueStatus(). */
@Component({
  selector: 'app-queue-status',
  templateUrl: './queue-status.component.html',
  styleUrls: ['./queue-status.component.scss'],
  imports: [IonList, IonItem, IonLabel, IonNote, IonBadge, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueStatusComponent {
  readonly status = input<GetQueueStatusResult | null>(null);
  readonly queueActive = input(false);
  readonly uploadActive = input(false);
}
