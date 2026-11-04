# Architecture

## Overview

`ahmadza-web` is one Nuxt 4 application. Nuxt renders indexable public pages through Nitro. Pages request content from typed server endpoints; the server selects either the Supabase repository or the explicit local demo repository. The same domain model powers listings, detail pages, search, SEO, and the future CMS boundary.

```text
Browser / crawler
      ↓ SSR request
Nuxt route → useAsyncData / $fetch
      ↓
Nitro content API
      ↓ ContentRepository
      ├── Supabase adapter (configured)
      └── Local demo adapter (explicit fallback)
```

## Project structure

```text
app/
  assets/css/          design tokens and global utilities
  components/          shared UI and content feature components
  composables/         SEO, content queries, URL filters
  layouts/             public shell
  pages/               Nuxt route composition
  repositories/        content contract and adapters
  types/               domain models
  utils/               pure formatting and content helpers
server/
  api/                  public read endpoints and sitemap source
  utils/                repository selection and server-only clients
supabase/migrations/    additive schema, indexes, RLS, storage policies
tests/                  Playwright functional/responsive coverage
docs/                   product, architecture, reference study, decisions
```

## Domain model

`ContentItem` is a discriminated union over `article | book | sermon | audio | video | benefit`. Shared fields cover publication state, slug, timestamps, excerpt, body blocks, category relationships, featured order, and SEO. Type-specific fields add PDF, audio, or video metadata without optional-field ambiguity in consumers.

## Data access

Pages never import demo fixtures or the Supabase SDK. They use `/api/content` and `/api/content/:type/:slug`, which depend on `ContentRepository`. The local adapter supports deterministic development and testing. The Supabase adapter is selected only when both server environment values exist and returns published rows under RLS.

The API returns `source: "demo" | "supabase"` so developer and UI diagnostics never pretend demo data is remote content.

## Access gate (private launch)

`server/middleware/site-access.ts` runs before every page, API and file the server produces. While `site.publication` is not `published` it answers `503` + `noindex` + `no-store` (HTML coming-soon page, JSON, or text), except for the admin console shell, build assets, bundled artwork, `/robots.txt`, `/api/branding` and `/api/preview/session`. The RLS read policies follow the same switch, and an admin preview is a database-issued session. See [ADR 0004](./decisions/0004-private-launch-maintenance-gate.md) and [LAUNCH.md](./LAUNCH.md). `/robots.txt` is a server route (it depends on the state), so nothing may be prerendered or added to `public/` that would bypass the gate.

## Rendering and caching

- Home/about are prerendered.
- Public content pages use stale-while-revalidate caching for one hour.
- Search remains server-rendered and URL-driven (`q` and `type`) so results are linkable.
- Media is lazy-loaded below the fold, and unavailable media produces an honest static state.

## Book reader

Books are read on the site only. `BookReader` + `usePdfReader` draw one PDF page at a time onto a canvas with pdf.js, so the browser's own PDF viewer (with its download and print buttons) is never used, and the page has no open-in-new-tab link. A book shows a "تنزيل PDF" button only when its editor ticked "السماح بتنزيل الكتاب" (`metadata.downloadAllowed`, off by default); for files in Supabase Storage the link carries `?download=<slug>.pdf` so the file arrives as an attachment. The reader is client-only and lazy: pdf.js loads when a visitor presses "قراءة الكتاب". Its decoders, CMaps and fonts are served from `node_modules` under `/_pdfjs/<version>/` (`nitro.publicAssets` in `nuxt.config.ts`).

Without the download option the page has no download affordance, but this is not DRM, and a book that allows downloading hands over the file by design. The PDF is still a public Supabase Storage object that the browser fetches, so a determined visitor can recover it from the network log. The reader also blocks right-click save, drag, text selection and printing, which are deterrents only. Real protection would need a private bucket with short-lived signed URLs, or server-rendered page images.

## Security

- Public APIs expose only published content, and nothing at all while the site is in maintenance (gate and RLS).
- The Supabase URL and publishable key are public, so the database, not the page, has to refuse content in maintenance; it does (`site_is_published()` in the anonymous policies).
- RLS is enabled for all public tables. Anonymous roles receive select-only policies constrained by publication state.
- Future admin writes require authenticated membership in `admin_profiles`; no public sign-up or client-trusted role metadata exists.
- Service/secret keys never enter public runtime config or browser bundles.

## SEO

`useContentSeo` centralizes canonical URLs, titles, descriptions, Open Graph values, and JSON-LD. Breadcrumb schema is generated from known routes. Article/Book schema is emitted only where the necessary values are known. Sitemap URLs come from the same published repository.

## Error strategy

- Missing content returns a real 404 through `createError`.
- Repository failures return a sanitized 503 and are logged server-side without secrets.
- Listing components render loading, empty, and retryable error states.
- Media components distinguish unavailable demo media from failed real media.

## Future CMS boundary

The future CMS may write through separate authenticated Nitro endpoints or directly through a secured server client, but it must preserve the content schema, RLS rules, repository read contract, and publishing workflow. No admin UI code belongs in the public feature tree.
