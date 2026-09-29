
-- App role enum
create type public.app_role as enum ('super_admin', 'admin_module', 'caissier', 'client');

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: users read own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "Profiles: users update own"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  assigned_modules text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer helper
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Roles: users read own"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create policy "Roles: super_admin read all"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "Roles: super_admin insert"
  on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'super_admin'));

create policy "Roles: super_admin update"
  on public.user_roles for update to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "Roles: super_admin delete"
  on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

-- Super admin can also read/update all profiles
create policy "Profiles: super_admin read all"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "Profiles: super_admin update all"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "Profiles: super_admin insert"
  on public.profiles for insert to authenticated
  with check (public.has_role(auth.uid(), 'super_admin') or id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'client')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Platform settings (singleton)
create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  web_enabled boolean not null default true,
  mobile_enabled boolean not null default true,
  desktop_enabled boolean not null default true,
  web_domain text,
  mobile_min_version text,
  desktop_min_version text,
  force_mobile_update boolean not null default false,
  force_desktop_update boolean not null default false,
  auto_update_enabled boolean not null default true,
  realtime_enabled boolean not null default true,
  offline_mode_enabled boolean not null default false,
  max_sessions_per_user int not null default 5,
  session_timeout_minutes int not null default 120,
  enable_two_factor_auth boolean not null default false,
  email_notifications_enabled boolean not null default true,
  push_notifications_enabled boolean not null default true,
  sms_notifications_enabled boolean not null default false,
  maintenance_mode boolean not null default false,
  active_modules text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

create policy "Settings: authenticated read"
  on public.platform_settings for select to authenticated
  using (true);

create policy "Settings: super_admin insert"
  on public.platform_settings for insert to authenticated
  with check (public.has_role(auth.uid(), 'super_admin'));

create policy "Settings: super_admin update"
  on public.platform_settings for update to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

-- Seed one row
insert into public.platform_settings default values;

-- Audit logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "Audit: super_admin read"
  on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create policy "Audit: authenticated insert own"
  on public.audit_logs for insert to authenticated
  with check (actor_id = auth.uid());

create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
