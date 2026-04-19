-- Drop old homebuilding tables
drop table if exists project_files cascade;
drop table if exists negotiations cascade;
drop table if exists requests cascade;
drop table if exists projects cascade;

-- Simplify sellers table (drop homebuilding-specific columns)
alter table sellers
  drop column if exists provider_type,
  drop column if exists membership_id,
  drop column if exists contractor_id,
  drop column if exists is_verified,
  drop column if exists certificate_url;

-- Listings (created by sellers)
create table if not exists listings (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references sellers(id),
  title       text not null,
  description text,
  price       numeric not null,
  status      text not null default 'active',  -- 'active' | 'sold'
  created_at  timestamptz not null default now()
);

-- Requests (buyer expresses interest in a listing)
create table if not exists requests (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id),
  buyer_id    uuid not null references buyers(id),
  seller_id   uuid not null references sellers(id),
  status      text not null default 'pending',  -- 'pending' | 'active' | 'paid' | 'cancelled'
  created_at  timestamptz not null default now()
);

-- Negotiations (offer chain on a request)
create table if not exists negotiations (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references requests(id),
  offered_by         uuid not null,
  offered_by_role    text not null,   -- 'buyer' | 'seller'
  amount             numeric not null,
  payment_mode       text not null default 'pending_buyer_choice',
  expires_at         timestamptz,
  is_final           boolean not null default false,
  status             text not null default 'pending',  -- 'pending' | 'accepted' | 'rejected' | 'countered'
  stream_payment_url text,
  created_at         timestamptz not null default now()
);
