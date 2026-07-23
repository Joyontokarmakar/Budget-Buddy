-- =========================================================================
-- BUDGET BUDDY - FULL UNIFIED DATABASE SCHEMA SETUP
-- =========================================================================

-- Clean setup: Wipe any existing public tables and start fresh
drop schema if exists public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to public;

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Profiles Table
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text,
    email text,
    preferred_language text default 'de' check (preferred_language in ('en', 'de', 'bn', 'hi', 'ar', 'tr')),
    theme_preference text default 'system' check (theme_preference in ('light', 'dark', 'system')),
    monthly_budget numeric(10, 2) default 700.00 check (monthly_budget >= 0),
    avatar_url text,
    gemini_api_key text,
    show_status_dots boolean default true,
    status_dots_count int default 40,
    show_shop_name boolean default true,
    onboarded boolean default false,
    residence_country text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- 3. Create Accounts Table
create table public.accounts (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    type text not null check (type in ('bank', 'savings', 'cash')),
    balance numeric(12, 2) default 0.00 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Accounts
alter table public.accounts enable row level security;

-- 4. Create Categories Table
create table public.categories (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade, -- null means global system default
    name text not null,
    icon text, -- Lucide icon name
    color text, -- CSS class or hex
    is_monthly_bill boolean default false,
    monthly_amount numeric(10, 2) default 0.00,
    preferred_account_id uuid references public.accounts(id) on delete set null,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, name)
);

-- Enable RLS on Categories
alter table public.categories enable row level security;

-- 5. Create Stores Table
create table public.stores (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade, -- null means global system default
    name text not null,
    rendering_name text,
    country text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, name)
);

-- Enable RLS on Stores
alter table public.stores enable row level security;

