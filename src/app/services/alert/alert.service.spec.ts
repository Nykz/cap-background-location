import { TestBed } from '@angular/core/testing';
import { AlertService } from './alert.service';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => (service = TestBed.inject(AlertService)));

  it('opens with the given content and resolves true on confirm', async () => {
    const result = service.confirm('Delete?', { header: 'Clear', confirmText: 'Yes', destructive: true });
    expect(service.isOpen()).toBe(true);
    expect(service.header()).toBe('Clear');
    expect(service.message()).toBe('Delete?');
    const [cancel, confirm] = service.buttons();
    expect(cancel.role).toBe('cancel');
    expect(confirm).toMatchObject({ text: 'Yes', role: 'destructive' });
    (confirm.handler as () => void)();
    await expect(result).resolves.toBe(true);
    expect(service.isOpen()).toBe(false);
  });

  it('resolves false on cancel', async () => {
    const result = service.confirm('Sure?');
    (service.buttons()[0].handler as () => void)();
    await expect(result).resolves.toBe(false);
  });

  it('resolves false when dismissed by backdrop', async () => {
    const result = service.confirm('Sure?');
    service.dismissed();
    await expect(result).resolves.toBe(false);
  });

  it('settles a pending dialog when a new one opens', async () => {
    const first = service.confirm('First');
    service.confirm('Second');
    await expect(first).resolves.toBe(false);
    expect(service.message()).toBe('Second');
  });
});
