import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('renders the router outlet with the toast and alert outlets', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('ion-router-outlet')).not.toBeNull();
    expect(element.querySelector('app-toast')).not.toBeNull();
    expect(element.querySelector('app-alert')).not.toBeNull();
  });
});
