import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getLenis } from './smoothScroll'

gsap.registerPlugin(ScrollTrigger)

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC PACING

   Two primitives, both answering the same complaint: a hard wheel flick used to
   eat a whole scene. They work at different layers and neither replaces the
   other.

   1. `registerCinemaZone` damps the *input* — while a scene owns the viewport,
      a wheel gesture buys less scroll than it does elsewhere on the page. The
      scene therefore takes more hand to get through without the document
      getting any taller.

   2. `cinematicScrub` damps the *output* — it replaces GSAP's `scrub` with a
      driver that has a speed limit, so a timeline can never play faster than
      its floor no matter how the page moved underneath it.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────────────────────────────────
   1 — SCROLL DAMPING
   ─────────────────────────────────────────────────────────────────────────── */

type Zone = {
  /** Multiplier on raw wheel deltas. Governs how heavy the wheel feels. */
  damp: number
  /**
   * Cap on how far the scroll target may run ahead of where the page actually
   * is, as a fraction of the viewport. Governs how FAST the page may travel.
   *
   * Lenis eases the page toward a target; the gap between the two is what sets
   * the speed. Capping the gap therefore caps the velocity, and unlike `damp` —
   * which scales every gesture equally, gentle ones included — this only binds
   * at the top end. Normal reading scroll never builds a gap this large and
   * never feels it.
   *
   * `null` leaves the zone uncapped.
   */
  maxLead: number | null
}

/** Active zones, by id. The strongest claim of each kind wins. */
const zones = new Map<string, Zone>()

let dampTarget = 1
let dampCurrent = 1
let leadLimit: number | null = null

/**
 * Time constant of the ramp between damping levels.
 *
 * Not optional. Switching the multiplier the instant a zone's edge crosses the
 * viewport centre is felt as the wheel hitting a patch of glue — the same
 * gesture suddenly buys half as much page. Ramped over a third of a second it
 * reads as the section having more mass than the one before it, which is the
 * whole point.
 */
const RAMP = 0.33

/** Adds or (with `null`) removes a zone's claim on the scroll. */
export function setZoneDamping(id: string, zone: Zone | null) {
  if (zone == null) zones.delete(id)
  else zones.set(id, zone)

  let damp = 1
  let lead: number | null = null
  for (const z of zones.values()) {
    if (z.damp < damp) damp = z.damp
    if (z.maxLead != null && (lead == null || z.maxLead < lead)) lead = z.maxLead
  }
  dampTarget = damp
  leadLimit = lead
}

/** Advances the eased multiplier. Driven from the site's single RAF loop. */
export function advanceDamping(deltaSeconds: number) {
  if (dampCurrent === dampTarget) return
  dampCurrent += (dampTarget - dampCurrent) * (1 - Math.exp(-deltaSeconds / RAMP))
  if (Math.abs(dampTarget - dampCurrent) < 0.001) dampCurrent = dampTarget
}

/** The multiplier to apply to raw wheel deltas right now. */
export const scrollDamping = () => dampCurrent

export function resetDamping() {
  zones.clear()
  dampTarget = dampCurrent = 1
  leadLimit = null
}

/**
 * Rewrites a gesture in place, before Lenis consumes it. Two things happen:
 * the delta is damped, and the resulting scroll target is capped so it cannot
 * run further ahead of the page than the active zone allows.
 *
 * The cap is the part that makes a scene unskippable, and it took a wrong turn
 * to find. A speed limit on the *timeline* — which is what `cinematicScrub`
 * does — guarantees the storyboard plays slowly. It guarantees nothing about
 * whether anyone is still looking at it: flick past a sticky stage and it
 * un-sticks immediately while the playhead is a quarter of the way through, and
 * the rest of the sequence plays to an empty screen. That is exactly how the
 * second pricing card came to be skipped.
 *
 * Visibility is governed by scroll, so the floor has to be governed by scroll
 * too. With the page unable to travel faster than this, the stage cannot leave
 * before the storyboard has finished on it, and both cards are necessarily seen.
 *
 * Deliberately only the wheel. `lenis.scrollTo` is `programmatic` and never
 * reaches here, so anchor links, the language-switch restore and the pricing
 * stage's own focus handler still jump instantly — a keyboard user is never
 * held anywhere. Native scrolling (arrow keys, space, dragging the scrollbar)
 * does not pass through Lenis's gesture pipeline either. Those are all explicit
 * "take me there" gestures, and a section that refused them would be a trap
 * rather than a pace.
 */
