// Page object for Leave > Apply (the form an employee uses to ask for leave).
class ApplyLeavePage {
  constructor(page) {
    this.page = page;
    this.fromDate = this.field('From Date').locator('input');
    this.toDate = this.field('To Date').locator('input');
    this.comments = this.field('Comments').locator('textarea');
    this.leaveBalance = this.field('Leave Balance');
    this.duration = this.field('Duration');
    this.applyButton = page.getByRole('button', { name: 'Apply' });
  }

  field(label) {
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  async open() {
    await this.page.goto('leave/applyLeave');
    await this.field('Leave Type').waitFor();
  }

  async chooseType(name) {
    await this.field('Leave Type').locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  // The date fields only register a value after each one is left, so both are blurred.
  async fillDates(from, to) {
    await this.fromDate.fill(from);
    await this.fromDate.blur();
    await this.toDate.fill(to);
    await this.toDate.blur();
  }

  async chooseDuration(option) {
    await this.duration.locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async apply({ type = 'QA Annual Leave', from, to, comment, duration }) {
    await this.chooseType(type);
    await this.fillDates(from, to);
    if (duration) await this.chooseDuration(duration);
    if (comment) await this.comments.fill(comment);
    await this.applyButton.click();
  }
}

module.exports = { ApplyLeavePage };
