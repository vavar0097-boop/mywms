CREATE TABLE IF NOT EXISTS public.daily_purchase_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  outlet_id UUID NULL REFERENCES public.locations(id),
  vendor_name TEXT NULL,

  receipt_photo_url TEXT NULL,
  ai_raw_text TEXT NULL,
  ai_json_result JSONB NULL,
  ai_provider TEXT NULL,

  status TEXT NOT NULL DEFAULT 'DRAFT_AI'
    CHECK (status IN ('DRAFT_AI', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED')),

  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),

  reviewed_by UUID NULL REFERENCES public.users(id),
  approved_by UUID NULL REFERENCES public.users(id),
  approved_at TIMESTAMPTZ NULL,

  finance_transaction_id UUID NULL REFERENCES public.finance_transactions(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_purchase_batches_date
ON public.daily_purchase_batches(purchase_date);

CREATE INDEX IF NOT EXISTS idx_daily_purchase_batches_status
ON public.daily_purchase_batches(status);

CREATE TABLE IF NOT EXISTS public.daily_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  batch_id UUID NOT NULL REFERENCES public.daily_purchase_batches(id) ON DELETE CASCADE,

  item_name TEXT NOT NULL,
  qty NUMERIC(14, 3) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit TEXT NULL,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  category TEXT NOT NULL DEFAULT 'Daily Store Expense',

  ai_original_value JSONB NULL,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_purchase_items_batch_id
ON public.daily_purchase_items(batch_id);

DROP TRIGGER IF EXISTS trg_daily_purchase_batches_touch_updated_at
ON public.daily_purchase_batches;

CREATE TRIGGER trg_daily_purchase_batches_touch_updated_at
BEFORE UPDATE ON public.daily_purchase_batches
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_daily_purchase_items_touch_updated_at
ON public.daily_purchase_items;

CREATE TRIGGER trg_daily_purchase_items_touch_updated_at
BEFORE UPDATE ON public.daily_purchase_items
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
