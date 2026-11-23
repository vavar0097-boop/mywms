# Backend architecture

## Runtime

`apps/api` is a TypeScript Express 5 API. `src/server.ts` starts the local
listener; `src/app.ts` exports the Express application for Vercel. Routes are
mounted under `/api`, with `/health` and `/api/health` available as health
checks. The runtime uses Supabase/PostgREST through the service-role client.
Database migration scripts use a direct PostgreSQL connection.

## Request path

Requests pass through CORS, Helmet, compression, cookies, JSON parsing, the
origin check for state-changing requests, request logging, and audit middleware.
Route handlers apply authentication and role-permission middleware before
controllers invoke services and repositories. The shared error middleware is
registered after all routes and formats thrown application errors.

Authentication uses `access_token` and `refresh_token` HTTP-only cookies.
Authorization is enforced by permissions in `src/config/permissions.ts`; a
frontend route guard is not a substitute for API authorization.

## Modules

The API modules cover authentication and users; items, units, warehouses, and
locations; stock, stocktakes, and transfers; purchase orders and vendors; POS
sales and cashier sessions; finance and global reports; settings; and audit
logs. Each module generally groups routes, controllers, services, repositories,
validators, and DTOs according to its needs.

## Configuration and checks

Copy `.env.example` or `apps/api/.env.example` for local setup. Keep service-role
keys, JWT secrets, database passwords, and integration credentials outside Git.
See the root README for deployment configuration and database migration commands.

Run `npm run test:api` for the API build and independent permission tests. CI
also builds the web app. API integration tests against a disposable database are
not yet part of CI.