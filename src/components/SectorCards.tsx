import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SectionHeading from '@/components/ui/SectionHeading'
import ProtectedImage from '@/components/ui/ProtectedImage'
import { commercialSectors, sectorsIntro } from '@/data/features'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

/**
 * Commercial sectors, with a photograph each.
 *
 * The Commercial page has to carry credibility that prose alone cannot: a
 * facility manager wants to see a building like theirs. Each card is a real
 * job (the mining one excepted, see features.ts), and the imagery is
 * protected the same way the rest of the gallery is.
 *
 * Six cards, two even rows of three. The first used to be wide, which with
 * six cards left the last one stranded on a row of its own.
 */
export default function SectorCards() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      gsap.from('[data-sector-card]', {
        y: 48,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: scope.current, start: 'top 74%' },
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      id="sectors"
      className="relative border-t border-line/6 bg-ink py-section"
      aria-labelledby="sectors-cards-heading"
    >
      <SectionBackdrop variant="grid" tone="cool" />

      <div className="relative shell">
        <div className="max-w-3xl">
          <SectionHeading intro={sectorsIntro} headingId="sectors-cards-heading" />
        </div>

        <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {commercialSectors.map((sector) => (
            <li
              key={sector.id}
              id={sector.id}
              data-sector-card
              className="group relative overflow-hidden rounded-xl border border-line/10 bg-ink-800"
            >
              <div className="aspect-[4/3]">
                <ProtectedImage
                  src={sector.image}
                  alt={`${sector.title}. ${sector.text}`}
                  frameClassName="size-full"
                  className="transition-transform duration-[900ms] ease-expo group-hover:scale-105"
                  watermark
                />
              </div>

              {/* Scrim, so the copy stays readable over any frame. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 lg:p-7">
                <span className="inline-block rounded-pill bg-accent2 px-3 py-1.5 text-eyebrow font-bold uppercase tracking-[0.16em] text-paper-fg">
                  {sector.label}
                </span>
                <h3 className="mt-4 font-display text-h4 font-semibold leading-tight text-bone">
                  {sector.title}
                </h3>
                <p className="mt-2 max-w-measure text-small leading-relaxed text-bone-200/85">
                  {sector.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
