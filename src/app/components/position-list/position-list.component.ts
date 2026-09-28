import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import type { Position, QueuedPosition } from '@capawesome-team/capacitor-background-geolocation';
import {
  IonBadge,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  type InfiniteScrollCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locationOutline } from 'ionicons/icons';
import { CoordinatePipe } from '../../pipes/coordinate.pipe';
import { SpeedPipe } from '../../pipes/speed.pipe';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

type ListedPosition = Position | QueuedPosition;

/**
 * Paged list of positions. Renders `pageSize` rows at a time and reveals more
 * through ion-infinite-scroll, so lists of thousands of rows stay cheap.
 */
@Component({
  selector: 'app-position-list',
  templateUrl: './position-list.component.html',
  styleUrls: ['./position-list.component.scss'],
  imports: [
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    DatePipe,
    DecimalPipe,
    CoordinatePipe,
    SpeedPipe,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionListComponent {
  readonly positions = input.required<readonly ListedPosition[]>();
  readonly pageSize = input(50);
  readonly emptyTitle = input('No positions yet');
  readonly emptySubtitle = input('');
  readonly label = input('Positions');

  /** Resets to one page whenever the page size changes. */
  private readonly visibleCount = linkedSignal(() => this.pageSize());

  protected readonly visible = computed(() => this.positions().slice(0, this.visibleCount()));
  protected readonly canLoadMore = computed(() => this.visibleCount() < this.positions().length);

  constructor() {
    addIcons({ locationOutline });
  }

  protected loadMore(event: InfiniteScrollCustomEvent): void {
    this.visibleCount.update((count) => count + this.pageSize());
    void event.target.complete();
  }

  protected trackKey(position: ListedPosition): string {
    return 'id' in position ? `q${position.id}` : `t${position.timestamp}`;
  }

  protected queueId(position: ListedPosition): number | null {
    return 'id' in position ? position.id : null;
  }
}
