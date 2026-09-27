-- LUC BRICO-TECH V3 — Supabase / PostgreSQL
create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin','manager','employee');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role public.user_role not null default 'employee',
 phone text,
 email text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

-- Migration de compatibilité si la table profiles existe déjà.
alter table public.profiles add column if not exists email text;

create table if not exists public.sales(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 customer text not null, item text not null, quantity numeric not null default 1,
 amount numeric not null default 0, payment_method text default 'cash', status text default 'paid',
 notes text, created_at timestamptz not null default now()
);
create table if not exists public.purchases(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 supplier text not null, item text not null, quantity numeric not null default 1,
 amount numeric not null default 0, status text default 'received', notes text, created_at timestamptz not null default now()
);
create table if not exists public.expenses(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 category text not null, label text not null, amount numeric not null default 0,
 beneficiary text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.stock_items(
 id uuid primary key default gen_random_uuid(), name text not null, category text,
 unit text default 'pcs', quantity numeric not null default 0, min_quantity numeric not null default 0,
 location text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.stock_movements(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 stock_item_id uuid not null references public.stock_items(id) on delete cascade,
 movement_type text not null check(movement_type in ('in','out','return','adjustment')),
 quantity numeric not null, reason text, project_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.activities(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 title text not null, category text, description text, location text, status text default 'open',
 amount numeric default 0, created_at timestamptz not null default now()
);
create table if not exists public.projects(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 name text not null, client text, description text, status text default 'planned',
 progress numeric default 0, budget numeric default 0, created_at timestamptz not null default now()
);
create table if not exists public.innovations(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 title text not null, description text, stage text default 'idea',
 budget numeric default 0, progress numeric default 0, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs(
 id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id),
 action text not null, entity text not null, entity_id uuid, details jsonb, created_at timestamptz not null default now()
);
create table if not exists public.settings(
 id uuid primary key default gen_random_uuid(), user_id uuid unique references public.profiles(id),
 company_name text default 'LUC BRICO-TECH', address text default 'Hévié Hounzévié, Abomey-Calavi',
 phone text default '01 67 02 84 91', email text, updated_at timestamptz default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.active=true) $$;
create or replace function public.is_manager_or_admin() returns boolean
language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','manager') and p.active=true) $$;

alter table public.profiles enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.expenses enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.activities enable row level security;
alter table public.projects enable row level security;
alter table public.innovations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using(id=auth.uid() or public.is_admin());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all using(public.is_admin()) with check(public.is_admin());

-- Own records for employees; managers/admins can supervise.
do $$
declare t text;
begin
 foreach t in array array['sales','purchases','expenses','activities','projects','innovations'] loop
   execute format('drop policy if exists %I_read on public.%I',t,t);
   execute format('create policy %I_read on public.%I for select using(user_id=auth.uid() or public.is_manager_or_admin())',t,t);
   execute format('drop policy if exists %I_insert on public.%I',t,t);
   execute format('create policy %I_insert on public.%I for insert with check(user_id=auth.uid())',t,t);
   execute format('drop policy if exists %I_update on public.%I',t,t);
   execute format('create policy %I_update on public.%I for update using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin())',t,t);
   execute format('drop policy if exists %I_delete on public.%I',t,t);
   execute format('create policy %I_delete on public.%I for delete using(public.is_admin())',t,t);
 end loop;
end $$;

create policy stock_items_read on public.stock_items for select to authenticated using(true);
create policy stock_items_admin on public.stock_items for all using(public.is_admin()) with check(public.is_admin());
create policy stock_moves_read on public.stock_movements for select using(user_id=auth.uid() or public.is_manager_or_admin());
create policy stock_moves_insert on public.stock_movements for insert with check(user_id=auth.uid());
create policy stock_moves_admin on public.stock_movements for delete using(public.is_admin());

create policy audit_read on public.audit_logs for select using(user_id=auth.uid() or public.is_manager_or_admin());
create policy audit_insert on public.audit_logs for insert with check(user_id=auth.uid());
create policy settings_self on public.settings for select using(user_id=auth.uid() or public.is_admin());
create policy settings_write on public.settings for all using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
 insert into public.profiles(id,full_name,email,phone)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,coalesce(new.raw_user_meta_data->>'phone',''));
 insert into public.settings(user_id) values(new.id);
 return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Après création du premier compte administrateur, exécuter :
-- update public.profiles set role='admin' where id=(select id from auth.users where email='VOTRE_EMAIL');
