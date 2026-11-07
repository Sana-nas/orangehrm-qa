// Page object for an employee's Contact Details tab.
class ContactDetailsPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Contact Details' }).first();
    this.mobile = this.field('Mobile').locator('input');
    this.workEmail = this.field('Work Email').locator('input');
    this.saveButton = page.getByRole('button', { name: 'Save' }).first();
    this.formLoader = page.locator('.oxd-form-loader');
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  error(label) {
    return this.field(label).locator('.oxd-input-field-error-message');
  }

  async open(empNumber) {
    await this.page.goto(`pim/contactDetails/empNumber/${empNumber}`);
    await this.heading.waitFor();
    await this.formLoader.waitFor({ state: 'hidden' });
  }
}

module.exports = { ContactDetailsPage };
