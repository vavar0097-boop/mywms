CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS locations_level_check;

ALTER TABLE public.locations
ADD CONSTRAINT locations_level_check
CHECK (level IN ('ZONE', 'AISLE', 'RACK', 'BIN', 'OUTLET'));

CREATE TABLE IF NOT EXISTS public.cashier_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_no TEXT NOT NULL UNIQUE DEFAULT (
    'CS-' ||
    TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6))
  ),

  cashier_id UUID NOT NULL REFERENCES public.users(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),

  shift_name TEXT NOT NULL,

  opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),

  expected_cash NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (expected_cash >= 0),
  actual_cash NUMERIC(14, 2) NULL CHECK (actual_cash >= 0),

  cash_difference NUMERIC(14, 2)
    GENERATED ALWAYS AS (
      CASE
        WHEN actual_cash IS NULL THEN NULL
        ELSE actual_cash - expected_cash
      END
    ) STORED,

  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),

  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL,

  notes TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashier_sessions_one_open_per_cashier
ON public.cashier_sessions(cashier_id)
WHERE status = 'OPEN';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashier_sessions_one_open_per_location
ON public.cashier_sessions(location_id)
WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_cashier_sessions_cashier_id
ON public.cashier_sessions(cashier_id);

CREATE INDEX IF NOT EXISTS idx_cashier_sessions_location_id
ON public.cashier_sessions(location_id);

CREATE INDEX IF NOT EXISTS idx_cashier_sessions_status
ON public.cashier_sessions(status);

DROP TRIGGER IF EXISTS trg_cashier_sessions_touch_updated_at
ON public.cashier_sessions;

CREATE TRIGGER trg_cashier_sessions_touch_updated_at
BEFORE UPDATE ON public.cashier_sessions
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_closed_cashier_session_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Cashier session already closed';
  END IF;

  IF NEW.status = 'CLOSED' THEN
    IF NEW.actual_cash IS NULL THEN
      RAISE EXCEPTION 'Actual cash is required to close shift';
    END IF;

    IF NEW.expected_cash IS NULL THEN
      RAISE EXCEPTION 'Expected cash is required to close shift';
    END IF;

    IF NEW.closed_at IS NULL THEN
      NEW.closed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_closed_cashier_session_update
ON public.cashier_sessions;

CREATE TRIGGER trg_prevent_closed_cashier_session_update
BEFORE UPDATE ON public.cashier_sessions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_cashier_session_update();

CREATE TABLE IF NOT EXISTS public.cashier_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  expense_no TEXT NOT NULL UNIQUE DEFAULT (
    'EXP-' ||
    TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6))
  ),

  cashier_session_id UUID NOT NULL REFERENCES public.cashier_sessions(id),
  cashier_id UUID NOT NULL REFERENCES public.users(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),

  expense_category TEXT NOT NULL DEFAULT 'OPERATIONAL',
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  photo_url TEXT NULL,

  status TEXT NOT NULL DEFAULT 'POSTED'
    CHECK (status IN ('POSTED', 'CANCELLED')),

  cancelled_at TIMESTAMPTZ NULL,
  cancelled_reason TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashier_expenses_session_id
ON public.cashier_expenses(cashier_session_id);

CREATE INDEX IF NOT EXISTS idx_cashier_expenses_cashier_id
ON public.cashier_expenses(cashier_id);

CREATE INDEX IF NOT EXISTS idx_cashier_expenses_location_id
ON public.cashier_expenses(location_id);

DROP TRIGGER IF EXISTS trg_cashier_expenses_touch_updated_at
ON public.cashier_expenses;

CREATE TRIGGER trg_cashier_expenses_touch_updated_at
BEFORE UPDATE ON public.cashier_expenses
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.cashier_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  deposit_no TEXT NOT NULL UNIQUE DEFAULT (
    'DEP-' ||
    TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6))
  ),

  cashier_session_id UUID NOT NULL REFERENCES public.cashier_sessions(id),
  cashier_id UUID NOT NULL REFERENCES public.users(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),

  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  received_by TEXT NOT NULL,
  photo_url TEXT NULL,
  notes TEXT NULL,

  status TEXT NOT NULL DEFAULT 'POSTED'
    CHECK (status IN ('POSTED', 'CANCELLED')),

  cancelled_at TIMESTAMPTZ NULL,
  cancelled_reason TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashier_deposits_session_id
ON public.cashier_deposits(cashier_session_id);

CREATE INDEX IF NOT EXISTS idx_cashier_deposits_cashier_id
ON public.cashier_deposits(cashier_id);

CREATE INDEX IF NOT EXISTS idx_cashier_deposits_location_id
ON public.cashier_deposits(location_id);

