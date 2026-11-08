# OrangeHRM QA Portfolio

Manual and automated testing of **OrangeHRM Starter 5.9**, covering Login, Admin user management, PIM, Leave and an end-to-end leave workflow. The project has two connected deliverables: an Excel workbook with test scenarios, test cases and results, and a Playwright test suite that automates the suitable cases. Both use the same test case IDs.

## Results at a glance

| Module | Test cases | Pass | Fail | Observation | Automated |
|---|---|---|---|---|---|
| Login | 17 | 16 | 0 | 1 | 15 |
| Admin: user management | 34 | 32 | 0 | 2 | 32 |
| PIM | 39 | 35 | 1 | 3 | 36 |
| Leave | 46 | 45 | 0 | 1 | 45 |
| End-to-end workflow | 4 | 4 | 0 | 0 | 4 (one test, one step per case) |
| **Total** | **140** | **132** | **1** | **7** | **129 tests** |

- **Defect found:** BUG-001. The Personal Details page accepts and saves a Date of Birth in the future. The report is in the `Bug Reports` sheet of the workbook, with screenshots in `manual-testing/evidence/BUG-001/`. The matching automated test (TC-PIM-027) is marked as an expected failure until the bug is fixed.
- **Observations:** a case is recorded as an observation when no documented expected result exists, so it is not judged as pass or fail. One example is whether the username search in Admin matches part of a name.
- **Automated runs:** the full suite (130 tests, including a one-time login setup) passed in two consecutive runs of about 6 minutes each, and the database was identical before and after.
- Manual and automated status are recorded separately. An automated pass is not counted as a manual pass.

## Scope

| Area | Focus |
|---|---|
| Login | Authentication, negative cases, validation, session handling |
| Admin: user management | Add, edit, delete, search, validation, role-based access |
| PIM | Employee forms, validation and boundaries, reporting lines, delete |
| Leave | Leave setup, working-day and balance rules, approval workflow, role behavior |
| End-to-end | An employee applies for leave and a supervisor approves it |

Out of scope: other modules, performance and security testing, and the mobile app.

## The test case workbook

`manual-testing/OrangeHRM-TestCases.xlsx` has one sheet per module (`Login`, `Admin`, `PIM`, `Leave`, `End-to-End`), a `Test Scenarios` sheet, a `Bug Reports` sheet and a `Version History` sheet.

- Each case has an ID (`TC-LEAVE-036`), its scenario (`TS-LEAVE-006`), preconditions, steps, test data, expected result, actual result, priority (P0 to P3) and result.
- The `Comments` column records the **source of the expected result** (on-screen text, help portal, HR logic or a labelled assumption), the automation status and the manual run date.
- Results are PASS, FAIL, Blocked, Not Tested or Observation.

## Tools

- **Playwright** with plain JavaScript (Node.js 22) and its built-in HTML report.
- **dotenv** for the application URL and the admin credentials, which are read from a private `.env` file.
- No TypeScript, Cucumber or third-party reporting tools.

## Project layout

```
manual-testing/
  OrangeHRM-TestCases.xlsx      scenarios, test cases, results and bug reports
  evidence/BUG-001/             screenshots for the bug report
automation/
  playwright.config.js          projects, saved admin session, 3 workers
  fixtures.js                   test data setup and cleanup, sign-in as other users
  helpers/leaveApi.js           applying and approving leave through each person's session
  pages/                        page objects: one file per screen
  tests/                        specs; every test title starts with its test case ID
```

## How to run

Requires Node.js 22 or later and a running local OrangeHRM.

```
cd automation
npm install
npx playwright install chromium
copy .env.example .env        # then fill in BASE_URL, ADMIN_USERNAME and ADMIN_PASSWORD
npx playwright test                       # everything
npx playwright test --project=chromium    # Login tests only
npx playwright test --project=admin       # Admin tests
npx playwright test --project=pim         # PIM tests
npx playwright test --project=leave       # Leave tests (need the Leave prerequisites below)
npx playwright test --project=end-to-end  # the end-to-end story
npx playwright show-report
```

If the admin password contains a `#`, put the value in quotes in `.env`.

**Leave prerequisites.** The Leave tests need a one-time setup in the application: a leave period from January 1 to December 31, two leave types named `QA Annual Leave` and `QA Sick Leave`, and a holiday named `QA Holiday` on 2026-12-25. The tests use dates in December 2026. Each test creates its own employees and entitlements and removes them afterwards.

## Design decisions

- **Simple page objects**, one per screen, holding selectors and actions. Assertions stay in the tests.
- **User-facing locators** (role, label, text) wherever the application offers them. CSS is used only where it does not, with a comment saying why.
- **No fixed sleeps.** Tests rely on Playwright's auto-waiting and web-first assertions, and each page object waits for its page to finish loading before the test acts.
- **Independent tests.** Each test creates uniquely named data and can run alone and in any order.
- **API for setup, screens for testing.** Employees, users, entitlements and leave requests used as test setup are created through the application's own web API, which is much faster than clicking through forms. The behavior being tested always goes through the real screens.
- **Safe cleanup.** Everything a test creates is removed by exact id or exact name, never by position in a list, and cleanup still runs when a test fails. This matters because manual and automated testing share one database.
- **Several people in one test.** A fixture opens a separate logged-in session for each person, for example an employee and a supervisor.
- **Known defects.** A test for a confirmed bug is written with the correct expected behavior and marked as an expected failure, so the report shows it and the run starts failing as soon as the bug is fixed.
- **Three tests at a time.** The local application runs on a laptop and slows down under heavier load, which makes the busiest tests time out.

## Limitations

- The suite runs against a local OrangeHRM installation. GitHub cannot reach it, so continuous integration is not set up. It would require starting OrangeHRM in Docker.
- Test dates are in December 2026, and the Leave tests depend on the one-time Leave setup.
- Manual testing and automation share one database, so they should not be run at the same time.
- Observation cases stay open until a documented expected result exists.

## Author

Sana Anas
