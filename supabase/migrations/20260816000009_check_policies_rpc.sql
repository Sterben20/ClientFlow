CREATE OR REPLACE FUNCTION public.get_all_policies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(p)) INTO result
    FROM pg_policies p
    WHERE tablename = 'activities';
    RETURN result;
END;
$$;
