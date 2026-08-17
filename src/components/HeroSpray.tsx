import { useRef } from 'react'
import { ArrowDown, ArrowUpRight, Phone } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { heroSpray } from '@/data/content'
import { site } from '@/data/site'
import { heroStat } from '@/data/stats'
import MagneticButton from '@/components/ui/MagneticButton'
import CavityDiagram, { ESCAPE_ROWS } from '@/components/CavityDiagram'
import Stars from '@/components/ui/Stars'

/**
 * "Spray It" hero.
 *
 * Pinned, and the scroll does the work rather than moving a camera. The cavity
 * starts open and leaking cold; scrolling sprays it, the foam expands and
 * cures, the draft arrows die one by one, and the wall ends sealed and warm.
 *
 * The headline, subhead and CTAs never move for the whole pin. Only the
 * diagram and the beat caption change, so there is exactly one thing to watch
 * and the calls to action are on screen the entire time.
 *
 * Beat windows live in `heroSpray.beats` as start/end fractions, so the
 * choreography is retimed in the data file rather than here.
 *
 * The pin is gated on width AND height plus a runtime measurement: a pinned
 * section taller than the viewport hides its own overflow for the duration.
 * Where it will not fit, the section scrolls normally and the diagram animates
 * on entry instead, which is also what compact screens get.
 */
/** Cavity interior in SVG units. Must match CAV in CavityDiagram. */
const CAV_Y = 116
const CAV_H = 418

