-- ==========================================
-- COTTLE CONSTRUCTION - SUBCONTRACTOR SCHEMA
-- ==========================================

-- 1. Create Subcontractor Documents Table
CREATE TABLE public.subcontractor_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT CHECK (document_type IN ('w9', 'coi', 'general')) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.subcontractor_documents ENABLE ROW LEVEL SECURITY;

-- Allow subcontractors to view their own documents
CREATE POLICY "Subcontractors can view their own documents."
    ON public.subcontractor_documents FOR SELECT
    USING (auth.uid() = user_id);

-- Allow subcontractors to insert their own documents
CREATE POLICY "Subcontractors can insert their own documents."
    ON public.subcontractor_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow admins full access
CREATE POLICY "Admins have full access to subcontractor documents."
    ON public.subcontractor_documents FOR ALL
    USING ( public.is_admin() );


-- 2. Create Subcontractor Invoices Table
CREATE TABLE public.subcontractor_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'paid', 'rejected')) NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.subcontractor_invoices ENABLE ROW LEVEL SECURITY;

-- Allow subcontractors to view their own invoices
CREATE POLICY "Subcontractors can view their own invoices."
    ON public.subcontractor_invoices FOR SELECT
    USING (auth.uid() = user_id);

-- Allow subcontractors to insert their own invoices
CREATE POLICY "Subcontractors can insert their own invoices."
    ON public.subcontractor_invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Subcontractors can't update invoices (only admins can change status)

-- Allow admins full access
CREATE POLICY "Admins have full access to subcontractor invoices."
    ON public.subcontractor_invoices FOR ALL
    USING ( public.is_admin() );


-- 3. Create Storage Bucket for Subcontractor Files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('subcontractor_files', 'subcontractor_files', false)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage object RLS policies usually need to be set up manually in the Supabase UI 
-- because programmatic creation of storage.objects policies can sometimes fail with permission errors.
-- The policies needed are:
-- 1. Subcontractors can select/insert to 'subcontractor_files' where folder name matches their user_id.
-- 2. Admins can select/insert/update/delete any file in 'subcontractor_files'.
