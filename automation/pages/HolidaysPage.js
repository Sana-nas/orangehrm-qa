// Page object for Leave > Configure > Holidays (the list).
class HolidaysPage {
  constructor(page) {
    this.page = page;
    this.recordsInfo = page.getByText(/\(\d+\) Records? Found|No Records Found/).first();
    this.rows = page.locator('.oxd-table-card');
  }

  async open() {
    await this.page.goto('leave/viewHolidayList');
    await this.recordsInfo.waitFor();
  }

  row(name) {
    return this.rows.filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }
}

module.exports = { HolidaysPage };
