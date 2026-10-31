# Reference Analysis: haddady.com

Analyzed on 2026-10-31. The reference is used for functional and information-architecture study only. No branding, copy, assets, layout, or code is copied.

## 1. Functional patterns worth keeping

- A single library spanning written sermons, articles, audio, books/PDFs, short benefits, and video.
- Persistent search near the top of the experience.
- Clear subcategories inside large content types: sermon subjects, article formats, and audio formats.
- A homepage that exposes both recent publications and editor-selected material.
- Detail pages that surface title, date, body/media, and a path back into the archive.
- Native delivery patterns for the medium: text for reading, direct download for a real PDF, audio playback for a real file, and valid YouTube embeds.

## 2. UX weaknesses to improve

- Navigation labels are duplicated and visually crowded, while the content hierarchy is difficult to scan.
- The homepage repeats similar lists and check-mark motifs, weakening editorial priority.
- Search is present but has little guidance, result typing, or URL-based refinement.
- Long reading pages lack a calm measure, strong section hierarchy, breadcrumb context, and modern sharing affordances.
- Author usernames, uncategorized labels, visit counts, and comment forms add noise without helping the primary reading journey.
- Book detail pages may reduce a publication to a title and download link; they need descriptive metadata and honest availability states.
- Mobile hierarchy, focus treatment, and media accessibility are not evident from the crawled structure.

## 3. Information architecture

```text
Home
├── Articles
│   ├── Categories
│   └── Article detail
├── Books
│   ├── Categories
│   └── Book detail / available PDF
├── Sermons
│   ├── Categories
│   └── Sermon detail / optional audio
├── Audio
│   ├── Lessons
│   ├── Lectures
│   └── Audio detail / player
├── Benefits
│   └── Short-form detail
├── Videos
│   └── Valid external embed or honest unavailable state
├── Unified search
└── About
```

Categories are many-to-many metadata rather than routes hard-coded into navigation. Content types remain stable; editorial taxonomy may evolve through the future CMS.

## 4. Main visitor journeys

1. **Find a known topic:** open search, enter an Arabic phrase, filter by type, inspect metadata, open the result.
2. **Browse an archive:** choose a content type, refine by category, scan editorial previews, paginate, open detail.
3. **Read deeply:** arrive from search/social, understand title/date/category, read within a comfortable column, copy the link, continue to related material.
4. **Use media:** inspect duration/format, play a real compatible source or open a valid embed, then browse related material.
5. **Discover recent work:** scan the homepage’s varied modules, move from a featured publication to a newest-by-format section.

## 5. Unique visual direction

“Contemporary Accession Folio” treats the site as a living Arabic library ledger. Warm paper fields, deep forest ink, precise brass rules, generous Naskh typography, and index-like wayfinding create academic authority without ornamental nostalgia. Sections change composition according to medium: broad editorial spreads for featured articles, shelf-like book runs, ruled audio rows, compact benefit slips, and cinematic video frames.

## 6. Proposed improvements

- Replace repeated generic lists with a clear editorial hierarchy and distinct content-type compositions.
- Make unified search URL-driven, filterable, and explicit about result type and source.
- Add consistent breadcrumbs, content metadata, related items, and share/copy-link feedback.
- Give long Arabic text a 68–72ch measure, generous line height, font-size resilience, and meaningful headings.
- Use explicit demo/unavailable states rather than fake PDF, audio, or embed functionality.
- Prepare one typed repository contract so local demo data and Supabase-published content behave consistently.
- Add SSR metadata, canonical URLs, sitemap, robots, and only evidence-backed structured data.

## Sources

- [Reference homepage](https://haddady.com/)
- [Example long-form sermon page](https://haddady.com/23015-2/)
- [Example book/PDF page](https://haddady.com/book/19884-2/)
