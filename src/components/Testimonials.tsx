import { testimonials } from '../content/content'
import { useLang } from '../lib/i18n'
import { SectionHeader } from './SectionHeader'

/**
 * Renders nothing while `testimonials` is empty — no gap, no placeholder, no
 * invented quotes. Handles 1–5: one quote gets the full editorial treatment,
 * more than one drops into a grid.
 */
export function Testimonials({ index }: { index: number }) {
  const { t, pick } = useLang()

  if (testimonials.length === 0) return null

  const single = testimonials.length === 1

  return (
    <section
      id="testimonials"
      className="section"
      data-nav-label={t.testimonials.label}
      data-handoff
    >
      <div className="shell">
        <SectionHeader
          index={index}
          label={t.testimonials.label}
          heading={t.testimonials.heading}
        />

        <ul
          data-reveal-group
          className={`mt-16 grid gap-6 ${
            single ? '' : 'md:grid-cols-2 xl:grid-cols-3'
          }`}
        >
          {testimonials.map((item) => (
            <li key={item.id}>
              <figure
                className={
                  single
                    ? ''
                    : 'flex h-full flex-col rounded-2xl border border-border bg-surface p-8'
                }
              >
                <blockquote
                  className={
                    single
                      ? 'measure-wide text-[clamp(1.5rem,4vw,2.75rem)] font-medium leading-[1.2]'
                      : 'text-lg'
                  }
                >
                  <p>“{pick(item.quote)}”</p>
                </blockquote>

                <figcaption
                  className={`eyebrow ${single ? 'mt-10' : 'mt-auto pt-8'}`}
                >
                  <span className="text-text">{item.author}</span>
                  <span aria-hidden="true"> · </span>
                  {pick(item.role)}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
