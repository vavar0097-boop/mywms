# WMS Playwright Automation

End-to-end automation for the deployed WMS app.

## Setup

```bash
cd automation/playwright
npm install
npm run install:browsers
cp .env.example .env
```

Fill `.env` with live QA credentials. The `.env` file is ignored by git.

## Run

```bash
npm test
```

The default run starts with the `setup` project. It logs in as admin, owner,
finance, warehouse, and cashier, writes session files into `.auth/`, then the
Firefox tests reuse those sessions.

If the shared hosting frontend is unavailable, run the suite against a local Vite
frontend connected to the production API:

```bash
npm run test:local
```

The suite is Firefox-only by default. Run headed or through the Playwright VS Code extension:

```bash
npm run test:headed
npm run test:ui
npm run test:firefox
```

Login tests:

```bash
npm run test:login
npm run test:login:headed
npm run test:login:record
```

`test:record` and `test:login:record` open Firefox headed and keep trace, screenshot, and video for the run.

Open Playwright Recorder in Firefox:

```bash
npm run codegen
npm run codegen:login
```

Finance report only:

```bash
npm run test:finance
```

Enable the Google Sheets assertion only after Railway has Google env vars:

```env
WMS_SYNC_GOOGLE=true
```

Enable create/update/delete workflow coverage only when the target environment is safe for QA mutations. The test creates a hidden POS menu, saves a BOM, verifies it in the UI, then deletes it.

```env
WMS_ALLOW_MUTATION=true
```

The default tests verify:

- admin dashboard can open
- owner dashboard can access owner actions without forbidden API calls
- finance dashboard only loads finance-authorized data
- warehouse operational routes load without permission leaks
- login form positive and negative flows pass
- cashier POS route can open in either `Open Shift` or active-cart state
- dashboard shows POS sales by outlet
- weekly movement card is gone
- finance report API returns daily sheet names
- audit log page renders the real table shell
- core admin routes do not render blank pages
- key forms and dropdowns open correctly
- UI health checks catch console errors and page overflow
- optional mutation workflow covers POS menu and BOM create/update/delete
