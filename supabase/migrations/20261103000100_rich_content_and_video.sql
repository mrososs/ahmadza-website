-- Rich article bodies, covers on every content type, and uploaded videos.
--
-- Article bodies and covers need no schema change: `content_items.body` is already a jsonb array of sections (a section may now
-- carry an `html` string, which the site sanitizes on every public read) and covers live in `metadata.coverUrl`, as book covers
-- always have. Existing rows are untouched.
--
-- Uploaded videos live in a PRIVATE bucket. Nothing is publicly listable or linkable: visitors only ever receive short-lived
-- signed URLs from the site's own endpoints, and only for videos that are published.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 209715200, array['video/mp4', 'video/webm'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins read uploaded videos" on storage.objects;
create policy "Admins read uploaded videos"
on storage.objects for select to authenticated
using (bucket_id = 'videos' and public.is_active_admin());

-- A published video's file can be signed by anyone, but only that file: the object name has to be the path stored on a
-- published `video` row. Drafts, archived and unreferenced files stay unreachable. (Signing is what the site's playback and
-- download endpoints do; the download endpoint additionally enforces the record's allowDownload choice.)
drop policy if exists "Published uploaded videos are readable" on storage.objects;
create policy "Published uploaded videos are readable"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'videos'
  and exists (
    select 1 from public.content_items
    where content_items.type = 'video'
      and content_items.status = 'published'
      and content_items.published_at <= now()
      and content_items.metadata ->> 'videoPath' = objects.name
  )
);

-- Uploads must use the generated `uploads/<uuid>.<ext>` name, which also means an existing file can never be overwritten by name.
drop policy if exists "Admins upload videos" on storage.objects;
create policy "Admins upload videos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'videos'
  and public.is_active_admin()
  and name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$'
);

-- Any active admin may remove a video file, so an editor can clean up an upload that failed or was replaced.
drop policy if exists "Admins delete videos" on storage.objects;
create policy "Admins delete videos"
on storage.objects for delete to authenticated
using (bucket_id = 'videos' and public.is_active_admin());

-- The shape of the video keys in `metadata`. NOT VALID: new and changed rows are checked, existing rows are not rewritten.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'content_items_video_metadata_check') then
    alter table public.content_items
    add constraint content_items_video_metadata_check check (
      type <> 'video'
      or (
        (not (metadata ? 'videoPath') or (metadata ->> 'videoPath') ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$')
        and (not (metadata ? 'youtubeId') or (metadata ->> 'youtubeId') ~ '^[A-Za-z0-9_-]{11}$')
        and not (metadata ? 'videoPath' and metadata ? 'youtubeId')
      )
    ) not valid;
  end if;
end
$$;
