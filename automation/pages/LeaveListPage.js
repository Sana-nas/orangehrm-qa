// Page object for Leave > Leave List, which admins and supervisors use to see and decide leave requests.
class LeaveListPage {
  constructor(page) {
    this.page = page;
    this.recordsInfo = page.getByText(/\(\d+\) Records? Found|No Records Found/).first();
    this.rows = page.locator('.oxd-table-card');
    this.employeeFilter = this.field('Employee Name').getByPlaceholder('Type for hints...');
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  async open() {
    await this.page.goto('leave/viewLeaveList');
    await this.recordsInfo.waitFor();
  }

  // Narrows the list to one person, so the test finds its own requests even if other requests exist.
  async showOnly(lastName) {
    await this.employeeFilter.fill(lastName);
    await this.page.getByRole('option', { name: lastName }).click();
    await this.searchButton.click();
  }

  // Requests are found by the employee's unique last name.
  row(lastName) {
    return this.rows.filter({ hasText: lastName });
  }

  approveButton(lastName) {
    return this.row(lastName).getByRole('button', { name: 'Approve' });
  }

  rejectButton(lastName) {
    return this.row(lastName).getByRole('button', { name: 'Reject' });
  }
}

module.exports = { LeaveListPage };
