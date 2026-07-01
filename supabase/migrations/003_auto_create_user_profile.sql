-- Auto-creates a public.users row whenever a new auth.users row is created,
-- so plans.user_id (FK -> public.users.id) never violates on a fresh signup.
-- This replaces relying solely on the app-side upsert in add-plan.tsx.

create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
