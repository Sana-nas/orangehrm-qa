// Page object for Leave > My Leave (an employee's own requests).
class MyLeavePage {
  constructor(page) {
    this.page = page;
    this.recordsInfo = page.getByText(/\(\d+\) Records? Found|No Records Found/).first();
    this.rows = page.locator('.oxd-table-card');
  }

  async open() {
    await this.page.goto('leave/viewMyLeaveList');
    await this.recordsInfo.waitFor();
  }

  // Requests are found by the unique comment the test gave them.
  row(comment) {
    return this.rows.filter({ hasText: comment });
  }

  cancelButton(comment) {
    return this.row(comment).getByRole('button', { name: 'Cancel' });
  }
}

module.exports = { MyLeavePage };
