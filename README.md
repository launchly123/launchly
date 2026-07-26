# Launchly

Marketing site for Launchly — a one-person web design studio, USA.

**websites that work.**

## Run it

```bash
npm install
npm run dev
```

## Everything you'll want to edit is in one file

`src/content/content.ts` holds:

| What | Where |
|---|---|
| Prices | `config.pricing` |
| SMS number, Instagram handle | `config.contact` |
| Contact form destination | `config.formEndpoint` |
| Portfolio projects | `projects` array |
| Testimonials | `testimonials` array |
| Every string, EN and ES | `en` / `es` objects |

### Adding a project

Copy one object in the `projects` array, fill it in, set `status: 'live'`.

Set `embed: true` only after confirming the site can be framed:

```bash
curl -sI https://example.com | grep -i 'x-frame-options\|content-security-policy'
```

If either header appears, leave `embed: false` — the iframe would render blank.

### Adding a testimonial

Push one object into `testimonials`. The section is hidden entirely while the
array is empty. Real quotes only.

### The translation safety net

`es` is typed against the shape of `en`. Add an English string without its
Spanish counterpart and the build fails:

```bash
npm run typecheck
```

There is no way to ship a half-translated page by accident.

## Contact form

`config.formEndpoint` is `null` by default. In that state the form validates and
then opens the SMS app with the message pre-filled — no backend, works day one.

