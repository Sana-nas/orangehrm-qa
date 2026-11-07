// Page object for an employee's Personal Details tab.
class PersonalDetailsPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Personal Details' }).first();
    this.firstName = page.getByPlaceholder('First Name');
    this.lastName = page.getByPlaceholder('Last Name');
    this.dateOfBirth = this.field('Date of Birth').locator('input');
    this.dateOfBirthError = this.field('Date of Birth').locator('.oxd-input-field-error-message');
    // The page has two Save buttons (the personal form and a second section); the first belongs to the personal form.
    this.saveButton = page.getByRole('button', { name: 'Save' }).first();
    this.formLoader = page.locator('.oxd-form-loader');
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  async open(empNumber) {
    await this.page.goto(`pim/viewPersonalDetails/empNumber/${empNumber}`);
    await this.heading.waitFor();
    await this.formLoader.waitFor({ state: 'hidden' }); // the values arrive after the page; typing earlier would be overwritten
  }
}

module.exports = { PersonalDetailsPage };
