-- =====================================================
-- ENTERPRISE WMS
-- Migration: 012_functions.sql
-- Description: Core Database Functions
-- Version: FINAL V1
-- =====================================================

BEGIN;

-- =====================================================
-- GENERATE ITEM CODE
-- Example:
-- AYM -> AYM-000001
-- =====================================================

CREATE OR REPLACE FUNCTION generate_item_code(
p_prefix VARCHAR
)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
v_next_number BIGINT;
v_item_code VARCHAR;
BEGIN


INSERT INTO sku_sequences (
    prefix,
    last_number
)
VALUES (
    UPPER(p_prefix),
    0
)
ON CONFLICT (prefix)
DO NOTHING;

SELECT last_number
INTO v_next_number
FROM sku_sequences
WHERE prefix = UPPER(p_prefix)
FOR UPDATE;

v_next_number := v_next_number + 1;

UPDATE sku_sequences
SET
    last_number = v_next_number,
    updated_at = NOW()
WHERE prefix = UPPER(p_prefix);

v_item_code :=
    UPPER(p_prefix)
    || '-'
    || LPAD(v_next_number::TEXT, 6, '0');

RETURN v_item_code;


END;
$$;

-- =====================================================
-- GET CURRENT STOCK
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_stock(
p_item_id UUID,
p_location_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
v_stock NUMERIC(18,4);
BEGIN


SELECT quantity
INTO v_stock
FROM current_stocks
WHERE item_id = p_item_id
  AND location_id = p_location_id;

RETURN COALESCE(v_stock, 0);


END;
$$;

-- =====================================================
-- UPSERT CURRENT STOCK
-- INTERNAL FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_current_stock(
p_item_id UUID,
p_location_id UUID,
p_delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN


INSERT INTO current_stocks (
    item_id,
    location_id,
    quantity,
    updated_at
)
VALUES (
    p_item_id,
    p_location_id,
    p_delta,
    NOW()
)
ON CONFLICT (item_id, location_id)
DO UPDATE
SET
    quantity = current_stocks.quantity + p_delta,
    updated_at = NOW();


END;
$$;

-- =====================================================
-- CREATE STOCK MOVEMENT
-- SINGLE ENTRY POINT
-- =====================================================

CREATE OR REPLACE FUNCTION create_stock_movement(
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
    RAISE EXCEPTION
    'Quantity must be greater than zero';
END IF;

IF p_reference_type NOT IN (
    'INITIAL_STOCK',
    'TRANSFER',
    'ADJUSTMENT',
    'MANUAL'
) THEN
    RAISE EXCEPTION
    'Invalid reference type';
END IF;

SELECT quantity
INTO v_stock
FROM current_stocks
WHERE item_id = p_item_id
  AND location_id = p_location_id
FOR UPDATE;

v_stock := COALESCE(v_stock, 0);

IF p_movement_type = 'IN' THEN

    v_delta := p_quantity;

ELSIF p_movement_type = 'OUT' THEN

    IF v_stock < p_quantity THEN
        RAISE EXCEPTION
        'Insufficient stock';
    END IF;

    v_delta := -p_quantity;

ELSIF p_movement_type = 'ADJ' THEN

    IF p_stock_effect = 'PLUS' THEN

        v_delta := p_quantity;

    ELSIF p_stock_effect = 'MINUS' THEN

        IF v_stock < p_quantity THEN
            RAISE EXCEPTION
            'Insufficient stock';
        END IF;

        v_delta := -p_quantity;

    ELSE

        RAISE EXCEPTION
        'Invalid stock effect';

    END IF;

ELSE

    RAISE EXCEPTION
    'Invalid movement type';

END IF;

INSERT INTO stock_ledgers (
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

PERFORM upsert_current_stock(
    p_item_id,
    p_location_id,
    v_delta
);

RETURN v_ledger_id;


END;
$$;

COMMIT;
