import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertService } from '../../services/alert/alert.service';
import { AlertComponent } from './alert.component';

// Ionic re-parents presented inline overlays, so query the whole document.
const queryAlert = () => document.querySelector('ion-alert') as HTMLIonAlertElement;

describe('AlertComponent', () => {
  let fixture: ComponentFixture<AlertComponent>;
  let service: AlertService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AlertComponent] }).compileComponents();
    fixture = TestBed.createComponent(AlertComponent);
    service = TestBed.inject(AlertService);
    await fixture.whenStable();
  });

  afterEach(() => document.querySelectorAll('ion-alert').forEach((el) => el.remove()));

  it('binds the service state to ion-alert', async () => {
    void service.confirm('Delete everything?', { header: 'Careful' });
    await fixture.whenStable();
    const alert = queryAlert();
    expect(alert.isOpen).toBe(true);
    expect(alert.header).toBe('Careful');
    expect(alert.message).toBe('Delete everything?');
    expect(alert.buttons).toHaveLength(2);
  });

  it('resolves false when the overlay is dismissed', async () => {
    const result = service.confirm('Sure?');
    await fixture.whenStable();
    queryAlert().dispatchEvent(new CustomEvent('didDismiss'));
    await expect(result).resolves.toBe(false);
  });
});
