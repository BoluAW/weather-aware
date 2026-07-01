-- Backup location/contingency: an alternate venue an organizer can fall back to
-- when weather looks bad at the original location.
alter table public.plans
  add column backup_location_name text,
  add column backup_latitude double precision,
  add column backup_longitude double precision;

-- Stakeholders: people associated with a plan (guests, vendors, co-organizers)
-- who can be notified when weather risk changes.
create table public.plan_stakeholders (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  notify      boolean not null default true,
  created_at  timestamptz default now()
);

alter table public.plan_stakeholders enable row level security;

create policy "Users manage stakeholders of their own plans"
  on public.plan_stakeholders for all
  using (plan_id in (select id from public.plans where user_id = auth.uid()))
  with check (plan_id in (select id from public.plans where user_id = auth.uid()));

create index plan_stakeholders_plan_idx on public.plan_stakeholders (plan_id);
