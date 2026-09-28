import { expect, test, type Page } from '@playwright/test';

/** Ionic's scroll assist clones the focused <input>; target the real one. */
const NATIVE_INPUT = 'input:not(.cloned-input)';

const openTab = async (page: Page, tab: 'tracker' | 'queue' | 'upload' | 'settings') => {
  await page.getByTestId(`tab-${tab}`).click();
  await expect(page).toHaveURL(new RegExp(`/tabs/${tab}$`));
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test.describe('shell & navigation', () => {
  test('redirects to the Tracker tab', async ({ page }) => {
    await expect(page).toHaveURL(/\/tabs\/tracker$/);
    await expect(page.getByTestId('session-title')).toHaveText(/Ready to track/);
  });

  test('navigates between all four tabs', async ({ page }) => {
    await openTab(page, 'queue');
    await expect(page.locator('app-queue ion-title').first()).toHaveText('Queue');
    await openTab(page, 'upload');
    await expect(page.locator('app-upload ion-title').first()).toHaveText('Upload');
    await openTab(page, 'settings');
    await expect(page.locator('app-settings ion-title').first()).toHaveText('Settings');
    await openTab(page, 'tracker');
  });

  test('unknown routes fall back to the Tracker', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page).toHaveURL(/\/tabs\/tracker$/);
  });

  test('uses the platform-native Ionic mode', async ({ page }, testInfo) => {
    const mode = testInfo.project.name.startsWith('iphone') ? 'ios' : 'md';
    await expect(page.locator('html')).toHaveAttribute('mode', mode);
  });

  test('has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    await page.reload();
    await expect(page.getByTestId('session-title')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('browser fallback', () => {
  test('explains that tracking needs a device and disables native actions', async ({ page }) => {
    await expect(page.getByTestId('native-only-banner').first()).toBeVisible();
    await expect(page.getByTestId('toggle-tracking')).toHaveAttribute('disabled', '');
    await expect(page.getByTestId('current-position')).toHaveAttribute('disabled', '');
    await expect(page.getByTestId('status-chip')).toHaveText(/Idle/);
  });
});

test.describe('queue tab', () => {
  test('switches between queued and history lists', async ({ page }) => {
    await openTab(page, 'queue');
    await expect(page.getByText('Queue is empty')).toBeVisible();
    await page.getByTestId('segment-history').click();
    await expect(page.getByText('No saved positions')).toBeVisible();
    await expect(page.getByTestId('history-summary')).toContainText('0 saved');
  });
});

test.describe('upload tab', () => {
  test('reveals upload fields and fills the Playground URL', async ({ page }) => {
    await openTab(page, 'upload');
    await expect(page.getByTestId('upload-url')).toHaveCount(0);
    await page.getByTestId('use-playground').click();
    await expect(page.getByTestId('upload-url').locator(NATIVE_INPUT)).toHaveValue(
      'https://background-geolocation-playground.capawesome.io/v1/positions',
    );
  });

  test('validates the endpoint URL', async ({ page }) => {
    await openTab(page, 'upload');
    await page.getByTestId('upload-enabled').click();
    const url = page.getByTestId('upload-url').locator(NATIVE_INPUT);
    await url.fill('not a url');
    await url.blur();
    await expect(page.getByTestId('upload-url')).toContainText('Enter a valid URL');
  });

  test('persists the configuration across reloads (Preferences)', async ({ page }) => {
    await openTab(page, 'upload');
    await page.getByTestId('use-playground').click();
    await page.getByTestId('bearer-token').locator(NATIVE_INPUT).fill('my-session-key');
    await page.getByTestId('batch-size').locator(NATIVE_INPUT).fill('25');
    await page.getByTestId('apply-config').click();

    await page.reload();
    await expect(page.getByTestId('upload-url').locator(NATIVE_INPUT)).toHaveValue(/playground/);
    await expect(page.getByTestId('batch-size').locator(NATIVE_INPUT)).toHaveValue('25');
  });
});

test.describe('settings tab', () => {
  test('shows the permission states and the two-step request buttons', async ({ page }) => {
    await openTab(page, 'settings');
    await expect(page.getByTestId('perm-location')).toHaveText('Unknown');
    await expect(page.getByRole('button', { name: '1. Allow location' })).toBeVisible();
    await expect(page.getByRole('button', { name: '2. Allow background location' })).toBeVisible();
  });

  test('requires a notification title', async ({ page }) => {
    await openTab(page, 'settings');
    const title = page.getByTestId('notification-title').locator(NATIVE_INPUT);
    await title.fill('');
    await title.blur();
    await expect(page.getByTestId('notification-title')).toContainText('notification title is required');
  });

  test('persists tracking settings across reloads', async ({ page }) => {
    await openTab(page, 'settings');
    await page.getByTestId('notification-title').locator(NATIVE_INPUT).fill('Trip recorder');
    await page.getByTestId('save-settings').click();
    await page.reload();
    await expect(page.getByTestId('notification-title').locator(NATIVE_INPUT)).toHaveValue('Trip recorder');
  });
});
