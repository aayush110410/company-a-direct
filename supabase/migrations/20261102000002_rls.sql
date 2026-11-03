-- Security model: browsers READ through row-level security; every WRITE goes through
-- the app server with the service role (or a service-role-only function).

alter table public.cities enable row level security;
alter table public.outlets enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_schedules enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_portions enable row level security;
alter table public.item_prices enable row level security;
alter table public.addons enable row level security;
alter table public.outlet_item_availability enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_contacts enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;
alter table public.prep_models enable row level security;
alter table public.prep_estimates enable row level security;
alter table public.alerts enable row level security;
alter table public.outbox_messages enable row level security;

revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;
revoke usage on sequence public.order_number_seq from anon, authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Helpers used inside policies. Security definer so they can read profiles under RLS.
create function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create function public.auth_outlet()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select outlet_id from public.profiles where id = auth.uid() $$;

-- Public menu and outlet data.
create policy "menu is public" on public.cities for select to anon, authenticated using (true);
create policy "menu is public" on public.outlets for select to anon, authenticated using (true);
create policy "menu is public" on public.categories for select to anon, authenticated using (true);
create policy "menu is public" on public.menu_schedules for select to anon, authenticated using (true);
create policy "menu is public" on public.menu_items for select to anon, authenticated using (true);
create policy "menu is public" on public.item_portions for select to anon, authenticated using (true);
create policy "menu is public" on public.item_prices for select to anon, authenticated using (true);
create policy "menu is public" on public.addons for select to anon, authenticated using (true);
create policy "menu is public" on public.outlet_item_availability for select to anon, authenticated using (true);

-- Profiles: you see only yourself. Admin screens use the service role.
create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());

-- Orders: the customer who placed it, staff of its outlet, or an admin.
create policy "order visibility" on public.orders for select to authenticated
  using (customer_id = auth.uid() or outlet_id = public.auth_outlet() or public.auth_role() = 'admin');

create policy "order visibility" on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or o.outlet_id = public.auth_outlet() or public.auth_role() = 'admin')
  ));

create policy "order visibility" on public.order_events for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or o.outlet_id = public.auth_outlet() or public.auth_role() = 'admin')
  ));

create policy "order visibility" on public.payments for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or o.outlet_id = public.auth_outlet() or public.auth_role() = 'admin')
  ));

create policy "order visibility" on public.prep_estimates for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or o.outlet_id = public.auth_outlet() or public.auth_role() = 'admin')
  ));

-- Phone and address: the ordering customer only. Kitchens never see them.
create policy "own contact details" on public.order_contacts for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));

create policy "outlet alerts" on public.alerts for select to authenticated
  using (outlet_id = public.auth_outlet() or public.auth_role() = 'admin');

-- coupons, prep_models, outbox_messages: no policies. Read on the server with the service role.
