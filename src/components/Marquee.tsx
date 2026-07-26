import { useLang } from '../lib/i18n'

/**
 * How many copies of the phrase make up one half of the track.
 *
 * The track holds this many twice over, and the loop travels exactly -50% — one
 * full half — so the second half is sitting where the first began and the seam
 * never appears. Six is enough that the half is wider than a 1440px viewport
 * even for the shorter English phrase; the overflow is clipped either way.
 */
const COPIES = 6

/**
 * The band between Work and Pricing.
 *
 * Direction and speed come from scroll velocity (see `useScrollReveals`):
 * scrolling down drives it right, scrolling up reverses it, and left alone it
 * keeps a slow drift. Big, muted, and deliberately low contrast — it is texture,
 * not something to read.
 *
 * `aria-hidden` on the whole band: these are the same words as the page's <h1>,
 * and a screen reader announcing them twelve times is actively hostile.
 *
 * CONTRAST
 * `aria-hidden` does *not* buy an exemption from contrast, and it should not — a
 * low-vision sighted visitor still sees this text, and axe flags it correctly.
 * §6 asks for "very low contrast", which at `text-muted/30` measured 1.5:1 and
 * cost 4 accessibility points.
 *
 * It sits at `/70` instead: ~3.3:1, just clear of the 3:1 floor that applies to
 * large text. At this size that still reads as a texture band rather than as
 * something to read, which is the intent — but it is the floor, not below it.
 * AA contrast was a non-negotiable, and "it's decorative" is an argument a
 * visitor with low vision cannot hear.
 */
export function Marquee() {
  const { t } = useLang()

  const half = (
    <span className="flex shrink-0 items-center">
      {Array.from({ length: COPIES }, (_, i) => (
        <span key={i} className="shrink-0 whitespace-nowrap pr-[0.35em]">
          {t.marquee}
          <span className="px-[0.35em] text-accent/40">·</span>
        </span>
      ))}
    </span>
  )

  return (
    <div
      aria-hidden="true"
      className="relative isolate overflow-hidden border-y border-border py-6 select-none md:py-10"
    >
      <div
        data-marquee
        className="flex w-max items-center text-[clamp(2.25rem,8vw,6rem)] font-semibold leading-none tracking-tight text-muted/70"
      >
        {half}
        {half}
      </div>
    </div>
  )
}