export function governScroll(data: { deltaX: number; deltaY: number }) {
  if (dampCurrent < 1) {
    data.deltaX *= dampCurrent
    data.deltaY *= dampCurrent
  }

  if (leadLimit == null) return
  const lenis = getLenis()
  if (!lenis) return

  /*
   * Lenis adds the delta to `targetScroll`, so capping the delta caps the lead:
   * allow only the difference between the cap and the lead already outstanding.
   *
   * Floored at zero in each direction rather than clamped to the raw allowance.
   * Enter a zone already over the cap — a flick that began outside it — and the
   * allowance is negative; used as-is it would turn a downward gesture into an
   * upward one. The gesture may be reduced to nothing, never reversed.
   */
  const max = leadLimit * window.innerHeight
  const lead = lenis.targetScroll - lenis.animatedScroll
  const down = Math.max(0, max - lead)
  const up = Math.min(0, -max - lead)
  data.deltaY = Math.min(down, Math.max(up, data.deltaY))
}

/**
 * Sheds momentum that was built before a capped zone took hold.
 *
 * Clamping incoming deltas stops the lead *growing*, which is enough for a
 * gesture that starts inside the scene and nowhere near enough for one that
 * starts above it. Measured: a hard flick begun half a viewport before the
 * pricing track arrived carrying ~5100 px/s and coasted through the first 1.2
 * viewports of it before the delta clamp had anything to clamp.
 *
 * So on entering the zone the outstanding lead is cut to the cap. The page keeps
 * moving — it just decelerates to the scene's speed limit instead of sailing
 * through on momentum it earned somewhere else.
 */
function shedLead(maxLead: number) {
  const lenis = getLenis()
  if (!lenis) return

  const max = maxLead * window.innerHeight
  const lead = lenis.targetScroll - lenis.animatedScroll
  if (Math.abs(lead) <= max) return

  lenis.scrollTo(lenis.animatedScroll + Math.sign(lead) * max, {
    programmatic: true,
  })
}

/**
 * Marks an element as a scene that should be scrolled through slowly.
 *
 * `top center` → `bottom center` rather than the usual `top bottom`: the point
 * is to damp while the scene *owns* the screen, not from the moment its first
 * pixel appears. Combined with the ramp, the change lands under the scene
 * rather than at its edge.
 *
 * Wheel only. Lenis runs with `syncTouch` off, so a phone's scroll never passes
 * through the multiplier at all — and it should not. Damping a finger drag
 * would mean the page moving less than the finger did, which is the one thing
 * touch scrolling is never allowed to do.
 */
export function registerCinemaZone(id: string, trigger: Element, zone: Zone) {
  return ScrollTrigger.create({
    trigger,
    /*
     * `top top` → `bottom bottom` for a zone that caps velocity, not `top
     * center`. A scene that must not be skippable has to be governed from the
     * moment its own scroll span begins, or the first stretch of it — the one
     * that decides whether the stage is still on screen later — is ungoverned.
     * A damp-only zone can afford to wait for the scene to own the screen.
     */
    start: zone.maxLead == null ? 'top center' : 'top top',
    end: zone.maxLead == null ? 'bottom center' : 'bottom bottom',
    onToggle: (self) => {
      setZoneDamping(id, self.isActive ? zone : null)
      if (self.isActive && zone.maxLead != null) shedLead(zone.maxLead)
    },
  })
}

/* ───────────────────────────────────────────────────────────────────────────
   2 — SPEED-LIMITED SCRUB
   ─────────────────────────────────────────────────────────────────────────── */

type ScrubOptions = {
  trigger: Element
  start: string
  end: string | (() => string)
  /**
   * Floor, in seconds, on how long the whole timeline may take to play through.
   * This is the "minimum playback duration" — the timeline's progress is not
   * allowed to change faster than `1 / minPlay` per second.
   */
  minPlay: number
  /**
   * Time constant of the eased approach, in seconds. Roughly `scrub / 4.6`, so
   * 0.5 here is about as weighty as `scrub: 2.3`.
   */
  smooth?: number
  invalidateOnRefresh?: boolean
  /**
   * Pinned by this same trigger when given, rather than by a second one on the
   * same span.
   *
   * Two triggers over one element is the obvious shape and it is wrong here: the
   * pin has to track scroll exactly while the timeline deliberately does not, so
   * they would be measuring the same span for different purposes and racing each
   * other to apply pin spacing on refresh. One trigger, one measurement.
   */
  pin?: Element | null
  pinSpacing?: boolean
  onToggle?: (self: ScrollTrigger) => void
  /**
   * Fires every frame the playhead moves, with the *rendered* progress.
   *
   * Anything keyed to what is currently on screen has to read this and not
   * `ScrollTrigger.progress`. The two are the same number under a plain scrub;
   * under a speed limit they are deliberately not, and the scroll position is
   * the wrong one — it is where the visitor asked to be, not where the scene
   * has got to.
   */
  onRender?: (progress: number) => void
}

