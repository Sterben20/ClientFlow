-- Migration: Harden Activities Append Only (Sprint 2.5)

-- 1. DROP EXISTING PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Members can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Members can update activities" ON public.activities;
DROP POLICY IF EXISTS "Admins and Owners can delete activities" ON public.activities;

-- 2. DROP PREVIOUS DENY POLICIES
DROP POLICY IF EXISTS "Deny direct inserts on activities" ON public.activities;
DROP POLICY IF EXISTS "Deny direct updates on activities" ON public.activities;
DROP POLICY IF EXISTS "Deny direct deletes on activities" ON public.activities;

-- 3. VERIFY APPEND-ONLY STATE
-- The only policy left should be: "Users can view activities in their workspace"
-- This guarantees default-deny for INSERT/UPDATE/DELETE.

-- 4. CLEANUP RPC
-- Removing the diagnostic RPC from the production DB
DROP FUNCTION IF EXISTS public.get_all_policies();
