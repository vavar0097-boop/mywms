# Migration history

Apply the canonical migrations in filename order using the repository database
scripts. The first numbered series establishes the original WMS schema; later
timestamped migrations extend it.

| Migration(s) | Scope |
| --- | --- |
| `001`–`002` | PostgreSQL extensions; users, roles, and permissions |
| `003`–`007` | Warehouses, locations, units, items, and unit conversions |
| `008`–`009` | Stock ledgers/snapshots and stock transfers |
| `010`–`011` | Audit/API logs and system settings |
| `012`–`014` | Stock/item functions, triggers, and indexes |
| `015` | Initial roles, units, warehouses, and settings |
| `016` | Finance transactions and POS menu configuration |
| `202606250001` | POS sales, cashier sessions, payments, expenses, and deposits |
| `202606260001`–`202606260003` | POS stock references, business roles, and daily purchases |
| `202606270002` | POS menu bill-of-materials components |
| `202607050001`–`202607050002` | One open cashier session per outlet; vendors and purchase orders |
| `202607310001` | Atomic purchase-order received-quantity update |
| `202610250001` | Scrub deleted-user credentials |
| `202610260001` | Stocktakes and daily-purchase submitter tracking |

Use `npm run db:status` to inspect migration state. For an existing database
that already contains the baseline schema, use `npm run db:baseline` once; for
later migrations use `npm run db:migrate`. Review the SQL and target environment
before applying changes. A linked Supabase schema snapshot also exists under
`supabase/migrations`; `database/migrations` remains the repository's canonical
migration sequence.