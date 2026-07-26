import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n'
import { Logo } from './Logo'

const SECTIONS = [
  { id: 'work', key: 'work' },
  { id: 'pricing', key: 'pricing' },
  { id: 'contact', key: 'contact' },
] as const

export function Header() {
  const { lang, setLang, t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)

  /* Close the mobile menu on Escape, and lock body scroll while it's open. */
  useEffect(() => {
    if (!menuOpen) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      {/* Reading progress now lives in <ScrollHud>, fixed to the viewport top. */}
      <div className="shell flex h-16 items-center justify-between gap-4 md:h-20">
        <a
          href="#top"
          aria-label={t.a11y.logoHome}
          className="tap-link shrink-0 rounded-full"
        >
          <Logo />
        </a>

        <div className="flex items-center gap-2 md:gap-6">
          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-7">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="tap-link link-underline text-sm text-muted transition-colors hover:text-text"
                  >
                    {t.nav[s.key]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/*
            Language toggle. Always visible — on mobile it sits outside the
            collapsed menu so a Spanish speaker never has to open a menu in
            English to find it.
          */}
          <div
            role="group"
            aria-label={t.a11y.languageLabel}
            className="flex items-center rounded-full border border-border bg-surface p-0.5 font-mono text-[0.6875rem] tracking-widest"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              aria-label={t.a11y.switchToEnglish}
              className={`tap-toggle rounded-full px-3 transition-colors ${
                lang === 'en' ? 'text-accent' : 'text-muted hover:text-text'
              }`}
            >
              EN
            </button>
            <span aria-hidden="true" className="text-muted">
              /
            </span>
            <button
              type="button"
              onClick={() => setLang('es')}
              aria-pressed={lang === 'es'}
              aria-label={t.a11y.switchToSpanish}
              className={`tap-toggle rounded-full px-3 transition-colors ${
                lang === 'es' ? 'text-accent' : 'text-muted hover:text-text'
              }`}
            >
              ES
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t.a11y.closeMenu : t.a11y.openMenu}
            className="grid size-11 place-items-center rounded-full border border-border bg-surface md:hidden"
          >
            <span className="relative block h-2.5 w-4">
              <span
                className={`absolute inset-x-0 top-0 h-px bg-text transition-transform ${
                  menuOpen ? 'translate-y-[5px] rotate-45' : ''
                }`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-px bg-text transition-transform ${
                  menuOpen ? '-translate-y-[5px] -rotate-45' : ''
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      <nav
        id="mobile-nav"
        aria-label="Main"
        hidden={!menuOpen}
        className="border-t border-border bg-bg md:hidden"
      >
        <ul className="shell flex flex-col py-2">
          {SECTIONS.map((s) => (
            <li key={s.id} className="border-b border-border/60 last:border-0">
              <a
                href={`#${s.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[3.25rem] items-center text-lg"
              >
                {t.nav[s.key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
