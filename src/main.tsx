import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App'
import { LanguageProvider } from './lib/i18n'
import { scrollToY } from './lib/smoothScroll'
import './index.css'

/*
 * Dev-only handles for inspecting the motion system from the console — trigger
 * progress, tween state, forcing a tick. Stripped from production by the
 * `import.meta.env.DEV` guard, which Vite resolves at build time.
 *
 * `__scrollTo` is the one that matters for automated checks. While Lenis is
 * driving, `window.scrollTo` is undone on the next frame, so a headless probe
 * has to jump the page through Lenis itself.
 */
if (import.meta.env.DEV) {
  Object.assign(window, {
    __gsap: gsap,
    __ScrollTrigger: ScrollTrigger,
    __scrollTo: (y: number) => scrollToY(y, true),
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