DROP TRIGGER IF EXISTS trg_cashier_deposits_touch_updated_at
ON public.cashier_deposits;

CREATE TRIGGER trg_cashier_deposits_touch_updated_at
BEFORE UPDATE ON public.cashier_deposits
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sale_no TEXT NOT NULL UNIQUE DEFAULT (
    'SALE-' ||
    TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6))
  ),

  cashier_session_id UUID NOT NULL REFERENCES public.cashier_sessions(id),
  cashier_id UUID NOT NULL REFERENCES public.users(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),

  status TEXT NOT NULL DEFAULT 'PAID'
    CHECK (status IN ('PAID', 'VOIDED')),

  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),

  payment_status TEXT NOT NULL DEFAULT 'PAID'
    CHECK (payment_status IN ('PAID', 'REFUNDED')),

  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  voided_at TIMESTAMPTZ NULL,
  void_reason TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_cashier_session_id
ON public.sales(cashier_session_id);

CREATE INDEX IF NOT EXISTS idx_sales_cashier_id
ON public.sales(cashier_id);

CREATE INDEX IF NOT EXISTS idx_sales_location_id
ON public.sales(location_id);

CREATE INDEX IF NOT EXISTS idx_sales_status
ON public.sales(status);

DROP TRIGGER IF EXISTS trg_sales_touch_updated_at
ON public.sales;

CREATE TRIGGER trg_sales_touch_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.stock_ledgers
DROP CONSTRAINT IF EXISTS stock_ledgers_reference_type_check;

ALTER TABLE public.stock_ledgers
ADD CONSTRAINT stock_ledgers_reference_type_check
CHECK (
  reference_type IN (
    'INITIAL_STOCK',
    'TRANSFER',
    'ADJUSTMENT',
    'MANUAL',
    'SALE'
  )
);

