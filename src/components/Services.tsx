import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { services } from '@/data/services'
import { servicesIntro } from '@/data/content'
import Figure from '@/components/ui/Figure'
import SectionHeading from '@/components/ui/SectionHeading'

/**
 * Residential / Commercial split.
 *
 * Each card is one large link target with the photograph slowly pushing in on
 * hover. The sub-service list is real content, not decoration: it is the
 * fastest route for a visitor to recognise their own job.
 */
export default function Services() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap.from('[data-service-card]', {
        clipPath: 'inset(0% 0% 100% 0%)',
        y: 60,
        duration: 1.2,
        ease: 'power4.out',
        stagger: 0.14,
        scrollTrigger: { trigger: '[data-service-grid]', start: 'top 80%', once: true },
      })

      // Slow upward drift on each photograph as the section passes through.
      gsap.utils.toArray<HTMLElement>('[data-service-photo]').forEach((photo) => {
        gsap.fromTo(
          photo,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      className="relative border-t border-white/6 bg-ink py-section"
      aria-labelledby="services-heading"
    >
      <div className="shell">
        <SectionHeading
          intro={servicesIntro}
          headingId="services-heading"
          className="max-w-3xl"
        />

        <div data-service-grid className="mt-16 grid gap-6 lg:grid-cols-2">
          {services.map((service) => (
            <article
              key={service.id}
              data-service-card
              className="group card flex flex-col overflow-hidden"
            >
              {/* --- Photograph --- */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <div data-service-photo className="absolute -inset-y-[8%] inset-x-0">
                  {/* TODO: client to replace with real project photo */}
                  <Figure
                    image={service.image}
                    sizes="(min-width: 1024px) 46vw, 92vw"
                    className="size-full"
                    imgClassName="transition-transform duration-[1200ms] ease-expo group-hover:scale-105"
                    widths={[640, 960, 1280]}
                  />
                </div>

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-ink-800 via-ink-800/20 to-transparent"
                />

                {/* Accent wipe: sweeps up across the photograph on hover.
                    Transform-only, so it stays on the compositor. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 origin-bottom scale-y-0 bg-gradient-to-t from-accent/70 via-accent/25 to-transparent transition-transform duration-700 ease-expo group-hover:scale-y-100"
                />

                <span className="absolute left-6 top-6 font-display text-h3 font-semibold leading-none text-bone/70">
                  {service.index}
                </span>
              </div>

              {/* --- Copy --- */}
              <div className="flex flex-1 flex-col p-7 lg:p-9">
                <h3 className="text-h3 font-semibold text-bone">
                  <Link to={service.href} className="after:absolute after:inset-0">
                    {service.title}
                  </Link>
                </h3>

                <p className="mt-4 max-w-measure text-body text-bone-400">{service.lede}</p>

                <ul className="mt-8 space-y-px border-t border-white/10">
                  {service.subServices.map((sub) => (
                    <li
                      key={sub.label}
                      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-white/10 py-4"
                    >
                      <span className="min-w-[10rem] font-display text-h4 font-semibold text-bone transition-colors duration-300 group-hover:text-accent">
                        {sub.label}
                      </span>
                      <span className="flex-1 text-small text-bone-400">{sub.blurb}</span>
                    </li>
                  ))}
                </ul>

                <span className="link-wipe mt-8 inline-flex self-start text-accent">
                  Explore {service.title.toLowerCase()}
                  <ArrowUpRight
                    className="size-4 transition-transform duration-500 ease-expo group-hover:translate-x-1 group-hover:-translate-y-1"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
