-- employee_schema.sql

-- Drop existing to ensure clean slate
DROP TABLE IF EXISTS public.employee_documents CASCADE;

-- 1. Create the sequence and table for tracking employee documents/certifications
CREATE TABLE public.employee_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
    file_url TEXT,
    expiration_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Admins can do everything
CREATE POLICY "Admins have full access to employee_documents."
ON public.employee_documents FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Employees can view their own documents
CREATE POLICY "Employees can view their own documents."
ON public.employee_documents FOR SELECT
USING (auth.uid() = employee_id);

-- Employees can upload/insert their own documents
CREATE POLICY "Employees can insert their own documents."
ON public.employee_documents FOR INSERT
WITH CHECK (auth.uid() = employee_id);

-- Employees can update their own documents (e.g., replace file) if they are not already 'approved'
CREATE POLICY "Employees can update their pending/rejected documents."
ON public.employee_documents FOR UPDATE
USING (auth.uid() = employee_id AND status IN ('pending', 'rejected', 'expired'));


-- 4. Create the storage bucket for employee files
INSERT INTO storage.buckets (id, name, public) VALUES ('employee_files', 'employee_files', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies
-- Admins can access all files in the bucket
CREATE POLICY "Admins can access all employee_files."
ON storage.objects FOR ALL
USING (bucket_id = 'employee_files' AND auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Employees can upload files to their personal folder in the bucket (folder name = their UUID)
CREATE POLICY "Employees can upload to their employee_files folder."
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee_files' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Employees can view files in their personal folder
CREATE POLICY "Employees can view their employee_files folder."
ON storage.objects FOR SELECT
USING (bucket_id = 'employee_files' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Employees can update files in their personal folder
CREATE POLICY "Employees can update their employee_files folder."
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee_files' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Employees can delete files in their personal folder
CREATE POLICY "Employees can delete their employee_files folder."
ON storage.objects FOR DELETE
USING (bucket_id = 'employee_files' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
