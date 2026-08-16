import { Star } from 'lucide-react'

interface StarsProps {
  count?: number
  className?: string
  /** Screen-reader text; the icons themselves are decorative. */
  label?: string
  size?: string
}

/** Five-star rating row. One accessible label, icons hidden from AT. */
export default function Stars({
  count = 5,
  className = '',
  label,
  size = 'size-4',
}: StarsProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={label ?? `${count} out of 5 stars`}>
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          // Drawn in one after another on entry. CSS rather than a GSAP
          // timeline because stars appear inside a looping carousel, where a
          // scroll-triggered tween would only ever fire for the first slide.
          style={{ animationDelay: `${i * 70}ms` }}
          className={`${size} animate-star-pop fill-accent text-accent`}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}
