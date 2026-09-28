import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => (service = TestBed.inject(ToastService)));

  it('starts empty', () => expect(service.current()).toBeNull());

  it('publishes messages with increasing ids and colors', () => {
    service.success('Saved');
    const first = service.current();
    service.error('Failed');
    const second = service.current();
    expect(first).toMatchObject({ message: 'Saved', color: 'success' });
    expect(second).toMatchObject({ message: 'Failed', color: 'danger', duration: 4000 });
    expect(second!.id).toBeGreaterThan(first!.id);
  });

  it('supports warning and dismiss', () => {
    service.warning('Careful');
    expect(service.current()?.color).toBe('warning');
    service.dismiss();
    expect(service.current()).toBeNull();
  });
});
