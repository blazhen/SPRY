import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Droplet, ShieldCheck, Snowflake, Sun, type LucideIcon } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { HeroObjectKind, Season } from '@/three/HeroObject'

const HeroObject = lazy(() => import('@/three/HeroObject'))

/** How long each season holds before the scene changes over. */
const SEASON_MS = 7000

interface Caption {
  text: string
  note: string
  Icon: LucideIcon
}

const SEASON_CAPTION: Record<Season, Caption> = {
  summer: { text: 'Summer', note: 'Keeping the heat out', Icon: Sun },
  winter: { text: 'Winter', note: 'Keeping the heat in', Icon: Snowflake },
}

/**
 * What the cycling flag actually means, per object.
 *
 * The two buildings are showing a season. The foam sample has no seasons: it is
 * showing which of the two foams you are looking at. Same timer, same
 * transition, different argument, so the caption is keyed by kind rather than
 * assumed to be weather.
 */
const CAPTION: Record<HeroObjectKind, Record<Season, Caption>> = {
  house: SEASON_CAPTION,
  warehouse: SEASON_CAPTION,
  foam: {
    summer: { text: 'Open cell', note: 'Soft, expands to fill', Icon: Droplet },
    winter: { text: 'Closed cell', note: 'Dense, rigid, seals out water', Icon: ShieldCheck },
  },
}

/**
 * Lazy wrapper around the hero 3D scene.
 *
 * It defers the import until the element is near the viewport, so a visitor who
 * never scrolls this far never downloads the Three chunk, and it renders
 * nothing at all until then, so there is no idle WebGL context on the page.
 *
 * It no longer reads the site palette. The building is made of real materials
 * now, which do not change with the colour scheme, and dropping that removed a
 * whole category of failure: the model previously took its colours from CSS
 * custom properties and rendered in the wrong theme's palette whenever the
 * stylesheet resolved after the first commit.
 *
 * The season is the one thing that animates on a timer. It carries the actual
 * argument, so unlike the model itself it gets a visible, readable caption
 * rather than being purely decorative.
 */
export default function HeroObject3D({
  kind,
  className = '',
}: {
  kind: HeroObjectKind
  className?: string
}) {
  const holder = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [season, setSeason] = useState<Season>('summer')
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = holder.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Cycle the season, but only while the scene is actually on the page. Under
  // reduced motion it holds at summer rather than changing on its own.
  useEffect(() => {
    if (!inView || reduced) return
    const id = window.setInterval(
      () => setSeason((s) => (s === 'summer' ? 'winter' : 'summer')),
      SEASON_MS,
    )
    return () => window.clearInterval(id)
  }, [inView, reduced])

  const { Icon, ...label } = CAPTION[kind][season]

  return (
    <div ref={holder} className={`flex flex-col ${className}`}>
      {/* The canvas is decoration; the caption below carries the meaning. It
          sits under the scene rather than over it, because overlaying text on
          a lit 3D ground plane is unreadable in half the frames. */}
      <div aria-hidden="true" className="pointer-events-none min-h-0 flex-1 select-none">
        {inView && (
          <Suspense fallback={null}>
            <HeroObject kind={kind} season={season} reducedMotion={reduced} />
          </Suspense>
        )}
      </div>

      <p
        className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-small font-bold text-bone"
        aria-live="polite"
      >
        <Icon
          className={`size-4 transition-colors duration-700 ${
            season === 'winter' ? 'text-accent2-ink' : 'text-accent'
          }`}
          aria-hidden="true"
        />
        {label.text}
        <span className="font-medium text-bone-400">· {label.note}</span>
      </p>
    </div>
  )
}
