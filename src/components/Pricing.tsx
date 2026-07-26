import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { config, type ComparisonRow } from '../content/content'
import { useLang } from '../lib/i18n'
import { messageOpener, priceLabel, smsUrl } from '../lib/links'
import { getLenis, prefersReducedMotion, scrollToY } from '../lib/smoothScroll'
import { ButtonLink } from './Button'
import { RevealText } from './RevealText'
import { SectionHeader } from './SectionHeader'

gsap.registerPlugin(ScrollTrigger)

type TierId = 'liftoff' | 'orbit'

const TIERS: TierId[] = ['liftoff', 'orbit']

/* ═══════════════════════════════════════════════════════════════════════════
   THE STORYBOARD

   The tiers are presented one at a time: a card rises into the middle of a
   sticky stage, holds still long enough to be read, then drifts back and away
   as the next one arrives.

   Beats are in abstract units rather than pixels or viewport heights, and the
   timeline's length is derived from them. Scrub maps the track's scroll span
   onto the whole timeline, so a unit is whatever share of the track the
   storyboard says it is — change TRACK and every beat rescales together
   instead of drifting out of sync with the sticky travel.

   At TRACK = 360svh with two tiers, one unit works out at roughly 21svh.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Rise, scale, and rotate into place. */
const ENTER = 2.4
/** Dead still. The only beat that exists for the reader rather than the eye. */
const HOLD = 3.2
/** Recede and fade. */
const EXIT = 1.8
/**
 * How much of the outgoing card's exit the incoming card's entrance overlaps.
 *
 * Deliberately small. Any more and the two read as a cross-fade — two cards on
 * screen at once, which is the thing this section exists to stop doing. At 0.4
 * it reads as a hand-off: one is clearly leaving before the other arrives.
 */
const OVERLAP = 0.4

const STRIDE = ENTER + HOLD + EXIT - OVERLAP

/**
 * Total length of the storyboard.
 *
 * The last card has no exit — it holds until the stage releases and the page
 * carries on underneath it, rather than leaving an empty stage behind.
 */
const TOTAL = (TIERS.length - 1) * STRIDE + ENTER + HOLD

function beats(i: number) {
  const at = i * STRIDE
  return {
    enterAt: at,
    exitAt: at + ENTER + HOLD,
    /** Scroll position where this card is centred and still — see `onFocusIn`. */
    holdCentre: at + ENTER + HOLD / 2,
  }
}

/**
 * Where each card owns the stage, as a fraction of the track.
 *
 * Used only to decide which card is currently clickable. The windows do not
 * quite touch: between one card's exit and the next one's arrival both are
 * mostly transparent, and during that gap neither should be hit-testable.
 */
const WINDOWS = TIERS.map((_, i) => {
  const { enterAt, exitAt } = beats(i)
  return {
    from: (enterAt + ENTER * 0.5) / TOTAL,
    // Past the end for the last card: it is live until the section is gone.
    to: i === TIERS.length - 1 ? 1.01 : (exitAt + EXIT * 0.5) / TOTAL,
  }
})

/** Resting state every card is set to before the first paint. */
const OFFSTAGE = {
  yPercent: 30,
  scale: 0.78,
  rotationX: 13,
  rotationY: -8,
  opacity: 0,
  filter: 'blur(9px)',
  transformOrigin: '50% 50%',
  pointerEvents: 'none' as const,
}

/**
 * A checkmark, optionally one that draws itself.
 *
 * `pathLength="1"` normalises the path to unit length so the dash offset can run
 * 1 → 0 without measuring real geometry — otherwise every icon needs a
 * `getTotalLength()` call, which forces layout once per row.
 *
 * When `animate` is false the dash attributes are omitted entirely rather than
 * left at offset 1. A reduced-motion visitor would otherwise get an invisible
 * checkmark waiting for a tween that never runs.
 */
function Check({ animate = false }: { animate?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0 text-accent">
      <path
        d="M2.5 8.5l3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength="1"
        {...(animate
          ? { className: 'draw-check', strokeDasharray: 1, strokeDashoffset: 1 }
          : {})}
      />
    </svg>
  )
}

/** Liftoff's outline — the card's only border, drawn on as it settles. */
function DrawnBorder({ animate }: { animate: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[4] size-full text-border"
      preserveAspectRatio="none"
    >
      <rect
        className="card-outline"
        x="0.5"
        y="0.5"
        width="calc(100% - 1px)"
        height="calc(100% - 1px)"
        rx="15.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        pathLength="1"
        {...(animate ? { strokeDasharray: 1, strokeDashoffset: 1 } : {})}
      />
    </svg>
  )
}

