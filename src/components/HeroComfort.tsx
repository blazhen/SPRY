import { useRef } from 'react'
import { ArrowDown, ArrowUpRight, Phone, Snowflake, Flame, MoveHorizontal } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { heroComfort } from '@/data/content'
import { site } from '@/data/site'
import { heroStat } from '@/data/stats'
import { unsplash, unsplashSrcSet } from '@/lib/images'
import MagneticButton from '@/components/ui/MagneticButton'
import Stars from '@/components/ui/Stars'

/**
 * The comfort hero.
 *
 * Nobody buys insulation. They buy a house that is warm in July and a heater
 * that runs half as often. So the hero shows the outcome, not the mechanism:
 * the same room either side of a divider, one cold winter and one warm one.
 *
 * It is a single photograph graded two ways rather than two photographs. That
 * guarantees the halves line up pixel for pixel, which is what makes the
 * comparison read as honest rather than as two different rooms.
 *
 * The divider position lives in a CSS custom property updated from one
 * gsap.ticker callback, so dragging never re-renders React. It drifts on its
 * own after load to show it is draggable, and yields the moment it is grabbed.
 *
 * Accessibility: the handle is a real slider. It takes focus, reports its
 * value, and responds to arrow keys, Home and End, so the comparison is not
 * mouse-only. Pointer tracking across the whole section is limited to fine
 * pointers, so a touch drag can never fight the page scroll.
 */
