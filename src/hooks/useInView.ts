import { useEffect, useRef, useState } from 'react'

/**
 * True once the element has come within `rootMargin` of the viewport, and
 * stays true afterwards.
 *
 * Used to defer expensive subtrees — chiefly the portfolio iframe, which pulls
 * down an entire third-party site (its own HTML, images, and webfonts) the
 * moment it mounts. `loading="lazy"` is only a hint and browsers routinely
 * fetch well ahead of it; this makes the deferral explicit.
 */
export function useInView<T extends HTMLElement>(rootMargin = '400px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return

    // No IntersectionObserver (very old browsers) → show it rather than hide
    // content behind a missing API.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, inView])

  return { ref, inView }
}
