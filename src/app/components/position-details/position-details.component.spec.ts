import { TestBed } from '@angular/core/testing';
import type { Position } from '@capawesome-team/capacitor-background-geolocation';
import { createPosition } from '../../../testing/native-mocks';
import { PositionDetailsComponent } from './position-details.component';

describe('PositionDetailsComponent', () => {
  async function render(position: Position): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(PositionDetailsComponent);
    fixture.componentRef.setInput('position', position);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('formats coordinates, accuracy, speed and bearing', async () => {
    const element = await render(
      createPosition({ latitude: 52.52, longitude: -13.405, accuracy: 4.26, speed: 10, bearing: 90.4 }),
    );
    expect(element.querySelector('[data-testid="position-latitude"]')?.textContent).toContain('52.520000° N');
    expect(element.querySelector('[data-testid="position-longitude"]')?.textContent).toContain('13.405000° W');
    expect(element.textContent).toContain('± 4.3 m');
    expect(element.textContent).toContain('36.0 km/h');
    expect(element.textContent).toContain('90°');
  });

  it('shows dashes for unavailable values', async () => {
    const element = await render(createPosition());
    expect(element.textContent).toContain('—');
  });

  it('flags mock locations and iOS positions without the flag', async () => {
    expect((await render(createPosition({ simulated: true }))).textContent).toContain('Mock location');
    TestBed.resetTestingModule();
    expect((await render(createPosition({ simulated: null }))).textContent).toContain('Not reported');
  });

  it('renders altitude with its accuracy', async () => {
    const element = await render(createPosition({ altitude: 34.5, altitudeAccuracy: 3 }));
    expect(element.textContent).toContain('34.5 m');
    expect(element.textContent).toContain('(± 3)');
  });
});
