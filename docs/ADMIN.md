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

## Publishing semantics

- `published` rows become public when `published_at <= now()`. Leaving the date empty publishes immediately; a future date keeps the item hidden until then (no cron needed).
- `scheduled` status is read-only legacy: no job promotes it, so the editor does not offer it for new items.
- Slugs must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` (database constraint); a unique one is suggested for new items.
- Public content pages are rendered per request (no page cache), so published changes appear on the next page load.

## Known gaps / next steps

- Site settings screen: the `site_settings` table exists, but there is no UI and the public site does not read it yet.
- Rich text beyond paragraphs, headings and a pull quote.
- Role-based UI (owners vs editors) and an admin-users screen.
