// Playwright settings. Values that differ per machine come from .env.
require('dotenv').config({ quiet: true });
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  reporter: [['html', { open: 'never' }]],
  use: {
    // Trailing slash matters: it lets page.goto('auth/login') resolve under this URL.
    baseURL: (process.env.BASE_URL || '').replace(/\/?$/, '/'),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