export default function HeroComfort() {
  const scope = useRef<HTMLElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const section = scope.current
      if (!section) return

      // 0 to 100, as a percentage across the frame.
      const s = { target: 52, current: 52 }
      let announced = 52

      const commit = () => {
        section.style.setProperty('--split', `${s.current}%`)
        const rounded = Math.round(s.current)
        // Keep assistive tech in step without a re-render per frame.
        if (Math.abs(rounded - announced) >= 1) {
          announced = rounded
          handleRef.current?.setAttribute('aria-valuenow', String(rounded))
        }
      }

      if (reduced) {
        s.current = 52
        commit()
        return
      }

      const tick = () => {
        s.current += (s.target - s.current) * 0.12
        commit()
      }
      gsap.ticker.add(tick)

      // Shows the control off before anyone touches it.
      const idle = gsap
        .timeline({ repeat: -1, yoyo: true, defaults: { duration: 3.6, ease: 'sine.inOut' } })
        .to(s, { target: 68 }, 1.4)
        .to(s, { target: 36 })

      const setFromClientX = (clientX: number) => {
        const rect = section.getBoundingClientRect()
        s.target = gsap.utils.clamp(4, 96, ((clientX - rect.left) / rect.width) * 100)
      }

      // --- Pointer, fine pointers only -------------------------------
      const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      const onPointerMove = (event: PointerEvent) => {
        idle.pause()
        setFromClientX(event.clientX)
      }
      const onPointerLeave = () => idle.resume()
      if (fine) {
        section.addEventListener('pointermove', onPointerMove)
        section.addEventListener('pointerleave', onPointerLeave)
      }

      // --- Dragging the handle itself, which is how touch works ------
      const handle = handleRef.current
      let dragging = false
      const onDown = (event: PointerEvent) => {
        dragging = true
        idle.pause()
        handle?.setPointerCapture(event.pointerId)
        setFromClientX(event.clientX)
      }
      const onMove = (event: PointerEvent) => {
        if (!dragging) return
        // Only now do we own the gesture, so vertical scrolling still works
        // right up until the visitor actually takes hold of the handle.
        event.preventDefault()
        setFromClientX(event.clientX)
      }
      const onUp = (event: PointerEvent) => {
        dragging = false
        handle?.releasePointerCapture(event.pointerId)
      }

      handle?.addEventListener('pointerdown', onDown)
      handle?.addEventListener('pointermove', onMove)
      handle?.addEventListener('pointerup', onUp)
      handle?.addEventListener('pointercancel', onUp)

      // --- Keyboard --------------------------------------------------
      const onKeyDown = (event: KeyboardEvent) => {
        const step = event.shiftKey ? 10 : 4
        let next: number | null = null
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = s.target - step
        else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = s.target + step
        else if (event.key === 'Home') next = 4
        else if (event.key === 'End') next = 96
        if (next === null) return
        event.preventDefault()
        idle.pause()
        s.target = gsap.utils.clamp(4, 96, next)
      }
      handle?.addEventListener('keydown', onKeyDown)

      // --- Entrance ---------------------------------------------------
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-c-photo]', { scale: 1.16, duration: 1.9, ease: 'power2.out' })
        .from('[data-c-eyebrow]', { autoAlpha: 0, y: 16, duration: 0.7 }, 0.25)
        .from(
          '[data-c-line]',
          { yPercent: 118, filter: 'blur(12px)', duration: 1.15, stagger: 0.1, ease: 'power4.out' },
          0.35,
        )
        .from('[data-c-sub]', { autoAlpha: 0, y: 20, duration: 0.8 }, '-=0.55')
        .from('[data-c-cta] > *', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.08 }, '-=0.5')
        .from('[data-c-trust] > *', { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.06 }, '-=0.35')
        .from('[data-c-chip]', { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.1 }, '-=0.5')
        .from('[data-c-divider]', { autoAlpha: 0, duration: 0.7 }, '-=0.6')
        .from('[data-c-cue]', { autoAlpha: 0, duration: 0.5 }, '-=0.3')
        .set('[data-c-line]', { clearProps: 'filter' })

      // --- Parallax out ------------------------------------------------
      gsap
        .timeline({
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: 0.8 },
        })
        .to('[data-c-plate]', { yPercent: 18, ease: 'none' }, 0)
        .to('[data-c-content]', { yPercent: -16, autoAlpha: 0, ease: 'none' }, 0)

      return () => {
        gsap.ticker.remove(tick)
        idle.kill()
        if (fine) {
          section.removeEventListener('pointermove', onPointerMove)
          section.removeEventListener('pointerleave', onPointerLeave)
        }
        handle?.removeEventListener('pointerdown', onDown)
        handle?.removeEventListener('pointermove', onMove)
        handle?.removeEventListener('pointerup', onUp)
        handle?.removeEventListener('pointercancel', onUp)
        handle?.removeEventListener('keydown', onKeyDown)
      }
    },
    { scope, dependencies: [reduced] },
  )

  const src = unsplash(heroComfort.room.id, 2000, 78)
  const srcSet = unsplashSrcSet(heroComfort.room.id, [960, 1440, 1920, 2400])

  return (
    <section
      ref={scope}
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-ink pb-12 pt-[calc(var(--header-h)+3rem)] lg:pb-16"
      aria-label="Introduction"
      style={{ ['--split' as string]: '52%' }}
    >
      {/* ---------------- Cold half, the base plate ---------------- */}
      <div data-c-plate className="absolute inset-0 -z-20 will-change-transform">
        <div data-c-photo className="absolute -inset-[6%] will-change-transform">
          {/* TODO: client to replace with real before/after project photography */}
          <img
            src={src}
            srcSet={srcSet}
            sizes="100vw"
            alt={heroComfort.room.alt}
            {...({ fetchpriority: 'high' } as Record<string, string>)}
            decoding="async"
            className="size-full object-cover"
            style={{ filter: 'grayscale(0.35) saturate(0.5) brightness(0.52) contrast(1.06)' }}
          />
          {/* Cold cast, kept as a separate layer so the grade stays tunable. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 mix-blend-color"
            style={{ background: '#2E5B8F' }}
          />

          {/* ---------------- Warm half, clipped to the divider ---------------- */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ clipPath: 'inset(0 0 0 var(--split))' }}
          >
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className="size-full object-cover"
              style={{ filter: 'saturate(1.18) brightness(1.06) contrast(1.02)' }}
            />
            <div
              className="absolute inset-0 mix-blend-soft-light"
              style={{ background: 'rgb(var(--c-accent) / 0.55)' }}
            />
          </div>
        </div>
      </div>

      {/* ---------------- Divider and handle ---------------- */}
      {/* Above the scrim, not behind it: the seam between the two halves is the
          whole control, and a faint line makes the hero look like one muddy
          photograph rather than a comparison. */}
      <div
        data-c-divider
        className="pointer-events-none absolute inset-y-0 z-10"
        style={{ left: 'var(--split)' }}
        aria-hidden="true"
      >
        <span className="absolute inset-y-0 -left-px w-0.5 bg-bone/90 shadow-[0_0_34px_rgb(var(--c-accent)/0.75)]" />
      </div>

      <div
        ref={handleRef}
        role="slider"
        tabIndex={0}
        aria-label="Compare the room before and after insulating"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={52}
        aria-valuetext="Drag to compare the uninsulated and spray foamed room"
        // Sits high on phones, where the copy column fills the viewport and a
        // mid-height handle could be dragged on top of the CTAs and swallow
        // taps. At 30% it is only ever over headline text, which is inert.
        className="absolute top-[30%] z-20 grid size-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-pill border border-bone/70 bg-ink/70 text-bone backdrop-blur-md transition-colors duration-300 hover:border-accent hover:text-accent sm:size-14 lg:top-1/2"
        style={{ left: 'var(--split)' }}
      >
        <MoveHorizontal className="size-5" aria-hidden="true" />
      </div>

      {/* ---------------- Before / after chips ---------------- */}
      <div className="pointer-events-none absolute inset-x-[var(--gutter)] top-[calc(var(--header-h)+1.5rem)] z-10 hidden justify-between md:flex">
        <div
          data-c-chip
          className="rounded-lg border border-line/12 bg-ink/55 p-4 backdrop-blur-xl"
        >
          <p className="flex items-center gap-2 text-eyebrow font-bold uppercase tracking-[0.18em] text-[#9FC4F0]">
            <Snowflake className="size-3.5" aria-hidden="true" />
            {heroComfort.before.tag}
          </p>
          <p className="mt-2 font-display text-h4 font-semibold text-bone">
            {heroComfort.before.title}
          </p>
          <p className="mt-1 max-w-[24ch] text-small text-bone-400">{heroComfort.before.note}</p>
        </div>

        <div
          data-c-chip
          className="rounded-lg border border-accent/30 bg-ink/55 p-4 text-right backdrop-blur-xl"
        >
          <p className="flex items-center justify-end gap-2 text-eyebrow font-bold uppercase tracking-[0.18em] text-accent">
            <Flame className="size-3.5" aria-hidden="true" />
            {heroComfort.after.tag}
          </p>
          <p className="mt-2 font-display text-h4 font-semibold text-bone">
            {heroComfort.after.title}
          </p>
          <p className="mt-1 max-w-[24ch] text-small text-bone-400">{heroComfort.after.note}</p>
        </div>
      </div>

      {/* ---------------- Readability scrim ---------------- */}
      <div
        aria-hidden="true"
        className="grain pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to top, rgb(var(--c-ink)) 3%, rgb(var(--c-ink) / 0.86) 26%, rgb(var(--c-ink) / 0.22) 62%, rgb(var(--c-ink) / 0.55) 100%)',
        }}
      />

      {/* ---------------- Content ---------------- */}
      <div data-c-content className="shell relative w-full">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-7">
            <p data-c-eyebrow className="eyebrow !text-bone-200">
              {site.serviceArea}
            </p>

            <h1 className="mt-5 text-display font-semibold text-bone">
              {heroComfort.headlineLines.map((line, i) => (
                <span className="line-mask" key={line}>
                  <span
                    className={`line-inner ${
                      i === heroComfort.accentLineIndex ? 'text-gradient-accent' : ''
                    }`}
                    data-c-line
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p data-c-sub className="mt-6 max-w-measure text-lead text-bone-200/85">
              {heroComfort.subhead}
            </p>

            <div data-c-cta className="mt-8 flex flex-wrap items-center gap-3">
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
              data-c-trust
              className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-small text-bone-200/80"
            >
              <span className="inline-flex items-center gap-2">
                <Stars label="Rated 5 stars by homeowners" />
                <span className="font-semibold text-bone">5.0</span>
              </span>
              <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
              <span className="font-semibold text-bone">{heroStat.headline} {heroStat.label}</span>
              <span className="hidden h-4 w-px bg-line/20 sm:block" aria-hidden="true" />
              <span>Family-owned · Australia-wide</span>
            </div>
          </div>

          {/* Measured proof, kept from the brief. */}
          <div className="lg:col-span-4 lg:col-start-9 lg:justify-self-end">
            <figure
              data-c-chip
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
              <p className="mt-4 text-small text-bone-400">{heroStat.detail}</p>
            </figure>
          </div>
        </div>

        <div
          data-c-cue
          className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-eyebrow font-bold uppercase tracking-[0.18em] text-bone-400"
        >
          <span className="inline-flex items-center gap-3">
            <ArrowDown className="size-4 animate-scroll-nudge text-accent" aria-hidden="true" />
            {heroComfort.scrollCue}
            <span
              className="h-px w-16 bg-gradient-to-r from-accent to-transparent"
              aria-hidden="true"
            />
          </span>
          <span className="hidden text-bone-400/70 lg:inline">{heroComfort.hint}</span>
          <span className="text-bone-400/70 lg:hidden">{heroComfort.hintTouch}</span>
        </div>
      </div>
    </section>
  )
}
