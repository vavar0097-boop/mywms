# Frontend architecture

## Runtime and routing

`apps/web` is a React 19, TypeScript, and Vite single-page application. The
router in `src/app/router.tsx` maps login, POS, dashboard, inventory, purchasing,
finance, master-data, settings, and system pages. Shared dashboard layout,
navigation, dialogs, tables, feedback components, and scanner support live under
`src/shared`.

Features organize page components and API services by business area. Shared
authentication state and UI state use Zustand stores. Page-level protection and
permission-aware navigation are usability controls; the API independently
enforces authorization.

## API access

The shared Axios client is in `src/shared/lib/api/client.ts`. It sends
credentials for cookie-based authentication and attempts access-token refresh
after an unauthorized response. In local development, leave
`VITE_API_BASE_URL` empty so Vite proxies `/api` to `http://127.0.0.1:3000`.
Production builds set `VITE_API_BASE_URL` to the API origin, without `/api`.

## Validation and deployment

`npm run build:web` runs the TypeScript project build and Vite production build.
Playwright end-to-end scenarios live in `automation/playwright`; see its README
for environment setup and the safeguards around mutation tests.