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
  projects: [
    // Logs in once and saves the session for the projects that need an admin.
    { name: 'setup', testMatch: /auth\.setup\.js/ },

    // Login tests must start logged out, so they use no saved session.
    { name: 'chromium', testMatch: /login\.spec\.js/, use: { ...devices['Desktop Chrome'] } },

    // Admin tests start logged in as the admin, using the session saved by "setup".
    {
      name: 'admin',
      testMatch: /admin-.*\.spec\.js/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'auth/admin.json' },
    },

    // PIM tests also start logged in as the admin.
    {
      name: 'pim',
      testMatch: /pim-.*\.spec\.js/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'auth/admin.json' },
    },
  ],
});
