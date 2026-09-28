import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('renders title, subtitle and icon', async () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Nothing here');
    fixture.componentRef.setInput('subtitle', 'Try again later');
    fixture.componentRef.setInput('icon', 'layers-outline');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h3')?.textContent).toContain('Nothing here');
    expect(element.querySelector('p')?.textContent).toContain('Try again later');
    expect((element.querySelector('ion-icon') as unknown as { name: string }).name).toBe('layers-outline');
  });

  it('omits the subtitle when empty', async () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Only title');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });
});
