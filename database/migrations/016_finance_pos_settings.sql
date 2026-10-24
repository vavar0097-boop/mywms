-- =====================================================
-- ENTERPRISE WMS
-- Migration: 016_finance_pos_settings.sql
-- Description: Finance ledger and POS menu settings
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

    type VARCHAR(20) NOT NULL
        CHECK (
            type IN (
                'INCOME',
                'EXPENSE'
            )
        ),

    category VARCHAR(100) NOT NULL,

    description TEXT,

    amount NUMERIC(18,2) NOT NULL
        CHECK (amount >= 0),

    payment_method VARCHAR(50),

    reference_type VARCHAR(50),

    reference_id UUID,

    created_by UUID
        REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    item_id UUID
        REFERENCES items(id),

    menu_code VARCHAR(50) NOT NULL UNIQUE,

    menu_name VARCHAR(255) NOT NULL,

    category VARCHAR(100),

    price NUMERIC(18,2) NOT NULL
        CHECK (price >= 0),

    is_visible BOOLEAN NOT NULL DEFAULT TRUE,

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_date
ON finance_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_type
ON finance_transactions(type);

CREATE INDEX IF NOT EXISTS idx_pos_menu_items_visible
ON pos_menu_items(is_visible);

COMMIT;
