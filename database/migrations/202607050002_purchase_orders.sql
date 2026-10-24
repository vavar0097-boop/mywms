BEGIN;

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
    'SALE',
    'PURCHASE_RECEIVE'
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
    'SALE',
    'PURCHASE_RECEIVE'
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

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code TEXT NOT NULL UNIQUE DEFAULT (
    'VND-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8))
  ),
  vendor_name TEXT NOT NULL,
  contact_name TEXT NULL,
  phone TEXT NULL,
  email TEXT NULL,
  address TEXT NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no TEXT NOT NULL UNIQUE DEFAULT (
    'PO-' ||
    TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6))
  ),
  vendor_id UUID NULL REFERENCES public.vendors(id),
  vendor_name TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE NULL,
  destination_location_id UUID NOT NULL REFERENCES public.locations(id),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
  notes TEXT NULL,
  source_type TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source_type IN ('MANUAL', 'SPREADSHEET', 'AI_PHOTO', 'AUTO_LOW_STOCK')),
  source_payload JSONB NULL,
  created_by UUID REFERENCES public.users(id),
  ordered_by UUID REFERENCES public.users(id),
  ordered_at TIMESTAMPTZ NULL,
  cancelled_by UUID REFERENCES public.users(id),
  cancelled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  qty_ordered NUMERIC(18,4) NOT NULL CHECK (qty_ordered > 0),
  qty_received NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_order_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL UNIQUE DEFAULT (
    'RCV-' ||
    TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') ||
    '-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6))
  ),
  received_by UUID REFERENCES public.users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id),
  item_id UUID NOT NULL REFERENCES public.items(id),
  qty_received NUMERIC(18,4) NOT NULL CHECK (qty_received > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_by UUID REFERENCES public.users(id),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
ON public.purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at
ON public.purchase_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_destination
ON public.purchase_orders(destination_location_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po
ON public.purchase_order_items(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_po
ON public.purchase_receipts(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_events_po
ON public.purchase_order_events(purchase_order_id);

ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS min_stock NUMERIC(18,4) NOT NULL DEFAULT 0
  CHECK (min_stock >= 0),
ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC(18,4) NOT NULL DEFAULT 0
  CHECK (reorder_qty >= 0),
ADD COLUMN IF NOT EXISTS default_vendor_name TEXT NULL,
ADD COLUMN IF NOT EXISTS default_vendor_id UUID NULL REFERENCES public.vendors(id);

CREATE INDEX IF NOT EXISTS idx_vendors_active
ON public.vendors(is_active);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor
ON public.purchase_orders(vendor_id);

CREATE OR REPLACE FUNCTION public.get_low_stock_reorder_candidates(
  p_location_id UUID
)
RETURNS TABLE (
  item_id UUID,
  item_code TEXT,
  item_name TEXT,
  min_stock NUMERIC,
  reorder_qty NUMERIC,
  current_qty NUMERIC,
  shortage_qty NUMERIC,
  suggested_qty NUMERIC,
  default_vendor_name TEXT
)
LANGUAGE sql
STABLE
AS $$
  WITH configured_items AS (
    SELECT
      i.id,
      i.item_code,
      i.item_name,
      i.min_stock,
      i.reorder_qty,
      COALESCE(v.vendor_name, i.default_vendor_name) AS default_vendor_name
    FROM public.items i
    LEFT JOIN public.vendors v
      ON v.id = i.default_vendor_id
    WHERE i.is_deleted = FALSE
      AND i.is_active = TRUE
      AND i.min_stock > 0
  ),
  location_stock AS (
    SELECT
      cs.item_id,
      cs.quantity
    FROM public.current_stocks cs
    WHERE cs.location_id = p_location_id
  ),
  open_po_items AS (
    SELECT DISTINCT poi.item_id
    FROM public.purchase_order_items poi
    JOIN public.purchase_orders po
      ON po.id = poi.purchase_order_id
    WHERE po.destination_location_id = p_location_id
      AND po.status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED')
  )
  SELECT
    ci.id AS item_id,
    ci.item_code::TEXT,
    ci.item_name::TEXT,
    ci.min_stock,
    ci.reorder_qty,
    COALESCE(ls.quantity, 0) AS current_qty,
    GREATEST(ci.min_stock - COALESCE(ls.quantity, 0), 0) AS shortage_qty,
    GREATEST(
      CASE
        WHEN ci.reorder_qty > 0 THEN ci.reorder_qty
        ELSE ci.min_stock - COALESCE(ls.quantity, 0)
      END,
      0
    ) AS suggested_qty,
    ci.default_vendor_name::TEXT
  FROM configured_items ci
  LEFT JOIN location_stock ls
    ON ls.item_id = ci.id
  LEFT JOIN open_po_items opi
    ON opi.item_id = ci.id
  WHERE COALESCE(ls.quantity, 0) <= ci.min_stock
    AND opi.item_id IS NULL
  ORDER BY ci.item_code ASC;
$$;

DROP TRIGGER IF EXISTS trg_purchase_orders_touch_updated_at
ON public.purchase_orders;

DROP TRIGGER IF EXISTS trg_vendors_touch_updated_at
ON public.vendors;

CREATE TRIGGER trg_vendors_touch_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_purchase_orders_touch_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_order_items_touch_updated_at
ON public.purchase_order_items;

CREATE TRIGGER trg_purchase_order_items_touch_updated_at
BEFORE UPDATE ON public.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

COMMIT;
