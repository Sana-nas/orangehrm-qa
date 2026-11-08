// Page object for Leave > Assign Leave (an admin gives leave to an employee; it needs no approval).
class AssignLeavePage {
  constructor(page) {
    this.page = page;
    this.employeeInput = this.field('Employee Name').getByPlaceholder('Type for hints...');
    this.fromDate = this.field('From Date').locator('input');
    this.toDate = this.field('To Date').locator('input');
    this.assignButton = page.getByRole('button', { name: 'Assign' });
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  async open() {
    await this.page.goto('leave/assignLeave');
    await this.field('Employee Name').waitFor();
  }

  async assign({ lastName, type = 'QA Annual Leave', from, to }) {
    await this.employeeInput.fill(lastName);
    await this.page.getByRole('option', { name: lastName }).click();
    await this.field('Leave Type').locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: type, exact: true }).click();
    await this.fromDate.fill(from);
    await this.fromDate.blur();
    await this.toDate.fill(to);
    await this.toDate.blur();
    await this.assignButton.click();
  }
}

module.exports = { AssignLeavePage };
