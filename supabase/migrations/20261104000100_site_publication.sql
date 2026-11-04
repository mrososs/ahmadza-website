-- Private launch: the site is hidden from the public until the owner publishes it.
--
-- State lives in one public `site_settings` row, `site.publication` = {"mode": "maintenance" | "published"}. A missing,
-- malformed or unreadable row means "maintenance": the site never launches by accident.
--
-- The application gate (server/middleware/site-access.ts) hides every public page and API while the site is in maintenance.
-- That alone would not hide the data: the Supabase URL and publishable key are public by design, so anyone could still call
-- the REST API directly. The anonymous read policies below therefore follow the same switch, so the database refuses to hand
-- out content until the site is published.
--
-- Preview: a signed-in admin needs to see the real site before launch. The site does not trust a flag or a signed cookie; it
-- trusts the database. An active admin asks for a preview session (random 244-bit token, only its SHA-256 is stored), the
-- site keeps the token in an HttpOnly cookie and sends it to Supabase as `x-preview-token` on its own reads, and the policies
-- accept it while the session is unexpired AND the admin profile is still active. Signing out, deactivating the profile or
-- waiting 12 hours ends it.

-- ---------------------------------------------------------------------------------------------------------------------
-- The setting
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.site_settings
add constraint site_settings_publication_value_check check (
  key <> 'site.publication'
  or (
    public_readable
    and jsonb_typeof(value) = 'object'
    and (value ->> 'mode') in ('maintenance', 'published')
  )
);

-- Only an active owner may change it, like branding. There is no delete: "back to maintenance" is an update, and the
-- trigger from the branding migration stamps updated_at / updated_by from the database, so the row records the last change.
create policy "Owners insert publication setting"
on public.site_settings for insert to authenticated
with check (public.is_active_owner() and key = 'site.publication' and public_readable);

create policy "Owners update publication setting"
on public.site_settings for update to authenticated
using (public.is_active_owner() and key = 'site.publication')
with check (public.is_active_owner() and key = 'site.publication' and public_readable);

create function public.site_is_published()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select value ->> 'mode' = 'published' from public.site_settings where key = 'site.publication'),
    false
  );
$$;

revoke all on function public.site_is_published() from public;
grant execute on function public.site_is_published() to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Preview sessions
-- ---------------------------------------------------------------------------------------------------------------------

create table public.preview_sessions (
  token_hash bytea primary key,
  user_id uuid not null references public.admin_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index preview_sessions_user_idx on public.preview_sessions (user_id, created_at desc);

-- No policies on purpose: nothing can read or write the table through the API. Only the functions below touch it.
alter table public.preview_sessions enable row level security;
revoke all on public.preview_sessions from anon, authenticated;

create function public.verify_preview_token(token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.preview_sessions s
    join public.admin_profiles p on p.user_id = s.user_id
    where s.token_hash = sha256(convert_to(token, 'utf8'))
      and s.expires_at > now()
      and p.active
  );
$$;

revoke all on function public.verify_preview_token(text) from public;
grant execute on function public.verify_preview_token(text) to anon, authenticated;

-- What the read policies call: does this request carry a valid preview token in its `x-preview-token` header?
create function public.preview_access_granted()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  token text;
begin
  begin
    token := nullif(current_setting('request.headers', true), '')::json ->> 'x-preview-token';
  exception when others then
    return false;
  end;
  return token is not null and public.verify_preview_token(token);
end;
$$;

revoke all on function public.preview_access_granted() from public;
grant execute on function public.preview_access_granted() to anon, authenticated;

-- Callable only by a signed-in active admin; returns the raw token once. The caller is the site's own server.
create function public.start_preview_session()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  token text;
begin
  if admin_id is null or not public.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.preview_sessions where expires_at <= now();
  -- At most five live sessions per admin (several browsers), the newest ones.
  delete from public.preview_sessions
  where user_id = admin_id
    and token_hash in (
      select token_hash from public.preview_sessions where user_id = admin_id order by created_at desc offset 4
    );

  token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.preview_sessions (token_hash, user_id, expires_at)
  values (sha256(convert_to(token, 'utf8')), admin_id, now() + interval '12 hours');
  return token;
end;
$$;

revoke all on function public.start_preview_session() from public, anon;
grant execute on function public.start_preview_session() to authenticated;

-- Whoever holds the token may end it (sign-out).
create function public.end_preview_session(token text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.preview_sessions where token_hash = sha256(convert_to(token, 'utf8'));
$$;

revoke all on function public.end_preview_session(text) from public;
grant execute on function public.end_preview_session(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Anonymous reads follow the publication switch
-- ---------------------------------------------------------------------------------------------------------------------

-- content_categories, content_media and media_assets select through content_items, so they follow it automatically, and so
-- does the "Published uploaded videos are readable" storage policy. Admins are unaffected: their own policies read everything.
drop policy "Published content is publicly readable" on public.content_items;
create policy "Published content is publicly readable"
on public.content_items for select to anon, authenticated
using (
  status = 'published'
  and published_at <= now()
  and ((select public.site_is_published()) or (select public.preview_access_granted()))
);

drop policy "Active categories are publicly readable" on public.categories;
create policy "Active categories are publicly readable"
on public.categories for select to anon, authenticated
using (
  active = true
  and ((select public.site_is_published()) or (select public.preview_access_granted()))
);

-- ---------------------------------------------------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------------------------------------------------

-- `publications` is a public bucket: its files are served by URL with no policy at all. The select policy therefore only ever
-- controlled LISTING, and "Published publication files are public" let anyone enumerate every file in the bucket, drafts
-- included. Listing is limited to admins; URLs the site already shows keep working.
drop policy "Published publication files are public" on storage.objects;
create policy "Admins read publication files"
on storage.objects for select to authenticated
using (bucket_id = 'publications' and public.is_active_admin());
