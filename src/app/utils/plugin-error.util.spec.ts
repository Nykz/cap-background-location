import { toPluginError } from './plugin-error.util';

describe('toPluginError', () => {
  it('extracts code and message from a Capacitor exception', () => {
    expect(toPluginError({ code: 'TIMEOUT', message: 'Timed out' })).toEqual({
      code: 'TIMEOUT',
      message: 'Timed out',
    });
  });

  it('falls back for strings, empty messages and unknown values', () => {
    expect(toPluginError('boom')).toEqual({ message: 'boom' });
    expect(toPluginError({ message: '' })).toEqual({ code: undefined, message: 'Unknown error' });
    expect(toPluginError(undefined)).toEqual({ message: 'Unknown error' });
  });

  it('ignores a non-string code', () => {
    expect(toPluginError({ code: 42, message: 'x' }).code).toBeUndefined();
  });
});
