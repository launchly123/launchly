import { useLang } from '../lib/i18n'
import { SectionHeader } from './SectionHeader'

export function Problem({ index }: { index: number }) {
  const { t } = useLang()

  return (
    <section
      id="problem"
      className="section"
      data-nav-label={t.problem.label}
      data-handoff
    >
      <div className="shell">
        <SectionHeader
          index={index}
          label={t.problem.label}
          heading={t.problem.heading}
        />

        {/*
          Three across only from 1024px up. At iPad-portrait width three
          columns leave ~230px each, which shreds the longer Spanish lines into
          five ragged rows — so tablets get full-width rows instead.
        */}
        <ol
          data-reveal-group
          className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-3"
        >
          {t.problem.beats.map((beat, i) => (
            <li key={i} className="bg-bg p-8 md:p-10">
              <span className="eyebrow">{String(i + 1).padStart(2, '0')}</span>
              <p className="measure mt-6 text-xl md:text-2xl">{beat}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
