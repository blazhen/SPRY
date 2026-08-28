import { useRef } from 'react'
import { Check } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SectionHeading from '@/components/ui/SectionHeading'
import { foamIntro, foamProperties, foamUseCases } from '@/data/features'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

/**
 * Open cell against closed cell.
 *
 * Paired bars rather than a table, because the point is the shape of the
 * trade-off: each foam wins some rows and loses others, and that pattern is
 * visible at a glance in a way a grid of words is not.
 *
 * Open cell takes the warm accent and closed cell the cool one, matching how
 * they are used: open cell mostly for keeping heat in, closed cell for cold
 * storage and moisture. The palette is doing explanatory work again.
 *
 * The bars are relative rankings, not measurements. See the note in
 * features.ts on why no absolute figures are published here.
 */
export default function FoamComparison() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) {
        // Finished state, not a faster animation.
        gsap.set('[data-bar]', { scaleX: 1 })
        return
      }
      gsap.from('[data-bar]', {
        scaleX: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: '[data-bars]', start: 'top 78%' },
      })
      gsap.from('[data-use-card]', {
        y: 40,
        opacity: 0,
        duration: 0.85,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '[data-use-cards]', start: 'top 82%' },
      })
    },
    { scope, dependencies: [reduced] },
  )

  const useCard = (kind: 'open' | 'closed') => {
    const data = foamUseCases[kind]
    const isOpen = kind === 'open'
    return (
      <div
        data-use-card
        className={`rounded-xl border p-7 lg:p-8 ${
          isOpen ? 'border-accent/25 bg-ink-800' : 'border-accent2/30 bg-ink-800'
        }`}
      >
        <span
          className={`inline-block rounded-pill px-3 py-1.5 text-eyebrow font-bold uppercase tracking-[0.14em] ${
            isOpen ? 'bg-accent/15 text-accent' : 'bg-accent2/15 text-accent2-ink'
          }`}
        >
          {data.tag}
        </span>
        <h3 className="mt-5 font-display text-h3 font-semibold leading-tight text-bone">
          {data.title}
        </h3>
        <ul className="mt-6 space-y-3">
          {data.points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-body text-bone-400">
              <Check
                className={`mt-1 size-4 shrink-0 ${isOpen ? 'text-accent' : 'text-accent2-ink'}`}
                strokeWidth={3}
                aria-hidden="true"
              />
              {point}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <section
      ref={scope}
      id="foam-types"
      className="relative border-t border-line/6 bg-surface py-section"
      aria-labelledby="foam-heading"
    >
      <SectionBackdrop variant="cells" tone="both" />

      <div className="relative shell">
        <div className="max-w-3xl">
          <SectionHeading intro={foamIntro} headingId="foam-heading" />
        </div>

        {/* Legend */}
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line/10 pt-8">
          <span className="flex items-center gap-2.5 text-small font-bold text-bone">
            <span className="h-2.5 w-6 rounded-pill bg-accent" aria-hidden="true" />
            Open cell
          </span>
          <span className="flex items-center gap-2.5 text-small font-bold text-bone">
            <span className="h-2.5 w-6 rounded-pill bg-accent2" aria-hidden="true" />
            Closed cell
          </span>
          <span className="text-small text-bone-400">
            Relative ranking against each other, not measured values.
          </span>
        </div>

        {/* Paired bars */}
        <dl data-bars className="mt-10 space-y-8 sm:space-y-9">
          {foamProperties.map((property) => (
            <div
              key={property.label}
              className="grid gap-4 border-b border-line/8 pb-9 last:border-0 sm:gap-5 lg:grid-cols-12 lg:items-center lg:gap-8"
            >
              <dt className="text-body font-bold text-bone lg:col-span-3">{property.label}</dt>

              <dd className="space-y-3 lg:col-span-9">
                {(['open', 'closed'] as const).map((kind) => {
                  const value = kind === 'open' ? property.open : property.closed
                  const note = kind === 'open' ? property.openNote : property.closedNote
                  return (
                    <div
                      key={kind}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
                    >
                      {/* The legend has scrolled away long before a phone
                          reaches the lower rows, so each bar names itself. */}
                      <span
                        className={`text-eyebrow font-bold uppercase tracking-[0.14em] sm:hidden ${
                          kind === 'open' ? 'text-accent' : 'text-accent2-ink'
                        }`}
                      >
                        {kind === 'open' ? 'Open cell' : 'Closed cell'}
                      </span>

                      {/*
                        On a row the track and the note each take a zero flex
                        basis. Sizing the track with `w-full` instead made its
                        basis the entire row, which left the note nothing: it
                        resolved to zero pixels wide and its text spilled past
                        the viewport, pushing the document 59px wider than the
                        screen on every phone. Below `sm` they stack, so the
                        track gets the full width and the note sits under it.
                      */}
                      <div className="h-2.5 w-full overflow-hidden rounded-pill bg-line/8 sm:w-auto sm:max-w-md sm:flex-1">
                        <span
                          data-bar
                          style={{ width: `${value}%` }}
                          className={`block h-full origin-left rounded-pill ${
                            kind === 'open' ? 'bg-accent' : 'bg-accent2'
                          }`}
                        />
                      </div>
                      <span className="text-small leading-snug text-bone-400 sm:min-w-0 sm:flex-1">
                        {note}
                      </span>
                    </div>
                  )
                })}
              </dd>
            </div>
          ))}
        </dl>

        <div data-use-cards className="mt-14 grid gap-7 lg:grid-cols-2">
          {useCard('open')}
          {useCard('closed')}
        </div>
      </div>
    </section>
  )
}
