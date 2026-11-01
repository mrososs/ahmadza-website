# Design System — Arabic Digital Library

<!-- impeccable:design-schema 1 -->

## Direction contract

The site is a traditional Arabic digital library: direct routes into written, audio, and visual material; a navy ornamental masthead; and a moving sky-blue publication ribbon. It follows the measured visual hierarchy of the client-approved reference while using the client's identity, original floral artwork, and independently implemented components.

The first viewport centers the client-supplied transparent PNG composition with «موقع», «أحمد زايد», and its English signature over the original navy ornamental background. The plain-name PNG is the header logo; the original vector mark remains in the footer. Search sits in the header; the publication ribbon crosses the base of the hero. Below it, a warm floral edge introduces the library and category modules. The visitor then moves through compact, type-specific registers. Inner page titles use a restrained version of the floral background and a brass rule.

### Raised disciplines

- **Register discipline:** every section reads as an index, list, or category route before it reads as decoration.
- **Tonal progression:** white, ice-tinted neutrals, navy, and sky blue mark shifts in reading intensity.
- **Arabic type discipline:** AlMohanad is the UI and display face; its shaping and diacritics are given room to breathe.
- **Ticker discipline:** sky-blue capsules move continuously at the base of the hero, pause on hover/focus, and stop under reduced motion.
- **Layered state clarity:** active, selected, unavailable, and demo states remain distinguishable without relying on color alone.
- **Persistent index logic:** navigation and filters preserve a catalogue-like sense of place across content types.

## Semantic color

The client chose this palette (2026-11-01) so the site no longer matches the reference's charcoal/orange scheme. Source of truth: the `--c-*` tokens at the end of `app/assets/css/main.css`.

| Token | Value | Use |
| --- | --- | --- |
| navy | `#1B365D` | Masthead, header, YouTube band, headings accents, focus family |
| blue | `#005A9C` | Text accents and links on white, focus ring, check marks, icons |
| sky | `#60C1E5` | Ticker capsules, buttons, carousel arrows, active tab/filter, title rules |
| ice | `#A0E0EF` | Footer labels, ornament tint, soft borders, selection tint |
| navy-deep | `#13294A` | Ticker band, copyright bar, headings, text on sky (derived darker shade of navy) |
| neutral tints | `#F4F9FC`, `#F1F9FC`, `#DFF2F8`, `#D5E3EC` | Page field, cards, quiet bands, hairlines |
| error | `#A23D32` | Error states only |

Body copy must retain at least 4.5:1 contrast. Sky is a fill colour: text on sky is navy-deep (about 6:1), and text on white uses blue (about 7:1). Sky is never used for small text on white.

## Typography

- UI/navigation/display: AlMohanad (self-hosted), weight 400.
- Long reading: Noto Naskh Arabic where the reading component specifies it.
- Display scale: `clamp(2.45rem, 5.3vw, 5rem)` with compact but never negative tracking beyond `-0.02em`.
- Body reading: 1.16–1.3rem, line-height 2–2.08, maximum 72ch.
- Metadata: 0.8–0.9rem, strong contrast, tabular numerals where useful.

## Layout and spacing

- Content container: min(`calc(100% - 2.5rem)`, 1180px).
- Reading column: 68–72ch.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 88, 120px.
- Breakpoints follow Tailwind defaults, with intentional checks at 360, 390, 768, 1024, and 1440px.
- Prefer compact two- and three-column registers, then collapse into a clear single-column reading order on narrow screens.

## Surfaces, borders, and radius

- Hairline rules use `rgba(29, 36, 31, .18)` or brass at low prominence.
- Radius: 2px for sheets, 8px for controls, 12px maximum for bounded media. Pills are reserved for compact filters/status.
- Elevation is rare: offset 0 12px with a broad, low-opacity blur. Reading sheets usually use a border, not a shadow.

## Components and states

- Header: navy desktop navigation (transparent over the hero, white once scrolled) with direct links and search; white mobile brand band with a disclosure button.
- Search: prominent catalogue input with a clear submit action and visible keyboard focus.
- Content cards: composition varies by type; borders and hierarchy replace decorative containers.
- Filters: horizontally scrollable at small widths; `aria-pressed` communicates selection.
- Empty/error/loading: plain language, recovery action, and no fabricated content.
- Focus: 3px blue outline with 3px paper offset.

## Motion

- The publication ribbon is the authored moving element; its duplicate loop is hidden from assistive technology.
- All other transitions are restrained (160–260ms), use ease-out, and communicate hover, disclosure, or filtering state.
- `prefers-reduced-motion: reduce` removes nonessential motion and smooth scrolling.

## RTL conventions

- Use logical properties (`margin-inline`, `border-inline`, `inset-inline`).
- Icons that imply direction mirror in RTL; media controls and universal symbols do not.
- Preserve readable punctuation and isolate Latin URLs/numbers with `dir="ltr"` where needed.
- Never force centered Arabic paragraphs; reading copy is right-aligned.
