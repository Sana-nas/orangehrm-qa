// Page object for PIM > Employee List (search filters, results table, delete).
class EmployeeListPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Employee Information' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.employeeIdFilter = this.field('Employee Id').locator('input');
    this.employeeNameFilter = this.field('Employee Name').getByPlaceholder('Type for hints...');
    this.recordsInfo = page.getByText(/\(\d+\) Records? Found|No Records Found/).first();
    this.rows = page.locator('.oxd-table-card'); // the table has no role or label for its rows, so CSS is used
    this.deleteDialogText = page.getByText('The selected record will be permanently deleted');
    this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.deleteCancelButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // The labels are not linked to their inputs, so a field is "the group that contains this label text".
  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  columnHeader(name) {
    // The header names carry a trailing icon character (the sort arrows), and plain 'Id' would also match
    // "First (& Middle) Name". So the name must start the header and no letter may follow it.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('columnheader', { name: new RegExp(`^${escaped}(?![A-Za-z])`) });
  }

  async open() {
    await this.page.goto('pim/viewEmployeeList');
    await this.heading.waitFor();
    // Wait until the page has finished loading its data. Acting earlier can be ignored or overwritten when the server is busy.
    await this.page.waitForLoadState('networkidle');
  }

  // Finds a row by its exact Last Name cell. The tests give every employee a unique last name,
  // so a test only ever touches its own employee.
  row(lastName) {
    return this.rows.filter({ has: this.page.getByRole('cell', { name: lastName, exact: true }) });
  }

  // The two icon buttons have no names; here edit comes first and delete second (the reverse of the Admin list).
  editButton(lastName) {
    return this.row(lastName).locator('button:has(.bi-pencil-fill)');
  }

  deleteButton(lastName) {
    return this.row(lastName).locator('button:has(.bi-trash)');
  }

  async searchById(employeeId) {
    await this.employeeIdFilter.fill(employeeId);
    await this.searchButton.click();
  }

  async pickEmployeeName(lastName) {
    await this.employeeNameFilter.fill(lastName);
    await this.page.getByRole('option', { name: lastName }).click();
  }
}

module.exports = { EmployeeListPage };
