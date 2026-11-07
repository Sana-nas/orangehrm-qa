// Runs once before the Admin tests: logs in as the admin and saves the session to a file,
// so each Admin test starts already logged in instead of repeating the login screen.
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test('log in as admin and save the session', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard\/index$/);

  await page.context().storageState({ path: 'auth/admin.json' }); // the auth/ folder is ignored by Git
});
