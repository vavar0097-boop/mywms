-- =====================================================
-- ENTERPRISE WMS
-- Migration: 001_extensions.sql
-- Description: PostgreSQL extensions
-- =====================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMIT;