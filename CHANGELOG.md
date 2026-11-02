# Changelog

All notable changes to this project are documented in this file. The format follows Keep a Changelog 1.1.0.

## [Unreleased]

### Added

- Complete Arabic RTL public website for articles, books, sermons, audio, benefits, videos, search, and author information.
- Typed local demo and Supabase content repositories with an explicit fallback source.
- Additive Supabase schema, storage buckets, indexes, and row-level security policies.
- SEO metadata, sitemap, robots rules, accessible states, responsive layouts, and Playwright coverage.
- Contemporary Accession Folio design system with self-hosted Arabic fonts.
- In-page book reader (pdf.js canvas) with page navigation, page jump, zoom and RTL arrow keys.
- `/admin/branding`: the owner can replace the header logo and the hero image (preview, validation, warnings, reset to the bundled artwork) and the public site shows the change immediately, without a redeploy.

### Changed

- The «عن الموقع» (About) page is removed, with its header and footer links, sitemap entry and prerender rule; the footer copyright line is centered.
- The bundled header logo and hero image (both warm-white, single-colour versions of the new artwork, like the previous logo) are now the client's «أحمد الزهراني» artwork (`/branding/*.webp`); the wrong name «أحمد زايد» is corrected to «أحمد الزهراني». `/admin/branding` has per-slot ratios and sizes (logo 12:5, 1200 × 500; hero 16:9, 1600 × 900). Saved owner images are untouched.
- Homepage: the «المكتبة الرقمية» heading and intro line, «اخترنا لكم», «أحدث المواضيع في أقسام المكتبة» and the header «أقسام المكتبة» dropdown are removed; the area around «أحدث المنشورات» is sits on one continuous Islamic pattern (13% opacity) with a large floral medallion half off each side, shared by all pages; the sections below the hero fade in as they scroll into view.

- Books are read on the site by default: the browser's PDF viewer and the "open in new tab" link are removed.
- Downloading is an opt-in per book: the admin book form has "السماح بتنزيل الكتاب" (off by default); when it is on, the book page shows a "تنزيل PDF" button next to the reader.

### Security

- `site_settings` writes are narrowed from "any active admin" to owners and the two branding keys; a check constraint pins branding values to files in the new `site-branding` bucket, which only owners can write (PNG/WebP, 5 MB, unique non-overwritable paths).
- Anonymous database access is limited to published content and public settings; all writes require an active authenticated admin profile.
