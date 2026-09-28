import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('formats minutes and seconds', () => expect(pipe.transform(65_000)).toBe('01:05'));
  it('adds hours when needed', () => expect(pipe.transform(3_725_000)).toBe('1:02:05'));
  it('renders zero and missing values', () => {
    expect(pipe.transform(0)).toBe('00:00');
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(-5)).toBe('—');
  });
});
