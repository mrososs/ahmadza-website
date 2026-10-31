# Design System — Contemporary Accession Folio

<!-- impeccable:design-schema 1 -->

## Direction contract

The site translates the working artifacts of a respected Arabic library—accession folios, catalogue slips, careful marginalia, binding cloth, and brass shelf labels—into a contemporary editorial interface. It is not nostalgic ornament. Structure, annotation, and measured material contrast make the archive legible.

The first viewport should feel like opening a curated folio: one decisive editorial statement, a visible route into search, and a compact index of media types. The visitor moves from a featured publication into increasingly dense archive views. Search opens the catalogue; it never behaves like an app dashboard.

### Raised disciplines

- **Depth-axis discipline:** page sections deepen from broad invitation to dense archive without visual noise.
- **Tonal progression:** ivory, parchment, forest, and charcoal surfaces mark shifts in reading intensity.
- **Specimen discipline:** Arabic display type is given room to show its shaping and diacritics.
- **Duotone commitment:** forest and paper dominate; brass is a notation, never decoration.
- **Layered state clarity:** active, selected, unavailable, and demo states remain distinguishable without relying on color alone.
- **Persistent index logic:** navigation and filters preserve a catalogue-like sense of place across content types.

## Semantic color

| Token | Value | Use |
| --- | --- | --- |
| paper | `#F5F0E6` | Primary page field |
| paper-raised | `#FFFDF8` | Reading surfaces |
| parchment | `#E9DFCC` | Quiet bands and metadata |
| ink | `#1D241F` | Primary text |
| ink-muted | `#5E665F` | Secondary text |
| forest | `#173F34` | Brand field, actions, focus |
| forest-light | `#DDE8E1` | Selected and quiet states |
| brass | `#A77C32` | Fine rules, marks, emphasis |
| error | `#A23D32` | Error states only |

Body copy must retain at least 4.5:1 contrast. Brass is not used for small text on paper.

## Typography

- UI/navigation/metadata: IBM Plex Sans Arabic, weights 400–700.
- Editorial headings and long reading: Noto Naskh Arabic, weights 400–700.
- Display scale: `clamp(2.6rem, 7vw, 5.8rem)` with compact but never negative tracking beyond `-0.02em`.
- Body reading: 1.16–1.3rem, line-height 2–2.08, maximum 72ch.
- Metadata: 0.8–0.9rem, strong contrast, tabular numerals where useful.

## Layout and spacing

- Content container: min(`calc(100% - 2rem)`, 1240px).
- Reading column: 68–72ch.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 88, 120px.
- Breakpoints follow Tailwind defaults, with intentional checks at 360, 390, 768, 1024, and 1440px.
- Use asymmetry to distinguish editorial priority, then collapse into a clear single-column reading order on narrow screens.

## Surfaces, borders, and radius

- Hairline rules use `rgba(29, 36, 31, .18)` or brass at low prominence.
- Radius: 2px for sheets, 8px for controls, 12px maximum for bounded media. Pills are reserved for compact filters/status.
- Elevation is rare: offset 0 12px with a broad, low-opacity blur. Reading sheets usually use a border, not a shadow.

## Components and states

- Header: two-level editorial masthead on desktop; compact wordmark and disclosure navigation on mobile.
- Search: prominent catalogue input with a clear submit action and visible keyboard focus.
- Content cards: composition varies by type; borders and hierarchy replace decorative containers.
- Filters: horizontally scrollable at small widths; `aria-pressed` communicates selection.
- Empty/error/loading: plain language, recovery action, and no fabricated content.
- Focus: 3px forest outline with 3px paper offset.

## Motion

- One authored reveal at the home hero using a paper-mask/clip transition.
- All other transitions are restrained (160–260ms), use ease-out, and communicate hover, disclosure, or filtering state.
- `prefers-reduced-motion: reduce` removes nonessential motion and smooth scrolling.

## RTL conventions

- Use logical properties (`margin-inline`, `border-inline`, `inset-inline`).
- Icons that imply direction mirror in RTL; media controls and universal symbols do not.
- Preserve readable punctuation and isolate Latin URLs/numbers with `dir="ltr"` where needed.
- Never force centered Arabic paragraphs; reading copy is right-aligned.
