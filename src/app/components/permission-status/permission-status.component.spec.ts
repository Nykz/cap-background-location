import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { GRANTED } from '../../../testing/native-mocks';
import { PermissionStatusComponent } from './permission-status.component';

describe('PermissionStatusComponent', () => {
  let fixture: ComponentFixture<PermissionStatusComponent>;
  let element: HTMLElement;

  const text = (testId: string) =>
    element.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
  const buttons = () => Array.from(element.querySelectorAll('ion-button'));

  beforeEach(async () => {
    fixture = TestBed.createComponent(PermissionStatusComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('shows Unknown before the first check', () => {
    expect(text('perm-location')).toBe('Unknown');
  });

  it('maps each permission state to a label', async () => {
    fixture.componentRef.setInput('status', {
      location: 'granted',
      backgroundLocation: 'denied',
      notifications: 'prompt-with-rationale',
    });
    await fixture.whenStable();
    expect(text('perm-location')).toBe('Granted');
    expect(text('perm-background')).toBe('Denied');
    expect(text('perm-notifications')).toBe('Not asked');
  });

  it('emits the two-step request actions and settings', async () => {
    fixture.componentRef.setInput('status', GRANTED);
    await fixture.whenStable();
    const foreground = vi.fn();
    const background = vi.fn();
    const settings = vi.fn();
    fixture.componentInstance.requestForeground.subscribe(foreground);
    fixture.componentInstance.requestBackground.subscribe(background);
    fixture.componentInstance.openSettings.subscribe(settings);
    const [first, second, third] = buttons();
    first.click();
    second.click();
    third.click();
    expect(foreground).toHaveBeenCalled();
    expect(background).toHaveBeenCalled();
    expect(settings).toHaveBeenCalled();
  });

  it('offers precise location on iOS only', async () => {
    expect(buttons().some((b) => b.textContent?.includes('precise'))).toBe(false);
    fixture.componentRef.setInput('platform', 'ios');
    await fixture.whenStable();
    const precise = buttons().find((b) => b.textContent?.includes('precise'));
    const spy = vi.fn();
    fixture.componentInstance.requestFullAccuracy.subscribe(spy);
    precise?.click();
    expect(spy).toHaveBeenCalled();
  });
});
