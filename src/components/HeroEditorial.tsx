import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUpRight, Phone } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { heroEditorial } from '@/data/content'
import { site } from '@/data/site'
import { heroStat } from '@/data/stats'
import Figure from '@/components/ui/Figure'
import MagneticButton from '@/components/ui/MagneticButton'
import Marquee from '@/components/Marquee'
import Stars from '@/components/ui/Stars'

/**
 * The editorial hero.
 *
 * Deliberately the odd one out. The other three heroes share a silhouette:
 * full-bleed dark photograph, oversized type bottom-left, an interaction
 * gimmick layered on top. Three attempts at varying the gimmick suggested the
 * formula itself was the problem, so this varies the structure instead.
 *
 * Light surface, split composition, type as the subject and the photograph as
 * a panel beside it rather than a backdrop. The only motion is a benefit line
 * that swaps under the headline, which is a live element without asking the
 * visitor to operate anything.
 *
 * No WebGL, no drag handler, one image. It is the cheapest hero of the four by
 * a wide margin.
 */
export default function HeroEditorial() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  // Tells the header this hero is a light surface, so it takes its dark
  // blurred treatment immediately instead of vanishing into the bone.
  useEffect(() => {
    document.documentElement.dataset.heroTone = 'light'
    return () => {
      delete document.documentElement.dataset.heroTone
    }
  }, [])

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      if (!reduced) {
        tl.from('[data-e-eyebrow]', { autoAlpha: 0, y: 14, duration: 0.6 }, 0.15)
          .from(
            '[data-e-line]',
            { yPercent: 115, duration: 1.05, stagger: 0.09, ease: 'power4.out' },
            0.25,
          )
          .from('[data-e-sub]', { autoAlpha: 0, y: 18, duration: 0.7 }, '-=0.45')
          .from('[data-e-cta] > *', { autoAlpha: 0, y: 16, duration: 0.55, stagger: 0.08 }, '-=0.45')
          .from('[data-e-trust] > *', { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.06 }, '-=0.3')
          .from(
            '[data-e-panel]',
            { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'power4.out' },
            0.3,
          )
          .from('[data-e-proof]', { autoAlpha: 0, x: -20, duration: 0.7 }, '-=0.4')
          .from('[data-e-cue]', { autoAlpha: 0, duration: 0.5 }, '-=0.3')
      }

      // --- Benefit line swap -------------------------------------------
      // Each phrase sits stacked in one masked box. The outgoing line clears
      // upward as the incoming one arrives from below, so the box never
      // changes height and nothing below it moves.
      if (!reduced) {
        const lines = gsap.utils.toArray<HTMLElement>('[data-e-cycle]')
        if (lines.length > 1) {
          gsap.set(lines, { yPercent: 110 })
          gsap.set(lines[0], { yPercent: 0 })

          const swap = gsap.timeline({ repeat: -1, delay: 1.9 })
          lines.forEach((_, i) => {
            const next = lines[(i + 1) % lines.length]
            swap
              .to(lines[i], { yPercent: -110, duration: 0.55, ease: 'power3.in' })
              .fromTo(
                next,
                { yPercent: 110 },
                { yPercent: 0, duration: 0.65, ease: 'power3.out' },
                '-=0.3',
              )
              .to({}, { duration: 1.7 })
          })
        }
      }

      // --- Photograph drifts against the copy on scroll ------------------
      if (!reduced) {
        gsap.to('[data-e-photo]', {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
          },
        })
      }
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      className="relative isolate flex min-h-[100svh] flex-col bg-bone text-ink"
      aria-label="Introduction"
    >
      <div className="shell grid flex-1 items-center gap-12 pb-16 pt-[calc(var(--header-h)+3.5rem)] lg:grid-cols-12 lg:gap-10 lg:pb-24">
        {/* ---------------- Copy ---------------- */}
        <div className="lg:col-span-7 xl:col-span-6">
          <p data-e-eyebrow className="eyebrow">
            {site.serviceArea}
          </p>

          <h1 className="mt-6 text-display font-semibold">
            <span className="line-mask">
              <span className="line-inner" data-e-line>
                {heroEditorial.headStatic}
              </span>
            </span>

            {/* Fixed-height mask holding the rotating benefit. A hidden copy of
                the longest phrase reserves the space, so the swap cannot make
                the page jump. */}
            {/* Generous bottom padding pulled back by an equal negative margin:
                display leading is tight enough that glyphs overhang their line
                box, and without the extra room the incoming phrase peeks below
                the mask mid-swap. */}
            <span className="relative block overflow-hidden pb-[0.18em] mb-[-0.18em]">
              <span aria-hidden="true" className="invisible block">
                {heroEditorial.cycling.reduce((a, b) => (a.length >= b.length ? a : b))}
              </span>
              {heroEditorial.cycling.map((phrase, i) => (
                <span
                  key={phrase}
                  data-e-cycle
                  className="absolute inset-0 block text-accent"
                  // Only the first is announced; the rest are decorative
                  // repetitions of the same promise.
                  aria-hidden={i === 0 ? undefined : 'true'}
                >
                  {phrase}
                </span>
              ))}
            </span>
          </h1>

          <p data-e-sub className="mt-8 max-w-measure text-lead text-ink/70">
            {heroEditorial.subhead}
          </p>

          <div data-e-cta className="mt-10 flex flex-wrap items-center gap-3">
            <MagneticButton href={site.cta.primary.href} variant="primary" strength={0.34}>
              {site.cta.primary.label}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </MagneticButton>
            <MagneticButton
              href={site.phone.tel}
              variant="outline-ink"
              strength={0.24}
              ariaLabel={`Call Spray It Solutions on ${site.phone.display}`}
            >
              <Phone className="size-4" aria-hidden="true" />
              {site.cta.secondary.label}
            </MagneticButton>
          </div>

          <div
            data-e-trust
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-small text-ink/70"
          >
            <span className="inline-flex items-center gap-2">
              <Stars label="Rated 5 stars by Victorian homeowners" />
              <span className="font-semibold text-ink">5.0</span>
            </span>
            <span className="hidden h-4 w-px bg-ink/20 sm:block" aria-hidden="true" />
            <span>Family-owned · Carrum Downs, Victoria</span>
            <span className="hidden h-4 w-px bg-ink/20 sm:block" aria-hidden="true" />
            <span>Decades of experience</span>
          </div>
        </div>

        {/* ---------------- Photograph panel ---------------- */}
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="relative">
            <div
              data-e-panel
              // Height-capped on desktop rather than a fixed ratio: a 4/5 panel
              // in this column pushed the proof card below the fold on a
              // 900px-tall laptop.
              className="relative aspect-[4/5] overflow-hidden rounded-xl bg-ink-700 sm:aspect-[3/2] lg:aspect-auto lg:h-[clamp(20rem,52vh,34rem)]"
            >
              <div data-e-photo className="absolute -inset-y-[6%] inset-x-0 will-change-transform">
                {/* TODO: client to replace with real project photo */}
                <Figure
                  image={heroEditorial.image}
                  sizes="(min-width: 1024px) 40vw, 92vw"
                  priority
                  className="size-full"
                  widths={[640, 960, 1280]}
                />
              </div>
            </div>

            {/* Proof card, overlapping the panel so the two layers interlock
                rather than sitting in tidy separate boxes. */}
            <figure
              data-e-proof
              className="relative z-10 -mt-12 ml-0 w-[min(20rem,86%)] rounded-lg border border-ink/12 bg-bone p-6 shadow-lift lg:-ml-10"
            >
              <figcaption className="text-eyebrow font-bold uppercase tracking-[0.18em] text-ink/55">
                {heroEditorial.proofLabel}
              </figcaption>
              <p className="mt-3 font-display text-[clamp(2.5rem,4.5vw,3.5rem)] font-semibold leading-none tracking-tight text-accent">
                {heroStat.headline}
              </p>
              <p className="mt-1 text-h4 font-semibold">{heroStat.label}</p>
              <p className="mt-3 text-small text-ink/60">
                {heroStat.before} → {heroStat.after} {heroStat.unit}
              </p>
            </figure>
          </div>
        </div>
      </div>

      {/* ---------------- Scroll cue ---------------- */}
      <div className="shell pb-6">
        <p
          data-e-cue
          className="flex items-center gap-3 text-eyebrow font-bold uppercase tracking-[0.18em] text-ink/55"
        >
          <ArrowDown className="size-4 animate-scroll-nudge text-accent" aria-hidden="true" />
          {heroEditorial.scrollCue}
        </p>
      </div>

      {/* Marquee closes the light band and hands off to the dark page below. */}
      <Marquee
        className="border-t border-ink/12 bg-ink py-5"
        itemClassName="font-display text-[clamp(1.25rem,2.6vw,2rem)] font-semibold uppercase leading-none tracking-tight text-bone"
      />
    </section>
  )
}
