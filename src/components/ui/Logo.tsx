import { site } from '@/data/site'

/**
 * Served straight from `public/`, not imported through the bundler, so the
 * client can drop in a new file without a rebuild.
 */
const BASE = import.meta.env.BASE_URL
const COLOUR_SRC = `${BASE}logo/SS-Logo-Colour.webp`
const WHITE_SRC = `${BASE}logo/SS-Logo-White.png`

/**
 * Intrinsic size of the full-colour asset, which is the primary mark. The
 * reversed file is 289x174, a ratio 0.8% wider; `object-contain` absorbs the
 * difference rather than either mark being stretched to match the other.
 */
const NATURAL = { w: 211, h: 128 }

interface LogoProps {
  /**
   * Rendered height in pixels. Ignored when `className` sets a height, which
   * is how the header gets a smaller mark on small screens.
   */
  height?: number
  /**
   * `auto` picks the full-colour lockup on the light palette and the reversed
   * one on the dark palettes. `white` forces the reversed mark, for anything
   * that is dark whatever the palette is doing.
   */
  tone?: 'auto' | 'white'
  className?: string
}

/**
 * The SprayIT mark.
 *
 * WHY THIS IS NOT A MASK ANY MORE.
 *
 * The earlier version had only the reversed (white) file, which is invisible on
 * a light ground, so it used that file as an alpha mask and filled it with
 * `currentColor`. That worked in the sense that something appeared on every
 * palette, and it was wrong in a way that took a client complaint to see: the
 * mark is a two-colour lockup. The chevron is a navy outline with a green line
 * inside it, SPRAY is green and IT is navy. Flattening it to a single colour
 * merges the two parallel chevron lines into one thick stroke and loses the
 * green entirely, which reads as a heavier, squatter logo than the real one.
 *
 * Glenn described it as squashed. The proportions were in fact exact, and the
 * real fault was the flattening. Both official files are used directly now.
 *
 * The site ships one palette, so the full-colour mark is the default. The
 * reversed file is still used where the ground is dark whatever the page is
 * doing, which callers ask for with `tone="white"`.
 */
export default function Logo({ height = 44, tone = 'auto', className = '' }: LogoProps) {
  /*
    Width is never set explicitly. It used to be computed from the `height`
    prop, which quietly stretched the mark the moment a caller set a different
    height with a class: the class won for height, the prop still owned width,
    and the header logo rendered at 138x72 instead of 138x84. Aspect ratio plus
    an auto width means whatever sets the height wins, and the proportions
    follow it.
  */
  const box = {
    width: 'auto' as const,
    ...(className.includes('h-') ? {} : { height }),
    aspectRatio: `${NATURAL.w} / ${NATURAL.h}`,
  }

  if (tone === 'white') {
    return (
      <img
        src={WHITE_SRC}
        alt={`${site.name} logo`}
        width={NATURAL.w}
        height={NATURAL.h}
        style={box}
        className={`block w-auto shrink-0 object-contain ${className}`}
      />
    )
  }

  return (
    <img
      src={COLOUR_SRC}
      alt={`${site.name} logo`}
      width={NATURAL.w}
      height={NATURAL.h}
      style={box}
      className={`block w-auto shrink-0 object-contain object-left ${className}`}
    />
  )
}
