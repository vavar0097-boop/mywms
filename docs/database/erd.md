# Entity relationship overview

This is a conceptual ERD guide, not a generated database diagram. The SQL
migrations define the authoritative columns, constraints, and relationship
details.

```text
users ──< user_roles >── roles ──< role_permissions >── permissions
  │
  ├──< audit_logs
  ├──< stock_ledgers
  ├──< stock_transfers (requested/approved/received by)
  ├──< purchase_orders (created/ordered/cancelled by)
  ├──< cashier_sessions ──< sales ──< sale_items
  └──< stocktakes

warehouses ──< locations ──< current_stocks >── items
                         ├──< stock_ledgers >── items
                         ├──< stock_transfers (source/destination)
                         ├──< purchase_orders (destination)
                         └──< stocktakes ──< stocktake_items >── items

items ──< stock_transfer_items >── stock_transfers
items ──< purchase_order_items >── purchase_orders ──< purchase_receipts
vendors ──< purchase_orders
pos_menu_items ──< pos_menu_item_bom_components >── items
sales ──< sale_items
sales ──< sale_payments
cashier_sessions ──< cashier_expenses
cashier_sessions ──< cashier_deposits
```

Key modeling notes:

- `stock_ledgers` is the durable movement record; `current_stocks` is keyed by
  `(item_id, location_id)` and is maintained by database functions.
- Transfer, purchase, and stocktake child rows use their parent identifiers;
  most are deleted with their parent only where the migration explicitly sets
  `ON DELETE CASCADE`.
- `locations` belong to a warehouse and can have a parent location.
- See `database/migrations` for exact FK rules and newer migration additions.