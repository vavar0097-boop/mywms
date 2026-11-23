# Database architecture

## Source of truth

`database/migrations` is the canonical, ordered migration history used by the
repository's migration scripts. `supabase/migrations` contains a linked remote
schema snapshot; do not treat it as a replacement for the canonical migration
sequence. Review schema changes against both the migration scripts and the
deployed Supabase database.

## Main data areas

- Identity and authorization: `users`, `roles`, `permissions`, and their
  many-to-many link tables.
- Product and storage: `items`, `units`, `unit_conversions`, `warehouses`, and
  hierarchical `locations`.
- Inventory: append-only `stock_ledgers` are the movement history;
  `current_stocks` is the indexed quantity snapshot. Stock-changing functions
  update these within a database transaction.
- Transfers: transfer headers, line items, and events record movement between
  locations.
- Procurement: vendors, purchase orders, order items, receipts, and events;
  receive operations update stock through database functions.
- POS and cash: menu items and BOM components, cashier sessions, sales, sale
  items/payments, expenses, and deposits.
- Finance and operations: finance transactions, daily purchase batches/items,
  stocktakes/items, audit logs, API logs, and system settings.

See [the ERD overview](../database/erd.md) for principal relationships and
[migration history](../database/migration-history.md) for the schema timeline.

## Runtime access and migrations

The API accesses runtime data using the Supabase service-role key. Treat that
key as privileged server-only configuration. Migration scripts connect to
PostgreSQL using `DATABASE_URL` or the supported Supabase database-password
configuration. Review migrations before applying them; use `db:baseline` only
to mark an already-initialized database and `db:migrate` for subsequent changes.

Database RPCs that change stock are core invariants: avoid bypassing them with
direct edits to `current_stocks` or `stock_ledgers`.