-- ListingCraft — Supabase (Postgres) schema
-- =========================================================================
-- Migrated from MongoDB. Paste this into the Supabase SQL editor to create
-- the tables. Do not run it from the app.
--
-- ID STRATEGY (read this):
--   The application generates its own prefixed string identifiers in Python
--   (e.g. "user_ab12cd34ef56", "lst_ab12...", "txn_...", "evt_..."). The
--   frontend routes and links on these exact string ids (e.g. /generator/{listing_id})
--   and the whole backend filters on user_id / listing_id — never on Mongo's _id
--   (every old query projected {"_id": 0}). To keep the frontend 100% unchanged
--   and to "use id everywhere internally with no id<->_id shims", we keep those
--   app-generated strings as TEXT PRIMARY KEYs rather than introducing separate
--   Postgres-generated uuid PKs. This is the lowest-risk mapping of the existing
--   data model. (The only table with no app-level id, user_sessions, does use a
--   gen_random_uuid() surrogate key since it is never exposed to the client.)
--
-- ROW LEVEL SECURITY:
--   All access goes through our own FastAPI backend using the Supabase SERVICE
--   ROLE key, which BYPASSES row level security. We therefore enable RLS on every
--   table and add NO policies at all — this is deny-by-default for the anon and
--   authenticated (public) roles, so even if an anon/public key ever leaked it
--   could read/write nothing. Never expose the service role key to the frontend.
-- =========================================================================

-- Required for gen_random_uuid() (present by default on Supabase).
create extension if not exists pgcrypto;

-- ---------- users ----------
create table if not exists public.users (
    user_id                        text primary key,          -- app-generated "user_..."
    email                          text unique not null,
    name                           text not null default '',
    picture                        text,
    password_hash                  text,                       -- null for Google users
    auth_provider                  text not null default 'email',  -- 'email' | 'google'
    plan                           text not null default 'free',   -- free | starter | pro
    plan_expires_at                timestamptz,                -- null = never
    generations_used_this_period   integer not null default 0,
    period_start                   timestamptz not null default now(),
    stripe_customer_id             text,
    created_at                     timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- ---------- listings ----------
-- generated: full AI output (title, tags[13], description, attributes, alt_text, keywords).
-- score:     score breakdown ({total, checks[]}) — kept as its own column because the
--            Listing model exposes `generated` and `score` as separate top-level fields;
--            merging them would change the API response shape.
-- input:     snapshot of the user's product inputs (image_base64 excluded).
create table if not exists public.listings (
    listing_id   text primary key,                            -- app-generated "lst_..."
    user_id      text not null references public.users(user_id) on delete cascade,
    input        jsonb not null default '{}'::jsonb,
    generated    jsonb not null default '{}'::jsonb,
    score        jsonb not null default '{}'::jsonb,
    tone         text not null default 'warm',
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists listings_user_created_idx
    on public.listings (user_id, created_at desc);

-- ---------- user_sessions ----------
-- Emergent Google OAuth: opaque session_token stored server-side, looked up on
-- each request and expired after 7 days. Not exposed to the client, so it uses a
-- surrogate uuid primary key.
create table if not exists public.user_sessions (
    id             uuid primary key default gen_random_uuid(),
    user_id        text not null references public.users(user_id) on delete cascade,
    session_token  text not null,
    expires_at     timestamptz,
    created_at     timestamptz not null default now()
);

create index if not exists user_sessions_token_idx on public.user_sessions (session_token);

-- ---------- payment_transactions ----------
-- One-time Stripe Checkout sessions (no recurring subscriptions). session_id is
-- the Stripe checkout session id and is what payment status/webhook lookups use.
create table if not exists public.payment_transactions (
    txn_id          text primary key,                         -- app-generated "txn_..."
    user_id         text not null references public.users(user_id) on delete cascade,
    session_id      text not null,
    amount          double precision not null,
    currency        text not null default 'usd',
    package_id      text not null,
    payment_status  text not null default 'initiated',        -- initiated | paid | expired | failed
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists payment_transactions_session_idx
    on public.payment_transactions (session_id);
create index if not exists payment_transactions_user_idx
    on public.payment_transactions (user_id);

-- ---------- analytics_events ----------
-- user_id is nullable: anonymous (logged-out) events are recorded with null.
create table if not exists public.analytics_events (
    event_id     text primary key,                            -- app-generated "evt_..."
    user_id      text references public.users(user_id) on delete cascade,
    event_type   text not null,
    metadata     jsonb not null default '{}'::jsonb,
    created_at   timestamptz not null default now()
);

create index if not exists analytics_events_type_created_idx
    on public.analytics_events (event_type, created_at);
create index if not exists analytics_events_user_created_idx
    on public.analytics_events (user_id, created_at);

-- =========================================================================
-- Row Level Security: enable on every table, define NO policies.
-- The service role key used by the backend bypasses RLS; anon/public roles are
-- denied by default. Do NOT add public policies and do NOT expose non-service keys.
-- =========================================================================
alter table public.users                enable row level security;
alter table public.listings             enable row level security;
alter table public.user_sessions        enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.analytics_events     enable row level security;
