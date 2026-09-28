import { SpeedPipe } from './speed.pipe';

describe('SpeedPipe', () => {
  const pipe = new SpeedPipe();

  it('converts m/s to km/h', () => expect(pipe.transform(10)).toBe('36.0 km/h'));
  it('renders zero', () => expect(pipe.transform(0)).toBe('0.0 km/h'));
  it('renders a dash for unknown or negative speed', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(-1)).toBe('—');
  });
});
