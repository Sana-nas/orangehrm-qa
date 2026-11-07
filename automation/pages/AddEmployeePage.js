// Page object for PIM > Add Employee, including the optional "Create Login Details" section.
class AddEmployeePage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Add Employee' });
    this.firstName = page.getByPlaceholder('First Name');
    this.middleName = page.getByPlaceholder('Middle Name');
    this.lastName = page.getByPlaceholder('Last Name');
    this.employeeId = this.field('Employee Id').locator('input');
    this.createLoginSwitch = page.locator('.oxd-switch-input'); // the toggle has no role or label to target
    this.username = this.field('Username').locator('input');
    this.password = this.field('Password').locator('input');
    this.confirmPassword = this.field('Confirm Password').locator('input');
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  error(label) {
    return this.field(label).locator('.oxd-input-field-error-message');
  }

  async open() {
    await this.page.goto('pim/addEmployee');
    await this.heading.waitFor();
  }

  async fillNames({ first = 'QA', middle = '', last }) {
    await this.firstName.fill(first);
    if (middle) await this.middleName.fill(middle);
    await this.lastName.fill(last);
  }

  // After a successful save the app opens the new employee's Personal Details, with the number in the URL.
  async saveAndGetEmpNumber() {
    await this.saveButton.click();
    await this.page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);
    return Number(this.page.url().match(/empNumber\/(\d+)/)[1]);
  }
}

module.exports = { AddEmployeePage };
