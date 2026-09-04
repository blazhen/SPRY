import { useCallback, useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCarouselWheel } from '@/hooks/useCarouselWheel'
import VideoEmbed from '@/components/ui/VideoEmbed'
import type { Video } from '@/data/videos'

interface VideoCarouselProps {
  videos: Video[]
  label: string
}

/** How far a neighbouring card rotates and shrinks, per unit of distance. */
const TILT = 26 // degrees
const DEPTH = 190 // px pushed away from the camera
const DIM = 0.42 // how much brightness a fully off-centre card loses

/**
 * Video carousel with a coverflow tilt.
 *
 * Built on Embla rather than a new dependency: it is already in the bundle for
 * the testimonials, it handles pointer, touch and momentum properly, and it
 * does not fight the page's own scrolling the way most carousel libraries do.
 *
 * The depth effect is applied per frame from Embla's own scroll event, straight
 * to `style`, never through React state. A slider that re-renders on every
 * frame of a drag drops frames on a phone, and this one has to stay smooth
 * while eleven poster images are on screen.
 *
 * Three details that matter more than the tilt:
 *
 *  - A drag must never trigger playback. Embla 8 has no clickAllowed(), so the
 *    handler below measures how far the pointer travelled and swallows the
 *    click when it was a swipe rather than a tap.
 *  - The loop is unwrapped before measuring distance, otherwise the card
 *    crossing the seam lurches to the far end of the tilt range.
 *  - Under reduced motion the whole 3D layer is dropped and it becomes a plain
 *    snapping scroller, which is the same content without the movement.
 */
