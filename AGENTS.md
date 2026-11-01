# AGENTS.md

## Product boundary

This repository contains one Arabic-first Nuxt 4 public website and its content console at `/admin` (see `docs/ADMIN.md`). Migration utilities, deployment, and DNS are out of scope. Demo content must remain explicitly labeled and must never be presented as client fact.

## Architecture

- Follow Nuxt 4 directories: application code in `app/`, Nitro code in `server/`, static files in `public/`, database changes in `supabase/migrations/`.
- Routes compose features; components own meaningful UI responsibilities; composables own focused stateful behavior. Do not create catch-all controllers.
- Access content through `ContentRepository`. Pages must not import demo data or Supabase directly.
- Keep the demo and Supabase adapters behaviorally compatible. Supabase fallback is explicit, never silent in developer diagnostics.
- Do not add Pinia unless state must outlive a route and has multiple independent consumers.

## Vue and TypeScript

- Use Vue 3 Composition API with `<script setup lang="ts">` and SFC order: script, template, style.
- Props down, typed events up. Derive with `computed`; watchers are for side effects and require cleanup.
- Strict TypeScript is mandatory. Avoid `any`, unsafe assertions, module-level reactive state, and dynamic Tailwind class construction.
- Validate external or database-shaped values at boundaries. Prefer discriminated unions and exhaustive switches.

## Supabase security

- Every exposed table has RLS enabled. Anonymous users may select only `published` content. Anonymous writes are forbidden.
- Admin mutations require an authenticated user with an active `admin_profiles` row and an authorized role.
- Never expose `sb_secret_*`, `service_role`, or any equivalent bypass key. Never create open admin registration.
- All schema changes are additive migrations. Do not run destructive remote database commands from this repository.

## RTL, accessibility, and content

- Arabic RTL is the default. Use logical CSS properties and verify punctuation, numerals, long headings, and diacritized passages.
- Maintain semantic landmarks, correct heading order, keyboard access, visible focus, 44px touch targets, AA contrast, reduced-motion support, and no horizontal overflow at 360px.
- Use native media controls unless a custom control is fully keyboard- and screen-reader-accessible.
- Do not render unsanitized HTML. Demo media must not imply that a file exists.

## SEO and performance

- Every route defines a unique title and description, canonical URL, and relevant Open Graph metadata.
- Structured data contains only known values. Use breadcrumb schema and Article/Book schema only when fields are real.
- Prefer SSR-safe data fetching. Avoid client-only fetching for indexable content and avoid unnecessary JavaScript.
- Self-host Arabic fonts, reserve media dimensions, lazy-load below-the-fold media, and keep reading measure between roughly 65–75 characters.

## Design system

- `DESIGN.md` and `app/assets/css/main.css` are the design authorities. Reuse semantic tokens rather than inventing local color values.
- The visual world is “Contemporary Accession Folio”: warm paper, forest ink, brass rules, editorial asymmetry, and index-like navigation.
- Avoid generic gradient heroes, blue/purple SaaS palettes, glassmorphism, glow effects, excessive pills, repeated identical cards, fake metrics, ornamental mosque clichés, and invented testimonials.
- Use Impeccable context before design work. Run critique/audit/polish in bounded passes. If the automatic hook is unavailable, run its detector once after the final UI edit.

## Verification

- Required before handoff: `npm run typecheck`, `npm run build`, and `npm run test:e2e`.
- Browser checks cover 360, 390, 768, 1024, and 1440 widths, keyboard navigation, search, mobile navigation, detail routes, copy-link behavior, and media empty states.

## Admin console

- Admin routes live under `app/pages/admin/`, use the `admin` layout and `admin` middleware, and are never SSR, indexed, or linked from public pages.
- Admin data goes through `AdminRepository` (`app/repositories/admin/`); the demo adapter is dev-only and must stay a dynamic import.
- The browser uses only the publishable key. RLS is the authorization boundary; the route guard is UX.
