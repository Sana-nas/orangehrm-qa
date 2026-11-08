const { test, expect } = require('../fixtures');
const { ApplyLeavePage } = require('../pages/ApplyLeavePage');
const { MyLeavePage } = require('../pages/MyLeavePage');
const { LeaveListPage } = require('../pages/LeaveListPage');
const { AssignLeavePage } = require('../pages/AssignLeavePage');
const { applyLeaveAs, decideLeaveAs } = require('../helpers/leaveApi');

// Dates are in December 2026, inside the 2026 leave period the Leave baseline defines.
// 2026-12-25 is the baseline QA Holiday. Past dates are accepted by the application, so these stay valid.
const MON = '2026-12-07';
const TUE = '2026-12-08';
const WED = '2026-12-09';
const THU = '2026-12-10';
const SAT = '2026-12-12';
const HOLIDAY = '2026-12-25';

// Tests with several people open one browser session per person (see "signIn" in fixtures.js).
// Each test creates its own employees and entitlements, so balances never mix between tests.
test.describe('Leave - requests', () => {
  const leaveTab = (page, name) => page.locator('.oxd-topbar-body-nav-tab').filter({ hasText: name });

  // ---- TS-LEAVE-004: apply leave ----

  test('TC-LEAVE-020 an employee has four Leave tabs', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);

    await page.goto('leave/viewLeaveModule');

    for (const name of ['Apply', 'My Leave', 'Entitlements', 'Reports']) {
      await expect(leaveTab(page, name)).toBeVisible();
    }
    await expect(page).toHaveURL(/\/leave\/viewMyLeaveList$/);
  });

  test('TC-LEAVE-021 choosing a leave type shows the balance', async ({ data, signIn }) => {
    const employee = await data.createStaff({ leaveDays: 10 });
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);

    await apply.open();
    await apply.chooseType('QA Annual Leave');

    await expect(apply.leaveBalance).toContainText('10.00 Day(s)');
  });

  test('TC-LEAVE-022 apply for two working days', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const comment = data.uniqueName('c');
    const apply = new ApplyLeavePage(page);
    const myLeave = new MyLeavePage(page);

    await apply.open();
    await apply.apply({ from: MON, to: TUE, comment });

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Pending Approval (2.00)');
    await expect(myLeave.row(comment)).toContainText('2.00');
    await expect(myLeave.cancelButton(comment)).toBeVisible();
  });

  test('TC-LEAVE-023 apply for a half day in the morning', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const comment = data.uniqueName('c');
    const apply = new ApplyLeavePage(page);
    const myLeave = new MyLeavePage(page);

    await apply.open();
    await apply.apply({ from: WED, to: WED, duration: 'Half Day - Morning', comment });

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('(09:00 - 13:00) Half Day');
    await expect(myLeave.row(comment)).toContainText('Pending Approval (0.50)');
  });

  test('TC-LEAVE-024 a one-day request offers four duration choices', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);

    await apply.open();
    await apply.chooseType('QA Annual Leave');
    await apply.fillDates(THU, THU);
    await apply.duration.locator('.oxd-select-text').click();

    for (const option of ['Full Day', 'Half Day - Morning', 'Half Day - Afternoon', 'Specify Time']) {
      await expect(page.getByRole('option', { name: option, exact: true })).toBeVisible();
    }
  });

  test('TC-LEAVE-025 a pending request reduces the balance straight away', async ({ data, signIn }) => {
    const employee = await data.createStaff({ leaveDays: 10 });
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);
    await applyLeaveAs(page, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: MON, toDate: TUE });

    await apply.open();
    await apply.chooseType('QA Annual Leave');

    await expect(apply.leaveBalance).toContainText('8.00 Day(s)');
  });

  // ---- TS-LEAVE-005: leave rules and validation ----

  test('TC-LEAVE-026 applying with the form empty shows Required three times', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);

    await apply.open();
    await apply.applyButton.click();

    await expect(page.getByText('Required', { exact: true })).toHaveCount(3);
  });

  test('TC-LEAVE-027 a Saturday-only request is refused', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);

    await apply.open();
    await apply.apply({ from: SAT, to: SAT });

    await expect(page.getByText('Failed to Submit: No Working Days Selected')).toBeVisible();
  });

  test('TC-LEAVE-028 a public-holiday-only request is refused', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);

    await apply.open();
    await apply.apply({ from: HOLIDAY, to: HOLIDAY });

    await expect(page.getByText('Failed to Submit: No Working Days Selected')).toBeVisible();
  });

  test('TC-LEAVE-029 a range with a holiday and a weekend counts only the working days', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const comment = data.uniqueName('c');
    const apply = new ApplyLeavePage(page);
    const myLeave = new MyLeavePage(page);

    await apply.open();
    await apply.apply({ from: '2026-12-24', to: '2026-12-28', comment }); // Thursday to Monday, Friday is the holiday

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Pending Approval (2.00)');
  });

  test('TC-LEAVE-031 an overlapping request is refused', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);
    await applyLeaveAs(page, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: MON, toDate: TUE });

    await apply.open();
    await apply.apply({ from: TUE, to: TUE });

    await expect(page.getByText('Failed to Submit')).toBeVisible();
  });

  test('TC-LEAVE-032 a request longer than the balance is refused', async ({ data, signIn }) => {
    const employee = await data.createStaff({ leaveDays: 10 });
    const page = await signIn(employee.username);
    const apply = new ApplyLeavePage(page);
    const myLeave = new MyLeavePage(page);

    await apply.open();
    await apply.chooseType('QA Annual Leave');
    await expect(apply.leaveBalance).toContainText('10.00 Day(s)'); // wait until the balance has loaded, then enter the dates
    await apply.fillDates('2026-12-07', '2026-12-22'); // 12 working days, balance 10
    await expect(apply.leaveBalance).toContainText('Balance not sufficient');
    await apply.applyButton.click();

    await expect(page.getByText('Leave Balance Exceeded')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.recordsInfo).toHaveText('No Records Found'); // nothing was saved
  });

  // ---- TS-LEAVE-006: approve, reject and cancel ----

  test("TC-LEAVE-035 a supervisor sees a subordinate's pending request", async ({ data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 0 });
    const employee = await data.createStaff({ supervisor });
    const employeePage = await signIn(employee.username);
    await applyLeaveAs(employeePage, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: MON, toDate: TUE });
    const supervisorPage = await signIn(supervisor.username);
    const list = new LeaveListPage(supervisorPage);

    await list.open();

    await expect(list.row(employee.lastName)).toContainText('Pending Approval');
    await expect(list.approveButton(employee.lastName)).toBeVisible();
    await expect(list.rejectButton(employee.lastName)).toBeVisible();
  });

  test('TC-LEAVE-036 a supervisor approves a request', async ({ data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 0 });
    const employee = await data.createStaff({ supervisor, leaveDays: 10 });
    const employeePage = await signIn(employee.username);
    const comment = data.uniqueName('c');
    await applyLeaveAs(employeePage, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: MON, toDate: TUE, comment });
    const supervisorPage = await signIn(supervisor.username);
    const list = new LeaveListPage(supervisorPage);

    await list.open();
    await list.approveButton(employee.lastName).click();

    await expect(supervisorPage.getByText('Successfully Updated')).toBeVisible();
    const myLeave = new MyLeavePage(employeePage);
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Scheduled (2.00)');
    const apply = new ApplyLeavePage(employeePage);
    await apply.open();
    await apply.chooseType('QA Annual Leave');
    await expect(apply.leaveBalance).toContainText('8.00 Day(s)'); // still reduced by the approved days
  });

  test('TC-LEAVE-037 a supervisor rejects a request and the days come back', async ({ data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 0 });
    const employee = await data.createStaff({ supervisor, leaveDays: 10 });
    const employeePage = await signIn(employee.username);
    const comment = data.uniqueName('c');
    await applyLeaveAs(employeePage, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: WED, toDate: WED, comment, duration: 'half_day_morning' });
    const supervisorPage = await signIn(supervisor.username);
    const list = new LeaveListPage(supervisorPage);

    await list.open();
    await list.rejectButton(employee.lastName).click();

    await expect(supervisorPage.getByText('Successfully Updated')).toBeVisible();
    const myLeave = new MyLeavePage(employeePage);
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Rejected (0.50)');
    await expect(myLeave.cancelButton(comment)).toHaveCount(0);
    const apply = new ApplyLeavePage(employeePage);
    await apply.open();
    await apply.chooseType('QA Annual Leave');
    await expect(apply.leaveBalance).toContainText('10.00 Day(s)');
  });

  test('TC-LEAVE-038 an employee cancels a pending request', async ({ data, signIn }) => {
    const employee = await data.createStaff({ leaveDays: 10 });
    const page = await signIn(employee.username);
    const comment = data.uniqueName('c');
    await applyLeaveAs(page, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: THU, toDate: THU, comment });
    const myLeave = new MyLeavePage(page);

    await myLeave.open();
    await myLeave.cancelButton(comment).click();

    await expect(page.getByText('Successfully Updated')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Cancelled (1.00)');
    const apply = new ApplyLeavePage(page);
    await apply.open();
    await apply.chooseType('QA Annual Leave');
    await expect(apply.leaveBalance).toContainText('10.00 Day(s)');
  });

  test('TC-LEAVE-039 an employee cancels an approved request', async ({ data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 0 });
    const employee = await data.createStaff({ supervisor, leaveDays: 10 });
    const employeePage = await signIn(employee.username);
    const supervisorPage = await signIn(supervisor.username);
    const comment = data.uniqueName('c');
    const requestId = await applyLeaveAs(employeePage, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: MON, toDate: TUE, comment });
    await decideLeaveAs(supervisorPage, requestId, 'APPROVE');
    const myLeave = new MyLeavePage(employeePage);

    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Scheduled (2.00)');
    await myLeave.cancelButton(comment).click();

    await expect(employeePage.getByText('Successfully Updated')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Cancelled (2.00)');
    const apply = new ApplyLeavePage(employeePage);
    await apply.open();
    await apply.chooseType('QA Annual Leave');
    await expect(apply.leaveBalance).toContainText('10.00 Day(s)');
  });

  test("TC-LEAVE-040 a supervisor's own leave is not in their Leave List", async ({ data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 10 });
    await data.createStaff({ supervisor, leaveDays: 0 }); // gives the supervisor a subordinate, so they get a Leave List
    const supervisorPage = await signIn(supervisor.username);
    await applyLeaveAs(supervisorPage, { leaveTypeId: await data.leaveTypeId('QA Annual Leave'), fromDate: THU, toDate: THU });
    const list = new LeaveListPage(supervisorPage);

    await list.open();

    await expect(list.recordsInfo).toHaveText('No Records Found');
    await expect(list.row(supervisor.lastName)).toHaveCount(0);
  });

  test('TC-LEAVE-041 the admin sees the requests of all employees', async ({ page, data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 10 });
    const employee = await data.createStaff({ supervisor, leaveDays: 10 });
    const employeePage = await signIn(employee.username);
    const supervisorPage = await signIn(supervisor.username);
    const typeId = await data.leaveTypeId('QA Annual Leave');
    await applyLeaveAs(employeePage, { leaveTypeId: typeId, fromDate: THU, toDate: THU });
    await applyLeaveAs(supervisorPage, { leaveTypeId: typeId, fromDate: THU, toDate: THU });
    const list = new LeaveListPage(page); // the default page is logged in as the admin

    await list.open();
    await list.showOnly(employee.lastName);
    await expect(list.approveButton(employee.lastName)).toBeVisible();
    await expect(list.rejectButton(employee.lastName)).toBeVisible();

    await list.open();
    await list.showOnly(supervisor.lastName);
    await expect(list.approveButton(supervisor.lastName)).toBeVisible();
    await expect(list.rejectButton(supervisor.lastName)).toBeVisible();
  });

  // ---- TS-LEAVE-007: assign leave and balance ----

  test('TC-LEAVE-042 the admin assigns leave to an employee', async ({ page, data, signIn }) => {
    const employee = await data.createStaff({ leaveDays: 10 });
    const assign = new AssignLeavePage(page);

    await assign.open();
    await assign.assign({ lastName: employee.lastName, from: '2026-12-14', to: '2026-12-14' });

    await expect(page.getByText('Successfully Saved')).toBeVisible();
    const employeePage = await signIn(employee.username);
    const myLeave = new MyLeavePage(employeePage);
    await myLeave.open();
    await expect(myLeave.row('2026-12-14')).toContainText('Scheduled (1.00)'); // no approval step
  });

  test('TC-LEAVE-043 the balance is the entitlement minus scheduled and pending days', async ({ data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 0 });
    const employee = await data.createStaff({ supervisor, leaveDays: 5 });
    const employeePage = await signIn(employee.username);
    const supervisorPage = await signIn(supervisor.username);
    const typeId = await data.leaveTypeId('QA Annual Leave');
    const approvedId = await applyLeaveAs(employeePage, { leaveTypeId: typeId, fromDate: MON, toDate: TUE });
    await applyLeaveAs(employeePage, { leaveTypeId: typeId, fromDate: THU, toDate: THU });
    const rejectedId = await applyLeaveAs(employeePage, { leaveTypeId: typeId, fromDate: WED, toDate: WED, duration: 'half_day_morning' });
    await decideLeaveAs(supervisorPage, approvedId, 'APPROVE');
    await decideLeaveAs(supervisorPage, rejectedId, 'REJECT');
    const apply = new ApplyLeavePage(employeePage);

    await apply.open();
    await apply.chooseType('QA Annual Leave');

    await expect(apply.leaveBalance).toContainText('2.00 Day(s)'); // 5 - 2 approved - 1 pending, the rejected half day is not counted
  });

  // ---- TS-LEAVE-008: role-based access ----

  test('TC-LEAVE-044 an employee without subordinates has no administration tabs', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);

    await page.goto('leave/viewLeaveModule');

    await expect(leaveTab(page, 'Apply')).toBeVisible(); // wait until the menu has loaded before checking what is missing
    for (const name of ['Leave List', 'Assign Leave', 'Configure']) {
      await expect(leaveTab(page, name)).toHaveCount(0);
    }
  });

  test('TC-LEAVE-045 an employee opening administration pages by URL is refused', async ({ data, signIn }) => {
    const employee = await data.createStaff();
    const page = await signIn(employee.username);

    for (const path of ['leave/viewLeaveList', 'leave/assignLeave', 'leave/leaveTypeList', 'leave/defineLeavePeriod']) {
      await page.goto(path);
      await expect(page.getByText('Credential Required')).toBeVisible();
    }
  });

  test('TC-LEAVE-046 a supervisor has Leave List and Assign Leave tabs', async ({ data, signIn }) => {
    const supervisor = await data.createStaff({ leaveDays: 0 });
    await data.createStaff({ supervisor, leaveDays: 0 }); // a subordinate, so the employee is a supervisor
    const page = await signIn(supervisor.username);

    await page.goto('leave/viewLeaveModule');

    for (const name of ['Apply', 'My Leave', 'Entitlements', 'Reports', 'Leave List', 'Assign Leave']) {
      await expect(leaveTab(page, name)).toBeVisible();
    }
    await expect(leaveTab(page, 'Configure')).toHaveCount(0);
  });
});
