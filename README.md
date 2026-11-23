## Enterprise WMS

### Repository Structure

```text
apps/
  api/                 Express API, database scripts, and backend modules
  web/                 Vite React dashboard and POS frontend
database/
  migrations/          Canonical SQL migrations
  seeds/               Seed data placeholders
docs/                  Architecture, API, and database notes
scripts/               Root-level automation helpers
supabase/              Supabase CLI state, migrations, and snippets
```

Generated files such as `dist/`, `build/`, `coverage/`, `logs/`, and
`node_modules/` are intentionally ignored. Source changes should live under
`apps/`, `database/`, `docs/`, or `scripts/`.

### Checks

The GitHub Actions workflow runs the API build and independent API unit tests,
then type-checks and builds the web app. Run the same checks locally with:

```bash
npm run test:api
npm run build:web
```

The API tests are independent; none relies on another test's state or order.

### End-to-end testing

Playwright runs public smoke tests when role credentials are absent; with
credentials configured it also runs authenticated scenarios. For local
end-to-end testing, use `npm run test:local` from `automation/playwright`; with
no API override, the browser app and API checks target localhost, but the local
API still uses the Supabase credentials in its `.env`. This deployment has one
production environment: use Playwright only for non-mutating checks and keep
`WMS_ALLOW_MUTATION=false`. The runner rejects the known production origins if
mutation testing is enabled.

### Local Access

Run the local API and web app:

```bash
npm run dev:api
npm run dev:web
```

Then open:

| Page | Local link |
| --- | --- |
| Login | http://localhost:5173/login |
| POS | http://localhost:5173/pos |
| Dashboard | http://localhost:5173/dashboard |
| Transfers | http://localhost:5173/dashboard/transfers |
| New Transfer | http://localhost:5173/dashboard/transfers/new |
| Stock | http://localhost:5173/dashboard/stock |
| Finance | http://localhost:5173/dashboard/finance |
| Items | http://localhost:5173/dashboard/items |
| Warehouses | http://localhost:5173/dashboard/warehouses |
| Locations | http://localhost:5173/dashboard/locations |
| Users | http://localhost:5173/dashboard/users |
| Global Settings | http://localhost:5173/dashboard/settings |
| Audit Logs | http://localhost:5173/dashboard/audit-logs |

Login credentials are intentionally not stored in this README. Use the current
local admin credentials from your secure note or password manager. To create or
rotate a local admin account, run:

```bash
ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> npm run create-admin
```

If Vite starts on another port, use the port shown in the `npm run dev:web`
terminal output.

### Production API Deployment

The web app is a static Vite build on Cloudflare Pages. The Express app in
`apps/api` is exposed as a Vercel serverless API; Supabase is its data backend.
The frontend defaults to `https://mywms-six.vercel.app` for its API origin.
Cloudflare Pages may override this with `VITE_API_BASE_URL` (origin only, no
`/api`). Do not set it to the Supabase URL. API requests go to the Vercel API
host rather than falling through to Cloudflare Pages' static SPA routes.

Vercel must also define `CLIENT_ORIGIN`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` for
the API function. Set `CLIENT_ORIGIN` to the Pages URL. Keep all secret values
in the provider's environment settings, not in Git.

For this repository's Vercel API deployment, set the Vercel project root to
`apps/api` and use the Express framework preset. The Express app is exported
from `apps/api/src/app.ts` and Vercel should serve it as one function so Express
can route both one-segment and nested paths. The API build command is
`npm run build:api`. The web app is deployed separately on Cloudflare Pages;
do not use a repository-root Vercel SPA deployment for the API project. The
project must have a successful deployment assigned to `mywms-six.vercel.app`; a
`DEPLOYMENT_NOT_FOUND` response means the hostname has no active deployment and
cannot be fixed by changing environment variables alone.

Before testing login, verify `GET <API origin>/api/health` returns HTTP 200 and
an `OPTIONS <API origin>/api/auth/login` preflight from the deployed frontend
returns HTTP 204 with the matching `Access-Control-Allow-Origin`. Then verify
`POST <API origin>/api/auth/login` reaches the Express login route. Configure
the API's `CLIENT_ORIGIN` to the deployed frontend origin(s), including
`https://mywms-686.pages.dev`.

### Database Binding

The app uses Supabase for runtime data access through `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`.

Copy `.env.example` or `apps/api/.env.example` to your local `.env` file, then
fill the runtime secrets. For database migrations from this repo, add one of
these to `.env` or `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
```

or, because this repo already has `supabase/.temp/pooler-url`:

```env
SUPABASE_DB_PASSWORD=your-database-password
```

Then run:

```bash
npm run db:status
npm run db:baseline
npm run db:migrate
npm run create-admin
```

Use `db:baseline` once for an existing Supabase database that already has the
tables from `database/migrations`. Use `db:migrate` for new migration files
after that.

See [backend architecture](docs/architecture/backend.md),
[frontend architecture](docs/architecture/frontend.md),
[database architecture](docs/architecture/database.md), the
[ERD overview](docs/database/erd.md), and the
[migration history](docs/database/migration-history.md) for implementation
details. The OpenAPI document describes the core API contract; update it when
routes or payloads change.
