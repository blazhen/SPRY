import { site } from '@/data/site'

/**
 * Served straight from `public/`, not imported through the bundler, so the
 * client can drop in a new file without a rebuild.
 */
const LOGO_SRC = `${import.meta.env.BASE_URL}logo/SS-Logo-White.webp`

/** Intrinsic size of the supplied asset. */
const NATURAL = { w: 289, h: 174 }

interface LogoProps {
  /**
   * Rendered height in pixels. Ignored when `className` sets a height, which
   * is how the header gets a smaller mark on small screens.
   */
  height?: number
  className?: string
  priority?: boolean
}

/**
 * The SprayIT mark.
 *
 * The supplied asset is a reversed (white) logo on transparency, so it only
 * works on dark ground. The `width`/`height` attributes always carry the true
 * aspect ratio so the browser reserves the right box before the image decodes
 * and the header never reflows; visual size is left to CSS so a caller can
 * scale it responsively.
 */
export default function Logo({ height = 44, className = '', priority = false }: LogoProps) {
  const width = Math.round((NATURAL.w / NATURAL.h) * height)

  return (
    <img
      src={LOGO_SRC}
      alt={`${site.name} logo`}
      width={width}
      height={height}
      className={`block w-auto object-contain ${className}`}
      style={className.includes('h-') ? undefined : { height }}
      // The header mark is above the fold on every page, so it should not
      // queue behind lazily loaded content.
      {...(priority ? { fetchpriority: 'high' } : { loading: 'lazy' as const })}
      decoding="async"
    />
  )
}
