# Product

<!-- impeccable:product-schema 1 -->

> This record is inferred from the client brief supplied on 2026-10-31 because the structured interview mechanism is unavailable in the current execution mode. Items that require client confirmation are marked explicitly.

## Platform

web

## Stack

Nuxt 4 with Vue 3 Composition API, strict TypeScript, Tailwind CSS 4, Nuxt SSR/Nitro, and Supabase for the future managed content source. The public site must remain fully usable through an explicit local demo adapter when Supabase is not configured.

## Users

The primary users are Arabic-speaking readers seeking trustworthy long- and short-form educational material. They arrive to discover a publication, look up a specific topic, read an article or sermon, browse books, listen to a lecture, or watch a video. They may use a phone in a brief lookup session or a larger screen for sustained reading.

The future secondary user is an authorized site administrator who will manage content through a custom CMS. The CMS itself is outside this phase, but the data and authorization boundaries must support it.

## Product Purpose

`ahmadza-web` is an Arabic personal publishing website and digital knowledge library. It gives one academic/content author a durable, searchable home for articles, books and PDFs, written sermons, audio lectures, videos, and short educational benefits. Success means visitors can find and consume the right material with very little interface friction while the system remains ready for a later editorial CMS and legacy-data migration.

## Positioning

The product combines the calm authority and reading quality of a premium Arabic academic publication with the findability and cross-format organization of a digital library. Content—not social features, transactions, or platform mechanics—is the product.

## Operating Context

- Arabic-first and right-to-left across navigation, metadata, forms, and reading surfaces.
- Search and category browsing are primary discovery paths.
- Long passages may contain Arabic diacritics, quotations, and religious text that require generous line height and reliable font shaping.
- Content may exist as text, PDFs, browser-compatible audio, or valid YouTube links; unavailable media must be represented honestly.
- Public visitors never need an account. Future administration is private and authorization-gated.

## Capabilities and Constraints

- Public routes: home, articles, books, sermons, audio, benefits, videos, unified search, about, and detail routes for all content types except the directory-only videos route requested for this phase.
- Server-rendered semantic pages with per-route SEO metadata, canonical URLs, Open Graph data, breadcrumbs, sitemap, and robots rules.
- Unified typed content model with draft/published state, slugs, categories, media, featured ordering, and SEO fields.
- Supabase PostgreSQL, Auth, Storage, and RLS form the production data foundation; anonymous users can read only published content and cannot write.
- Local demo data is an explicit fallback and must never be presented as production or Supabase-sourced data.
- No payments, commerce, public registration, admin CMS UI, legacy migration, DNS work, or deployment in this phase.
- The production biography, portrait, credentials, audio files, PDFs, YouTube channel, social links, and final editorial copy have not been supplied and must not be invented.

## Brand Commitments

- Project name: `ahmadza-web`; intended public domain: `prof-ahmadza.com`.
- Primary language is Arabic.
- The client asked for a contemporary Arabic editorial library: premium, calm, intellectual, trustworthy, refined, modern, timeless, and accessible.
- Warm ivory/paper, deep charcoal, forest green, and restrained antique gold are the starting palette, subject to contrast and system refinement.
- The experience must avoid generic SaaS styling, gratuitous gradients, glassmorphism, repetitive cards, fake metrics, invented proof, and generic AI illustration.
- [haddady.com](https://haddady.com/) is a functional and information-architecture reference only. Its branding, copy, layout, assets, and code are not to be copied.

## Evidence on Hand

- A detailed client brief defining content types, public routes, technical stack, security requirements, and visual intent.
- The public reference site demonstrates a library organized around sermons, articles, audio, books, benefits, search, recent content, featured selections, and YouTube embeds.
- No verified client biography, portrait, logo, publication catalog, downloadable files, audio assets, analytics, testimonials, or institutional claims are available.

## Product Principles

1. Make content legible before making the interface noticeable.
2. Treat every unavailable fact or media asset honestly; placeholders are labeled and claims are never invented.
3. Let search, categories, and cross-format relationships make a growing archive feel navigable.
4. Keep the public experience fast and low-JavaScript while preserving expressive editorial composition.
5. Build one pragmatic Nuxt application with clear content boundaries that can accept a secure CMS later.

## Accessibility & Inclusion

- Arabic RTL is a first-class layout constraint, not a mirrored afterthought.
- Keyboard access, visible focus, touch targets, sufficient contrast, reduced-motion support, semantic landmarks, accessible media controls, and responsive reading at 360, 390, 768, 1024, and 1440 pixels are required.
- Text resizing and long/diacritized Arabic headings must not cause clipping or horizontal overflow.
