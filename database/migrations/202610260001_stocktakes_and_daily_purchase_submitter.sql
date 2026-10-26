BEGIN;

ALTER TABLE public.daily_purchase_batches
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.users(id);

ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.locations(id);

UPDATE public.daily_purchase_batches
SET submitted_by = reviewed_by
WHERE submitted_by IS NULL AND reviewed_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_no TEXT NOT NULL UNIQUE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'COMPLETED')),
  created_by UUID NOT NULL REFERENCES public.users(id),
  completed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id UUID NOT NULL REFERENCES public.stocktakes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  item_code_snapshot TEXT,
  item_name_snapshot TEXT NOT NULL,
  expected_quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  counted_quantity NUMERIC(18,4),
  UNIQUE (stocktake_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_stocktakes_location_created
  ON public.stocktakes(location_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_stocktake(
  p_location_id UUID,
  p_created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_no TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = p_location_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Active location not found';
  END IF;

  v_no := 'OPN-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' ||
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 6));

  INSERT INTO public.stocktakes(stocktake_no, location_id, created_by)
  VALUES (v_no, p_location_id, p_created_by)
  RETURNING id INTO v_id;

  INSERT INTO public.stocktake_items(
    stocktake_id, item_id, item_code_snapshot, item_name_snapshot, expected_quantity
  )
  SELECT
    v_id,
    i.id,
    i.item_code,
    i.item_name,
    COALESCE(cs.quantity, 0)
  FROM public.items i
  LEFT JOIN public.current_stocks cs
    ON cs.item_id = i.id AND cs.location_id = p_location_id
  WHERE i.is_active = TRUE AND i.is_deleted = FALSE
  ORDER BY i.item_code;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_stocktake(
  p_stocktake_id UUID,
  p_completed_by UUID,
  p_counts JSONB
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_stocktake public.stocktakes%ROWTYPE;
  v_item public.stocktake_items%ROWTYPE;
  v_count NUMERIC(18,4);
  v_current_quantity NUMERIC(18,4);
  v_delta NUMERIC(18,4);
  v_input_count INTEGER;
  v_item_count INTEGER;
BEGIN
  SELECT * INTO v_stocktake
  FROM public.stocktakes
  WHERE id = p_stocktake_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stocktake not found';
  END IF;
  IF v_stocktake.status <> 'OPEN' THEN
    RAISE EXCEPTION 'Stocktake is already completed';
  END IF;
  IF jsonb_typeof(p_counts) <> 'array' THEN
    RAISE EXCEPTION 'Counts must be an array';
  END IF;

  SELECT COUNT(*) INTO v_input_count FROM jsonb_array_elements(p_counts);
  SELECT COUNT(*) INTO v_item_count
  FROM public.stocktake_items WHERE stocktake_id = p_stocktake_id;
  IF v_input_count <> v_item_count THEN
    RAISE EXCEPTION 'A physical count is required for every listed item';
  END IF;

  FOR v_item IN
    SELECT * FROM public.stocktake_items
    WHERE stocktake_id = p_stocktake_id
    ORDER BY item_id
    FOR UPDATE
  LOOP
    SELECT x.counted_quantity
    INTO v_count
    FROM jsonb_to_recordset(p_counts) AS x(item_id UUID, counted_quantity NUMERIC)
    WHERE x.item_id = v_item.item_id;

    IF v_count IS NULL OR v_count < 0 THEN
      RAISE EXCEPTION 'A valid non-negative count is required for every item';
    END IF;

    INSERT INTO public.current_stocks(item_id, location_id, quantity)
    VALUES (v_item.item_id, v_stocktake.location_id, 0)
    ON CONFLICT (item_id, location_id) DO NOTHING;

    SELECT quantity INTO v_current_quantity
    FROM public.current_stocks
    WHERE item_id = v_item.item_id AND location_id = v_stocktake.location_id
    FOR UPDATE;

    v_delta := v_count - COALESCE(v_current_quantity, 0);
    UPDATE public.stocktake_items
    SET counted_quantity = v_count
    WHERE id = v_item.id;

    IF v_delta <> 0 THEN
      PERFORM public.create_stock_movement(
        v_item.item_id,
        v_stocktake.location_id,
        'ADJ',
        ABS(v_delta),
        'ADJUSTMENT',
        v_stocktake.id,
        v_stocktake.stocktake_no,
        'Stock opname ' || v_stocktake.stocktake_no,
        p_completed_by,
        CASE WHEN v_delta > 0 THEN 'PLUS' ELSE 'MINUS' END
      );
    END IF;
  END LOOP;

  UPDATE public.stocktakes
  SET status = 'COMPLETED', completed_by = p_completed_by, completed_at = NOW()
  WHERE id = p_stocktake_id;

  RETURN p_stocktake_id;
END;
$$;

COMMIT;
