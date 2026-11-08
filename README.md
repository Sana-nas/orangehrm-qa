# OrangeHRM QA Portfolio

Manual and automated testing of OrangeHRM Starter 5.9 (Login, Admin, PIM, Leave).

## Automation setup

Requires Node.js 22+ and a running local OrangeHRM.

```
cd automation
npm install
npx playwright install chromium
copy .env.example .env     # then fill in the values
npx playwright test                      # everything
npx playwright test --project=chromium    # Login tests only
npx playwright test --project=admin       # Admin tests only (they create and remove their own data)
npx playwright test --project=pim         # PIM tests only (same)
npx playwright test --project=leave       # Leave tests only (they need the Leave baseline, see below)
npx playwright test --project=end-to-end  # the short end-to-end story: employee applies, supervisor approves
npx playwright show-report
```

## Project layout

- `manual-testing/OrangeHRM-TestCases.xlsx` - test scenarios, plus one sheet of test cases and results per module
- `automation/pages/` - page objects: one file per screen, holding selectors and actions
- `automation/tests/` - test specs; each title starts with its test case ID

Manual results are in the Result column. Automation status and the source of each expected result are in the Comments column.

## Leave test prerequisites

The Leave tests need a one-time setup in the application: a leave period (January 1 to December 31) and two leave types named `QA Annual Leave` and `QA Sick Leave`, plus a holiday named `QA Holiday` on 2026-12-25. Every test creates its own employees and entitlements, and removes them afterwards.

## Running notes

Tests run three at a time (`workers: 3` in `automation/playwright.config.js`). The local OrangeHRM on a laptop slows down under more load, and the busiest tests then time out. Whatever a test creates is removed afterwards, even when the test fails.
