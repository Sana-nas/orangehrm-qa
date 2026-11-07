// Page object for Admin > User Management > Users (the "System Users" list and its search filters).
class AdminUsersPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'System Users' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.usernameFilter = this.field('Username').locator('input');
    this.employeeFilter = this.field('Employee Name').getByPlaceholder('Type for hints...');
    this.recordsInfo = page.getByText(/\(\d+\) Records? Found|No Records Found/).first();
    this.rows = page.locator('.oxd-table-card'); // the table has no role or label for its rows, so CSS is used
    this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.deleteCancelButton = page.getByRole('button', { name: 'No, Cancel' });
    this.deleteDialogText = page.getByText('The selected record will be permanently deleted');
  }

  // The labels are not linked to their inputs, so a field is found as "the group that contains this label text".
  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  columnHeader(name) {
    return this.page.getByRole('columnheader', { name });
  }

  async open() {
    await this.page.goto('admin/viewSystemUsers');
    await this.heading.waitFor();
  }

  // Finds a row by its exact username cell, so a test only ever touches the user it created.
  row(username) {
    return this.rows.filter({ has: this.page.getByRole('cell', { name: username, exact: true }) });
  }

  // The two icon buttons in a row have no names: delete is first, edit is second.
  deleteButton(username) {
    return this.row(username).getByRole('button').first();
  }

  editButton(username) {
    return this.row(username).getByRole('button').nth(1);
  }

  async choose(label, option) {
    await this.field(label).locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async searchByUsername(username) {
    await this.usernameFilter.fill(username);
    await this.searchButton.click();
  }

  async pickEmployeeFilter(lastName) {
    await this.employeeFilter.fill(lastName);
    await this.page.getByRole('option', { name: lastName }).click();
  }
}

module.exports = { AdminUsersPage };
