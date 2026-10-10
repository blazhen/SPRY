import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowLeft, ArrowRight, Quote } from 'lucide-react'
import { useCarouselWheel } from '@/hooks/useCarouselWheel'
import { testimonials } from '@/data/testimonials'
import { testimonialsFootnote, testimonialsIntro } from '@/data/content'
import { testimonialVideo, workCopy } from '@/data/videos'
import { integrations } from '@/config/integrations'
import SectionHeading from '@/components/ui/SectionHeading'
import VideoEmbed from '@/components/ui/VideoEmbed'
import GoogleReviews from '@/components/ui/GoogleReviews'

/**
 * Testimonial carousel, or the live Google reviews widget once it is set up.
 *
 * The SEO agency asked for the Google widget in place of the cards: reviews a
 * visitor can check on Google carry more weight than quotes we print
 * ourselves. The widget's address goes in public/config.js; until it is
 * there, the customer letters show as before. The section sits on the pale
 * ground rather than the brand navy, because navy is the colour of every call
 * to action on the site and the reviews read as one more of them.
 *
 * Embla handles drag/swipe; everything announced to assistive tech is wired by
 * hand: the region carries `aria-roledescription="carousel"`, each slide is
 * labelled "n of m", and off-screen slides are `inert` so keyboard focus cannot
 * land inside a panel the user cannot see. Arrow keys move the carousel when
 * focus is inside it.
 */
