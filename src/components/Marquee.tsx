import { useRef, type ReactNode } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { marqueeItems } from '@/data/site'

interface MarqueeProps {
  items?: string[]
  /** Seconds for one full loop at rest. Lower = faster. */
  duration?: number
  className?: string
  itemClassName?: string
  /** What sits between items. Defaults to an accent dot. */
  separator?: ReactNode
  ariaLabel?: string
  /** Wrap each item, e.g. to give logos their own hover treatment. */
  renderItem?: (item: string) => ReactNode
}

/**
 * Velocity-reactive marquee.
 *
 * Loops continuously at rest. While the user scrolls it speeds up in
 * proportion to scroll velocity and reverses to follow scroll direction, then
 * eases back to its resting speed. The boost decays on the GSAP ticker rather
 * than in the ScrollTrigger callback, because ScrollTrigger stops firing the
 * moment scrolling stops, and decaying there would freeze it mid-sprint.
 *
 * The strip is duplicated once and translated -50%, which makes the wrap point
 * invisible regardless of content width.
 */
export default function Marquee({
  items = marqueeItems,
  duration = 26,
  className = '',
  itemClassName = '',
  separator,
  ariaLabel = 'Key benefits of spray foam insulation',
  renderItem,
}: MarqueeProps) {
  const scope = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const track = trackRef.current
      if (!track || reduced) return

      const loop = gsap.to(track, {
        xPercent: -50,
        duration,
        ease: 'none',
        repeat: -1,
      })

      let direction = 1
      let boost = 0
      let current = 1

      const tick = () => {
        // Bleed off the velocity boost every frame so the strip settles.
        boost *= 0.93
        const target = direction * (1 + boost)
        current += (target - current) * 0.12
        loop.timeScale(current)
      }

      gsap.ticker.add(tick)

      const trigger = ScrollTrigger.create({
        trigger: scope.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          direction = self.direction
          boost = Math.min(6, Math.abs(self.getVelocity()) / 380)
        },
      })

      return () => {
        gsap.ticker.remove(tick)
        trigger.kill()
        loop.kill()
      }
    },
    { scope, dependencies: [reduced, duration] },
  )

  const dot = separator ?? (
    <span className="mx-[0.5em] inline-block size-[0.18em] shrink-0 rounded-full bg-accent align-middle" />
  )

  // Two identical groups: the tween moves the track by exactly one group width.
  const group = (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {items.map((item) => (
        <span key={item} className="flex shrink-0 items-center whitespace-nowrap">
          {renderItem ? renderItem(item) : item}
          {dot}
        </span>
      ))}
    </div>
  )

  return (
    <div ref={scope} className={`relative overflow-hidden ${className}`}>
      {/* Screen readers get the list once, statically. The visual strip is
          duplicated and aria-hidden, and is not a live region. */}
      <p className="sr-only">
        {ariaLabel}: {items.join(', ')}.
      </p>

      <div ref={trackRef} className={`flex w-max will-change-transform ${itemClassName}`}>
        {group}
        {group}
      </div>
    </div>
  )
}
