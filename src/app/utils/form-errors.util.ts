interface FieldStateLike {
  errors(): readonly { message?: string }[];
  invalid(): boolean;
  touched(): boolean;
}

/** First validation message of a signal-form field, shown only once the field was touched. */
export function visibleError(state: FieldStateLike): string {
  if (!state.touched() || !state.invalid()) {
    return '';
  }
  return state.errors()[0]?.message ?? 'Invalid value';
}

/** Returns an error message when `value` is not an absolute http(s) URL. */
export function urlError(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? null
      : 'Use an http:// or https:// URL';
  } catch {
    return 'Enter a valid URL';
  }
}
