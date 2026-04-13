-- Add the missing ID column and make it the primary key
ALTER TABLE public.equipment_catalog ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4() PRIMARY KEY;
ALTER TABLE public.material_catalog ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4() PRIMARY KEY;
