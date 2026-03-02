-- ==========================================
-- COTTLE CONSTRUCTION - EQUIPMENT CATALOG SCHEMA
-- ==========================================

-- 1. Create the Equipment Catalog Table
CREATE TABLE IF NOT EXISTS public.equipment_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_name TEXT NOT NULL UNIQUE,
    default_unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    default_duration_unit TEXT NOT NULL DEFAULT 'Day',
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Turn on Row Level Security
ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Employees can view equipment catalog." ON public.equipment_catalog;
-- Allow all authenticated employees (admin, foreman, employee) to view the catalog for the picklist
CREATE POLICY "Employees can view equipment catalog."
    ON public.equipment_catalog FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')
        )
    );

DROP POLICY IF EXISTS "Admins can manage equipment catalog." ON public.equipment_catalog;
-- Allow admins to insert/update/delete equipment
CREATE POLICY "Admins can manage equipment catalog."
    ON public.equipment_catalog FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Add source to equipment_catalog if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'equipment_catalog'
        AND column_name = 'source'
    ) THEN
        ALTER TABLE public.equipment_catalog ADD COLUMN source TEXT;
    END IF;
END $$;

-- 5. Add source to project_equipment if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_equipment'
        AND column_name = 'source'
    ) THEN
        ALTER TABLE public.project_equipment ADD COLUMN source TEXT;
    END IF;
END $$;
