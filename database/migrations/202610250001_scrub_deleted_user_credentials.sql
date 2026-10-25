BEGIN;

-- Keep the user row for audit/history while freeing the original username.
UPDATE users
SET
    username = 'deleted-' || id::text,
    password_hash = '!deleted!'
WHERE is_deleted = TRUE;

COMMIT;