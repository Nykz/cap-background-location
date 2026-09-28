import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, layersOutline, navigateOutline, settingsOutline } from 'ionicons/icons';
import { QueueService } from '../../services/queue/queue.service';
import { TrackingService } from '../../services/tracking/tracking.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPage {
  protected readonly tracking = inject(TrackingService);
  protected readonly queue = inject(QueueService);

  constructor() {
    addIcons({ navigateOutline, layersOutline, cloudUploadOutline, settingsOutline });
  }
}
