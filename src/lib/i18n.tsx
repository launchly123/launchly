import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { copy, type Content, type Lang } from '../content/content'
import { refreshMotion } from '../hooks/useScrollMotion'
import { scrollToY } from './smoothScroll'

const STORAGE_KEY = 'launchly.lang'

type LanguageValue = {
  lang: Lang
  setLang: (next: Lang) => void
  /** All copy for the active language. */
  t: Content
  /** Pick the active language out of a `Localized` pair. */
  pick: (value: { en: string; es: string }) => string
}

const LanguageContext = createContext<LanguageValue | null>(null)

/**
 * First visit: guess from the browser. `es-CO`, `es-MX`, `es` → Spanish.
 * Anything else → English.
 * Every visit after that: whatever the visitor last chose, from localStorage.
 *
 * `navigator.languages` is ordered by preference, and that order is the whole
 * point: we return the first entry we recognise, not the first Spanish entry
 * anywhere in the list.
 *
 * The obvious version — `candidates.some(l => l.startsWith('es'))` — is wrong in
 * exactly the market this site is for. A US visitor commonly has
 * `["en-US", "es-US"]`: English first, Spanish available. `some()` sees Spanish
 * anywhere and serves Spanish, overriding a preference the visitor actually
 * stated. Caught on a real browser reporting precisely that list.
 */
function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en'

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    // Private browsing / storage disabled — fall through to detection.
  }

  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]

  for (const tag of candidates) {
    const l = tag?.toLowerCase()
    if (!l) continue
    if (l.startsWith('es')) return 'es'
    if (l.startsWith('en')) return 'en'
  }

  // Neither language listed — English is the wider net of the two.
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  /**
   * Spanish runs 15–25% longer than English, so swapping languages changes the
   * height of every block above the viewport and the page slides under you.
   * We record which section is at the top of the viewport and how far into it
   * we are, then put the reader back on that exact spot after the re-render.
   */
  const anchor = useRef<{ el: Element; offset: number } | null>(null)

  const setLang = useCallback((next: Lang) => {
    anchor.current = null

    for (const section of document.querySelectorAll('main > section, footer')) {
      const rect = section.getBoundingClientRect()
      if (rect.bottom > 0) {
        anchor.current = { el: section, offset: rect.top }
        break
      }
    }

    setLangState(next)

    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Non-fatal: the choice just won't survive a reload.
    }
  }, [])

  /* Runs before the browser paints, so the correction is never visible. */
  useLayoutEffect(() => {
    const pending = anchor.current
    if (!pending) return
    anchor.current = null

    const drift = pending.el.getBoundingClientRect().top - pending.offset
    if (Math.abs(drift) > 0.5) {
      // Routed through Lenis when it's driving — a raw window.scrollBy would
      // be overwritten on the next frame.
      scrollToY(window.scrollY + drift, true)
    }

    // The document just changed height; every ScrollTrigger position with it.
    refreshMotion()
  }, [lang])

  /**
   * Keep the document in sync. This is a state update, not a navigation —
   * nothing reloads and the scroll position is untouched.
   */
  useEffect(() => {
    const t = copy[lang]
    document.documentElement.lang = lang
    document.title = t.meta.title

    const set = (selector: string, value: string) => {
      const el = document.head.querySelector<HTMLMetaElement>(selector)
      if (el) el.content = value
    }

    set('meta[name="description"]', t.meta.description)
    set('meta[property="og:title"]', t.meta.title)
    set('meta[property="og:description"]', t.meta.description)
    set('meta[property="og:image:alt"]', t.meta.ogImageAlt)
    set('meta[property="og:locale"]', lang === 'es' ? 'es_US' : 'en_US')
    set('meta[name="twitter:title"]', t.meta.title)
    set('meta[name="twitter:description"]', t.meta.description)
  }, [lang])

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      setLang,
      t: copy[lang],
      pick: (v) => v[lang],
    }),
    [lang, setLang],
  )

  return (
    <LanguageContext value={value}>{children}</LanguageContext>
  )
}

export function useLang(): LanguageValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>')
  return ctx
}
