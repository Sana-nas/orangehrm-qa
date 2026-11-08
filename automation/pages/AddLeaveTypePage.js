// Page object for the Add Leave Type form.
class AddLeaveTypePage {
  constructor(page) {
    this.page = page;
    this.nameInput = this.field('Name').locator('input');
    // The Yes/No choice is a custom radio button without a role, so it is found by its text.
    this.situationalNo = page.locator('.oxd-radio-wrapper').filter({ hasText: /^\s*No\s*$/ }).locator('label');
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  error(label) {
    return this.field(label).locator('.oxd-input-field-error-message');
  }

  async open() {
    await this.page.goto('leave/defineLeaveType');
    await this.page.getByText('Is Entitlement Situational?').waitFor();
  }
}

module.exports = { AddLeaveTypePage };
