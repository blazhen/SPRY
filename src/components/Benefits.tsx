import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { benefits } from '@/data/benefits'
import { benefitsIntro } from '@/data/content'
import SectionHeading from '@/components/ui/SectionHeading'

/**
 * Benefits grid: six icon cards revealed with a staggered clip wipe.
 *
 * The wipe animates `clip-path` from a fully-collapsed inset rather than
 * fading opacity, so cards appear to be uncovered by a mask rather than
 * dissolving in. Row-aware stagger keeps the sweep reading left-to-right.
 */
export default function Benefits() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap.from('[data-benefit-card]', {
        clipPath: 'inset(0% 0% 100% 0%)',
        y: 52,
        duration: 1.1,
        ease: 'power4.out',
        stagger: { each: 0.08, from: 'start' },
        scrollTrigger: {
          trigger: '[data-benefit-grid]',
          start: 'top 78%',
          once: true,
        },
      })

      // --- Tilt and magnetic pull -------------------------------------
      // Skipped on coarse pointers: there is no hover to speak of, and a
      // stuck transform after a tap looks broken.
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

      const cleanups: Array<() => void> = []

      gsap.utils.toArray<HTMLElement>('[data-benefit-card]').forEach((card) => {
        const set = {
          rx: gsap.quickTo(card, 'rotateX', { duration: 0.6, ease: 'power3.out' }),
          ry: gsap.quickTo(card, 'rotateY', { duration: 0.6, ease: 'power3.out' }),
          x: gsap.quickTo(card, 'x', { duration: 0.6, ease: 'power3.out' }),
          y: gsap.quickTo(card, 'y', { duration: 0.6, ease: 'power3.out' }),
        }

        const onMove = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect()
          // -0.5 to 0.5 across the card in each axis.
          const nx = (event.clientX - rect.left) / rect.width - 0.5
          const ny = (event.clientY - rect.top) / rect.height - 0.5
          set.ry(nx * 9)
          set.rx(-ny * 9)
          set.x(nx * 10)
          set.y(ny * 10)
        }
        const onLeave = () => {
          set.rx(0)
          set.ry(0)
          set.x(0)
          set.y(0)
        }

        card.addEventListener('pointermove', onMove)
        card.addEventListener('pointerleave', onLeave)
        cleanups.push(() => {
          card.removeEventListener('pointermove', onMove)
          card.removeEventListener('pointerleave', onLeave)
        })
      })

      return () => cleanups.forEach((fn) => fn())
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      className="relative border-t border-white/6 bg-ink py-section"
      aria-labelledby="benefits-heading"
    >
      <div className="shell">
        <SectionHeading
          intro={benefitsIntro}
          headingId="benefits-heading"
          className="max-w-3xl"
        />

        <ul
          data-benefit-grid
          // Perspective lives on the grid so each card tilts in the same
          // shared space rather than each having its own vanishing point.
          style={{ perspective: '1200px' }}
          className="mt-16 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3"
        >
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <li
                key={benefit.id}
                data-benefit-card
                className="group relative flex flex-col gap-5 bg-ink p-8 transition-colors duration-500 ease-expo hover:bg-ink-800 lg:p-10"
              >
                {/* Accent rule that wipes in across the top on hover. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-expo group-hover:scale-x-100"
                />

                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-12 items-center justify-center rounded-md border border-white/10 bg-white/4 text-accent transition-colors duration-500 group-hover:border-accent/40 group-hover:bg-accent/10">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>

                  {benefit.figure && (
                    <span
                      className="shrink-0 font-display text-h4 font-semibold leading-none text-white/15 transition-colors duration-500 group-hover:text-accent/40"
                      aria-hidden="true"
                    >
                      {benefit.figure}
                    </span>
                  )}
                </div>

                <h3 className="text-h4 font-semibold text-bone">{benefit.title}</h3>
                <p className="text-body text-bone-400">{benefit.body}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
