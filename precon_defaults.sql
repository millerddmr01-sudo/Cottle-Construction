-- ===========================================
-- AUTOMATIC PRE-CON CHECKLIST DEFAULTS
-- ===========================================

-- 1. Create the function that will execute when a new project is created
CREATE OR REPLACE FUNCTION public.create_default_precon_checklists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    section_1_id UUID;
    section_2_id UUID;
    section_3_id UUID;
BEGIN
    -- Section 1: Contract & Scope Clarity
    INSERT INTO public.project_checklist_sections (project_id, phase, title, sort_order, allowed_roles)
    VALUES (NEW.id, 'pre_con', 'Contract & Scope Clarity', 1, ARRAY['admin', 'foreman', 'employee'])
    RETURNING id INTO section_1_id;

    -- Section 2: Permits & Utility Coordination
    INSERT INTO public.project_checklist_sections (project_id, phase, title, sort_order, allowed_roles)
    VALUES (NEW.id, 'pre_con', 'Permits & Utility Coordination', 2, ARRAY['admin', 'foreman', 'employee'])
    RETURNING id INTO section_2_id;

    -- Section 3: Materials & Equipment
    INSERT INTO public.project_checklist_sections (project_id, phase, title, sort_order, allowed_roles)
    VALUES (NEW.id, 'pre_con', 'Materials & Equipment', 3, ARRAY['admin', 'foreman', 'employee'])
    RETURNING id INTO section_3_id;

    -- Insert default tasks into Section 1 (Contract & Scope Clarity)
    INSERT INTO public.project_tasks (project_id, section_id, title, sort_order, status, requires_picture)
    VALUES 
        (NEW.id, section_1_id, 'Signed Contract', 1, 'pending', false),
        (NEW.id, section_1_id, 'PO Received', 2, 'pending', false),
        (NEW.id, section_1_id, 'Scope reviewed line-by-line', 3, 'pending', false),
        (NEW.id, section_1_id, 'Plans & latest revisions printed / uploaded', 4, 'pending', false),
        (NEW.id, section_1_id, 'Bid quantities confirmed', 5, 'pending', false),
        (NEW.id, section_1_id, 'Allowances clarified', 6, 'pending', false),
        (NEW.id, section_1_id, 'Change order process confirmed', 7, 'pending', false),
        (NEW.id, section_1_id, 'Payment terms communicated and verified', 8, 'pending', false);

    RETURN NEW;
END;
$$;

-- 2. Create the trigger on the projects table
DROP TRIGGER IF EXISTS trg_create_default_precon_checklists ON public.projects;

CREATE TRIGGER trg_create_default_precon_checklists
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.create_default_precon_checklists();
