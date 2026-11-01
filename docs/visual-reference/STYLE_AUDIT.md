# Rendered reference audit — 2026-10-31

Source: `https://haddady.com/`, inspected in Chrome DevTools and captured at 1440, 1280, 768, 390 and 360 pixels in this directory. Full-page screenshots beyond the first content module contain blank lazy-loaded regions; those are not evidence of intended spacing.

| Element | Observed reference | Current implementation before this pass |
| --- | --- | --- |
| Desktop header | Transparent over charcoal hero, 152px navigation region at 1520px browser; logo upper right, dense white links; search and round social controls upper left | Separate 72px white header; text logo and orange square search |
| Hero | Charcoal `#454545` field, floral medallions; centered cream calligraphic image, about 450px carousel region; same image in five cloned Owl frames | Large text heading, coarse concentric-circle CSS pattern, search inside hero |
| Background | Body uses `background.jpeg`, computed `cover`, centered, no-repeat. Hero includes `slider-white.png` at about 842×446 in 1520px viewport | Radial circles and diagonal lines |
| Typography | Computed site font `AlMohanad`, 16px/24px base; main library heading 48px/57.6px | AlMohanad loaded; headings substantially larger in hero |
| Ticker | Native `<marquee direction="left" scrollamount="7">`, black text on dark orange rounded capsules; hover stops movement | Static full-width orange strip with scroll overflow |
| Mobile | White logo and hamburger band around 140px tall; charcoal title region; one orange ticker item; category content begins below | 62px header; dark text hero; static ticker |
| Main library | Centered title on white over large warm floral edge ornament, followed by distinct content category modules | Two-column category index immediately after hero |
| Reference icons | Font Awesome and Bootstrap Icons CSS present; orange category/action treatment | Lucide stroke icons |

The reference's carousel contains five Owl items but each inspected item displays the same `slider-white.png` artwork and no distinct text. We preserve the visual stage without implying multiple client slides. Third-party graphics are analysis only; production artwork must be original.

## Priority differences to fix

1. Replace the coarse hero pattern with a reusable original floral medallion motif.
2. Move search into a header-aligned control and make the identity the centered hero focal point.
3. Implement a seamless moving ticker with pause and reduced-motion behavior.
4. Introduce a large ornamental white library opening and category modules closer to the reference rhythm.
5. Keep the remaining client content registers and data paths functional; reference lower-page capture is incomplete because of lazy loading.
