-- =====================================================
-- ENTERPRISE WMS
-- Migration: 013_triggers.sql
-- Description: Database Triggers
-- =====================================================

BEGIN;

-- =====================================================
-- GENERIC UPDATED_AT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN


NEW.updated_at = NOW();

RETURN NEW;


END;
$$;

-- =====================================================
-- USERS
-- =====================================================

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- WAREHOUSES
-- =====================================================

CREATE TRIGGER trg_warehouses_updated_at
BEFORE UPDATE ON warehouses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- UNITS
-- =====================================================

CREATE TRIGGER trg_units_updated_at
BEFORE UPDATE ON units
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- ITEMS
-- =====================================================

CREATE TRIGGER trg_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- SKU SEQUENCES
-- =====================================================

CREATE TRIGGER trg_sku_sequences_updated_at
BEFORE UPDATE ON sku_sequences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- STOCK TRANSFERS
-- =====================================================

CREATE TRIGGER trg_stock_transfers_updated_at
BEFORE UPDATE ON stock_transfers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
