const { test, expect } = require('../fixtures');
const { LeaveTypesPage } = require('../pages/LeaveTypesPage');
const { AddLeaveTypePage } = require('../pages/AddLeaveTypePage');
const { HolidaysPage } = require('../pages/HolidaysPage');
const { AddHolidayPage } = require('../pages/AddHolidayPage');
const { AddEntitlementPage } = require('../pages/AddEntitlementPage');

// These tests need the Leave baseline (the leave period, the QA leave types and the QA Holiday on 2026-12-25).
// Anything a test adds through a screen is removed again afterwards.
test.describe('Leave - setup', () => {
  let leaveTypes;
  let addType;
  let holidays;
  let addHoliday;
  let addEntitlement;

  test.beforeEach(({ page }) => {
    leaveTypes = new LeaveTypesPage(page);
    addType = new AddLeaveTypePage(page);
    holidays = new HolidaysPage(page);
    addHoliday = new AddHolidayPage(page);
    addEntitlement = new AddEntitlementPage(page);
  });

  // ---- TS-LEAVE-001: leave types ----

  test('TC-LEAVE-001 Leave Types list shows the leave types', async () => {
    await leaveTypes.open();

    await expect(leaveTypes.row('QA Annual Leave')).toBeVisible();
    await expect(leaveTypes.row('QA Sick Leave')).toBeVisible();
    await expect(leaveTypes.recordsInfo).toHaveText(/\(\d+\) Records? Found/);
  });

  test('TC-LEAVE-002 add a leave type with a name only', async ({ page, data }) => {
    const name = data.uniqueName('QA Test ');
    data.trackLeaveType(name);

    await addType.open();
    await addType.nameInput.fill(name);
    await addType.situationalNo.click();
    await addType.saveButton.click();

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await leaveTypes.open();
    await expect(leaveTypes.row(name)).toBeVisible();
  });

  test('TC-LEAVE-003 saving a leave type with the name empty shows Required', async () => {
    await addType.open();
    await addType.saveButton.click();

    await expect(addType.error('Name')).toHaveText('Required');
  });

  test('TC-LEAVE-004 a duplicate leave type name is rejected', async () => {
    await addType.open();
    await addType.nameInput.fill('QA Annual Leave');

    await expect(addType.error('Name')).toHaveText('Already exists');
  });

  test('TC-LEAVE-005 a duplicate name in a different letter case is rejected', async () => {
    await addType.open();
    await addType.nameInput.fill('qa annual leave');

    await expect(addType.error('Name')).toHaveText('Already exists');
  });

  test('TC-LEAVE-006 a leave type name longer than 50 characters is rejected', async () => {
    await addType.open();
    await addType.nameInput.fill('x'.repeat(51));

    await expect(addType.error('Name')).toHaveText('Should not exceed 50 characters');
  });

  test('TC-LEAVE-007 a leave type name of exactly 50 characters is accepted', async () => {
    await addType.open();
    // Show the message first, so "message gone" proves the new value was checked, not that it hadn't loaded yet.
    await addType.nameInput.fill('x'.repeat(51));
    await expect(addType.error('Name')).toHaveText('Should not exceed 50 characters');
    await addType.nameInput.fill('x'.repeat(50));

    await expect(addType.error('Name')).toHaveCount(0);
  });

  // ---- TS-LEAVE-002: holidays ----

  test('TC-LEAVE-008 add a holiday', async ({ page, data }) => {
    const name = data.uniqueName('QA Holiday ');
    const date = data.uniqueHolidayDate();
    data.trackHolidayDate(date);

    await addHoliday.open();
    await addHoliday.nameInput.fill(name);
    await addHoliday.fillDate(date);
    await addHoliday.repeatsNo.click();
    await addHoliday.saveButton.click();

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await holidays.open();
    await expect(holidays.row(name)).toBeVisible();
  });

  test('TC-LEAVE-009 saving a holiday with the form empty shows Required twice', async ({ page }) => {
    await addHoliday.open();
    await addHoliday.saveButton.click();

    await expect(page.getByText('Required', { exact: true })).toHaveCount(2);
  });

  test('TC-LEAVE-010 a holiday on a date that already has one is rejected', async () => {
    await addHoliday.open();
    await addHoliday.nameInput.fill('Duplicate date');
    await addHoliday.fillDate('2026-12-25'); // the baseline QA Holiday

    await expect(addHoliday.error('Date')).toHaveText('Already exists');
  });

  test('TC-LEAVE-011 a holiday date in the wrong format is rejected', async () => {
    await addHoliday.open();
    await addHoliday.fillDate('25-12-2026');

    await expect(addHoliday.error('Date')).toHaveText('Should be a valid date in yyyy-mm-dd format');
  });

  // ---- TS-LEAVE-003: entitlements ----

  test('TC-LEAVE-012 add an entitlement for an employee', async ({ page, data }) => {
    const employee = await data.createEmployee();

    await addEntitlement.open();
    await addEntitlement.pickEmployee(employee.lastName);
    await addEntitlement.choose('Leave Type', 'QA Sick Leave');
    await addEntitlement.choose('Leave Period', '2026-01-01 - 2026-12-31');
    await addEntitlement.entitlementInput.fill('3');
    await addEntitlement.saveButton.click();

    await expect(addEntitlement.confirmDialog).toContainText('Existing Entitlement value 0.00 will be updated to 3.00');
    await addEntitlement.confirmButton.click();
    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(page.getByText('Total 3.00 Day(s)')).toBeVisible();
  });

  test('TC-LEAVE-013 saving the Add Entitlement form with nothing filled in shows Required', async ({ page }) => {
    await addEntitlement.open();
    await addEntitlement.saveButton.click();

    await expect(page.getByText('Required', { exact: true })).toHaveCount(3);
  });

  // One test per rule. The same Entitlement field gives a different message for each kind of bad value.
  const entitlementRules = [
    { id: 'TC-LEAVE-014', title: 'letters', value: 'abc', message: 'Should be a number with upto 2 decimal places' },
    { id: 'TC-LEAVE-015', title: 'a negative number', value: '-1', message: 'Should be a number with upto 2 decimal places' },
    { id: 'TC-LEAVE-016', title: 'more than 2 decimal places', value: '10.123', message: 'Should be a number with upto 2 decimal places' },
    { id: 'TC-LEAVE-017', title: 'a value of 10000 or more', value: '99999', message: 'Should be less than 10000' },
  ];

  for (const rule of entitlementRules) {
    test(`${rule.id} an Entitlement of ${rule.title} is rejected`, async () => {
      await addEntitlement.open();
      await addEntitlement.entitlementInput.fill(rule.value);
      await addEntitlement.entitlementInput.blur();

      await expect(addEntitlement.error('Entitlement')).toHaveText(rule.message);
    });
  }

  test('TC-LEAVE-018 an Entitlement of 9999.99 is accepted', async () => {
    await addEntitlement.open();
    await addEntitlement.entitlementInput.fill('99999');
    await expect(addEntitlement.error('Entitlement')).toHaveText('Should be less than 10000');
    await addEntitlement.entitlementInput.fill('9999.99');

    await expect(addEntitlement.error('Entitlement')).toHaveCount(0);
  });

  test('TC-LEAVE-019 an employee name that does not exist cannot be picked', async () => {
    await addEntitlement.open();
    await addEntitlement.employeeInput.fill('zzzzzz');

    await expect(addEntitlement.employeeHints).toContainText('No Records Found');
  });
});
