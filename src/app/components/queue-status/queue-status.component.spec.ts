import { TestBed } from '@angular/core/testing';
import { QueueStatusComponent } from './queue-status.component';

describe('QueueStatusComponent', () => {
  const text = (element: HTMLElement, id: string) =>
    element.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();

  it('shows placeholders before the first refresh', async () => {
    const fixture = TestBed.createComponent(QueueStatusComponent);
    await fixture.whenStable();
    expect(text(fixture.nativeElement, 'queue-pending')).toBe('—');
    expect(text(fixture.nativeElement, 'queue-active')).toBe('Off');
    expect(fixture.nativeElement.textContent).toContain('Never');
  });

  it('renders counts and flags', async () => {
    const fixture = TestBed.createComponent(QueueStatusComponent);
    fixture.componentRef.setInput('status', { pendingCount: 1234, droppedCount: 2, lastUploadedAt: 1_723_291_200_000 });
    fixture.componentRef.setInput('queueActive', true);
    fixture.componentRef.setInput('uploadActive', true);
    await fixture.whenStable();
    expect(text(fixture.nativeElement, 'queue-pending')).toBe('1,234');
    expect(text(fixture.nativeElement, 'queue-dropped')).toBe('2');
    expect(text(fixture.nativeElement, 'queue-active')).toBe('On');
    expect(text(fixture.nativeElement, 'upload-active')).toBe('On');
    expect(fixture.nativeElement.textContent).not.toContain('Never');
  });
});
