import { config, projects, showcase, type Project } from '../content/content'
import { useFitScale } from '../hooks/useFitScale'
import { useInView } from '../hooks/useInView'
import { useLang } from '../lib/i18n'
import { priceLabel, messageOpener, smsUrl } from '../lib/links'
import { ButtonLink } from './Button'
import { SectionHeader } from './SectionHeader'
import { Showcase } from './Showcase'

/** The width we render embedded sites at, so they show their desktop layout. */
const DESIGN_WIDTH = 1440
const DESIGN_HEIGHT = 900

function TierBadge({ tier }: { tier: Project['tier'] }) {
  const name = tier === 'orbit' ? 'Orbit' : 'Liftoff'
  const price = priceLabel(config.pricing[tier])

  return (
    <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-text">
      {name}
      <span aria-hidden="true" className="text-muted">
        —
      </span>
      <span className="text-accent">{price}</span>
    </span>
  )
}

/**
 * A browser chrome wrapper holding the real live site.
 *
 * The iframe is deliberately `pointer-events-none`: a scrollable iframe in the
 * middle of a scroll-driven page hijacks the wheel and traps touch. The whole
 * frame is a link out to the real thing instead.
 */
function LiveFrame({ url, label }: { url: string; label: string }) {
  const { ref: viewRef, inView } = useInView<HTMLDivElement>('400px')
  const { ref, scale } = useFitScale(DESIGN_WIDTH)

  return (
    <div
      ref={viewRef}
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="ml-2 truncate font-mono text-[0.6875rem] text-muted">
          {url.replace(/^https?:\/\//, '')}
        </span>
        <span className="eyebrow ml-auto hidden items-center gap-1.5 text-accent sm:inline-flex">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {label}
        </span>
      </div>

      {/* scaled viewport */}
      <div
        ref={ref}
        className="relative w-full overflow-hidden"
        style={{ height: scale ? DESIGN_HEIGHT * scale : undefined, aspectRatio: scale ? undefined : '16 / 10' }}
      >
        {inView && scale > 0 && (
          <iframe
            src={url}
            title={label}
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
            scrolling="no"
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
            style={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `scale(${scale})`,
            }}
          />
        )}
      </div>
    </div>
  )
}

function LiveProject({ project }: { project: Project }) {
  const { t, pick } = useLang()

  return (
    <article data-reveal className="border-t border-border pt-10 md:pt-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <TierBadge tier={project.tier} />

          <h3 className="mt-6 text-[clamp(1.75rem,3.5vw,3rem)] font-semibold">
            {project.name}
          </h3>

          <p className="eyebrow mt-4">
            {pick(project.city)} <span aria-hidden="true">·</span>{' '}
            {pick(project.category)}
          </p>

          <p className="measure mt-6 text-lg text-muted">
            {pick(project.result)}
          </p>

          {project.url && (
            <ButtonLink
              href={project.url}
              variant="secondary"
              external
              className="mt-8"
            >
              {t.work.visitLive}
              <span aria-hidden="true">↗</span>
              <span className="sr-only">({t.a11y.externalLink})</span>
            </ButtonLink>
          )}
        </div>

        {project.url &&
          (project.embed ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl"
              aria-label={`${project.name} — ${t.work.visitLive}`}
            >
              {/*
                No `will-change` class here: the frame's parallax trigger adds
                and removes it as it comes in range. A permanent one would
                promote a full live-site iframe to its own compositor layer for
                the whole session.
              */}
              <div data-frame>
                <LiveFrame url={project.url} label={t.work.frameHint} />
              </div>
            </a>
          ) : (
            /* Not embeddable (or not verified) — a plain link card instead. */
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="grid min-h-64 place-items-center rounded-xl border border-border bg-surface p-8 text-center"
            >
              <span className="eyebrow">{t.work.visitLive} ↗</span>
            </a>
          ))}
      </div>
    </article>
  )
}

function OpenSlot() {
  const { lang, t } = useLang()

  return (
    <article data-reveal className="border-t border-border pt-10 md:pt-14">
      <div className="grid place-items-center rounded-xl border border-dashed border-border px-6 py-16 text-center md:py-24">
        <h3 className="text-2xl font-semibold text-muted md:text-3xl">
          {t.work.placeholderTitle}
        </h3>
        <p className="mt-3 text-muted">{t.work.placeholderBody}</p>
        <ButtonLink
          href={smsUrl(messageOpener(lang))}
          variant="secondary"
          className="mt-8"
        >
          {t.work.placeholderCta}
        </ButtonLink>
      </div>
    </article>
  )
}

export function Work({ index }: { index: number }) {
  const { t } = useLang()

  // No data-handoff — the project column sticks, and an ancestor transform
  // would break it. This section gets its own choreography in §2.
  return (
    <section id="work" className="section" data-nav-label={t.work.label}>
      <div className="shell">
        <SectionHeader
          index={index}
          label={t.work.label}
          heading={t.work.heading}
        />

        <div className="mt-16 flex flex-col gap-16 md:mt-24 md:gap-24">
          {projects.map((project) => {
            if (project.status !== 'live') {
              return <OpenSlot key={project.id} />
            }
            /*
             * The showcase project gets the pinned scroll sequence; any other
             * live project falls back to the framed card.
             */
            return project.id === showcase.projectId ? (
              <Showcase key={project.id} project={project} />
            ) : (
              <LiveProject key={project.id} project={project} />
            )
          })}
        </div>
      </div>
    </section>
  )
}
