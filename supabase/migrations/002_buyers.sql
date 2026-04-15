-- Buyers table
create table if not exists buyers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null unique,
  phone              text not null,
  stream_consumer_id text,
  created_at         timestamptz not null default now()
);

create index if not exists buyers_email_idx on buyers (email);

-- Add phone to sellers (missing from initial migration)
alter table sellers add column if not exists phone text;
