import { useRef } from 'react'
import { ArrowDown, ArrowUpRight, Phone } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { heroFoam } from '@/data/content'
import { site } from '@/data/site'
import { heroStat } from '@/data/stats'
import { unsplash, unsplashSrcSet } from '@/lib/images'
import MagneticButton from '@/components/ui/MagneticButton'
import Stars from '@/components/ui/Stars'

/**
 * The knockout hero.
 *
 * The headline is cut out of a solid ink panel covering the whole viewport, so
 * the footage behind it is visible only through the letterforms. Everything
 * else on the page stays dark and calm; the type is the one lit thing.
 *
 * Done as an SVG mask rather than `background-clip: text`, because a CSS
 * background cannot be a video. A full-bleed rect painted in the page ink is
 * masked by white-on-black text, which knocks the glyphs out of it. Inline SVG
 * text inherits document fonts, so this uses the real display face.
 *
 * The headline is centred, which is the one composition none of the earlier
 * heroes used, and it sidesteps having to align SVG text with the shell gutter.
 *
 * On scroll the ink panel dissolves and the footage goes full bleed for a beat
 * before the page resumes. That is the moment the hero is built around.
 *
 * The fill is a video when one is supplied and a photograph with a slow push
 * when not. The composition, the mask and the scroll moment are identical
 * either way, so this ships finished today and improves when the loop lands.
 */