CREATE OR REPLACE FUNCTION public.create_stock_movement(
  p_item_id UUID,
  p_location_id UUID,
  p_movement_type VARCHAR,
  p_quantity NUMERIC,
  p_reference_type VARCHAR,
  p_reference_id UUID,
  p_reference_no VARCHAR,
  p_remarks TEXT,
  p_created_by UUID,
  p_stock_effect VARCHAR DEFAULT 'PLUS'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock NUMERIC(18,4);
  v_delta NUMERIC(18,4);
  v_ledger_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF p_reference_type NOT IN (
    'INITIAL_STOCK',
    'TRANSFER',
    'ADJUSTMENT',
    'MANUAL',
    'SALE'
  ) THEN
    RAISE EXCEPTION 'Invalid reference type';
  END IF;

  SELECT quantity
  INTO v_stock
  FROM public.current_stocks
  WHERE item_id = p_item_id
    AND location_id = p_location_id
  FOR UPDATE;

  v_stock := COALESCE(v_stock, 0);

  IF p_movement_type = 'IN' THEN
    v_delta := p_quantity;
  ELSIF p_movement_type = 'OUT' THEN
    IF v_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;

    v_delta := -p_quantity;
  ELSIF p_movement_type = 'ADJ' THEN
    IF p_stock_effect = 'PLUS' THEN
      v_delta := p_quantity;
    ELSIF p_stock_effect = 'MINUS' THEN
      IF v_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock';
      END IF;

      v_delta := -p_quantity;
    ELSE
      RAISE EXCEPTION 'Invalid stock effect';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid movement type';
  END IF;

  INSERT INTO public.stock_ledgers (
    item_id,
    location_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reference_no,
    remarks,
    created_by
  )
  VALUES (
    p_item_id,
    p_location_id,
    p_movement_type,
    p_quantity,
    p_reference_type,
    p_reference_id,
    p_reference_no,
    p_remarks,
    p_created_by
  )
  RETURNING id
  INTO v_ledger_id;

  PERFORM public.upsert_current_stock(
    p_item_id,
    p_location_id,
    v_delta
  );

  RETURN v_ledger_id;
END;
$$;

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sale_id UUID NOT NULL REFERENCES public.sales(id),
  item_id UUID NOT NULL REFERENCES public.items(id),

  item_code_snapshot TEXT NOT NULL,
  item_name_snapshot TEXT NOT NULL,
  unit_name_snapshot TEXT NULL,

  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(14, 2) NOT NULL CHECK (subtotal >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
ON public.sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_item_id
ON public.sale_items(item_id);

CREATE TABLE IF NOT EXISTS public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sale_id UUID NOT NULL REFERENCES public.sales(id),

  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'NONCASH')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  reference_no TEXT NULL,

  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id
ON public.sale_payments(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_payments_payment_method
ON public.sale_payments(payment_method);

CREATE OR REPLACE FUNCTION public.ensure_cashier_session_open()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
  v_location_id UUID;
  v_cashier_id UUID;
BEGIN
  SELECT
    status,
    location_id,
    cashier_id
  INTO
    v_status,
    v_location_id,
    v_cashier_id
  FROM public.cashier_sessions
  WHERE id = NEW.cashier_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cashier session not found';
  END IF;

  IF v_status <> 'OPEN' THEN
    RAISE EXCEPTION 'Cashier session already closed';
  END IF;

  IF NEW.location_id IS DISTINCT FROM v_location_id THEN
    RAISE EXCEPTION 'Invalid cashier session location';
  END IF;

  IF NEW.cashier_id IS DISTINCT FROM v_cashier_id THEN
    RAISE EXCEPTION 'Invalid cashier session cashier';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cashier_expenses_ensure_session_open
ON public.cashier_expenses;

CREATE TRIGGER trg_cashier_expenses_ensure_session_open
BEFORE INSERT ON public.cashier_expenses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_cashier_session_open();

DROP TRIGGER IF EXISTS trg_cashier_deposits_ensure_session_open
ON public.cashier_deposits;

CREATE TRIGGER trg_cashier_deposits_ensure_session_open
BEFORE INSERT ON public.cashier_deposits
FOR EACH ROW
EXECUTE FUNCTION public.ensure_cashier_session_open();

DROP TRIGGER IF EXISTS trg_sales_ensure_session_open
ON public.sales;

CREATE TRIGGER trg_sales_ensure_session_open
BEFORE INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.ensure_cashier_session_open();

CREATE OR REPLACE VIEW public.v_cashier_session_summary AS
WITH sales_totals AS (
  SELECT
    s.cashier_session_id,
    COUNT(*)::INT AS total_sales_count,
    COALESCE(SUM(s.grand_total), 0)::NUMERIC(14, 2) AS total_sales
  FROM public.sales s
  WHERE s.status = 'PAID'
  GROUP BY s.cashier_session_id
),
payment_totals AS (
  SELECT
    s.cashier_session_id,
    COALESCE(SUM(sp.amount) FILTER (WHERE sp.payment_method = 'CASH'), 0)::NUMERIC(14, 2) AS cash_sales,
    COALESCE(SUM(sp.amount) FILTER (WHERE sp.payment_method = 'NONCASH'), 0)::NUMERIC(14, 2) AS noncash_sales
  FROM public.sale_payments sp
  JOIN public.sales s ON s.id = sp.sale_id
  WHERE s.status = 'PAID'
  GROUP BY s.cashier_session_id
),
expense_totals AS (
  SELECT
    cashier_session_id,
    COALESCE(SUM(amount), 0)::NUMERIC(14, 2) AS total_expenses
  FROM public.cashier_expenses
  WHERE status = 'POSTED'
  GROUP BY cashier_session_id
),
deposit_totals AS (
  SELECT
    cashier_session_id,
    COALESCE(SUM(amount), 0)::NUMERIC(14, 2) AS total_deposits
  FROM public.cashier_deposits
  WHERE status = 'POSTED'
  GROUP BY cashier_session_id
)
SELECT
  cs.id AS cashier_session_id,
  cs.session_no,
  cs.cashier_id,
  cs.location_id,
  cs.shift_name,
  cs.status,
  cs.opened_at,
  cs.closed_at,

  cs.opening_cash,

  COALESCE(st.total_sales_count, 0) AS total_sales_count,
  COALESCE(st.total_sales, 0)::NUMERIC(14, 2) AS total_sales,

  COALESCE(pt.cash_sales, 0)::NUMERIC(14, 2) AS cash_sales,
  COALESCE(pt.noncash_sales, 0)::NUMERIC(14, 2) AS noncash_sales,

  COALESCE(et.total_expenses, 0)::NUMERIC(14, 2) AS total_expenses,
  COALESCE(dt.total_deposits, 0)::NUMERIC(14, 2) AS total_deposits,

  (
    cs.opening_cash
    + COALESCE(pt.cash_sales, 0)
    - COALESCE(et.total_expenses, 0)
    - COALESCE(dt.total_deposits, 0)
  )::NUMERIC(14, 2) AS calculated_expected_cash,

  cs.expected_cash AS closed_expected_cash,
  cs.actual_cash,
  cs.cash_difference,

  cs.notes,
  cs.created_at,
  cs.updated_at
FROM public.cashier_sessions cs
LEFT JOIN sales_totals st ON st.cashier_session_id = cs.id
LEFT JOIN payment_totals pt ON pt.cashier_session_id = cs.id
LEFT JOIN expense_totals et ON et.cashier_session_id = cs.id
LEFT JOIN deposit_totals dt ON dt.cashier_session_id = cs.id;
