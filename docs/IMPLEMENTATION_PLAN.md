# Public Website Technical Specification

## 1. Overview

Build a production-ready Arabic digital knowledge library in Nuxt 4, with complete public routes, an expressive RTL editorial system, typed local/Supabase data adapters, SEO, accessibility, responsive behavior, and browser verification.

## 2. Requirements

### REQ-001 — Public route coverage (must)

- `/`, `/articles`, `/articles/:slug`, `/books`, `/books/:slug`, `/sermons`, `/sermons/:slug`, `/audio`, `/audio/:slug`, `/benefits`, `/benefits/:slug`, `/videos`, `/search`, and `/about` render without client-only dependencies.
- Unknown detail slugs return HTTP 404.

### REQ-002 — Content discovery (must)

- Listings support URL-based text search and category filters.
- Unified search filters by content type and returns metadata identifying each result.
- Demo data produces deterministic search results.

### REQ-003 — Honest media behavior (must)

- Audio uses native browser-compatible controls only when a valid source exists.
- Books expose preview/download only when a valid PDF source exists.
- Videos embed only a recognized valid YouTube identifier.
- Missing media renders an explicit unavailable/demo state.

### REQ-004 — Arabic editorial experience (must)

- The document is `lang="ar" dir="rtl"`.
- Long reading pages maintain a 65–75ch measure and no horizontal overflow from 360–1440px.
- Keyboard focus, semantic headings, landmarks, reduced motion, and AA text contrast are present.

### REQ-005 — Data foundation (must)

- A typed repository interface supports local demo and Supabase adapters.
- Supabase migrations create content, categories, relationships, media, settings, admin profiles, publishing state, SEO fields, indexes, and RLS.
- Anonymous writes are denied and public reads are limited to published content.

### REQ-006 — SEO and performance (must)

- Routes include unique titles, descriptions, canonical URLs, and Open Graph metadata.
- Robots and sitemap are available.
- Breadcrumb and content structured data contain only known values.
- Arabic fonts are self-hosted and below-the-fold media is lazy-loaded.

### REQ-007 — Verification (must)

- `npm run typecheck` and `npm run build` exit successfully.
- Playwright smoke tests cover navigation, search, a detail page, mobile menu, copy link, and representative viewports.
- Axe finds no automatically detectable WCAG 2 A/AA violations on the homepage and a reading page.

## 3. Goals and non-goals

### Goals

- A complete public website that can be launched locally and browsed without external credentials.
- A distinctive reusable design system with high-quality Arabic reading.
- A secure, additive foundation for the later CMS.

### Non-goals

- Admin CMS UI, public registration, payments, legacy migration, production deployment, DNS, and modification of the reference or legacy site.

## 4. Technical design

See [ARCHITECTURE.md](./ARCHITECTURE.md) and the decision records in [`docs/decisions`](./decisions/README.md).

Failure modes are handled with real 404 responses, 503 repository responses, retryable UI states, and honest media-unavailable states. Authorization is enforced by Supabase RLS, not by route guards or user-editable metadata.

## 5. Alternatives considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Nuxt server API over repository adapters | SSR-safe, hides data-source details, future CMS boundary | Adds a small server layer | Chosen |
| Import demo data directly in pages | Minimal code | Couples routes to fixtures and blocks Supabase | Rejected |
| Nuxt Content as the primary CMS | Strong file-based authoring | Conflicts with required Supabase CMS foundation | Rejected |
| Pinia for all content state | Familiar shared store | Unnecessary for URL/SSR-owned state | Rejected |

## 6. Implementation plan

- [x] Product context, reference analysis, architecture, design direction, ADRs.
- [x] Nuxt/Tailwind scaffold, design tokens, shell, and shared components.
- [x] Domain model, demo repository, Supabase repository, public Nitro endpoints.
- [x] Homepage and public route implementation.
- [x] Supabase migration and setup guide.
- [x] Typecheck, build, Playwright, responsive screenshots, critique/audit/polish fixes.

## 7. Testing strategy

- Type contracts: Nuxt typecheck with strict TypeScript.
- Build integration: Nuxt production build and generated sitemap/robots inspection.
- E2E: role-based Playwright locators, Chromium desktop/mobile projects, URL assertions, overflow checks, and accessibility scans.
- Manual visual review: batched desktop/mobile screenshots at requested widths, followed by one correction pass and one confirmation pass.

## 8. Rollout and rollback

This phase produces a standalone new application and does not touch the legacy site or production database. Deployment will be a later explicit operation. Rollback is switching traffic back to the untouched legacy origin. Database rollout uses additive migrations and must be validated locally before any future remote push.

## 9. Open decisions

- Final production biography, portrait, wordmark, social links, media assets, downloads, and channel URLs require client-provided source material.
- Hosting target and production Supabase project are deliberately deferred.
