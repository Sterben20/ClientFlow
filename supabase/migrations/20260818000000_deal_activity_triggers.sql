-- Migration: Sprint 2.6 Deal Activity Triggers & Indexes

-- 1. Create indexes for Deals
CREATE INDEX IF NOT EXISTS idx_deals_workspace_id ON public.deals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON public.deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON public.deals(expected_close_date);

-- 2. Deal Activity Trigger Function
CREATE OR REPLACE FUNCTION public.handle_deal_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Actor ID cannot be null for deal activity';
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (NEW.workspace_id, v_actor_id, 'deal', NEW.id, 'deal.created', jsonb_build_object('name', NEW.name, 'client_id', NEW.client_id, 'owner_id', NEW.owner_id));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.stage IS DISTINCT FROM NEW.stage THEN
            INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
            VALUES (NEW.workspace_id, v_actor_id, 'deal', NEW.id, 'deal.stage_changed', jsonb_build_object('name', NEW.name, 'client_id', NEW.client_id, 'previous_stage', OLD.stage, 'new_stage', NEW.stage));
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activities (workspace_id, actor_id, entity_type, entity_id, action, metadata)
        VALUES (OLD.workspace_id, v_actor_id, 'deal', OLD.id, 'deal.deleted', jsonb_build_object('name', OLD.name, 'client_id', OLD.client_id));
    END IF;

    RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_deal_activity() FROM PUBLIC;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS on_deal_activity ON public.deals;
CREATE TRIGGER on_deal_activity
    AFTER INSERT OR UPDATE OF stage OR DELETE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.handle_deal_activity();
