import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { PLAYGROUND_UPLOAD_URL } from '../../../enums/app-constants.enum';
import { AlertService } from '../../../services/alert/alert.service';
import { UploadService } from '../../../services/upload/upload.service';
import { createNativeTestContext, type NativeTestContext } from '../../../../testing/native-mocks';
import { UploadPage } from './upload.page';

describe('UploadPage', () => {
  let ctx: NativeTestContext;
  let fixture: ComponentFixture<UploadPage>;
  let page: UploadPage;

  beforeEach(async () => {
    ctx = createNativeTestContext('android');
    await TestBed.configureTestingModule({
      imports: [UploadPage],
      providers: [...ctx.providers, provideRouter([]), provideIonicAngular()],
    }).compileComponents();
    fixture = TestBed.createComponent(UploadPage);
    page = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('starts from the persisted defaults (queue on, upload off)', () => {
    expect(page['model']().queueEnabled).toBe(true);
    expect(page['model']().uploadEnabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="upload-url"]')).toBeNull();
  });

  it('reveals the upload fields when upload is enabled', async () => {
    page['form'].uploadEnabled().value.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="upload-url"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="batch-size"]')).not.toBeNull();
  });

  it('fills in the Playground URL', () => {
    page['usePlayground']();
    expect(page['model']().url).toBe(PLAYGROUND_UPLOAD_URL);
    expect(page['model']().uploadEnabled).toBe(true);
  });

  it('validates the URL and batch size only while upload is enabled', () => {
    page['form'].url().value.set('not a url');
    page['form'].batchSize().value.set(100_000);
    expect(page['form']().valid()).toBe(true);

    page['form'].uploadEnabled().value.set(true);
    expect(page['form'].url().invalid()).toBe(true);
    expect(page['form'].batchSize().invalid()).toBe(true);

    page['form'].url().value.set('https://api.example.com/positions');
    page['form'].batchSize().value.set(50);
    expect(page['form']().valid()).toBe(true);
  });

  it('rejects a non-positive queue size only while the queue is used', () => {
    page['form'].maxSize().value.set(0);
    expect(page['form'].maxSize().invalid()).toBe(true);
    page['form'].queueEnabled().value.set(false);
    expect(page['form'].maxSize().invalid()).toBe(false);
  });

  it('applies a valid configuration to the plugin', async () => {
    page['usePlayground']();
    page['form'].bearerToken().value.set('session-key');
    await page['apply']();
    expect(ctx.plugin.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        url: PLAYGROUND_UPLOAD_URL,
        headers: { Authorization: 'Bearer session-key' },
      }),
    );
  });

  it('does not apply an invalid configuration', async () => {
    page['form'].uploadEnabled().value.set(true);
    page['form'].url().value.set('');
    await page['apply']();
    expect(ctx.plugin.setConfig).not.toHaveBeenCalled();
    expect(page['form'].url().touched()).toBe(true);
  });

  it('discards the configuration after confirmation', async () => {
    vi.spyOn(TestBed.inject(AlertService), 'confirm').mockResolvedValue(true);
    await page['reset']();
    expect(ctx.plugin.resetConfig).toHaveBeenCalled();
  });

  it('lists upload failures', async () => {
    await TestBed.inject(UploadService).initialize();
    ctx.plugin.emit('uploadFailed', { message: 'Service Unavailable', statusCode: 503 });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('HTTP 503');
  });
});
