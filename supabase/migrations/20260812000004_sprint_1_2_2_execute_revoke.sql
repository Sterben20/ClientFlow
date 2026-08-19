-- Revoke EXECUTE from PUBLIC for internal trigger functions

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_invitation_role_escalation() FROM PUBLIC;
