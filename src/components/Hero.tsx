import { useRef } from 'react'
import { Phone, ArrowDown, ArrowUpRight, TrendingDown, Crosshair } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { hero } from '@/data/content'
import { site } from '@/data/site'
import { heroStat } from '@/data/stats'
import { unsplash, unsplashSrcSet } from '@/lib/images'
import MagneticButton from '@/components/ui/MagneticButton'
import ThermalFilter from '@/components/ThermalFilter'
import Stars from '@/components/ui/Stars'

/**
 * The hero.
 *
 * The idea: an insulation company sells something invisible, so let the visitor
 * see it. A thermal-camera lens floats over the photograph of the house and
 * reveals a heat-mapped version underneath. It drifts on its own from load, and
 * follows the pointer the moment you move. The product story is the hero
 * interaction, not decoration bolted onto one.
 *
 * Layering, back to front:
 *   1. Parallax plate    scrubbed by ScrollTrigger as the hero leaves
 *   2. Photograph        slow Ken Burns push
 *   3. Thermal plate     same image through an SVG colour LUT, clipped to a circle
 *   4. Lens chrome       ring, crosshair, rotating dashed ring
 *   5. Scrim + content   readability gradient, masked headline, CTAs
 *
 * The lens is driven by CSS custom properties (--lens-x/y/r) updated from a
 * single gsap.ticker callback. No React state, so pointer movement never
 * triggers a re-render.
 *
 * Under prefers-reduced-motion the lens is parked as a static circle: the idea
 * still reads, with nothing moving at all.
 */
