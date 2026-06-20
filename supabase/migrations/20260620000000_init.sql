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
    amount numeric(10, 2) not null check (amount > 0),
    category_id uuid references public.categories(id) on delete set null,
    store_id uuid references public.stores(id) on delete set null,
    payment_account_id uuid references public.accounts(id) on delete cascade not null,
    notes text,
    receipt_url text,
    items jsonb,
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
    type text not null check (type in ('werkstudent', 'scholarship', 'family', 'freelance', 'other')),
    notes text,
    destination_account_id uuid references public.accounts(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Income
alter table public.income enable row level security;

-- 8. Create Receipts Table (For pre-filled OCR uploads)
create table public.receipts (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    file_url text not null,
    extracted_store_name text,
    extracted_date date,
    extracted_amount numeric(10, 2),
    status text default 'pending' check (status in ('pending', 'processed', 'failed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Receipts
alter table public.receipts enable row level security;


-- =========================================================================
-- DATABASE TRIGGERS FOR BALANCES AND PROFILES
-- =========================================================================

-- A. Auto Profile Creation from Auth User
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, preferred_language, theme_preference, monthly_budget)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Student'),
    new.email,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'de'),
    coalesce(new.raw_user_meta_data->>'theme_preference', 'system'),
    700.00
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- B. Expense Balance Triggers
create or replace function public.adjust_balance_on_expense_insert()
returns trigger as $$
begin
  update public.accounts
  set balance = balance - new.amount
  where id = new.payment_account_id;
  return new;
end;
$$ language plpgsql security definer;

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

create trigger on_expense_delete
  after delete on public.expenses
  for each row execute procedure public.adjust_balance_on_expense_delete();


-- C. Income Balance Triggers
create or replace function public.adjust_balance_on_income_insert()
returns trigger as $$
begin
  update public.accounts
  set balance = balance + new.amount
  where id = new.destination_account_id;
  return new;
end;
$$ language plpgsql security definer;

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

create trigger on_income_delete
  after delete on public.income
  for each row execute procedure public.adjust_balance_on_income_delete();


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Profiles Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Accounts Policies
create policy "Users can view own accounts" on public.accounts
  for select using (auth.uid() = user_id);

create policy "Users can insert own accounts" on public.accounts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own accounts" on public.accounts
  for update using (auth.uid() = user_id);

create policy "Users can delete own accounts" on public.accounts
  for delete using (auth.uid() = user_id);

-- Categories Policies (Include global ones with NULL user_id)
create policy "Users can view custom or global categories" on public.categories
  for select using (user_id is null or auth.uid() = user_id);

create policy "Users can insert custom categories" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "Users can update custom categories" on public.categories
  for update using (auth.uid() = user_id);

create policy "Users can delete custom categories" on public.categories
  for delete using (auth.uid() = user_id);

-- Stores Policies (Include global ones with NULL user_id)
create policy "Users can view custom or global stores" on public.stores
  for select using (user_id is null or auth.uid() = user_id);

create policy "Users can insert custom stores" on public.stores
  for insert with check (auth.uid() = user_id);

create policy "Users can update custom stores" on public.stores
  for update using (auth.uid() = user_id);

create policy "Users can delete custom stores" on public.stores
  for delete using (auth.uid() = user_id);

-- Expenses Policies
create policy "Users can view own expenses" on public.expenses
  for select using (auth.uid() = user_id);

create policy "Users can insert own expenses" on public.expenses
  for insert with check (auth.uid() = user_id);

create policy "Users can update own expenses" on public.expenses
  for update using (auth.uid() = user_id);

create policy "Users can delete own expenses" on public.expenses
  for delete using (auth.uid() = user_id);

-- Income Policies
create policy "Users can view own income" on public.income
  for select using (auth.uid() = user_id);

create policy "Users can insert own income" on public.income
  for insert with check (auth.uid() = user_id);

create policy "Users can update own income" on public.income
  for update using (auth.uid() = user_id);

create policy "Users can delete own income" on public.income
  for delete using (auth.uid() = user_id);

-- Receipts Policies
create policy "Users can view own receipts" on public.receipts
  for select using (auth.uid() = user_id);

create policy "Users can insert own receipts" on public.receipts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own receipts" on public.receipts
  for update using (auth.uid() = user_id);

create policy "Users can delete own receipts" on public.receipts
  for delete using (auth.uid() = user_id);


-- =========================================================================
-- SEED SYSTEM DEFAULT DATA
-- =========================================================================

-- Seed Default Categories
insert into public.categories (name, icon, color) values
  ('Food', 'ShoppingCart', 'emerald'),
  ('Kitchen ware', 'Utensils', 'orange'),
  ('House rent', 'Home', 'amber'),
  ('Health Insurance', 'HeartPulse', 'red'),
  ('Radio Bill', 'Tv', 'blue'),
  ('Mobile bill', 'Smartphone', 'indigo'),
  ('Education', 'BookOpen', 'violet'),
  ('Shopping', 'Tag', 'pink'),
  ('Restaurant', 'Coffee', 'rose'),
  ('Other', 'HelpCircle', 'gray');

-- Seed Default German Stores
insert into public.stores (name) values
  ('Lidl'),
  ('Aldi Süd'),
  ('Aldi Nord'),
  ('REWE'),
  ('EDEKA'),
  ('Kaufland'),
  ('dm-drogerie markt'),
  ('Rossmann'),
  ('Müller'),
  ('IKEA'),
  ('Decathlon'),
  ('Netto'),
  ('Penny'),
  ('Saturn'),
  ('MediaMarkt'),
  ('Amazon.de');
