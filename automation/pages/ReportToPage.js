// Page object for an employee's Report-to tab: who supervises them and who reports to them.
class ReportToPage {
  constructor(page) {
    this.page = page;
    this.supervisorsHeading = page.getByRole('heading', { name: 'Assigned Supervisors' });
    this.subordinatesHeading = page.getByRole('heading', { name: 'Assigned Subordinates' });
    // The page shows three Add buttons in this order: supervisors, subordinates, attachments.
    this.addButtons = page.getByRole('button', { name: 'Add' });
    this.addSupervisorButton = this.addButtons.first();
    this.nameInput = page.getByPlaceholder('Type for hints...');
    this.reportingMethod = page.locator('.oxd-input-group').filter({ has: page.getByText('Reporting Method', { exact: true }) });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.errors = page.locator('.oxd-input-field-error-message');
    this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' });
  }

  async open(empNumber) {
    await this.page.goto(`pim/viewReportToDetails/empNumber/${empNumber}`);
    await this.supervisorsHeading.waitFor();
  }

  // A row in either list (supervisors or subordinates), found by the person's unique last name.
  row(lastName) {
    return this.page.locator('.oxd-table-card').filter({ hasText: lastName });
  }

  deleteButton(lastName) {
    return this.row(lastName).locator('button:has(.bi-trash)');
  }

  async addSupervisor(lastName, method) {
    await this.addSupervisorButton.click();
    await this.nameInput.fill(lastName);
    await this.page.getByRole('option', { name: lastName }).click();
    await this.reportingMethod.locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: method, exact: true }).click();
    await this.saveButton.click();
  }
}

module.exports = { ReportToPage };
