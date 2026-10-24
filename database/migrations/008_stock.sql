-- =====================================================
-- ENTERPRISE WMS
-- Migration: 008_stock.sql
-- Description: Inventory Engine
-- =====================================================

BEGIN;

-- =====================================================
-- STOCK LEDGERS
-- SINGLE SOURCE OF TRUTH
-- APPEND ONLY
-- =====================================================

CREATE TABLE stock_ledgers (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES items(id),

    location_id UUID NOT NULL
        REFERENCES locations(id),

    movement_type VARCHAR(10) NOT NULL
        CHECK (
            movement_type IN (
                'IN',
                'OUT',
                'ADJ'
            )
        ),

    quantity NUMERIC(18,4) NOT NULL
        CHECK (quantity > 0),

    reference_type VARCHAR(50),
        CHECK (
            reference_type IN (
                'INITIAL_STOCK',
                'TRANSFER',
                'ADJUSTMENT',
                'MANUAL'
            )
        ),

    reference_id UUID,

    reference_no VARCHAR(100),

    remarks TEXT,

    created_by UUID
        REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CURRENT STOCKS
-- FAST LOOKUP TABLE
-- =====================================================

CREATE TABLE current_stocks (

    item_id UUID NOT NULL
        REFERENCES items(id),

    location_id UUID NOT NULL
        REFERENCES locations(id),

    quantity NUMERIC(18,4) NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (
        item_id,
        location_id
    )
);

COMMIT;