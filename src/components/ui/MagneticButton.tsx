import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMagnetic } from '@/hooks/useMagnetic'

/**
 * Variant → literal class string.
 *
 * Deliberately not built as `btn-${variant}`. Tailwind scans source files for
 * complete class names, and everything in `@layer components` is subject to the
 * same purge as a utility. An interpolated name is never seen, so the rule is
 * dropped from the build and the button renders unstyled.
 */
const VARIANT_CLASS = {
  primary: 'btn btn-primary',
  ghost: 'btn btn-ghost',
  ink: 'btn btn-ink',
  'outline-ink': 'btn btn-outline-ink',
} as const

interface MagneticButtonProps {
  href: string
  children: ReactNode
  /** Visual treatment. */
  variant?: keyof typeof VARIANT_CLASS
  className?: string
  strength?: number
  /** Accessible label when the visible text is not descriptive enough. */
  ariaLabel?: string
  onClick?: () => void
}

/**
 * Primary call-to-action with a magnetic hover.
 *
 * Renders a react-router <Link> for internal paths and a plain <a> for tel:,
 * mailto: and external URLs, so client-side routing is never used on a
 * protocol it cannot handle.
 */
export default function MagneticButton({
  href,
  children,
  variant = 'primary',
  className = '',
  strength = 0.3,
  ariaLabel,
  onClick,
}: MagneticButtonProps) {
  const ref = useMagnetic<HTMLAnchorElement>({ strength })

  const classes = `${VARIANT_CLASS[variant]} ${className}`
  const isInternal = href.startsWith('/')
  // The inner span lags behind the shell, which is what sells the effect.
  // It must be a flex row: icons are `display: block` globally, so inside a
  // plain inline span they would break onto their own line.
  const content = (
    <span data-magnetic-label className="inline-flex items-center gap-2">
      {children}
    </span>
  )

  if (isInternal) {
    return (
      <Link ref={ref} to={href} className={classes} aria-label={ariaLabel} onClick={onClick}>
        {content}
      </Link>
    )
  }

  const isExternal = href.startsWith('http')

  return (
    <a
      ref={ref}
      href={href}
      className={classes}
      aria-label={ariaLabel}
      onClick={onClick}
      {...(isExternal ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {content}
    </a>
  )
}
