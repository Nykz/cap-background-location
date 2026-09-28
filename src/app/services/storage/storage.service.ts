import { Injectable, inject } from '@angular/core';
import type { StorageKey } from '../../enums/storage-keys.enum';
import { PREFERENCES } from '../../tokens/native-plugins.tokens';

/**
 * Typed JSON wrapper around @capacitor/preferences
 * (SharedPreferences on Android, UserDefaults on iOS, localStorage on web).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly preferences = inject(PREFERENCES);

  async get<T>(key: StorageKey): Promise<T | null> {
    const { value } = await this.preferences.get({ key });
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      await this.preferences.remove({ key });
      return null;
    }
  }

  async set<T>(key: StorageKey, value: T): Promise<void> {
    await this.preferences.set({ key, value: JSON.stringify(value) });
  }

  async remove(key: StorageKey): Promise<void> {
    await this.preferences.remove({ key });
  }
}
