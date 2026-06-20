-- 1. Add avatar_url to profiles table
alter table public.profiles add column avatar_url text;

-- 2. Create avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Allow public access to read avatars
create policy "Allow public read of avatars" on storage.objects
    for select using (bucket_id = 'avatars');

-- 4. Allow authenticated users to upload/manage avatars
create policy "Allow authenticated uploads of avatars" on storage.objects
    for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Allow authenticated updates of avatars" on storage.objects
    for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Allow authenticated deletes of avatars" on storage.objects
    for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');
