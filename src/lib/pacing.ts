import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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

/** Active zones, by id. The strongest (lowest) damping in force wins. */
const zones = new Map<string, number>()

let dampTarget = 1
let dampCurrent = 1

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

/** Adds or (with `null`) removes a zone's claim on the scroll multiplier. */
export function setZoneDamping(id: string, value: number | null) {
  if (value == null) zones.delete(id)
  else zones.set(id, value)
  dampTarget = zones.size ? Math.min(...zones.values()) : 1
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
export function registerCinemaZone(
  id: string,
  trigger: Element,
  multiplier: number,
) {
  return ScrollTrigger.create({
    trigger,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => setZoneDamping(id, self.isActive ? multiplier : null),
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
    // Past either edge the trigger stops updating, so the target has to be
    // parked by hand or the playhead settles wherever the last frame left it.
    onLeave: () => {
      target = 1
    },
    onLeaveBack: () => {
      target = 0
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
