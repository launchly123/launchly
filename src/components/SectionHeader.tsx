import { RevealText } from './RevealText'

/**
 * The tiny mono label plus the editorial heading.
 * The number is derived from section order, so labels in content.ts never go
 * stale when a section is added, removed, or reordered.
 */
export function SectionHeader({
  index,
  label,
  heading,
  className = '',
}: {
  index: number
  label: string
  heading: string
  className?: string
}) {
  // Deliberately NOT a data-reveal-group. The h2 owns its own line reveal via
  // RevealText; grouping the header would fade the same element a second time,
  // so it would both rise line-by-line and cross-fade as a block.
  return (
    <header className={className}>
      {/*
        Separators are aria-hidden (a screen reader shouldn't announce "slash")
        and set in --color-muted, not --color-border. Border colour on the page
        background is 1.18:1 — invisible rather than subtle.
      */}
      <p className="eyebrow" data-reveal>
        {String(index).padStart(2, '0')}{' '}
        <span aria-hidden="true">/</span> {label}
      </p>
      <RevealText
        as="h2"
        className="mt-5 max-w-[22ch] text-[clamp(2rem,5vw,3.75rem)] font-semibold"
      >
        {heading}
      </RevealText>
    </header>
  )
}
