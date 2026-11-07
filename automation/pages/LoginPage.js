// Page object for the login screen: selectors and actions only, assertions stay in the tests.
class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder('Username');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.invalidCredentialsAlert = page.getByText('Invalid credentials');
    this.forgotPasswordLink = page.getByText('Forgot your password?');
    // Any login error message ('Invalid credentials', 'Account disabled', ...). The alert has no role, so CSS.
    this.alertMessage = page.locator('.oxd-alert-content-text');

    // "Required" appears once per field, so each message is scoped to its own field group.
    // The UI has no accessible link between a field and its error, hence the CSS class.
    const fieldGroup = (label) => page.locator('.oxd-input-group').filter({ hasText: label });
    this.usernameRequiredError = fieldGroup('Username').getByText('Required');
    this.passwordRequiredError = fieldGroup('Password').getByText('Required');
  }

  async open() {
    await this.page.goto('auth/login');
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}

module.exports = { LoginPage };
