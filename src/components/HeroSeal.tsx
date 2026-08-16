import { Suspense, lazy, useRef } from 'react'
import { ArrowDown, ArrowUpRight, Phone } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useIsCompact } from '@/hooks/useMediaQuery'
import { heroSeal } from '@/data/content'
import { site } from '@/data/site'
import MagneticButton from '@/components/ui/MagneticButton'
import SealCrossSection from '@/components/SealCrossSection'

/** Three.js only downloads for the viewers who will actually get the flythrough. */
const SealScene = lazy(() => import('@/three/SealScene'))

/**
 * "The Seal" hero.
 *
 * Spray foam's value is invisible, so the hero goes and looks at it: the camera
 * flies into and through a wall cross-section as you scroll, cold outside to
 * sealed to warm inside. Four beats, each carrying one real benefit.
 *
 * One pinned ScrollTrigger scrubs one timeline. That timeline animates a plain
 * object holding scroll progress, which the 3D scene reads every frame, and in
 * the same pass it drives the DOM overlays. So there is a single source of
 * timing for copy and camera, and scrolling causes zero React re-renders.
 *
 * Beat windows live in `heroSeal.beats` as start/end fractions, so retiming the
 * choreography is a data edit rather than a hunt through two files.
 *
 * Compact viewports and prefers-reduced-motion never load Three at all. They
 * get a stepped walk through the same five layers using the flat SVG section,
 * which is also the Suspense poster, so the subject is on screen from the very
 * first paint rather than a spinner.
 */