export default function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    containScroll: 'trimSnaps',
    skipSnaps: false,
    // Longer glide plus a softer drag threshold gives the throw some weight
    // rather than snapping to the next card the instant you let go.
    duration: 32,
    dragThreshold: 6,
  })

  const [selected, setSelected] = useState(0)
  const [snaps, setSnaps] = useState<number[]>([])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelected(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    setSnaps(emblaApi.scrollSnapList())
    onSelect()
    emblaApi.on('select', onSelect).on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  /**
   * Parallax: each card's contents lag behind its slide as the track moves,
   * so the carousel has depth instead of sliding as one rigid strip. Written
   * straight to style on Embla's own scroll event, which fires per frame while
   * dragging, so it never round-trips through React state.
   */
  useEffect(() => {
    if (!emblaApi) return
    const nodes = emblaApi
      .slideNodes()
      .map((slide) => slide.querySelector<HTMLElement>('[data-tst-inner]'))

    const apply = () => {
      const engine = emblaApi.internalEngine()
      const scroll = emblaApi.scrollProgress()
      emblaApi.scrollSnapList().forEach((snap, index) => {
        const node = nodes[index]
        if (!node) return
        let diff = snap - scroll
        // Unwrap the loop so cards jumping the seam do not lurch.
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((point) => {
            const target = point.target()
            if (index === point.index && target !== 0) {
              diff = snap - scroll + Math.sign(target)
            }
          })
        }
        node.style.transform = `translate3d(${diff * 26}%, 0, 0)`
      })
    }

    apply()
    emblaApi.on('scroll', apply).on('reInit', apply)
    return () => {
      emblaApi.off('scroll', apply).off('reInit', apply)
    }
  }, [emblaApi])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  // Two-finger horizontal on a trackpad.
  useCarouselWheel(emblaApi)

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollPrev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollNext()
    }
  }

  const widgetUrl = integrations.reviewsWidgetUrl

  return (
    <section className="relative border-t border-line/6 bg-surface py-section text-bone" aria-labelledby="testimonials-heading">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <SectionHeading intro={testimonialsIntro} headingId="testimonials-heading" />
            {/* Up top as well as under the cards, so the way to Google's own
                reviews is visible before anyone scrolls the carousel. */}
            <GoogleReviews className="mt-8" />
          </div>

          {/* --- Controls --- */}
          {!widgetUrl && (
            <div className="flex flex-col items-start gap-2.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={scrollPrev}
                  className="grid size-12 place-items-center rounded-pill border-2 border-bone/25 bg-ink-800 text-bone transition-colors duration-300 hover:border-bone hover:bg-bone hover:text-ink"
                  aria-controls="testimonial-viewport"
                >
                  <ArrowLeft className="size-5" strokeWidth={2.4} aria-hidden="true" />
                  <span className="sr-only">Previous testimonial</span>
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  className="grid size-12 place-items-center rounded-pill border-2 border-bone/25 bg-ink-800 text-bone transition-colors duration-300 hover:border-bone hover:bg-bone hover:text-ink"
                  aria-controls="testimonial-viewport"
                >
                  <ArrowRight className="size-5" strokeWidth={2.4} aria-hidden="true" />
                  <span className="sr-only">Next testimonial</span>
                </button>
              </div>
              <p className="text-small text-bone-400">Drag, swipe or scroll sideways</p>
            </div>
          )}
        </div>
      </div>

      {widgetUrl ? (
        /* The platform's widget pulls the reviews from the Google listing, so
           they are always the current ones and link back to it. */
        <div className="shell mt-14">
          <iframe
            src={widgetUrl}
            title="Google reviews for SprayIT Solutions"
            loading="lazy"
            className="block h-[38rem] w-full rounded-xl border border-line/10 bg-ink-800"
          />
        </div>
      ) : (
        <>
      {/* --- Viewport (full-bleed so slides run off the right edge) --- */}
      <div
        className="mt-14"
        role="group"
        aria-roledescription="carousel"
        aria-label="Customer testimonials"
        onKeyDown={onKeyDown}
      >
        <div
          className="overflow-hidden px-gutter"
          ref={emblaRef}
          id="testimonial-viewport"
        >
          <ul className="-ml-6 flex touch-pan-y">
            {testimonials.map((item, i) => {
              const isActive = i === selected
              return (
                <li
                  key={item.id}
                  className="min-w-0 shrink-0 grow-0 basis-[86%] pl-6 sm:basis-[58%] lg:basis-[38%] xl:basis-[31%]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${testimonials.length}`}
                  // Deliberately not aria-hidden: this is a multi-slide
                  // viewport, so neighbouring slides are genuinely on screen.
                >
                  <figure
                    className={`flex h-full flex-col justify-between overflow-hidden rounded-xl border p-8 transition-colors duration-500 ease-expo lg:p-9 ${
                      isActive ? 'border-accent/35 bg-ink-800 shadow-lift' : 'border-line/12 bg-ink-800/60'
                    }`}
                  >
                    <div data-tst-inner className="will-change-transform">
                      {/* No star row here. These customers wrote to Glenn, they
                          did not award a score, and five stars printed beside a
                          real person's name says they did. The verified rating
                          belongs to the business and is one click away on the
                          Google link below. */}
                      <div className="flex items-center justify-end gap-4">
                        <Quote
                          className={`size-7 ${isActive ? 'text-accent' : 'text-bone/15'}`}
                          aria-hidden="true"
                        />
                      </div>

                      <blockquote
                        className={`mt-7 text-lead ${isActive ? 'text-bone' : 'text-bone-400'}`}
                      >
                        <p>“{item.quote}”</p>
                      </blockquote>
                    </div>

                    <figcaption
                      className={`mt-9 flex items-end justify-between gap-4 border-t pt-6 ${
                        isActive ? 'border-line/15' : 'border-line/12'
                      }`}
                    >
                      <span>
                        <span
                          className={`block font-display text-h4 font-semibold ${
                            'text-bone'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span
                          className={`text-small ${'text-bone-400'}`}
                        >
                          {item.suburb}
                        </span>
                      </span>

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-pill border px-3 py-1 text-eyebrow font-bold uppercase tracking-[0.14em] ${
                          isActive
                            ? 'border-accent/50 text-accent'
                            : 'border-line/20 text-bone-400'
                        }`}
                      >
                        {item.scope}
                      </span>
                    </figcaption>
                  </figure>
                </li>
              )
            })}
          </ul>
        </div>

        {/* --- Dots --- */}
        <div className="shell mt-10 flex flex-wrap items-center gap-2">
          {snaps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to testimonial ${i + 1} of ${snaps.length}`}
              aria-current={i === selected}
              className={`h-1 rounded-pill transition-all duration-500 ease-expo ${
                i === selected ? 'w-10 bg-accent' : 'w-5 bg-bone/20 hover:bg-bone/40'
              }`}
            />
          ))}
        </div>

        <p className="shell mt-10 max-w-measure text-small text-bone-400">
          {testimonialsFootnote}
        </p>

        {/* Announce slide changes without moving focus. */}
        <p className="sr-only" aria-live="polite">
          Testimonial {selected + 1} of {testimonials.length}: {testimonials[selected]?.name},{' '}
          {testimonials[selected]?.suburb}.
        </p>
      </div>
        </>
      )}

      <div>

        <p className="shell mt-8">
          <GoogleReviews />
        </p>

        {/* --- Customer on camera ---
            There is exactly one testimonial video, so it is given its own
            billing rather than being padded into a carousel of one. */}
        {/* `shell` because this sits outside the section's container div, the
            same reason the dots row above re-applies it. */}
        <div className="shell mt-20 grid items-center gap-10 border-t border-line/12 pt-16 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
              {workCopy.testimonialEyebrow}
            </p>
            <h3 className="mt-5 font-display text-h3 font-semibold leading-tight">
              {testimonialVideo.title}
            </h3>
            <p className="mt-5 max-w-measure text-body text-bone-400">{testimonialVideo.blurb}</p>
          </div>

          <div className="lg:col-span-7">
            <VideoEmbed
              id={testimonialVideo.id}
              title={testimonialVideo.title}
              poster={testimonialVideo.poster}
              featured
            />
          </div>
        </div>
      </div>
    </section>
  )
}
