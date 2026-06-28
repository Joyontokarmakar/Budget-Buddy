-- Create User Sessions Table for device tracking
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

-- Enable Row Level Security
alter table public.user_sessions enable row level security;

-- Create Security Policies
drop policy if exists "Users can manage their own sessions" on public.user_sessions;
create policy "Users can manage their own sessions" on public.user_sessions
    for all using (auth.uid() = user_id);

