-- Run this once in your Supabase project's SQL Editor (left sidebar -> SQL Editor -> New query).

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  link text not null unique,
  source text not null,
  category text not null,
  summary text,
  why_it_matters text,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now()
);

create index if not exists articles_published_at_idx on articles (published_at desc);
create index if not exists articles_category_idx on articles (category);

-- Tracks pipeline run timestamps, used only for the 5-minute cooldown.
create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null
);

-- Row Level Security: allow anyone to READ articles (it's a public news
-- feed), but only the server (using the service role key) can write.
alter table articles enable row level security;

create policy "Public read access"
  on articles for select
  using (true);

-- No insert/update/delete policy is created for the public (anon) role,
-- so writes are only possible via the service role key on the server.
