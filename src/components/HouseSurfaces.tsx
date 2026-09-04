import { useState } from 'react'
import SectionHeading from '@/components/ui/SectionHeading'
import { houseSurfaces, surfacesIntro } from '@/data/features'
import type { HouseSurface } from '@/data/features'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

type SurfaceId = HouseSurface['id']

/**
 * Interactive house: pick a surface, see what it costs you.
 *
 * The Residential page was three paragraphs about roofs, walls and floors,
 * which is exactly the content that wants a picture. This draws a simple
 * cutaway and lets the visitor select a surface, in a diagram rather than a
 * carousel so nothing moves on its own.
 *
 * Accessibility: the selectors are real buttons in a group with
 * `aria-pressed`, so this works from the keyboard and reads correctly to a
 * screen reader. The SVG is decorative and hidden, because the buttons and the
 * detail panel already carry every word of the meaning. There is no animation
 * to suppress under reduced motion: the only movement is a colour change on
 * selection, which is the interaction itself.
 */
export default function HouseSurfaces() {
  const [active, setActive] = useState<SurfaceId>('roof')
  const surface = houseSurfaces.find((s) => s.id === active) ?? houseSurfaces[0]

  /**
   * Selected surfaces take the accent. Unselected ones stay clearly visible
   * rather than fading into the ground, because an invisible target does not
   * read as selectable.
   */
  const fill = (id: SurfaceId) =>
    id === active ? 'rgb(var(--c-accent) / 0.55)' : 'rgb(var(--c-bone) / 0.10)'
  const stroke = (id: SurfaceId) =>
    id === active ? 'rgb(var(--c-accent))' : 'rgb(var(--c-bone) / 0.30)'

  /**
   * The shapes are clickable as well as the buttons below. They carry no
   * semantics of their own: the SVG stays aria-hidden and the buttons remain
   * the accessible control, so this is a convenience layer, not a second
   * interface a screen reader has to navigate.
   */
  const pick = (id: SurfaceId) => ({
    onClick: () => setActive(id),
    style: { cursor: 'pointer' } as const,
  })

  return (
    <section
      id="surfaces"
      className="relative border-t border-line/6 bg-surface py-section"
      aria-labelledby="surfaces-heading"
    >
      <SectionBackdrop variant="strata" tone="warm" />

      <div className="relative shell">
        <div className="max-w-3xl">
          <SectionHeading intro={surfacesIntro} headingId="surfaces-heading" />
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-x-16">
          {/* ---------------- Diagram ---------------- */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-line/10 bg-ink p-6 sm:p-10">
              <svg viewBox="0 0 400 300" className="h-auto w-full" aria-hidden="true">
                {/* Ground */}
                <rect x="0" y="272" width="400" height="28" fill="rgb(var(--c-ink-800))" />

                {/* Roof, as a pitched band following the rafters */}
                <path
                  d="M200 34 L360 132 L360 152 L200 56 L40 152 L40 132 Z"
                  {...pick('roof')}
                  fill={fill('roof')}
                  stroke={stroke('roof')}
                  strokeWidth="2"
                  className="transition-all duration-500"
                />
                {/* Roof outline */}
                <path
                  d="M200 30 L368 132 L32 132 Z"
                  fill="none"
                  stroke="rgb(var(--c-ink-600))"
                  strokeWidth="2"
                />

                {/* Wall bands, left and right */}
                <rect
                  x="52"
                  y="132"
                  width="22"
                  height="130"
                  {...pick('walls')}
                  fill={fill('walls')}
                  stroke={stroke('walls')}
                  strokeWidth="2"
                  className="transition-all duration-500"
                />
                <rect
                  x="326"
                  y="132"
                  width="22"
                  height="130"
                  {...pick('walls')}
                  fill={fill('walls')}
                  stroke={stroke('walls')}
                  strokeWidth="2"
                  className="transition-all duration-500"
                />

                {/* Room void */}
                <rect
                  x="74"
                  y="132"
                  width="252"
                  height="130"
                  fill="rgb(var(--c-ink-800))"
                  stroke="rgb(var(--c-ink-600))"
                  strokeWidth="2"
                />

                {/* A window and a door, so it reads as a house */}
                <rect x="110" y="168" width="54" height="42" rx="2" fill="rgb(var(--c-ink-700))" stroke="rgb(var(--c-ink-600))" strokeWidth="2" />
                <rect x="236" y="168" width="54" height="42" rx="2" fill="rgb(var(--c-ink-700))" stroke="rgb(var(--c-ink-600))" strokeWidth="2" />
                <rect x="182" y="212" width="36" height="50" rx="2" fill="rgb(var(--c-ink-700))" stroke="rgb(var(--c-ink-600))" strokeWidth="2" />

                {/* Underfloor band, beneath the floor line and above the ground */}
                <rect
                  x="52"
                  y="262"
                  width="296"
                  height="14"
                  {...pick('underfloor')}
                  fill={fill('underfloor')}
                  stroke={stroke('underfloor')}
                  strokeWidth="2"
                  className="transition-all duration-500"
                />
                {/* Stumps */}
                {[86, 150, 250, 314].map((x) => (
                  <rect key={x} x={x} y="276" width="10" height="12" fill="rgb(var(--c-ink-700))" />
                ))}
              </svg>
            </div>
          </div>

          {/* ---------------- Selector + detail ---------------- */}
          <div className="lg:col-span-5">
            <div role="group" aria-label="Choose a surface" className="flex flex-wrap gap-2.5">
              {houseSurfaces.map((item) => {
                const on = item.id === active
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    aria-pressed={on}
                    className={`rounded-pill border px-4 py-2.5 text-small font-bold transition-colors duration-300 ${
                      on
                        ? 'border-accent bg-accent text-ink'
                        : 'border-line/15 text-bone-400 hover:border-line/35 hover:text-bone'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div
              className="mt-8 rounded-xl border border-line/10 bg-ink-800 p-7"
              aria-live="polite"
            >
              <p className="text-eyebrow font-bold uppercase tracking-[0.18em] text-accent">
                {surface.share} of the loss
              </p>
              <h3 className="mt-4 font-display text-h3 font-semibold leading-tight text-bone">
                {surface.headline}
              </h3>
              <p className="mt-5 text-body leading-relaxed text-bone-400">{surface.text}</p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
