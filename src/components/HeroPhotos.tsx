import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ArrowUpRight, Pause, Phone, Play } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import MagneticButton from '@/components/ui/MagneticButton'
import ProtectedImage from '@/components/ui/ProtectedImage'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import Stars from '@/components/ui/Stars'
import { hero, heroPhotos } from '@/data/content'
import { site } from '@/data/site'

const SIZES = '(min-width: 1024px) 58vw, 100vw'

/**
 * The photo hero.
 *
 * The SEO agency asked for a real photograph of a technician spraying, or a
 * rotation of them, as the first thing on the home page. So: the keyword H1,
 * the offer and both calls to action on the left, and on the right the crew
 * at work on four of the business's own jobs, cross-fading every few seconds.
 *
 * The rotation follows the agency's own carousel rules: each photograph holds
 * six seconds, there is a pause button, the dots are full-size tap targets,
 * and choosing a photograph stops the rotation for good. It also stops while
 * the hero is off screen or the tab is hidden, and never runs at all under
 * reduced motion, where the first photograph simply stays.
 *
 * The first photograph is the largest thing on the screen, so it is preloaded
 * and fetched at high priority. The other three ask for low priority and
 * arrive behind it.
 */
export default function HeroPhotos() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { photos } = heroPhotos
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  const rotating = playing && !reduced && inView && tabVisible

  useEffect(() => {
    if (!rotating) return
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % photos.length),
      heroPhotos.holdSeconds * 1000,
    )
    return () => window.clearInterval(id)
  }, [rotating, photos.length])

  useEffect(() => {
    const el = scope.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    })
    io.observe(el)
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useGSAP(
    () => {
      if (reduced) return
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-p-eyebrow]', { autoAlpha: 0, y: 14, duration: 0.6 }, 0.1)
        .from('[data-p-line]', { yPercent: 115, duration: 1.05, stagger: 0.09, ease: 'power4.out' }, 0.2)
        .from('[data-p-sub]', { autoAlpha: 0, y: 18, duration: 0.7 }, '-=0.45')
        .from('[data-p-cta] > *', { autoAlpha: 0, y: 16, duration: 0.55, stagger: 0.08 }, '-=0.4')
        .from('[data-p-trust] > *', { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.06 }, '-=0.3')
        .from('[data-p-photo]', { autoAlpha: 0, y: 30, duration: 1 }, 0.25)
    },
    { scope, dependencies: [reduced] },
  )

  /** Picking a photograph is an interaction, so the rotation stops for good. */
  const show = (i: number) => {
    setActive(i)
    setPlaying(false)
  }

  const first = photos[0]

  return (
    <section
      ref={scope}
      className="relative isolate overflow-hidden bg-ink pb-12 pt-[calc(var(--header-h)+0.75rem)] lg:flex lg:min-h-[100svh] lg:items-center lg:pb-14 lg:pt-[calc(var(--header-h)+2rem)]"
      aria-label="Introduction"
    >
      <Helmet>
        <link
          rel="preload"
          as="image"
          href={first.src}
          {...{ imagesrcset: `${first.small} 800w, ${first.src} 1600w`, imagesizes: SIZES, fetchpriority: 'high' }}
        />
      </Helmet>
      <SectionBackdrop variant="orbs" tone="both" />

      <div className="relative shell grid w-full items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* ---------------------------------------------------------- Copy */}
        <div className="lg:col-span-5">
          <h1 className="text-h1 font-semibold text-bone">
            <span data-p-eyebrow className="eyebrow mb-5 flex !text-bone-200">
              {heroPhotos.keyword}
            </span>{' '}
            {heroPhotos.headlineLines.map((line, i) => (
              <span className="line-mask" key={line}>
                <span
                  className={`line-inner ${i === heroPhotos.accentLineIndex ? 'text-gradient-accent' : ''}`}
                  data-p-line
                >
                  {line}
                  {i < heroPhotos.headlineLines.length - 1 ? ' ' : ''}
                </span>
              </span>
            ))}
          </h1>

          <p data-p-sub className="mt-6 max-w-measure text-lead text-bone-200/85">
            {heroPhotos.subhead}
          </p>

          <div data-p-cta className="mt-8 flex flex-wrap items-center gap-3">
            <MagneticButton href={site.cta.primary.href} variant="primary" strength={0.34}>
              {site.cta.primary.label}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </MagneticButton>
            <MagneticButton
              href={site.phone.tel}
              variant="ghost"
              strength={0.24}
              ariaLabel={`Call SprayIT Solutions on ${site.phone.display}`}
            >
              <Phone className="size-4" aria-hidden="true" />
              {site.cta.secondary.label}
            </MagneticButton>
          </div>

          {/* The rating is Google's, so it is drawn in Google's gold and links
              to the reviews, rather than sitting in the navy of the buttons. */}
          <div
            data-p-trust
            className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-small text-bone-200/80"
          >
            {site.reviewsUrl ? (
              <a
                href={site.reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-sm hover:text-bone"
              >
                <Stars tone="google" label={hero.trust.ratingLabel} />
                <span className="font-semibold text-bone">5.0</span>
                <span>on Google</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Stars tone="google" label={hero.trust.ratingLabel} />
                <span className="font-semibold text-bone">5.0</span>
                <span>on Google</span>
              </span>
            )}
            <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
            <span>{hero.trust.provenance}</span>
          </div>
        </div>

        {/* -------------------------------------------------------- Photos */}
        {/* First on phones, so the photograph is what the first screen shows;
            beside the copy from lg up. The copy stays first in the markup. */}
        <div data-p-photo className="order-first lg:order-none lg:col-span-7">
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line/10 bg-surface shadow-lift"
            role="group"
            aria-roledescription="carousel"
            aria-label="Photographs of our crews at work"
          >
            {photos.map((photo, i) => {
              const isActive = i === active
              return (
                <div
                  key={photo.src}
                  className="absolute inset-0"
                  aria-hidden={!isActive}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: !reduced && isActive ? 'scale(1.05)' : 'scale(1)',
                    transition: reduced
                      ? 'none'
                      : `opacity 1s ease, transform ${heroPhotos.holdSeconds + 1}s linear`,
                  }}
                >
                  <ProtectedImage
                    src={photo.src}
                    srcSet={`${photo.small} 800w, ${photo.src} 1600w`}
                    sizes={SIZES}
                    alt={photo.alt}
                    width={1600}
                    height={1200}
                    frameClassName="size-full"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : 'low'}
                    watermark
                  />
                </div>
              )
            })}

            {/* Caption on its own gradient, so it never sits on a busy photo. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-5 pb-4 pt-16 sm:px-6 sm:pb-5">
              <p className="text-eyebrow font-bold uppercase tracking-[0.16em] text-white/85">
                {heroPhotos.crewLabel}
              </p>
              <p className="mt-1 text-small font-semibold text-white" aria-live={rotating ? 'off' : 'polite'}>
                {photos[active].caption}
              </p>
            </div>
          </div>

          {/* Controls under the photo, not over it: the pause button and one
              dot per photograph, each a full-size tap target. */}
          <div className="mt-3 flex items-center gap-2">
            {!reduced && (
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="grid size-11 place-items-center rounded-pill border border-line/15 bg-ink-800 text-bone transition-colors hover:border-bone"
                aria-label={playing ? 'Pause the photographs' : 'Play the photographs'}
              >
                {playing ? (
                  <Pause className="size-4" aria-hidden="true" />
                ) : (
                  <Play className="size-4" aria-hidden="true" />
                )}
              </button>
            )}
            <div className="flex items-center">
              {photos.map((photo, i) => (
                <button
                  key={photo.src}
                  type="button"
                  onClick={() => show(i)}
                  aria-label={`Show photograph ${i + 1} of ${photos.length}: ${photo.caption}`}
                  aria-current={i === active}
                  className="group grid h-11 w-9 place-items-center"
                >
                  <span
                    className={`h-1.5 rounded-pill transition-all duration-500 ${
                      i === active ? 'w-7 bg-accent' : 'w-4 bg-bone/25 group-hover:bg-bone/50'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
