const { test, expect, VALID_PASSWORD } = require('../fixtures');
const { EmployeeListPage } = require('../pages/EmployeeListPage');
const { AddEmployeePage } = require('../pages/AddEmployeePage');
const { PersonalDetailsPage } = require('../pages/PersonalDetailsPage');
const { ContactDetailsPage } = require('../pages/ContactDetailsPage');
const { ReportToPage } = require('../pages/ReportToPage');
const { AdminUsersPage } = require('../pages/AdminUsersPage');

const PERSONAL_URL = /\/pim\/viewPersonalDetails\/empNumber\/\d+$/;
const ADD_URL = /\/pim\/addEmployee$/;

// Every test creates its own uniquely named employees (see fixtures.js) and finds them by exact last name,
// so tests are independent and never touch other people's data.
test.describe('PIM - employees', () => {
  let list;
  let addPage;
  let personal;
  let contact;
  let reportTo;

  test.beforeEach(({ page }) => {
    list = new EmployeeListPage(page);
    addPage = new AddEmployeePage(page);
    personal = new PersonalDetailsPage(page);
    contact = new ContactDetailsPage(page);
    reportTo = new ReportToPage(page);
  });

  // ---- TS-PIM-001: list and search ----

  test('TC-PIM-001 employee list shows its columns and a record count', async () => {
    await list.open();

    for (const name of ['Id', 'First (& Middle) Name', 'Last Name', 'Job Title', 'Employment Status', 'Sub Unit', 'Supervisor', 'Actions']) {
      await expect(list.columnHeader(name)).toBeVisible();
    }
    await expect(list.recordsInfo).toHaveText(/\(\d+\) Records? Found/);
  });

  test('TC-PIM-002 search by exact Employee Id finds only that employee', async ({ data }) => {
    const employee = await data.createEmployee({ employeeId: data.uniqueEmployeeId() });

    await list.open();
    await list.searchById(employee.employeeId);

    await expect(list.row(employee.lastName)).toBeVisible();
    await expect(list.rows).toHaveCount(1);
    await expect(list.recordsInfo).toHaveText('(1) Record Found');
  });

  test('TC-PIM-004 search by employee name chosen from the hint list', async ({ data }) => {
    const employee = await data.createEmployee();
    const other = await data.createEmployee();

    await list.open();
    await list.pickEmployeeName(employee.lastName);
    await list.searchButton.click();

    await expect(list.row(other.lastName)).toBeHidden(); // disappearing proves the filter was applied
    await expect(list.row(employee.lastName)).toBeVisible();
  });

  test('TC-PIM-006 search for an Employee Id that does not exist', async ({ data }) => {
    await list.open();
    await list.searchById(data.uniqueName('zz'));

    await expect(list.recordsInfo).toHaveText('No Records Found');
    await expect(list.rows).toHaveCount(0);
  });

  test('TC-PIM-007 reset clears the filters and shows the list again', async ({ data }) => {
    const employee = await data.createEmployee();

    await list.open();
    await list.searchById(data.uniqueName('zz'));
    await expect(list.rows).toHaveCount(0);

    await list.resetButton.click();

    await expect(list.employeeIdFilter).toHaveValue('');
    await expect(list.row(employee.lastName)).toBeVisible();
  });

  // ---- TS-PIM-002: add employee ----

  test('TC-PIM-008 add an employee with the mandatory fields only', async ({ page, data }) => {
    const lastName = data.uniqueName('Auto');

    await addPage.open();
    await addPage.fillNames({ last: lastName });
    data.trackEmployee(await addPage.saveAndGetEmpNumber());

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(page).toHaveURL(PERSONAL_URL);
    await list.open();
    await expect(list.row(lastName)).toBeVisible();
  });

  test('TC-PIM-009 add an employee with all name fields and a chosen Employee Id', async ({ data }) => {
    const lastName = data.uniqueName('Auto');
    const employeeId = data.uniqueEmployeeId();

    await addPage.open();
    await addPage.fillNames({ middle: 'Mid', last: lastName });
    await addPage.employeeId.fill(employeeId);
    data.trackEmployee(await addPage.saveAndGetEmpNumber());

    await list.open();
    await list.searchById(employeeId);
    await expect(list.row(lastName)).toBeVisible();
    await expect(list.row(lastName).getByRole('cell', { name: employeeId, exact: true })).toBeVisible();
  });

  test('TC-PIM-010 add an employee together with login details', async ({ page, data }) => {
    const lastName = data.uniqueName('Auto');
    const username = data.uniqueName('qa');
    data.trackUser(username);

    await addPage.open();
    await addPage.fillNames({ last: lastName });
    await addPage.createLoginSwitch.click();
    await addPage.username.fill(username);
    await addPage.password.fill(VALID_PASSWORD);
    await addPage.confirmPassword.fill(VALID_PASSWORD);
    data.trackEmployee(await addPage.saveAndGetEmpNumber());

    await expect(page).toHaveURL(PERSONAL_URL);
    const users = new AdminUsersPage(page);
    await users.open();
    await users.searchByUsername(username);
    await expect(users.row(username)).toBeVisible();
    await expect(users.row(username)).toContainText(lastName); // the user is linked to the new employee
  });

  // ---- TS-PIM-003: add employee validation ----

  test('TC-PIM-011 saving the Add Employee form with empty names shows Required twice', async ({ page }) => {
    await addPage.open();
    await addPage.saveButton.click();

    await expect(page.getByText('Required', { exact: true })).toHaveCount(2);
    await expect(page).toHaveURL(ADD_URL);
  });

  // One test per name field. A 31-character value is rejected with the same message in each.
  const nameFields = [
    { id: 'TC-PIM-012', title: 'First Name', field: 'firstName' },
    { id: 'TC-PIM-013', title: 'Last Name', field: 'lastName' },
    { id: 'TC-PIM-014', title: 'Middle Name', field: 'middleName' },
  ];

  for (const { id, title, field } of nameFields) {
    test(`${id} ${title} longer than 30 characters is rejected`, async ({ page }) => {
      await addPage.open();
      await addPage[field].fill('a'.repeat(31));
      await addPage[field].blur();

      await expect(page.getByText('Should not exceed 30 characters')).toBeVisible();
    });
  }

  test('TC-PIM-015 names of exactly 30 characters are accepted', async ({ page }) => {
    const tooLong = page.getByText('Should not exceed 30 characters');
    await addPage.open();

    // Show the message first, so "message gone" proves the new value was checked, not that it hadn't loaded yet.
    await addPage.firstName.fill('a'.repeat(31));
    await addPage.lastName.fill('a'.repeat(31));
    await expect(tooLong).toHaveCount(2);
    await addPage.firstName.fill('a'.repeat(30));
    await addPage.lastName.fill('a'.repeat(30));

    await expect(tooLong).toHaveCount(0);
  });

  test('TC-PIM-016 Employee Id longer than 10 characters is rejected', async () => {
    await addPage.open();
    await addPage.employeeId.fill('12345678901');

    await expect(addPage.error('Employee Id')).toHaveText('Should not exceed 10 characters');
  });

  test('TC-PIM-017 Employee Id of exactly 10 characters is accepted', async () => {
    await addPage.open();
    await addPage.employeeId.fill('12345678901');
    await expect(addPage.error('Employee Id')).toHaveText('Should not exceed 10 characters');
    await addPage.employeeId.fill('1234567890');

    await expect(addPage.error('Employee Id')).toHaveCount(0);
  });

  test('TC-PIM-018 a duplicate Employee Id is rejected', async ({ data }) => {
    const existing = await data.createEmployee({ employeeId: data.uniqueEmployeeId() });

    await addPage.open();
    await addPage.fillNames({ last: data.uniqueName('Auto') });
    await addPage.employeeId.fill(existing.employeeId);

    await expect(addPage.error('Employee Id')).toHaveText('Employee Id already exists');
  });

  test('TC-PIM-019 login details switched on with empty fields shows the required messages', async ({ page, data }) => {
    await addPage.open();
    await addPage.fillNames({ last: data.uniqueName('Auto') });
    await addPage.createLoginSwitch.click();
    await addPage.saveButton.click();

    await expect(page.getByText('Required', { exact: true })).toHaveCount(2); // Username and Password
    await expect(addPage.error('Confirm Password')).toHaveText('Passwords do not match');
    await expect(page).toHaveURL(ADD_URL);
  });

  test('TC-PIM-020 login details with a username that already exists are rejected', async ({ data }) => {
    const owner = await data.createEmployee();
    const existingUser = await data.createUser({ empNumber: owner.empNumber });

    await addPage.open();
    await addPage.fillNames({ last: data.uniqueName('Auto') });
    await addPage.createLoginSwitch.click();
    await addPage.username.fill(existingUser.username);

    await expect(addPage.error('Username')).toHaveText('Already exists');
  });

  test('TC-PIM-021 login details with a weak password are rejected', async ({ data }) => {
    await addPage.open();
    await addPage.fillNames({ last: data.uniqueName('Auto') });
    await addPage.createLoginSwitch.click();
    await addPage.password.fill('abc12');

    await expect(addPage.error('Password')).toHaveText('Should have at least 8 characters');
  });

  // ---- TS-PIM-004: personal details ----

  test('TC-PIM-022 Personal Details open with the existing values', async ({ page, data }) => {
    const employee = await data.createEmployee();

    await list.open();
    await list.pickEmployeeName(employee.lastName);
    await list.searchButton.click();
    await list.editButton(employee.lastName).click();

    await expect(page).toHaveURL(PERSONAL_URL);
    await expect(personal.firstName).toHaveValue('QA');
    await expect(personal.lastName).toHaveValue(employee.lastName);
    for (const label of ['Employee Id', 'Other Id', "Driver's License Number", 'License Expiry Date', 'Nationality', 'Marital Status', 'Date of Birth', 'Gender']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('TC-PIM-023 edit the Last Name and save', async ({ page, data }) => {
    const employee = await data.createEmployee();
    const newLastName = data.uniqueName('Edit');

    await personal.open(employee.empNumber);
    await personal.lastName.fill(newLastName);
    await personal.saveButton.click();

    await expect(page.getByText('Successfully Updated')).toBeVisible();
    await list.open();
    await list.pickEmployeeName(newLastName);
    await list.searchButton.click();
    await expect(list.row(newLastName)).toBeVisible();
  });

  test('TC-PIM-024 First Name longer than 30 characters is rejected on Personal Details', async ({ page, data }) => {
    const employee = await data.createEmployee();

    await personal.open(employee.empNumber);
    await personal.firstName.fill('a'.repeat(31));
    await personal.firstName.blur();

    await expect(page.getByText('Should not exceed 30 characters')).toBeVisible();
  });

  test('TC-PIM-025 clearing the First Name on Personal Details shows Required', async ({ page, data }) => {
    const employee = await data.createEmployee();

    await personal.open(employee.empNumber);
    await personal.firstName.fill('');
    await personal.firstName.blur();

    await expect(page.getByText('Required', { exact: true })).toBeVisible();
  });

  test('TC-PIM-026 a Date of Birth that is not a date is rejected', async ({ data }) => {
    const employee = await data.createEmployee();

    await personal.open(employee.empNumber);
    await personal.dateOfBirth.fill('abc');
    await personal.dateOfBirth.blur();

    await expect(personal.dateOfBirthError).toHaveText('Should be a valid date in yyyy-mm-dd format');
  });

  // KNOWN DEFECT CANDIDATE (BUG-001, waiting for manual confirmation). The correct behaviour is that a future
  // birth date is rejected. The application currently saves it, so this test is expected to fail.
  // test.fail() records that: the report shows it as an expected failure, and it starts failing the run
  // (a reminder to remove this line) as soon as the application is fixed.
  test('TC-PIM-027 a Date of Birth in the future is rejected', async ({ page, data }) => {
    test.fail(true, 'BUG-001 candidate: the application saves a future Date of Birth');
    const employee = await data.createEmployee();

    await personal.open(employee.empNumber);
    await personal.dateOfBirth.fill('2999-01-01');
    await personal.saveButton.click();

    await expect(personal.dateOfBirthError).toBeVisible();
    await page.reload();
    await expect(personal.dateOfBirth).toHaveValue('');
  });

  // ---- TS-PIM-005: contact details ----

  test('TC-PIM-028 a Work Email in the wrong format is rejected', async ({ data }) => {
    const employee = await data.createEmployee();

    await contact.open(employee.empNumber);
    await contact.workEmail.fill('not-an-email');
    await contact.workEmail.blur();

    await expect(contact.error('Work Email')).toHaveText('Expected format: admin@example.com');
  });

  test('TC-PIM-029 letters in a phone number are rejected', async ({ data }) => {
    const employee = await data.createEmployee();

    await contact.open(employee.empNumber);
    await contact.mobile.fill('abc');
    await contact.mobile.blur();

    await expect(contact.error('Mobile')).toHaveText('Allows numbers and only + - / ( )');
  });

  test('TC-PIM-030 valid contact details are saved', async ({ page, data }) => {
    const employee = await data.createEmployee();

    await contact.open(employee.empNumber);
    await contact.mobile.fill('+94771234567');
    await contact.workEmail.fill('qa.alpha@example.com');
    await contact.saveButton.click();

    await expect(page.getByText(/Successfully (Saved|Updated)/)).toBeVisible();
    await contact.open(employee.empNumber);
    await expect(contact.mobile).toHaveValue('+94771234567');
    await expect(contact.workEmail).toHaveValue('qa.alpha@example.com');
  });

  // ---- TS-PIM-006: report-to ----

  test('TC-PIM-031 Report-to shows supervisors and subordinates', async ({ data }) => {
    const employee = await data.createEmployee();

    await reportTo.open(employee.empNumber);

    await expect(reportTo.supervisorsHeading).toBeVisible();
    await expect(reportTo.subordinatesHeading).toBeVisible();
    await expect(reportTo.addButtons).toHaveCount(3);
  });

  test('TC-PIM-032 adding a supervisor with an empty form shows Required twice', async ({ data }) => {
    const employee = await data.createEmployee();

    await reportTo.open(employee.empNumber);
    await reportTo.addSupervisorButton.click();
    await reportTo.saveButton.click();

    await expect(reportTo.errors).toHaveText(['Required', 'Required']);
  });

  test('TC-PIM-033 Reporting Method offers Direct and Indirect', async ({ page, data }) => {
    const employee = await data.createEmployee();

    await reportTo.open(employee.empNumber);
    await reportTo.addSupervisorButton.click();
    await reportTo.reportingMethod.locator('.oxd-select-text').click();

    await expect(page.getByRole('option', { name: 'Direct', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Indirect', exact: true })).toBeVisible();
  });

  test('TC-PIM-034 assign a direct supervisor', async ({ page, data }) => {
    const subordinate = await data.createEmployee();
    const supervisor = await data.createEmployee();

    await reportTo.open(subordinate.empNumber);
    await reportTo.addSupervisor(supervisor.lastName, 'Direct');

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(reportTo.row(supervisor.lastName)).toBeVisible();
    await list.open();
    await expect(list.row(subordinate.lastName)).toContainText(supervisor.lastName); // shown in the Supervisor column
  });

  test('TC-PIM-035 the supervisor shows the employee as a subordinate', async ({ data }) => {
    const subordinate = await data.createEmployee();
    const supervisor = await data.createEmployee();
    await data.setSupervisor(subordinate, supervisor); // setup through the API; this test checks the other side of the line

    await reportTo.open(supervisor.empNumber);

    await expect(reportTo.row(subordinate.lastName)).toBeVisible();
  });

  test('TC-PIM-036 remove a supervisor', async ({ data }) => {
    const subordinate = await data.createEmployee();
    const supervisor = await data.createEmployee();
    await data.setSupervisor(subordinate, supervisor);

    await reportTo.open(subordinate.empNumber);
    await expect(reportTo.row(supervisor.lastName)).toBeVisible();
    await reportTo.deleteButton(supervisor.lastName).click();
    await reportTo.deleteConfirmButton.click();

    await expect(reportTo.row(supervisor.lastName)).toBeHidden();
    await list.open();
    await expect(list.row(subordinate.lastName)).toBeVisible(); // wait for the table before checking what is missing
    await expect(list.row(subordinate.lastName)).not.toContainText(supervisor.lastName);
  });

  // ---- TS-PIM-007: delete employee ----

  test('TC-PIM-037 cancelling the delete confirmation keeps the employee', async ({ data }) => {
    const employee = await data.createEmployee();

    await list.open();
    await list.pickEmployeeName(employee.lastName);
    await list.searchButton.click();
    await list.deleteButton(employee.lastName).click();
    await expect(list.deleteDialogText).toBeVisible();
    await list.deleteCancelButton.click();

    await expect(list.deleteDialogText).toBeHidden();
    await expect(list.row(employee.lastName)).toBeVisible();
  });

  test('TC-PIM-038 confirming the delete removes the employee', async ({ page, data }) => {
    const employee = await data.createEmployee();

    await list.open();
    await list.pickEmployeeName(employee.lastName);
    await list.searchButton.click();
    await list.deleteButton(employee.lastName).click();
    await list.deleteConfirmButton.click();

    await expect(page.getByText('Successfully Deleted')).toBeVisible();
    await expect(list.row(employee.lastName)).toBeHidden();
  });
});
