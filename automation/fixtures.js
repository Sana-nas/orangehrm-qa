// Shared test setup. A "fixture" is something Playwright prepares before a test and cleans up after it,
// even when the test fails. Here it gives every test its own uniquely named employees and users.
const base = require('@playwright/test');

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

    const data = {
      uniqueName(prefix) {
        return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      },

      async createEmployee() {
        const lastName = this.uniqueName('Auto');
        const employee = await send(
          await request.post(`${API}pim/employees`, {
            data: { firstName: 'QA', middleName: '', lastName, empPicture: null, employeeId: '' },
          }),
          'Create employee'
        );
        employeeIds.push(employee.empNumber);
        return { empNumber: employee.empNumber, firstName: 'QA', lastName };
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
    // Teardown must not hide a test result, so failures here are ignored (e.g. already deleted by the test).
    if (userIds.length) await request.delete(`${API}admin/users`, { data: { ids: userIds } });
    if (employeeIds.length) await request.delete(`${API}pim/employees`, { data: { ids: employeeIds } });
  },

  // A browser page with nobody logged in, for tests that log in as a different user.
  loggedOutPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    await use(await context.newPage());
    await context.close();
  },
});

module.exports = { test, expect: base.expect, VALID_PASSWORD };
