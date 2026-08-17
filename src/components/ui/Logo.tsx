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
}

/**
 * The SprayIT mark.
 *
 * The only supplied asset is a reversed (white) logo on transparency, which is
 * invisible the moment the ground behind it is light. Rather than ship a mark
 * that disappears on the brand palette, the file is used as an alpha mask and
 * filled with `currentColor`, so the same asset paints white on the dark theme
 * and navy on the light one. Colour therefore comes from a text class on the
 * caller, e.g. `text-bone`.
 *
 * `width`/`height` always carry the true aspect ratio so the header reserves
 * the right box up front and never reflows.
 *
 * If the client supplies the full-colour lockup (green SPRAY, navy IT), drop
 * this back to a plain <img> and delete the mask.
 */
export default function Logo({ height = 44, className = '' }: LogoProps) {
  const width = Math.round((NATURAL.w / NATURAL.h) * height)
  const mask = `url("${LOGO_SRC}") center / contain no-repeat`

  return (
    <span
      role="img"
      aria-label={`${site.name} logo`}
      style={{
        width,
        ...(className.includes('h-') ? {} : { height }),
        aspectRatio: `${NATURAL.w} / ${NATURAL.h}`,
        WebkitMask: mask,
        mask,
        backgroundColor: 'currentColor',
      }}
      className={`block w-auto shrink-0 ${className}`}
    />
  )
}
