import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Renders a fixed-width viewport (e.g. a 1440px desktop page) inside a fluid
 * container by measuring the container and returning a CSS scale factor.
 *
 * Pure CSS can't do this: `calc(100cqw / 1440)` yields a length, and `scale()`
 * needs a unitless number. So we measure.
 *
 * The first measurement is synchronous, before paint. ResizeObserver only
 * handles later changes — its callbacks are tied to the rendering lifecycle and
 * don't fire in a backgrounded tab, so relying on it for the initial value
 * leaves the frame empty until the tab is focused.
 */
export function useFitScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const width = el.getBoundingClientRect().width
    if (width > 0) setScale(width / designWidth)
  }, [designWidth])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (width > 0) setScale(width / designWidth)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [designWidth])

  return { ref, scale }
}
