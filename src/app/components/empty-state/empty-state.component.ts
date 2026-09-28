import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon, IonText } from '@ionic/angular';

/** Centered icon + title + subtitle for empty lists. Icon must be registered by the host. */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  imports: [IonIcon, IonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input('location-outline');
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
