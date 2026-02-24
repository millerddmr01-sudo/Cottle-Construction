-- ==========================================
-- COTTLE CONSTRUCTION - CUSTOMER PORTAL SCHEMA
-- ==========================================

-- 1. Create the Customer Documents Table
CREATE TABLE public.customer_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('project_document', 'scope_of_work', 'bid')),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for customer_documents
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own documents
CREATE POLICY "Customers can view their own documents."
    ON public.customer_documents FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admins have full access to all customer documents
CREATE POLICY "Admins have full access to customer documents."
    ON public.customer_documents FOR ALL
    USING (public.is_admin());


-- 2. Create the Customer Invoices Table
CREATE TABLE public.customer_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
    file_url TEXT,
    payment_link TEXT, -- Link to Quickbooks invoice
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for customer_invoices
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own invoices
CREATE POLICY "Customers can view their own invoices."
    ON public.customer_invoices FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admins have full access to all customer invoices
CREATE POLICY "Admins have full access to customer invoices."
    ON public.customer_invoices FOR ALL
    USING (public.is_admin());


-- 3. Setup Storage Bucket for Customer Files
INSERT INTO storage.buckets (id, name, public) VALUES ('customer_files', 'customer_files', false) ON CONFLICT (id) DO NOTHING;

-- Policies for customer_files bucket

-- Allow authenticated users (customers) to SELECT (download) their own files
CREATE POLICY "Customers can view their own files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'customer_files' 
    AND auth.role() = 'authenticated' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow Admins full access to customer_files
CREATE POLICY "Admins have full access to customer_files"
ON storage.objects FOR ALL
USING (
    bucket_id = 'customer_files' 
    AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
