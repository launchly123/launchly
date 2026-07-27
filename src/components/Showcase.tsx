import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { config, showcase, type Project } from '../content/content'
import { useLang } from '../lib/i18n'
import { priceLabel } from '../lib/links'
import { DESKTOP_MOTION } from '../lib/device'
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

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          /*
           * 360%, up from 250%.
           *
           * The whole timeline below is authored in normalised 0–1 progress, so
           * this one number is the section's pacing dial — every leg of the
           * client page's scroll and every callout gets proportionally more
           * scrolling to happen across, with none of their relative timing
           * touched. At 250% the homepage flew past faster than the callouts
           * beside it could be read.
           *
           * Distance rather than easing or a bigger `scrub`: those two make the
           * frame lag the wheel, which reads as unresponsive, not as considered.
           */
          end: '+=360%',
          pin: pin.current,
          pinSpacing: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            const el = frame.current
            if (el) el.style.willChange = self.isActive ? 'transform' : ''
          },
        },
      })

      // 1 — the frame rises, rotates flat, and brightens out of the dark.
      tl.fromTo(
        frame.current,
        { scale: 0.85, rotateX: 8, y: 40 },
        { scale: 1, rotateX: 0, y: 0, ease: 'power2.out', duration: 0.14 },
        0,
      ).to(veil.current, { opacity: 0, duration: 0.14 }, 0)

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

            {/* Frame + callouts */}
            <div className="relative" style={{ perspective: '1400px' }}>
              <div ref={frame} className="origin-center">
                <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
                  {/* browser chrome */}
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <span className="flex gap-1.5" aria-hidden="true">
                      <span className="size-2.5 rounded-full bg-border" />
                      <span className="size-2.5 rounded-full bg-border" />
                      <span className="size-2.5 rounded-full bg-border" />
                    </span>
                    <span className="ml-2 truncate font-mono text-[0.6875rem] text-muted">
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

                    {/* Starts dark, brightens as the frame settles. */}
                    <div
                      ref={veil}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-bg"
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
