const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

const LOGIN_URL = /\/auth\/login$/;
const DASHBOARD_URL = /\/dashboard\/index$/;

test.describe('Login', () => {
  let loginPage;
  let dashboard;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);
    await loginPage.open();
  });

  test('TC-LOGIN-001 admin logs in with valid credentials', async ({ page }) => {
    await loginPage.login(username, password);

    await expect(page).toHaveURL(DASHBOARD_URL);
    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.adminMenuLink).toBeVisible();
  });

  test('TC-LOGIN-002 valid username with wrong password is rejected', async ({ page }) => {
    await loginPage.login(username, 'wrong-password-1');

    await expect(loginPage.invalidCredentialsAlert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('TC-LOGIN-003 unknown username is rejected', async ({ page }) => {
    await loginPage.login('no.such.user.99', 'SomePass#123');

    await expect(loginPage.invalidCredentialsAlert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('TC-LOGIN-004 wrong username with the correct password is rejected', async ({ page }) => {
    await loginPage.login('wrong.admin', password);

    await expect(loginPage.invalidCredentialsAlert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('TC-LOGIN-005 both fields empty shows Required on each', async () => {
    await loginPage.loginButton.click();

    await expect(loginPage.usernameRequiredError).toBeVisible();
    await expect(loginPage.passwordRequiredError).toBeVisible();
  });

  test('TC-LOGIN-006 username only shows Required on password', async () => {
    await loginPage.usernameInput.fill('any.user');
    await loginPage.loginButton.click();

    await expect(loginPage.passwordRequiredError).toBeVisible();
    await expect(loginPage.usernameRequiredError).toBeHidden();
  });

  test('TC-LOGIN-007 password only shows Required on username', async () => {
    await loginPage.passwordInput.fill('any-password');
    await loginPage.loginButton.click();

    await expect(loginPage.usernameRequiredError).toBeVisible();
    await expect(loginPage.passwordRequiredError).toBeHidden();
  });

  test('TC-LOGIN-008 password field masks its input', async () => {
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC-LOGIN-009 password is case-sensitive', async ({ page }) => {
    await loginPage.login(username, password.toUpperCase());

    await expect(loginPage.invalidCredentialsAlert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('TC-LOGIN-011 very long username is rejected cleanly', async ({ page }) => {
    await loginPage.login('a'.repeat(300), 'SomePass#123');

    await expect(loginPage.invalidCredentialsAlert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('TC-LOGIN-012 logout returns to the login page', async ({ page }) => {
    await loginPage.login(username, password);
    await expect(dashboard.heading).toBeVisible();

    await dashboard.logout();

    await expect(page).toHaveURL(LOGIN_URL);
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC-LOGIN-013 back button after logout does not show the app', async ({ page }) => {
    await loginPage.login(username, password);
    await expect(dashboard.heading).toBeVisible();
    await dashboard.logout();
    await expect(page).toHaveURL(LOGIN_URL);

    await page.goBack();

    // The dashboard URL can show briefly before the app redirects, so wait for the final page.
    await expect(page).toHaveURL(LOGIN_URL);
    await expect(loginPage.loginButton).toBeVisible();
    await expect(dashboard.heading).toBeHidden();
  });

  test('TC-LOGIN-014 protected URL redirects to login when logged out', async ({ page }) => {
    await page.goto('pim/viewEmployeeList');

    await expect(page).toHaveURL(LOGIN_URL);
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC-LOGIN-015 page refresh keeps the session', async ({ page }) => {
    await loginPage.login(username, password);
    await expect(dashboard.heading).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(DASHBOARD_URL);
    await expect(dashboard.heading).toBeVisible();
  });

  test('TC-LOGIN-016 forgot password link opens Reset Password', async ({ page }) => {
    await loginPage.forgotPasswordLink.click();

    await expect(page).toHaveURL(/\/auth\/requestPasswordResetCode$/);
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  });
});
