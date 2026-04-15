-- Sellers table for engineering offices / contractors
create table if not exists sellers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  password_hash   text not null,
  membership_id   text,
  is_verified     boolean not null default false,
  certificate_url text,
  created_at      timestamptz not null default now()
);

-- Index for fast email lookups
create index if not exists sellers_email_idx on sellers (email);
