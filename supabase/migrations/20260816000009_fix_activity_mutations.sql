-- Migration: Explicitly DENY all direct mutations on activities table
-- Reason: Security testing revealed that authenticated users could perform direct INSERT, UPDATE, and DELETE operations.
-- This hardens the table to ensure only SECURITY DEFINER triggers can mutate it.

-- Ensure RLS is enabled
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 1. Explicitly DENY INSERT
DROP POLICY IF EXISTS "Deny direct inserts on activities" ON public.activities;
CREATE POLICY "Deny direct inserts on activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. Explicitly DENY UPDATE
DROP POLICY IF EXISTS "Deny direct updates on activities" ON public.activities;
CREATE POLICY "Deny direct updates on activities"
ON public.activities
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- 3. Explicitly DENY DELETE
DROP POLICY IF EXISTS "Deny direct deletes on activities" ON public.activities;
CREATE POLICY "Deny direct deletes on activities"
ON public.activities
FOR DELETE
TO authenticated
USING (false);
