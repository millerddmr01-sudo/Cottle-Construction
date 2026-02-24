-- ==========================================
-- PROJECT CHANGE ORDERS SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.project_change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    details TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.project_change_orders ENABLE ROW LEVEL SECURITY;

-- Admins and foremen can read and write all change orders
DROP POLICY IF EXISTS "Admins and Foremen can manage change orders" ON public.project_change_orders;
CREATE POLICY "Admins and Foremen can manage change orders" 
ON public.project_change_orders 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'foreman')
  )
);

-- Employees can read change orders
DROP POLICY IF EXISTS "Employees can read change orders" ON public.project_change_orders;
CREATE POLICY "Employees can read change orders" 
ON public.project_change_orders 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'employee'
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_project_change_orders_project_id ON public.project_change_orders(project_id);
