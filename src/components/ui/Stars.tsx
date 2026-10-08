import { Star } from 'lucide-react'

interface StarsProps {
  count?: number
  className?: string
  /** Screen-reader text; the icons themselves are decorative. */
  label?: string
  size?: string
  /**
   * 'google' draws them in Google's rating gold, so a rating that comes from
   * the Google listing reads as one rather than as part of a navy button. The
   * darker outline keeps the stars at 3:1 against white.
   */
  tone?: 'brand' | 'google'
}

/** Five-star rating row. One accessible label, icons hidden from AT. */
export default function Stars({
  count = 5,
  className = '',
  label,
  size = 'size-4',
  tone = 'brand',
}: StarsProps) {
  const colour = tone === 'google' ? 'fill-[#FBBC04] text-[#B98300]' : 'fill-accent text-accent'
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={label ?? `${count} out of 5 stars`}>
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          // Drawn in one after another on entry. CSS rather than a GSAP
          // timeline because stars appear inside a looping carousel, where a
          // scroll-triggered tween would only ever fire for the first slide.
          style={{ animationDelay: `${i * 70}ms` }}
          className={`${size} animate-star-pop ${colour}`}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}
