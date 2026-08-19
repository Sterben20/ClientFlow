-- Create index for clients workspace_id to optimize filtering by tenant
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id
ON public.clients(workspace_id);
