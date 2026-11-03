# Rich content, cards and video

## Rich text bodies
- Editor: `@vueup/vue-quill` 1.5.5 (Quill 2.0.2), loaded only in the browser (`AdminRichTextEditor.client.vue`, lazy, inside `<ClientOnly>`). vue-quill lazy-imports Quill itself, so nothing touches `window`/`document` during SSR. The toolbar is our own Arabic markup; only these formats exist: headings H2–H4, bold, italic, underline, lists, blockquote, link, align, RTL/LTR, indent, image.
- Storage: `content_items.body` stays a jsonb array of sections. A rich body is one section `{ id: 'body', paragraphs: [], html }`. Older sections (`heading/paragraphs/quote`) are untouched in the database and render as before; the editor converts them to HTML when opened and only writes back if the editor saves.
- Sanitizing: allow-list in `app/utils/rich-text-policy.ts`. The **server** re-sanitizes every public read (`server/utils/rich-text.ts`, `sanitize-html`); the browser applies the same policy with DOMPurify on save and in the preview. Images are only accepted from `<supabase>/storage/v1/object/public/publications/`; pasted/dropped pictures are never kept as data/blob URLs — they go through the admin upload.
- Because editors write straight to Supabase (RLS is the authorization boundary), the render-time server sanitizer is the real XSS boundary.

## Covers
`metadata.coverUrl` for every content type (as book covers always were). Upload validates type, 5 MB and 320×180–8000 px (`image-dimensions.ts`). No cover → local fallback drawn by `ContentCover.vue`.

## Videos
- Metadata keys: `videoSource`, `youtubeId`, `videoPath`, `videoMimeType`, `videoBytes`, `downloadAllowed`, `durationSeconds`. Old rows (`youtubeId` only) keep working unchanged.
- Root cause of "YouTube link doesn't work": the field accepted only the bare 11-char id, so pasted links were rejected/stored wrongly. `app/utils/youtube.ts` now accepts watch, youtu.be, embed, shorts, live, m./music. hosts and extra query params, stores only the id, and builds the embed URL itself. The player sets `referrerpolicy`, and listens for YouTube's embed errors (101/150/100) to show a "watch on YouTube" fallback.
- Uploads: private bucket `videos` (MP4/WebM, 200 MB), resumable TUS upload with progress, cancel, retry/resume. Unsaved uploads that are replaced/removed, and files replaced or orphaned at save/delete, are removed. `NUXT_PUBLIC_VIDEO_MAX_MB` lowers the client limit; the Supabase project's global upload limit must also allow it.
- Playback/download: `GET /api/videos/:slug/playback` (2 h signed URL) and `/download` (60 s, `Content-Disposition: attachment`, only when `downloadAllowed`). Responses are `no-store`.
- **Limits:** hiding the button or refusing the endpoint is a product policy, not DRM — anyone who can play a video can record it. The storage policy lets anyone sign a *published* video's file (needed for playback without a service key), so the download flag is enforced by the site's endpoint, not by storage.

## Tests
- `tests/rich-content-units.spec.ts` (sanitizer incl. XSS, YouTube parser, metadata) and `tests/rich-content-video.spec.ts` run in the normal suite on demo data.
- `tests/real-stack/` needs a local Supabase and `STACK_PUBLISHABLE_KEY` / `STACK_SECRET_KEY` from `supabase status`: `stack-check.cjs` (RLS/storage/TUS/signed URLs) and `e2e-real.cjs` (admin upload → publish → public playback/download → switch to YouTube).
