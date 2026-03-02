-- ==========================================
-- COTTLE CONSTRUCTION - EMPLOYEE HOURS SCHEMA UPDATE
-- ==========================================

DO $$
BEGIN
    -- Add approved column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_hours'
        AND column_name = 'approved'
    ) THEN
        ALTER TABLE public.project_hours ADD COLUMN approved BOOLEAN DEFAULT false;
    END IF;

    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_hours'
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.project_hours ADD COLUMN approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Drop existing policies that might conflict or be too restrictive
DROP POLICY IF EXISTS "Employees can insert their own project hours." ON public.project_hours;
DROP POLICY IF EXISTS "Employees can update their own unapproved project hours." ON public.project_hours;
DROP POLICY IF EXISTS "Employees can view their own, Foremen and Admins can view all project hours." ON public.project_hours;
DROP POLICY IF EXISTS "Employees can view project hours." ON public.project_hours;

-- View Policy: Employees can view their own hours, Foremen/Admins can view ALL hours
CREATE POLICY "Employees can view their own, Foremen and Admins can view all project hours."
    ON public.project_hours FOR SELECT
    USING (
        employee_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
    );

-- Insert Policy: Employees can log their own hours
CREATE POLICY "Employees can insert their own project hours."
    ON public.project_hours FOR INSERT
    WITH CHECK (
        employee_id = auth.uid() AND 
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman', 'employee'))
    );

-- Update Policy: Employees can update their own unapproved hours, Foremen/Admins can update any hours (including approving)
CREATE POLICY "Employees can update their own unapproved project hours."
    ON public.project_hours FOR UPDATE
    USING (
        (employee_id = auth.uid() AND approved = false) OR 
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
    );
