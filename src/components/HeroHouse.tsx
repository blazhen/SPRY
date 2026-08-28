import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Phone } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { heroHouse } from '@/data/content'
import { site } from '@/data/site'
import MagneticButton from '@/components/ui/MagneticButton'
import HouseSection, { type HouseSeason } from '@/components/HouseSection'
import Stars from '@/components/ui/Stars'

/**
 * "The House" hero.
 *
 * The single-cavity hero worked, so this keeps its mechanic and scales the
 * canvas: a whole house instead of one bay. Scrolling seals it zone by zone,
 * and the three zones are the actual residential services rather than an
 * invented sequence. The meter counts down through the customer's real before
 * and after reading as the envelope closes, so the payoff is a measured number
 * and not a claim.
 *
 * The headline, subhead and CTAs never move for the whole pin. Only the house,
 * the meter and the caption change.
 *
 * Every leak is heat leaving the building, drawn in one warm colour and always
 * pointing outward. An earlier diagram carried two opposing flows in a single
 * colour and read as a contradiction; one story here, one colour.
 *
 * The pin is gated on width, height and a runtime measurement. Where it will
 * not fit, and on compact screens, the same sequence plays once on entry.
 */
export default function HeroHouse() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  /**
   * The season runs on a timer rather than on scroll position. Scroll already
   * drives the sealing; tying the weather to it too would mean you could only
   * ever see one season per pass, and never the winter version of the sealed
   * house without scrolling back up.
   */
  const [season, setSeason] = useState<HouseSeason>('summer')
  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(
      () => setSeason((s) => (s === 'summer' ? 'winter' : 'summer')),
      9000,
    )
    return () => window.clearInterval(id)
  }, [reduced])

  useGSAP(
    () => {
      const section = scope.current
      if (!section) return

      const setMeter = (v: number) => {
        const el = section.querySelector('[data-h-meter]')
        if (el) el.textContent = v.toFixed(1)
      }

      // Deliberately NOT derived from the reading. 245.1 to 210 works out at
      // 14.3%, but 14.5% is the figure the customer reported and the figure
      // quoted everywhere else on this site. Deriving it put two percentages
      // one line apart that disagreed. The published number wins; the rounding
      // gap is the customer's, not ours to correct on screen.
      const setSaving = (v: number) => {
        const el = section.querySelector('[data-h-saving]')
        if (el) el.textContent = v.toFixed(1)
      }

      if (!reduced) {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('[data-h-eyebrow]', { autoAlpha: 0, y: 14, duration: 0.6 }, 0.15)
          .from(
            '[data-h-line]',
            { yPercent: 115, duration: 1.05, stagger: 0.09, ease: 'power4.out' },
            0.25,
          )
          .from('[data-h-sub]', { autoAlpha: 0, y: 18, duration: 0.7 }, '-=0.45')
          .from('[data-h-cta] > *', { autoAlpha: 0, y: 16, duration: 0.55, stagger: 0.08 }, '-=0.4')
          .from('[data-h-trust] > *', { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.06 }, '-=0.3')
          .from('[data-h-house]', { autoAlpha: 0, y: 40, duration: 1.1 }, 0.35)
          .from('[data-h-panel]', { autoAlpha: 0, x: 24, duration: 0.7 }, 0.7)
          .from('[data-h-cue]', { autoAlpha: 0, duration: 0.5 }, '-=0.4')
      }

      // --- Heat leaving the building ---------------------------------
      // Its own loop, not the scrub: a house leaks whether or not anyone is
      // scrolling. Every zone travels straight out of the building on the axis
      // it actually loses heat through, so there is one consistent reading:
      // up through the roof, sideways out of each wall, down through the floor.
      // These animate a bare inner group; see the note on `gust` in
      // CavityDiagram's sibling, HouseSection.
      const loops = [
        gsap.to('[data-h-leak="roof"] [data-h-wisp]', {
          y: -96,
          opacity: 0,
          duration: 2.3,
          ease: 'none',
          repeat: -1,
          stagger: 0.3,
        }),
        gsap.to('[data-h-leak="wall"] [data-h-wisp]', {
          // First three are the left wall and travel left; the rest are the
          // right wall and travel right. Both are leaving the building.
          x: (i: number) => (i < 3 ? -52 : 52),
          opacity: 0,
          duration: 2.1,
          ease: 'none',
          repeat: -1,
          stagger: 0.26,
        }),
        gsap.to('[data-h-leak="floor"] [data-h-wisp]', {
          y: 58,
          opacity: 0,
          duration: 2.4,
          ease: 'none',
          repeat: -1,
          stagger: 0.34,
        }),
      ]

      /** The sealing sequence, on whatever trigger it is handed. */
      const buildSequence = (tl: gsap.core.Timeline) => {
        // Foam reveals: each zone wipes in along the direction it is applied.
        gsap.set('[data-h-clip="roof"]', { transformOrigin: '50% 0%', scaleY: 0 })
        gsap.set('[data-h-clip="wall"]', { transformOrigin: '50% 100%', scaleY: 0 })
        gsap.set('[data-h-clip="floor"]', { transformOrigin: '0% 50%', scaleX: 0 })

        tl.to('[data-h-clip="roof"]', { scaleY: 1, duration: 0.2, ease: 'power2.out' }, 0.22)
          .to('[data-h-leak="roof"]', { autoAlpha: 0, duration: 0.1 }, 0.34)

          .to('[data-h-clip="wall"]', { scaleY: 1, duration: 0.18, ease: 'power2.out' }, 0.48)
          .to('[data-h-leak="wall"]', { autoAlpha: 0, duration: 0.1 }, 0.58)

          .to('[data-h-clip="floor"]', { scaleX: 1, duration: 0.14, ease: 'power2.out' }, 0.72)
          .to('[data-h-leak="floor"]', { autoAlpha: 0, duration: 0.08 }, 0.8)

          // The rooms warm and the windows light as the envelope closes.
          .fromTo('[data-h-tint-start]', { autoAlpha: 1 }, { autoAlpha: 0, ease: 'none', duration: 0.5 }, 0.4)
          .fromTo('[data-h-tint-end]', { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 0.5 }, 0.4)
          .fromTo(
            '[data-h-glow]',
            { attr: { opacity: 0 } },
            { attr: { opacity: 0.5 }, ease: 'none', duration: 0.45 },
            0.45,
          )

        // The meter and the saving, scrubbed together over the same window.
        const reading = { v: heroHouse.meter.from }
        const saving = { v: 0 }
        tl.to(
          reading,
          { v: heroHouse.meter.to, ease: 'none', duration: 0.68, onUpdate: () => setMeter(reading.v) },
          0.2,
        ).to(
          saving,
          { v: heroHouse.meter.savingTo, ease: 'none', duration: 0.68, onUpdate: () => setSaving(saving.v) },
          0.2,
        )

        // Captions.
        heroHouse.beats.forEach((beat, i) => {
          const selector = `[data-h-beat="${i}"]`
          // Beat 01 is the resting state, so it must not fade in from zero.
          if (i > 0) {
            tl.fromTo(
              selector,
              { autoAlpha: 0, y: 22 },
              { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' },
              beat.start,
            )
          }
          if (i < heroHouse.beats.length - 1) {
            tl.to(selector, { autoAlpha: 0, y: -18, duration: 0.05, ease: 'power2.in' }, beat.end)
          }
        })

        // Each segment fills across its own beat's window.
        heroHouse.beats.forEach((beat, i) => {
          tl.fromTo(
            `[data-h-seg="${i}"]`,
            { scaleX: 0 },
            { scaleX: 1, ease: 'none', duration: Math.max(0.05, beat.end - beat.start) },
            beat.start,
          )
        })
      }

      if (reduced) {
        // Finished, sealed state. No pin, no scrub, no leak loops.
        loops.forEach((l) => l.kill())
        gsap.set('[data-h-leak]', { autoAlpha: 0 })
        gsap.set('[data-h-clip="roof"]', { transformOrigin: '50% 0%', scaleY: 1 })
        gsap.set('[data-h-clip="wall"]', { transformOrigin: '50% 100%', scaleY: 1 })
        gsap.set('[data-h-clip="floor"]', { transformOrigin: '0% 50%', scaleX: 1 })
        gsap.set('[data-h-tint-start]', { autoAlpha: 0 })
        gsap.set('[data-h-tint-end]', { autoAlpha: 1 })
        gsap.set('[data-h-glow]', { attr: { opacity: 0.5 } })
        gsap.set('[data-h-seg]', { scaleX: 1 })
        // Every beat readable. Showing only the last would lose content.
        gsap.set('[data-h-beat]', { autoAlpha: 1, clearProps: 'transform' })
        setMeter(heroHouse.meter.to)
        setSaving(heroHouse.meter.savingTo)
        return
      }

      /** Plays once on entry. Used wherever the section cannot be pinned. */
      const playOnEntry = () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: '[data-h-house]', start: 'top 78%', once: true },
          defaults: { ease: 'none' },
        })
        buildSequence(tl)
        tl.duration(4)
      }

      // Set up synchronously. Deferring this to wait for settled layout was
      // tried and is worse: creating a pin after the triggers below it left
      // ScrollTrigger convinced the pin had already completed, and the section
      // rendered fixed and translated by the full pin distance at scroll zero.
      // The fit is handled by sizing the layout with headroom instead.
      const mm = gsap.matchMedia()

      {
          // --- Phones and small tablets ---------------------------------
        // The copy and the house are a full screen each here, so pin the house
        // block on its own rather than the whole section. Playing the sequence
        // once on entry, as this used to, meant the fill was over before the
        // house had finished arriving.
        mm.add({ small: '(max-width: 1023px)' }, (context) => {
          if (!context.conditions?.small) return
          const stage = section.querySelector<HTMLElement>('[data-h-stage]')
          if (!stage || stage.offsetHeight > window.innerHeight + 2) {
            playOnEntry()
            return
          }
          buildSequence(
            gsap.timeline({
              scrollTrigger: {
                trigger: stage,
                start: 'top top',
                end: '+=175%',
                pin: true,
                scrub: 0.7,
                anticipatePin: 1,
              },
            }),
          )
        })

        // --- Wide but too short to hold a pin --------------------------
        mm.add({ shortDesktop: '(min-width: 1024px) and (max-height: 759px)' }, (context) => {
          if (!context.conditions?.shortDesktop) return
          playOnEntry()
        })

        mm.add({ big: '(min-width: 1024px) and (min-height: 760px)' }, (context) => {
          if (!context.conditions?.big) return
          // The media query cannot know the rendered height. If the section
          // does not fit, fall through to the entry sequence rather than
          // returning: an earlier version returned here and the second query
          // did not match either, so on a viewport big enough to ask for a pin
          // but too short to hold one, nothing ran and the meter never moved.
          if (section.offsetHeight > window.innerHeight + 2) {
            playOnEntry()
            return
          }
          buildSequence(
            gsap.timeline({
              scrollTrigger: {
                trigger: section,
                start: 'top top',
                // Was 340%. Five beats over three and a half screens of scroll
                // read as slow and made it unclear anything was progressing.
                end: '+=210%',
                pin: true,
                scrub: 0.7,
                anticipatePin: 1,
              },
            }),
          )
        })

      }

      return () => {
        loops.forEach((l) => l.kill())
        mm.revert()
      }
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      // Desktop is one centred, pinned screen. Below lg the copy and the house
      // are a full screen each and only the house block is pinned, so the
      // section itself must be free to grow.
      className="relative isolate overflow-hidden bg-ink lg:flex lg:min-h-[100svh] lg:items-center lg:py-[calc(var(--header-h)+1rem)]"
      aria-label="Introduction"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 55% at 68% 45%, rgb(var(--c-accent) / 0.15), transparent 70%)',
        }}
      />

      {/* Copy on the left, house given the whole right side. The meter and the
          caption sit beneath the house rather than in a third column, which was
          squeezing the drawing into a narrow strip. */}
      <div className="shell grid w-full items-center gap-0 lg:grid-cols-12 lg:gap-10">
        {/* ---------------- Copy: its own screen on mobile ---------------- */}
        <div className="flex min-h-[100svh] flex-col justify-center pb-10 pt-[calc(var(--header-h)+2rem)] lg:col-span-4 lg:block lg:min-h-0 lg:py-0">
          <p data-h-eyebrow className="eyebrow !text-bone-200">
            {site.serviceArea}
          </p>

          {/* h2 scale, not h1. In a four-column well the h1 size wraps these
              lines, and a wrapped line breaks out of its clip mask and makes
              the copy column the tallest thing on the page. */}
          <h1 className="mt-5 text-h2 font-semibold text-bone">
            {heroHouse.headlineLines.map((line, i) => (
              <span className="line-mask" key={line}>
                <span
                  className={`line-inner ${
                    i === heroHouse.accentLineIndex ? 'text-gradient-accent' : ''
                  }`}
                  data-h-line
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p data-h-sub className="mt-6 max-w-measure text-lead text-bone-200/85">
            {heroHouse.subhead}
          </p>

          <div data-h-cta className="mt-8 flex flex-wrap items-center gap-3">
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
            data-h-trust
            className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-small text-bone-200/80"
          >
            <span className="inline-flex items-center gap-2">
              <Stars label="Rated 5 stars by Victorian homeowners" />
              <span className="font-semibold text-bone">5.0</span>
            </span>
            <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
            <span>Family-owned · Carrum Downs</span>
          </div>

          <p
            data-h-cue
            className="mt-9 flex items-center gap-3 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400"
          >
            <ArrowDown className="size-4 animate-scroll-nudge text-accent" aria-hidden="true" />
            {heroHouse.scrollCue}
          </p>
        </div>

        {/* ---------------- House and readouts: the pinned screen --------- */}
        <div
          data-h-stage
          className="flex min-h-[100svh] flex-col justify-center pb-10 lg:col-span-8 lg:block lg:min-h-0 lg:pb-0"
        >
          <div data-h-house>
            {/* Height-capped so the section still fits a 900px viewport and
                therefore still earns its pin. */}
            {/* Sized with headroom rather than to the limit. The runtime pin
                guard measures before layout has fully settled, so a section
                that only just fits can still end up pinned and clipped. */}
            {/* The caption strip is far shorter than the cards it replaced, so
                the house takes the reclaimed height. */}
            {/* Smaller share of the viewport on mobile, where the caption
                strip below it is two lines rather than one. */}
            {/* Trimmed on desktop to pay for the taller captions below, so the
                section still fits a 900px viewport and keeps its pin. */}
            <HouseSection season={season} className="mx-auto h-[clamp(13rem,42vh,24rem)] w-full max-w-5xl drop-shadow-[0_30px_60px_rgb(0_0_0/0.55)] lg:h-[clamp(15rem,min(53vh,calc(100svh-400px)),34rem)]" />
          </div>

          {/* A caption strip, not a pair of cards. Boxed and set at display
              size these read as heavier than the drawing they are annotating,
              which is backwards: the house is the subject. */}
          <div data-h-panel className="mt-4 border-t border-line/10 pt-3">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="text-eyebrow font-bold uppercase tracking-[0.16em] text-bone-400">
                {heroHouse.meter.label}
              </span>
              <span className="font-display text-h4 font-semibold tabular-nums text-bone">
                <span data-h-meter>{heroHouse.meter.from.toFixed(1)}</span>
                <span className="ml-1.5 font-body text-small font-medium text-bone-400">
                  {heroHouse.meter.unit}
                </span>
              </span>
              <span className="font-display text-h4 font-semibold tabular-nums text-accent">
                <span data-h-saving>0.0</span>%
                <span className="ml-1.5 font-body text-small font-medium text-bone-400">
                  {heroHouse.meter.savingLabel}
                </span>
              </span>
            </div>

            {/* The step is the loudest thing here now. At one uniform small
                size nothing announced that a beat had changed. */}
            <div className={reduced ? 'mt-4 space-y-6' : 'relative mt-4 min-h-[7.5rem] w-full'}>
              {heroHouse.beats.map((beat, i) => (
                <div
                  key={beat.id}
                  data-h-beat={i}
                  className={[
                    'max-w-3xl',
                    reduced ? '' : 'absolute inset-x-0 top-0',
                    reduced || i === 0 ? '' : 'opacity-0',
                  ].join(' ')}
                >
                  <p className="flex items-baseline gap-3">
                    <span className="font-display text-h3 font-semibold leading-none tabular-nums text-accent">
                      {beat.index}
                    </span>
                    <span className="font-body text-small font-semibold text-bone-400">
                      / {String(heroHouse.beats.length).padStart(2, '0')}
                    </span>
                    <span className="font-display text-h3 font-semibold leading-none text-bone">
                      {beat.label}
                    </span>
                  </p>
                  <p className="mt-3 text-small text-bone-400">{beat.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* One segment per beat rather than a single rail, so how far through
              the sequence you are is countable at a glance. */}
          <div className="mt-4 flex items-center gap-2" aria-hidden="true">
            {heroHouse.beats.map((beat, i) => (
              <span key={beat.id} className="h-1 flex-1 overflow-hidden rounded-pill bg-line/12">
                <span
                  data-h-seg={i}
                  className="block size-full origin-left scale-x-0 bg-accent"
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
