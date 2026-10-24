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
packages/
  shared-types/        Cross-app TypeScript types
  shared-utils/        Cross-app utility helpers
scripts/               Root-level automation helpers
supabase/              Supabase CLI state, migrations, and snippets
```

Generated files such as `dist/`, `build/`, `coverage/`, `logs/`, and
`node_modules/` are intentionally ignored. Source changes should live under
`apps/`, `packages/`, `database/`, `docs/`, or `scripts/`.

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
