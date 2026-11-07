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
npx playwright show-report
```

## Project layout

- `manual-testing/OrangeHRM-TestCases.xlsx` - test scenarios, plus one sheet of test cases and results per module
- `automation/pages/` - page objects: one file per screen, holding selectors and actions
- `automation/tests/` - test specs; each title starts with its test case ID

Manual results are in the Result column. Automation status and the source of each expected result are in the Comments column.


