create extension if not exists pgcrypto;

create type public.content_type as enum ('article', 'book', 'sermon', 'audio', 'video', 'benefit');
create type public.publish_status as enum ('draft', 'published', 'scheduled', 'archived');
create type public.admin_role as enum ('owner', 'editor');

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null default 'editor',
  display_name text not null check (char_length(display_name) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  alt_text text,
  original_filename text,
  created_by uuid references public.admin_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  type public.content_type not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 240),
  excerpt text not null default '' check (char_length(excerpt) <= 600),
  body jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  scheduled_at timestamptz,
  featured boolean not null default false,
  featured_order integer,
  reading_minutes integer check (reading_minutes is null or reading_minutes > 0),
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  canonical_url text,
  created_by uuid references public.admin_profiles(user_id) on delete set null,
  updated_by uuid references public.admin_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
  ) stored,
  unique (type, slug),
  check (status <> 'published' or published_at is not null),
  check (status <> 'scheduled' or scheduled_at is not null)
);

create table public.content_categories (
  content_id uuid not null references public.content_items(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, category_id)
);

create table public.content_media (
  content_id uuid not null references public.content_items(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  role text not null check (role in ('cover', 'audio', 'pdf', 'attachment', 'thumbnail')),
  sort_order integer not null default 0,
  primary key (content_id, media_id, role)
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.-]+$'),
  value jsonb not null,
  public_readable boolean not null default false,
  updated_by uuid references public.admin_profiles(user_id) on delete set null,
  updated_at timestamptz not null default now()
);

create index content_items_published_idx on public.content_items (type, published_at desc) where status = 'published';
create index content_items_featured_idx on public.content_items (featured_order, published_at desc) where status = 'published' and featured;
create index content_items_search_idx on public.content_items using gin (search_document);
create index content_categories_category_idx on public.content_categories (category_id, content_id);
create index media_assets_created_by_idx on public.media_assets (created_by);

create function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = (select auth.uid()) and active = true
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_items enable row level security;
alter table public.content_categories enable row level security;
alter table public.content_media enable row level security;
alter table public.site_settings enable row level security;

create policy "Published content is publicly readable"
on public.content_items for select to anon, authenticated
using (status = 'published' and published_at <= now());

create policy "Active categories are publicly readable"
on public.categories for select to anon, authenticated
using (active = true);

create policy "Published category links are publicly readable"
on public.content_categories for select to anon, authenticated
using (exists (
  select 1 from public.content_items
  where content_items.id = content_categories.content_id
    and content_items.status = 'published'
    and content_items.published_at <= now()
));

create policy "Published media links are publicly readable"
on public.content_media for select to anon, authenticated
using (exists (
  select 1 from public.content_items
  where content_items.id = content_media.content_id
    and content_items.status = 'published'
    and content_items.published_at <= now()
));

create policy "Referenced media metadata is publicly readable"
on public.media_assets for select to anon, authenticated
using (exists (
  select 1 from public.content_media
  join public.content_items on content_items.id = content_media.content_id
  where content_media.media_id = media_assets.id
    and content_items.status = 'published'
    and content_items.published_at <= now()
));

create policy "Public settings are readable"
on public.site_settings for select to anon, authenticated
using (public_readable = true);

create policy "Admins read own profile"
on public.admin_profiles for select to authenticated
using (user_id = (select auth.uid()) or public.is_active_admin());

create policy "Admins manage categories"
on public.categories for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

create policy "Admins manage content"
on public.content_items for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

create policy "Admins manage category links"
on public.content_categories for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

create policy "Admins manage media metadata"
on public.media_assets for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

create policy "Admins manage content media"
on public.content_media for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

create policy "Admins manage settings"
on public.site_settings for all to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

insert into storage.buckets (id, name, public)
values ('publications', 'publications', true), ('private-editorial', 'private-editorial', false)
on conflict (id) do nothing;

create policy "Published publication files are public"
on storage.objects for select to anon, authenticated
using (bucket_id = 'publications');

create policy "Admins upload publication files"
on storage.objects for insert to authenticated
with check (bucket_id in ('publications', 'private-editorial') and public.is_active_admin());

create policy "Admins update publication files"
on storage.objects for update to authenticated
using (bucket_id in ('publications', 'private-editorial') and public.is_active_admin())
with check (bucket_id in ('publications', 'private-editorial') and public.is_active_admin());

create policy "Owners delete publication files"
on storage.objects for delete to authenticated
using (
  bucket_id in ('publications', 'private-editorial')
  and exists (
    select 1 from public.admin_profiles
    where user_id = (select auth.uid()) and active = true and role = 'owner'
  )
);
