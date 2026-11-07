// Page object for the Add User and Edit User form (they share the same layout).
class UserFormPage {
  constructor(page) {
    this.page = page;
    this.addHeading = page.getByRole('heading', { name: 'Add User' });
    this.editHeading = page.getByRole('heading', { name: 'Edit User' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.employeeInput = this.field('Employee Name').getByPlaceholder('Type for hints...');
    this.employeeHints = page.getByRole('listbox');
    this.changePasswordLabel = page.getByText('Change Password ?');
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  input(label) {
    return this.field(label).locator('input');
  }

  error(label) {
    return this.field(label).locator('.oxd-input-field-error-message');
  }

  async openAdd() {
    await this.page.goto('admin/saveSystemUser');
    await this.addHeading.waitFor();
  }

  async choose(label, option) {
    await this.field(label).locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async pickEmployee(lastName) {
    await this.employeeInput.fill(lastName);
    await this.page.getByRole('option', { name: lastName }).click();
  }

  async fillNewUser({ role, status, employeeLastName, username, password }) {
    await this.choose('User Role', role);
    await this.choose('Status', status);
    await this.pickEmployee(employeeLastName);
    await this.input('Username').fill(username);
    await this.input('Password').fill(password);
    await this.input('Confirm Password').fill(password);
  }
}

module.exports = { UserFormPage };
