-- =====================================================
-- ENTERPRISE WMS
-- Migration: 006_items.sql
-- Description: Items & SKU Sequences
-- Version: FIXED V1
-- =====================================================

BEGIN;

-- =====================================================
-- SKU SEQUENCES
-- PREFIX-BASED COUNTER
-- =====================================================

CREATE TABLE sku_sequences (


id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

prefix VARCHAR(10) NOT NULL UNIQUE,

last_number BIGINT NOT NULL DEFAULT 0,

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()


);

-- =====================================================
-- ITEMS
-- =====================================================

CREATE TABLE items (


id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

item_code VARCHAR(50) NOT NULL UNIQUE,

item_code_prefix VARCHAR(10) NOT NULL,

barcode VARCHAR(255) UNIQUE,

item_name VARCHAR(255) NOT NULL,

item_type VARCHAR(30) NOT NULL
    CHECK (
        item_type IN (
            'RAW_MATERIAL',
            'FINISHED_GOOD',
            'SUPPLY',
            'ASSET'
        )
    ),

base_unit_id UUID NOT NULL
    REFERENCES units(id),

description TEXT,

is_active BOOLEAN NOT NULL DEFAULT TRUE,

is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

deleted_at TIMESTAMPTZ,

created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()


);

COMMIT;
