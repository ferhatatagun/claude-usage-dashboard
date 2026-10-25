-- claude-usage-dashboard (Supabase ref: vfxdhcduskaozvwoejgj, eu-central-1, PG 17)
-- Yedek tarihi: 2026-10-25
-- Kaynak: supabase_migrations.schema_migrations (10 migration, sırayla birleştirildi)
-- Geri yükleme: önce yeni projede auth şeması hazır olmalı (Supabase varsayılan), sonra bu dosya, sonra data.sql

-- ========== 20260921130722_initial_schema ==========
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_type text not null check (plan_type in ('team', 'enterprise')),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')) default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- API keys: the actual secret lives in Supabase Vault (vault.secrets),
-- this table only stores metadata + a pointer to the vault secret.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vault_secret_id uuid not null,
  key_type text not null check (key_type in ('admin_usage_cost', 'enterprise_analytics')),
  key_preview text not null,
  created_by uuid not null references auth.users(id),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_email text not null,
  model text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric(12,4) not null default 0,
  usage_date date not null,
  source text not null check (source in ('api', 'csv_upload')),
  created_at timestamptz not null default now(),
  unique (org_id, user_email, model, usage_date, source)
);

create index idx_usage_records_org_date on public.usage_records (org_id, usage_date desc);
create index idx_organization_members_user on public.organization_members (user_id);
create index idx_api_keys_org on public.api_keys (org_id) where revoked_at is null;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.usage_records enable row level security;

create policy "members can view own org"
on public.organizations for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = organizations.id and m.user_id = (select auth.uid())
  )
);

create policy "members can view org members"
on public.organization_members for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = organization_members.org_id and m.user_id = (select auth.uid())
  )
);

create policy "admins can view api_keys"
on public.api_keys for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = api_keys.org_id and m.user_id = (select auth.uid()) and m.role = 'admin'
  )
);

create policy "admins can insert api_keys"
on public.api_keys for insert
to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.org_id = api_keys.org_id and m.user_id = (select auth.uid()) and m.role = 'admin'
  )
);

create policy "admins can update api_keys"
on public.api_keys for update
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = api_keys.org_id and m.user_id = (select auth.uid()) and m.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.org_id = api_keys.org_id and m.user_id = (select auth.uid()) and m.role = 'admin'
  )
);

create policy "admins can delete api_keys"
on public.api_keys for delete
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = api_keys.org_id and m.user_id = (select auth.uid()) and m.role = 'admin'
  )
);

create policy "members can view usage_records"
on public.usage_records for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = usage_records.org_id and m.user_id = (select auth.uid())
  )
);

-- ========== 20260921131930_organization_invites ==========
create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create index organization_invites_email_idx on public.organization_invites (email);

alter table public.organization_invites enable row level security;

create policy "admins can view org invites"
on public.organization_invites for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = organization_invites.org_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  )
);

create policy "invitees can view their own invites"
on public.organization_invites for select
to authenticated
using (email = (select auth.jwt() ->> 'email'));

create policy "admins can create org invites"
on public.organization_invites for insert
to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.org_id = organization_invites.org_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  )
);

create policy "admins can revoke org invites"
on public.organization_invites for delete
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = organization_invites.org_id
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  )
);

-- ========== 20260921210021_api_key_vault_helpers ==========
create unique index if not exists api_keys_one_active_per_type_idx
  on public.api_keys (org_id, key_type)
  where revoked_at is null;

