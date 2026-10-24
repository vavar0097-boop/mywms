-- =====================================================
-- ENTERPRISE WMS
-- Migration: 014_indexes.sql
-- Description: Performance Indexes
-- =====================================================

BEGIN;

-- =====================================================
-- ITEMS
-- =====================================================

CREATE INDEX idx_items_name
ON items(item_name);

CREATE INDEX idx_items_type
ON items(item_type);

CREATE INDEX idx_items_active
ON items(is_active);

-- =====================================================
-- LOCATIONS
-- =====================================================

CREATE INDEX idx_locations_warehouse
ON locations(warehouse_id);

CREATE INDEX idx_locations_parent
ON locations(parent_id);

CREATE INDEX idx_locations_level
ON locations(level);

-- =====================================================
-- CURRENT STOCKS
-- =====================================================

CREATE INDEX idx_current_stocks_item
ON current_stocks(item_id);

CREATE INDEX idx_current_stocks_location
ON current_stocks(location_id);

-- =====================================================
-- STOCK LEDGERS
-- =====================================================

CREATE INDEX idx_stock_ledgers_item
ON stock_ledgers(item_id);

CREATE INDEX idx_stock_ledgers_location
ON stock_ledgers(location_id);

CREATE INDEX idx_stock_ledgers_created_at
ON stock_ledgers(created_at);

CREATE INDEX idx_stock_ledgers_reference
ON stock_ledgers(reference_type, reference_id);

-- =====================================================
-- TRANSFERS
-- =====================================================

CREATE INDEX idx_stock_transfers_status
ON stock_transfers(status);

CREATE INDEX idx_stock_transfers_created_at
ON stock_transfers(created_at);

CREATE INDEX idx_stock_transfer_items_transfer
ON stock_transfer_items(transfer_id);

CREATE INDEX idx_transfer_events_transfer
ON transfer_events(transfer_id);

-- =====================================================
-- AUDIT
-- =====================================================

CREATE INDEX idx_audit_logs_user
ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_created_at
ON audit_logs(created_at);

CREATE INDEX idx_api_logs_created_at
ON api_logs(created_at);

COMMIT;
