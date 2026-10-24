-- =====================================================
-- ENTERPRISE WMS
-- Migration: 011_system.sql
-- Description: Internal System Tables
-- =====================================================

BEGIN;

CREATE TABLE system_settings (

    key VARCHAR(100) PRIMARY KEY,

    value TEXT,

    description TEXT,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;