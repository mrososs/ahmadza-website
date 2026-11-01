# Haddady reference analysis

Reviewed against the rendered public website on 2026-10-31 using Chrome DevTools MCP and captured at 1440, 1024, 768, and 390px in `artifacts/reference/`.

## Patterns to preserve in this redesign

- A compact, right-to-left library masthead: a distinct logo area, top-level content links, a small search control, and social/utility access. Desktop navigation is horizontal; mobile collapses into a square disclosure button.
- A dark charcoal hero field with a restrained repeating Islamic-geometric backdrop, a central Arabic identity statement, and a bright orange latest-publications ticker immediately below it.
- Content begins quickly after the masthead. The visual hierarchy is library-first: title, short introduction, category paths, then recent and selected material. There is no oversized marketing pitch.
- Category presentation is distinct rather than a uniform card grid: each medium is a compact module with a recognisable visual marker, a heading, and a short subcategory list.
- White and very pale neutral surfaces carry the body. Orange is used as a focused action, ticker, small check mark, or heading accent; charcoal is the structural colour.
- Headings are bold Arabic display type; body text and metadata are compact, readable, and densely arranged. Rules and light backgrounds separate groups more often than floating surfaces or large shadows.
- Directories use title bands, category tabs, simple rows/cards, metadata, and clear links. Detail pages prioritize a restrained reading column with breadcrumbs and utility metadata.
- The footer is dense, dark, and utility-oriented rather than promotional.

## Responsive observations

- At 390px the logo moves above/alongside a large hamburger control, the desktop link row disappears, and the ticker remains horizontally flowing.
- The hero identity scales down without becoming a generic card. Category modules become single-column blocks with their image or symbol above the text.
- Containers retain tight side gutters; vertical spacing is substantially more compact than the previous editorial implementation.

## Deliberate differences

This implementation does not reuse the reference site's logo, calligraphy, article copy, photographs, icons, or ornamental raster artwork. It uses Ahmed Al-Zahrany branding, clearly labelled demo content, the client-supplied AlMohanad font, original geometric CSS ornament, and the existing route/data architecture.

## Implementation contract

The redesigned site will adopt the reference's compact information hierarchy, dark masthead/ticker structure, content density, category sequencing, classic Arabic library visual language, and mobile disclosure behavior. It will not pursue pixel equivalence or copy protected assets.
