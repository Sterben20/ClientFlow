-- Migration: Sprint 2.5 Fix - Ensure metadata column exists
-- If the column already exists, this does nothing but reloads the PostgREST cache.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'activities'
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.activities ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;
-- Execute a dummy alter to force PostgREST schema cache reload on Supabase
COMMENT ON TABLE public.activities IS 'Activity timeline events';
