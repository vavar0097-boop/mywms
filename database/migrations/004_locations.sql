-- =====================================================
-- ENTERPRISE WMS
-- Migration: 004_locations.sql
-- Description: Warehouse Locations Hierarchy
-- =====================================================

BEGIN;

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    warehouse_id UUID NOT NULL
        REFERENCES warehouses(id),

    parent_id UUID
        REFERENCES locations(id),

    code VARCHAR(50) NOT NULL,

    name VARCHAR(255) NOT NULL,

    level VARCHAR(20) NOT NULL
        CHECK (
            level IN (
                'ZONE',
                'AISLE',
                'RACK',
                'BIN'
            )
        ),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        warehouse_id,
        code
    )
);

COMMIT;