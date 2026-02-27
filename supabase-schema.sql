-- Supabase schema for AI Powered S3 Workspace SaaS
-- Run this inside your Supabase project's SQL editor.

-- Users table (extends auth.users with app-specific fields)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.users
  enable row level security;

create policy "Users can see their own profile"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users
  for update
  using (auth.uid() = id);

-- AWS connections per user (one or many buckets per account)
create table if not exists public.aws_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  bucket_name text not null,
  region text not null,
  -- Store encrypted or tokenized credentials; never raw in production.
  access_key_ciphertext text,
  secret_key_ciphertext text,
  role_arn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aws_connections
  enable row level security;

create policy "Users can manage their own aws connections"
  on public.aws_connections
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Logical folders metadata on top of S3 keys
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  aws_connection_id uuid not null references public.aws_connections(id) on delete cascade,
  path text not null, -- e.g. invoices/2024/
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.folders
  enable row level security;

create policy "Users can see their folders"
  on public.folders
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their folders"
  on public.folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Files metadata + AI annotations
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  aws_connection_id uuid not null references public.aws_connections(id) on delete cascade,
  s3_key text not null,          -- full S3 key
  folder_path text not null,     -- logical folder path (prefix)
  mime text,
  size bigint,
  category text,
  tags text[],                   -- simple tag array
  ai_summary text,
  embedding_id uuid,             -- points to an embeddings table or external vector store
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.files
  enable row level security;

create policy "Users can see their files"
  on public.files
  for select
  using (auth.uid() = user_id);

create policy "Users can manage their files"
  on public.files
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activity history (audit of important actions)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  aws_connection_id uuid references public.aws_connections(id) on delete set null,
  file_id uuid references public.files(id) on delete set null,
  action text not null,          -- e.g. "upload", "delete", "rename", "ai_summary"
  details jsonb,                 -- arbitrary structured payload
  created_at timestamptz not null default now()
);

alter table public.activities
  enable row level security;

create policy "Users can see their activities"
  on public.activities
  for select
  using (auth.uid() = user_id);

