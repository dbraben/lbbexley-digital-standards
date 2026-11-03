'use strict';
// Bexley accessibility tests for the pages and screens in the app repository's
// tests/accessibility/targets.json.
//   npm run test:a11y          run them
//   npm run test:a11y:login    sign in once and save the session for targets with auth: true
//
// Synced from the standards repository (sync/tests/accessibility/): don't edit
// the copy in an app repository.

const fs = require('fs');
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');
const { ROOT, STATE } = require('./shared');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.js$/,
  outputDir: path.join(ROOT, 'test-results'),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: path.join(ROOT, 'playwright-report') }]]
    : [['list']],
  timeout: 90 * 1000,
  use: {
    storageState: fs.existsSync(STATE) ? STATE : undefined,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 60 * 1000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
