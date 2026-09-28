import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { ToastService } from '../../services/toast/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let service: ToastService;
  let dismissHandlers: (() => void)[];
  let created: { options: unknown; present: ReturnType<typeof vi.fn>; dismiss: ReturnType<typeof vi.fn> }[];

  beforeEach(async () => {
    dismissHandlers = [];
    created = [];
    const controller = {
      create: vi.fn(async (options: unknown) => {
        let resolveDismiss!: () => void;
        const didDismiss = new Promise<void>((resolve) => (resolveDismiss = resolve));
        dismissHandlers.push(resolveDismiss);
        const toast = {
          options,
          present: vi.fn().mockResolvedValue(undefined),
          dismiss: vi.fn(async () => resolveDismiss()),
          onDidDismiss: () => didDismiss,
        };
        created.push(toast);
        return toast;
      }),
    };
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [{ provide: ToastController, useValue: controller }],
    }).compileComponents();
    fixture = TestBed.createComponent(ToastComponent);
    service = TestBed.inject(ToastService);
    await fixture.whenStable();
  });

  it('presents nothing without a message', () => {
    expect(created).toHaveLength(0);
  });

  it('presents the current message at the top', async () => {
    service.success('Saved');
    await fixture.whenStable();
    expect(created[0].options).toMatchObject({ message: 'Saved', color: 'success', position: 'top' });
    expect(created[0].present).toHaveBeenCalled();
  });

  it('replaces the visible toast when a new message arrives', async () => {
    service.show('First');
    await fixture.whenStable();
    service.show('Second');
    await fixture.whenStable();
    expect(created[0].dismiss).toHaveBeenCalled();
    expect(created[1].options).toMatchObject({ message: 'Second' });
    expect(service.current()?.message).toBe('Second');
  });

  it('clears the service state when the toast dismisses itself', async () => {
    service.show('Hi');
    await fixture.whenStable();
    dismissHandlers[0]();
    await fixture.whenStable();
    expect(service.current()).toBeNull();
  });
});
