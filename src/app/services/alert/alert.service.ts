import { Injectable, signal } from '@angular/core';
import type { AlertButton } from '@ionic/angular';

export interface ConfirmOptions {
  header?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * Declarative confirmation dialog state; rendered once by <app-alert>.
 * `confirm()` resolves true only when the user taps the confirm button.
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly _isOpen = signal(false);
  private readonly _header = signal('Confirm');
  private readonly _message = signal('');
  private readonly _buttons = signal<AlertButton[]>([]);
  private resolveFn: ((confirmed: boolean) => void) | null = null;

  readonly isOpen = this._isOpen.asReadonly();
  readonly header = this._header.asReadonly();
  readonly message = this._message.asReadonly();
  readonly buttons = this._buttons.asReadonly();

  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    this.settle(false);
    return new Promise<boolean>((resolve) => {
      this.resolveFn = resolve;
      this._header.set(options.header ?? 'Confirm');
      this._message.set(message);
      this._buttons.set([
        { text: options.cancelText ?? 'Cancel', role: 'cancel', handler: () => this.settle(false) },
        {
          text: options.confirmText ?? 'Confirm',
          role: options.destructive ? 'destructive' : 'confirm',
          handler: () => this.settle(true),
        },
      ]);
      this._isOpen.set(true);
    });
  }

  /** Called when the overlay is dismissed by any means (backdrop, hardware back). */
  dismissed(): void {
    this.settle(false);
  }

  private settle(confirmed: boolean): void {
    this._isOpen.set(false);
    this.resolveFn?.(confirmed);
    this.resolveFn = null;
  }
}
