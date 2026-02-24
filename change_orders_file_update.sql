-- Add name column to existing change orders table (if not already done)
ALTER TABLE public.project_change_orders ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled Change Order';
ALTER TABLE public.project_change_orders ALTER COLUMN name DROP DEFAULT;

-- Replace document_link with file_path
ALTER TABLE public.project_change_orders DROP COLUMN IF EXISTS document_link;
ALTER TABLE public.project_change_orders ADD COLUMN IF NOT EXISTS file_path TEXT NOT NULL DEFAULT '';
ALTER TABLE public.project_change_orders ALTER COLUMN file_path DROP DEFAULT;
