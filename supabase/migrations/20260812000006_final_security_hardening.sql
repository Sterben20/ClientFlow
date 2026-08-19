-- 1. Redefine has_workspace_owner_access with explicit search_path
CREATE OR REPLACE FUNCTION public.has_workspace_owner_access(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE workspace_id = ws_id 
    AND profile_id = auth.uid()
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = '';

-- 2. Revoke EXECUTE from PUBLIC
REVOKE EXECUTE ON FUNCTION public.has_workspace_owner_access(UUID) FROM PUBLIC;
