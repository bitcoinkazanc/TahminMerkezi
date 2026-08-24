alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.messages enable row level security;
alter table public.likes enable row level security;


-- USERS

drop policy if exists "Users can view users"
on public.users;

create policy "Users can view users"
on public.users
for select
to anon, authenticated
using (true);


drop policy if exists "Users can insert users"
on public.users;

create policy "Users can insert users"
on public.users
for insert
to anon, authenticated
with check (true);


drop policy if exists "Users can update users"
on public.users;

create policy "Users can update users"
on public.users
for update
to anon, authenticated
using (true)
with check (true);


-- MATCHES

drop policy if exists "Anyone can view matches"
on public.matches;

create policy "Anyone can view matches"
on public.matches
for select
to anon, authenticated
using (true);


-- PREDICTIONS

drop policy if exists "Anyone can view predictions"
on public.predictions;

create policy "Anyone can view predictions"
on public.predictions
for select
to anon, authenticated
using (true);


drop policy if exists "Anyone can create predictions"
on public.predictions;

create policy "Anyone can create predictions"
on public.predictions
for insert
to anon, authenticated
with check (true);


drop policy if exists "Anyone can delete predictions"
on public.predictions;

create policy "Anyone can delete predictions"
on public.predictions
for delete
to anon, authenticated
using (true);


-- MESSAGES

drop policy if exists "Anyone can view messages"
on public.messages;

create policy "Anyone can view messages"
on public.messages
for select
to anon, authenticated
using (true);


drop policy if exists "Anyone can create messages"
on public.messages;

create policy "Anyone can create messages"
on public.messages
for insert
to anon, authenticated
with check (true);


-- LIKES

drop policy if exists "Anyone can view likes"
on public.likes;

create policy "Anyone can view likes"
on public.likes
for select
to anon, authenticated
using (true);


drop policy if exists "Anyone can create likes"
on public.likes;

create policy "Anyone can create likes"
on public.likes
for insert
to anon, authenticated
with check (true);


drop policy if exists "Anyone can delete likes"
on public.likes;

create policy "Anyone can delete likes"
on public.likes
for delete
to anon, authenticated
using (true);