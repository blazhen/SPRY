import { useRef, useState } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { INTRO_CURTAIN } from '@/config'
import { site } from '@/data/site'
import Logo from '@/components/ui/Logo'

const SEEN_KEY = 'sprayit:intro-seen'

/**
 * Brief brand wipe on first load.
 *
 * Off by default via INTRO_CURTAIN in src/config.ts. It is an opaque panel in
 * front of the hero, so it delays Largest Contentful Paint by roughly its own
 * duration. That is a real Lighthouse cost for a moment of theatre, so it is a
 * deliberate opt-in rather than something switched on quietly.
 *
 * When it does run it is short, happens once per browser session, never runs
 * under prefers-reduced-motion, and removes itself from the DOM afterwards so
 * it can never trap a click or a focus ring.
 */
export default function IntroCurtain() {
  const reduced = useReducedMotion()
  const scope = useRef<HTMLDivElement>(null)

  const [active, setActive] = useState(() => {
    if (!INTRO_CURTAIN) return false
    if (typeof window === 'undefined') return false
    try {
      return sessionStorage.getItem(SEEN_KEY) !== '1'
    } catch {
      // Private browsing can throw on sessionStorage. Skip rather than break.
      return false
    }
  })

  useGSAP(
    () => {
      if (!active) return
      if (reduced) {
        setActive(false)
        return
      }

      try {
        sessionStorage.setItem(SEEN_KEY, '1')
      } catch {
        /* not fatal */
      }

      gsap
        .timeline({ onComplete: () => setActive(false) })
        .to('[data-intro-mark]', { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power3.out' })
        .to('[data-intro-rule]', { scaleX: 1, duration: 0.42, ease: 'power2.inOut' }, '-=0.22')
        .to('[data-intro-mark]', { autoAlpha: 0, duration: 0.22, ease: 'power2.in' }, '+=0.05')
        .to(
          '[data-intro-panel]',
          { yPercent: -100, duration: 0.62, ease: 'power4.inOut', stagger: 0.06 },
          '-=0.1',
        )
    },
    { scope, dependencies: [active, reduced] },
  )

  if (!active) return null

  return (
    <div ref={scope} className="fixed inset-0 z-[300]" aria-hidden="true">
      {/* Two panels lifting at a slight offset reads richer than one. */}
      <div data-intro-panel className="absolute inset-y-0 left-0 w-1/2 bg-ink" />
      <div data-intro-panel className="absolute inset-y-0 right-0 w-1/2 bg-ink" />

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div data-intro-mark className="translate-y-3 opacity-0 text-center">
          <Logo height={96} tone="white" className="mx-auto h-[clamp(3.5rem,11vw,6rem)]" />
          <p className="mt-3 text-eyebrow font-bold uppercase tracking-[0.2em] text-bone-400">
            {site.tagline}
          </p>
          <span
            data-intro-rule
            className="mx-auto mt-5 block h-px w-32 origin-left scale-x-0 bg-accent"
          />
        </div>
      </div>
    </div>
  )
}
