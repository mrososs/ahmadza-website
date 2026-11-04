---
status: accepted
date: 2026-11-04
decision-makers: site owner and implementation team
consulted: not recorded
informed: future maintainers
---

# Private launch: a server-side maintenance gate backed by the database

## Context and Problem Statement

Until now the only thing keeping the site private was Vercel Deployment Protection, which hides every URL, including `/admin`, from everyone who is not signed in to Vercel. The owner needs to keep working on the real domain (sign in, write, upload, preview the site as visitors will see it), and to launch later without editing code, redeploying or touching DNS. Three facts shape the design:

- Admin authentication lives in the browser (Supabase session in local storage), so a server cannot tell who is browsing a public page.
- The Supabase URL and publishable key are public by design and appear in the admin console's page payload, so anyone can call the Supabase REST and Storage APIs directly. Hiding pages alone would not hide the content.
- `ssr: false` admin pages and public pages share one deployment, and every alias (`prof-ahmadza.com`, `www`, `*.vercel.app`, preview deployments) runs the same code against the same database.

## Decision Drivers

- Fail closed: a missing, malformed or unreadable setting must never launch the site.
- Authorization comes from the existing trusted mechanism (an active `admin_profiles` row, enforced in the database), never from a flag, parameter, local storage or an unsigned or forgeable cookie.
- No flash of protected content and nothing a client-side route can bypass.
- Reuse existing infrastructure (`site_settings`, `ContentRepository`, RLS, admin session); no second authentication system; no secret keys in the app.

## Considered Options

- Vercel Deployment Protection only (status quo): hides the admin console too, no owner preview on the real domain, can only be changed in the Vercel dashboard.
- Edge or Nitro middleware that redirects to a coming-soon route, with a signed cookie for admins: needs a signing secret, cannot revoke, leaves the Supabase APIs open.
- A server gate plus database-enforced reads and database-issued preview sessions (chosen).

## Decision Outcome

1. **State.** One public `site_settings` row, `site.publication` = `{"mode":"maintenance"|"published"}`. Only an active owner can write it (RLS, `is_active_owner()`); the existing trigger stamps `updated_at`/`updated_by`, which is the audit trail. No row means maintenance.
2. **Gate.** A Nitro middleware (`server/middleware/site-access.ts`) runs before every page, API and file the function serves. In maintenance it answers `503` with `Retry-After`, `no-store` and `noindex`: the coming-soon HTML for pages, JSON for APIs, plain text for files. Every gated page answers identically. Only the admin console, build assets, bundled artwork, `robots.txt`, `/api/branding` and the preview-session endpoints stay open. The path classifier checks the raw, normalized and decoded forms, so an open prefix cannot carry a content route through. Reading the state fails closed and is cached for a few seconds per instance.
3. **Coming-soon page** is plain server-built HTML/CSS (no scripts, no runtime config, strict CSP), so it renders when Nuxt or Supabase cannot, and leaks no Supabase URL or key.
4. **Database follows the switch.** The anonymous read policies for `content_items` and `categories` (and, through them, categories links, media links, media metadata and the published-video storage policy) require `site_is_published()`; the `publications` bucket can no longer be listed by anonymous users.
5. **Preview.** The admin console asks the site's server for a preview session; the server calls `start_preview_session()` with the admin's own JWT. The database checks `is_active_admin()` and stores only the SHA-256 of a random 244-bit token; the token is returned once and kept in an `HttpOnly`, `SameSite=Lax`, host-pinned cookie. The server verifies it with `verify_preview_token()` and forwards it as `x-preview-token` on its own reads; the RLS policies accept it only while the session is unexpired and the admin profile is still active. Sign-out revokes the row; deactivating the profile or 12 hours ends it.

### Consequences

- Good: no new secret, no new auth system, no service-role key. Launch and return-to-maintenance are one confirmed click.
- Good: direct Supabase REST and Storage API access is closed in maintenance, not just the pages.
- Good: preview shows exactly what visitors will get (published rows only, anonymous policies) and is revoked in the database.
- Bad: a launch or return reaches each server instance within about 5 seconds (state cache), and a revoked preview within about 10 seconds on the site (the database itself refuses at once).
- Bad: files in public buckets (`publications`, `site-branding`) remain reachable by their exact URL, as any public bucket is. They are no longer enumerable, and their URLs are no longer discoverable from the APIs during maintenance, but they are not private. Truly private delivery needs private buckets and signed URLs (as for uploaded videos) and a data migration of existing URLs; that is deliberately out of scope.
- Bad: while the site is in maintenance the admin console is still publicly reachable (it must be, to sign in); it contains no content and everything it does is checked by RLS.

### Confirmation

`tests/site-access-paths.spec.ts` (path rules), `tests/maintenance/` (coming-soon page, accessibility, viewports) and `tests/publication/` (real local Supabase: gate, bypass attempts, RLS, preview lifecycle, publish and return, storage) must pass. The runbook is `docs/LAUNCH.md`.
