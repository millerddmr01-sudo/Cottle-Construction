-- ==========================================
-- COTTLE CONSTRUCTION - SUPABASE SETUP SCRIPT
-- ==========================================

-- 1. Create the custom Role Enum
CREATE TYPE user_role AS ENUM ('admin', 'foreman', 'employee', 'customer', 'subcontractor');

-- 2. Create the User Profiles Table
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    role user_role DEFAULT 'customer'::user_role NOT NULL,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    company_name TEXT,       -- Customers/Subcontractors only
    address TEXT,            -- Customers/Subcontractors only
    billing_info JSONB,      -- Customers/Subcontractors only
    employee_id TEXT UNIQUE, -- Employees only
    job_description TEXT,    -- Employees only
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile."
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles."
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles."
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Create the Employee Documents Table
CREATE TABLE public.employee_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    handbook_url TEXT,
    time_policy_url TEXT,
    job_description_url TEXT,
    certifications_url TEXT,
    compliance_url TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Allow employees to view their own documents list
CREATE POLICY "Employees can view their own documents."
    ON public.employee_documents FOR SELECT
    USING (auth.uid() = user_id);

-- Allow admins full access
CREATE POLICY "Admins have full access to employee documents."
    ON public.employee_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Create a Trigger to Automatically Add New Users to `user_profiles`
-- This grabs the metadata we send during sign up (like role, full_name, etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        role, 
        full_name, 
        phone_number, 
        company_name, 
        address, 
        billing_info
    )
    VALUES (
        new.id, 
        new.email,
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'customer'::user_role),
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'phone_number',
        new.raw_user_meta_data->>'company_name',
        new.raw_user_meta_data->>'address',
        (new.raw_user_meta_data->>'billing_info')::jsonb
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 5. Setup Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('employee_documents', 'employee_documents', false);

-- Enable RLS on storage objects
-- Note: Supabase usually enables this by default and applying it can cause owner errors.
-- We will apply the policy using Supabase's provided UI or via specialized storage commands in the dashboard if necessary later.
-- Skipping storage.objects ALTER TABLE for now to resolve error 42501.

-- Policies for employee_documents bucket
-- Allow Admins to insert/update/delete any file in employee_documents
-- (You would ideally configure these in the Storage section of the Supabase dashboard)