export default function VideoCarousel({ videos, label }: VideoCarouselProps) {
  const reduced = useReducedMotion()
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: videos.length > 3,
    align: 'center',
    containScroll: false,
    duration: 26,
    dragThreshold: 6,
    skipSnaps: false,
  })

  /**
   * Where the pointer went down, so a drag can be told from a click.
   *
   * Embla 8 removed `clickAllowed()` from its public API, and the engine only
   * exposes `pointerDown()`, which is true during a drag and false by the time
   * the click fires. Measuring the distance the pointer travelled is both
   * simpler and independent of Embla's internals.
   */
  const pointerStart = useRef<{ x: number; y: number; coarse: boolean } | null>(null)

  /**
   * How far the pointer may travel and still count as a tap.
   *
   * A mouse click is precise. A finger is not: the browser's own touch slop is
   * around 10px, and a tap on a moving hand can exceed that, so anything under
   * roughly 20px is still a tap rather than a swipe. A deliberate swipe on a
   * carousel travels several times further, so nothing is lost by being
   * generous here.
   */
  const TAP_SLOP = { mouse: 8, touch: 20 }

  const [selected, setSelected] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const progressRef = useRef<HTMLSpanElement>(null)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  // Two-finger horizontal on a trackpad. Without this the slider looks stuck
  // to anyone on a laptop who does not spot the arrows.
  useCarouselWheel(emblaApi)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setSelected(emblaApi.selectedScrollSnap())
      setCanPrev(emblaApi.canScrollPrev())
      setCanNext(emblaApi.canScrollNext())
    }
    onSelect()
    emblaApi.on('select', onSelect).on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect)
    }
  }, [emblaApi])

  /** Depth, tilt and parallax, written per frame. */
  useEffect(() => {
    if (!emblaApi) return

    const cards = emblaApi
      .slideNodes()
      .map((slide) => slide.querySelector<HTMLElement>('[data-vc-card]'))
    const posters = emblaApi
      .slideNodes()
      .map((slide) => slide.querySelector<HTMLElement>('[data-vc-poster]'))

    const apply = () => {
      const engine = emblaApi.internalEngine()
      const scroll = emblaApi.scrollProgress()

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${Math.max(0.04, scroll)})`
      }

      emblaApi.scrollSnapList().forEach((snap, index) => {
        let diff = snap - scroll

        // Unwrap the loop, or the card crossing the seam jumps the full range.
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((point) => {
            const target = point.target()
            if (index === point.index && target !== 0) {
              diff = snap - scroll + Math.sign(target)
            }
          })
        }

        const d = Math.max(-1.6, Math.min(1.6, diff * 2.4))
        const abs = Math.abs(d)

        const card = cards[index]
        if (card) {
          if (reduced) {
            card.style.transform = ''
            card.style.filter = ''
          } else {
            card.style.transform = `translate3d(0,0,${-Math.min(abs, 1) * DEPTH}px) rotateY(${-d * TILT}deg) scale(${1 - Math.min(abs, 1) * 0.08})`
            card.style.filter = `brightness(${1 - Math.min(abs, 1) * DIM})`
            card.style.zIndex = String(100 - Math.round(abs * 50))
          }
        }

        // The poster drifts against the card, which is what sells the depth.
        const poster = posters[index]
        if (poster) poster.style.transform = reduced ? '' : `translate3d(${d * 7}%,0,0) scale(1.14)`
      })
    }

    apply()
    emblaApi.on('scroll', apply).on('reInit', apply)
    return () => {
      emblaApi.off('scroll', apply).off('reInit', apply)
    }
  }, [emblaApi, reduced])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollPrev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollNext()
    }
  }

  return (
    <div
      className="relative"
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {/* The mask sits on a wrapper rather than on the viewport itself: putting
          it on the element that carries `perspective` flattens the 3D. It stops
          the half-visible cards at each edge from being sliced mid-word, which
          reads as broken rather than as a deliberate peek. */}
      <div className="[mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]">
        <div
          ref={emblaRef}
          className="overflow-hidden"
          // Perspective lives on the viewport, so every card shares one vanishing
          // point instead of each tilting in its own little world.
          style={reduced ? undefined : { perspective: '1600px', perspectiveOrigin: '50% 45%' }}
        >
        <ul
          className="-ml-5 flex touch-pan-y sm:-ml-7"
          style={reduced ? undefined : { transformStyle: 'preserve-3d' }}
        >
          {videos.map((video, i) => (
            <li
              key={video.id}
              className="min-w-0 shrink-0 grow-0 basis-[82%] pl-5 sm:basis-[56%] sm:pl-7 lg:basis-[38%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${videos.length}: ${video.title}`}
              // A drag that ends over a card must not launch its video.
              onPointerDownCapture={(event) => {
                pointerStart.current = {
                  x: event.clientX,
                  y: event.clientY,
                  coarse: event.pointerType !== 'mouse',
                }
              }}
              onClickCapture={(event) => {
                const start = pointerStart.current
                if (start) {
                  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
                  if (moved > (start.coarse ? TAP_SLOP.touch : TAP_SLOP.mouse)) {
                    event.preventDefault()
                    event.stopPropagation()
                    return
                  }
                }
                /* Centring an off-centre card is handled by onRequestPlay on
                   the embed itself, so that touch and mouse take the same
                   path. Nothing more to do here. */
              }}
            >
              <div
                data-vc-card
                className="will-change-transform"
                style={reduced ? undefined : { transformStyle: 'preserve-3d' }}
              >
                <div className="overflow-hidden rounded-xl">
                  <VideoEmbed
                    id={video.id}
                    title={video.title}
                    poster={video.poster}
                    posterAttr="data-vc-poster"
                    onRequestPlay={() => {
                      if (i === selected) return true
                      // Off-centre cards are tilted and dimmed, so a video
                      // playing in one looks broken. Bring it to the middle
                      // first; the next tap plays it, flat and bright.
                      emblaApi?.scrollTo(i)
                      return false
                    }}
                  />
                </div>
                <h3 className="mt-5 font-display text-h4 font-semibold leading-tight text-bone">
                  {video.title}
                </h3>
                <p className="mt-2 text-small leading-snug text-bone-400">{video.blurb}</p>
              </div>
            </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------------- Controls ---------------- */}
      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={!canPrev}
            className="grid size-12 place-items-center rounded-pill border-2 border-accent bg-accent text-ink shadow-accent transition-colors duration-300 hover:bg-accent-300 hover:border-accent-300 disabled:border-line/20 disabled:bg-transparent disabled:text-bone-400 disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowLeft className="size-5" strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">Previous video</span>
          </button>
          <button
            type="button"
            onClick={scrollNext}
            disabled={!canNext}
            className="grid size-12 place-items-center rounded-pill border-2 border-accent bg-accent text-ink shadow-accent transition-colors duration-300 hover:bg-accent-300 hover:border-accent-300 disabled:border-line/20 disabled:bg-transparent disabled:text-bone-400 disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowRight className="size-5" strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">Next video</span>
          </button>
        </div>

        {/* Says out loud what the slider accepts. The gestures were all there
            except the trackpad one; what was missing was any sign of them. */}
        <p className="order-last w-full text-small text-bone-400 sm:order-none sm:w-auto">
          Drag, swipe or scroll sideways
        </p>

        {/* Continuous progress rather than dots: eleven dots is a rash, and a
            bar shows position within a long list at a glance. */}
        <div className="h-0.5 flex-1 overflow-hidden rounded-pill bg-line/12">
          <span
            ref={progressRef}
            aria-hidden="true"
            className="block h-full origin-left rounded-pill bg-accent"
            style={{ transform: 'scaleX(0.04)' }}
          />
        </div>

        <p className="shrink-0 text-small font-bold tabular-nums text-bone-400">
          {String(selected + 1).padStart(2, '0')}
          <span className="text-bone-400/60"> / {String(videos.length).padStart(2, '0')}</span>
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        Video {selected + 1} of {videos.length}: {videos[selected]?.title}.
      </p>
    </div>
  )
}
