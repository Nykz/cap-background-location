import { urlError, visibleError } from './form-errors.util';

const state = (touched: boolean, invalid: boolean, messages: (string | undefined)[] = []) => ({
  touched: () => touched,
  invalid: () => invalid,
  errors: () => messages.map((message) => ({ message })),
});

describe('form error utils', () => {
  it('hides errors until the field is touched', () => {
    expect(visibleError(state(false, true, ['Required']))).toBe('');
    expect(visibleError(state(true, false))).toBe('');
  });

  it('shows the first message, or a default one', () => {
    expect(visibleError(state(true, true, ['Required', 'Other']))).toBe('Required');
    expect(visibleError(state(true, true, [undefined]))).toBe('Invalid value');
  });

  it('accepts http(s) URLs only', () => {
    expect(urlError('https://api.example.com/positions')).toBeNull();
    expect(urlError(' http://10.0.2.2:3000 ')).toBeNull();
    expect(urlError('ftp://example.com')).toBe('Use an http:// or https:// URL');
    expect(urlError('not a url')).toBe('Enter a valid URL');
  });
});
