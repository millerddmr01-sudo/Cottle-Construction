-- ==========================================
-- COTTLE CONSTRUCTION - EQUIPMENT AVAILABILITY SCHEMA
-- ==========================================

DO $$
BEGIN
    -- Add start_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_equipment'
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.project_equipment ADD COLUMN start_date DATE;
    END IF;

    -- Add end_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_equipment'
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE public.project_equipment ADD COLUMN end_date DATE;
    END IF;
END $$;