export default function HeroSeal() {
  const scope = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const reduced = useReducedMotion()
  const compact = useIsCompact()

  const flythrough = !reduced && !compact

  useGSAP(
    () => {
      if (!flythrough) {
        // Stepped fallback: cheap fades, no pin, no WebGL.
        if (reduced) return
        gsap.utils.toArray<HTMLElement>('[data-seal-step]').forEach((step) => {
          gsap.from(step, {
            autoAlpha: 0,
            y: 34,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: step, start: 'top 82%', once: true },
          })
        })
        return
      }

      // --- Entrance, before any scrolling ---
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-seal-eyebrow]', { autoAlpha: 0, y: 16, duration: 0.7 }, 0.2)
        .from(
          '[data-seal-line]',
          { yPercent: 118, filter: 'blur(12px)', duration: 1.15, stagger: 0.1, ease: 'power4.out' },
          0.3,
        )
        .from('[data-seal-sub]', { autoAlpha: 0, y: 20, duration: 0.8 }, '-=0.5')
        .from('[data-seal-cta] > *', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.08 }, '-=0.5')
        .from('[data-seal-cue]', { autoAlpha: 0, duration: 0.6 }, '-=0.3')
        .set('[data-seal-line]', { clearProps: 'filter' })

      // --- The pinned scrub ---
      const state = { value: 0 }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope.current,
          start: 'top top',
          end: '+=350%',
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
        },
      })

      // Timeline duration is exactly 1, so every later position below reads as
      // a scroll-progress fraction and matches the numbers in the data file.
      tl.to(
        state,
        {
          value: 1,
          duration: 1,
          ease: 'none',
          onUpdate: () => {
            progress.current = state.value
          },
        },
        0,
      )

      // Intro clears out as the journey starts.
      tl.to('[data-seal-intro]', { autoAlpha: 0, y: -40, duration: 0.08, ease: 'power2.in' }, 0.02)
      tl.to('[data-seal-cue]', { autoAlpha: 0, duration: 0.05 }, 0.02)

      // Each beat owns its window.
      heroSeal.beats.forEach((beat, i) => {
        const selector = `[data-beat="${i}"]`
        tl.fromTo(
          selector,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' },
          beat.start,
        )
        // The final beat is the hand-off into the page, so it stays put.
        if (i < heroSeal.beats.length - 1) {
          tl.to(selector, { autoAlpha: 0, y: -22, duration: 0.05, ease: 'power2.in' }, beat.end)
        }

        // Count-up, scrubbed: the number climbs as you scroll rather than
        // firing once, which is the whole reason it sits on this timeline.
        if (beat.stat) {
          const counter = { n: 0 }
          tl.to(
            counter,
            {
              n: beat.stat.value,
              duration: Math.max(0.08, beat.end - beat.start - 0.06),
              ease: 'none',
              onUpdate: () => {
                const el = scope.current?.querySelector('[data-seal-stat]')
                if (el) el.textContent = counter.n.toFixed(1)
              },
            },
            beat.start + 0.02,
          )
        }
      })

      // Passing through the material. The camera crosses from the cavity to the
      // interior between beats 2 and 3, and any camera inside solid geometry
      // renders its inside faces as a smear. Rather than route around it, own
      // it: a brief warm blackout reads as going through the wall and costs one
      // DOM tween instead of a transparency dance across four materials.
      tl.to('[data-seal-through]', { autoAlpha: 1, duration: 0.05, ease: 'power2.in' }, 0.56)
      tl.to('[data-seal-through]', { autoAlpha: 0, duration: 0.06, ease: 'power2.out' }, 0.65)

      // Progress rail along the bottom.
      tl.fromTo('[data-seal-rail]', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0)

      // Hand-off: the scene dissolves and a warm wash takes over, so the hero
      // resolves into the page rather than simply stopping.
      tl.to('[data-seal-canvas]', { autoAlpha: 0, duration: 0.08, ease: 'power2.in' }, 0.93)
      tl.fromTo('[data-seal-warm]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.85)
    },
    { scope, dependencies: [flythrough, reduced] },
  )

  // ---------------------------------------------------------------------
  // Compact / reduced-motion: stepped reveal, no WebGL
  // ---------------------------------------------------------------------
  if (!flythrough) {
    return (
      <section ref={scope} className="relative bg-ink" aria-label="Introduction">
        <div className="shell flex min-h-[88svh] flex-col justify-end pb-14 pt-[calc(var(--header-h)+3rem)]">
          <p className="eyebrow !text-bone-200">{site.serviceArea}</p>
          <h1 className="mt-5 text-display font-semibold text-bone">
            {heroSeal.headlineLines.map((line, i) => (
              <span className="line-mask" key={line}>
                <span
                  className={`line-inner ${i === heroSeal.accentLineIndex ? 'text-gradient-accent' : ''}`}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-measure text-lead text-bone-200/85">{heroSeal.subhead}</p>

          <div data-seal-cta className="mt-8 flex flex-wrap items-center gap-3">
            <MagneticButton href={site.cta.primary.href} variant="primary" strength={0.3}>
              {site.cta.primary.label}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </MagneticButton>
            <MagneticButton
              href={site.phone.tel}
              variant="ghost"
              strength={0.22}
              ariaLabel={`Call Spray It Solutions on ${site.phone.display}`}
            >
              <Phone className="size-4" aria-hidden="true" />
              {site.cta.secondary.label}
            </MagneticButton>
          </div>

          <SealCrossSection className="mt-12 w-full" active={-1} />
        </div>

        {/* Stepped walk through the beats. */}
        <div className="shell space-y-4 pb-section">
          {heroSeal.beats.map((beat) => (
            <article
              key={beat.id}
              data-seal-step
              className="rounded-lg border border-white/10 bg-ink-800 p-7"
            >
              <p className="flex items-baseline gap-4">
                <span className="font-body text-eyebrow font-bold tracking-[0.18em] text-accent">
                  {beat.index}
                </span>
                <span className="font-display text-h3 font-semibold text-bone">{beat.label}</span>
              </p>
              <p className="mt-3 max-w-measure text-body text-bone-400">{beat.note}</p>
              {beat.stat && (
                <p className="mt-5 font-display text-h2 font-semibold text-accent">
                  {beat.stat.value}
                  {beat.stat.suffix}{' '}
                  <span className="text-h4 text-bone-400">{beat.stat.caption}</span>
                </p>
              )}
              <SealCrossSection className="mt-6 w-full" active={beat.layer} bare />
            </article>
          ))}
        </div>
      </section>
    )
  }

  // ---------------------------------------------------------------------
  // Full fly-through
  // ---------------------------------------------------------------------
  return (
    <section
      ref={scope}
      className="relative h-[100svh] overflow-hidden bg-ink"
      aria-label="Introduction"
    >
      {/* --- 3D --- */}
      <div data-seal-canvas className="absolute inset-0">
        <Suspense
          fallback={
            <div className="grid size-full place-items-center bg-ink px-gutter">
              <SealCrossSection className="w-full max-w-3xl opacity-60" />
            </div>
          }
        >
          <SealScene progressRef={progress} reducedMotion={reduced} />
        </Suspense>
      </div>

      {/* Covers the moment the camera crosses through the wall itself. */}
      <div
        data-seal-through
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 50%, rgb(var(--c-accent) / 0.22), rgb(var(--c-ink)) 72%)',
        }}
      />

      {/* Warm wash for the hand-off into the page below. */}
      <div
        data-seal-warm
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 60%, rgb(var(--c-accent) / 0.30), transparent 70%), linear-gradient(to bottom, transparent 40%, rgb(var(--c-ink)) 96%)',
        }}
      />

      {/* Readability scrim, bottom-weighted so the copy always sits on ink. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgb(var(--c-ink)) 2%, rgb(var(--c-ink) / 0.82) 24%, transparent 58%)',
        }}
      />

      {/* --- Overlays --- */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end pb-14">
        <div className="shell relative w-full">
          {/* Intro */}
          <div data-seal-intro className="pointer-events-auto max-w-3xl">
            <p data-seal-eyebrow className="eyebrow !text-bone-200">
              {site.serviceArea}
            </p>

            <h1 className="mt-5 text-display font-semibold text-bone">
              {heroSeal.headlineLines.map((line, i) => (
                <span className="line-mask" key={line}>
                  <span
                    className={`line-inner ${
                      i === heroSeal.accentLineIndex ? 'text-gradient-accent' : ''
                    }`}
                    data-seal-line
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p data-seal-sub className="mt-6 max-w-measure text-lead text-bone-200/85">
              {heroSeal.subhead}
            </p>

            <div data-seal-cta className="mt-8 flex flex-wrap items-center gap-3">
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
          </div>

          {/* Beats, stacked in the same spot and swapped by the timeline. */}
          <div className="pointer-events-none absolute inset-x-[var(--gutter)] bottom-0">
            {heroSeal.beats.map((beat, i) => (
              <div
                key={beat.id}
                data-beat={i}
                className="absolute bottom-0 left-0 max-w-2xl opacity-0"
              >
                <p className="flex items-center gap-3 text-eyebrow font-bold uppercase tracking-[0.18em] text-accent">
                  <span className="tabular-nums">{beat.index}</span>
                  <span className="h-px w-10 bg-accent/60" aria-hidden="true" />
                </p>

                <p className="mt-4 font-display text-h2 font-semibold leading-[0.98] text-bone">
                  {beat.label}
                </p>
                <p className="mt-4 max-w-measure text-body text-bone-200/80">{beat.note}</p>

                {beat.stat && (
                  <p className="mt-5 font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none text-accent">
                    <span data-seal-stat className="tabular-nums">
                      {beat.stat.value.toFixed(1)}
                    </span>
                    {beat.stat.suffix}
                    <span className="ml-3 align-middle font-body text-h4 font-semibold text-bone-200">
                      {beat.stat.caption}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="shell mt-10">
          <p
            data-seal-cue
            className="flex items-center gap-3 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400"
          >
            <ArrowDown className="size-4 animate-scroll-nudge text-accent" aria-hidden="true" />
            {heroSeal.scrollCue}
          </p>
        </div>

        {/* Progress rail */}
        <div className="shell mt-6">
          <div className="h-px w-full bg-white/12" aria-hidden="true">
            <div data-seal-rail className="h-px origin-left scale-x-0 bg-accent" />
          </div>
        </div>
      </div>
    </section>
  )
}
