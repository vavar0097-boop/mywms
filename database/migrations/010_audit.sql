-- =====================================================
-- ENTERPRISE WMS
-- Migration: 010_audit.sql
-- Description: Audit & API Logs
-- =====================================================

BEGIN;

CREATE TABLE audit_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id),

    action VARCHAR(100) NOT NULL,

    entity_name VARCHAR(100) NOT NULL,

    entity_id UUID,

    old_data JSONB,

    new_data JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    method VARCHAR(20),

    endpoint TEXT,

    status_code INTEGER,

    response_time_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;