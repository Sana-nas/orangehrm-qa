const { test, expect, VALID_PASSWORD } = require('../fixtures');
const { AdminUsersPage } = require('../pages/AdminUsersPage');
const { UserFormPage } = require('../pages/UserFormPage');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

const LIST_URL = /\/admin\/viewSystemUsers$/;
const ADD_URL = /\/admin\/saveSystemUser$/;

// Each test creates its own uniquely named employees and users (see fixtures.js) and finds them by
// exact username, so tests are independent and never touch other people's data.
test.describe('Admin - user management', () => {
  let usersPage;
  let form;

  test.beforeEach(({ page }) => {
    usersPage = new AdminUsersPage(page);
    form = new UserFormPage(page);
  });

  async function loginAs(page, username, password = VALID_PASSWORD) {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);
    return loginPage;
  }

  // ---- TS-ADMIN-001: list and search ----

  test('TC-ADMIN-001 user list shows its columns and a record count', async () => {
    await usersPage.open();

    for (const name of ['Username', 'User Role', 'Employee Name', 'Status', 'Actions']) {
      await expect(usersPage.columnHeader(name)).toBeVisible();
    }
    await expect(usersPage.recordsInfo).toHaveText(/\(\d+\) Records? Found/);
  });

  test('TC-ADMIN-002 search by exact username finds only that user', async ({ data }) => {
    const employee = await data.createEmployee();
    const user = await data.createUser({ empNumber: employee.empNumber });

    await usersPage.open();
    await usersPage.searchByUsername(user.username);

    await expect(usersPage.row(user.username)).toBeVisible();
    await expect(usersPage.rows).toHaveCount(1);
    await expect(usersPage.recordsInfo).toHaveText('(1) Record Found');
  });

  test('TC-ADMIN-005 search for a username that does not exist', async ({ data }) => {
    await usersPage.open();
    await usersPage.searchByUsername(data.uniqueName('nomatch'));

    await expect(usersPage.recordsInfo).toHaveText('No Records Found');
    await expect(usersPage.rows).toHaveCount(0);
  });

  test('TC-ADMIN-006 filter by user role', async ({ data }) => {
    const essUser = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, role: 'ESS' });
    const adminUser = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, role: 'Admin' });

    await usersPage.open();
    await usersPage.choose('User Role', 'ESS');
    await usersPage.searchButton.click();

    // The Admin user disappearing proves the filter was applied (before it, both rows are listed).
    await expect(usersPage.row(adminUser.username)).toBeHidden();
    await expect(usersPage.row(essUser.username)).toBeVisible();
  });

  test('TC-ADMIN-007 filter by status', async ({ data }) => {
    const enabledUser = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, enabled: true });
    const disabledUser = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, enabled: false });

    await usersPage.open();
    await usersPage.choose('Status', 'Enabled');
    await usersPage.searchButton.click();

    await expect(usersPage.row(disabledUser.username)).toBeHidden();
    await expect(usersPage.row(enabledUser.username)).toBeVisible();
  });

  test('TC-ADMIN-008 search by employee name chosen from the hint list', async ({ data }) => {
    const employee = await data.createEmployee();
    const user = await data.createUser({ empNumber: employee.empNumber });
    const other = await data.createUser({ empNumber: (await data.createEmployee()).empNumber });

    await usersPage.open();
    await usersPage.pickEmployeeFilter(employee.lastName);
    await usersPage.searchButton.click();

    await expect(usersPage.row(other.username)).toBeHidden();
    await expect(usersPage.row(user.username)).toBeVisible();
  });

  test('TC-ADMIN-009 reset clears the filters and shows the list again', async ({ data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber });

    await usersPage.open();
    await usersPage.searchByUsername(data.uniqueName('nomatch'));
    await expect(usersPage.rows).toHaveCount(0);

    await usersPage.resetButton.click();

    await expect(usersPage.usernameFilter).toHaveValue('');
    await expect(usersPage.row(user.username)).toBeVisible();
  });

  // ---- TS-ADMIN-002: add user ----

  test('TC-ADMIN-010 add a user with the Admin role', async ({ page, data }) => {
    const employee = await data.createEmployee();
    const username = data.uniqueName('qa');
    data.trackUser(username);

    await form.openAdd();
    await form.fillNewUser({ role: 'Admin', status: 'Enabled', employeeLastName: employee.lastName, username, password: VALID_PASSWORD });
    await form.saveButton.click();

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(page).toHaveURL(LIST_URL);
    await usersPage.searchByUsername(username);
    await expect(usersPage.row(username).getByRole('cell', { name: 'Admin', exact: true })).toBeVisible();
    await expect(usersPage.row(username).getByRole('cell', { name: 'Enabled', exact: true })).toBeVisible();
  });

  test('TC-ADMIN-011 add a user with the ESS role and Disabled status', async ({ page, data }) => {
    const employee = await data.createEmployee();
    const username = data.uniqueName('qa');
    data.trackUser(username);

    await form.openAdd();
    await form.fillNewUser({ role: 'ESS', status: 'Disabled', employeeLastName: employee.lastName, username, password: VALID_PASSWORD });
    await form.saveButton.click();

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await usersPage.searchByUsername(username);
    await expect(usersPage.row(username).getByRole('cell', { name: 'ESS', exact: true })).toBeVisible();
    await expect(usersPage.row(username).getByRole('cell', { name: 'Disabled', exact: true })).toBeVisible();
  });

  test('TC-ADMIN-012 a newly added enabled user can log in', async ({ loggedOutPage, data }) => {
    // The user is set up through the API; this test checks that the new account actually works.
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber });

    await loginAs(loggedOutPage, user.username);

    await expect(loggedOutPage).toHaveURL(/\/dashboard\/index$/);
    await expect(new DashboardPage(loggedOutPage).heading).toBeVisible();
  });

  test('TC-ADMIN-013 cancel on the Add User form creates nothing', async ({ page, data }) => {
    const username = data.uniqueName('qa');

    await form.openAdd();
    await form.input('Username').fill(username);
    await form.cancelButton.click();

    await expect(page).toHaveURL(LIST_URL);
    await usersPage.searchByUsername(username);
    await expect(usersPage.rows).toHaveCount(0);
  });

  // ---- TS-ADMIN-003: add user validation ----

  test('TC-ADMIN-014 saving the empty Add User form shows the required messages', async ({ page }) => {
    await form.openAdd();
    await form.saveButton.click();

    await expect(page.getByText('Required', { exact: true })).toHaveCount(5);
    await expect(form.error('Confirm Password')).toHaveText('Passwords do not match');
    await expect(page).toHaveURL(ADD_URL);
  });

  // Table of "type this into that field, expect this message". One test is generated per row,
  // and each title starts with its test case ID.
  const fieldRules = [
    { id: 'TC-ADMIN-015', title: 'username shorter than 5 characters', field: 'Username', value: 'abcd', message: 'Should be at least 5 characters' },
    { id: 'TC-ADMIN-017', title: 'username longer than 40 characters', field: 'Username', value: 'a'.repeat(41), message: 'Should not exceed 40 characters' },
    { id: 'TC-ADMIN-018', title: 'password shorter than 8 characters', field: 'Password', value: 'abc12', message: 'Should have at least 8 characters' },
    { id: 'TC-ADMIN-019', title: 'password without an upper-case letter', field: 'Password', value: 'abcdefg1', message: 'Your password must contain minimum 1 upper-case letter' },
    { id: 'TC-ADMIN-020', title: 'password without a lower-case letter', field: 'Password', value: 'ABCDEFG1', message: 'Your password must contain minimum 1 lower-case letter' },
    { id: 'TC-ADMIN-021', title: 'password without a number', field: 'Password', value: 'Abcdefgh', message: 'Your password must contain minimum 1 number' },
    { id: 'TC-ADMIN-022', title: 'password without a special character', field: 'Password', value: 'Abcdefg1', message: 'Your password must contain minimum 1 special character' },
    { id: 'TC-ADMIN-023', title: 'password longer than 64 characters', field: 'Password', value: 'Aa1!' + 'x'.repeat(61), message: 'Should not exceed 64 characters' },
  ];

  for (const rule of fieldRules) {
    test(`${rule.id} ${rule.title} is rejected`, async () => {
      await form.openAdd();
      await form.input(rule.field).fill(rule.value);
      await form.input(rule.field).blur();

      await expect(form.error(rule.field)).toHaveText(rule.message);
    });
  }

  test('TC-ADMIN-016 username of exactly 5 and 40 characters is accepted', async () => {
    await form.openAdd();
    const username = form.input('Username');

    // Show the length message first, so "message gone" proves the new value was checked, not just that it hadn't loaded yet.
    await username.fill('abcd');
    await expect(form.error('Username')).toHaveText('Should be at least 5 characters');
    await username.fill('abcde');
    await expect(form.error('Username')).toHaveCount(0);

    await username.fill('a'.repeat(41));
    await expect(form.error('Username')).toHaveText('Should not exceed 40 characters');
    await username.fill('a'.repeat(40));
    await expect(form.error('Username')).toHaveCount(0);
  });

  test('TC-ADMIN-024 confirm password different from password is rejected', async () => {
    await form.openAdd();
    await form.input('Password').fill(VALID_PASSWORD);
    await form.input('Confirm Password').fill('Qa#Test2027');
    await form.input('Confirm Password').blur();

    await expect(form.error('Confirm Password')).toHaveText('Passwords do not match');
  });

  // ---- TS-ADMIN-004: employee link and unique username ----

  test('TC-ADMIN-025 an employee name that does not exist cannot be used', async ({ page, data }) => {
    await form.openAdd();
    await form.employeeInput.fill('zzzzzz');
    await expect(form.employeeHints).toContainText('No Records Found');

    await form.choose('User Role', 'ESS');
    await form.choose('Status', 'Enabled');
    await form.input('Username').fill(data.uniqueName('qa'));
    await form.input('Password').fill(VALID_PASSWORD);
    await form.input('Confirm Password').fill(VALID_PASSWORD);
    await form.saveButton.click();

    await expect(form.error('Employee Name')).toBeVisible();
    await expect(page).toHaveURL(ADD_URL);
  });

  test('TC-ADMIN-026 a duplicate username is rejected', async ({ page, data }) => {
    const existing = await data.createUser({ empNumber: (await data.createEmployee()).empNumber });
    const secondEmployee = await data.createEmployee();

    await form.openAdd();
    await form.pickEmployee(secondEmployee.lastName);
    await form.input('Username').fill(existing.username);

    await expect(form.error('Username')).toHaveText('Already exists');
    await expect(page).toHaveURL(ADD_URL);
  });

  // ---- TS-ADMIN-005: edit user ----

  test('TC-ADMIN-027 the Edit User form opens with the existing values', async ({ page, data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber });

    await usersPage.open();
    await usersPage.searchByUsername(user.username);
    await usersPage.editButton(user.username).click();

    await expect(form.editHeading).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/saveSystemUser\/\d+$/);
    await expect(form.input('Username')).toHaveValue(user.username);
    await expect(form.changePasswordLabel).toBeVisible();
  });

  test('TC-ADMIN-028 change a user from ESS to Admin', async ({ page, data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, role: 'ESS' });

    await usersPage.open();
    await usersPage.searchByUsername(user.username);
    await usersPage.editButton(user.username).click();
    await form.choose('User Role', 'Admin');
    await form.saveButton.click();

    await expect(page.getByText('Successfully Updated')).toBeVisible();
    await usersPage.searchByUsername(user.username);
    await expect(usersPage.row(user.username).getByRole('cell', { name: 'Admin', exact: true })).toBeVisible();
  });

  test('TC-ADMIN-029 a disabled user cannot log in', async ({ page, loggedOutPage, data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, enabled: true });

    await usersPage.open();
    await usersPage.searchByUsername(user.username);
    await usersPage.editButton(user.username).click();
    await form.choose('Status', 'Disabled');
    await form.saveButton.click();
    await expect(page.getByText('Successfully Updated')).toBeVisible();
    await usersPage.searchByUsername(user.username);
    await expect(usersPage.row(user.username).getByRole('cell', { name: 'Disabled', exact: true })).toBeVisible();

    const loginPage = await loginAs(loggedOutPage, user.username);

    await expect(loginPage.alertMessage).toHaveText('Account disabled');
    await expect(loggedOutPage).toHaveURL(/\/auth\/login$/);
  });

  test('TC-ADMIN-030 cancel on the Edit User form changes nothing', async ({ page, data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, role: 'ESS' });

    await usersPage.open();
    await usersPage.searchByUsername(user.username);
    await usersPage.editButton(user.username).click();
    await form.choose('User Role', 'Admin');
    await form.cancelButton.click();

    await expect(page).toHaveURL(LIST_URL);
    await usersPage.searchByUsername(user.username);
    await expect(usersPage.row(user.username).getByRole('cell', { name: 'ESS', exact: true })).toBeVisible();
  });

  // ---- TS-ADMIN-006: delete user ----

  test('TC-ADMIN-031 cancelling the delete confirmation keeps the user', async ({ data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber });

    await usersPage.open();
    await usersPage.searchByUsername(user.username);
    await usersPage.deleteButton(user.username).click();
    await expect(usersPage.deleteDialogText).toBeVisible();
    await usersPage.deleteCancelButton.click();

    await expect(usersPage.deleteDialogText).toBeHidden();
    await expect(usersPage.row(user.username)).toBeVisible();
  });

  test('TC-ADMIN-032 confirming the delete removes the user and blocks their login', async ({ page, loggedOutPage, data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber });

    await usersPage.open();
    await usersPage.searchByUsername(user.username);
    await usersPage.deleteButton(user.username).click();
    await usersPage.deleteConfirmButton.click();

    await expect(page.getByText('Successfully Deleted')).toBeVisible();
    await usersPage.searchByUsername(user.username);
    await expect(usersPage.row(user.username)).toBeHidden();

    const loginPage = await loginAs(loggedOutPage, user.username);

    await expect(loginPage.alertMessage).toBeVisible();
    await expect(loggedOutPage).toHaveURL(/\/auth\/login$/);
  });

  // ---- TS-ADMIN-007: role-based access ----

  test('TC-ADMIN-033 an ESS user does not see the Admin menu', async ({ loggedOutPage, data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, role: 'ESS' });
    const dashboard = new DashboardPage(loggedOutPage);

    await loginAs(loggedOutPage, user.username);

    await expect(dashboard.heading).toBeVisible(); // wait until the menu has loaded before checking what is missing
    await expect(dashboard.adminMenuLink).toHaveCount(0);
  });

  test('TC-ADMIN-034 an ESS user cannot open the Admin page by URL', async ({ loggedOutPage, data }) => {
    const user = await data.createUser({ empNumber: (await data.createEmployee()).empNumber, role: 'ESS' });
    await loginAs(loggedOutPage, user.username);
    await expect(new DashboardPage(loggedOutPage).heading).toBeVisible();

    await loggedOutPage.goto('admin/viewSystemUsers');

    // The app keeps the URL but shows a "Credential Required" message instead of the user list.
    await expect(loggedOutPage.getByText('Credential Required')).toBeVisible();
    await expect(new AdminUsersPage(loggedOutPage).heading).toBeHidden();
  });
});
