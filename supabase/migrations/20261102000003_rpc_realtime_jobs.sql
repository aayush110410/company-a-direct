-- State changes that must be atomic, the minute job, Realtime and Storage.
-- Every function here is security invoker and executable by service_role only.

-- Kitchen and system status moves. Single-winner: the update only matches the expected status.
create function public.transition_order(
  p_order_id text,
  p_from public.order_status,
  p_to public.order_status,
  p_actor uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  if p_to = 'placed' then
    raise exception 'use confirm_payment to place an order';
  end if;
  if p_to = 'cancelled' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'cancelling an order needs a reason';
  end if;

  update public.orders
  set status = p_to,
      preparing_at = case when p_to = 'preparing' then now() else preparing_at end,
      ready_at = case when p_to = 'ready' then now() else ready_at end,
      handed_at = case when p_to = 'handed_to_rider' then now() else handed_at end,
      delivered_at = case when p_to = 'delivered' then now() else delivered_at end,
      cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end,
      cancel_reason = case when p_to = 'cancelled' then p_reason else cancel_reason end
  where id = p_order_id and status = p_from;

  get diagnostics n = row_count;
  if n = 0 then
    return false;
  end if;

  insert into public.order_events (order_id, from_status, to_status, actor_id)
  values (p_order_id, p_from, p_to, p_actor);

  -- Record how long prep really took, for monitoring and retraining.
  if p_to = 'ready' then
    update public.prep_estimates pe
    set actual_minutes = ceil(extract(epoch from now() - o.paid_at) / 60)
    from public.orders o
    where o.id = p_order_id and pe.order_id = p_order_id and o.paid_at is not null;
  end if;

  return true;
end;
$$;

-- Payment success: one transaction sets the final promise, estimate, event, payment and message.
-- Returns 'placed' for the winner; any other caller gets the order's current status and writes nothing.
create function public.confirm_payment(
  p_order_id text,
  p_promised_at timestamptz,
  p_ready_by timestamptz,
  p_estimate jsonb,
  p_message jsonb
)
returns public.order_status
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
  current_status public.order_status;
begin
  update public.orders
  set status = 'placed',
      paid_at = now(),
      payment_status = 'succeeded',
      promised_at = p_promised_at,
      ready_by = p_ready_by
  where id = p_order_id and status = 'awaiting_payment';

  get diagnostics n = row_count;
  if n = 0 then
    select status into current_status from public.orders where id = p_order_id;
    return current_status;
  end if;

  insert into public.prep_estimates (
    order_id, model_version, features, predicted_minutes, p80_minutes, confidence,
    outlet_min_minutes, source, promised_at
  ) values (
    p_order_id,
    p_estimate ->> 'model_version',
    p_estimate -> 'features',
    (p_estimate ->> 'predicted_minutes')::integer,
    (p_estimate ->> 'p80_minutes')::integer,
    p_estimate ->> 'confidence',
    (p_estimate ->> 'outlet_min_minutes')::integer,
    (p_estimate ->> 'source')::public.estimate_source,
    p_promised_at
  );

  insert into public.order_events (order_id, from_status, to_status)
  values (p_order_id, 'awaiting_payment', 'placed');

  update public.payments set status = 'succeeded', updated_at = now() where order_id = p_order_id;

  if p_message is not null then
    insert into public.outbox_messages (channel, to_phone, purpose, template, body, order_id)
    values (
      (p_message ->> 'channel')::public.message_channel,
      p_message ->> 'to_phone',
      'transactional',
      p_message ->> 'template',
      p_message ->> 'body',
      p_order_id
    );
  end if;

  return 'placed';
end;
$$;

-- A manager moving the promise from the kitchen screen. Clears the late flag so a fresh
-- miss against the new promise alerts again.
create function public.override_promise(
  p_order_id text,
  p_promised_at timestamptz,
  p_ready_by timestamptz,
  p_reason text,
  p_actor uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer;
begin
  update public.orders
  set promised_at = p_promised_at, ready_by = p_ready_by, revised_eta = null, late_alerted_at = null
  where id = p_order_id and status in ('placed', 'preparing', 'ready');

  get diagnostics n = row_count;
  if n = 0 then
    return false;
  end if;

  update public.prep_estimates
  set source = 'manager_override', override_reason = p_reason, overridden_by = p_actor, promised_at = p_promised_at
  where order_id = p_order_id;

  return true;
end;
$$;

-- Runs every minute: expire unpaid orders, mock the delivery partner, raise late alerts.
-- `p_order_ids` scopes a run to specific orders (used by tests).
create function public.run_order_jobs(p_now timestamptz default now(), p_order_ids text[] default null)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_expired integer := 0;
  v_delivered integer := 0;
  v_late integer := 0;
  v_revised timestamptz;
  v_minutes integer;
begin
  -- 1. Unpaid for 15 minutes: expire. These never reached the kitchen.
  for r in
    select id from public.orders
    where status = 'awaiting_payment'
      and placed_at < p_now - interval '15 minutes'
      and (p_order_ids is null or id = any (p_order_ids))
    for update skip locked
  loop
    update public.orders set status = 'expired', payment_status = 'expired' where id = r.id;
    update public.payments set status = 'expired', updated_at = p_now where order_id = r.id and status = 'pending';
    insert into public.order_events (order_id, from_status, to_status, at) values (r.id, 'awaiting_payment', 'expired', p_now);
    v_expired := v_expired + 1;
  end loop;

  -- 2. Mock delivery partner: delivered once the travel time has passed after handoff.
  for r in
    select o.id, c.customer_phone
    from public.orders o
    join public.order_contacts c on c.order_id = o.id
    where o.status = 'handed_to_rider'
      and o.handed_at + o.travel_minutes * interval '1 minute' <= p_now
      and (p_order_ids is null or o.id = any (p_order_ids))
    for update of o skip locked
  loop
    update public.orders set status = 'delivered', delivered_at = p_now where id = r.id;
    insert into public.order_events (order_id, from_status, to_status, at) values (r.id, 'handed_to_rider', 'delivered', p_now);
    insert into public.outbox_messages (channel, to_phone, purpose, template, body, order_id)
    values ('whatsapp', r.customer_phone, 'transactional', 'order_delivered',
            format('Order %s delivered. Enjoy your meal!', r.id), r.id);
    v_delivered := v_delivered + 1;
  end loop;

  -- 3. More than 10 minutes past the promise and not delivered: alert once.
  for r in
    select o.id, o.outlet_id, o.status, o.promised_at, o.travel_minutes, c.customer_phone
    from public.orders o
    join public.order_contacts c on c.order_id = o.id
    where o.status in ('placed', 'preparing', 'ready', 'handed_to_rider')
      and p_now > o.promised_at + interval '10 minutes'
      and o.late_alerted_at is null
      and (p_order_ids is null or o.id = any (p_order_ids))
    for update of o skip locked
  loop
    v_revised := p_now + (r.travel_minutes + case r.status
      when 'placed' then 15 when 'preparing' then 10 when 'ready' then 5 else 0 end) * interval '1 minute';
    v_minutes := floor(extract(epoch from p_now - r.promised_at) / 60);

    update public.orders set late_alerted_at = p_now, revised_eta = v_revised where id = r.id;

    insert into public.alerts (outlet_id, order_id, kind, message)
    values (r.outlet_id, r.id, 'late', format('%s is %s min past its promise', r.id, v_minutes));

    insert into public.outbox_messages (channel, to_phone, purpose, template, body, order_id)
    values ('whatsapp', r.customer_phone, 'transactional', 'order_late',
            format('Sorry, order %s is running late. New estimate %s.', r.id,
                   to_char(v_revised at time zone 'Asia/Kolkata', 'FMHH12:MI am')), r.id);

    insert into public.outbox_messages (channel, to_phone, purpose, template, body, order_id)
    select 'sms', p.phone, 'transactional', 'manager_late',
           format('%s is %s min past its promise. Check the kitchen screen.', r.id, v_minutes), r.id
    from public.profiles p
    where p.role = 'outlet_manager' and p.outlet_id = r.outlet_id and p.phone is not null;

    v_late := v_late + 1;
  end loop;

  return jsonb_build_object('expired', v_expired, 'delivered', v_delivered, 'late', v_late);
end;
$$;

revoke execute on function public.transition_order(text, public.order_status, public.order_status, uuid, text) from public, anon, authenticated;
revoke execute on function public.confirm_payment(text, timestamptz, timestamptz, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.override_promise(text, timestamptz, timestamptz, text, uuid) from public, anon, authenticated;
revoke execute on function public.run_order_jobs(timestamptz, text[]) from public, anon, authenticated;
grant execute on function public.transition_order(text, public.order_status, public.order_status, uuid, text) to service_role;
grant execute on function public.confirm_payment(text, timestamptz, timestamptz, jsonb, jsonb) to service_role;
grant execute on function public.override_promise(text, timestamptz, timestamptz, text, uuid) to service_role;
grant execute on function public.run_order_jobs(timestamptz, text[]) to service_role;

-- Realtime: kitchen boards, customer status pages and live menu availability.
-- order_contacts and outbox_messages are deliberately not published.
alter publication supabase_realtime add table public.orders, public.alerts, public.outlet_item_availability;

-- Minute job.
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule('order-jobs') where exists (select 1 from cron.job where jobname = 'order-jobs');
select cron.schedule('order-jobs', '* * * * *', $$select public.run_order_jobs()$$);

-- Menu photos: public read; uploads only through server-issued signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
