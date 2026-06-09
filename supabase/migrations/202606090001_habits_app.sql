-- Habits app: recurring habit definitions + date-only completion tracking.
-- Adds a dedicated `habits` schema (mirrors the `platform` schema's RLS + grants) and one
-- column on platform.app_users used for timezone-correct streak boundaries.

-- Timezone for date-sensitive apps (habit streaks). Nullable; callers fall back to a default.
alter table platform.app_users
  add column if not exists timezone text;

create schema if not exists habits;

revoke all on schema habits from anon, authenticated;
grant usage on schema habits to service_role;

create table if not exists habits.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references platform.app_users(id) on delete cascade,
  name text not null,
  description text,
  cadence_kind text not null,
  cadence_config jsonb not null,
  target_count integer not null default 1,
  unit text,
  color text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table habits.habits enable row level security;

create table if not exists habits.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits.habits(id) on delete cascade,
  user_id uuid not null references platform.app_users(id) on delete cascade,
  entry_date date not null,
  count integer not null default 1,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_entries_habit_id_entry_date_key unique (habit_id, entry_date)
);

alter table habits.habit_entries enable row level security;

revoke all on all tables in schema habits from anon, authenticated;
grant select, insert, update, delete on all tables in schema habits to service_role;

create index if not exists habits_user_id_idx
  on habits.habits (user_id);

create index if not exists habit_entries_habit_id_entry_date_idx
  on habits.habit_entries (habit_id, entry_date);
