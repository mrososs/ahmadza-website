-- Supabase grants EXECUTE on new public functions to anon by default. Every policy that calls
-- is_active_admin() is scoped to `authenticated`, so anonymous callers never need it.
revoke execute on function public.is_active_admin() from anon;
