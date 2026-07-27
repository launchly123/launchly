import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { config, showcase, type Project } from '../content/content'
import { useLang } from '../lib/i18n'
import { priceLabel } from '../lib/links'
import { DESKTOP_MOTION } from '../lib/device'
import { cinematicScrub } from '../lib/pacing'
import { prefersReducedMotion } from '../lib/smoothScroll'
import { ButtonLink } from './Button'

gsap.registerPlugin(ScrollTrigger)

/**
 * The deMiguel sequence — the most important fifteen seconds on the site.
 *
 * On desktop the whole block pins and the visitor scrolls the *real* client
 * homepage past inside a browser frame, with callouts pinning beside the feature
 * each one describes. Their scroll drives it; that is the entire trick.
 *
 * A tall static image, not a <video> with `currentTime` scrubbed to scroll.
 * Scrubbed video is unreliable on iOS Safari (it will not seek without a user
 * gesture and stalls mid-seek) and forces a decode per frame. The image is
 * bulletproof and indistinguishable.
 *
 * Tablet and phone get no pin and no scrub — §8, and more importantly, hijacking
 * a finger scroll on the one section that is meant to prove competence would
 * prove the opposite. There the frame sits still and the image drifts on a CSS
 * loop.
 *
 * "Tablet" is decided by `DESKTOP_MOTION`, which asks about the pointer and not
 * only the width — an iPad in landscape is exactly 1024px. Everything whose
 * visibility depends on a tween existing to reveal it is gated on the matching
 * `desk:` variant, so the layout and the timeline can never disagree: the
 * callouts below start at `visibility: hidden` and are revealed by the timeline,
 * so shipping them visible on a device with no timeline would show four labels
 * that never move — and hiding the plain-text list in the same breath would
 * leave a tablet with no callouts at all.
 */
