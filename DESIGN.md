# Design System — Arabic Digital Library

<!-- impeccable:design-schema 1 -->

## Direction contract

The site is a traditional Arabic digital library: direct routes into written, audio, and visual material; a charcoal ornamental masthead; and a moving orange publication ribbon. It follows the measured visual hierarchy of the client-approved reference while using the client's identity, original floral artwork, and independently implemented components.

The first viewport centers the client-supplied transparent PNG composition with «موقع», «أحمد الزهراني», and its English signature over the original charcoal ornamental background. The plain-name PNG is the header logo; the original vector mark remains in the footer. Search sits in the header; the publication ribbon crosses the base of the hero. Below it, a warm floral edge introduces the library and category modules. The visitor then moves through compact, type-specific registers. Inner page titles use a restrained version of the floral background and a brass rule.

### Raised disciplines

- **Register discipline:** every section reads as an index, list, or category route before it reads as decoration.
- **Tonal progression:** white, quiet gray, charcoal, and orange mark shifts in reading intensity.
- **Arabic type discipline:** AlMohanad is the UI and display face; its shaping and diacritics are given room to breathe.
- **Ticker discipline:** orange capsules move continuously at the base of the hero, pause on hover/focus, and stop under reduced motion.
- **Layered state clarity:** active, selected, unavailable, and demo states remain distinguishable without relying on color alone.
- **Persistent index logic:** navigation and filters preserve a catalogue-like sense of place across content types.

## Semantic color

| Token | Value | Use |
| --- | --- | --- |
| paper | `#FCFBF8` | Primary page field |
| paper-raised | `#FFFFFF` | Reading surfaces |
| parchment | `#F5F3EF` | Quiet bands and metadata |
| ink | `#3D3D3D` | Primary text and charcoal fields |
| ink-muted | `#746D64` | Secondary text |
| forest | `#3D3D3D` | Legacy semantic alias / focus |
| forest-light | `#EEEAE4` | Selected and quiet states |
| brass | `#E98A00` | Ticker, actions, and concise emphasis |
| error | `#A23D32` | Error states only |

Body copy must retain at least 4.5:1 contrast. Brass is not used for small text on paper.

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

- Header: charcoal desktop navigation with direct links and search; white mobile brand band with a disclosure button.
- Search: prominent catalogue input with a clear submit action and visible keyboard focus.
- Content cards: composition varies by type; borders and hierarchy replace decorative containers.
- Filters: horizontally scrollable at small widths; `aria-pressed` communicates selection.
- Empty/error/loading: plain language, recovery action, and no fabricated content.
- Focus: 3px forest outline with 3px paper offset.

## Motion

- The publication ribbon is the authored moving element; its duplicate loop is hidden from assistive technology.
- All other transitions are restrained (160–260ms), use ease-out, and communicate hover, disclosure, or filtering state.
- `prefers-reduced-motion: reduce` removes nonessential motion and smooth scrolling.

## RTL conventions

- Use logical properties (`margin-inline`, `border-inline`, `inset-inline`).
- Icons that imply direction mirror in RTL; media controls and universal symbols do not.
- Preserve readable punctuation and isolate Latin URLs/numbers with `dir="ltr"` where needed.
- Never force centered Arabic paragraphs; reading copy is right-aligned.
