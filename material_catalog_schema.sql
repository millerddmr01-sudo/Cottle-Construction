-- ==========================================
-- COTTLE CONSTRUCTION - MATERIAL CATALOG SCHEMA
-- ==========================================

-- 1. Create the Material Catalog Table
CREATE TABLE IF NOT EXISTS public.material_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    material_name TEXT NOT NULL UNIQUE,
    default_unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    default_unit_measure TEXT NOT NULL DEFAULT 'Ea',
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Turn on Row Level Security
ALTER TABLE public.material_catalog ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Employees can view material catalog." ON public.material_catalog;
-- Allow all authenticated employees (admin, foreman, employee) to view the catalog for the picklist
CREATE POLICY "Employees can view material catalog."
    ON public.material_catalog FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')
        )
    );

DROP POLICY IF EXISTS "Admins can manage material catalog." ON public.material_catalog;
-- Allow admins to insert/update/delete materials
CREATE POLICY "Admins can manage material catalog."
    ON public.material_catalog FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Add source to material_catalog if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'material_catalog'
        AND column_name = 'source'
    ) THEN
        ALTER TABLE public.material_catalog ADD COLUMN source TEXT;
    END IF;
END $$;