export default function HeroSpray() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const section = scope.current
      if (!section) return

      // Entrance is the same either way.
      if (!reduced) {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('[data-s-eyebrow]', { autoAlpha: 0, y: 14, duration: 0.6 }, 0.15)
          .from(
            '[data-s-line]',
            { yPercent: 115, duration: 1.05, stagger: 0.09, ease: 'power4.out' },
            0.25,
          )
          .from('[data-s-sub]', { autoAlpha: 0, y: 18, duration: 0.7 }, '-=0.45')
          .from('[data-s-cta] > *', { autoAlpha: 0, y: 16, duration: 0.55, stagger: 0.08 }, '-=0.4')
          .from('[data-s-trust] > *', { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.06 }, '-=0.3')
          .from(
            '[data-s-diagram]',
            { autoAlpha: 0, y: 40, scale: 0.96, duration: 1.1, ease: 'power3.out' },
            0.35,
          )
          .from('[data-s-cue]', { autoAlpha: 0, duration: 0.5 }, '-=0.4')
      }

      // --- Escaping air ------------------------------------------------
      // Runs on its own loop, not on the scrub: air leaks continuously while
      // the cavity is open, whether or not the visitor is moving. Each dot
      // crosses the cavity and is recycled.
      const escapeLoop = gsap.to('[data-cav-escape]', {
        x: -228,
        y: -34,
        opacity: 0,
        duration: 2.4,
        ease: 'none',
        repeat: -1,
        stagger: { each: 0.32, repeat: -1 },
      })

      /** Wires the scrubbable sealing sequence onto whatever trigger it is given. */
      const buildSequence = (tl: gsap.core.Timeline) => {
        // Foam rises: the mask scales up from the floor of the cavity.
        gsap.set('[data-cav-mask]', { transformOrigin: '50% 100%', scaleY: 0 })
        // Parked below the cavity floor. The lumpy edge has crests that rise
        // above its own baseline, so at zero offset they poke into an empty
        // cavity and it looks pre-filled before you have scrolled at all.
        gsap.set('[data-cav-edge]', { y: 34 })

        tl.to('[data-cav-mask]', { scaleY: 1, ease: 'none', duration: 1 }, 0)
          // The lumpy surface travels with the fill line.
          .to('[data-cav-edge]', { y: -CAV_H, ease: 'none', duration: 1 }, 0)

        // Each escaping dot is snuffed out at the moment the rising foam
        // reaches its row, so the leak stops from the bottom up rather than
        // all at once.
        gsap.utils.toArray<SVGCircleElement>('[data-cav-escape]').forEach((dot, i) => {
          const row = ESCAPE_ROWS[i] ?? ESCAPE_ROWS[0]
          const sealedAt = gsap.utils.clamp(0.05, 0.95, (CAV_Y + CAV_H - row) / CAV_H)
          tl.to(dot, { autoAlpha: 0, duration: 0.04, ease: 'power2.in' }, sealedAt)
        })

        // Nozzle runs across the cavity while the spraying beat is on.
        tl.fromTo(
          '[data-cav-nozzle]',
          // Clear of the top plate, which otherwise draws straight over it.
          { autoAlpha: 0, x: 105, y: 112 },
          { autoAlpha: 1, duration: 0.06 },
          0.2,
        )
          .to('[data-cav-nozzle]', { x: 315, ease: 'sine.inOut', duration: 0.34 }, 0.22)
          .to('[data-cav-nozzle]', { autoAlpha: 0, duration: 0.06 }, 0.58)

        // Draft arrows die as the foam passes their height, bottom one first.
        const arrowStops = [0.72, 0.46, 0.22]
        gsap.utils.toArray<SVGGElement>('[data-cav-arrow]').forEach((arrow, i) => {
          tl.to(arrow, { autoAlpha: 0, duration: 0.07, ease: 'power2.in' }, arrowStops[i])
        })

        // Cold gives way to warm once it is sealed.
        tl.to('[data-cav-cold]', { autoAlpha: 0, ease: 'none', duration: 0.25 }, 0.55)
          .to('[data-cav-warm]', { attr: { opacity: 0.55 }, ease: 'none', duration: 0.3 }, 0.7)

        // The payoff stamp, once nothing is getting out any more.
        tl.fromTo(
          '[data-cav-stamp]',
          { autoAlpha: 0, scale: 0.8, transformOrigin: '50% 50%' },
          { autoAlpha: 1, scale: 1, duration: 0.06, ease: 'back.out(2)' },
          0.85,
        )

        // Beat captions.
        heroSpray.beats.forEach((beat, i) => {
          const selector = `[data-s-beat="${i}"]`
          // The first beat is already on screen before anyone scrolls. Fading
          // it in from zero at position 0 meant that at rest the timeline sat
          // on the first frame of that fade, so the opening caption was blank
          // until you moved.
          if (i > 0) {
            tl.fromTo(
              selector,
              { autoAlpha: 0, y: 22 },
              { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' },
              beat.start,
            )
          }
          if (i < heroSpray.beats.length - 1) {
            tl.to(selector, { autoAlpha: 0, y: -18, duration: 0.05, ease: 'power2.in' }, beat.end)
          }
        })

        tl.fromTo('[data-s-rail]', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0)
      }

      if (reduced) {
        // Render the finished, sealed state. No pin, no scrub, no leak loop.
        escapeLoop.kill()
        gsap.set('[data-cav-escape]', { autoAlpha: 0 })
        gsap.set('[data-cav-stamp]', { autoAlpha: 1 })
        gsap.set('[data-cav-mask]', { transformOrigin: '50% 100%', scaleY: 1 })
        gsap.set('[data-cav-edge]', { y: -CAV_H })
        gsap.set('[data-cav-nozzle]', { autoAlpha: 0 })
        gsap.set('[data-cav-arrow]', { autoAlpha: 0 })
        gsap.set('[data-cav-cold]', { autoAlpha: 0 })
        gsap.set('[data-cav-warm]', { attr: { opacity: 0.55 } })
        gsap.set('[data-s-rail]', { scaleX: 1 })
        // Every beat stays readable. Showing only the last one meant a
        // reduced-motion visitor simply never received the other three, which
        // is losing content, not reducing motion.
        gsap.set('[data-s-beat]', { autoAlpha: 1, clearProps: 'transform' })
        return
      }

      const mm = gsap.matchMedia()

      // Anything that cannot pin still gets the sequence, played once on entry
      // rather than scrubbed, so the story is never simply missing.
      const playOnEntry = () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: '[data-s-diagram]', start: 'top 72%', once: true },
          defaults: { ease: 'none' },
        })
        buildSequence(tl)
        tl.duration(3.4)
      }

      mm.add({ big: '(min-width: 1024px) and (min-height: 760px)' }, (context) => {
        if (!context.conditions?.big) return
        // Falls through rather than returning: a viewport big enough to ask for
        // a pin but too short to hold one matched neither query before, so the
        // sequence never ran at all.
        if (section.offsetHeight > window.innerHeight + 2) {
          playOnEntry()
          return
        }
        buildSequence(
          gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=300%',
              pin: true,
              scrub: 0.7,
              anticipatePin: 1,
            },
          }),
        )
      })

      mm.add({ small: '(max-width: 1023px), (max-height: 759px)' }, (context) => {
        if (!context.conditions?.small) return
        playOnEntry()
      })

      return () => {
        escapeLoop.kill()
        mm.revert()
      }
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-ink py-[calc(var(--header-h)+2rem)]"
      aria-label="Introduction"
    >
      {/* Warm bloom behind the diagram. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(58% 52% at 72% 45%, rgb(var(--c-accent) / 0.16), transparent 68%)',
        }}
      />

      <div className="shell grid w-full items-center gap-12 lg:grid-cols-12 lg:gap-10">
        {/* ---------------- Copy, fixed for the whole pin ---------------- */}
        <div className="lg:col-span-6">
          <p data-s-eyebrow className="eyebrow !text-bone-200">
            {site.serviceArea}
          </p>

          <h1 className="mt-5 text-h1 font-semibold text-bone">
            {heroSpray.headlineLines.map((line, i) => (
              <span className="line-mask" key={line}>
                <span
                  className={`line-inner ${
                    i === heroSpray.accentLineIndex ? 'text-gradient-accent' : ''
                  }`}
                  data-s-line
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p data-s-sub className="mt-6 max-w-measure text-lead text-bone-200/85">
            {heroSpray.subhead}
          </p>

          <div data-s-cta className="mt-8 flex flex-wrap items-center gap-3">
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
            data-s-trust
            className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-small text-bone-200/80"
          >
            <span className="inline-flex items-center gap-2">
              <Stars label="Rated 5 stars by Victorian homeowners" />
              <span className="font-semibold text-bone">5.0</span>
            </span>
            <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
            <span className="font-semibold text-bone">
              {heroStat.headline} {heroStat.label}
            </span>
            <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
            <span>Family-owned · Carrum Downs</span>
          </div>

          <p
            data-s-cue
            className="mt-9 flex items-center gap-3 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400"
          >
            <ArrowDown className="size-4 animate-scroll-nudge text-accent" aria-hidden="true" />
            {heroSpray.scrollCue}
          </p>
        </div>

        {/* ---------------- The cavity ---------------- */}
        <div data-s-diagram className="lg:col-span-6">
          {/* Side by side only where there is room. At phone widths the
              diagram plus a flex-1 caption left the text about 80px wide and
              it overflowed the section. */}
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:gap-8">
            <CavityDiagram className="mx-auto h-[clamp(17rem,52vh,38rem)] w-auto shrink-0 drop-shadow-[0_30px_60px_rgb(0_0_0/0.55)] lg:mx-0" />

            {/* Beat captions. Swapped in place by the timeline, except under
                reduced motion where they stack and all stay visible. */}
            <div className={reduced ? 'w-full space-y-7' : 'relative min-h-[13rem] w-full lg:flex-1'}>
              {heroSpray.beats.map((beat, i) => (
                <div
                  key={beat.id}
                  data-s-beat={i}
                  className={[
                    reduced ? '' : 'absolute inset-x-0 top-0',
                    // Beat 01 is the resting state, so it must not start hidden.
                    reduced || i === 0 ? '' : 'opacity-0',
                  ].join(' ')}
                >
                  <p className="flex items-center gap-3 text-eyebrow font-bold uppercase tracking-[0.18em] text-accent">
                    <span className="tabular-nums">{beat.index}</span>
                    <span className="h-px w-8 bg-accent/60" aria-hidden="true" />
                  </p>
                  <p className="mt-3 font-display text-h3 font-semibold leading-tight text-bone">
                    {beat.label}
                  </p>
                  <p className="mt-3 text-small text-bone-400">{beat.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress rail */}
          <div className="mt-8 h-px w-full bg-line/12" aria-hidden="true">
            <div data-s-rail className="h-px origin-left scale-x-0 bg-accent" />
          </div>
        </div>
      </div>
    </section>
  )
}
