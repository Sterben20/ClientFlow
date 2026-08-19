-- Sprint 2.3 - Progress Rule Enforcement
-- Business rule: If progress is 100, status must be 'completed'
-- This prevents a malicious payload from storing progress=100 and status='active'

ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS projects_completion_rule;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_completion_rule CHECK (progress < 100 OR status = 'completed');
