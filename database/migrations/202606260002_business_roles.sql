INSERT INTO public.roles (name, description)
VALUES
  ('OWNER', 'Business owner with full system access'),
  ('FINANCE', 'Finance, cashier settlement, and reports'),
  ('WAREHOUSE', 'Warehouse stock and transfer operations'),
  ('CASHIER', 'POS cashier access')
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description;
