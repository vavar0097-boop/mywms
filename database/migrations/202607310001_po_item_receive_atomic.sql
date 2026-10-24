-- =====================================================
-- Migration: 202607310001_po_item_receive_atomic.sql
-- Description:
--   The API previously incremented purchase_order_items.qty_received
--   by doing a SELECT then an UPDATE from application code. Two
--   concurrent "receive" requests for the same PO item (double
--   submit, or two staff receiving the same line at once) could
--   both read the same qty_received and the second UPDATE would
--   silently overwrite the first increment (lost update), and both
--   requests could pass the "does not exceed qty_ordered" check
--   using the same stale snapshot, allowing over-receiving.
--
--   This function makes the increment-and-validate step a single
--   atomic, row-locked database operation.
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_po_item_received_qty(
  p_purchase_order_item_id UUID,
  p_qty_received NUMERIC
)
RETURNS public.purchase_order_items
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.purchase_order_items;
  v_remaining NUMERIC(18,4);
BEGIN
  IF p_qty_received <= 0 THEN
    RAISE EXCEPTION 'Received quantity must be greater than zero';
  END IF;

  SELECT *
  INTO v_row
  FROM public.purchase_order_items
  WHERE id = p_purchase_order_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order item not found';
  END IF;

  v_remaining := COALESCE(v_row.qty_ordered, 0) - COALESCE(v_row.qty_received, 0);

  IF p_qty_received > v_remaining THEN
    RAISE EXCEPTION 'Received quantity exceeds remaining PO quantity';
  END IF;

  UPDATE public.purchase_order_items
  SET qty_received = COALESCE(qty_received, 0) + p_qty_received
  WHERE id = p_purchase_order_item_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMIT;