To take real submissions, paste a [Formspree](https://formspree.io) endpoint
into `config.formEndpoint`.

## Build status

- [x] 1 — Structure and real copy, both languages, zero animation
- [x] 2 — Layout, typography, color, spacing
- [x] 3 — Lenis + GSAP scroll reveals
- [x] 4 — Pinned "How it works" + portfolio treatment
- [~] 5 — Optional Three.js accent — **skipped by choice**
- [x] 6 — Performance, mobile, accessibility passes
- [x] 7 — Bilingual + responsive QA at four breakpoints

### Motion & premium pass

- [x] §1 — Global motion layer: reveal system, progress, section marker, cursor
- [x] §2 — deMiguel showcase
- [x] §3 — Pricing
- [x] §4 + §5 — Hero and "How it works"
- [x] §6 — Marquee
- [x] §7 + §8 — Final performance, reduced-motion and device pass
- [x] §9 — Ambient lighting, stage depth, and micro-interactions

Since then, the pricing section was rebuilt as a scroll-driven spotlight —
one tier at a time on a sticky stage instead of a two-up grid. See
[Pricing](#pricing). Then §9 added lighting and depth on top of it, plus the
page-wide ambient layer and the button and link micro-interactions. See
[§9](#9--lighting-depth-and-the-things-that-fail-silently). Layout, copy,
palette, navigation and section structure are unchanged throughout.

## Measured results

Lighthouse, simulated throttling, against the production build:

| | Mobile | Desktop |
|---|---|---|
| Performance | **97** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |
| LCP | 2.4 s | 0.5 s |
| CLS | 0 | 0 |
| TBT | 40 ms | 0 ms |

No failing audits in either.

One diagnostic worth naming rather than hiding: Lighthouse reports ~48 ms of
forced reflow at startup, attributed to React's commit phase — which is where the
layout effects run. Measuring where text breaks into lines, and where every
ScrollTrigger starts and ends, requires reading layout; there is no version of
this that doesn't. It is one-time, it is inside a 40 ms total blocking time, and
the alternative is not having scroll-driven motion.

### Checks that run against a real browser

Eleven scripts in `scratchpad/`, all driving headless Brave and asserting on
computed values rather than screenshots — with one deliberate exception, noted
below:

| | |
|---|---|
| `hero-process.js` | drives the §4/§5 timelines to specific progress values and reads back transforms, opacities and ARIA |
| `reduced-motion.js` | the same page with `prefers-reduced-motion: reduce` emulated |
| `breakpoints.js` | six viewports, phone through desktop, checking overflow and which motion is built where |
| `marquee.js` | §6 direction, seamlessness, and that it parks off screen |
| `lang-detect.js` | nine browser language orderings resolve to the right language |
| `willchange-lang.js` | `will-change` is released when idle, and switching language does not move the page |
| `device-rules.js` | §8 at the 1024px boundary — the same width with a coarse pointer and with a fine one, asserting the pin flips *and* that the fallbacks take over |
| `pricing-stage.js` | drives the pricing storyboard to ten named beats and asserts the settled moments are *exact* identity; then scrolls for real to check the sticky travel, hit-testing and keyboard reachability |
| `pricing-frames.js` | scrubs the whole pricing track at 4× CPU throttle, with and without the entrance blur, and compares frame intervals |
| `pricing-fit-es.js` | the spotlight card fits every stage viewport **in Spanish**, which is the language that decides it |
| `premium.js` | §9. The one script that does look at pixels: it screenshots the page with the ambient layer and without it and diffs mean luminance, because "do not make it brighter" is a claim about rendered output and nothing else can settle it. Also asserts the glow lags the card, the feature cascade is a ramp rather than a block, both cards tilt within 5°, and the button lift survives the magnetic pull |

Re-run it yourself:

```bash
npm run build && npm run preview -- --port 4173
```

```bash
CHROME_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" npx lighthouse@12 http://localhost:4173/ --form-factor=mobile --screenEmulation.mobile --chrome-flags="--headless=new" --view
```

### Why GSAP is not code-split

The plan was to lazy-load the motion layer, since GSAP + Lenis account for ~52 kB
gzip. It was dropped on purpose: performance already clears the 90 target at 97,
and deferring a `gsap.from()` reveal layer means content paints visible and then
jumps to `opacity: 0` when the chunk lands. Trading a real visual glitch for
points on an already-passing metric is a bad deal. Revisit only if the score
drops below ~92.

### Contrast

Measured, not assumed: body text 5.77:1, accent on background 11.54:1, and the
primary button's dark-on-green also 11.54:1. All clear AA. Decorative separators
(`/`, `—`, `·`) are `aria-hidden` and set in `--color-muted`; in
`--color-border` they measured 1.18:1, which is invisible rather than subtle.

The marquee is the one place a spec asked for less than AA and did not get it —
3.41:1 against a 3:1 floor. See the marquee section for why `aria-hidden` is not
an exemption.

## Contact channel

Primary CTA is SMS to `config.contact.smsNumber`, with the first message
pre-written per language and per pricing tier (see `messageOpener` in
`src/lib/links.ts`).

The `?&body=` in the `sms:` URL is not a typo — iOS wants `&body=`, Android
wants `?body=`, and `?&body=` is the one form both parse.

## Motion

- **Lenis** smooths the wheel only. `syncTouch` is off, so phones keep native
  touch scrolling — intercepting it makes the page feel broken.
- **`prefers-reduced-motion`** short-circuits both motion hooks before any tween
  is created, so nothing is left stuck at `opacity: 0`.
- Add `data-reveal` to reveal an element on scroll, or `data-reveal-group` to
  stagger its direct children.
- Changing language calls `refreshMotion()` — Spanish is longer, so every
  ScrollTrigger start/end position moves with the document height.
- The "How it works" panels pin with **CSS `position: sticky`**, not
  ScrollTrigger's `pin`. Pinning re-parents the element, which fights Lenis on
  resize; sticky is one property and needs no refresh on language change. Same
  markup serves both layouts, so nothing is duplicated in the DOM.
- Everything that only makes sense on a large screen (sticky panels, the frame
  parallax) lives in a `gsap.matchMedia('(min-width: 1024px)')` block, so phones
  never pay for it and rotating a tablet rebuilds cleanly.

## Touch targets

The 44px minimum is keyed on `(hover: hover) and (pointer: fine)`, **not** a
width breakpoint. An iPad in portrait is 768px wide and entirely touch-driven, so
a `min-width: 768px` rule strips the touch target from the exact device most
likely to need it. Width describes the canvas; it says nothing about the finger.

## The deMiguel showcase

Pinned for 250vh on desktop; the visitor scrolls the real client homepage past
inside a browser frame while callouts pin beside each feature.

- A tall static WebP, **not** a `<video>` with `currentTime` scrubbed to scroll.
  Scrubbed video won't seek on iOS Safari without a user gesture and stalls
  mid-seek; the image is indistinguishable and bulletproof.
- `showcase.stops` are **uneven on purpose**. The client's menu runs ~10,000px,
  so a linear scrub would spend three-quarters of the sequence grinding down a
  price list. Each leg gets its own dwell time via `showcase.legs`.
- The frame height is `clamp(220px, 46svh, 560px)` — never a hard `100vh`, so a
  13" laptop still fits the rail, frame and CTA inside the pin. Measured at
  1024×700: 455px of content in a 700px box.
- Phone and tablet get **no pin and no scrub**. The image drifts on an 80s CSS
  loop instead. The one section meant to prove competence must not hijack a
  finger scroll.

### Asset selection is media-based, not `srcset`

`<picture>` with `media="(max-width: 1023px)"`, deliberately not a `srcset`
width-descriptor list. `srcset` resolves by *resolution*: on a 390px phone at
DPR 2 the browser needs ~780px, skips the 560w file, and downloads the 1200w one
— 538 KB and 17 megapixels on the device least able to decode it. That was
verified happening before the fix. The small file exists for decode memory, not
resolution, so the rule has to be the device.

## Hero

Four things move, and nothing else.

| | |
|---|---|
| Headline | reveals line by line on load, masked, via `<RevealText trigger="load">` |
| Glow | tracks scroll at **0.4x** while the type stays at 1x |
| Logo arrow | a slow continuous idle turn, with a scroll-velocity flywheel on top |
| Scroll prompt | stretches and contracts on a loop, gone by 5% of the page |

The headline is one `<h1>` with two `RevealText` lines, because the second line
carries the green. Both lines are `aria="hidden"` and the `<h1>` holds the
`aria-label`, so the accessible name exists exactly once. The alternative — the
`sr-only` duplicate pattern used elsewhere — would emit the page's most
SEO-weighted string twice to satisfy a linter.

The glow is deliberately **two nested elements**: the outer one centres, the
inner one is all GSAP touches. One element doing both means CSS and GSAP writing
the same transform, and whichever loses gets silently dropped — see the bug below
for what that failure looks like in practice.

The 0.4x figure is real, not eyeballed: over the hero's own height a 1x layer
travels the full distance, so the glow is pushed back down by 60% of it, read
from `offsetHeight` inside a function so `invalidateOnRefresh` re-measures on
resize and on language change. Verified at 1440×900: hero 900px, glow at
`y: 540`.

## How it works

Four panels of exactly 100vh, all stuck at `top: 0` — which is where the 400vh
comes from. It is a consequence of the content, not a magic number.

That geometry is what makes the timings exact. With equal-height panels all
sticking at the top, panel *i* is covered by panel *i+1* over precisely the
scroll from its own top reaching the viewport top to its own bottom reaching it.
So `top top → bottom top` on a panel **is** that panel's hand-off, and the
track's `top top → bottom bottom` is the three hand-offs end to end. Every span
in the section is derived from that one fact rather than tuned by eye.

| | |
|---|---|
| Step numerals | cross-fade 1→2→3→4, each landing on a panel hand-off |
| Progress line | one vertical accent line filling once down the left edge |
| Outgoing step | recedes to `scale 0.9` / `opacity 0.3` |

The numerals live in a **separate sticky rail above the panel stack**, not inside
each panel. They have to: a panel's background is opaque — that is what covers
the previous step — so a numeral inside panel 2 cannot cross-fade with one inside
panel 1. It would be wiped in, not blended. One rail also costs one element set
instead of four.

The vertical line replaces a per-panel horizontal rule. A horizontal bar that
refills from zero four times reads as four unrelated loading bars; one vertical
line that fills once tells you where you are.

The outgoing step's recede ends at `bottom 20%` rather than `bottom top`, so it
finishes just *before* the panel is fully hidden. Ending at full coverage means
paying for an animation nobody ever sees.

Under `prefers-reduced-motion` the rail is never built — four numerals stacked on
one another with nothing to separate them is worse than none — and a static
per-panel numeral takes over. That decision is made at render, not in an effect.

## Marquee

Between Work and Pricing: `USA · Websites that work ·`, repeated, drifting.
Direction and speed come from scroll velocity — down sends it right, up reverses
it, and left alone it keeps a slow rightward drift.

It is an **offset advanced on GSAP's ticker, not a repeating tween**, and that is
a correctness requirement rather than a preference. `repeat: -1` extends a tween
*forwards* only, so a negative `timeScale` walks it back to time 0 and parks
there: the band moved when scrolling up and sat dead when scrolling down.
Measured at -210px one way and exactly 0 the other. An offset has no time axis to
run out of, wraps in both directions, rides the single ticker Lenis already
drives, and can be unhooked entirely when off screen — cheaper than pausing a
tween, which stays registered.

Three things about it are worth knowing before editing:

- The **target speed decays back to idle inside the tick**, not in the scroll
  handler. `onUpdate` fires only *while* the page is moving, so a target set from
  velocity and then left alone becomes the band's permanent speed — one flick and
  it races forever.
- `gsap.utils.wrap(-50, 0)` means a **rising** offset travels *rightward*. The
  velocity term is therefore `+`, not `-`. Getting that backwards is invisible in
  review and obvious on screen.
- `gsap.quickSetter(el, 'xPercent', '%')` writes **nothing**. `xPercent` is
  already a percentage, so the unit argument hands GSAP the string `"-12%"`, which
  its parser rejects silently. Nothing throws; the band just never moves. Use the
  plain two-argument form.

### Why it is not as low-contrast as specified

§6 asks for "very low contrast". At `text-muted/30` that measured **1.5:1** and
cost 4 accessibility points, so it sits at `/70` — **3.41:1**, just clear of the
3:1 floor that applies to text this size.

`aria-hidden` does not buy an exemption, and it should not: a low-vision sighted
visitor still sees the band, so axe is right to flag it. AA contrast was a
non-negotiable, and "it's decorative" is an argument that visitor cannot hear. At
96px it still reads as texture rather than as something to read — but it is at
the floor, not below it.

## Two bugs this pass turned up

**The reading progress bar had never been visible.** It carried Tailwind's
`scale-x-0` as its collapsed starting state while GSAP animated `scaleX`. In
Tailwind v4 that utility compiles to the CSS `scale` **property**, which
*multiplies* with `transform` rather than being overridden by it — so `scale: 0%`
times GSAP's `scaleX(1)` is still zero, at every scroll position. Nothing errors.
There is no warning. The bar is simply always invisible. It is now an inline
`transform`, and the same class is avoided anywhere GSAP owns a transform.

Worth knowing the asymmetry: `translate-x-*` compiles to the `translate`
property, which *composes* with `transform` and is safe to mix. `scale-*` is not.

**The page could be dragged 86px sideways.** The pricing cards' entrance starts
at `x: ±120`, so at rest the Orbit card hung past the right edge. `overflow-x:
clip` on `body` alone did not contain it. It is now on the root element too —
`clip`, never `hidden`, because `hidden` would make the root a scroll container
and break every `position: sticky` further down the page, which is the entire
"How it works" section.

## Pricing

The two tiers are **not** shown side by side. A 360svh track holds a sticky
stage, and each card rises into the middle of it, holds completely still long
enough to be read, then recedes as the next one arrives. Scroll position is the
playhead: stop halfway through a hand-off and it stops halfway.

### The storyboard is data

Beats are declared in abstract units and the timeline's length is derived from
them, rather than the beats being tuned against a pixel value that then drifts:

| Beat | Units | What happens |
|---|---|---|
| `ENTER` | 2.4 | rises from +30%, scale 0.78 → 1, `rotateX 13°` and `rotateY -8°` → 0, opacity and a 9px blur resolve |
| `HOLD` | 3.2 | dead still — the only beat that exists for the reader rather than the eye |
| `EXIT` | 1.8 | back and up, tipping away, blurring out |
| `OVERLAP` | 0.4 | how much of the exit the next entrance overlaps |

`TOTAL = (n - 1) × STRIDE + ENTER + HOLD`, so adding a third tier needs no
retiming. The last card has no exit — it holds until the stage releases, so the
section never ends on an empty stage.

Two consequences worth naming:

- **The timeline's duration is pinned explicitly** with a dummy tween spanning
  `TOTAL`. A scrub stretches the trigger's span across the timeline's *total
  duration*, and the final hold contains no tweens by definition — without this
  it would not exist, and the last entrance would smear across the whole track.
- **`power2.inOut`, not `power2.out`.** The out-ease is the reflex and it is
  wrong for a scrub. Measured: `power2.out` put the card at **87% of its travel
  by the halfway point of the scroll span** — it arrived in the first quarter of
  the section and then crawled. `inOut` spreads the travel across the scroll the
  visitor is actually giving it. The *fade* still resolves early, on a shorter
  span: arriving and becoming readable are not the same beat.

### Both cards share one grid cell

Not absolute positioning. Both slots are placed at `col-start-1 row-start-1`, so
the cell is as tall as the taller card and each stretches to fill it. Three
things fall out of that for free:

- Both moments are exactly the same size, and the CTA lands in the same place in
  both — the stage never resizes between hand-offs.
- The track height is pure CSS (`360svh`), never measured in JS, so **CLS is 0**.
- No `position: absolute`, so the flow layout below 768px is the same markup with
  the grid switched off.

### The interior goes two-column at `md`

Liftoff has ten feature rows. In a single column that is a ~999px card, and a
spotlight only works if the whole card fits one viewport uncut. So from 768px up
the grid moves the features to their own column and drops the example and CTA to
the foot of the first — **same copy, same DOM order, roughly half the height.**

Measured, tightest viewports, in the longer language:

| Viewport | EN | ES | Slack (ES) |
|---|---|---|---|
| 768 × 1024 | 593 | 593 | 431 px |
| 900 × 700 | 497 | 593 | **107 px** |
| 1024 × 768 | 473 | 593 | 175 px |
| 1366 × 700 | 473 | 497 | 203 px |

### Below 768px there is no stage, and that is the right answer

A phone gets the cards in normal flow with a reveal that keeps the tilt and
scale, so a card still arrives as an object rather than fading in flat.

It is not a shortcut. Liftoff is **999px tall on a 390px-wide phone, in an 844px
viewport.** A one-at-a-time full-viewport presentation there can only be bought
by cutting copy or shrinking type below where it should be. Flow layout is the
better answer at that size — and it is what the project's device rules already
ask for.

### Keyboard: focus drives the scroll

Both cards are always in the DOM and always focusable, so tabbing forward from
Liftoff's CTA reaches Orbit's — while Orbit may be invisible and a thousand
pixels of scroll away. Left alone that is a focus-not-visible failure *and* a
control that cannot be reached without a wheel.

So a `focusin` on an off-stage card scrolls the page to that card's moment.
Measured: focusing Orbit's CTA during Liftoff's hold moves the page 1300px and
takes Orbit from `opacity: 0` to `1`, with focus retained. Tab order and the
presentation stay the same thing.

Hit-testing follows the storyboard too — both cards occupy the same cell, so
without it the one later in the DOM would swallow every click aimed at the one
actually on screen. Only the *transitions* touch the DOM; a frame in the middle
of a hold costs two number comparisons.

### The counting price would have lied to a screen reader

The big numeral counts up from `$0` against scroll position, which means at the
top of the track it genuinely reads **`$0`**. A screen reader working down the
page before the stage has been scrolled would have been told the wrong price —
not a degraded experience, an incorrect one.

So the numeral is `aria-hidden` and decorative, and the price is announced from a
neighbouring `sr-only` span that never animates. Verified at progress 0: visible
`$0`, announced `$499 — one-time`.

The feature rows animate `opacity`, never `autoAlpha`, for the same class of
reason — `autoAlpha` parks them at `visibility: hidden`, which takes them out of
the accessibility tree, and at the top of the track that is every feature of both
tiers.

### Four layers, because four things write

| Layer | Writes | Owner |
|---|---|---|
| deck | `perspective: 1600px` | CSS — one vanishing point, so the cards read as objects in a shared space |
| slot | `transform`, `opacity`, `filter` | the scroll scrub |
| `.price-float` | `transform` | CSS keyframes — a 10px idle drift so a card held still doesn't read as a screenshot |
| card | `transform` (tilt) | `gsap.quickTo`, pointer devices only |

The float needs its own element: two rules writing one `transform` means one is
silently dropped. Nested, they compose. It is gated on `data-price-live`, which
the stage's ScrollTrigger sets only while the section is on screen.

The card tilt carries its own `transformPerspective`, because the slot's `filter`
flattens the 3D context for everything below it — any filter value other than
`none` does, including `blur(0px)`.

### The blur was measured, not assumed

`filter: blur()` is the one property here that is not compositor-only; it
repaints the layer every frame it changes. The performance rule for this project
is transform-and-opacity-only, so it had to justify itself:

At 1440×900 with the CPU throttled 4×, scrubbing the whole track:

| | median | p90 | worst | frames > 32ms |
|---|---|---|---|---|
| as built | 16.6 ms | 18.1 ms | 25.2 ms | **0** |
| blur removed | 16.6 ms | 17.9 ms | 268 ms | 1 |

**No measurable cost** — median frame identical, zero dropped frames. It is also
only ever non-zero during an entrance or exit: while a card is being read, the
blur is `0px` and costs nothing at all.

### Reduced motion swaps the layout, not just the motion

Two cards stacked in one grid cell with nothing animating them apart would be
unreadable, so `prefers-reduced-motion: reduce` falls back to the plain two-up
grid this section had before — verified at both 390px and 1440px: no sticky
track, no overlap, no blur, prices at `$499`/`$799`, all 17 feature rows at full
opacity, outlines solid, idle float off.

### Orbit is still the livelier card

| Effect | How | Why that way |
|---|---|---|
| Rotating conic border | oversized conic layer spinning behind a 1px-inset panel | animating a conic gradient's angle needs `@property` and repaints every frame; rotating a layer is a compositor transform |
| `--accent-deep` glow | 12s transform + scale loop | — |
| ~3% grain | static SVG turbulence texture, **transform**-animated | `background-position` would repaint each frame |
| 6° cursor tilt | `gsap.quickTo` on rotationX/Y, box measured once per *hover* | a `getBoundingClientRect()` per `pointermove` forces a style flush — landing mid-scrub, on the most expensive frames on the page |

`isolate` on each card is load-bearing: it creates a stacking context so the
decorative layers order against each other. Without it the conic ring paints
behind the card and disappears.

### One deliberate deviation from the transform-only rule

The drawn outline and drawn checkmarks animate `stroke-dashoffset`, which is a
paint property. §3 asks for the effect explicitly and there is no transform-only
equivalent. It is bounded: two short one-shot draws on small SVGs, and
`pathLength="1"` normalises the geometry so no `getTotalLength()` call is needed
— that would force layout per icon. Measured cost: none visible.

### Reduced motion is tested, not assumed

`scratchpad/reduced-motion.js` drives headless Brave with
`prefers-reduced-motion: reduce` emulated and asserts the page ends up usable:
Lenis off, 0 pins, 0 masked lines, nothing left at `opacity: 0`, no custom cursor,
dash arrays cleared so outlines and checkmarks are solid, and prices showing
`$499`/`$799` rather than stuck at `$0`.

That last one is why the SVGs take an `animate` prop evaluated at render: shipping
them dashed and waiting for a tween that never runs would leave a reduced-motion
visitor with invisible checkmarks.

## §8 — device rules ask about the pointer, not only the width

An iPad in landscape is **exactly 1024px**. So `(min-width: 1024px)` — the
obvious reading of "desktop" — hands a tablet the full pinned treatment that §8
exists to keep off touch devices. Width tells you about the canvas; it tells you
nothing about the finger.

The gate is now `(min-width: 1024px) and (hover: hover) and (pointer: fine)`,
declared twice and required to agree:

- `DESKTOP_MOTION` in `src/lib/device.ts` — decides whether the tweens are built
- the `desk:` variant in `index.css` — decides whether the layout they animate exists

They have to be kept in sync, and the failure mode if they aren't is ugly:
sticky panels with nothing animating them apart, or callouts that never appear.
`device-rules.js` runs the same width with both pointers, so a drift between them
fails the suite rather than shipping.

### Turning a pin off is only half the job

The interesting bug here was never "the pin runs on an iPad". It was what
happens when you switch it off carelessly. Three things in the showcase were
keyed to `lg:` and all three had to move together:

| | Was | If only the pin had moved |
|---|---|---|
| `.showcase-drift` | `@media (max-width: 1023px)` | at exactly 1024px: no scrub **and** no drift — a dead screenshot |
| desktop callouts | `hidden lg:block` | rendered at `visibility: hidden`, revealed by a timeline that no longer exists |
| plain callout list | `lg:hidden` | hidden — so a tablet gets **no callouts at all** |

The drift is now written as the *inverse* of the real gate rather than as a
`max-width`, so the two cannot drift apart — there is only one rule.

`lg:` is still correct for type and grid. An iPad in landscape should absolutely
still get big type; it just should not get its scroll taken away.

### `min-height`, not `100vh`

§8 asks for it, and the step panels used `lg:h-screen`. They now use
`desk:min-h-svh`.

Measured before changing it, because the numeral cross-fade assumes panels are
equal height: the tallest step content is **202px against a 640px floor** — six
viewports, both languages. So in practice every panel is still exactly one
viewport and the cross-fade is unaffected. This is a safety net for a short
window, not a layout change.

### The one deliberate inconsistency

The pricing spotlight runs from 768px up, including touch, while the showcase and
"How it works" stop at the pointer. That is not an oversight — it was raised and
kept.

The distinction is real: a ScrollTrigger `pin` re-parents the element and holds
the page, which is what makes it feel broken under a finger. The pricing stage is
CSS `position: sticky` with the scrub locked 1:1 on touch, so the page never
stops responding to the drag — only the content changes as it moves.

## §9 — lighting, depth, and the things that fail silently

A polish pass over the whole page: an ambient background, lighting and depth on
the pricing stage, and hover behaviour on every button and link. No layout, copy,
palette or navigation changed. Two of the four bugs it turned up were invisible —
they left the stylesheet looking correct — which is why this section leads with
those rather than with the effects.

### "Do NOT make it brighter" is measurable, and the first attempt failed it

The ambient layer is two drifting pools of light, eight motes of dust and a film
of grain, fixed behind everything. Chosen by eye, it looked right. Measured, it
was wrong.

`premium.js` screenshots the page as built and again with the layer removed, and
diffs mean luminance. The first attempt:

| layer | alpha | ΔL /255 |
|---|---|---|
| `.ambient-a` — `--accent-deep` pool | 0.52 | +1.99 |
| `.ambient-b` — `--accent` pool | 0.045 | +1.30 |
| `.ambient-grain` | 0.016 | +1.15 |
| `.ambient-specks` | — | +0.03 |
| | | **+4.48** |

Nearly 1.8% of the full range, and the per-channel split was worse than the
total: **+1.2 red, +5.5 green, +3.9 blue**. A page specified as neutral
near-black had a measurable green cast. It did not look like a mistake, which is
exactly the problem — it looked like a nicer version of the same page.

Ceiling set at **+1.5**, and the budget then allocated by cost rather than by
taste. The grain got the largest share despite being the least glamorous of the
three, on the grounds that it is the only one that is hue-neutral and the only
one whose job — stopping large flats of `#0A0A0B` from banding — cannot be done
any other way. Final: **+1.44 /255, 0.56% of range**, with the pools at 0.105 and
0.011.

The specks are free, so they stayed exactly as designed.

### GSAP switches off the CSS properties I built the button hover on

The lift on a button wants to be `scale`. It cannot be `transform: scale()`,
because primary CTAs carry `data-magnetic` and `useMagnetic` animates GSAP's
`x`/`y` — which is the `transform` property, overwritten every frame.

The independent `scale` property looked like the answer: separate property,
composes with `transform` instead of replacing it. It is not the answer.
CSSPlugin.js:861-865 folds any computed `translate`/`scale`/`rotate` into GSAP's
own matrix on takeover and then writes them to `none` inline, so they cannot
apply twice. GSAP deliberately switches them off.

Nothing about this fails loudly. The rule sits in the compiled stylesheet
(`.btn:hover{scale:1.022}`, verified present), the selector matches, `:hover` is
active — and computed `scale` on a hovered primary CTA is `none`. It was found by
asserting on it, not by looking at it.

So the lift is split by who owns `transform`:

| | owner | trigger |
|---|---|---|
| `[data-magnetic]` (primary CTAs) | `useMagnetic`, via GSAP | **proximity**, off the falloff the pull already computes |
| everything else | CSS `.btn:not([data-magnetic]):hover` | `:hover` |

The split turned out better than the thing it replaced. Magnetic buttons now
scale on approach rather than snapping at the moment the cursor crosses the edge,
because the falloff was already being computed for the pull and was free to
reuse.

### …and `quickTo('scale')` matches nothing

Moving the lift into `useMagnetic` did not fix it. `gsap.quickTo` works by
calling `tween.resetTo(property, …)`, which looks up a PropTween **by name**, and
CSSPlugin never creates one called `scale` — `scale` is a shorthand that expands
into its axis components, so the PropTweens are named `scaleX` and `scaleY`.
`quickTo(el, 'scale')` therefore matches nothing and does nothing. No error, no
warning.

Diagnosed by reading the element rather than the code: GSAP had written
`scale: none` inline, `_gsap.scaleX` was pinned at `1`, and the pull was
animating normally beside it. Fixed with two `quickTo`s, `scaleX` and `scaleY`,
always called together.

### A staggered `fromTo` does not park the rows it has not reached

Raising the feature stagger from 0.05 to 0.13 storyboard units exposed a bug that
had been there all along. A staggered `fromTo` applies its from-values to a
target only once the playhead reaches *that target's* slice of the stagger; every
row further down sits at its natural `opacity: 1` until its turn. Mid-reveal the
list measured:

```
[0.83, 0.66, 0.4, 0.04, 1, 1, 1, 1, 1, 1]
```

Four rows fading in below six that had never left. At 0.05 the whole cascade
spanned 0.45 units and the gap was too brief to see. Fixed by parking the rows
with `gsap.set` up front and using a plain `to`, so "not yet" is a fact about the
DOM rather than something a tween has to remember to assert. Now:

```
[0.66, 0.4, 0.04, 0, 0, 0, 0, 0, 0, 0]
```

The "Includes" label leads the cascade rather than sitting above it. Static, it
was the one frame of the entrance that looked broken instead of cinematic — a
heading alone over an empty column, reading as content that failed to load.

### Depth by subtraction

The brief asks for the active card to become the focus and for the page not to
get brighter. Those pull against each other if focus means lighting the card
harder.

So the stage darkens everything the card is not — `.stage-vignette`, faded in on
`data-price-live` — and the card becomes the brightest thing on screen without
changing at all. The glow behind it (`.price-halo`) lives *inside* the slot, so it
carries the slot's scrubbed transform and travels with the card; a glow that
stayed put while the card rose past it would read as a light source behind the
stage rather than as the card's own.

Its opacity is tweened separately and deliberately late — it starts 40% into the
entrance and is still brightening after the card has landed. Measured, mid-entrance:
card at 0.97, glow at 0.03. Lighting that arrives *with* an object is read as part
of it; lighting that resolves after it has landed is read as the room responding.

The vignette is a sibling of the deck rather than a child, because it has to frame
the whole sticky viewport and the deck is the grid the two cards share. That is
why `data-price-live` moved up one level to the stage — the idle float only needs
an ancestor carrying the flag, so both selectors still work.

### Tilt, and the highlight that trails it

Both cards now lean toward the cursor, capped at 5° — the top of the range the
brief allows, and past it the card stops reading as differently lit and starts
reading as pushed. Measured at 4.2°/4.2° with the cursor in a corner, in 3D, with
a 905px perspective baked into the matrix.

The specular highlight (`.card-sheen`) settles in 0.75s against the card's 0.5s,
on purpose. Matched durations read as one rigid object; the mismatch is what makes
it read as light on a surface. On pointer *enter* it is placed rather than
animated — tweening it from wherever it was last left would send a bright disc
sliding in from a corner every time the cursor crosses the edge.

Its position is GSAP's, not a CSS custom property. An unregistered custom property
invalidates style on the whole subtree each time it changes; `transform` on a
promoted layer does not touch style at all. Its *opacity* is CSS, because that
changes twice per hover rather than once per frame.

### What it costs

Nothing measurable. Mobile Lighthouse held at **97 / 100 / 100 / 100** with CLS
still **0**, desktop at **100** across the board. The pricing scrub under 4× CPU
throttle: median frame **16.6 ms**, zero frames over 32 ms — identical to before
the pass.

Everything added is `transform` or `opacity` on a composited layer, with two
exceptions, both deliberate: the card's `box-shadow` on hover and the vignette's
opacity are paints, and both change on a state transition rather than per frame.
No explicit `will-change` on the ambient layers — a transform animation promotes
its element by itself, and writing the property by hand would pin four
viewport-sized layers into video memory for the whole session, phones included.

### Held back on purpose

Lenis went from `duration: 1.05` to `1.15`. Expo-out has covered ~90% of the
distance in the first third either way, so what lengthens is the settle, not the
response — the page still starts moving on the same frame as the wheel event.

The price count-up was left scroll-driven rather than given the fixed ~0.8s the
brief asks for. The section's whole premise is that scroll position *is* the
timeline; a card held still mid-scrub with a price still ticking on a wall clock
would be the one element not obeying it. It already counts 0 → 499 and 0 → 799,
which is the effect that was wanted. Say the word and it becomes a timed count.

The page grain does not move, unlike the Orbit card's. A viewport-sized layer
shifting three times a second is a viewport-sized repaint three times a second,
and at 0.7% opacity the motion is not visible anyway.

## Open TODOs

- `config.siteUrl` — swap for the real domain once connected. It also appears in
  `index.html` (canonical, `og:url`, `og:image`), `public/robots.txt`, and
  `public/sitemap.xml`.
- Testimonials — none collected yet
- Two portfolio slots — awaiting the next builds

### Language detection respects preference *order*

`navigator.languages` is ordered by preference, and that order is the whole point.
The tempting version — `candidates.some(l => l.startsWith('es'))` — is wrong in
exactly the market this site serves: a US visitor commonly reports
`["en-US", "es-US"]`, English first with Spanish available, and `some()` serves
them Spanish over a preference they actually stated. Caught on a real browser
reporting that list. `scratchpad/lang-detect.js` covers nine orderings.

## Known limitation: Spanish is not separately indexable

Language switching happens in place, on one URL, in a client-rendered app. Google
executes JS and will index the page, but there is no distinct URL for the Spanish
version — so it cannot rank on its own for Spanish queries, and `hreflang` has
nothing to point at.

Fixing it properly means real routes (`/` and `/es`) plus prerendering, which is
a structural change rather than a tweak. Worth doing if Spanish-language search
traffic starts to matter.
