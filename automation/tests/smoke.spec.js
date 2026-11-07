const { test, expect } = require('@playwright/test');

// Setup check only: proves Playwright can reach OrangeHRM. Not a test case from the plan.
test('login page loads', async ({ page }) => {
  await page.goto('auth/login');
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});
