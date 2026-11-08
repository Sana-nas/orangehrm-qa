// Page object for Leave > Entitlements > Add Entitlements.
class AddEntitlementPage {
  constructor(page) {
    this.page = page;
    this.employeeInput = this.field('Employee Name').getByPlaceholder('Type for hints...');
    this.employeeHints = page.getByRole('listbox');
    this.entitlementInput = this.field('Entitlement').locator('input');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.confirmDialog = page.getByRole('dialog');
    this.confirmButton = this.confirmDialog.getByRole('button', { name: 'Confirm' });
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  error(label) {
    return this.field(label).locator('.oxd-input-field-error-message');
  }

  async open() {
    await this.page.goto('leave/addLeaveEntitlement');
    await this.page.getByText('Individual Employee').waitFor();
    // Wait until the page has finished loading its data. Acting earlier can be ignored or overwritten when the server is busy.
    await this.page.waitForLoadState('networkidle');
  }

  async choose(label, option) {
    await this.field(label).locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async pickEmployee(lastName) {
    await this.employeeInput.fill(lastName);
    await this.page.getByRole('option', { name: lastName }).click();
  }
}

module.exports = { AddEntitlementPage };
