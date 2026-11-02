-- Migration 006: Auto-enroll Project Managers as ACCEPTED project members

-- 1. Backfill all existing projects so every projects.pm_user_id has an ACCEPTED membership row
INSERT INTO public.project_members (project_id, user_id, invitation_status)
SELECT id, pm_user_id, 'ACCEPTED'
FROM public.projects
WHERE pm_user_id IS NOT NULL
ON CONFLICT (project_id, user_id)
DO UPDATE SET invitation_status = 'ACCEPTED';

-- 2. Trigger function to automatically ensure project creator/PM is always an ACCEPTED project member
CREATE OR REPLACE FUNCTION public.handle_project_pm_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pm_user_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, invitation_status)
    VALUES (NEW.id, NEW.pm_user_id, 'ACCEPTED')
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET invitation_status = 'ACCEPTED';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach trigger to public.projects for INSERT and UPDATE OF pm_user_id
DROP TRIGGER IF EXISTS trg_project_pm_membership ON public.projects;
CREATE TRIGGER trg_project_pm_membership
AFTER INSERT OR UPDATE OF pm_user_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_pm_membership();
