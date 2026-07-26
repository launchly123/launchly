import { testimonials } from './content/content'
import { useMagnetic } from './hooks/useMagnetic'
import { useScrollReveals, useSmoothScroll } from './hooks/useScrollMotion'
import { useLang } from './lib/i18n'
import { Contact } from './components/Contact'
import { Cursor } from './components/Cursor'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Pricing } from './components/Pricing'
import { Problem } from './components/Problem'
import { Process } from './components/Process'
import { ScrollHud } from './components/ScrollHud'
import { Testimonials } from './components/Testimonials'
import { Work } from './components/Work'

export default function App() {
  const { t } = useLang()

  useSmoothScroll()
  useScrollReveals()
  useMagnetic()

  /*
   * Section numbers (`01 / WORK`) come from render order, not hardcoded strings,
   * so they stay correct when the testimonials section appears.
   */
  let n = 0
  const next = () => ++n
  const hasTestimonials = testimonials.length > 0

  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-full bg-accent px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70]"
      >
        {t.a11y.skipToContent}
      </a>

      {/*
        AMBIENT. Two drifting pools of light, eight motes of dust, and a film of
        grain — behind everything, including the tint below.

        Deliberately not brighter, only deeper: the two pools are the palette's
        own `--accent-deep` and `--accent` at 52% and 4.5%, so the page still
        reads as near-black with a corner that catches slightly more light. Every
        layer animates `transform` alone; see the AMBIENT block in `index.css`.

        `overflow-hidden` matters — the pools are deliberately oversized and
        offset past the edges so their soft centres land inside the viewport
        rather than their falloff, and without clipping they'd extend the page
        sideways.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
      >
        <span className="ambient-a" />
        <span className="ambient-b" />
        <span className="ambient-specks" />
        <span className="ambient-grain" />
      </div>

      {/*
        Background tint. Its opacity is scrubbed across the work section — a
        compositor-only way to shift the page's apparent background colour
        without interpolating `background-color` on the main thread each frame.

        #08171A is deMiguel's midnight green pulled down to near-black. Against
        #0A0A0B it reads as a faint cool cast, not as a colour change.
      */}
      <div
        id="bg-tint"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-0"
        style={{ backgroundColor: '#08171A' }}
      />

      <ScrollHud />
      <Cursor />
      <Header />

      <main id="main">
        <Hero />
        <Problem index={next()} />
        <Process index={next()} />
        <Work index={next()} />
        {/* Not a numbered section — it carries no content of its own. */}
        <Marquee />
        <Pricing index={next()} />
        {hasTestimonials && <Testimonials index={next()} />}
        <Contact index={next()} />
      </main>

      <Footer />
    </>
  )
}
