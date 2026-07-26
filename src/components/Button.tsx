import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary'

/**
 * Tap targets are ≥44px tall in every variant.
 * Primary is accent-on-near-black: high contrast, impossible to miss.
 *
 * `btn` carries the hover choreography — lift, glow, shadow, and the one-pass
 * light sweep. It lives in `index.css` rather than in utilities here because the
 * lift has to use the independent `scale` property to avoid being clobbered by
 * the magnetic pull's `transform`; see the note above `.btn` there.
 */
const base =
  'btn inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full px-6 text-center text-[0.9375rem] font-medium'

const variants: Record<Variant, string> = {
  primary: 'btn-primary bg-accent text-bg hover:bg-accent/90',
  secondary:
    'btn-secondary border border-border bg-surface text-text hover:border-muted/50 hover:bg-accent-deep/30',
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  children,
  external,
  ...rest
}: ComponentProps<'a'> & { variant?: Variant; external?: boolean; children: ReactNode }) {
  return (
    <a
      className={`${base} ${variants[variant]} ${className}`}
      /* Primary CTAs lean toward the cursor. Secondary ones stay put — if
         everything is magnetic, nothing reads as the main action. */
      {...(variant === 'primary' ? { 'data-magnetic': '' } : {})}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </a>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ComponentProps<'button'> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`${base} ${variants[variant]} disabled:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