export default function Hero() {
  const scope = useRef<HTMLElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const plate = plateRef.current
      if (!plate) return

      // --- Reduced motion: park the lens, render everything else finished ---
      if (reduced) {
        // Already expressed in photo space (see toPhotoSpace below).
        const host = scope.current
        host?.style.setProperty('--lens-x', '69%')
        host?.style.setProperty('--lens-y', '47%')
        host?.style.setProperty('--lens-r', '230px')
        return
      }

      // --- Lens state. Targets are lerped toward every frame. ---------------
      const lensRadius = () => Math.min(320, Math.max(148, window.innerWidth * 0.16))

      // On narrow screens the content column runs the full width, so the drift
      // is kept high and right to stay clear of the CTAs. On desktop it has the
      // whole right-hand side of the photograph to play in.
      const narrow = window.innerWidth < 1024
      const start = narrow ? { x: 0.56, y: 0.26 } : { x: 0.57, y: 0.43 }
      const end = narrow ? { x: 0.82, y: 0.38 } : { x: 0.84, y: 0.6 }

      const s = { tx: start.x, ty: start.y, x: start.x, y: start.y, tr: 0, r: 0 }

      // Pointer fractions are measured against the section, but the lens is
      // drawn inside the photo element, which is inset by -8% on every side to
      // give the parallax something to travel over. Convert between the two
      // boxes or the lens lands consistently off-target.
      const OVERSCAN = 0.08 // must match the -inset-[8%] on [data-hero-photo]
      const toPhotoSpace = (f: number) => (f + OVERSCAN) / (1 + OVERSCAN * 2)

      const host = scope.current
      const tick = () => {
        if (!host) return
        s.x += (s.tx - s.x) * 0.14
        s.y += (s.ty - s.y) * 0.14
        s.r += (s.tr - s.r) * 0.1
        host.style.setProperty('--lens-x', `${toPhotoSpace(s.x) * 100}%`)
        host.style.setProperty('--lens-y', `${toPhotoSpace(s.y) * 100}%`)
        host.style.setProperty('--lens-r', `${s.r}px`)
      }
      gsap.ticker.add(tick)

      // Slow sweep across the house so the effect demonstrates itself before
      // the visitor touches anything. Paused while the pointer is driving.
      // Kept clear of the headline column so the drift never washes over the
      // type. Pointer control is free to go anywhere.
      const idle = gsap
        .timeline({ repeat: -1, yoyo: true, defaults: { duration: 7, ease: 'sine.inOut' } })
        .to(s, { tx: end.x, ty: end.y })

      // Open the lens once the headline has landed.
      const open = gsap.to(s, { tr: lensRadius() * 0.9, duration: 1.3, delay: 1.5, ease: 'power2.out' })

      const onPointerMove = (event: PointerEvent) => {
        const rect = plate.getBoundingClientRect()
        idle.pause()
        s.tx = (event.clientX - rect.left) / rect.width
        s.ty = (event.clientY - rect.top) / rect.height
        s.tr = lensRadius()
      }
      const onPointerLeave = () => {
        // Hand control back to the drift rather than snapping the lens shut.
        s.tr = lensRadius() * 0.9
        idle.resume()
      }
      const onResize = () => {
        s.tr = s.tr > 0 ? lensRadius() * (idle.paused() ? 1 : 0.9) : 0
      }

      const section = scope.current
      section?.addEventListener('pointermove', onPointerMove)
      section?.addEventListener('pointerleave', onPointerLeave)
      window.addEventListener('resize', onResize)

      // --- Entrance ------------------------------------------------------
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('[data-hero-photo]', { scale: 1.24, duration: 2.2, ease: 'power2.out' })
        .from('[data-hero-scrim]', { autoAlpha: 0, duration: 1.4 }, 0)
        .from('[data-hero-eyebrow]', { autoAlpha: 0, y: 18, duration: 0.8 }, 0.3)
        .from(
          '[data-hero-line]',
          { yPercent: 118, filter: 'blur(14px)', duration: 1.25, stagger: 0.11, ease: 'power4.out' },
          0.42,
        )
        .from('[data-hero-sub]', { autoAlpha: 0, y: 22, duration: 0.9 }, '-=0.55')
        .from('[data-hero-cta] > *', { autoAlpha: 0, y: 20, duration: 0.7, stagger: 0.09 }, '-=0.55')
        .from('[data-hero-trust] > *', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.07 }, '-=0.4')
        .from('[data-hero-stat]', { autoAlpha: 0, y: 28, scale: 0.96, duration: 0.9 }, '-=0.6')
        .from('[data-hero-hud]', { autoAlpha: 0, x: 20, duration: 0.8 }, '-=0.7')
        .from('[data-hero-cue]', { autoAlpha: 0, duration: 0.6 }, '-=0.35')
        .set('[data-hero-line]', { clearProps: 'filter' })

      // Endless slow push on the photograph itself, kept on its own element so
      // it never fights the scrubbed parallax for the same transform matrix.
      gsap.to('[data-hero-photo]', {
        scale: 1.12,
        duration: 20,
        ease: 'none',
        repeat: -1,
        yoyo: true,
        delay: 2.2,
      })

      // --- Scroll-out ----------------------------------------------------
      gsap
        .timeline({
          scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.8 },
        })
        .to('[data-hero-plate]', { yPercent: 22, ease: 'none' }, 0)
        .to('[data-hero-scrim]', { opacity: 1, ease: 'none' }, 0)
        .to('[data-hero-content]', { yPercent: -18, autoAlpha: 0, scale: 0.94, ease: 'none' }, 0)
        .to('[data-hero-hud]', { autoAlpha: 0, ease: 'none', duration: 0.3 }, 0)
        .to('[data-hero-cue]', { autoAlpha: 0, ease: 'none', duration: 0.25 }, 0)

      return () => {
        gsap.ticker.remove(tick)
        idle.kill()
        open.kill()
        tl.kill()
        section?.removeEventListener('pointermove', onPointerMove)
        section?.removeEventListener('pointerleave', onPointerLeave)
        window.removeEventListener('resize', onResize)
      }
    },
    { scope, dependencies: [reduced] },
  )

  const photoSrc = unsplash(hero.background.id, 2000, 76)

  return (
    <section
      ref={scope}
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-ink pb-12 pt-[calc(var(--header-h)+3rem)] lg:pb-16"
      aria-label="Introduction"
      style={
        {
          '--lens-x': '57%',
          '--lens-y': '43%',
          '--lens-r': '0px',
        } as React.CSSProperties
      }
    >
      <ThermalFilter />

      {/* ---------- Parallax plate: photograph + thermal reveal ---------- */}
      <div ref={plateRef} data-hero-plate className="absolute inset-0 -z-20 will-change-transform">
        <div data-hero-photo className="absolute -inset-[8%] will-change-transform">
          {/* TODO: client to replace with real project photo */}
          <img
            src={photoSrc}
            srcSet={unsplashSrcSet(hero.background.id, [960, 1440, 1920, 2400])}
            sizes="100vw"
            alt={hero.background.alt}
            {...({ fetchpriority: 'high' } as Record<string, string>)}
            decoding="async"
            className="size-full object-cover"
          />

          {/* Thermal copy of the very same image, so it is a cache hit rather
              than a second download. Clipped to the lens circle. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              clipPath: 'circle(var(--lens-r) at var(--lens-x) var(--lens-y))',
              // Extra punch on top of the LUT so hot spots survive the scrim.
              filter: 'url(#thermal-lut) saturate(1.3) contrast(1.12) brightness(1.08)',
            }}
          >
            <img src={photoSrc} alt="" aria-hidden="true" className="size-full object-cover" />
          </div>

          {/* ---------- Lens chrome ----------
              Deliberately a sibling of the thermal layer inside the photo
              element: they then share one coordinate space and one transform
              chain, so the ring tracks the reveal exactly through both the Ken
              Burns scale and the scroll parallax. Placing it above the scrim
              would buy a little contrast and cost alignment. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: 'var(--lens-x)',
              top: 'var(--lens-y)',
              width: 'calc(var(--lens-r) * 2)',
              height: 'calc(var(--lens-r) * 2)',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="absolute inset-0 rounded-full border-2 border-accent/80 shadow-[0_0_90px_-8px_rgb(var(--c-accent)/0.9)]" />
            <div className="absolute -inset-4 animate-spin-slow rounded-full border border-dashed border-accent/35" />
            <Crosshair className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-accent/70" />
          </div>
        </div>
      </div>

      {/* ---------- Readability scrim ---------- */}
      <div
        data-hero-scrim
        aria-hidden="true"
        className="grain absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            'linear-gradient(to top, rgb(var(--c-ink)) 4%, rgb(var(--c-ink) / 0.88) 26%, rgb(var(--c-ink) / 0.30) 58%, rgb(var(--c-ink) / 0.62) 100%), radial-gradient(78% 58% at 8% 88%, rgb(var(--c-accent) / 0.20), transparent 62%)',
        }}
      />

      {/* ---------- Thermal HUD ---------- */}
      <div
        data-hero-hud
        className="pointer-events-none absolute right-[var(--gutter)] top-[calc(var(--header-h)+1.5rem)] z-10 hidden w-56 rounded-lg border border-line/12 bg-ink/60 p-4 backdrop-blur-xl md:block"
      >
        <p className="flex items-center gap-2 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          {hero.thermal.badge}
        </p>
        {/* Colour key, matching the LUT in ThermalFilter. */}
        <div
          className="mt-3 h-1.5 w-full rounded-pill"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to right, #0a0533, #3d0d7a, #9e2470, #f28c1a, #ffe040, #fffad1)',
          }}
        />
        <div className="mt-1.5 flex justify-between text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-bone-400">
          <span>Cold</span>
          <span>Hot</span>
        </div>
        <p className="mt-3 text-small font-semibold text-accent">{hero.thermal.reading}</p>
      </div>

      {/* ---------- Content ---------- */}
      <div data-hero-content className="shell relative w-full">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-7">
            <p data-hero-eyebrow className="eyebrow !text-bone-200">
              {site.serviceArea}
            </p>

            <h1 className="mt-5 text-display font-semibold text-bone">
              {hero.headlineLines.map((line, i) => (
                <span className="line-mask" key={line}>
                  <span
                    className={`line-inner ${i === hero.accentLineIndex ? 'text-gradient-accent' : ''}`}
                    data-hero-line
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p data-hero-sub className="mt-6 max-w-measure text-lead text-bone-200/85">
              {hero.subhead}
            </p>

            <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
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
              data-hero-trust
              className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-small text-bone-200/80"
            >
              <span className="inline-flex items-center gap-2">
                <Stars label={hero.trust.ratingLabel} />
                <span className="font-semibold text-bone">5.0</span>
              </span>
              <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
              <span className="inline-flex items-center gap-2 font-semibold text-bone">
                <TrendingDown className="size-4 text-accent" aria-hidden="true" />
                {hero.trust.stat}
              </span>
              <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
              <span>{hero.trust.provenance}</span>
            </div>
          </div>

          {/* --- Measured-result card --- */}
          <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
            <figure
              data-hero-stat
              className="w-full max-w-sm rounded-xl border border-line/12 bg-ink/55 p-6 backdrop-blur-xl sm:p-7"
            >
              <figcaption className="flex items-center gap-2 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                Measured result
              </figcaption>

              <p className="mt-5 font-display text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none tracking-tight text-accent">
                {heroStat.headline}
              </p>
              <p className="mt-2 text-h4 font-semibold text-bone">{heroStat.label}</p>

              <span
                className="mt-6 block h-px w-full bg-gradient-to-r from-line/15 to-accent"
                aria-hidden="true"
              />
              <p className="mt-4 text-small text-bone-400">{heroStat.detail}</p>
            </figure>
          </div>
        </div>

        {/* --- Scroll cue + lens hint --- */}
        <div
          data-hero-cue
          className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400"
        >
          <span className="inline-flex items-center gap-3">
            <ArrowDown className="size-4 animate-scroll-nudge text-accent" aria-hidden="true" />
            {hero.scrollCue}
            <span
              className="h-px w-16 bg-gradient-to-r from-accent to-transparent"
              aria-hidden="true"
            />
          </span>
          <span className="hidden text-bone-400/70 lg:inline">{hero.thermal.hint}</span>
          <span className="text-bone-400/70 lg:hidden">{hero.thermal.hintTouch}</span>
        </div>
      </div>
    </section>
  )
}
