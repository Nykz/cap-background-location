import type { PluginError } from '../interfaces/plugin-error.interface';

/** Extracts `code` and `message` from a Capacitor plugin rejection. */
export function toPluginError(error: unknown): PluginError {
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return {
      code: typeof code === 'string' ? code : undefined,
      message: typeof message === 'string' && message ? message : 'Unknown error',
    };
  }
  return { message: typeof error === 'string' && error ? error : 'Unknown error' };
}
