-- Add name column to existing change orders table
ALTER TABLE public.project_change_orders 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled Change Order';

-- Optional: remove the default after adding to existing rows if you want to force new ones to provide it
ALTER TABLE public.project_change_orders 
ALTER COLUMN name DROP DEFAULT;
