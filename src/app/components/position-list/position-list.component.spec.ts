import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { InfiniteScrollCustomEvent } from '@ionic/angular';
import { createPosition, createQueuedPosition } from '../../../testing/native-mocks';
import { PositionListComponent } from './position-list.component';

describe('PositionListComponent', () => {
  let fixture: ComponentFixture<PositionListComponent>;
  const rows = () => fixture.nativeElement.querySelectorAll('ion-item').length;

  beforeEach(() => {
    fixture = TestBed.createComponent(PositionListComponent);
  });

  it('shows the empty state', async () => {
    fixture.componentRef.setInput('positions', []);
    fixture.componentRef.setInput('emptyTitle', 'Queue is empty');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-empty-state')?.textContent).toContain('Queue is empty');
  });

  it('renders one page and reveals more on infinite scroll', async () => {
    fixture.componentRef.setInput(
      'positions',
      Array.from({ length: 25 }, (_, i) => createQueuedPosition(i + 1)),
    );
    fixture.componentRef.setInput('pageSize', 10);
    await fixture.whenStable();
    expect(rows()).toBe(10);

    const complete = vi.fn().mockResolvedValue(undefined);
    (fixture.componentInstance as unknown as { loadMore(e: InfiniteScrollCustomEvent): void }).loadMore({
      target: { complete },
    } as unknown as InfiniteScrollCustomEvent);
    await fixture.whenStable();
    expect(rows()).toBe(20);
    expect(complete).toHaveBeenCalled();
  });

  it('shows queue ids and mock badges', async () => {
    fixture.componentRef.setInput('positions', [
      createQueuedPosition(42, { simulated: true }),
      createPosition({ timestamp: 5 }),
    ]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('#42');
    expect(fixture.nativeElement.textContent).toContain('Mock');
    expect(rows()).toBe(2);
  });
});
