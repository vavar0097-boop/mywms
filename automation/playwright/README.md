# WMS Playwright Automation

End-to-end automation for the deployed WMS app.

## Setup

```bash
cd automation/playwright
npm install
npm run install:browsers
cp .env.example .env
```

If you need authenticated checks, fill `.env` with production credentials and
use them only for non-mutating tests. The `.env` file is ignored by git.

## Run

```bash
npm test
```

Without credentials, the default run executes public smoke checks for the login
page and API health/CORS. Run these checks directly with:

```bash
npm run test:smoke
```

To enable authenticated tests, fill all six role credentials in `.env`. The
`setup` project logs in as admin, owner, finance, warehouse, supervisor, and cashier, writes
session files into `.auth/`, and then the Firefox tests reuse those sessions.
Run the complete configured suite with:

```bash
npm run test:full
```

If the shared hosting frontend is unavailable, run against a local Vite frontend
and local API. The Vite proxy and API health checks use localhost by default.
The local API still uses whichever Supabase credentials are configured in its
`.env`, so this does not create an isolated database:

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

Enable the Google Sheets assertion only after the production API has Google env vars:

```env
WMS_SYNC_GOOGLE=true
```

Mutation workflows change persistent data and are not safe for this
production-only setup. Keep `WMS_ALLOW_MUTATION=false`; the runner rejects the
known production app and API origins if mutation coverage is enabled.

The public smoke checks verify:

- login form controls and invalid-login handling
- API health endpoint and login CORS preflight

When role credentials are configured, the authenticated tests verify:

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
- write workflows are skipped unless mutation testing is explicitly enabled
