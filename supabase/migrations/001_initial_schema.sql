-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Users profile table (mirrors auth.users)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  expo_push_token text,
  created_at  timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Plans table
create table public.plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  name            text not null,
  activity_type   text not null check (activity_type in ('trip','outdoor_event','laundry','workout','market_run')),
  date            date not null,
  time            time not null,
  location_name   text not null,
  latitude        double precision not null,
  longitude       double precision not null,
  weather_verdict text check (weather_verdict in ('green','amber','red')),
  notified_at     timestamptz,
  created_at      timestamptz default now()
);

alter table public.plans enable row level security;

create policy "Users can manage their own plans"
  on public.plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index plans_user_date_idx on public.plans (user_id, date);

-- Notifications log
create table public.notifications_log (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references public.plans(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  sent_at   timestamptz default now(),
  verdict   text not null check (verdict in ('amber','red')),
  message   text not null
);

alter table public.notifications_log enable row level security;

create policy "Users can read their own notification logs"
  on public.notifications_log for select
  using (auth.uid() = user_id);
