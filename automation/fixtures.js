// Shared test setup. A "fixture" is something Playwright prepares before a test and cleans up after it,
// even when the test fails. Here it gives every test its own uniquely named employees and users.
const base = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');

const API = 'api/v2/';
const VALID_PASSWORD = 'Qa#Test2026'; // meets the password rules: 8+ characters, upper, lower, number, symbol
const ROLE_IDS = { Admin: 1, ESS: 2 }; // ids as returned by the application's own API

async function send(response, what) {
  if (!response.ok()) {
    throw new Error(`${what} failed: ${response.status()} ${await response.text()}`);
  }
  return (await response.json()).data;
}

const test = base.test.extend({
  // Creates data through OrangeHRM's web API, which is much faster than clicking through the forms.
  // The tests themselves still exercise the screens; the API is only used for setup and cleanup.
  data: async ({ page }, use) => {
    const request = page.request; // shares the logged-in session of the test page
    const employeeIds = [];
    const userIds = [];
    const usernamesCreatedInUi = [];
    const leaveTypeNames = [];
    const holidayDates = [];

    const data = {
      uniqueName(prefix) {
        return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      },

      // 8 digits, so it fits the 10-character Employee Id limit and stays unique between runs.
      uniqueEmployeeId() {
        return String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 90) + 10);
      },

      async createEmployee({ employeeId = '' } = {}) {
        const lastName = this.uniqueName('Auto');
        const employee = await send(
          await request.post(`${API}pim/employees`, {
            data: { firstName: 'QA', middleName: '', lastName, empPicture: null, employeeId },
          }),
          'Create employee'
        );
        employeeIds.push(employee.empNumber);
        return { empNumber: employee.empNumber, firstName: 'QA', lastName, employeeId };
      },

      // For employees a test creates through the screen: remember the number so cleanup can remove it.
      trackEmployee(empNumber) {
        employeeIds.push(empNumber);
      },

      // Makes `supervisor` the direct supervisor of `subordinate` (a reporting line). The API calls
      // the supervisor's number "empNumber". Removing either employee later removes the line.
      async setSupervisor(subordinate, supervisor) {
        await send(
          await request.post(`${API}pim/employees/${subordinate.empNumber}/supervisors`, {
            data: { empNumber: supervisor.empNumber, reportingMethodId: 1 }, // 1 = Direct, 2 = Indirect
          }),
          'Set supervisor'
        );
      },

      async createUser({ empNumber, role = 'ESS', enabled = true, username = this.uniqueName('qa') }) {
        const user = await send(
          await request.post(`${API}admin/users`, {
            data: { username, password: VALID_PASSWORD, status: enabled, userRoleId: ROLE_IDS[role], empNumber },
          }),
          'Create user'
        );
        userIds.push(user.id);
        return { id: user.id, username };
      },

      // For users a test creates through the screen: remember the username so cleanup can remove it.
      trackUser(username) {
        usernamesCreatedInUi.push(username);
      },

      // ---- Leave ----
      // The Leave tests share the two leave types from the Leave baseline (QA Annual Leave and QA Sick Leave)
      // and its QA Holiday on 2026-12-25. They only read those. Every test still gets its own employees
      // and entitlements, so balances never mix between tests.
      async leaveTypeId(name) {
        const types = await send(await request.get(`${API}leave/leave-types`), 'List leave types');
        const found = types.find((type) => type.name === name);
        if (!found) {
          throw new Error(`Leave type "${name}" not found. The Leave tests need the Leave baseline (see project notes).`);
        }
        return found.id;
      },

      // An entitlement for the 2026 leave period, which all the test dates fall into.
      async createEntitlement(employee, leaveTypeName, days) {
        await send(
          await request.post(`${API}leave/leave-entitlements`, {
            data: {
              empNumber: employee.empNumber,
              leaveTypeId: await this.leaveTypeId(leaveTypeName),
              fromDate: '2026-01-01',
              toDate: '2026-12-31',
              entitlement: days,
            },
          }),
          'Create entitlement'
        );
      },

      // An employee with a login, and (optionally) QA Annual Leave days and a supervisor.
      async createStaff({ leaveDays = 10, supervisor } = {}) {
        const employee = await this.createEmployee();
        const user = await this.createUser({ empNumber: employee.empNumber });
        if (leaveDays) await this.createEntitlement(employee, 'QA Annual Leave', leaveDays);
        if (supervisor) await this.setSupervisor(employee, supervisor);
        return { ...employee, username: user.username };
      },

      // For a leave type or holiday a test creates through the screen: cleanup removes it afterwards.
      trackLeaveType(name) {
        leaveTypeNames.push(name);
      },

      trackHolidayDate(date) {
        holidayDates.push(date);
      },

      // A date in 2026 that is not used by any other test, for tests that add a holiday.
      uniqueHolidayDate() {
        const date = new Date(Date.UTC(2026, 0, 1 + (Date.now() % 300)));
        return date.toISOString().slice(0, 10);
      },
    };

    await use(data);

    // Cleanup. Users are removed by exact username or id, never by position in a list,
    // because the database is shared with manual testing.
    for (const username of usernamesCreatedInUi) {
      const found = await request.get(`${API}admin/users?limit=50&offset=0&username=${encodeURIComponent(username)}`);
      if (found.ok()) {
        for (const user of (await found.json()).data) {
          if (user.userName === username) userIds.push(user.id);
        }
      }
    }
    for (const name of leaveTypeNames) {
      const types = await request.get(`${API}leave/leave-types`);
      if (types.ok()) {
        const ids = (await types.json()).data.filter((type) => type.name === name).map((type) => type.id);
        if (ids.length) await request.delete(`${API}leave/leave-types`, { data: { ids } });
      }
    }
    for (const date of holidayDates) {
      const holidays = await request.get(`${API}leave/holidays?fromDate=${date}&toDate=${date}`);
      if (holidays.ok()) {
        const ids = (await holidays.json()).data.map((holiday) => holiday.id);
        if (ids.length) await request.delete(`${API}leave/holidays`, { data: { ids } });
      }
    }
    // Teardown must not hide a test result, so failures here are ignored (e.g. already deleted by the test).
    if (userIds.length) await request.delete(`${API}admin/users`, { data: { ids: userIds } });
    // Deleting an employee also removes their entitlements and leave requests.
    if (employeeIds.length) await request.delete(`${API}pim/employees`, { data: { ids: employeeIds } });
  },

  // A browser page with nobody logged in, for tests that log in as a different user.
  loggedOutPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    await use(await context.newPage());
    await context.close();
  },

  // Gives the test a function that opens a new, separate browser session logged in as the given user.
  // Needed when one test involves several people at once, such as an employee and a supervisor.
  signIn: async ({ browser, baseURL }, use) => {
    const contexts = [];
    await use(async (username, password = VALID_PASSWORD) => {
      const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
      contexts.push(context);
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.open();
      await loginPage.login(username, password);
      await page.waitForURL(/\/dashboard\/index$/);
      return page;
    });
    for (const context of contexts) await context.close();
  },
});

module.exports = { test, expect: base.expect, VALID_PASSWORD };
