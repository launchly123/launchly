import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { prefersReducedMotion } from '../lib/smoothScroll'

/** Anything the dot should react to. */
const INTERACTIVE = 'a[href], button, [data-cursor-target]'

/**
 * A small accent dot that trails the real cursor with easing, and swells into a
 * ring over anything interactive.
 *
 * Never rendered on touch devices — there is no cursor to follow, and the
 * element would just be a permanent dot stuck in the corner.
 *
 * The native cursor is deliberately left visible. Hiding it to replace it with a
 * lagging dot makes a site feel broken the moment the JS hiccups, and it breaks
 * the text I-beam over copy people actually want to select.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')

    const sync = () => setEnabled(fine.matches && !prefersReducedMotion())
    sync()

    // A hybrid laptop can gain or lose a precise pointer mid-session.
    fine.addEventListener('change', sync)
    return () => fine.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = dot.current
    if (!enabled || !el) return

    gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0 })

    /*
     * quickTo reuses one tween per property instead of allocating a new one on
     * every mousemove — the difference between a smooth dot and a garbage-
     * collection stutter.
     */
    const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' })

    let seen = false

    const onMove = (event: PointerEvent) => {
      if (!seen) {
        // Jump to the first known position rather than gliding in from 0,0.
        gsap.set(el, { x: event.clientX, y: event.clientY })
        gsap.to(el, { opacity: 1, duration: 0.3 })
        seen = true
        return
      }
      xTo(event.clientX)
      yTo(event.clientY)
    }

    const onOver = (event: PointerEvent) => {
      const hit = (event.target as HTMLElement | null)?.closest?.(INTERACTIVE)
      gsap.to(el, {
        scale: hit ? 3.4 : 1,
        backgroundColor: hit
          ? 'transparent'
          : 'var(--color-accent)',
        borderWidth: hit ? 1.5 : 0,
        duration: 0.35,
        ease: 'power3.out',
      })
    }

    const onLeaveWindow = () => gsap.to(el, { opacity: 0, duration: 0.25 })
    const onEnterWindow = () => gsap.to(el, { opacity: 1, duration: 0.25 })

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerleave', onLeaveWindow)
    document.addEventListener('pointerenter', onEnterWindow)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerleave', onLeaveWindow)
      document.removeEventListener('pointerenter', onEnterWindow)
      gsap.killTweensOf(el)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] size-2.5 rounded-full border-accent bg-accent"
      style={{ willChange: 'transform' }}
    />
  )
}
