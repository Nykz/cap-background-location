import { CoordinatePipe } from './coordinate.pipe';

describe('CoordinatePipe', () => {
  const pipe = new CoordinatePipe();

  it('formats latitude hemispheres', () => {
    expect(pipe.transform(52.52, 'lat')).toBe('52.520000° N');
    expect(pipe.transform(-33.8688, 'lat')).toBe('33.868800° S');
  });

  it('formats longitude hemispheres', () => {
    expect(pipe.transform(13.405, 'lng')).toBe('13.405000° E');
    expect(pipe.transform(-0.1276, 'lng')).toBe('0.127600° W');
  });

  it('renders a dash for missing values', () => expect(pipe.transform(null, 'lat')).toBe('—'));
});
