-- Projects (created by homeowners)
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  buyer_id      uuid not null references buyers(id),
  title         text not null,
  location      text not null,
  land_size     numeric not null,
  budget        numeric not null,
  floors        int not null default 1,
  rooms         int not null default 3,
  design_style  text not null default 'modern',
  stage         text not null default 'design', -- 'design' | 'contractor' | 'complete'
  suk_url       text,
  created_at    timestamptz not null default now()
);

-- Requests (homeowner → provider)
create table if not exists requests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id),
  buyer_id    uuid not null references buyers(id),
  seller_id   uuid not null references sellers(id),
  stage       text not null,                       -- 'design' | 'contractor'
  status      text not null default 'pending',     -- 'pending' | 'active' | 'paid' | 'complete' | 'cancelled'
  created_at  timestamptz not null default now()
);

-- Negotiations (offer chain on a request)
create table if not exists negotiations (
  id                   uuid primary key default gen_random_uuid(),
  request_id           uuid not null references requests(id),
  offered_by           uuid not null,              -- buyer or seller id
  offered_by_role      text not null,              -- 'buyer' | 'seller'
  amount               numeric not null,
  payment_mode         text not null default 'one_time', -- 'one_time' | 'installment'
  expires_at           timestamptz,
  is_final             boolean not null default false,
  status               text not null default 'pending', -- 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired'
  stream_payment_url   text,
  created_at           timestamptz not null default now()
);

-- Project files / document vault
create table if not exists project_files (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id),
  request_id       uuid references requests(id),
  uploaded_by      uuid not null,
  uploaded_by_role text not null,
  file_name        text not null,
  file_url         text not null,
  file_type        text not null default 'deliverable', -- 'suk' | 'deliverable'
  stage            text not null,
  created_at       timestamptz not null default now()
);