-- 6. Create Expenses Table
create table public.expenses (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    date date default current_date not null,
    amount numeric(10, 2) not null check (amount >= 0),
    category_id uuid references public.categories(id) on delete set null,
    store_id uuid references public.stores(id) on delete set null,
    payment_account_id uuid references public.accounts(id) on delete cascade not null,
    notes text,
    receipt_url text,
    items jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Expenses
alter table public.expenses enable row level security;

-- 7. Create Income Table
create table public.income (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    date date default current_date not null,
    amount numeric(10, 2) not null check (amount > 0),
    type text not null, -- generic classification
    source_name text, -- custom source name
    notes text,
    destination_account_id uuid references public.accounts(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Income
alter table public.income enable row level security;

-- 8. Create Receipts Table
create table public.receipts (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    receipt_url text not null,
    extracted_store_name text,
    extracted_date date,
    extracted_amount numeric(10, 2),
    status text default 'pending' check (status in ('pending', 'processed', 'failed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Receipts
alter table public.receipts enable row level security;

-- 9. Create Permanent Assets Table
create table public.permanent_assets (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    store text not null,
    price numeric(10, 2) not null check (price > 0),
    date date default current_date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Permanent Assets
alter table public.permanent_assets enable row level security;

-- 10. Create User Sessions Table
create table if not exists public.user_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    session_key text not null,
    user_agent text not null,
    device_name text not null,
    last_active_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, session_key)
);

-- Enable RLS on User Sessions
alter table public.user_sessions enable row level security;

-- 11. Create Deposits Table
create table public.deposits (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    amount numeric(10, 2) not null check (amount > 0),
    date date default current_date not null,
    time time without time zone default current_time not null,
    to_account_id uuid references public.accounts(id) on delete cascade not null,
    source text not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Deposits
alter table public.deposits enable row level security;

-- 12. Create Loans Table
create table public.loans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    type text not null check (type in ('taken', 'provided')),
    person text not null,
    amount numeric(10, 2) not null check (amount > 0),
    remaining_amount numeric(10, 2) not null check (remaining_amount >= 0),
    date date default current_date not null,
    notes text,
    account_id uuid references public.accounts(id) on delete cascade not null,
    status text default 'active' not null check (status in ('active', 'settled')),
    payments jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Loans
alter table public.loans enable row level security;


-- =========================================================================
-- DATABASE TRIGGERS AND FUNCTIONS
-- =========================================================================

-- A. Profiles Auto-Creation from Auth User
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, preferred_language, theme_preference, monthly_budget, onboarded, residence_country, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Student'
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'de'),
    coalesce(new.raw_user_meta_data->>'theme_preference', 'system'),
    700.00,
    false,
    new.raw_user_meta_data->>'residence_country',
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- B. Categories Seeding Trigger for New Profile
create or replace function public.seed_new_user_categories()
returns trigger as $$
begin
  -- Copy global defaults to user's categories
  insert into public.categories (user_id, name, icon, color)
  select new.id, name, icon, color
  from public.categories
  where user_id is null
  on conflict (user_id, name) do nothing;
  
  -- Set default amounts/flags for standard recurring bills
  update public.categories
  set is_monthly_bill = true,
      monthly_amount = case 
        when lower(name) = 'house rent' then 264.50
        when lower(name) = 'health insurance' then 151.42
        when lower(name) = 'radio bill' then 18.36
        when lower(name) = 'mobile bill' then 10.00
        else 0.00
      end
  where user_id = new.id and lower(name) in ('house rent', 'health insurance', 'radio bill', 'mobile bill');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_seed_categories on public.profiles;
create trigger on_profile_created_seed_categories
  after insert on public.profiles
  for each row
  execute function public.seed_new_user_categories();

-- C. Stores Seeding Trigger for New Profile
create or replace function public.seed_new_user_stores()
returns trigger as $$
begin
  -- First seed default stores for their specific country
  insert into public.stores (user_id, name)
  select new.id, name
  from public.stores
  where user_id is null and country = new.residence_country
  on conflict (user_id, name) do nothing;

  -- If they have no country-specific stores seeded, fallback to seeding global stores (country is null)
  if not exists (select 1 from public.stores where user_id = new.id) then
    insert into public.stores (user_id, name)
    select new.id, name
    from public.stores
    where user_id is null and country is null
    on conflict (user_id, name) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_seed_stores on public.profiles;
create trigger on_profile_created_seed_stores
  after insert on public.profiles
  for each row
  execute function public.seed_new_user_stores();

-- D. Expense Balance Triggers
create or replace function public.adjust_balance_on_expense_insert()
returns trigger as $$
begin
  update public.accounts
  set balance = balance - new.amount
  where id = new.payment_account_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_expense_insert on public.expenses;
create trigger on_expense_insert
  after insert on public.expenses
  for each row execute procedure public.adjust_balance_on_expense_insert();

create or replace function public.adjust_balance_on_expense_update()
returns trigger as $$
begin
  if old.payment_account_id = new.payment_account_id then
    update public.accounts
    set balance = balance + old.amount - new.amount
    where id = new.payment_account_id;
  else
    update public.accounts
    set balance = balance + old.amount
    where id = old.payment_account_id;
    update public.accounts
    set balance = balance - new.amount
    where id = new.payment_account_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_expense_update on public.expenses;
create trigger on_expense_update
  after update on public.expenses
  for each row execute procedure public.adjust_balance_on_expense_update();

create or replace function public.adjust_balance_on_expense_delete()
returns trigger as $$
begin
  update public.accounts
  set balance = balance + old.amount
  where id = old.payment_account_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_expense_delete on public.expenses;
create trigger on_expense_delete
  after delete on public.expenses
  for each row execute procedure public.adjust_balance_on_expense_delete();

-- E. Income Balance Triggers
create or replace function public.adjust_balance_on_income_insert()
returns trigger as $$
begin
  update public.accounts
  set balance = balance + new.amount
  where id = new.destination_account_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_income_insert on public.income;
create trigger on_income_insert
  after insert on public.income
  for each row execute procedure public.adjust_balance_on_income_insert();

create or replace function public.adjust_balance_on_income_update()
returns trigger as $$
begin
  if old.destination_account_id = new.destination_account_id then
    update public.accounts
    set balance = balance - old.amount + new.amount
    where id = new.destination_account_id;
  else
    update public.accounts
    set balance = balance - old.amount
    where id = old.destination_account_id;
    update public.accounts
    set balance = balance + new.amount
    where id = new.destination_account_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_income_update on public.income;
create trigger on_income_update
  after update on public.income
  for each row execute procedure public.adjust_balance_on_income_update();

create or replace function public.adjust_balance_on_income_delete()
returns trigger as $$
begin
  update public.accounts
  set balance = balance - old.amount
  where id = old.destination_account_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_income_delete on public.income;
create trigger on_income_delete
  after delete on public.income
  for each row execute procedure public.adjust_balance_on_income_delete();

-- F. Deposit Balance Triggers
create or replace function public.adjust_balance_on_deposit_insert()
returns trigger as $$
begin
  update public.accounts
  set balance = balance + new.amount
  where id = new.to_account_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_deposit_insert on public.deposits;
create trigger on_deposit_insert
  after insert on public.deposits
  for each row execute procedure public.adjust_balance_on_deposit_insert();

create or replace function public.adjust_balance_on_deposit_update()
returns trigger as $$
begin
  if old.to_account_id = new.to_account_id then
    update public.accounts
    set balance = balance - old.amount + new.amount
    where id = new.to_account_id;
  else
    update public.accounts
    set balance = balance - old.amount
    where id = old.to_account_id;
    update public.accounts
    set balance = balance + new.amount
    where id = new.to_account_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_deposit_update on public.deposits;
create trigger on_deposit_update
  after update on public.deposits
  for each row execute procedure public.adjust_balance_on_deposit_update();

create or replace function public.adjust_balance_on_deposit_delete()
returns trigger as $$
begin
  update public.accounts
  set balance = balance - old.amount
  where id = old.to_account_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_deposit_delete on public.deposits;
create trigger on_deposit_delete
  after delete on public.deposits
  for each row execute procedure public.adjust_balance_on_deposit_delete();

-- G. Loan Balance Triggers
create or replace function public.adjust_balance_on_loan_insert()
returns trigger as $$
begin
  if new.type = 'taken' then
    update public.accounts
    set balance = balance + new.amount
    where id = new.account_id;
  else
    update public.accounts
    set balance = balance - new.amount
    where id = new.account_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_loan_insert on public.loans;
create trigger on_loan_insert
  after insert on public.loans
  for each row execute procedure public.adjust_balance_on_loan_insert();

create or replace function public.adjust_balance_on_loan_update()
returns trigger as $$
declare
  old_factor numeric;
  new_factor numeric;
begin
  if old.type = 'taken' then old_factor := 1; else old_factor := -1; end if;
  if new.type = 'taken' then new_factor := 1; else new_factor := -1; end if;

  if old.account_id = new.account_id then
    update public.accounts
    set balance = balance - (old.amount * old_factor) + (new.amount * new_factor)
    where id = new.account_id;
  else
    update public.accounts
    set balance = balance - (old.amount * old_factor)
    where id = old.account_id;
    update public.accounts
    set balance = balance + (new.amount * new_factor)
    where id = new.account_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_loan_update on public.loans;
create trigger on_loan_update
  after update on public.loans
  for each row execute procedure public.adjust_balance_on_loan_update();

create or replace function public.adjust_balance_on_loan_delete()
returns trigger as $$
declare
  factor numeric;
  payment_rec record;
begin
  if old.type = 'taken' then factor := 1; else factor := -1; end if;
  
  update public.accounts
  set balance = balance - (old.amount * factor)
  where id = old.account_id;
  
  if old.payments is not null and jsonb_array_length(old.payments) > 0 then
    for payment_rec in 
      select (value->>'amount')::numeric as amt, (value->>'account_id')::uuid as acc_id
      from jsonb_array_elements(old.payments)
    loop
      if old.type = 'taken' then
        update public.accounts
        set balance = balance + payment_rec.amt
        where id = payment_rec.acc_id;
      else
        update public.accounts
        set balance = balance - payment_rec.amt
        where id = payment_rec.acc_id;
      end if;
    end loop;
  end if;

  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_loan_delete on public.loans;
create trigger on_loan_delete
  after delete on public.loans
  for each row execute procedure public.adjust_balance_on_loan_delete();


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Accounts
create policy "Users can view own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts" on public.accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts" on public.accounts for delete using (auth.uid() = user_id);

-- Categories
create policy "Users can view custom or global categories" on public.categories for select using (user_id is null or auth.uid() = user_id);
create policy "Users can insert custom categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update custom categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete custom categories" on public.categories for delete using (auth.uid() = user_id);

-- Stores
create policy "Users can view custom or global stores" on public.stores for select using (user_id is null or auth.uid() = user_id);
create policy "Users can insert custom stores" on public.stores for insert with check (auth.uid() = user_id);
create policy "Users can update custom stores" on public.stores for update using (auth.uid() = user_id);
create policy "Users can delete custom stores" on public.stores for delete using (auth.uid() = user_id);

-- Expenses
create policy "Users can view own expenses" on public.expenses for select using (auth.uid() = user_id);
create policy "Users can insert own expenses" on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses" on public.expenses for update using (auth.uid() = user_id);
create policy "Users can delete own expenses" on public.expenses for delete using (auth.uid() = user_id);

-- Income
create policy "Users can view own income" on public.income for select using (auth.uid() = user_id);
create policy "Users can insert own income" on public.income for insert with check (auth.uid() = user_id);
create policy "Users can update own income" on public.income for update using (auth.uid() = user_id);
create policy "Users can delete own income" on public.income for delete using (auth.uid() = user_id);

-- Receipts
create policy "Users can view own receipts" on public.receipts for select using (auth.uid() = user_id);
create policy "Users can insert own receipts" on public.receipts for insert with check (auth.uid() = user_id);
create policy "Users can update own receipts" on public.receipts for update using (auth.uid() = user_id);
create policy "Users can delete own receipts" on public.receipts for delete using (auth.uid() = user_id);

-- Permanent Assets
create policy "Users can view own permanent assets" on public.permanent_assets for select using (auth.uid() = user_id);
create policy "Users can insert own permanent assets" on public.permanent_assets for insert with check (auth.uid() = user_id);
create policy "Users can update own permanent assets" on public.permanent_assets for update using (auth.uid() = user_id);
create policy "Users can delete own permanent assets" on public.permanent_assets for delete using (auth.uid() = user_id);

-- User Sessions
create policy "Users can manage their own sessions" on public.user_sessions for all using (auth.uid() = user_id);

-- Deposits
create policy "Users can view own deposits" on public.deposits for select using (auth.uid() = user_id);
create policy "Users can insert own deposits" on public.deposits for insert with check (auth.uid() = user_id);
create policy "Users can update own deposits" on public.deposits for update using (auth.uid() = user_id);
create policy "Users can delete own deposits" on public.deposits for delete using (auth.uid() = user_id);

-- Loans
create policy "Users can view own loans" on public.loans for select using (auth.uid() = user_id);
create policy "Users can insert own loans" on public.loans for insert with check (auth.uid() = user_id);
create policy "Users can update own loans" on public.loans for update using (auth.uid() = user_id);
create policy "Users can delete own loans" on public.loans for delete using (auth.uid() = user_id);


-- =========================================================================
-- SEED SYSTEM DEFAULT DATA
-- =========================================================================

-- Seed Default Categories (Global ones with user_id NULL)
insert into public.categories (name, icon, color) values
  ('Food', 'ShoppingCart', '#10b981'),
  ('Kitchen ware', 'Utensils', '#f97316'),
  ('House rent', 'Home', '#f59e0b'),
  ('Health Insurance', 'HeartPulse', '#ef4444'),
  ('Radio Bill', 'Tv', '#3b82f6'),
  ('Mobile bill', 'Smartphone', '#6366f1'),
  ('Education', 'BookOpen', '#8b5cf6'),
  ('Shopping', 'Tag', '#ec4899'),
  ('Restaurant', 'Coffee', '#f43f5e'),
  ('Cosmetics', 'Sparkles', '#d946ef'),
  ('Medicine', 'Activity', '#14b8a6'),
  ('Book', 'BookOpen', '#a855f7'),
  ('Electronic', 'Laptop', '#0ea5e9'),
  ('Other', 'HelpCircle', '#6b7280'),
  ('Discount', 'Percent', '#10b981');

-- Seed Default Stores country-wise (Global ones with user_id NULL)
insert into public.stores (name, country) values
  -- Germany
  ('Lidl', 'Germany'),
  ('Aldi Süd', 'Germany'),
  ('Aldi Nord', 'Germany'),
  ('REWE', 'Germany'),
  ('EDEKA', 'Germany'),
  ('Kaufland', 'Germany'),
  ('dm-drogerie markt', 'Germany'),
  ('Rossmann', 'Germany'),
  ('Müller', 'Germany'),
  ('IKEA', 'Germany'),
  ('Decathlon', 'Germany'),
  ('Netto', 'Germany'),
  ('Penny', 'Germany'),
  ('Saturn', 'Germany'),
  ('MediaMarkt', 'Germany'),
  ('Amazon.de', 'Germany'),
  ('Washing Machine', 'Germany'),
  ('Flink', 'Germany'),
  ('Allan Pizza', 'Germany'),
  ('7 days curry & Pizza', 'Germany'),
  ('Delhi Masala', 'Germany'),
  ('Bollywood shop', 'Germany'),
  ('Fleischerei', 'Germany'),

  -- Bangladesh
  ('Shwapno', 'Bangladesh'),
  ('Agora', 'Bangladesh'),
  ('Meena Bazar', 'Bangladesh'),
  ('Daily Shopping', 'Bangladesh'),
  ('Unimart', 'Bangladesh'),
  ('Prince Bazar', 'Bangladesh'),
  ('Aarong', 'Bangladesh'),

  -- India
  ('Reliance Smart', 'India'),
  ('D-Mart', 'India'),
  ('Big Bazaar', 'India'),
  ('More Supermarket', 'India'),
  ('Spencer''s', 'India'),
  ('Star Bazaar', 'India'),
  ('JioMart', 'India'),

  -- United States
  ('Walmart', 'United States'),
  ('Target', 'United States'),
  ('Costco', 'United States'),
  ('Kroger', 'United States'),
  ('Whole Foods Market', 'United States'),
  ('Trader Joe''s', 'United States'),
  ('Walgreens', 'United States'),
  ('CVS Pharmacy', 'United States'),

  -- United Kingdom
  ('Tesco', 'United Kingdom'),
  ('Sainsbury''s', 'United Kingdom'),
  ('Asda', 'United Kingdom'),
  ('Morrisons', 'United Kingdom'),
  ('Co-op Food', 'United Kingdom'),
  ('Marks & Spencer', 'United Kingdom'),
  ('Boots', 'United Kingdom'),

  -- Global Fallback Defaults (country is null)
  ('Amazon', null),
  ('eBay', null),
  ('AliExpress', null),
  ('Uber / Rideshare', null),
  ('Local Grocery', null),
  ('Cafe & Restaurant', null);


-- =========================================================================
-- STORAGE BUCKETS SETUP
-- =========================================================================

-- 1. Create avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Allow public access to read avatars
drop policy if exists "Allow public read of avatars" on storage.objects;
create policy "Allow public read of avatars" on storage.objects
    for select using (bucket_id = 'avatars');

-- 3. Allow authenticated users to upload/manage avatars
drop policy if exists "Allow authenticated uploads of avatars" on storage.objects;
create policy "Allow authenticated uploads of avatars" on storage.objects
    for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Allow authenticated updates of avatars" on storage.objects;
create policy "Allow authenticated updates of avatars" on storage.objects
    for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Allow authenticated deletes of avatars" on storage.objects;
create policy "Allow authenticated deletes of avatars" on storage.objects
    for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- =========================================================================
-- GRANT PERMISSIONS TO SUPABASE ROLES
-- =========================================================================
grant usage on schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;

grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
