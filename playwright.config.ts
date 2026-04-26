import { defineConfig } from '@playwright/test';

/**
 * Serves docs/store over HTTP (Playwright cannot reliably load file:// with relative CSS).
 * Run: npm run verify:store-pages
 */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8475',
    trace: 'off',
  },
  webServer: {
    command: 'python3 -m http.server 8475 --bind 127.0.0.1 --directory docs/store',
    url: 'http://127.0.0.1:8475/',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
