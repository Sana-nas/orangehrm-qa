// Page object for the Add Holiday form.
class AddHolidayPage {
  constructor(page) {
    this.page = page;
    this.nameInput = this.field('Name').locator('input');
    this.dateInput = this.field('Date').locator('input');
    this.repeatsNo = page.locator('.oxd-radio-wrapper').filter({ hasText: /^\s*No\s*$/ }).locator('label');
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  error(label) {
    return this.field(label).locator('.oxd-input-field-error-message');
  }

  async open() {
    await this.page.goto('leave/saveHolidays');
    await this.page.getByText('Repeats Annually', { exact: true }).waitFor();
  }

  // The date field only registers a value after the field is left, so it is blurred.
  async fillDate(date) {
    await this.dateInput.fill(date);
    await this.dateInput.blur();
  }
}

module.exports = { AddHolidayPage };
