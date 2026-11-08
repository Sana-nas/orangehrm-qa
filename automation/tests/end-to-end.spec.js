const { test, expect: baseExpect, VALID_PASSWORD } = require('../fixtures');
const { AddEmployeePage } = require('../pages/AddEmployeePage');
const { ReportToPage } = require('../pages/ReportToPage');
const { AddEntitlementPage } = require('../pages/AddEntitlementPage');
const { ApplyLeavePage } = require('../pages/ApplyLeavePage');
const { MyLeavePage } = require('../pages/MyLeavePage');
const { LeaveListPage } = require('../pages/LeaveListPage');

// This story does many saves one after another, and on a busy server each can take a few seconds,
// so its checks wait up to 15 seconds instead of the usual 5.
const expect = baseExpect.configure({ timeout: 15_000 });

// One short story across three modules (PIM, Admin logins and Leave): an employee applies for leave and a
// supervisor approves it. Unlike the other tests it sets everything up through the screens, because
// the whole journey is what is being checked. The API is used only to remove the data afterwards.
// Each step is a "test.step" named after its test case, so the report shows which case passed.
test('TC-E2E-001 to 004: an employee applies for leave and a supervisor approves it', async ({ page, data, signIn }) => {
  test.setTimeout(90_000); // a story with three logins and many screens takes longer than the 30-second default

  const addEmployee = new AddEmployeePage(page);
  const reportTo = new ReportToPage(page);
  const addEntitlement = new AddEntitlementPage(page);

  const supervisor = { lastName: data.uniqueName('E2ESup'), username: data.uniqueName('e2esup') };
  const employee = { lastName: data.uniqueName('E2EEmp'), username: data.uniqueName('e2eemp') };
  const comment = data.uniqueName('c');

  await test.step('TC-E2E-001 set up the people, the reporting line and the leave days', async () => {
    for (const person of [supervisor, employee]) {
      data.trackUser(person.username);
      data.trackEmployeeByLastName(person.lastName); // before saving, so a half-finished run is still cleaned up
      await addEmployee.open();
      await addEmployee.fillNames({ first: 'E2E', last: person.lastName });
      // The form suggests the next free Employee Id. Tests running side by side would get the same one, so use our own.
      await addEmployee.employeeId.fill(data.uniqueEmployeeId());
      await addEmployee.createLoginSwitch.click();
      await addEmployee.username.fill(person.username);
      await addEmployee.password.fill(VALID_PASSWORD);
      await addEmployee.confirmPassword.fill(VALID_PASSWORD);
      await addEmployee.saveButton.click();
      await expect(page.getByText('Successfully Saved')).toBeVisible();
      person.empNumber = await addEmployee.empNumberFromUrl();
      data.trackEmployee(person.empNumber);
    }

    await reportTo.open(employee.empNumber);
    await reportTo.addSupervisor(supervisor.lastName, 'Direct');
    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(reportTo.row(supervisor.lastName)).toBeVisible();

    await addEntitlement.open();
    await addEntitlement.pickEmployee(employee.lastName);
    await addEntitlement.choose('Leave Type', 'QA Annual Leave');
    await addEntitlement.choose('Leave Period', '2026-01-01 - 2026-12-31');
    await addEntitlement.entitlementInput.fill('10');
    await addEntitlement.saveButton.click();
    await addEntitlement.confirmButton.click();
    await expect(page.getByText('Successfully Saved')).toBeVisible();
    await expect(page.getByText('Total 10.00 Day(s)')).toBeVisible();
  });

  const employeePage = await signIn(employee.username);
  const myLeave = new MyLeavePage(employeePage);

  await test.step('TC-E2E-002 the employee applies for two days of leave', async () => {
    const apply = new ApplyLeavePage(employeePage);
    await apply.open();
    await apply.apply({ from: '2026-12-07', to: '2026-12-08', comment });

    await expect(employeePage.getByText('Successfully Saved')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Pending Approval (2.00)');
  });

  await test.step('TC-E2E-003 the supervisor approves the request', async () => {
    const supervisorPage = await signIn(supervisor.username);
    const list = new LeaveListPage(supervisorPage);
    await list.open();
    await expect(list.row(employee.lastName)).toContainText('Pending Approval');
    await list.approveButton(employee.lastName).click();

    await expect(supervisorPage.getByText('Successfully Updated')).toBeVisible();
    await myLeave.open();
    await expect(myLeave.row(comment)).toContainText('Scheduled (2.00)');
  });

  await test.step('TC-E2E-004 the employee balance is lower by the approved days', async () => {
    const apply = new ApplyLeavePage(employeePage);
    await apply.open();
    await apply.chooseType('QA Annual Leave');

    await expect(apply.leaveBalance).toContainText('8.00 Day(s)');
  });
});