export function Showcase({ project }: { project: Project }) {
  const { t } = useLang()

  const root = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const holder = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const cta = useRef<HTMLDivElement>(null)

  const labels = t.work.showcase.callouts

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return

    const mm = gsap.matchMedia()

    mm.add(DESKTOP_MOTION, () => {
      const holderEl = holder.current
      const imageEl = image.current
      if (!holderEl || !imageEl || !root.current || !pin.current) return

      /*
       * Stops are authored in the desktop image's own pixel space, so they have
       * to be rescaled to however wide the frame actually renders. Wrapped in
       * functions so ScrollTrigger.refresh() re-reads them after a resize or a
       * language switch rather than animating to stale pixel values.
       */
      const travel = (stop: number) => {
        const scale = holderEl.clientWidth / showcase.desktop.width
        const limit = imageEl.offsetHeight - holderEl.clientHeight
        return -Math.min(stop * scale, Math.max(limit, 0))
      }

      /*
       * Paused and unattached: the playhead is driven by `cinematicScrub`, not
       * by GSAP's own `scrub`. Same input — scroll position — but with a speed
       * limit on top, so a flick can no longer put the sequence away in the two
       * seconds a fixed-duration catch-up allowed it.
       */
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })

      /*
       * 500%, up from 250% via 360% and 450%.
       *
       * The whole timeline below is authored in normalised 0–1 progress, so this
       * one number is the section's distance dial — every leg of the client
       * page's scroll and every callout gets proportionally more scrolling to
       * happen across, with none of their relative timing touched.
       *
       * `minPlay` is 4, down from 9, for the same reason the pricing stage's
       * came down from 11: a floor on the timeline is not a floor on what gets
       * seen. This block pins, so the moment the scroll passes `end` the frame
       * is gone — and a playhead still nine seconds from finishing would spend
       * most of them animating to nobody. The floor that matters is the velocity
       * cap on the scroll (`MAX_LEAD` in useScrollMotion), which stops the page
       * crossing this span in under about seven seconds. What is left here is
       * inertia, chosen to be comfortably shorter than that so the sequence can
       * never fall behind its own pin.
       */
      const driver = cinematicScrub(tl, {
        trigger: root.current,
        start: 'top top',
        end: '+=500%',
        pin: pin.current,
        pinSpacing: true,
        minPlay: 4,
        smooth: 0.5,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          const el = frame.current
          if (el) el.style.willChange = self.isActive ? 'transform' : ''
        },
      })

      // 1 — the frame rises, rotates flat, and brightens out of the dark.
      tl.fromTo(
        frame.current,
        { scale: 0.85, rotateX: 8, y: 40 },
        { scale: 1, rotateX: 0, y: 0, ease: 'power2.out', duration: 0.14 },
        0,
      )
        /*
         * `fromTo`, not `to`, and the difference was a black rectangle on every
         * phone.
         *
         * The veil is what the frame brightens out of, so it has to start
         * opaque — but a plain `to` reads its start value from the stylesheet,
         * which meant the markup had to ship it opaque, which meant it stayed
         * opaque anywhere this timeline does not exist. That is every screen
         * under 1024px, every touch device, and every visitor with reduced
         * motion: the one section that exists to prove the work can be seen,
         * covered by a solid `--bg` panel. Measured at 320/375/390/414/430/768,
         * the veil read opacity 1 at all six.
         *
         * Owning both ends here means the veil cannot be stranded by the absence
         * of the thing that was supposed to clear it.
         */
        .fromTo(veil.current, { opacity: 1 }, { opacity: 0, duration: 0.14 }, 0)

      // 2 — the client's homepage scrolls past, one leg per stop.
      let at = 0.14
      showcase.stops.slice(1).forEach((stop, i) => {
        const duration = showcase.legs[i]
        tl.to(imageEl, { y: () => travel(stop), duration }, at)
        at += duration
      })

      // 3 — callouts fly in from the edges and hold beside their feature.
      showcase.callouts.forEach((callout, i) => {
        const el = document.getElementById(`showcase-callout-${i}`)
        if (!el) return

        tl.fromTo(
          el,
          { autoAlpha: 0, x: callout.side === 'left' ? -70 : 70 },
          { autoAlpha: 1, x: 0, ease: 'power3.out', duration: 0.05 },
          callout.at,
        ).to(el, { autoAlpha: 0, duration: 0.04 }, callout.at + 0.14)
      })

      // 4 — the frame recedes and hands over to the call to action.
      tl.to(frame.current, { scale: 0.92, duration: 0.1 }, 0.9)
        .fromTo(
          cta.current,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.08 },
          0.92,
        )

      return () => {
        // The driver's ticker callback is neither a tween nor a ScrollTrigger,
        // so matchMedia's revert cannot reach it. Left behind it would keep
        // writing to a timeline the context has already torn down.
        driver.kill()
        gsap.set([frame.current, imageEl, veil.current, cta.current], { clearProps: 'all' })
      }
    })

    return () => mm.revert()
  }, [labels])

  const tierName = project.tier === 'orbit' ? 'Orbit' : 'Liftoff'

  return (
    <div ref={root} className="relative">
      <div
        ref={pin}
        className="flex min-h-[100svh] flex-col justify-center py-12 desk:py-0"
      >
        <div className="shell w-full">
          <div className="grid gap-8 lg:grid-cols-[13rem_1fr] lg:gap-12">
            {/* Left rail. The tier badge is the only green in this section. */}
            <div className="lg:pt-2">
              <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-text">
                01
                <span aria-hidden="true" className="text-muted">
                  /
                </span>
                {tierName}
                <span aria-hidden="true" className="text-muted">
                  —
                </span>
                <span className="text-accent">
                  {priceLabel(config.pricing[project.tier])}
                </span>
              </span>

              <h3 className="mt-6 text-2xl font-semibold lg:text-3xl">
                {project.name}
              </h3>
              <p className="eyebrow mt-3">{t.work.frameHint}</p>
            </div>

            {/*
              Frame + callouts.

              `min-w-0` is load-bearing, and its absence is why this section was
              broken on phones. This div is a grid item, and a grid item's
              default `min-width: auto` refuses to shrink below its own
              min-content width. The browser chrome's URL — a single unbreakable
              `restaurantedemiguel.vercel.app` — set that floor at 289px, so at
              320px the frame rendered 291px wide inside a 224px column and hung
              19px off the right of the screen, silently guillotined by the page's
              `overflow-x: hidden` rather than reported as overflow.

              With the floor removed the frame tracks its column at every width
              and the URL ellipsises, which is what the `min-w-0 truncate` on the
              span below is for — that too was inert while this one was missing.
            */}
            <div className="relative min-w-0" style={{ perspective: '1400px' }}>
              <div ref={frame} className="origin-center">
                <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
                  {/* browser chrome */}
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <span className="flex shrink-0 gap-1.5" aria-hidden="true">
                      <span className="size-2.5 rounded-full bg-border" />
                      <span className="size-2.5 rounded-full bg-border" />
                      <span className="size-2.5 rounded-full bg-border" />
                    </span>
                    {/*
                      `min-w-0` is what makes `truncate` do anything here. A flex
                      item's default `min-width: auto` refuses to shrink below its
                      content, so at 320px the URL simply ran past the chrome bar
                      and was cut off square by the card's `overflow-hidden` —
                      clipped rather than ellipsised.
                    */}
                    <span className="ml-2 min-w-0 truncate font-mono text-[0.6875rem] text-muted">
                      {project.url?.replace(/^https?:\/\//, '')}
                    </span>
                  </div>

                  {/*
                    Fixed height in svh, never a hard 100vh: on a 13" laptop the
                    pinned block also has to fit the rail, the CTA and the page
                    gutters without clipping.
                  */}
                  <div
                    ref={holder}
                    className="relative h-[clamp(220px,46svh,560px)] overflow-hidden bg-white"
                  >
                    {/*
                      Media-based <picture>, deliberately NOT a `srcset`/`sizes`
                      width descriptor.
                      `srcset` resolves by resolution: on a 390px phone at DPR 2
                      the browser needs ~780px, so it skips the 560w file and
                      downloads the 1200w one — 538 KB and 17 megapixels on the
                      device least able to decode it. Verified that happening.
                      The reason for the small file is decode memory, not
                      resolution, so the rule has to be the device, not the maths.

                      Both files share the same aspect ratio, so the width/height
                      attributes below reserve the correct box either way and
                      nothing shifts.
                    */}
                    <picture>
                      <source
                        media="(max-width: 1023px)"
                        srcSet={showcase.mobile.src}
                      />
                      <img
                        ref={image}
                        src={showcase.desktop.src}
                        width={showcase.desktop.width}
                        height={showcase.desktop.height}
                        alt={t.work.showcase.description}
                        loading="lazy"
                        decoding="async"
                        className="showcase-drift absolute left-0 top-0 w-full"
                      />
                    </picture>

                    {/*
                      Transparent by default; the pinned timeline is what makes
                      it opaque, on the one frame of one breakpoint where the
                      frame brightens out of the dark. Shipping it opaque and
                      relying on a tween to clear it left it covering the client
                      site on every phone — see the `fromTo` above.
                    */}
                    <div
                      ref={veil}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-bg opacity-0"
                    />
                  </div>
                </div>
              </div>

              {/*
                Desktop callouts. Hidden from assistive tech because the same
                four facts are listed as real text below for tablet and phone —
                announcing both would read the list twice.
              */}
              <div aria-hidden="true" className="hidden desk:block">
                {showcase.callouts.map((callout, i) => (
                  <span
                    key={i}
                    id={`showcase-callout-${i}`}
                    className={`eyebrow absolute z-10 whitespace-nowrap rounded-full border border-border bg-surface/95 px-4 py-2 text-text backdrop-blur-sm ${
                      callout.side === 'left'
                        ? '-left-6 lg:-left-10'
                        : '-right-6 lg:-right-10'
                    }`}
                    style={{
                      top: `${18 + i * 20}%`,
                      visibility: 'hidden',
                    }}
                  >
                    {labels[i]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Without the pinned timeline, the callouts are a plain list that
              reveals on scroll. Same four facts, no motion required. */}
          <ul
            data-reveal-group
            className="mt-8 grid gap-2 sm:grid-cols-2 desk:hidden"
          >
            {labels.map((label, i) => (
              <li
                key={i}
                className="eyebrow flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-text"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div ref={cta} className="mt-8 lg:mt-10">
            {project.url && (
              <ButtonLink href={project.url} variant="secondary" external>
                {t.work.showcase.cta}
                <span aria-hidden="true">↗</span>
                <span className="sr-only">({t.a11y.externalLink})</span>
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
