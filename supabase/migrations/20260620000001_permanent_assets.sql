-- Create Permanent Assets Table (For manual tracking logs)
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

-- RLS Policies
create policy "Users can view their own permanent assets" on public.permanent_assets
    for select using (auth.uid() = user_id);

create policy "Users can insert their own permanent assets" on public.permanent_assets
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own permanent assets" on public.permanent_assets
    for update using (auth.uid() = user_id);

create policy "Users can delete their own permanent assets" on public.permanent_assets
    for delete using (auth.uid() = user_id);
