# Private launch: settings, deployment and rollback

How the site stays hidden until the owner publishes it, what to set in Vercel before and after launch, and how to roll out and roll back safely. The design and its reasons are in [ADR 0004](./decisions/0004-private-launch-maintenance-gate.md); the admin screens are in [ADMIN.md](./ADMIN.md).

## What protects what

| Layer | In maintenance | After publishing |
| --- | --- | --- |
| Site (every host name: `prof-ahmadza.com`, `www`, `*.vercel.app`, preview deployments) | Every page, API and file answers `503` + `noindex` + `no-store`; pages show «قريبًا بإذن الله». Open: `/admin/**`, `/_nuxt`, bundled artwork, `/robots.txt`, `/api/branding`, `/api/preview/session`. | Normal site. |
| `/robots.txt`, `/sitemap.xml` | robots has no sitemap line; the sitemap answers `503`. | Real robots.txt and sitemap. |
| Supabase REST (`content_items`, `categories`, links, media metadata) | Empty for visitors and anyone holding only the public key. | Published rows only, as before. |
| Supabase Storage | `publications` can no longer be listed by visitors. Uploaded videos cannot be signed. Public-bucket files stay reachable **by exact URL** (see limitations). | Same, videos signable for published videos. |
| Admin | Sign in at `/admin/login`; dashboard, editor and uploads work; «معاينة الموقع» opens the real site. | Same. |

Nothing is configured in code or environment variables to switch modes: the owner uses **«حالة نشر الموقع»** in `/admin/branding`.

## Vercel settings

The project is currently protected by **Vercel Authentication** on every host name (checked: `prof-ahmadza.com`, `www.prof-ahmadza.com` and `ahmadza-website.vercel.app` all redirect to Vercel SSO). That protection must stay until the new gate is deployed and verified, and then be switched off, or the owner cannot reach `/admin/login` on the real domain and visitors cannot see the coming-soon page.

### Before deploying (leave as is)

- **Deployment Protection:** keep Vercel Authentication enabled for **All deployments** until step 6 below.
- **Environment variables (Production, and Preview if previews should show real content):** `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (optionally `NUXT_SUPABASE_URL` / `NUXT_SUPABASE_PUBLISHABLE_KEY`), `NUXT_PUBLIC_SITE_URL=https://prof-ahmadza.com`. No new variable is needed. Never add a secret or service-role key.
- **Domains:** keep `prof-ahmadza.com` and `www.prof-ahmadza.com` as they are. Redirect one to the other with Vercel's domain redirect setting if you want a single canonical host; the app's canonical URLs already point at `NUXT_PUBLIC_SITE_URL`.

### When the gate is verified (step 6): open the site to visitors

- **Deployment Protection → Vercel Authentication:** change it from *All deployments* to the option that protects **only Preview deployments** (the dashboard calls it «Standard Protection» or «Only Preview Deployments», depending on plan and version; production domains must end up public). This is the change that makes the coming-soon page public. Keep Preview deployments protected. The wording above comes from the documented behaviour, not from the project's dashboard (the Vercel connection available while this was written could not see the project), so confirm it with the curl checks below.
- Leave everything else unchanged. Do not touch DNS, Hostinger or Supabase credentials.
- Confirm after the change (see "Checks"): the home page answers `503` with the coming-soon page, not a Vercel login redirect.

### At launch

Nothing in Vercel changes. The owner opens **حالة نشر الموقع** and confirms **نشر الموقع للجمهور**. Optionally submit `https://prof-ahmadza.com/sitemap.xml` in Google Search Console afterwards.

### If you need to hide everything again at the platform level

Re-enable Vercel Authentication for **All deployments**. This is the emergency brake and does not depend on this application or its database.

## Safe deployment checklist

Do these in order. Nothing here requires publishing, and at no point is the site public: until step 6 Vercel Authentication still hides everything.

1. **Review** the branch (`supabase/migrations/20261104000100_site_publication.sql` and the code). Run the checks below locally (they use a local Supabase, never the hosted project).
2. **Back up**: take a database backup or note the point-in-time restore position (Supabase → Database → Backups). The migration is additive but it changes read policies.
3. **Apply the migration** to the hosted project (SQL editor or `supabase db push`), *before* the new code. Effects, all intended: the `site.publication` row does not exist, so `site_is_published()` is `false`; anonymous reads of content, categories and their links return nothing; the `publications` bucket stops being listable; the current (old) deployment keeps working behind Vercel Authentication but shows empty lists until the site is published. The admin console is unaffected (admins read through their own policies).
4. **Deploy** the new code (Preview first, then Production). Both are still behind Vercel Authentication.
5. **Verify on the deployment** while signed in to Vercel (see "Checks"): coming-soon page, `503`s, admin sign-in, preview, publish and un-publish on a Preview deployment if it points at a test database, otherwise only the maintenance and preview checks on Production (do not publish yet).
6. **Switch Vercel protection** as described above. Immediately run the "Anonymous visitor" checks from a browser or phone that is not signed in to Vercel.
7. **Launch** when the owner decides: confirm in the admin panel, then run the "After launch" checks.

