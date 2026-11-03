-- The policy helpers only answer "what is my role / outlet", and only signed-in policies use them.
-- Functions are executable by PUBLIC by default; narrow that to signed-in users and the server.
revoke execute on function public.auth_role() from public, anon;
revoke execute on function public.auth_outlet() from public, anon;
grant execute on function public.auth_role() to authenticated, service_role;
grant execute on function public.auth_outlet() to authenticated, service_role;
