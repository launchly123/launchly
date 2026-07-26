import Lenis from 'lenis'

/**
 * Module-level handle on the running Lenis instance.
 *
 * Lenis owns the scroll position while it's active, so anything that moves the
 * page programmatically (anchor links, the language-switch anchor restore) has
 * to go through it — a raw `window.scrollTo` gets fought and undone on the
 * next frame.
 */
let instance: Lenis | null = null

export const getLenis = () => instance
export const setLenis = (next: Lenis | null) => {
  instance = next
}

/** Reads the OS-level "reduce motion" setting. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Moves the page to an absolute Y position, using Lenis if it's driving.
 * `immediate` skips the easing — used when correcting for a re-render, where
 * an animated correction would read as a glitch.
 */
export function scrollToY(y: number, immediate = false) {
  const lenis = getLenis()

  if (lenis) {
    lenis.scrollTo(y, { immediate, force: true })
    return
  }

  window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' })
}
