-- ==========================================
-- PROJECT DOCUMENTS SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.project_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist for idempotency
DROP POLICY IF EXISTS "Admins and Foremen can manage documents" ON public.project_documents;
DROP POLICY IF EXISTS "Employees can read documents" ON public.project_documents;

-- Admins and foremen can read and write all documents
CREATE POLICY "Admins and Foremen can manage documents" 
ON public.project_documents 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'foreman')
  )
);

-- Employees can read documents
CREATE POLICY "Employees can read documents" 
ON public.project_documents 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'employee'
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON public.project_documents(project_id);
