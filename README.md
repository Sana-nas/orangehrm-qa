# OrangeHRM QA Portfolio

Manual and automated testing of OrangeHRM Starter 5.9 (Login, Admin, PIM, Leave).

## Automation setup

Requires Node.js 22+ and a running local OrangeHRM.

```
cd automation
npm install
npx playwright install chromium
copy .env.example .env     # then fill in the values
npx playwright test
npx playwright show-report
```

## Project layout

- `manual-testing/` - test scenarios and test cases per module (CSV, opens in Excel)
- `automation/pages/` - page objects: one file per screen, holding selectors and actions
- `automation/tests/` - test specs; each title starts with its test case ID

Manual and automated status are tracked separately in the test case files.
