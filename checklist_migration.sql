-- 1. Create the new Sections table
CREATE TABLE IF NOT EXISTS public.project_checklist_sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    phase TEXT NOT NULL DEFAULT 'kickoff' CHECK (phase IN ('pre_con', 'kickoff', 'post_project')),
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['admin', 'foreman', 'employee'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.project_checklist_sections ENABLE ROW LEVEL SECURITY;

-- Allow users to view sections if their role is in the allowed_roles array
CREATE POLICY "Employees can view allowed sections" ON public.project_checklist_sections FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role::text = ANY(allowed_roles))
);

-- Admins and foremen can manage sections
CREATE POLICY "Admins and Foremen can manage sections" ON public.project_checklist_sections FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);

-- 2. Modify existing Tasks table
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.project_checklist_sections(id) ON DELETE CASCADE;

-- 3. Migration: Create a default 'Legacy Tasks' section for every project that has tasks, and move tasks into it
DO $$
DECLARE
    proj RECORD;
    new_section_id UUID;
BEGIN
    FOR proj IN SELECT DISTINCT project_id FROM public.project_tasks WHERE section_id IS NULL LOOP
        -- Create a legacy section for this project
        INSERT INTO public.project_checklist_sections (project_id, phase, title, sort_order)
        VALUES (proj.project_id, 'kickoff', 'Legacy Tasks', 0)
        RETURNING id INTO new_section_id;

        -- Update tasks for this project to point to the new section
        UPDATE public.project_tasks
        SET section_id = new_section_id
        WHERE project_id = proj.project_id AND section_id IS NULL;
    END LOOP;
END $$;
