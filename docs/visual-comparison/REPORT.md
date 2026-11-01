# Visual comparison — 2026-10-31

Reference captures are in `../visual-reference/reference-{1440,1280,768,390,360}.png`; corresponding baseline implementation captures are `current-{width}.png`. Both sites were rendered at identical CSS viewport widths. The first comparison pair is `comparison-desktop-round1.png` and `comparison-mobile-round1.png`; the final pair is `comparison-desktop.png` and `comparison-mobile.png`. Intermediate implementation captures are `implementation-{1440,390}-round{1,2,3}.png`.

## Three meaningful refinements

1. Replaced the initial white desktop header, text-heavy hero, and static orange bar with a charcoal reference-shaped stage and a real moving capsule ribbon.
2. Matched the mobile white header orientation and calmed the hero's overly bright geometric medallion after the first side-by-side capture.
3. Replaced that geometry with independently generated floral artwork, keeping the client name as live AlMohanad text. The supplied image is transparent, original, and has its generation prompt embedded as PNG metadata.

## Final relationship

- **Closer:** charcoal desktop header and hero, white mobile header, centered Arabic identity, warm floral background, orange moving capsules, category module presentation, AlMohanad typography.
- **Still different:** the reference's proprietary calligraphic name image has no client-approved equivalent. The live text wordmark is deliberately simpler. The original floral medallion has more filled detail and color than the reference's fine line ornament. Lower modules retain the working client content model because the reference's lazy-loaded full-page captures did not reliably expose their complete geometry.
- **Client-requested identity revision:** the final hero now displays the configured author name as large live AlMohanad text within an original ornamental SVG frame. The shared logo is a stacked live-text name over the original floral medallion. Final captures are `implementation-{1440,390}-name-logo.png`; these feed the comparison HTML and images.
- **Carousel finding:** the reference's five inspected Owl frames all contain the same `slider-white.png` identity image and no distinct slide text. Rotating identical client identity frames would add motion without new content, so the implementation keeps one stable, accessible identity stage.

The screenshots document visual evidence, not a claim of pixel equivalence. None of the reference owner's artwork or logo is shipped in the application.

## Outlined identity revision

The two original, separate assets `public/ornaments/ahmad-zayed-hero.svg` and `public/ornaments/ahmad-zayed-logo.svg` replace the live text arrangements. `scripts/build-calligraphy.mjs` shapes the confirmed Arabic words with Amiri and writes their glyph contours as SVG paths, then adds independent drawn flourishes for wide and compact compositions. The result is vector artwork with correct source spelling, not an embedded raster or a resized logo. The source font AlMohanad has no Unicode Arabic mapping, so it cannot itself be converted into correctly shaped outlines from normal Arabic text; the existing UI stack retains its fallback. The artwork should be reviewed by a professional Arabic calligrapher before becoming permanent client branding.

The shared inner page styles now carry the charcoal ornamental title surface into category, detail, about, and search layouts. Directory results use quieter index-like separators and squared filters. Chrome inspection at 390 and 1440 pixels found the new lettering legible and the header logo distinct; the article directory exposed an overly tall title block, which was reduced to a 260px desktop minimum and 230px mobile minimum. The latest validation passed typecheck and 9 Playwright tests (1 intentional skip).

Final production captures: `implementation-1440-calligraphy.png`, `implementation-390-calligraphy.png`, `articles-1440-calligraphy.png`, and `article-390-calligraphy.png`. The production build completed successfully, and Impeccable's detector returned no findings.

## Client PNG identity

The client supplied two final PNG images. `ahmad-zayed-banner.png` is now the homepage hero artwork, and `ahmad-zayed-navbar.png` supplies the header and footer logo. These supersede the provisional SVG artwork described above. The source files were copied without changing their pixels. The current integration was visually checked at 1440px and 390px in `implementation-1440-client-png.png` and `implementation-390-client-png.png`.

## Revised transparent PNG identity

The later client images `ahmad-zayed-hero-client.png` and `ahmad-zayed-logo-client.png` supersede the opaque banner pair. Their alpha channels preserve the charcoal floral hero background and let the separate overline and site name return. The logo is shared by the header and footer. The mobile hero artwork was resized within its reserved stage so the final letter and site name remain visible. Captures: `implementation-1440-new-png-hero.png` and `implementation-390-new-png-hero-final.png`.

The follow-up hero correction removed clipping from the image container and reserved additional space for the full calligraphy. The second transparent PNG remains the header and footer logo, now displayed larger. Fresh captures: `implementation-1440-hero-unclipped.png` and `implementation-390-hero-unclipped.png`.

The client then specified the plain-name PNG for the header only. The header's `BrandMark` now selects `ahmad-zayed-hero-client.png`, while the hero stays as it was and the footer keeps `ahmad-zayed-logo-client.png`. Mobile capture: `implementation-390-header-logo-only.png`.

The final clarification assigns the other PNG (`ahmad-zayed-logo-client.png`) only to the hero. Its built-in «موقع» and English signature replace the separate hero text. The plain-name PNG remains in the header, and the footer returns to the earlier vector mark. Mobile capture: `implementation-390-image2-hero-only.png`.

## Verification notes

The `regions/` folder contains element captures for the reference header, carousel, marquee, first category, latest and featured headings, plus matching implementation regions and its books/audio, videos, and footer. The reference has no semantic `<footer>` element, so the region script could not save a footer element capture; the full-page reference images include its bottom copyright bar. Lower reference modules sometimes remained hidden by its lazy reveal behavior even after scrolling, so missing region detail is recorded rather than guessed.

Chrome confirmed the AlMohanad font loaded, the ticker transform changed during normal motion, its duplicate set was `aria-hidden` and inert, and reduced motion set its animation to `none`. At 360, 390, 768, 1024, and 1440 pixels there was no horizontal overflow. No browser console warnings or errors were present on the production preview.
