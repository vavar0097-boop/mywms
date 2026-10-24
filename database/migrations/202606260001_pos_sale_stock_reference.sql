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
