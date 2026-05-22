import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  fullyParallel: false,
  outputDir: 'tmp/e2e-live/playwright-artifacts',
  reporter: [['list']],
  retries: 0,
  testDir: './',
  testMatch: ['live-checkout.spec.ts'],
  timeout: 120_000,
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? 'msedge',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  workers: 1,
});
