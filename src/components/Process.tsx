import { useLang } from '../lib/i18n'
import { prefersReducedMotion } from '../lib/smoothScroll'
import { SectionHeader } from './SectionHeader'

/**
 * Everywhere except a real desktop pointer, this is a plain ordered list.
 *
 * On `desk` — 1024px and up *with a fine pointer* — the same markup becomes a
 * stack of sticky full-viewport panels: each step pins at the top of the screen
 * while the next one scrolls up and covers it, so a step genuinely takes over
 * the viewport as you pass through. Four panels of a viewport each is the 400vh
 * the section is meant to occupy — the height comes from the content, not from a
 * magic number.
 *
 * `desk`, not `lg`, and the difference is one device: an iPad in landscape is
 * exactly 1024px, so a width-only breakpoint gives a tablet the full pinned
 * treatment that §8 rules out for touch.
 *
 * `min-h-svh`, not `h-screen` — §8 again. A hard 100vh clips its own content on
 * a short laptop; a minimum grows instead. Measured before changing it: the
 * tallest step content is 202px against a 640px floor, so in practice every
 * panel is still exactly one viewport and the numeral cross-fade — which assumes
 * equal panels — is unaffected. This is a safety net, not a layout change.
 *
 * Sticky rather than ScrollTrigger's `pin`. Pinning wraps and re-parents the
 * element, which fights Lenis on resize and duplicates the DOM; CSS sticky is
 * one property, survives language switches without a refresh, and costs nothing
 * on the main thread. Same markup for both layouts — no duplicated content for
 * screen readers or crawlers to trip over.
 *
 * The step numerals and the progress line live in a separate sticky rail rather
 * than inside each panel. They have to: a panel's background is opaque (it is
 * what covers the previous step), so a numeral inside panel 2 cannot cross-fade
 * with one inside panel 1 — it would be wiped in, not blended. One rail above
 * the stack gives a genuine cross-fade, and costs one element set instead of
 * four.
 */
export function Process({ index }: { index: number }) {
  const { t } = useLang()
  const steps = t.process.steps

  /*
   * Evaluated at render, not inside an effect: under reduced motion the rail
   * would be four numerals stacked on one another with nothing to separate them,
   * so it is never built. The static per-panel numeral takes over instead.
   */
  const animate = !prefersReducedMotion()

  const ghostSize =
    'select-none text-[16rem] font-semibold leading-none text-surface xl:text-[22rem]'

  // No data-handoff: a scale on this section would create a containing block
  // and break the sticky panels inside it.
  return (
    <section id="process" className="section" data-nav-label={t.process.label}>
      <div className="shell">
        <SectionHeader
          index={index}
          label={t.process.label}
          heading={t.process.heading}
        />
      </div>

      <div className="relative mt-16 lg:mt-24">
        <ol data-step-track>
          {steps.map((step, i) => (
            <li
              key={i}
              data-step-panel
              /*
                150svh with 50svh of it as padding-bottom, where this was a flat
                100svh.

                The stack has no scrub and no timeline — one panel covers the
                next purely because it is sticky and the one after it is taller
                than nothing. So the *only* dial for how long a step holds is
                the panel's height, and the panel could not simply be made
                taller: content centred in a 150svh box sits at 75svh, a quarter
                of a screen below where it does now.

                Padding-bottom fixes that for free. `box-sizing: border-box`
                means the 150svh includes it, so the flex content box is back to
                exactly 100svh and `items-center` puts the copy at 50svh — the
                same pixel it was at before. What the extra 50svh buys is scroll:
                the next panel's top now needs half a viewport more travel to
                reach zero, so every step holds 50% longer with no visible
                change to the layout at all.
              */
              className="relative border-t border-border bg-bg py-10 desk:sticky desk:top-0 desk:flex desk:min-h-[150svh] desk:items-center desk:overflow-hidden desk:pb-[50svh] desk:pt-0"
            >
              {/*
                Reduced-motion fallback for the cross-fading rail. `--color-surface`
                on `--color-bg` is a 4-point value step — present at a glance,
                never competing with the headline.
              */}
              {!animate && (
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-[18%] desk:block ${ghostSize}`}
                >
                  {i + 1}
                </span>
              )}

              <div data-step-content className="shell relative w-full">
                <div
                  data-reveal
                  className="grid gap-4 md:grid-cols-[10rem_1fr] md:gap-10"
                >
                  <p className="eyebrow pt-2">
                    {t.process.stepLabel} {String(i + 1).padStart(2, '0')}
                  </p>
                  <div>
                    {/*
                      Sized up hard at lg: a panel that owns the whole viewport
                      can carry display type, and at the previous scale the
                      content floated in ~570px of dead space.
                    */}
                    <h3 className="text-3xl font-semibold md:text-5xl lg:text-[clamp(3.5rem,7vw,7rem)]">
                      {step.title}
                    </h3>
                    <p className="measure-wide mt-4 text-lg text-muted lg:mt-8 lg:text-2xl">
                      {step.body}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {animate && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 hidden desk:block"
          >
            <div className="sticky top-0 h-svh overflow-hidden">
              {/*
                Vertical progress line, replacing the per-panel horizontal rule.
                A horizontal bar that resets to zero four times reads as four
                unrelated loading bars; one vertical line that fills once tells
                you where you are in the section.
              */}
              <span className="absolute inset-y-0 left-0 w-px bg-border">
                <span
                  data-step-progress
                  className="absolute inset-0 origin-top bg-accent"
                  style={{ transform: 'scaleY(0)' }}
                />
              </span>

              {/*
                Positioned with `top`/`right` only. GSAP owns the transform on
                these — it sets the -50% centring itself so the cross-fade nudge
                can compose with it instead of overwriting a translate utility.
              */}
              {steps.map((_, i) => (
                <span
                  key={i}
                  data-step-ghost
                  className={`absolute right-0 top-1/2 ${ghostSize}`}
                  style={{ opacity: i === 0 ? 1 : 0 }}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
