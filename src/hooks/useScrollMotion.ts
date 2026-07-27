import { useEffect, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { DESKTOP_MOTION } from '../lib/device'
import {
  advanceDamping,
  registerCinemaZone,
  resetDamping,
  scrollDamping,
  setZoneDamping,
} from '../lib/pacing'
import { getLenis, prefersReducedMotion, setLenis } from '../lib/smoothScroll'

gsap.registerPlugin(ScrollTrigger)

/** Distance the fixed header covers, so anchor targets don't land under it. */
const HEADER_OFFSET = -80

/**
 * Flags `will-change: transform` only while a trigger is actually in range.
 *
 * Leaving `will-change` on permanently promotes every element to its own
 * compositor layer for the whole session, which is exactly the memory blow-up
 * the property is meant to avoid.
 */
function manageWillChange(el: Element) {
  return {
    onToggle: (self: ScrollTrigger) => {
      ;(el as HTMLElement).style.willChange = self.isActive ? 'transform' : ''
    },
  }
}

/**
 * Smooth, weighted scrolling — momentum with easing rather than the OS's
 * 1:1 wheel jumps.
 *
 * Touch is deliberately left alone (`syncTouch` off): on a phone, intercepting
 * the native scroll makes the page feel laggy and broken, and most visitors
 * here are on phones.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      /*
       * 1.9, up from 1.15 — and this one is the load-bearing change for "still
       * too fast even when I scroll fast".
       *
       * Everything else on the page is scrubbed, so it can only be as slow as
       * the scroll position feeding it. A hard wheel flick used to travel its
       * whole distance in about a second, and every scrubbed section had no
       * choice but to race along with it. Lenis is the one dial that governs how
       * fast the page itself moves in response to a flick, so lengthening it
       * slows every section at once — including the "How it works" hand-off,
       * which is native CSS sticky and cannot be slowed any other way without
       * restructuring the panels.
       *
       * Expo-out still covers ~90% of the distance in the first third, so the
       * page continues to start moving on the same frame as the wheel event.
       * What grows is the settle. It reads as mass, not as lag — but it is a
       * whole-page change, and the most likely thing to want dialled back if it
       * starts to feel heavy rather than considered.
       *
       * Touch is untouched: `syncTouch` is off, so a phone keeps native
       * momentum scrolling and none of this applies.
       */
      duration: 1.9,
      // Expo-out: quick to respond, long settle. Reads as weight, not lag.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,

      /*
       * The damping tap.
       *
       * Lenis calls this with the raw gesture before it consumes it, so scaling
       * the delta here is scaling the wheel itself: inside a cinematic scene one
       * notch of wheel buys less page than it does anywhere else. That is what
       * "more scroll distance" means from the hand's point of view, and unlike a
       * taller section it costs the document no extra height, leaves the
       * scrollbar honest, and never applies to a visitor who is simply passing
       * through on their way to the contact form.
       *
       * Wheel and trackpad only. Keyboard scrolling arrives as a native scroll
       * that Lenis merely syncs to, so it is untouched — a keyboard user is
       * never made to press the arrow key twice as often. Touch never reaches
       * here either: `syncTouch` is off, so a phone bypasses this path entirely.
       */
      virtualScroll: (data) => {
        const damp = scrollDamping()
        if (damp < 1) {
          data.deltaX *= damp
          data.deltaY *= damp
        }
        return true
      },
    })

    setLenis(lenis)
    document.documentElement.classList.add('lenis-active')

    lenis.on('scroll', ScrollTrigger.update)

    // The single RAF loop for the whole site. Lenis is driven from GSAP's ticker
    // rather than its own, so there is exactly one frame loop.
    const tick = (time: number, deltaMs: number) => {
      // Before `raf`, so a gesture arriving this frame is scaled by the value
      // this frame agreed on rather than the previous one's.
      advanceDamping(Math.min(deltaMs, 50) / 1000)
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const link = (event.target as HTMLElement | null)?.closest?.('a[href^="#"]')
      if (!link) return

      const id = link.getAttribute('href')?.slice(1)
      if (!id) return

      const target = document.getElementById(id)
      if (!target) return

      event.preventDefault()
      lenis.scrollTo(target, { offset: HEADER_OFFSET })
    }

    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      gsap.ticker.remove(tick)
      resetDamping()
      lenis.destroy()
      setLenis(null)
      document.documentElement.classList.remove('lenis-active')
    }
  }, [])
}

