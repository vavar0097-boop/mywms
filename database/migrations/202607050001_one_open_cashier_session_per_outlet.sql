DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.cashier_sessions
    WHERE status = 'OPEN'
    GROUP BY location_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Skipped idx_cashier_sessions_one_open_per_location because duplicate open outlet sessions exist.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cashier_sessions_one_open_per_location
    ON public.cashier_sessions(location_id)
    WHERE status = 'OPEN';
  END IF;
END;
$$;