function TierCard({
  tier,
  featured,
  animate,
}: {
  tier: TierId
  featured: boolean
  animate: boolean
}) {
  const { lang, t } = useLang()
  const copy = t.pricing[tier]
  const card = useRef<HTMLElement>(null)
  const sheen = useRef<HTMLSpanElement>(null)

  /*
   * Both cards lean toward the cursor, and the highlight on the glass follows it.
   * Pointer devices only — a tilt keyed to a finger tap is just a lurch.
   */
  useLayoutEffect(() => {
    if (!animate) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const el = card.current
    const light = sheen.current
    if (!el) return

    /*
     * 5°, at the top of the range this should ever be. Past that the card stops
     * looking like it is being lit from a different angle and starts looking
     * like it is being pushed, which is the tell that separates a Stripe-grade
     * tilt from a template one.
     */
    const MAX = 5

    /*
     * Its own perspective, rather than inheriting the stage's.
     *
     * The stage sets `perspective` on the deck, but the slot between it and this
     * card carries a `filter` for the entrance blur, and any filter other than
     * `none` flattens the 3D context for everything below it. So the shared
     * vanishing point does not reach this far down and the tilt has to bring one.
     */
    gsap.set(el, { transformPerspective: 900 })

    /*
     * The tilt and the highlight run at deliberately different rates. The card
     * settles in 0.5s, the light in 0.75s — so the reflection trails the surface
     * it is on, the way a real specular highlight lags a panel being turned.
     * Matched durations read as one rigid object; mismatched read as light.
     */
    const rotY = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3' })
    const rotX = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3' })
    const lightX = light
      ? gsap.quickTo(light, 'x', { duration: 0.75, ease: 'power2' })
      : null
    const lightY = light
      ? gsap.quickTo(light, 'y', { duration: 0.75, ease: 'power2' })
      : null

    if (light) gsap.set(light, { xPercent: -50, yPercent: -50 })

    /*
     * The box is measured once per hover, not once per move. A
     * getBoundingClientRect() inside pointermove forces a style flush on every
     * event, and on this card it would be landing in the middle of the stage's
     * own scrubbed transform — the most expensive frames on the page.
     */
    let box: DOMRect | null = null

    const aim = (event: PointerEvent, snap: boolean) => {
      if (!box) box = el.getBoundingClientRect()
      rotY(((event.clientX - (box.left + box.width / 2)) / (box.width / 2)) * MAX)
      rotX(((event.clientY - (box.top + box.height / 2)) / (box.height / 2)) * -MAX)

      if (!light) return
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      /*
       * On the way in the highlight is placed, not animated. Tweening it from
       * wherever it was last left would send a bright disc sliding across the
       * card from the corner every time the cursor crosses the edge.
       */
      if (snap) gsap.set(light, { x, y })
      else {
        lightX?.(x)
        lightY?.(y)
      }
    }

    const onEnter = (event: PointerEvent) => {
      box = el.getBoundingClientRect()
      aim(event, true)
    }
    const onMove = (event: PointerEvent) => aim(event, false)
    const reset = () => {
      box = null
      rotY(0)
      rotX(0)
    }

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', reset)
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', reset)
      gsap.killTweensOf(el)
      if (light) {
        gsap.killTweensOf(light)
        gsap.set(light, { clearProps: 'all' })
      }
    }
  }, [animate])

  return (
    <article
      ref={card}
      data-price-card={tier}
      style={{ transformStyle: 'preserve-3d' }}
      /*
       * `isolate` matters: it creates a stacking context so the decorative
       * layers below can be ordered against each other. Without it they'd be
       * measured against the page and the conic ring would paint behind the
       * card entirely.
       *
       * `h-full` + `flex-col`: on the stage both cards share one grid cell, so
       * the cell is as tall as the taller of them and each stretches to fill it.
       * Both moments are therefore exactly the same size and the CTA sits in the
       * same place in both — the stage never resizes between hand-offs.
       */
      className="relative isolate flex h-full flex-col overflow-hidden rounded-2xl p-7 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] md:p-9"
    >
      {featured ? (
        <>
          {/* z-0 — rotating conic gradient, most of it hidden behind the panel.
              Only the 1px rim shows, which is the border. A transform on an
              oversized layer, so no @property support needed and no repaint. */}
          <span
            aria-hidden="true"
            className="conic-ring pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[190%]"
          />
          {/* z-[1] — the panel that masks the ring down to a rim. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-px z-[1] rounded-[15px] bg-surface"
          />
          {/* z-[2] — slow radial drift of --accent-deep. */}
          <span
            aria-hidden="true"
            className="glow-drift pointer-events-none absolute -left-1/4 top-1/4 z-[2] aspect-square w-[120%] rounded-full opacity-40 blur-[90px]"
            style={{ background: 'var(--color-accent-deep)' }}
          />
          {/* z-[3] — ~3% grain, translated rather than background-position. */}
          <span aria-hidden="true" className="grain pointer-events-none absolute -inset-1/2 z-[3]" />
        </>
      ) : (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-surface/40"
          />
          <DrawnBorder animate={animate} />
        </>
      )}

      {/*
        z-[5] — the specular highlight, tracking the cursor. Above the panel and
        the grain so it lights the material rather than sitting under it, below
        the copy so it never washes out text. Clipped to the card's radius by the
        `overflow-hidden` on the article.

        Rendered only when motion is allowed: with nothing moving it, a static
        bright disc parked in a corner is just a smudge.
      */}
      {animate && (
        <span
          ref={sheen}
          aria-hidden="true"
          className="card-sheen pointer-events-none z-[5]"
        />
      )}

      {/*
        z-[6] — the glass edge. Inset from the corners and starting one pixel
        down, so on Orbit it lies just inside the rotating rim instead of
        painting over the brightest part of it.
      */}
      <span
        aria-hidden="true"
        className="card-lightline pointer-events-none absolute inset-x-8 top-px z-[6] h-px"
      />

      {/*
        Two columns from `md` up, and the placement is explicit rather than
        implicit: reading order is name → price → pitch → features → example →
        CTA, which is the order the DOM is in and the order a phone stacks them
        in. The grid only moves the *features* out to their own column and drops
        the example and CTA to the foot of the first one.

        This is what lets a card that is ~850px tall stacked fit inside a 700px
        laptop viewport without shrinking any type or cutting any copy.
      */}
      <div className="relative z-10 flex flex-1 flex-col md:grid md:grid-cols-2 md:gap-x-10 lg:gap-x-14">
        <div className="md:col-start-1 md:row-start-1">
          <h3 className="text-2xl font-semibold">{copy.name}</h3>

          <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {/*
              The price is announced from here, and the big numeral beside it is
              decorative.

              The visible one counts up, which means at the top of its scrub it
              genuinely reads "$0". A screen reader working down the page before
              the stage has been scrolled would otherwise be told the wrong
              price — not a degraded experience, an incorrect one.
            */}
            <span className="sr-only">
              {priceLabel(config.pricing[tier])} — {t.pricing.oneTime}
            </span>
            <span
              aria-hidden="true"
              data-count-to={config.pricing[tier]}
              /* tabular-nums stops the digits jittering while the value counts. */
              className="text-[clamp(2.75rem,6vw,4rem)] font-semibold leading-none tracking-tight [font-variant-numeric:tabular-nums]"
            >
              {priceLabel(config.pricing[tier])}
            </span>
            <span aria-hidden="true" className="eyebrow">
              {t.pricing.oneTime}
            </span>
          </p>

          <p className="measure mt-6 text-muted">{copy.pitch}</p>
        </div>

        <div className="mt-9 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0">
          {/* Leads the feature cascade rather than waiting for it — see the
              timeline. On its own above an empty column it reads as a heading
              for content that failed to load. */}
          <p data-feature-lead className="eyebrow">
            {tier === 'orbit' ? t.pricing.plus : t.pricing.includes}
          </p>

          <ul
            data-feature-list
            className="mt-5 flex flex-col gap-3.5 text-[0.9375rem]"
          >
            {copy.features.map((feature, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[0.45rem]">
                  <Check />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-9 md:col-start-1 md:row-start-2 md:mt-0 md:self-end md:pt-9">
          <div className="border-t border-border pt-6">
            <p className="eyebrow">{t.pricing.liveExample}</p>
            <p className="mt-2 text-[0.9375rem]">{copy.example}</p>
          </div>

          <ButtonLink
            href={smsUrl(messageOpener(lang, tier))}
            variant={featured ? 'primary' : 'secondary'}
            className="mt-8 w-full"
          >
            {copy.cta}
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}

function ComparisonCell({
  value,
  animate,
}: {
  value: ComparisonRow['liftoff']
  animate: boolean
}) {
  if (value === true) return <Check animate={animate} />
  if (value === false)
    return (
      <span aria-hidden="true" className="text-border">
        —
      </span>
    )
  return <span className="eyebrow text-text">{value}</span>
}

export function Pricing({ index }: { index: number }) {
  const { t } = useLang()
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const deck = useRef<HTMLDivElement>(null)
  const slots = useRef<Array<HTMLDivElement | null>>([])

  // Evaluated at render so the SVGs can ship in their finished state — and the
  // stage can be swapped for a plain layout — when the visitor has asked for no
  // motion. Two cards stacked in one grid cell with nothing animating them apart
  // would be unreadable.
  const animate = !prefersReducedMotion()

  const hookAccent = t.pricing.hookAccent.replace(
    '{price}',
    priceLabel(config.pricing.orbit),
  )

  useLayoutEffect(() => {
    if (!animate) return

    /* Always-on: the comparison rows reveal with their checkmarks drawing in. */
    const ctx = gsap.context(() => {
      const body = document.querySelector('[data-comparison]')
      if (!body) return

      gsap.from(body.querySelectorAll('tr'), {
        autoAlpha: 0,
        y: 16,
        stagger: 0.05,
        ease: 'power2.out',
        scrollTrigger: { trigger: body, start: 'top 88%', end: 'top 40%', scrub: 1 },
      })

      gsap.to(body.querySelectorAll('.draw-check'), {
        strokeDashoffset: 0,
        ease: 'none',
        stagger: 0.05,
        scrollTrigger: { trigger: body, start: 'top 86%', end: 'top 35%', scrub: 1 },
      })
    })

    /*
     * ─────────────────────────────────────────────────────────────────────────
     * THE STAGE — 768px and up only.
     *
     * Below that the cards stay in the document flow, one under the other. This
     * is not a shortcut. A card with ten feature rows is around 850px tall in a
     * single column, and a phone viewport is roughly 800px of usable height: a
     * one-at-a-time full-viewport presentation on a phone can only be bought by
     * cutting copy or shrinking type below where it should be. Flow layout with
     * an ordinary reveal is the better answer at that size, and it is also what
     * the project's device rules already ask for.
     * ─────────────────────────────────────────────────────────────────────────
     */
    const mm = gsap.matchMedia()

    mm.add('(min-width: 768px)', () => {
      const trackEl = track.current
      const stageEl = stage.current
      const deckEl = deck.current
      const cards = slots.current.filter((s): s is HTMLDivElement => Boolean(s))
      if (!trackEl || !stageEl || !deckEl || cards.length !== TIERS.length) return

      const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches

      /*
       * Applied in a layout effect, so it lands before the browser's first
       * paint and there is no frame where the cards are visible untransformed.
       * Deliberately not done in CSS: a `@media` rule hiding these would also
       * hide them if the scroll layer ever failed to initialise.
       */
      gsap.set(cards, OFFSTAGE)

      /** Which card currently owns the stage. -1 during a hand-off. */
      let live = -1

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: trackEl,
          start: 'top top',
          end: 'bottom bottom',
          /*
           * `scrub: 1` on a precise pointer adds a one-second catch-up, which is
           * what makes a wheel gesture feel weighted rather than mechanical.
           *
           * On touch it is `true` — locked 1:1 to the finger. Momentum scrolling
           * is not eased by Lenis here (`syncTouch` is off site-wide), so a
           * catch-up would read as the card lagging behind the drag.
           */
          scrub: fine ? 1 : true,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            /*
             * On the stage, not the deck. The idle float only needs an ancestor
             * with the flag, but the vignette is a *sibling* of the deck — it has
             * to frame the whole sticky viewport, so it cannot live inside the
             * grid the cards share. Setting the flag one level up covers both.
             */
            if (self.isActive) stageEl.dataset.priceLive = 'true'
            else delete stageEl.dataset.priceLive

            for (const slot of cards) {
              slot.style.willChange = self.isActive
                ? 'transform, opacity, filter'
                : ''
            }
          },
          onUpdate: (self) => {
            /*
             * Hit-testing follows the storyboard. Both cards sit in the same grid
             * cell, so without this the one later in the DOM would swallow every
             * click aimed at the one actually on screen.
             *
             * Only the *transitions* touch the DOM — the index is cached, so a
             * frame in the middle of a hold costs two number comparisons.
             */
            const p = self.progress
            let next = -1
            for (let i = 0; i < WINDOWS.length; i++) {
              if (p >= WINDOWS[i].from && p < WINDOWS[i].to) next = i
            }
            if (next === live) return

            live = next
            cards.forEach((slot, i) => {
              slot.style.pointerEvents = i === next ? '' : 'none'
            })
          },
        },
      })

      /*
       * The timeline is as long as the storyboard says, not as long as its last
       * tween. Scrub stretches the trigger's span across the timeline's total
       * duration, so without this the final card's hold — which contains no
       * tweens by definition — would simply not exist, and its entrance would be
       * smeared across the rest of the track.
       */
      tl.to({}, { duration: TOTAL }, 0)

      cards.forEach((slot, i) => {
        const { enterAt, exitAt } = beats(i)
        const last = i === cards.length - 1

        /*
         * ENTRANCE. Three tweens rather than one, because the three properties
         * should not share a curve.
         *
         * The movement is `power2.inOut` — soft at both ends, steady through the
         * middle. An out-ease is the reflex here and it is wrong for a scrub:
         * measured, `power2.out` put the card at 87% of its travel by the
         * halfway point of the scroll span, so it arrived in the first quarter
         * of the section and then crawled. inOut spreads the travel across the
         * scroll the visitor is actually giving it, which is what reads as a
         * camera move rather than a pop.
         *
         * The fade and the defocus do resolve early (`power1.out`, and over
         * shorter spans), so the card is legible while it is still settling.
         * Arriving and becoming readable are not the same beat.
         */
        tl.to(
          slot,
          {
            yPercent: 0,
            scale: 1,
            rotationX: 0,
            rotationY: 0,
            ease: 'power2.inOut',
            duration: ENTER,
          },
          enterAt,
        )
        tl.to(
          slot,
          { opacity: 1, ease: 'power1.out', duration: ENTER * 0.6 },
          enterAt,
        )
        tl.to(
          slot,
          { filter: 'blur(0px)', ease: 'power1.out', duration: ENTER * 0.7 },
          enterAt,
        )

        /*
         * The glow comes up last and slowest — it starts 40% into the entrance
         * and is still brightening as the card holds still. Lighting that
         * arrived with the card would be read as part of it; lighting that
         * resolves after it has landed is read as the stage responding to it.
         *
         * A plain `to` from the CSS value, so scrubbing backwards past the start
         * returns it to 0 without a `fromTo` writing an inline 0 the teardown
         * would then have to clean up.
         */
        const halo = slot.querySelector<HTMLElement>('[data-price-halo]')
        if (halo) {
          tl.to(
            halo,
            { opacity: 1, ease: 'power1.inOut', duration: ENTER * 0.9 },
            enterAt + ENTER * 0.4,
          )
        }

        /*
         * The price counts against scroll position, not a clock. Started at the
         * very top of the entrance on purpose: a `to` tween does not render
         * until the playhead reaches it, so the first thing it does is replace
         * the real price with "$0" — which has to happen while the card is still
         * fully transparent.
         */
        const price = slot.querySelector<HTMLElement>('[data-count-to]')
        if (price) {
          const target = Number(price.dataset.countTo ?? 0)
          const proxy = { value: 0 }
          tl.to(
            proxy,
            {
              value: target,
              ease: 'power1.out',
              duration: 2,
              onUpdate: () => {
                price.textContent = priceLabel(Math.round(proxy.value))
              },
            },
            enterAt,
          )
        }

        /*
         * Features assemble once the card has arrived. `opacity`, never
         * `autoAlpha`: autoAlpha parks them at `visibility: hidden`, which takes
         * them out of the accessibility tree — and at the top of the track, that
         * is every feature of both tiers, for a screen reader that has not
         * scrolled yet.
         */
        const list = slot.querySelector<HTMLElement>('[data-feature-list]')
        if (list) {
          /*
           * The "Includes" / "Everything in Liftoff, plus" label is the first
           * item in the cascade, not a fixture above it. Left static it sits
           * alone over an empty column for the whole of the card's approach,
           * which reads as a heading whose content failed to load — the one
           * frame of the entrance that looked broken rather than cinematic.
           */
          const lead = slot.querySelector<HTMLElement>('[data-feature-lead]')
          const rows = [
            ...(lead ? [lead] : []),
            ...Array.from(list.children),
          ]

          /*
           * The from-state is set up front, not carried by a `fromTo`.
           *
           * A staggered `fromTo` only applies its from-values to a target once
           * the playhead reaches that target's slice of the stagger — every row
           * further down the list sits at its natural opacity of 1 until its turn
           * arrives. With the old 0.05 stagger the whole cascade spanned 0.45
           * units and the gap was too brief to see; at 0.13 it is plainly wrong,
           * and measured: mid-reveal the list read [0.83, 0.66, 0.4, 0.04, 1, 1,
           * 1, 1, 1, 1] — four rows fading in below six that had never left.
           *
           * `gsap.set` parks all of them first, so a row's "not yet" state is a
           * fact about the DOM rather than something a tween has to remember to
           * assert. Then a plain `to`, which reverses cleanly on scrub-back.
           */
          gsap.set(rows, { opacity: 0, y: 14 })

          tl.to(
            rows,
            {
              opacity: 1,
              y: 0,
              /*
               * 0.13 storyboard units between rows, not 0.05.
               *
               * At 0.05 the ten rows of Orbit spread over 0.45 units — about
               * 13svh of scroll — which arrives as one block with a soft edge
               * rather than as a list assembling itself. 0.13 spreads them over
               * 1.17 units, roughly a third of the viewport's worth of scroll,
               * and each row is individually legible as it lands.
               *
               * The cascade finishes at 3.57 of the card's 5.6-unit moment, so
               * there are still ~2 units of complete stillness afterwards. The
               * reveal is not allowed to eat the reading pause.
               */
              stagger: 0.13,
              ease: 'power2.out',
              duration: 0.9,
            },
            enterAt + 1.5,
          )
        }

        // Liftoff's outline draws itself closed as the card settles.
        const outline = slot.querySelector<SVGRectElement>('.card-outline')
        if (outline) {
          tl.to(
            outline,
            { strokeDashoffset: 0, ease: 'none', duration: 1.2 },
            enterAt + 1.3,
          )
        }

        /*
         * EXIT — back and up, tipping away as it goes, so it reads as receding
         * into the stage rather than sliding off a flat surface. Same `inOut` as
         * the entrance, for the same reason and so the two halves of a hand-off
         * are symmetrical.
         *
         * The opacity lags the transform by a fifth of the beat: the card starts
         * moving before it starts disappearing, so what you notice is that it
         * left, not that it was switched off.
         */
        if (last) return

        tl.to(
          slot,
          {
            yPercent: -20,
            scale: 0.9,
            rotationX: -9,
            rotationY: 6,
            ease: 'power2.inOut',
            duration: EXIT,
          },
          exitAt,
        )
        tl.to(
          slot,
          { opacity: 0, ease: 'power1.in', duration: EXIT * 0.8 },
          exitAt + EXIT * 0.2,
        )
        tl.to(
          slot,
          { filter: 'blur(7px)', ease: 'power1.in', duration: EXIT },
          exitAt,
        )
      })

      /*
       * KEYBOARD.
       *
       * Both cards are always in the DOM and always focusable, so tabbing
       * forward from Liftoff's CTA reaches Orbit's — while Orbit may be
       * invisible and a hundred units of scroll away. Left alone that is a
       * focus-not-visible failure and, worse, a control that cannot be reached
       * without a mouse wheel.
       *
       * So focus drives the scroll: land on a card that is off stage and the
       * page travels to that card's moment. Tab order and the presentation stay
       * the same thing.
       */
      const onFocusIn = (event: FocusEvent) => {
        const slot = (event.target as HTMLElement | null)?.closest<HTMLDivElement>(
          '[data-price-slot]',
        )
        if (!slot) return

        const i = cards.indexOf(slot)
        if (i < 0 || i === live) return

        const st = tl.scrollTrigger
        if (!st) return

        scrollToY(st.start + (beats(i).holdCentre / TOTAL) * (st.end - st.start))
      }

      deckEl.addEventListener('focusin', onFocusIn)

      return () => {
        deckEl.removeEventListener('focusin', onFocusIn)
        delete stageEl.dataset.priceLive

        /*
         * `clearProps` covers what GSAP wrote. The two properties set straight
         * on `style` are not GSAP's to revert, so they come off by hand —
         * otherwise rotating a tablet across the breakpoint leaves a card
         * permanently promoted to its own compositor layer and unclickable.
         */
        gsap.set(cards, { clearProps: 'all' })
        /*
         * Neither the halos nor the feature rows are in `cards`, so `clearProps`
         * above does not reach them — and both are now parked at `opacity: 0` by
         * hand rather than by a tween that would revert itself.
         *
         * Left behind, an inline `opacity: 0` on a halo beats the `max-width:
         * 767px` rule in the stylesheet and a phone reached by rotating a tablet
         * gets no glow at all; on a feature row it is worse, because the copy
         * simply is not there. Both are the direction of the breakpoint change
         * that is easy to miss, since reloading at phone width looks correct.
         */
        gsap.set(deckEl.querySelectorAll('[data-price-halo]'), {
          clearProps: 'opacity',
        })
        gsap.set(
          deckEl.querySelectorAll('[data-feature-list] > *, [data-feature-lead]'),
          { clearProps: 'opacity,transform' },
        )
        for (const slot of cards) {
          slot.style.willChange = ''
          slot.style.pointerEvents = ''
        }
      }
    })

    /*
     * PHONES — the same vocabulary, without the spotlight.
     *
     * No pin, no sequencing, no shared cell: each card simply rises into place
     * as it comes into view, with a touch of the stage's tilt and scale so it
     * still arrives as an object rather than fading in flat.
     *
     * Written here rather than reusing the site-wide `data-reveal` hook on
     * purpose. That hook is not breakpoint-scoped, so it would be writing the
     * same slot's `transform` that the stage above claims from 768px up, and one
     * of the two would be silently discarded.
     */
    mm.add('(max-width: 767px)', () => {
      const cards = slots.current.filter((s): s is HTMLDivElement => Boolean(s))

      for (const slot of cards) {
        gsap.fromTo(
          slot,
          { yPercent: 8, scale: 0.94, rotationX: 8, opacity: 0 },
          {
            yPercent: 0,
            scale: 1,
            rotationX: 0,
            opacity: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: slot,
              start: 'top 90%',
              end: 'top 55%',
              scrub: true,
              onToggle: (self) => {
                slot.style.willChange = self.isActive ? 'transform, opacity' : ''
              },
            },
          },
        )
      }

      return () => {
        gsap.set(cards, { clearProps: 'all' })
        for (const slot of cards) slot.style.willChange = ''
      }
    })

    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [t, animate])

  const scrollToTop = () => {
    const hero = document.getElementById('top')
    if (!hero) return
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(hero, { offset: 0 })
    else hero.scrollIntoView({ behavior: 'smooth' })
  }

  /*
   * Layout comes in two shapes, chosen at render because `animate` is knowable
   * at render and the breakpoint is not.
   *
   * The stage overlaps both cards in a single grid cell, which is only ever
   * legible because something is animating them apart. Under reduced motion
   * nothing is, so it falls back to the plain two-up grid — the same layout
   * this section had before.
   */
  const trackClass = animate ? 'relative mt-16 md:h-[360svh]' : 'mt-16'
  /* `relative` so the vignette's `inset-0` resolves to the sticky viewport box
     rather than to the page. */
  const stageClass = animate
    ? 'relative md:sticky md:top-0 md:flex md:min-h-svh md:items-center'
    : ''
  const deckClass = animate
    ? 'mx-auto flex w-full max-w-4xl flex-col gap-6 md:grid md:grid-cols-1 md:gap-0 xl:max-w-5xl'
    : 'grid items-stretch gap-5 md:grid-cols-2 md:gap-6'
  /* `relative` so the halo positions against the slot, not the shell. */
  const slotClass = animate
    ? 'relative md:col-start-1 md:row-start-1'
    : 'relative'

  return (
    <section id="pricing" className="section" data-nav-label={t.pricing.label}>
      <div className="shell">
        <SectionHeader index={index} label={t.pricing.label} heading={t.pricing.heading} />
      </div>

      <div ref={track} className={trackClass}>
        <div ref={stage} className={stageClass}>
          {/*
            DEPTH. Everything the card is not, pushed back — a vignette that
            fades in while the stage owns the viewport and out again when it
            releases. Subtraction rather than addition: the active card becomes
            the brightest thing on screen without being lit any harder, which is
            the only way to add focus to a page that must not get brighter.

            Only on the stage. In flow layout there is no single subject to
            frame, and darkening the edges of an ordinary two-up grid would just
            look like a dirty screen.
          */}
          {animate && (
            <span
              aria-hidden="true"
              className="stage-vignette pointer-events-none absolute inset-0 z-0 hidden md:block"
            />
          )}

          <div className="shell relative z-10 w-full">
            <div
              ref={deck}
              className={deckClass}
              /* One vanishing point for the whole stage, so the cards read as
                 objects in a shared space rather than two separate 3D scenes. */
              style={animate ? { perspective: '1600px' } : undefined}
            >
              {TIERS.map((tier, i) => (
                <div
                  key={tier}
                  data-price-slot
                  ref={(node) => {
                    slots.current[i] = node
                  }}
                  className={slotClass}
                >
                  {/*
                    The glow, inside the slot so it carries the slot's scrubbed
                    transform with it. A glow that stayed put while the card rose
                    past it would read as a light source behind the stage; one
                    that travels reads as the card's own.

                    Its opacity is tweened separately from the slot's, so it is
                    still arriving after the card has landed — the lighting
                    resolves a beat late, which is what keeps it from reading as
                    part of the card's texture.
                  */}
                  <span
                    aria-hidden="true"
                    data-price-halo
                    className="price-halo pointer-events-none"
                  />

                  {/*
                    A layer of its own for the idle float, because the slot's
                    transform belongs to the scrub. Two things writing one
                    `transform` means the last writer wins and the other is
                    silently discarded; nested, they compose.

                    CSS rather than a ticker callback: it is a compositor
                    animation that costs nothing, and it is gated on the stage
                    being in view (`data-price-live`) so it isn't running for
                    the whole session.
                  */}
                  <div className="price-float h-full">
                    <TierCard
                      tier={tier}
                      featured={tier === 'orbit'}
                      animate={animate}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="shell">
        <p className="measure-wide mt-8 text-sm text-muted">{t.pricing.note}</p>

        {/*
          THE HOOK. Its own trigger, starting deliberately late and scrubbing
          slowly. The pause after the cards land is what makes it land.
        */}
        {/*
          Three stacked block lines rather than inline spans. Masked line
          wrappers are display:block, so two inline RevealTexts on one line would
          stack instead of flowing — and giving the accent its own line lands the
          punchline harder anyway. Each starts slightly later than the last.
        */}
        <div className="mt-28 md:mt-40">
          <RevealText
            as="p"
            className="measure-wide text-[clamp(1.5rem,3.4vw,2.5rem)] font-medium leading-[1.2]"
            start="top 80%"
            end="top 46%"
          >
            {t.pricing.hookLead}
          </RevealText>

          <RevealText
            as="p"
            className="measure-wide mt-3 text-[clamp(1.5rem,3.4vw,2.5rem)] font-medium leading-[1.2] text-muted"
            start="top 74%"
            end="top 40%"
          >
            {t.pricing.hookMid}
          </RevealText>

          <RevealText
            as="p"
            className="measure-wide mt-3 text-[clamp(1.5rem,3.4vw,2.5rem)] font-medium leading-[1.2] text-accent"
            start="top 70%"
            end="top 34%"
          >
            {hookAccent}
          </RevealText>

          <button
            type="button"
            onClick={scrollToTop}
            className="tap-link icon-nudge eyebrow mt-8 gap-2 text-accent transition-opacity hover:opacity-70"
          >
            <span aria-hidden="true" data-icon>
              ↑
            </span>
            {t.pricing.scrollBackUp}
          </button>
        </div>

        {/* Side by side. Each row reveals with its checkmark drawing in. */}
        <div className="mt-28 md:mt-36">
          <p className="eyebrow">{t.pricing.comparisonLabel}</p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
              <caption className="sr-only">
                {t.pricing.comparisonLabel} — {t.pricing.liftoff.name} /{' '}
                {t.pricing.orbit.name}
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-4 pr-4 text-sm font-normal text-muted">
                    {t.pricing.includes}
                  </th>
                  <th scope="col" className="eyebrow w-24 py-4 text-center md:w-32">
                    {t.pricing.liftoff.name}
                  </th>
                  <th
                    scope="col"
                    className="eyebrow w-24 py-4 text-center text-accent md:w-32"
                  >
                    {t.pricing.orbit.name}
                  </th>
                </tr>
              </thead>
              <tbody data-comparison>
                {t.pricing.comparison.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4 text-[0.9375rem]">{row.label}</td>
                    <td className="py-4">
                      <span className="flex justify-center">
                        <ComparisonCell value={row.liftoff} animate={animate} />
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="flex justify-center">
                        <ComparisonCell value={row.orbit} animate={animate} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
