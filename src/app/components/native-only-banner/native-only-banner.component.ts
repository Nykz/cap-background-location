import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonCard, IonCardContent, IonIcon, IonItem, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { phonePortraitOutline } from 'ionicons/icons';
import { NativePlatformService } from '../../services/platform/native-platform.service';

/** Explains that the plugin only runs on Android and iOS when opened in a browser. */
@Component({
  selector: 'app-native-only-banner',
  templateUrl: './native-only-banner.component.html',
  styleUrls: ['./native-only-banner.component.scss'],
  imports: [IonCard, IonCardContent, IonItem, IonIcon, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NativeOnlyBannerComponent {
  protected readonly platform = inject(NativePlatformService);

  constructor() {
    addIcons({ phonePortraitOutline });
  }
}
