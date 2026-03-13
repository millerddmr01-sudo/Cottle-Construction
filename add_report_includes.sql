-- ==========================================
-- COTTLE CONSTRUCTION - FOREMAN DAILY REPORT ENHANCEMENTS
-- ==========================================

DO $$
BEGIN
    -- Add include_hours column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'foreman_daily_reports'
        AND column_name = 'include_hours'
    ) THEN
        ALTER TABLE public.foreman_daily_reports ADD COLUMN include_hours BOOLEAN DEFAULT false;
    END IF;

    -- Add include_expenses column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'foreman_daily_reports'
        AND column_name = 'include_expenses'
    ) THEN
        ALTER TABLE public.foreman_daily_reports ADD COLUMN include_expenses BOOLEAN DEFAULT false;
    END IF;
END $$;
