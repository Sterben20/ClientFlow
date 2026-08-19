-- Hardening handle_new_user with SECURITY DEFINER and search_path = ''

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create personal workspace for the user
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'full_name', 'My') || ' Workspace')
  RETURNING id INTO new_workspace_id;
  
  -- SET TRUSTED PROVISIONING FLAG
  -- This is a transaction-local setting that cannot be forged by PostgREST
  -- because it is executed via a database trigger that runs outside the API context.
  PERFORM set_config('app.trusted_provisioning', 'true', true);
  
  -- Assign user as owner of their new workspace
  INSERT INTO public.memberships (workspace_id, profile_id, role)
  VALUES (new_workspace_id, new.id, 'owner');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = '';
