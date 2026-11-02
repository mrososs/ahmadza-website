# Admin console (`/admin`)

An Arabic RTL content console deployed with the public site. It is client-rendered (`ssr: false` for `/admin/**`), excluded from the sitemap and `robots.txt`, and served with `x-robots-tag: noindex`.

## Routes

| Route | Purpose |
| --- | --- |
| `/admin/login` | Email + password sign-in (Supabase Auth). |
| `/admin` | Counts by type and status, recent edits. |
| `/admin/content` | Filterable list (type, status, title search in the URL), delete with confirmation. |
| `/admin/content/new`, `/admin/content/:id` | Editor: basics, type-specific fields, body sections, publishing, categories, SEO. |
| `/admin/categories` | Create and edit categories. |
| `/admin/branding` | Owner only. Replace the header logo and the hero image, with preview, validation and reset (see "Site branding"). |

## Configuration

Set in Vercel (all environments that should expose the console):

```
NUXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Locally, put the same values (plus the server-side `NUXT_SUPABASE_URL` / `NUXT_SUPABASE_PUBLISHABLE_KEY` used by the public site) in `.env`; Nuxt does not read `.env.local`. The e2e suite blanks them so tests always run on the labelled demo data.

The publishable key is meant for browsers. Never place an `sb_secret_*` or `service_role` key anywhere in this app. Authorization is enforced by the RLS policies in `supabase/migrations/`, not by the route guard (which is only UX).

The public site reads the same pair (it also accepts the server-only `NUXT_SUPABASE_URL` / `NUXT_SUPABASE_PUBLISHABLE_KEY`). On a real Vercel production deployment the site refuses to serve bundled demo content when neither pair is set.

Without those variables, production builds show "not configured" on the login page and offer no access. Only `nuxt dev` falls back to a clearly labelled in-memory demo sandbox (the demo code is a dynamic import and is never part of production behaviour).

## Creating the first administrator

There is deliberately no sign-up. In the Supabase dashboard:

1. Authentication → Users → **Add user** (email + password, confirmed). Disable public sign-ups under Authentication → Providers → Email.
2. Run once in the SQL editor, replacing the id:

```sql
insert into public.admin_profiles (user_id, role, display_name)
values ('<auth user uuid>', 'owner', 'اسم المدير');
```

Set `active = false` on a profile to revoke access immediately.

## Password setup and recovery

Passwords are never stored in the repository. The owner sets one through the recovery flow:

1. `/admin/forgot-password` → enter the owner email → Supabase emails a one-time link.
2. The link opens `/admin/reset-password?code=…`. The page exchanges the code (PKCE), removes it from the address bar immediately, then asks for a new password (12+ characters, confirmed).

Open the email link in the **same browser** that requested it (PKCE keeps its verifier there).

Required Supabase dashboard settings (Authentication → URL Configuration), which cannot be changed from this repository:

- **Site URL:** the production origin, e.g. `https://ahmadza-website.vercel.app`.
- **Redirect URLs:** `https://ahmadza-website.vercel.app/admin/reset-password` (and the custom domain's equivalent once DNS moves).
- **Email delivery:** the built-in Supabase mailer only reaches addresses that belong to the Supabase organisation and is heavily rate-limited. For a client mailbox configure custom SMTP (Authentication → SMTP Settings) before relying on recovery.
- Recommended: raise the minimum password length and enable leaked-password protection (Authentication → Password security).

## Production smoke test

`SMOKE_URL=https://… npx playwright test -c playwright.smoke.config.ts` runs read-only checks (public pages, empty states, admin protection, bad-credential rejection, recovery pages). Optional `SMOKE_SUPABASE_URL`/`SMOKE_SUPABASE_KEY` add anonymous-write checks; `SMOKE_ADMIN_EMAIL`/`SMOKE_ADMIN_PASSWORD` add a sign-in/sign-out check. Nothing is created or deleted.

## Site branding (`/admin/branding`)

The owner can replace two images without touching code or redeploying:

| Image | Used by | Recommended | Bundled fallback |
| --- | --- | --- | --- |
| شعار الموقع (header logo) | `BrandMark` in the header and footer, and the admin top bar | 800 × 600 px (4:3) | `/ornaments/ahmad-zayed-hero-client.png` |
| صورة الواجهة الرئيسية (hero) | `SiteMasthead` | 1600 × 1200 px (4:3) | `/ornaments/ahmad-zayed-logo-client.png` |

The bundled file names are the reverse of what they show; the table above is authoritative.

- **Validation (browser):** PNG or WebP only, 5 MB maximum, readable as an image, at least 400 × 300 (logo) / 800 × 600 (hero) and at most 6000 px per side. Warnings, which never block saving: ratio far from 4:3, below the recommended size, no transparent background, artwork touching the image border. The site never crops: both images are shown with `object-fit: contain`.
- **Storage:** public bucket `site-branding` (5 MB and PNG/WebP enforced by Storage). Every upload gets a new `header-logo/<uuid>.<ext>` or `hero-image/<uuid>.<ext>` path, so a file is never overwritten and every URL is cache-safe. No SVG.
- **Setting rows:** `site_settings` keys `branding.header_logo` and `branding.hero_image` (`public_readable = true`), value `{ url, storagePath, alt, width, height, updatedAt }`. A check constraint requires the URL to point at that exact storage path. No row means the bundled image.
- **Authorization:** only an active `owner` can insert/update/delete these two keys and upload/delete files in the bucket (`is_active_owner()` in RLS). Editors can read settings but not change them, and do not see the menu entry.
- **Save is safe:** the file is uploaded first and the setting is changed second. If the setting cannot be saved the new file is removed and the current image stays live. Replaced files are kept (so a page cached elsewhere never shows a broken image); only the owner-only delete policy can remove them.
- **Reset:** "استعادة الصورة الافتراضية" deletes the setting row after a confirmation. The uploaded file stays in storage.
- **Public site:** `GET /api/branding` (`no-store`) reads the rows through `ContentRepository.getBranding()`; `useSiteBranding()` shares that one result between the header, footer and hero through the SSR payload. If the request fails, or a row is invalid, the bundled image is served and the reason is logged. Prerendered pages (`/about`) revalidate the branding once after hydration.
- **Local end-to-end test:** `npm run test:e2e:branding` needs a local Supabase stack (`supabase start`) and refuses non-local URLs; see `playwright.branding.config.ts`.

## Publishing semantics

- `published` rows become public when `published_at <= now()`. Leaving the date empty publishes immediately; a future date keeps the item hidden until then (no cron needed).
- `scheduled` status is read-only legacy: no job promotes it, so the editor does not offer it for new items.
- Slugs must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` (database constraint); a unique one is suggested for new items.
- Public content pages are rendered per request (no page cache), so published changes appear on the next page load.

## Known gaps / next steps

- Site settings other than branding: `site_settings` only accepts the two branding keys (owner-only); other settings need their own policy.
- Replaced or reset branding files are never deleted by the app; prune them from the `site-branding` bucket if storage matters.
- Rich text beyond paragraphs, headings and a pull quote.
- Role-based UI (owners vs editors) and an admin-users screen.
