import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useLang } from '../lib/i18n'
import { prefersReducedMotion } from '../lib/smoothScroll'

gsap.registerPlugin(ScrollTrigger, SplitText)

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'

type Props = {
  children: string
  /**
   * Element to render. Effectively block-level only — masked line wrappers are
   * `display: block`, so a `span` must be given `class="block"` and used as its
   * own line, never inline inside a sentence.
   */
  as?: Tag
  /**
   * `auto` (default) makes this element self-sufficient for screen readers.
   *
   * `hidden` hands that responsibility to the parent: the animated copy is
   * marked `aria-hidden` and no visually-hidden duplicate is emitted. Use it
   * when several RevealTexts make up one accessible element and the parent
   * carries the name — the hero `<h1>`, where duplicating the headline for the
   * single most SEO-weighted string on the page is not worth it.
   */
  aria?: 'auto' | 'hidden'
  className?: string
  /** `lines` masks and lifts each line. `body` is a single opacity + rise. */
  variant?: 'lines' | 'body'
  /**
   * `scroll` scrubs the reveal to scroll position — scroll up and it plays
   * backwards. `load` plays once on mount, for content already above the fold.
   */
  trigger?: 'scroll' | 'load'
  delay?: number
  start?: string
  end?: string
}

/**
 * The one text-reveal primitive for the whole site.
 *
 * Lines, never characters: per-character stagger is the most over-used effect on
 * the web and it actively hurts legibility — someone skimming on a phone should
 * not have to wait for a word to assemble itself.
 *
 * ACCESSIBILITY
 * SplitText replaces the text with a stack of `aria-hidden` line wrappers and
 * puts an `aria-label` on the container to compensate. That label is *prohibited*
 * ARIA on a generic element: `<h2>` carries an implicit `heading` role which
 * permits it, but a bare `<p>` or `<div>` does not, and axe flags it.
 *
 * Removing the label is not an option either — the lines are `aria-hidden`, so
 * the text would vanish from screen readers completely.
 *
 * The handling is therefore tag-aware:
 *
 * · Headings are split directly, keeping SplitText's own `aria-label`. A heading
 *   role permits it, and nothing is duplicated — which matters, because headings
 *   are the most SEO-weighted text on the page and emitting every one of them
 *   twice is a real cost.
 * · Generic tags wrap instead: a visually-hidden sibling carries the real text,
 *   the animated copy is explicitly `aria-hidden`, and any label SplitText adds
 *   is stripped. Text appears twice in the DOM for these, which is the accepted
 *   price for valid ARIA on a handful of elements.
 * · `aria="hidden"` opts out of both, for the case where a parent element owns
 *   the accessible name and this is one of several lines inside it.
 */
export function RevealText({
  children,
  as = 'p',
  aria = 'auto',
  className = '',
  variant = 'lines',
  trigger = 'scroll',
  delay = 0,
  start = 'top 88%',
  end = 'top 55%',
}: Props) {
  /*
   * A callback ref rather than four typed ones. `as` is a union of tag names, so
   * a `RefObject<HTMLSpanElement>` handed to a `<div>` branch is a type error;
   * the callback narrows to HTMLElement, which is all the split needs.
   */
  const target = useRef<HTMLElement | null>(null)
  const setTarget = (node: HTMLElement | null) => {
    target.current = node
  }
  const { lang } = useLang()

  const isHeading = as === 'h1' || as === 'h2' || as === 'h3'

  useLayoutEffect(() => {
    const el = target.current
    if (!el) return

    // Reduced motion: no split, no tween, no wrappers. The text is already in
    // its final state.
    if (prefersReducedMotion()) return

    const scrollTrigger =
      trigger === 'scroll'
        ? { trigger: el, start, end, scrub: 1 as const }
        : undefined

    if (variant === 'body') {
      const tween = gsap.from(el, {
        opacity: 0,
        y: 20,
        duration: 0.9,
        ease: 'power3.out',
        delay,
        scrollTrigger,
      })
      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    }

    /*
     * autoSplit re-splits on resize and after webfonts load — both change where
     * lines break. The animation is returned from onSplit so GSAP tears it down
     * before each re-split rather than stacking duplicates.
     */
    const split = SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      linesClass: 'reveal-line',
      onSplit: (self) => {
        // On a generic tag the animated copy must never contribute an accessible
        // name — the sr-only sibling (or the parent) owns that. Headings keep
        // SplitText's own label, which their role permits.
        if (!isHeading || aria === 'hidden') el.removeAttribute('aria-label')
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.08,
          delay,
          scrollTrigger,
        })
      },
    })

    return () => {
      split.revert()
    }
    // `lang` matters because Spanish breaks into different lines than English,
    // so the split has to be rebuilt, not merely re-measured.
  }, [children, lang, variant, trigger, delay, start, end, isHeading, aria])

  const Tag = as

  /*
   * key={children} hands us a clean element when the copy changes, rather than
   * making React reconcile its output against SplitText's injected DOM.
   */
  if (aria === 'hidden') {
    return (
      <Tag key={children} ref={setTarget} className={className} aria-hidden="true">
        {children}
      </Tag>
    )
  }

  if (isHeading) {
    return (
      <Tag key={children} ref={setTarget} className={className}>
        {children}
      </Tag>
    )
  }

  return (
    <Tag className={className}>
      <span className="sr-only">{children}</span>
      <span key={children} ref={setTarget} aria-hidden="true">
        {children}
      </span>
    </Tag>
  )
}
