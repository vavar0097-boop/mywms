-- =====================================================
-- ENTERPRISE WMS
-- Migration: 015_seed.sql
-- Description: Initial Seed Data
-- =====================================================

BEGIN;

-- =====================================================
-- ROLES
-- =====================================================

INSERT INTO roles (name, description)
VALUES
('ADMIN', 'Full system access'),
('SUPERVISOR', 'Warehouse supervisor'),
('OPERATOR', 'Warehouse operator'),
('AUDITOR', 'Audit and reporting')
ON CONFLICT DO NOTHING;

-- =====================================================
-- UNITS
-- =====================================================

INSERT INTO units (
code,
name
)
VALUES
('PCS','Pieces'),
('BOX','Box'),
('DUS','Dus'),
('KG','Kilogram'),
('GRAM','Gram'),
('LITER','Liter'),
('ML','Milliliter')
ON CONFLICT DO NOTHING;

-- =====================================================
-- MAIN WAREHOUSE
-- =====================================================

INSERT INTO warehouses (
code,
name
)
VALUES
(
'WH-MAIN',
'Main Warehouse'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- TRANSIT WAREHOUSE
-- =====================================================

INSERT INTO warehouses (
code,
name
)
VALUES
(
'WH-TRANSIT',
'Transit Warehouse'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

INSERT INTO system_settings (
key,
value,
description
)
VALUES
(
'ALLOW_NEGATIVE_STOCK',
'false',
'System stock policy'
)
ON CONFLICT DO NOTHING;

COMMIT;