export default function HeroFoam() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const videoSrc = heroFoam.video.src

  useGSAP(
    () => {
      if (reduced) return

      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-f-fill]', { scale: 1.18, duration: 2.2, ease: 'power2.out' }, 0)
        // The knockout reveals by wiping its own mask upward, so the letters
        // fill with footage rather than fading in as flat shapes.
        .from('[data-f-knock]', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.3, ease: 'power4.out' }, 0.25)
        .from('[data-f-eyebrow]', { autoAlpha: 0, y: 14, duration: 0.7 }, 0.5)
        .from('[data-f-sub]', { autoAlpha: 0, y: 20, duration: 0.8 }, 0.85)
        .from('[data-f-cta] > *', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.08 }, 1.0)
        .from('[data-f-trust] > *', { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.06 }, 1.15)
        .from('[data-f-proof]', { autoAlpha: 0, x: 24, duration: 0.7 }, 1.0)
        .from('[data-f-cue]', { autoAlpha: 0, duration: 0.5 }, 1.3)

      // Slow push on the fill, so a still photograph still breathes.
      gsap.to('[data-f-fill]', {
        scale: 1.1,
        duration: 22,
        ease: 'none',
        repeat: -1,
        yoyo: true,
        delay: 2.2,
      })

      // --- The moment: the ink panel dissolves and the footage takes over ---
      gsap
        .timeline({
          scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.7 },
        })
        .to('[data-f-knock]', { autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 0)
        .to('[data-f-copy]', { autoAlpha: 0, y: -50, duration: 0.4, ease: 'power2.in' }, 0)
        .to('[data-f-fill]', { yPercent: 14, ease: 'none', duration: 1 }, 0)
        .fromTo('[data-f-close]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.5)
    },
    { scope, dependencies: [reduced, videoSrc] },
  )

  return (
    <section
      ref={scope}
      className="relative isolate h-[100svh] overflow-hidden bg-ink"
      aria-label="Introduction"
    >
      {/* ---------------- Fill: video when supplied, photograph otherwise --- */}
      <div data-f-fill className="absolute -inset-[6%] will-change-transform">
        {videoSrc ? (
          <video
            className="size-full object-cover"
            src={videoSrc}
            poster={unsplash(heroFoam.video.poster, 1600)}
            autoPlay
            muted
            loop
            playsInline
            // Decorative: the headline carries the meaning.
            aria-hidden="true"
          />
        ) : (
          /* TODO: client to replace with the generated foam loop */
          <img
            src={unsplash(heroFoam.image.id, 2000, 78)}
            srcSet={unsplashSrcSet(heroFoam.image.id, [960, 1440, 1920, 2400])}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            {...({ fetchpriority: 'high' } as Record<string, string>)}
            decoding="async"
            className="size-full object-cover"
          />
        )}

        {/* Warms the footage toward the brand rather than leaving it neutral. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 mix-blend-soft-light"
          style={{ background: 'rgb(var(--c-accent) / 0.5)' }}
        />
      </div>

      {/* ---------------- The knockout panel ---------------- */}
      <div data-f-knock className="absolute inset-0 z-10">
        <svg className="size-full" aria-hidden="true" focusable="false">
          <defs>
            <mask id="foam-knockout" maskUnits="userSpaceOnUse">
              {/* White keeps the panel, black cuts the letters out of it. */}
              <rect width="100%" height="100%" fill="#fff" />
              {/* Sits above centre, leaving the lower third clear for the
                  subhead, buttons and trust row. */}
              <text
                x="50%"
                y="40%"
                textAnchor="middle"
                fill="#000"
                className="hero-knockout-text"
              >
                {heroFoam.headlineLines.map((line, i) => (
                  <tspan key={line} x="50%" dy={i === 0 ? '-0.30em' : '0.92em'}>
                    {line}
                  </tspan>
                ))}
              </text>
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgb(var(--c-ink))"
            mask="url(#foam-knockout)"
          />
        </svg>
      </div>

      {/* The headline again, for assistive tech and for search engines, since
          the visible one is painted as a mask and is not text to them. */}
      <h1 className="sr-only">{heroFoam.headlineLines.join(' ')}</h1>

      {/* Warm wash that arrives as the panel dissolves. */}
      <div
        data-f-close
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[11] opacity-0"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 45%, rgb(var(--c-accent) / 0.22), transparent 70%), linear-gradient(to bottom, rgb(var(--c-ink) / 0.55) 0%, transparent 30%, rgb(var(--c-ink)) 97%)',
        }}
      />

      {/* ---------------- Copy ---------------- */}
      {/* Eyebrow pinned to the top, everything else pushed to the bottom with
          mt-auto. `justify-between` split the leftover space evenly instead,
          which floated the copy up into the headline on desktop and pushed it
          clean off the top of the viewport on a phone. */}
      <div
        data-f-copy
        className="pointer-events-none absolute inset-0 z-20 flex flex-col pb-9 pt-[calc(var(--header-h)+1.5rem)]"
      >
        <p
          data-f-eyebrow
          className="eyebrow !text-bone-200 mx-auto justify-center px-gutter text-center"
        >
          {heroFoam.eyebrowOverride}
        </p>

        <div className="shell pointer-events-auto mt-auto flex flex-col items-center text-center">
          <p data-f-sub className="max-w-measure text-lead text-bone-200/85">
            {heroFoam.subhead}
          </p>

          <div data-f-cta className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton href={site.cta.primary.href} variant="primary" strength={0.34}>
              {site.cta.primary.label}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </MagneticButton>
            <MagneticButton
              href={site.phone.tel}
              variant="ghost"
              strength={0.24}
              ariaLabel={`Call Spray It Solutions on ${site.phone.display}`}
            >
              <Phone className="size-4" aria-hidden="true" />
              {site.cta.secondary.label}
            </MagneticButton>
          </div>

          <div
            data-f-trust
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-small text-bone-200/80"
          >
            <span className="inline-flex items-center gap-2">
              <Stars label="Rated 5 stars by homeowners" />
              <span className="font-semibold text-bone">5.0</span>
            </span>
            <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
            <span>Family-owned · Australia-wide</span>
            <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
            <span>{site.serviceArea}</span>
          </div>

          <p
            data-f-cue
            className="mt-8 flex items-center gap-3 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400"
          >
            <ArrowDown className="size-4 animate-scroll-nudge text-accent" aria-hidden="true" />
            {heroFoam.scrollCue}
          </p>
        </div>
      </div>

      {/* ---------------- Proof chip ---------------- */}
      <figure
        data-f-proof
        className="absolute bottom-8 right-[var(--gutter)] z-20 hidden w-56 rounded-lg border border-line/12 bg-ink/60 p-5 backdrop-blur-xl lg:block"
      >
        <figcaption className="text-eyebrow font-bold uppercase tracking-[0.16em] text-bone-400">
          {heroFoam.proof.label}
        </figcaption>
        <p className="mt-3 font-display text-[2.75rem] font-semibold leading-none text-accent">
          {heroStat.headline}
        </p>
        <p className="mt-1 text-small font-semibold text-bone">{heroStat.label}</p>
      </figure>
    </section>
  )
}
