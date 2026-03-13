-- ==========================================
-- COTTLE CONSTRUCTION - FIX MATERIAL DUPLICATES & SCHEMA
-- ==========================================

DO $$
DECLARE
    pk_constraint_name TEXT;
BEGIN
    -- 1. Identify and keep only the latest entry for each material_name using the system ctid column
    WITH duplicates AS (
        SELECT 
            ctid,
            ROW_NUMBER() OVER(
                PARTITION BY lower(trim(material_name)) 
                ORDER BY ctid DESC
            ) as rn
        FROM public.material_catalog
    )
    -- Delete all rows that are not row number 1 (the latest)
    DELETE FROM public.material_catalog
    WHERE ctid IN (
        SELECT ctid FROM duplicates WHERE rn > 1
    );

    -- 2. Find and drop any existing primary key constraint (since material_name might be the PK)
    SELECT constraint_name INTO pk_constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'material_catalog' 
      AND table_schema = 'public' 
      AND constraint_type = 'PRIMARY KEY';

    IF pk_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.material_catalog DROP CONSTRAINT ' || pk_constraint_name;
    END IF;

    -- 3. Add the missing 'id' column as the new Primary Key if it does not exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'material_catalog' AND column_name = 'id'
    ) THEN
        ALTER TABLE public.material_catalog ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    ELSE
        -- If id already existed but had no PK, add it
        IF pk_constraint_name IS NULL OR pk_constraint_name != 'material_catalog_pkey' THEN
           ALTER TABLE public.material_catalog ADD PRIMARY KEY (id);
        END IF;
    END IF;

    -- 4. Add explicit UNIQUE constraint to material_name if it does not already exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.material_catalog'::regclass 
        AND contype = 'u' 
        AND conname = 'material_catalog_material_name_key'
    ) THEN
        ALTER TABLE public.material_catalog ADD CONSTRAINT material_catalog_material_name_key UNIQUE (material_name);
    END IF;
    
END $$;
