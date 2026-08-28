import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import ProtectedImage from '@/components/ui/ProtectedImage'
import { SECTOR_INTERVAL, sectorCopy, sectorSlides } from '@/data/sectors'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

/**
 * Residential and commercial showcase, on a timer.
 *
 * The brief: commercial credibility has to be obvious almost immediately,
 * because Glenn quotes jobs to $1.5M and 26,000 sqm and none of that is visible
 * today. So this sits directly under the hero, alternates residential and
 * commercial without being touched, and swaps the headline and the stats along
 * with the picture.
 *
 * Autoplay rules, because an auto-advancing band is easy to get wrong:
 *  - it runs on its own and does NOT stop on hover: the section is wide, so a
 *    hover target that size stopped it whenever the cursor was anywhere near,
 *    which read as broken rather than considerate
 *  - it pauses while keyboard focus is inside, so nobody loses a slide they
 *    were tabbing through
 *  - there is a visible pause control, and it is sticky: hover or focus can
 *    never clear a pause the visitor asked for
 *  - under prefers-reduced-motion it does not advance at all and the controls
 *    become the only way through, which is the finished state rather than a
 *    faster animation
 *  - the live region announces the change for screen readers
 *
 * Imagery is placeholder. See the note in `src/data/sectors.ts`.
 */
export default function SectorTransition() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  /**
   * Two separate reasons to stop, deliberately not one flag.
   *
   * `userPaused` is the button and is sticky: once someone asks it to stop it
   * stays stopped. `focusWithin` is transient, for a keyboard user reading a
   * slide. Sharing a single `paused` state meant the transient one could clear
   * the explicit one, so pressing pause and then moving away quietly resumed.
   */
  const [userPaused, setUserPaused] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const timer = useRef<number | null>(null)

  const slide = sectorSlides[index]
  const isCommercial = slide.sector === 'commercial'
  const stats = isCommercial ? sectorCopy.commercialStats : sectorCopy.residentialStats

  const go = useCallback((next: number) => {
    setIndex(((next % sectorSlides.length) + sectorSlides.length) % sectorSlides.length)
  }, [])

  const paused = userPaused || focusWithin

  useEffect(() => {
    if (reduced || paused) return
    timer.current = window.setTimeout(
      () => setIndex((i) => (i + 1) % sectorSlides.length),
      SECTOR_INTERVAL,
    )
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [index, paused, reduced])

  const running = !reduced && !paused

  return (
    <section
      className="relative border-y border-line/10 bg-ink py-section"
      aria-labelledby="sectors-heading"
      /*
        Keyboard focus only. A plain click also focuses the element it hits, so
        treating every focus as "someone is reading" meant clicking Play
        focused the button, which re-paused it, and the showcase could never be
        restarted. `:focus-visible` is exactly the distinction wanted: set by
        keyboard navigation, not by a mouse click.
      */
      onFocusCapture={(event) => {
        try {
          if ((event.target as Element).matches(':focus-visible')) setFocusWithin(true)
        } catch {
          /* older engines without :focus-visible simply do not pause */
        }
      }}
      onBlurCapture={() => setFocusWithin(false)}
    >
      <SectionBackdrop variant="grid" tone="both" />

      <div className="relative shell grid items-center gap-12 lg:grid-cols-12 lg:gap-x-16">
        {/* ---------------- Copy ---------------- */}
        <div className="lg:col-span-5">
          <p className="flex items-center gap-4 text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            {sectorCopy.eyebrow}
          </p>

          <h2
            id="sectors-heading"
            className="mt-6 font-display text-h2 font-semibold leading-tight text-bone"
          >
            {sectorCopy.headingResidential}{' '}
            <span
              className={`transition-colors duration-700 ${
                isCommercial ? 'text-accent2-ink' : 'text-bone-400'
              }`}
            >
              {sectorCopy.headingCommercial}
            </span>
          </h2>

          <p className="mt-6 max-w-measure text-body text-bone-400">{sectorCopy.lede}</p>

          {/* Stats swap with the sector, so the commercial numbers appear
              without the visitor doing anything. */}
          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-line/10 pt-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span
                    className={`block font-display text-h2 font-semibold leading-none transition-colors duration-500 ${
                      isCommercial ? 'text-accent2-ink' : 'text-accent'
                    }`}
                  >
                    {stat.figure}
                  </span>
                  <span className="mt-2 block text-small text-bone-400">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>

          {/* ---------------- Controls ---------------- */}
          <div className="mt-10 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              className="grid size-11 shrink-0 place-items-center rounded-pill border border-line/15 text-bone-400 transition-colors duration-300 hover:border-accent hover:text-accent"
              aria-pressed={userPaused}
            >
              {running ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-4" aria-hidden="true" />
              )}
              <span className="sr-only">{running ? 'Pause the showcase' : 'Play the showcase'}</span>
            </button>

            <ul className="flex flex-wrap gap-2">
              {sectorSlides.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === index}
                    className={`h-1.5 rounded-pill transition-all duration-500 ease-expo ${
                      i === index
                        ? item.sector === 'commercial'
                          ? 'w-10 bg-accent2'
                          : 'w-10 bg-accent'
                        : 'w-5 bg-line/20 hover:bg-line/40'
                    }`}
                  >
                    <span className="sr-only">
                      Show {item.title}, {item.sector}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------------- Imagery ---------------- */}
        <div className="lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line/10 bg-ink-800 sm:aspect-[16/10]">
            {sectorSlides.map((item, i) => (
              <div
                key={item.id}
                aria-hidden={i !== index}
                className={`absolute inset-0 transition-opacity duration-[900ms] ease-expo ${
                  i === index ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <ProtectedImage
                  src={item.image}
                  alt={`${item.title}. ${item.caption}`}
                  frameClassName="size-full"
                  watermark
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}

            {/* Scrim so the caption stays legible over any frame. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/70 to-transparent"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <span
                className={`inline-block rounded-pill px-3 py-1.5 text-eyebrow font-bold uppercase tracking-[0.16em] transition-colors duration-500 ${
                  isCommercial ? 'bg-accent2 text-paper-fg' : 'bg-accent text-ink'
                }`}
              >
                {isCommercial ? sectorCopy.commercialLabel : sectorCopy.residentialLabel}
              </span>
              <h3 className="mt-3 font-display text-h4 font-semibold text-bone">{slide.title}</h3>
              <p className="mt-1 text-small text-bone-200/80">{slide.caption}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Announce the change without moving focus. */}
      <p className="sr-only" aria-live="polite">
        {isCommercial ? sectorCopy.commercialLabel : sectorCopy.residentialLabel}: {slide.title}.
      </p>
    </section>
  )
}