/**
 * Drives a paused timeline from scroll position with inertia *and a speed cap*.
 *
 * GSAP's own `scrub: N` is a fixed-duration catch-up: whatever the distance
 * jumped, it tweens the playhead there over N seconds. That is backwards for
 * this brief. A 5% nudge and a 100% flick both take N seconds, so the harder
 * you scroll the faster the animation plays — which is exactly the complaint.
 * At `scrub: 2` a hard flick genuinely did put the whole pricing storyboard
 * away in about two seconds.
 *
 * Here the playhead eases toward the scroll target the same way, but the step
 * it may take in one frame is clamped. The catch-up is therefore proportional
 * to the distance: a small correction still resolves in a moment, a flick takes
 * as long as it takes. `minPlay` is a genuine floor on the whole scene.
 *
 * The cost is honest: overscroll a scene hard enough and the animation is still
 * playing after you have scrolled past it. That is why this is paired with
 * `registerCinemaZone` — the damping is what keeps you inside the scene long
 * enough for the floor to be worth having.
 */
export function cinematicScrub(tl: gsap.core.Timeline, o: ScrubOptions) {
  const smooth = o.smooth ?? 0.5
  const maxRate = 1 / o.minPlay

  let target = 0
  let current = 0

  const tick = (_time: number, deltaMs: number) => {
    // Clamped: a backgrounded tab returns with a delta of several seconds, and
    // an unclamped frame would step straight past the speed limit it exists to
    // enforce.
    const dt = Math.min(deltaMs, 50) / 1000
    const diff = target - current

    if (Math.abs(diff) < 0.0002) {
      if (current !== target) {
        current = target
        tl.progress(current)
        o.onRender?.(current)
      }
      return
    }

    const eased = diff * (1 - Math.exp(-dt / smooth))
    const cap = maxRate * dt
    current += gsap.utils.clamp(-cap, cap, eased)

    tl.progress(current)
    o.onRender?.(current)
  }

  gsap.ticker.add(tick)

  const st = ScrollTrigger.create({
    trigger: o.trigger,
    start: o.start,
    end: o.end,
    pin: o.pin ?? undefined,
    pinSpacing: o.pinSpacing,
    invalidateOnRefresh: o.invalidateOnRefresh,
    /*
     * The timeline is not attached to this trigger, so ScrollTrigger's own
     * `invalidateOnRefresh` handling never reaches it — function-based values
     * inside the timeline would keep animating to pixel positions measured
     * before the resize.
     *
     * Seek to zero *before* invalidating, then back. `invalidate()` makes every
     * tween re-record its start value from the DOM the next time it renders, and
     * a refresh can land at any playhead position — invalidating mid-flight
     * would teach a card that its "from" state is wherever it happened to be
     * halfway through arriving, and it would never go off stage again.
     */
    onRefresh: (self) => {
      if (o.invalidateOnRefresh && tl.duration()) {
        tl.progress(0).invalidate().progress(current)
      }
      target = self.progress
    },
    onUpdate: (self) => {
      target = self.progress
    },
    onToggle: o.onToggle,
    /*
     * Past either edge the trigger stops updating, so the target has to be
     * parked by hand or the playhead settles wherever the last frame left it.
     *
     * Snapped, not eased. Under the velocity cap this is a no-op — the
     * storyboard has already finished by the time its scene leaves the screen.
     * It only bites when something bypasses the cap: a scrollbar drag, `End`, a
     * nav anchor. Easing there would leave the timeline quietly playing to an
     * empty screen for several seconds and arriving at a state that no longer
     * matches the scroll position, which is worse than simply being where the
     * visitor asked to be.
     */
    onLeave: () => {
      target = current = 1
      tl.progress(1)
      o.onRender?.(1)
    },
    onLeaveBack: () => {
      target = current = 0
      tl.progress(0)
      o.onRender?.(0)
    },
  })

  return {
    scrollTrigger: st,
    /** The rendered playhead, for anything that needs it outside `onRender`. */
    progress: () => current,
    kill() {
      gsap.ticker.remove(tick)
      st.kill()
    },
  }
}
