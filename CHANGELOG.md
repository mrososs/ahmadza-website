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

### Changed

- Books are read on the site only: the browser's PDF viewer, the "open in new tab" link, the "download PDF" button and the admin "allow download" option are removed.

### Security

- Anonymous database access is limited to published content and public settings; all writes require an active authenticated admin profile.
