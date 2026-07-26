import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLang } from '../lib/i18n'
import { prefersReducedMotion } from '../lib/smoothScroll'

gsap.registerPlugin(ScrollTrigger)

type Active = { index: number; label: string } | null

/**
 * Reading progress across the top, and a section marker in the bottom-left
 * corner (`02 / WORK`) that keeps its place as sections pass.
 *
 * Section labels are read from each `<section data-nav-label>` at the moment the
 * trigger fires, not captured when the trigger is built — so switching language
 * relabels the marker without rebuilding anything.
 */
export function ScrollHud() {
  const bar = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<Active>(null)
  const { lang } = useLang()

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion()

    const ctx = gsap.context(() => {
      if (bar.current && !reduced) {
        gsap.fromTo(
          bar.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
          },
        )
      }

      const sections = gsap.utils.toArray<HTMLElement>(
        'main > section[data-nav-label]',
      )

      sections.forEach((section, index) => {
        ScrollTrigger.create({
          trigger: section,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: (self) => {
            if (!self.isActive) return
            setActive({
              index: index + 1,
              label: section.dataset.navLabel ?? '',
            })
          },
          /*
           * Scrolling back above the first section clears the marker — over the
           * hero there is no section to mark.
           *
           * This hangs off the first section rather than a separate trigger on
           * the hero itself: a hero trigger would need `start: 'top top'`, which
           * sits exactly at scroll 0, and ScrollTrigger does not reliably report
           * itself active precisely on that boundary. The marker would stay lit
           * with a stale label all the way back at the top.
           */
          ...(index === 0 ? { onLeaveBack: () => setActive(null) } : {}),
        })
      })
    })

    return () => ctx.revert()
    // Rebuilt on language change: Spanish reflows the document, moving every
    // start/end offset these triggers were measured against.
  }, [lang])

  return (
    <>
      {/*
        The collapsed starting state is an inline `transform`, NOT Tailwind's
        `scale-x-0`. In Tailwind v4 that utility compiles to the CSS `scale`
        property, which multiplies with `transform` rather than being overridden
        by it — so `scale: 0%` times GSAP's `scaleX(1)` is still zero, and the bar
        never appears at any scroll position. Nothing errors; it is simply always
        invisible.

        `will-change` is permanent here by exception: this is one 2px fixed bar
        that is genuinely active for the entire page, so there is no idle period
        to release the layer for.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-accent"
        ref={bar}
        style={{ transform: 'scaleX(0)', willChange: 'transform' }}
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none fixed bottom-6 left-6 z-40 hidden transition-opacity duration-500 md:block ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="eyebrow">
          {active ? (
            <>
              <span className="text-text">
                {String(active.index).padStart(2, '0')}
              </span>{' '}
              / {active.label}
            </>
          ) : (
            ' '
          )}
        </p>
      </div>
    </>
  )
}
