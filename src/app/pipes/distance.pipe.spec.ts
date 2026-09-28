import { DistancePipe } from './distance.pipe';

describe('DistancePipe', () => {
  const pipe = new DistancePipe();

  it('formats meters below 1 km', () => expect(pipe.transform(849.6)).toBe('850 m'));
  it('formats kilometers with two decimals', () => expect(pipe.transform(1250)).toBe('1.25 km'));
  it('renders a dash for missing values', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform(Number.NaN)).toBe('—');
  });
});
