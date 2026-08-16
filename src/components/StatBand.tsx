import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { stats } from '@/data/stats'
import { statsIntro } from '@/data/content'
import SectionHeading from '@/components/ui/SectionHeading'

/**
 * Count-up stat band.
 *
 * The final value is what React renders, so the correct number is present
 * without JavaScript animation and under prefers-reduced-motion. The tween only
 * ever rewinds it to zero and plays it forward on ScrollTrigger enter.
 */
export default function StatBand() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap.utils.toArray<HTMLElement>('[data-countup]').forEach((el) => {
        const target = Number(el.dataset.value ?? 0)
        const decimals = Number(el.dataset.decimals ?? 0)
        const counter = { value: 0 }

        gsap.to(counter, {
          value: target,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: () => {
            el.textContent = counter.value.toFixed(decimals)
          },
          onStart: () => {
            el.textContent = (0).toFixed(decimals)
          },
        })
      })

      gsap.from('[data-stat-item]', {
        autoAlpha: 0,
        y: 34,
        duration: 0.9,
        stagger: 0.1,
        scrollTrigger: { trigger: '[data-stat-grid]', start: 'top 82%', once: true },
      })

      // Underline draws in beneath each figure, chasing the count-up.
      gsap.fromTo(
        '[data-stat-rule]',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.1,
          ease: 'power3.inOut',
          stagger: 0.1,
          scrollTrigger: { trigger: '[data-stat-grid]', start: 'top 82%', once: true },
        },
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      className="relative bg-bone py-section text-ink"
      aria-labelledby="stats-heading"
    >
      <div className="shell">
        <SectionHeading
          intro={statsIntro}
          headingId="stats-heading"
          tone="on-light"
          className="max-w-3xl"
        />

        <ul
          data-stat-grid
          className="mt-16 grid gap-px overflow-hidden rounded-xl border border-ink/12 bg-ink/12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <li
              key={stat.id}
              data-stat-item
              className="group flex flex-col gap-3 bg-bone p-8 transition-colors duration-500 hover:bg-bone-200 lg:p-9"
            >
              <p className="font-display text-[clamp(2.75rem,5.5vw,4.25rem)] font-semibold leading-none tracking-tight text-ink">
                {stat.prefix}
                <span
                  data-countup
                  data-value={stat.value}
                  data-decimals={stat.decimals ?? 0}
                  className="tabular-nums"
                >
                  {stat.value.toFixed(stat.decimals ?? 0)}
                </span>
                <span className="text-accent">{stat.suffix}</span>
              </p>

              {/* Drawn in on enter. Under reduced motion no tween runs, so it
                  must render at full width by default rather than at zero. */}
              <span
                aria-hidden="true"
                data-stat-rule
                className="block h-[2px] w-full origin-left bg-accent/70"
              />

              <h3 className="text-h4 font-semibold text-ink">{stat.label}</h3>
              <p className="text-small text-ink/65">{stat.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
