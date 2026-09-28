import { Injectable, signal } from '@angular/core';

export type ToastColor = 'success' | 'warning' | 'danger' | 'medium' | 'primary';

export interface ToastMessage {
  id: number;
  message: string;
  color: ToastColor;
  duration: number;
}

/** Declarative toast state; rendered once by <app-toast> in the app shell. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _current = signal<ToastMessage | null>(null);
  readonly current = this._current.asReadonly();

  show(message: string, color: ToastColor = 'medium', duration = 2500): void {
    this._current.set({ id: this.nextId++, message, color, duration });
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  warning(message: string): void {
    this.show(message, 'warning', 4000);
  }

  error(message: string): void {
    this.show(message, 'danger', 4000);
  }

  dismiss(): void {
    this._current.set(null);
  }
}