/**
 * Scroll-driven motion.
 *
 * Everything here is scrubbed: scroll position *is* the timeline. Scroll down
 * and it plays forward, scroll up and it plays back, stop halfway and it holds
 * halfway. Nothing uses `once` or `toggleActions`.
 *
 * On grouped reveals the whole group shares one trigger that staggers its
 * children, rather than one trigger per child — the same trigger-count saving
 * `ScrollTrigger.batch()` exists to provide, which can't be used here because
 * batching coalesces enter *callbacks* and a scrubbed tween has none.
 */
export function useScrollReveals() {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return

    /*
     * Teardown for things gsap.context() cannot own. It reverts tweens and
     * ScrollTriggers created inside it, but a bare `gsap.ticker` callback is
     * neither, so it would outlive the component and keep running.
     */
    const ctxCleanup: Array<() => void> = []

    const ctx = gsap.context(() => {
      /*
       * HERO
       *
       * The type reveals itself: each line is a <RevealText trigger="load">, so
       * there is no tween for it here. What is left is the two things text
       * can't do for itself.
       */

      // The button row is not text, so it gets the plain rise, timed to land
      // after the sub-headline's last line.
      const cta = document.querySelector('[data-hero-cta]')
      if (cta) {
        gsap.from(cta, {
          opacity: 0,
          y: 28,
          duration: 1,
          ease: 'power3.out',
          delay: 0.62,
        })
      }

      /*
       * Depth: the glow tracks scroll at 0.4x, the type at 1x. Over the hero's
       * own height a 1x layer travels the full distance, so a 0.4x layer has to
       * be pushed back down by 60% of it.
       *
       * Written as a function so `invalidateOnRefresh` re-reads the height on
       * resize and on language change, rather than baking in the value measured
       * at load.
       */
      const heroSection = document.getElementById('top')
      const slow = document.querySelector<HTMLElement>('[data-hero-slow]')
      if (heroSection && slow) {
        gsap.to(slow, {
          y: () => heroSection.offsetHeight * 0.6,
          ease: 'none',
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
            ...manageWillChange(slow),
          },
        })
      }

      /*
       * The scroll prompt stretches as it goes, then is gone by 5% of the page.
       * Measured against `maxScroll` rather than the viewport so it means the
       * same thing in both languages — Spanish makes the document taller.
       */
      const hint = document.getElementById('scroll-hint')
      if (hint) {
        gsap.to(hint, {
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 0,
            end: () => ScrollTrigger.maxScroll(window) * 0.05,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
      }

      /*
       * ───────────────────────────────────────────────────────────────────────
       * SCROLL VELOCITY — read once, spent twice
       *
       * Two things react to how fast the page is moving: the logo arrow and the
       * marquee. They share a single trigger. Two body-spanning triggers each
       * calling `getVelocity()` on the same scroll event would be the same work
       * done twice for the same number.
       * ───────────────────────────────────────────────────────────────────────
       */

      /*
       * The arrow is a flywheel *on top of* its CSS idle rotation: scroll speeds
       * it up, scrolling back turns it the other way, and stopping eases it back
       * to the idle turn rather than to a standstill. 0.006 works out to roughly
       * one extra turn per 1000px travelled.
       *
       * `quickTo` reuses one tween instead of allocating a new one per scroll
       * event, and the angle is accumulated in a closure rather than read back
       * off the element — reading a transform every frame forces a style flush.
       */
      const arrow = document.querySelector<SVGGElement>('[data-logo-arrow]')
      let spinArrow: ((value: number) => void) | null = null
      let arrowAngle = 0
      if (arrow) {
        gsap.set(arrow, { svgOrigin: '32 32' })
        spinArrow = gsap.quickTo(arrow, 'rotation', {
          duration: 0.5,
          ease: 'power2.out',
        })
      }

      /*
       * The marquee. The track holds the phrase twice over, and its offset is
       * wrapped into [-50%, 0), so the second copy is always sitting where the
       * first began and the seam never shows.
       *
       * This is an offset advanced on GSAP's ticker rather than a repeating
       * tween, and that is not a stylistic choice. `repeat: -1` extends a tween
       * *forwards* only, so a negative `timeScale` walks it back to time 0 and
       * parks there — the band moves when you scroll up and then sits dead when
       * you scroll down. Measured, not guessed: -210px one way, 0 the other.
       *
       * An offset has no time axis to run out of, so it moves in both directions
       * at any speed. It also rides the one ticker Lenis already drives, so it
       * adds no second loop, and it can be removed outright when off screen —
       * cheaper than pausing a tween, which stays registered.
       */
      const MARQUEE_IDLE = 0.8 // percent of the track per second
      const marquee = document.querySelector<HTMLElement>('[data-marquee]')
      let setMarqueeTarget: ((value: number) => void) | null = null
      if (marquee) {
        const wrapOffset = gsap.utils.wrap(-50, 0)
        /*
         * No unit argument. `xPercent` is already a percentage, and passing '%'
         * makes quickSetter hand GSAP the string "-12%", which its xPercent
         * parser rejects — silently. Nothing throws; the band simply never moves.
         */
        const setX = gsap.quickSetter(marquee, 'xPercent') as (
          value: number,
        ) => void

        let offset = 0
        let speed = MARQUEE_IDLE
        let target = MARQUEE_IDLE

        setMarqueeTarget = (next: number) => {
          target = next
        }

        const tick = (_time: number, delta: number) => {
          const seconds = delta / 1000

          /*
           * The target decays back to idle here, not in the scroll handler.
           * `onUpdate` fires only *while* the page is moving, so a target set
           * from velocity and left alone would be the band's permanent speed —
           * one flick and it races forever. Decaying every frame is what makes
           * "eases back to a slow idle when still" true rather than aspirational.
           */
          target += (MARQUEE_IDLE - target) * Math.min(1, seconds * 2.2)

          // Eased toward the target rather than snapped, so a flick reads as the
          // band gaining momentum instead of teleporting to a new speed.
          speed += (target - speed) * Math.min(1, seconds * 5)
          offset = wrapOffset(offset + speed * seconds)
          setX(offset)
        }

        /*
         * Added and removed with visibility. This is the only motion on the page
         * that would otherwise run for the whole session, and a band nobody can
         * see has no business writing a transform every frame.
         */
        let running = false
        ScrollTrigger.create({
          trigger: marquee.parentElement ?? marquee,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (self.isActive && !running) {
              gsap.ticker.add(tick)
              running = true
            } else if (!self.isActive && running) {
              gsap.ticker.remove(tick)
              running = false
            }
            marquee.style.willChange = self.isActive ? 'transform' : ''
          },
        })

        // gsap.context() cannot revert a raw ticker callback, so it is unhooked
        // by hand — a stray ticker callback survives every teardown otherwise.
        ctxCleanup.push(() => {
          if (running) gsap.ticker.remove(tick)
        })
      }

      if (spinArrow || setMarqueeTarget) {
        ScrollTrigger.create({
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            const velocity = self.getVelocity()

            if (spinArrow) {
              arrowAngle += velocity * 0.006
              spinArrow(arrowAngle)
            }

            if (setMarqueeTarget) {
              /*
               * Plus, not minus. `wrap(-50, 0)` means a rising offset travels
               * *rightward*: raise it past 0 and it re-enters at -50, so the band
               * sweeps left-to-right. So a positive scroll velocity (downward)
               * has to increase the speed to send it right, and scrolling up
               * takes it negative and reverses it — which is §6.
               *
               * Getting this backwards is invisible in code review and obvious on
               * screen; it was measured, at +119 px/s the wrong way.
               *
               * Clamped: an inertial trackpad fling reports several thousand
               * px/s, which unclamped would smear the type into grey.
               */
              setMarqueeTarget(
                gsap.utils.clamp(-12, 12, MARQUEE_IDLE + velocity * 0.006),
              )
            }
          },
        })
      }

      for (const group of gsap.utils.toArray<HTMLElement>('[data-reveal-group]')) {
        const children = Array.from(group.children) as HTMLElement[]
        if (children.length === 0) continue

        gsap.from(children, {
          opacity: 0,
          y: 28,
          ease: 'power3.out',
          stagger: 0.09,
          scrollTrigger: {
            trigger: group,
            start: 'top 88%',
            end: 'top 45%',
            scrub: 1,
            ...manageWillChange(group),
          },
        })
      }

      for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]')) {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            end: 'top 55%',
            scrub: 1,
            ...manageWillChange(el),
          },
        })
      }

      /*
       * Section hand-off. As a section leaves, its content recedes — scaling
       * down and dropping to 0.4 opacity — while the next section's opaque
       * background rises over it. Depth instead of a flat scrolling document.
       *
       * Opt-in via `data-handoff`, because a `scale` on an ancestor of a
       * `position: sticky` element creates a containing block and breaks the
       * stick. Sections that pin their own content (Work, How it works) are
       * excluded by design.
       */
      for (const section of gsap.utils.toArray<HTMLElement>('[data-handoff]')) {
        const inner = section.querySelector<HTMLElement>(':scope > .shell')
        if (!inner) continue

        gsap.to(inner, {
          scale: 0.95,
          opacity: 0.4,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'bottom 90%',
            end: 'bottom 25%',
            scrub: 1,
            ...manageWillChange(inner),
          },
        })
      }

      /*
       * The page background drifts toward a heavily desaturated midnight green
       * — deMiguel's own brand colour — across the work section, then cools back
       * to neutral for pricing.
       *
       * This is one layer doing both jobs. §1 asked for a warm shift through
       * work and §2 for midnight green while the showcase is pinned; stacking two
       * near-black tints over the same section just muddies both into grey. One
       * tint, one destination, still under the 2–3% perceptual budget.
       *
       * Animated as the *opacity* of a fixed layer rather than as
       * `background-color`: colour interpolation runs on the main thread every
       * frame, opacity is a compositor property. Same result, no cost.
       */
      const tint = document.getElementById('bg-tint')
      const work = document.getElementById('work')
      if (tint && work) {
        gsap.fromTo(
          tint,
          { opacity: 0 },
          {
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: work,
              start: 'top 70%',
              end: 'top 20%',
              scrub: 1,
            },
          },
        )
        gsap.to(tint, {
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: work,
            start: 'bottom 70%',
            end: 'bottom top',
            scrub: 1,
          },
        })
      }
    })

    /*
     * Desktop-only motion. gsap.matchMedia builds these when the query matches
     * and reverts them when it stops, so a phone never pays for the sticky-panel
     * scrubs and rotating a tablet rebuilds cleanly.
     *
     * `DESKTOP_MOTION` rather than a bare width: an iPad in landscape is exactly
     * 1024px, which a `min-width: 1024px` gate would hand the full desktop
     * treatment that §8 rules out for touch.
     */
    const mm = gsap.matchMedia()

    /*
     * ─────────────────────────────────────────────────────────────────────────
     * CINEMA ZONES — where the wheel is deliberately made heavier.
     *
     * The three scenes the brief names. Registered here rather than inside each
     * component so the multipliers sit next to each other and can be read as a
     * set: they are relative to one another as much as to 1.
     *
     * 0.55 across the board. Two full turns of the wheel to buy what one used
     * to, which is enough to stop a flick clearing a scene and not so much that
     * the page feels stuck. This is the single number to raise if the site
     * starts to feel like wading rather than like weight.
     *
     * Each zone is gated on the breakpoint where its scene actually exists.
     * Below 1024px the steps are a plain list and the showcase is a still frame;
     * below 768px the pricing stage is flow layout. Damping the wheel over a
     * static list would be drag with nothing to show for it.
     * ─────────────────────────────────────────────────────────────────────────
     */
    const DAMPING = 0.55

    const cinema = (query: string, scenes: Array<[string, string]>) => {
      mm.add(query, () => {
        for (const [id, selector] of scenes) {
          const el = document.querySelector(selector)
          if (el) registerCinemaZone(id, el, DAMPING)
        }

        // The trigger is reverted with the context; the multiplier it last set
        // is not, so a zone left active across a breakpoint change would damp
        // the whole site for the rest of the session.
        return () => {
          for (const [id] of scenes) setZoneDamping(id, null)
        }
      })
    }

    cinema(DESKTOP_MOTION, [
      ['cinema-steps', '[data-step-track]'],
      ['cinema-showcase', '#work'],
    ])
    cinema('(min-width: 768px)', [['cinema-pricing', '[data-price-track]']])

    mm.add(DESKTOP_MOTION, () => {
      /*
       * Live-site frames on portfolio cards. Currently a no-op: the only project
       * in `content.ts` is the pinned deMiguel showcase, which has its own
       * treatment. This runs as soon as a second project is added.
       */
      for (const frame of gsap.utils.toArray<HTMLElement>('[data-frame]')) {
        gsap.fromTo(
          frame,
          { scale: 0.94, y: 40 },
          {
            scale: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: frame,
              start: 'top bottom',
              end: 'top 55%',
              scrub: 0.4,
              ...manageWillChange(frame),
            },
          },
        )
      }

      /*
       * HOW IT WORKS — the sticky panel stack.
       *
       * Every span below is derived from one fact about the layout: with panels
       * of exactly 100vh all stuck at `top: 0`, panel *i* is covered by panel
       * *i+1* over precisely the scroll from its own top reaching the viewport
       * top to its own bottom reaching it. So `top top → bottom top` on a panel
       * is that panel's hand-off, and the track's `top top → bottom bottom` is
       * the three hand-offs end to end.
       */
      const track = document.querySelector<HTMLElement>('[data-step-track]')
      const panels = gsap.utils.toArray<HTMLElement>('[data-step-panel]')

      // The outgoing step recedes as the next one climbs over it. Ends at 20%
      // rather than 0 so the recede has finished before it is fully hidden —
      // otherwise you pay for an animation nobody ever sees.
      //
      // It now starts half a viewport late, which is the half-viewport the taller
      // panels bought. Before, a step began dimming the instant it finished
      // arriving; there was never a frame where it was simply sitting there
      // being read. Now there are 50svh of complete stillness first, and the
      // recede runs across the 80svh after that.
      panels.forEach((panel, i) => {
        if (i === panels.length - 1) return
        const content = panel.querySelector<HTMLElement>('[data-step-content]')
        if (!content) return

        gsap.to(content, {
          scale: 0.9,
          opacity: 0.3,
          ease: 'none',
          scrollTrigger: {
            trigger: panel,
            start: 'top -50%',
            end: 'bottom 20%',
            /*
             * 1.5s of catch-up, where this was `true` (locked 1:1, no inertia).
             *
             * The panels themselves stack with native CSS `sticky`, so their
             * hand-off speed is a pure function of panel height — and the panels
             * have to stay one viewport tall or a sticky box taller than the
             * screen stops holding its own content in view. That means the
             * hand-off distance is not available as a dial here the way it is in
             * the showcase and the pricing stage.
             *
             * What IS available is this: the outgoing step's recede now trails
             * the scroll instead of tracking it exactly, so a fast flick no
             * longer snaps one step into the next. The rest of the slowdown for
             * this section comes from the longer Lenis duration, which governs
             * how fast the page travels underneath the sticky stack.
             */
            scrub: 1.5,
            ...manageWillChange(content),
          },
        })
      })

      if (track) {
        const ghosts = gsap.utils.toArray<HTMLElement>('[data-step-ghost]')
        const progress = track.parentElement?.querySelector<HTMLElement>(
          '[data-step-progress]',
        )

        // A fresh vars object per trigger. ScrollTrigger keeps a reference to
        // the one it is handed, so sharing a literal across instances invites
        // one of them to be affected by another's bookkeeping.
        //
        // The end is measured from the panels rather than written as `bottom
        // bottom`, and that stopped being cosmetic the moment the panels grew
        // past one viewport. Hand-off *i* happens when panel *i+1*'s top reaches
        // zero, so the last one lands after exactly `panelHeight × (n - 1)` of
        // scroll — while `bottom bottom` spans `trackHeight - viewport`, which
        // is a different number as soon as a panel is not exactly 100svh. The
        // two agreed by coincidence before and would now be half a viewport
        // apart by the final numeral.
        const spine = () => ({
          trigger: track,
          start: 'top top',
          end: () =>
            `+=${(panels[0]?.offsetHeight ?? window.innerHeight) * (panels.length - 1)}`,
          scrub: true as const,
          invalidateOnRefresh: true,
        })

        if (progress) {
          gsap.fromTo(
            progress,
            { scaleY: 0 },
            { scaleY: 1, ease: 'none', scrollTrigger: spine() },
          )
        }

        if (ghosts.length > 1) {
          // Centred by GSAP, not by a translate utility, so the cross-fade's
          // vertical nudge composes with the centring instead of replacing it.
          gsap.set(ghosts, { xPercent: 18, yPercent: -50 })

          /*
           * One timeline, one unit of duration per hand-off. Scrub maps the
           * trigger's span onto the whole timeline, so hand-off *i* lands
           * exactly on panel *i*'s cover — the numbers change with the panels
           * rather than merely near them.
           */
          const tl = gsap.timeline({ scrollTrigger: spine() })

          ghosts.forEach((ghost, i) => {
            if (i === ghosts.length - 1) return
            tl.to(ghost, { autoAlpha: 0, y: -28, ease: 'none', duration: 1 }, i)
            tl.fromTo(
              ghosts[i + 1],
              { autoAlpha: 0, y: 28 },
              { autoAlpha: 1, y: 0, ease: 'none', duration: 1 },
              i,
            )
          })
        }
      }
    })

    return () => {
      for (const undo of ctxCleanup) undo()
      mm.revert()
      ctx.revert()
    }
  }, [])
}

/**
 * Spanish runs longer than English, so switching languages changes the height
 * of the document and every ScrollTrigger start/end position along with it.
 */
export function refreshMotion() {
  if (prefersReducedMotion()) return
  getLenis()?.resize()
  ScrollTrigger.refresh()
}
