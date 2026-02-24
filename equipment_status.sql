-- Run this in the Supabase SQL editor to add the status column to project_equipment

ALTER TABLE public.project_equipment 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'To be ordered';
