/**
 * Where the heavy scroll choreography is allowed to run.
 *
 * §8 says desktop gets everything and touch devices from 768 to 1024 get no
 * pinned-and-scrubbed sections. Expressed as a width alone that rule has a hole
 * in it: an iPad in landscape is *exactly* 1024px, so `(min-width: 1024px)`
 * hands a tablet the full desktop treatment — the one device the rule was
 * written for.
 *
 * Width tells you about the canvas. It tells you nothing about the finger. So
 * the gate asks about the pointer as well, the same argument `.tap-link` already
 * makes in `index.css` for touch targets:
 *
 *   · 1440px laptop, trackpad ....... hover + fine → on
 *   · 1024px iPad landscape ......... hover: none  → off
 *   · 768px iPad portrait ........... hover: none  → off
 *   · 390px phone ................... hover: none  → off
 *
 * A Windows laptop with a touchscreen still reports `pointer: fine` for its
 * primary input, so it keeps the desktop treatment, which is right.
 *
 * KEEP IN SYNC with the `desk` variant in `index.css`. The two have to agree
 * exactly: this one decides whether the tweens are built, and that one decides
 * whether the layout they animate exists. If they disagree you get sticky panels
 * with nothing animating them apart, or callouts that never appear.
 */
export const DESKTOP_MOTION =
  '(min-width: 1024px) and (hover: hover) and (pointer: fine)'
