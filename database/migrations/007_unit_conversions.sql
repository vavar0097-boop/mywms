-- =====================================================
-- ENTERPRISE WMS
-- Migration: 007_unit_conversions.sql
-- Description: Item Unit Conversions
-- =====================================================

BEGIN;

CREATE TABLE unit_conversions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID NOT NULL
        REFERENCES items(id)
        ON DELETE CASCADE,

    from_unit_id UUID NOT NULL
        REFERENCES units(id),

    to_unit_id UUID NOT NULL
        REFERENCES units(id),

    multiplier NUMERIC(18,4) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_multiplier_positive
        CHECK (multiplier > 0),

    CONSTRAINT uq_unit_conversion
        UNIQUE (
            item_id,
            from_unit_id,
            to_unit_id
        )
);

COMMIT;