-- ==========================================
-- COTTLE CONSTRUCTION - PROJECT PORTAL SCHEMA
-- ==========================================

-- 1. Create the Projects Table
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    project_name TEXT NOT NULL,
    address TEXT NOT NULL,
    start_date DATE,
    estimated_completion_date DATE,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'hold')),
    estimated_hours NUMERIC(10, 2),
    material_requirements TEXT,
    measurements TEXT,
    equipment_list TEXT,
    project_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can view all projects." ON public.projects FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')));
CREATE POLICY "Admins and Foremen can manage projects." ON public.projects FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman')));


-- 2. Create the Project Photos/Files Table
CREATE TABLE public.project_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    description TEXT,
    photo_type TEXT NOT NULL DEFAULT 'general' CHECK (photo_type IN ('survey', 'scope', 'general', 'checklist_proof')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can view project photos." ON public.project_photos FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')));
CREATE POLICY "Employees can upload project photos." ON public.project_photos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')));
CREATE POLICY "Admins and Foremen can manage project photos." ON public.project_photos FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman')));


-- 3. Create the Project Tasks Table (Dynamic Checklist)
CREATE TABLE public.project_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'hold_point', 'inspection')),
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    requires_picture BOOLEAN DEFAULT false,
    dependent_on_task_ids UUID[] DEFAULT '{}', -- Array of Task UUIDs that must be complete first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can view project tasks." ON public.project_tasks FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')));
CREATE POLICY "Employees can update their tasks." ON public.project_tasks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')));
CREATE POLICY "Admins and Foremen can manage project tasks." ON public.project_tasks FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman')));


-- 4. Create the Foreman Daily Reports Table
CREATE TABLE public.foreman_daily_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    foreman_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    report_date DATE NOT NULL,
    status_notes TEXT,
    task_completion_notes TEXT,
    closeout_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, report_date) -- Only one report per project per day
);

ALTER TABLE public.foreman_daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can view reports." ON public.foreman_daily_reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')));
CREATE POLICY "Foremen and Admins can manage reports." ON public.foreman_daily_reports FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman')));


-- 5. Create the Project Hours Table
CREATE TABLE public.project_hours (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    hours_worked NUMERIC(5, 2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.project_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can view project hours." ON public.project_hours FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee')));
CREATE POLICY "Foremen and Admins can manage project hours." ON public.project_hours FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman')));


-- 6. Create the Project Expenses Table (Materials & Subcontractor Bills)
CREATE TABLE public.project_expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    expense_type TEXT NOT NULL DEFAULT 'material' CHECK (expense_type IN ('material', 'subcontractor_bill', 'general')),
    description TEXT NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    date_incurred DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Foremen and Admins can view project expenses." ON public.project_expenses FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman')));
CREATE POLICY "Foremen and Admins can manage project expenses." ON public.project_expenses FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman')));


-- 7. Setup Storage Bucket for Project Files
INSERT INTO storage.buckets (id, name, public) VALUES ('project_files', 'project_files', false) ON CONFLICT (id) DO NOTHING;

-- Policies for project_files bucket
CREATE POLICY "Employees can view project files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'project_files' 
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee'))
);

CREATE POLICY "Employees can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'project_files' 
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee'))
);

CREATE POLICY "Admins and Foremen can manage project files"
ON storage.objects FOR ALL
USING (
    bucket_id = 'project_files' 
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);
