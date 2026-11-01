# Reference style specification — haddady.com (measured 2026-11-01)

All values were read from the rendered page with Playwright/Chromium (`scripts/audit-reference.mjs`; raw data in `dom-extract-1440.json`, `marquee-samples.json`, `carousel.json`). The Chrome DevTools MCP server failed to connect in this session (CONNECT_TIMEOUT), so Playwright was the only browser tool. Nothing here is copied source; it is measured geometry and appearance, re-implemented in Nuxt/Vue.

Page height at 1440px after forcing lazy reveals: 4016px.

## Section order (verified from the full-page capture)

| # | Section | y (1440) | Height | Notes |
|---|---------|----------|--------|-------|
| 1 | Header (`nav.navbar`) | 0 | 153 | Transparent over hero. Logo right; links, then search field + round social icons on the left |
| 2 | Hero carousel | 0 | 450 | Charcoal `#454545`, gold floral line ornament, centred calligraphy image |
| 3 | Marquee band | 450 | 79 | `rgba(0,0,0,.7)`, 10px padding, 50px marquee |
| 4 | المكتبة الرقمية | 577 | ~1029 | 48px bold title, small lead, 5 category cards (3 + 2), floral edge ornament |
| 5 | أحدث المنشورات | 1606 | 704 | 3-card carousel, orange pill arrows |
| 6 | اخترنا لكم | 2310 | 565 | 4 cards with title, excerpt, orange pill button |
| 7 | أحدث المواضيع في أقسام المكتبة | 2875 | 634 | Vertical tab list (orange active) + checked list + "المزيد" |
| 8 | YouTube band | 3509 | 435 | `rgb(23,48,59)` (#17303b) |
| 9 | Copyright bar | 3944 | 72 | `rgb(51,51,51)` (#333) |

## Tokens

| Token | Value |
|-------|-------|
| Font | `AlMohanad`, 16px/24px base; section titles 48px/57.6px (H1 elements), card titles 24px |
| Heading colour | `#111` |
| Orange | `rgb(255,140,0)` / `#ff8c00` (buttons, marquee capsules, arrows, active tab) |
| Card surface | `rgb(248,248,248)`, radius 10px, `transition: 0.5s` |
| Container | 1320px (60px side padding at 1440) |
| Hero | `#454545` with gold floral ornament; ornament repeats left and centre |
| Nav link size | ≈18.4px, weight 400, white |

## Motion (measured at runtime)

| Item | Finding |
|------|---------|
| Marquee | Native `<marquee direction="left" scrollamount="7" behavior="scroll">`. Sampled at 500ms steps: −42.6px per step ≈ **85px/s**, constant, leftward. On hover it stops. After the last item it wraps with an empty gap (our version is gapless by design). |
| Hero carousel | Owl carousel with 5 items, 1 active. Sampled every 2s for 10s: transform constant, active index constant. **No autoplay**; all 5 frames show the same artwork. |
| Dropdowns | 4 Bootstrap `.dropdown-menu` elements, `display:none`; **hovering does not open them** (click toggles). Panel is white, 8px vertical padding. |
| Cards | 0.5s transition on category/service cards. |
| Scroll reveal | WOW.js/animate.css (`fadeIn`, etc.); blocks are `visibility:hidden` until scrolled into view. |

## Implementation notes

- Reference carousel is static, so ours is a single stable identity stage; no fake rotation.
- Ticker speed is derived from the measured set width at **85px/s**; verified at 86.5px/s.
- Reference social icons point at the original owner's accounts; the client has not supplied accounts, so none are rendered.