create or replace function public.store_api_key(
  p_org_id uuid,
  p_key_type text,
  p_secret text,
  p_preview text,
  p_created_by uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_api_key_id uuid;
begin
  if p_secret is null or length(trim(p_secret)) = 0 then
    raise exception 'secret bos olamaz';
  end if;

  perform public.revoke_api_key(id)
  from public.api_keys
  where org_id = p_org_id and key_type = p_key_type and revoked_at is null;

  v_secret_id := vault.create_secret(
    p_secret,
    'api_key:' || p_org_id::text || ':' || p_key_type || ':' || gen_random_uuid()::text,
    'Claude Usage Dashboard - ' || p_key_type
  );

  insert into public.api_keys (org_id, vault_secret_id, key_type, key_preview, created_by)
  values (p_org_id, v_secret_id, p_key_type, p_preview, p_created_by)
  returning id into v_api_key_id;

  return v_api_key_id;
end;
$$;

create or replace function public.revoke_api_key(p_api_key_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  update public.api_keys
  set revoked_at = now()
  where id = p_api_key_id and revoked_at is null
  returning vault_secret_id into v_secret_id;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;
end;
$$;

create or replace function public.read_api_key(p_api_key_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select s.decrypted_secret into v_secret
  from public.api_keys k
  join vault.decrypted_secrets s on s.id = k.vault_secret_id
  where k.id = p_api_key_id and k.revoked_at is null;

  if v_secret is not null then
    update public.api_keys set last_used_at = now() where id = p_api_key_id;
  end if;

  return v_secret;
end;
$$;

revoke execute on function public.store_api_key(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.revoke_api_key(uuid) from public, anon, authenticated;
revoke execute on function public.read_api_key(uuid) from public, anon, authenticated;

grant execute on function public.store_api_key(uuid, text, text, text, uuid) to service_role;
grant execute on function public.revoke_api_key(uuid) to service_role;
grant execute on function public.read_api_key(uuid) to service_role;

-- ========== 20260921210843_usage_cost_daily ==========
create table if not exists public.usage_daily (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  usage_date date not null,
  model text not null default '',
  uncached_input_tokens bigint not null default 0,
  cache_read_input_tokens bigint not null default 0,
  cache_creation_input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  web_search_requests bigint not null default 0,
  synced_at timestamptz not null default now()
);

create unique index if not exists usage_daily_org_date_model_idx
  on public.usage_daily (org_id, usage_date, model);

create index if not exists usage_daily_org_date_idx
  on public.usage_daily (org_id, usage_date desc);

create table if not exists public.cost_daily (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  usage_date date not null,
  description text not null default '',
  amount_cents numeric(20, 6) not null default 0,
  currency text not null default 'USD',
  synced_at timestamptz not null default now()
);

create unique index if not exists cost_daily_org_date_desc_idx
  on public.cost_daily (org_id, usage_date, description);

create index if not exists cost_daily_org_date_idx
  on public.cost_daily (org_id, usage_date desc);

alter table public.usage_daily enable row level security;
alter table public.cost_daily enable row level security;

create policy "usage_daily_select_own_org" on public.usage_daily
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = usage_daily.org_id
        and m.user_id = (select auth.uid())
    )
  );

create policy "cost_daily_select_own_org" on public.cost_daily
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = cost_daily.org_id
        and m.user_id = (select auth.uid())
    )
  );

-- ========== 20260922205722_restrict_usage_records_to_admins ==========
drop policy if exists "members can view usage_records" on usage_records;

create policy "admins can view usage_records"
  on usage_records
  for select
  to authenticated
  using (
    exists (
      select 1
      from organization_members m
      where m.org_id = usage_records.org_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

-- ========== 20260922212226_platform_admins ==========
create table if not exists platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from platform_admins p where p.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- ========== 20260922212241_platform_admin_read_policies ==========
create policy "platform admins can view organizations"
  on organizations for select to authenticated
  using (public.is_platform_admin());

create policy "platform admins can view org members"
  on organization_members for select to authenticated
  using (public.is_platform_admin());

create policy "platform admins can view org invites"
  on organization_invites for select to authenticated
  using (public.is_platform_admin());

create policy "platform admins can view usage_daily"
  on usage_daily for select to authenticated
  using (public.is_platform_admin());

create policy "platform admins can view cost_daily"
  on cost_daily for select to authenticated
  using (public.is_platform_admin());

create policy "platform admins can view usage_records"
  on usage_records for select to authenticated
  using (public.is_platform_admin());

create policy "platform admins can view api_keys"
  on api_keys for select to authenticated
  using (public.is_platform_admin());

-- ========== 20260922212456_restrict_is_platform_admin_execute ==========
revoke execute on function public.is_platform_admin() from anon;

-- ========== 20260924084403_fix_org_members_select_recursion ==========
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
  select exists (
    select 1 from organization_members
    where org_id = target_org_id and user_id = (select auth.uid())
  );
$$;

drop policy if exists "members can view org members" on public.organization_members;

create policy "members can view org members"
on public.organization_members
for select
to authenticated
using (is_org_member(org_id));

-- ========== 20260924084621_add_theme_preferences ==========
alter table public.organizations
  add column theme_font text,
  add column theme_color text;

alter table public.organizations
  add constraint organizations_theme_font_check
    check (theme_font is null or theme_font = any (array['geist','inter','ibm-plex','system'])),
  add constraint organizations_theme_color_check
    check (theme_color is null or theme_color ~ '^#[0-9a-fA-F]{6}$');

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_font text,
  theme_color text,
  updated_at timestamptz not null default now(),
  constraint user_preferences_theme_font_check
    check (theme_font is null or theme_font = any (array['geist','inter','ibm-plex','system'])),
  constraint user_preferences_theme_color_check
    check (theme_color is null or theme_color ~ '^#[0-9a-fA-F]{6}$')
);

alter table public.user_preferences enable row level security;

create policy "users manage own preferences"
on public.user_preferences
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
