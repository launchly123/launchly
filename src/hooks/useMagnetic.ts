import { useEffect } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '../lib/smoothScroll'

/** How far outside the button the pull starts, in px. */
const RADIUS = 80
/** Fraction of the cursor offset the button travels. */
const PULL = 0.28
/**
 * How much the button grows at full proximity.
 *
 * The lift lives here rather than in a CSS `:hover` rule, and not by preference.
 * GSAP's CSSPlugin, when it takes over an element's `transform`, folds any
 * computed `translate`/`scale`/`rotate` into its own matrix and then sets those
 * properties to `none` inline so they cannot apply twice (CSSPlugin.js:861-865).
 * A CSS `scale` on a magnetic button is therefore switched off on the first
 * pointermove — silently, with the rule still sitting in the stylesheet looking
 * correct.
 *
 * Driven off the same falloff as the pull, which is better than the `:hover`
 * step it replaces: the button begins to respond while the cursor is still
 * approaching, rather than snapping at the moment it crosses the edge.
 */
const GROW = 0.022
/** Scale while held down. Reads as the button taking the press. */
const PRESS = 0.985

type Magnet = {
  el: HTMLElement
  xTo: (value: number) => void
  yTo: (value: number) => void
  /** Both axes, always called with the same value. See the note below. */
  scaleXTo: (value: number) => void
  scaleYTo: (value: number) => void
  /** Set by pointerdown/up on this element. */
  held: boolean
}

/**
 * Primary CTAs lean toward the cursor as it approaches, then spring back.
 *
 * Two deliberate performance choices:
 *
 * 1. `gsap.quickTo` builds one reusable tween per property per element. Calling
 *    `gsap.to` on every pointermove allocates a tween per event and hands the
 *    garbage collector a stutter.
 * 2. Pointer events only *record* coordinates; all measuring and writing happens
 *    once per frame inside a `gsap.ticker` callback. Reading
 *    `getBoundingClientRect` directly in a pointermove handler interleaves reads
 *    with writes and forces a synchronous layout on every event.
 */
export function useMagnetic() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const magnets: Magnet[] = gsap.utils
      .toArray<HTMLElement>('[data-magnetic]')
      .map((el) => ({
        el,
        xTo: gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' }),
        yTo: gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' }),
        /*
         * `scaleX`/`scaleY`, NOT `scale`.
         *
         * `quickTo` works by calling `tween.resetTo(property, …)`, which looks up
         * a PropTween *by name*. CSSPlugin never creates one called `scale` —
         * `scale` is a shorthand that expands into the two axis components, so
         * the PropTweens it builds are named `scaleX` and `scaleY`. A
         * `quickTo(el, 'scale')` therefore matches nothing and fails silently:
         * no error, no warning, and the button simply never grows. Measured
         * before the fix — GSAP had written `scale: none` inline and held
         * `_gsap.scaleX` at 1 while the pull animated normally alongside it.
         *
         * No elastic on either. The pull overshoots because a magnet should; a
         * button that overshoots its own size reads as wobbling rather than as
         * responding, so the growth is a plain ease.
         */
        scaleXTo: gsap.quickTo(el, 'scaleX', { duration: 0.5, ease: 'power3' }),
        scaleYTo: gsap.quickTo(el, 'scaleY', { duration: 0.5, ease: 'power3' }),
        held: false,
      }))

    if (magnets.length === 0) return

    /*
     * Press state. Tracked per element and applied inside the same per-frame
     * write as everything else, so a press and a pull never fight over `scale`.
     *
     * `pointercancel` and `pointerleave` both release: a drag that starts on a
     * button and ends elsewhere must not leave it stuck at 0.985.
     */
    const bind = (m: Magnet) => {
      const down = () => {
        m.held = true
      }
      const up = () => {
        m.held = false
      }
      m.el.addEventListener('pointerdown', down)
      m.el.addEventListener('pointerup', up)
      m.el.addEventListener('pointercancel', up)
      m.el.addEventListener('pointerleave', up)
      return () => {
        m.el.removeEventListener('pointerdown', down)
        m.el.removeEventListener('pointerup', up)
        m.el.removeEventListener('pointercancel', up)
        m.el.removeEventListener('pointerleave', up)
      }
    }

    const unbind = magnets.map(bind)

    let pointerX = -9999
    let pointerY = -9999
    let hasPointer = false

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      hasPointer = true
    }

    const update = () => {
      if (!hasPointer) return

      for (const magnet of magnets) {
        const { el, xTo, yTo, scaleXTo, scaleYTo } = magnet
        const rect = el.getBoundingClientRect()

        // Skip anything scrolled well out of view — no point measuring pull for
        // a button nobody can reach.
        if (rect.bottom < -RADIUS || rect.top > window.innerHeight + RADIUS) {
          continue
        }

        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = pointerX - cx
        const dy = pointerY - cy

        // Distance to the button's edge, not its centre, so wide buttons don't
        // need the cursor to reach the middle before responding.
        const outsideX = Math.max(0, Math.abs(dx) - rect.width / 2)
        const outsideY = Math.max(0, Math.abs(dy) - rect.height / 2)
        const distance = Math.hypot(outsideX, outsideY)

        if (distance < RADIUS) {
          const falloff = 1 - distance / RADIUS
          xTo(dx * PULL * falloff)
          yTo(dy * PULL * falloff)
          /* A press wins over the growth outright rather than multiplying with
             it — the point of the press is that it reverses the lift. */
          const grown = magnet.held ? PRESS : 1 + GROW * falloff
          scaleXTo(grown)
          scaleYTo(grown)
        } else {
          xTo(0)
          yTo(0)
          scaleXTo(1)
          scaleYTo(1)
        }
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    gsap.ticker.add(update)

    return () => {
      window.removeEventListener('pointermove', onMove)
      gsap.ticker.remove(update)
      for (const off of unbind) off()
      for (const { el } of magnets) {
        gsap.killTweensOf(el)
        gsap.set(el, { x: 0, y: 0, scale: 1 })
      }
    }
  }, [])
}
