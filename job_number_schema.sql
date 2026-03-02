-- ==========================================
-- COTTLE CONSTRUCTION - JOB NUMBER SCHEMA UPDATE
-- ==========================================

DO $$
BEGIN
    -- Add job_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'job_number'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN job_number TEXT UNIQUE;
    END IF;

    -- Add project_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'project_type'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'project' CHECK (project_type IN ('bid', 'project', 'service'));
    END IF;
END $$;
