-- 1. Create a specific function for Owner access
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the old permissive UPDATE policy
DROP POLICY IF EXISTS "Admins and Owners can update memberships" ON public.memberships;

-- 3. Create the new strict UPDATE policy restricted to Owners
CREATE POLICY "Only Owners can update memberships" 
  ON public.memberships FOR UPDATE 
  USING (has_workspace_owner_access(workspace_id));
