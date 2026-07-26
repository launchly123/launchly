import { useLang } from '../lib/i18n'
import { messageOpener, smsUrl } from '../lib/links'
import { ButtonLink } from './Button'
import { RevealText } from './RevealText'

/**
 * Two depth layers, and only two: the glow tracks scroll at 0.4x while
 * everything readable stays at 1x. A third rate would read as parallax-for-its-
 * own-sake, which is the thing that makes a site feel like a template.
 */
export function Hero() {
  const { lang, t } = useLang()

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-24 pb-16"
    >
      {/*
        The only place --accent-deep appears: a very low-opacity glow well
        behind the type. No imagery — the motion is the hero.

        This is the 0.4x layer, and it is two elements on purpose. The outer one
        does the centring, the inner one is the only thing GSAP touches. One
        element doing both means CSS and GSAP writing the same transform, and
        whichever loses gets silently dropped.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/4 left-1/2 -z-10 aspect-square w-[130%] max-w-[64rem] -translate-x-1/2"
      >
        <div
          data-hero-slow
          className="size-full rounded-full opacity-[0.18] blur-[120px]"
          style={{ background: 'var(--color-accent-deep)' }}
        />
      </div>

      <div className="shell" data-hero>
        <RevealText as="p" className="eyebrow" trigger="load" delay={0.05}>
          {t.hero.eyebrow}
        </RevealText>

        {/*
          The headline reveals line by line, but it is one heading with one
          accessible name. Each line is its own RevealText because the second
          carries the green — and each opts out of ARIA entirely, so the h1's
          label is the single source of the name. Emitting the page's most
          SEO-weighted string twice to satisfy a linter would be a bad trade.
        */}
        <h1
          aria-label={`${t.hero.headlineLead} ${t.hero.headlineAccent}`}
          className="mt-8 text-[clamp(2.75rem,12vw,9rem)] font-semibold"
        >
          <RevealText
            as="span"
            aria="hidden"
            className="block"
            trigger="load"
            delay={0.14}
          >
            {t.hero.headlineLead}
          </RevealText>{' '}
          <RevealText
            as="span"
            aria="hidden"
            className="block text-accent"
            trigger="load"
            delay={0.26}
          >
            {t.hero.headlineAccent}
          </RevealText>
        </h1>

        <RevealText
          as="p"
          className="measure-wide mt-8 text-lg text-muted md:text-xl"
          trigger="load"
          delay={0.44}
        >
          {t.hero.sub}
        </RevealText>

        <div
          data-hero-cta
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        >
          <ButtonLink href={smsUrl(messageOpener(lang))}>
            {t.hero.ctaPrimary}
          </ButtonLink>
          <ButtonLink href="#work" variant="secondary">
            {t.hero.ctaSecondary}
          </ButtonLink>
        </div>
      </div>

      {/*
        The rule stretches and contracts on its own loop; scroll drives only the
        fade, which is complete by 5% of the page. A scroll prompt that outlives
        the first scroll is just clutter.

        Two responsibilities, two elements: CSS owns the rule's transform, GSAP
        owns the container's opacity. Neither touches the other's property.
      */}
      <div id="scroll-hint" className="shell mt-16 md:absolute md:bottom-8 md:mt-0">
        <p className="eyebrow flex items-center gap-3">
          {t.hero.scroll}
          <span aria-hidden="true" className="block h-px w-12">
            <span
              data-scroll-rule
              className="rule-breathe block h-px w-full bg-border"
            />
          </span>
        </p>
      </div>
    </section>
  )
}
