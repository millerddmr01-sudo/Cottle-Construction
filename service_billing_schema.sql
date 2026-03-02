-- ==========================================
-- COTTLE CONSTRUCTION - SERVICE BILLING SCHEMA UPDATE
-- ==========================================

DO $$
BEGIN
    -- Add hourly_rate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'hourly_rate'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN hourly_rate NUMERIC(10, 2) DEFAULT 0.00;
    END IF;
END $$;
