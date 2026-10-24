-- =====================================================
-- ENTERPRISE WMS
-- Migration: 009_transfers.sql
-- Description: Stock Transfers
-- =====================================================

BEGIN;

-- =====================================================
-- STOCK TRANSFERS
-- =====================================================

CREATE TABLE stock_transfers (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transfer_no VARCHAR(50) NOT NULL UNIQUE,

    source_warehouse_id UUID NOT NULL
        REFERENCES warehouses(id),

    destination_warehouse_id UUID NOT NULL
        REFERENCES warehouses(id),

    source_location_id UUID NOT NULL
        REFERENCES locations(id),

    destination_location_id UUID NOT NULL
        REFERENCES locations(id),

    status VARCHAR(30) NOT NULL
        CHECK (
            status IN (
                'DRAFT',
                'REQUESTED',
                'PICKED',
                'IN_TRANSIT',
                'RECEIVED',
                'CANCELLED'
            )
        ),

    remarks TEXT,

    requested_by UUID
        REFERENCES users(id),

    approved_by UUID
        REFERENCES users(id),

    received_by UUID
        REFERENCES users(id),

    requested_at TIMESTAMPTZ,

    approved_at TIMESTAMPTZ,

    shipped_at TIMESTAMPTZ,

    received_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TRANSFER ITEMS
-- =====================================================

CREATE TABLE stock_transfer_items (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transfer_id UUID NOT NULL
        REFERENCES stock_transfers(id)
        ON DELETE CASCADE,

    item_id UUID NOT NULL
        REFERENCES items(id),

    qty_requested NUMERIC(18,4) NOT NULL,

    qty_shipped NUMERIC(18,4),

    qty_received NUMERIC(18,4)
);

-- =====================================================
-- TRANSFER EVENTS
-- =====================================================

CREATE TABLE transfer_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transfer_id UUID NOT NULL
        REFERENCES stock_transfers(id)
        ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL,

    event_by UUID
        REFERENCES users(id),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;