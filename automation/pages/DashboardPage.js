// Page object for the Dashboard, including the user menu in the top bar.
class DashboardPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.adminMenuLink = page.getByRole('link', { name: 'Admin' });
    // The dropdown trigger has no role or label to target, so CSS is the only option here.
    this.userMenu = page.locator('.oxd-userdropdown-tab');
    this.logoutItem = page.getByRole('menuitem', { name: 'Logout' });
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutItem.click();
  }
}

module.exports = { DashboardPage };
