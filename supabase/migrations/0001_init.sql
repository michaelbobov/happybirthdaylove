-- =====================================================
-- Enveloped — initial schema
-- =====================================================

-- Required extensions
create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: self upsert" on public.profiles;
create policy "profiles: self upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: self update" on public.profiles
  for update using (auth.uid() = id);

-- ---------- bundles ----------
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  cover_message text,
  recipient_name text,
  recipient_email text,
  theme_id text not null default 'warm-handmade',
  access_token text not null unique, -- 32-byte base64url
  passphrase_hash text,              -- argon2id; null if no passphrase
  claimed_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists bundles_sender_idx on public.bundles (sender_id);
create index if not exists bundles_claimed_idx on public.bundles (claimed_by_user_id);
create index if not exists bundles_token_idx on public.bundles (access_token);

alter table public.bundles enable row level security;

drop policy if exists "bundles: sender full" on public.bundles;
create policy "bundles: sender full" on public.bundles
  for all using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

-- recipients access via token (handled through route handlers using service role);
-- claimed recipients can read bundles assigned to their account:
drop policy if exists "bundles: claimed recipient read" on public.bundles;
create policy "bundles: claimed recipient read" on public.bundles
  for select using (auth.uid() = claimed_by_user_id);

-- ---------- envelopes ----------
create type envelope_unlock_type as enum ('immediate', 'date', 'passphrase', 'manual');

create table if not exists public.envelopes (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  order_index int not null default 0,
  title text not null,
  caption text,
  unlock_type envelope_unlock_type not null default 'immediate',
  unlock_at timestamptz,
  envelope_design_id text not null default 'kraft-classic',
  theme_override_id text,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists envelopes_bundle_idx on public.envelopes (bundle_id);

alter table public.envelopes enable row level security;

drop policy if exists "envelopes: via bundle" on public.envelopes;
create policy "envelopes: via bundle" on public.envelopes
  for all using (
    exists (
      select 1 from public.bundles b
      where b.id = envelopes.bundle_id
        and (b.sender_id = auth.uid() or b.claimed_by_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.bundles b
      where b.id = envelopes.bundle_id and b.sender_id = auth.uid()
    )
  );

-- ---------- envelope_items ----------
create type envelope_item_type as enum ('text', 'image', 'gif', 'giftcard', 'money_note', 'audio');

create table if not exists public.envelope_items (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.envelopes (id) on delete cascade,
  order_index int not null default 0,
  type envelope_item_type not null,
  -- encrypted blob (AES-256-GCM); contains the sensitive payload (text, giftcard code, storage key)
  payload_encrypted bytea not null,
  -- non-sensitive metadata (captions, dimensions, mime, duration, giphy id, thumbnails, etc.)
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists items_envelope_idx on public.envelope_items (envelope_id);

alter table public.envelope_items enable row level security;

-- Only the sender can read raw encrypted rows. Recipients read them through
-- the server reveal API (service role) which decrypts after the unlock gate.
drop policy if exists "items: sender only" on public.envelope_items;
create policy "items: sender only" on public.envelope_items
  for all using (
    exists (
      select 1 from public.envelopes e
      join public.bundles b on b.id = e.bundle_id
      where e.id = envelope_items.envelope_id and b.sender_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.envelopes e
      join public.bundles b on b.id = e.bundle_id
      where e.id = envelope_items.envelope_id and b.sender_id = auth.uid()
    )
  );

-- ---------- claim helpers ----------
-- Lets a recipient attach a bundle to their account by providing the access token.
-- Runs with the caller's auth.uid().
create or replace function public.claim_bundle(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bundle_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.bundles
     set claimed_by_user_id = v_uid
   where access_token = p_token
     and (claimed_by_user_id is null or claimed_by_user_id = v_uid)
  returning id into v_bundle_id;

  if v_bundle_id is null then
    raise exception 'invalid token or already claimed';
  end if;
  return v_bundle_id;
end;
$$;

grant execute on function public.claim_bundle(text) to authenticated;

-- ---------- storage bucket ----------
-- Run once manually in Supabase dashboard or via admin SQL:
--   insert into storage.buckets (id, name, public) values ('envelope-media','envelope-media', false);
-- Signed URLs are minted server-side by the reveal API.