## Checks

Anonymous visitor (private window, or `curl -i`), while in maintenance:

```
curl -i https://prof-ahmadza.com/                        # 503, noindex, no-store, «قريبًا بإذن الله»
curl -i https://prof-ahmadza.com/articles/<any-slug>      # 503, identical page
curl -i https://prof-ahmadza.com/api/content              # 503 JSON, no items
curl -i https://www.prof-ahmadza.com/                     # same
curl -i https://ahmadza-website.vercel.app/               # same
curl -i https://prof-ahmadza.com/sitemap.xml              # 503
curl -s https://prof-ahmadza.com/robots.txt               # no Sitemap line
curl -s "https://<project-ref>.supabase.co/rest/v1/content_items?select=slug" -H "apikey: <publishable key>"   # []
```

Owner: sign in at `/admin/login` → dashboard → «معاينة الموقع» opens the real site with the bar «معاينة المدير» and a link back; sign out → the same address shows the coming-soon page again.

After launch: the home page, an article, `/api/content`, `/sitemap.xml` answer `200`; `robots.txt` has the Sitemap line; pages have no `x-robots-tag: noindex`; the Supabase REST query above returns the published rows.

Automated (local only, never against the hosted project):

```bash
npm run typecheck
npm run build
npm run test:e2e                 # demo data, including the path-rule unit tests
npm run test:e2e:maintenance     # coming-soon page: accessibility, 360/390/768/1024/1440, no-JS
# real local Supabase (npx supabase start, apply supabase/migrations):
LOCAL_SUPABASE_URL=http://127.0.0.1:54321 LOCAL_SUPABASE_KEY=<publishable> LOCAL_SUPABASE_SECRET_KEY=<secret> npm run test:e2e:publication
BRANDING_SUPABASE_URL=… BRANDING_SUPABASE_KEY=… BRANDING_SUPABASE_SECRET_KEY=… npm run test:e2e:branding
```

## Rollback

- **Hide the site again (owner, seconds):** «حالة نشر الموقع» → return to maintenance. The database stops serving content at once; the site follows within about 5 seconds.
- **Hide it without the application:** SQL editor: `update public.site_settings set value = '{"mode":"maintenance"}' where key = 'site.publication';` or re-enable Vercel Authentication for all deployments.
- **Revoke every preview session:** `delete from public.preview_sessions;` (admins simply start a new one the next time they open the console).
- **Bad deployment:** promote the previous deployment in Vercel (Instant Rollback). Code from before this feature has no gate. With the site published it works exactly as before; in maintenance visitors would get an empty-looking site (the database still returns nothing) instead of the coming-soon page. So if you roll back to the old code, keep Vercel Authentication enabled for all deployments until you roll forward again.
- **Undo the migration** (last resort, only before launch): drop the new functions and table and restore the two policies and the storage policy from `20261031000100_content_foundation.sql`. Prefer rolling forward.

## Known limitations

- **Public-bucket files are public by URL.** `publications` (PDFs, audio, covers) and `site-branding` are public buckets: anyone who already has an exact object URL can fetch it, in maintenance too. What changed: the bucket can no longer be listed, and no API reveals the URLs while the site is hidden. PDFs the site shows in its reader are fetched by the visitor's browser from that URL after launch, as before; the reader's restrictions are deterrents, not DRM (see ARCHITECTURE.md). Truly private files need private buckets with signed URLs and a migration of existing URLs; do not call a file private while its public URL works.
- **Uploaded videos** live in a private bucket and are served through short-lived signed URLs only for published videos, and (now) only while the site is published or for an admin preview. A signed URL that was already issued keeps working until it expires (up to 2 hours for playback, 60 seconds for downloads), even if the site goes back to maintenance meanwhile.
- **Propagation:** each server instance caches the publication state for about 5 seconds and a verified preview for about 10 seconds. The database itself applies changes immediately, so even inside that window a site that was just returned to maintenance serves no content (its reads come back empty); only the page chrome and the coming-soon swap lag.
- **The admin console is reachable by anyone** (it has to be, to sign in). It shows no content, `/admin` is `noindex`, sign-up is disabled, and every action is checked by RLS.
- **Preview deployments** use the same switch if they point at this database. They also send `x-robots-tag: noindex` whatever the state.
- **The demo adapter** (no Supabase configured) is open on a developer machine and hidden on any Vercel deployment. `NUXT_SITE_ACCESS_DEMO_MODE=maintenance` forces maintenance in tests; nothing can force "published".
- **Search engines** see `503` + `noindex` in maintenance (a temporary state, nothing is indexed). `robots.txt` deliberately stays crawlable in maintenance so the `noindex` is seen.
- A request that carries a valid preview cookie is served the real site with `Cache-Control: private, no-store`; shared caches never keep it.
