-- 20260813000001_client_notes.sql

-- 1. Create client_notes table
CREATE TABLE IF NOT EXISTS public.client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Constraints
-- Enforce content length (1-10000 chars) after trimming
ALTER TABLE public.client_notes 
  ADD CONSTRAINT client_notes_content_check 
  CHECK (length(trim(content)) > 0 AND length(content) <= 10000);

-- 3. Triggers for consistency and updated_at
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_client_notes_updated_at
BEFORE UPDATE ON public.client_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Workspace consistency trigger
CREATE OR REPLACE FUNCTION public.check_client_note_workspace()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clients 
    WHERE id = NEW.client_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Workspace mismatch between note and client';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_client_note_workspace
BEFORE INSERT OR UPDATE ON public.client_notes
FOR EACH ROW
EXECUTE FUNCTION public.check_client_note_workspace();

-- 4. Enable RLS
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- SELECT (View): Members can view client notes in their workspace
CREATE POLICY "Members can view client notes" 
  ON public.client_notes FOR SELECT 
  USING (public.has_workspace_access(workspace_id));

-- INSERT (Create): Members can insert client notes in their workspace
CREATE POLICY "Members can insert client notes" 
  ON public.client_notes FOR INSERT 
  WITH CHECK (
    public.has_workspace_access(workspace_id) 
    -- Author spoofing is prevented by Server Actions, but RLS adds a boundary
    AND author_id = auth.uid()
  );

-- UPDATE (Edit): Admins/Owners can edit ANY note. Members can edit OWN note.
CREATE POLICY "Users can update client notes" 
  ON public.client_notes FOR UPDATE 
  USING (
    public.has_workspace_access(workspace_id) AND (
      public.has_workspace_admin_access(workspace_id) OR author_id = auth.uid()
    )
  );

-- DELETE (Remove): Admins/Owners can delete ANY note. Members can delete OWN note.
CREATE POLICY "Users can delete client notes" 
  ON public.client_notes FOR DELETE 
  USING (
    public.has_workspace_access(workspace_id) AND (
      public.has_workspace_admin_access(workspace_id) OR author_id = auth.uid()
    )
  );

-- 5. Indexes
CREATE INDEX idx_client_notes_client_id_created_at ON public.client_notes(client_id, created_at DESC);
