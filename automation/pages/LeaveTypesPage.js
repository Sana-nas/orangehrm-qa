// Page object for Leave > Configure > Leave Types (the list).
class LeaveTypesPage {
  constructor(page) {
    this.page = page;
    this.recordsInfo = page.getByText(/\(\d+\) Records? Found|No Records Found/).first();
    this.rows = page.locator('.oxd-table-card'); // the table has no role or label for its rows, so CSS is used
  }

  async open() {
    await this.page.goto('leave/leaveTypeList');
    await this.recordsInfo.waitFor();
  }

  row(name) {
    return this.rows.filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }
}

module.exports = { LeaveTypesPage };
