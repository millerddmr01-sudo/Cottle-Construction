ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS is_inspection BOOLEAN NOT NULL DEFAULT false;
