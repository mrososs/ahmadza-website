-- Site branding: the header logo and the hero artwork are two public `site_settings` rows
-- (`branding.header_logo`, `branding.hero_image`) that point at files in a dedicated public bucket.
-- Only an active owner may change them; everyone can read them. Without a row the site falls back
-- to the artwork bundled in /public/ornaments, so removing a row is the "reset to default" action.

create function public.is_active_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = (select auth.uid()) and active = true and role = 'owner'
  );
$$;

revoke all on function public.is_active_owner() from public;
revoke execute on function public.is_active_owner() from anon;
grant execute on function public.is_active_owner() to authenticated;

-- The old policy let any active admin write any setting. Nothing in the app used it, so it is replaced by
-- narrower ones: admins can still read every setting, only owners can write, and only the branding keys.
drop policy "Admins manage settings" on public.site_settings;

create policy "Admins read all settings"
on public.site_settings for select to authenticated
using (public.is_active_admin());

create policy "Owners insert branding settings"
on public.site_settings for insert to authenticated
with check (
  public.is_active_owner()
  and key in ('branding.header_logo', 'branding.hero_image')
  and public_readable
);

create policy "Owners update branding settings"
on public.site_settings for update to authenticated
using (public.is_active_owner() and key in ('branding.header_logo', 'branding.hero_image'))
with check (
  public.is_active_owner()
  and key in ('branding.header_logo', 'branding.hero_image')
  and public_readable
);

create policy "Owners delete branding settings"
on public.site_settings for delete to authenticated
using (public.is_active_owner() and key in ('branding.header_logo', 'branding.hero_image'));

-- A branding value must point at a file this feature uploaded: right folder for the key, UUID file name,
-- png/webp only, and a URL that is a public `site-branding` object URL ending in that exact storage path.
-- The database cannot know the project's own host, so the app additionally refuses any URL that is not on it.
alter table public.site_settings
add constraint site_settings_branding_value_check check (
  key not in ('branding.header_logo', 'branding.hero_image')
  or (
    public_readable
    and jsonb_typeof(value) = 'object'
    and (value ->> 'storagePath') ~ (
      '^' || case key when 'branding.header_logo' then 'header-logo' else 'hero-image' end
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp)$'
    )
    and (value ->> 'url') ~ '^https?://[^/]+/storage/v1/object/public/site-branding/'
    and (value ->> 'url') like '%/storage/v1/object/public/site-branding/' || (value ->> 'storagePath')
    and (value ->> 'width') ~ '^[0-9]{1,5}$'
    and (value ->> 'height') ~ '^[0-9]{1,5}$'
    and jsonb_typeof(value -> 'alt') = 'string'
    and char_length(value ->> 'alt') <= 200
  )
);

-- The timestamp and author come from the database, not from the browser.
create function public.stamp_site_setting()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

revoke all on function public.stamp_site_setting() from public, anon, authenticated;

create trigger site_settings_stamp
before insert or update on public.site_settings
for each row execute function public.stamp_site_setting();

-- Dedicated public bucket. Storage itself enforces the size and MIME limits (no SVG: it can carry script).
-- Files are never overwritten: every upload gets a new UUID path, which also makes each URL cache-safe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-branding', 'site-branding', true, 5242880, array['image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public bucket: files are served by URL without a policy. Listing the bucket is limited to owners.
create policy "Owners read branding files"
on storage.objects for select to authenticated
using (bucket_id = 'site-branding' and public.is_active_owner());

create policy "Owners upload branding files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-branding'
  and public.is_active_owner()
  and name ~ '^(header-logo|hero-image)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp)$'
);

create policy "Owners delete branding files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-branding'
  and public.is_active_owner()
  and name ~ '^(header-logo|hero-image)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp)$'
);
