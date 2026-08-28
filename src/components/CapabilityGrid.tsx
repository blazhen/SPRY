import { useRef } from 'react'
import { Factory, Map, Truck, Users } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SectionHeading from '@/components/ui/SectionHeading'
import { capabilities, capabilityIntro } from '@/data/features'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

const ICONS = { truck: Truck, factory: Factory, map: Map, users: Users }

/**
 * The equipment, as the argument for what we can take on.
 *
 * A capability claim is only as good as the kit behind it, so this leads with
 * the count rather than the prose. Cards lift on entry and the figure carries
 * the accent, which gives the About page something to look at other than a
 * column of text.
 */
export default function CapabilityGrid() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      gsap.from('[data-cap-card]', {
        y: 46,
        opacity: 0,
        duration: 0.85,
        ease: 'expo.out',
        stagger: 0.09,
        scrollTrigger: { trigger: scope.current, start: 'top 76%' },
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      id="capability"
      className="relative border-t border-line/6 bg-surface py-section"
      aria-labelledby="capability-heading"
    >
      <SectionBackdrop variant="cells" tone="warm" />

      <div className="relative shell">
        <div className="max-w-3xl">
          <SectionHeading intro={capabilityIntro} headingId="capability-heading" />
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <li
                key={item.title}
                data-cap-card
                className="group relative flex flex-col rounded-xl border border-line/10 bg-ink-800 p-7 transition-colors duration-500 ease-expo hover:border-accent/40 hover:bg-ink-700"
              >
                <Icon
                  className="size-6 text-accent transition-transform duration-500 ease-expo group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
                <span className="mt-8 block font-display text-[clamp(2.5rem,4vw,3.5rem)] font-semibold leading-none text-bone">
                  {item.figure}
                </span>
                <h3 className="mt-3 font-display text-h4 font-semibold leading-tight text-accent">
                  {item.title}
                </h3>
                <p className="mt-4 text-small leading-relaxed text-bone-400">{item.text}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
