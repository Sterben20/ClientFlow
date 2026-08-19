-- Migration: Add created_by to clients

-- 1. Add created_by column
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Creator Immutability (Fail Closed)
CREATE OR REPLACE FUNCTION public.prevent_client_creator_change()
RETURNS trigger AS $$
BEGIN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'Client creator cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_client_creator_change ON public.clients;
CREATE TRIGGER prevent_client_creator_change
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_client_creator_change();
