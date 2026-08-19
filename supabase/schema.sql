create extension if not exists "pgcrypto";


-- USERS

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),

  telegram_id bigint unique not null,

  username text,
  first_name text,
  last_name text,
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- MATCHES

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),

  external_id text unique not null,

  league text,
  league_logo text,

  home_team text not null,
  away_team text not null,

  home_logo text,
  away_logo text,

  match_date timestamptz not null,

  status text not null default 'scheduled',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- PREDICTIONS

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.users(id)
    on delete cascade,

  match_id uuid not null
    references public.matches(id)
    on delete cascade,

  prediction text not null,

  confidence integer,

  message text,

  created_at timestamptz not null default now()
);


-- MESSAGES

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.users(id)
    on delete cascade,

  match_id uuid
    references public.matches(id)
    on delete cascade,

  content text not null,

  created_at timestamptz not null default now()
);


-- LIKES

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.users(id)
    on delete cascade,

  prediction_id uuid not null
    references public.predictions(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique (user_id, prediction_id)
);


-- INDEXES

create index if not exists matches_match_date_idx
on public.matches(match_date);

create index if not exists matches_status_idx
on public.matches(status);

create index if not exists predictions_match_id_idx
on public.predictions(match_id);

create index if not exists predictions_user_id_idx
on public.predictions(user_id);

create index if not exists messages_created_at_idx
on public.messages(created_at);

create index if not exists messages_match_id_idx
on public.messages(match_id);

create index if not exists likes_prediction_id_idx
on public.likes(prediction_id);


-- UPDATED_AT FUNCTION

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- USERS UPDATED_AT TRIGGER

drop trigger if exists users_updated_at
on public.users;

create trigger users_updated_at
before update on public.users
for each row
execute function public.update_updated_at();


-- MATCHES UPDATED_AT TRIGGER

drop trigger if exists matches_updated_at
on public.matches;

create trigger matches_updated_at
before update on public.matches
for each row
execute function public.update_updated_at();


-- REALTIME

do $$
begin
  begin
    alter publication supabase_realtime
    add table public.messages;
  exception
    when duplicate_object then
      null;
  end;

  begin
    alter publication supabase_realtime
    add table public.predictions;
  exception
    when duplicate_object then
      null;
  end;
end;
$$;