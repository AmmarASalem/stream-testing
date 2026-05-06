-- Drop old tables (cascade handles FKs)
drop table if exists negotiations cascade;
drop table if exists requests cascade;
drop table if exists listings cascade;
drop table if exists buyers cascade;
drop table if exists sellers cascade;

create table if not exists appuser (
    id              integer      primary key generated always as identity,
    name            text         not null,
    email           text         not null unique,
    hashed_password text         not null,
    phone_number    text         not null,
    role            text         not null check (role in ('seller', 'buyer')),
    created_at      timestamptz  not null default now()
);

create table if not exists seller (
    id integer primary key references appuser(id) on update cascade on delete cascade
);

create table if not exists buyer (
    id                 integer primary key references appuser(id) on update cascade on delete cascade,
    stream_consumer_id text    not null unique
);

create table if not exists listing (
    id          integer     primary key generated always as identity,
    seller_id   integer     not null references seller(id) on update cascade on delete restrict,
    title       text        not null,
    description text,
    price       numeric     not null,
    status      text        not null default 'active' check (status in ('active', 'sold')),
    created_at  timestamptz not null default now()
);

create table if not exists request (
    id         integer     primary key generated always as identity,
    buyer_id   integer     not null references buyer(id)   on update cascade on delete restrict,
    seller_id  integer     not null references seller(id)  on update cascade on delete restrict,
    listing_id integer     not null references listing(id) on update cascade on delete restrict,
    status     text        not null default 'pending' check (status in ('pending', 'active', 'paid', 'cancelled')),
    created_at timestamptz not null default now()
);

create table if not exists negotiation (
    id                 integer     primary key generated always as identity,
    request_id         integer     not null references request(id) on update cascade on delete cascade,
    offered_by         integer     not null,
    offered_by_role    text        not null check (offered_by_role in ('buyer', 'seller')),
    amount             numeric     not null,
    payment_mode       text        not null default 'pending_buyer_choice' check (payment_mode in ('one_time', 'installment', 'pending_buyer_choice')),
    expires_at         timestamptz,
    is_final           boolean     not null default false,
    outcome            text        not null default 'pending' check (outcome in ('pending', 'accepted', 'rejected', 'countered')),
    stream_payment_url text,
    created_at         timestamptz not null default now()
);
