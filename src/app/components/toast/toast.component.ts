import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ToastService, type ToastMessage } from '../../services/toast/toast.service';

/**
 * Single toast outlet, mounted once in the app shell.
 *
 * Presents through ToastController instead of an inline <ion-toast>: Ionic moves an open
 * inline overlay to the app root, so Angular inserting the next toast beside it throws NG05106.
 */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private readonly toast = inject(ToastService);
  private readonly controller = inject(ToastController);

  private active: HTMLIonToastElement | null = null;

  constructor() {
    effect(() => void this.render(this.toast.current()));
    inject(DestroyRef).onDestroy(() => void this.active?.dismiss());
  }

  private async render(message: ToastMessage | null): Promise<void> {
    const previous = this.active;
    this.active = null;
    await previous?.dismiss();
    if (!message) {
      return;
    }
    const element = await this.controller.create({
      message: message.message,
      color: message.color,
      duration: message.duration,
      position: 'top',
    });
    // A newer message may have arrived while this one was being created.
    if (this.toast.current()?.id !== message.id) {
      return;
    }
    this.active = element;
    void element.onDidDismiss().then(() => {
      if (this.toast.current()?.id === message.id) {
        this.toast.dismiss();
      }
    });
    await element.present();
  }
}
