create extension if not exists pgcrypto;

create schema if not exists platform;

revoke all on schema platform from anon, authenticated;
grant usage on schema platform to service_role;

create table if not exists platform.app_users (
  id uuid primary key default gen_random_uuid(),
  external_subject text not null unique,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table platform.app_users enable row level security;

create table if not exists platform.app_user_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references platform.app_users(id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now(),
  unique (user_id, scope)
);

alter table platform.app_user_scopes enable row level security;

create table if not exists platform.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references platform.app_users(id) on delete set null,
  app text not null,
  tool_name text not null,
  action text not null,
  entity_type text,
  entity_id text,
  request_id text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

alter table platform.audit_events enable row level security;

create table if not exists platform.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references platform.app_users(id) on delete cascade,
  tool_name text not null,
  client_request_id text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, tool_name, client_request_id)
);

alter table platform.idempotency_keys enable row level security;

revoke all on all tables in schema platform from anon, authenticated;
grant select, insert, update, delete on all tables in schema platform to service_role;

create index if not exists audit_events_user_id_created_at_idx
  on platform.audit_events (user_id, created_at desc);

create index if not exists audit_events_tool_name_created_at_idx
  on platform.audit_events (tool_name, created_at desc);

create index if not exists idempotency_keys_expires_at_idx
  on platform.idempotency_keys (expires_at);
