import { defineConfig, devices } from '@playwright/test';

const PORT = 4280;

/**
 * Browser E2E tests for the web layer (routing, forms, persistence, platform
 * styling). The geolocation plugin itself is native-only; its behaviour is
 * covered by the unit tests and by the on-device checklist in TESTING.md.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'android-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit-ua', use: { ...devices['iPhone 15'], browserName: 'chromium' } },
  ],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
