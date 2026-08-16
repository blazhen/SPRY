import { useRef } from 'react'
import { ArrowUpRight, Check, Phone } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { quoteCta } from '@/data/content'
import { site } from '@/data/site'
import MagneticButton from '@/components/ui/MagneticButton'

/**
 * Closing call to action.
 *
 * The one full-accent surface on the page. It only works as a punctuation
 * mark because nothing above it competes. Oversized display type, both CTAs,
 * and the three assurances that answer the objections people actually have.
 */
export default function QuoteCTA() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap
        .timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 76%', once: true },
        })
        .from('[data-cta-eyebrow]', { autoAlpha: 0, y: 16, duration: 0.6 })
        .from(
          '[data-cta-line]',
          { yPercent: 115, duration: 1.1, stagger: 0.1, ease: 'power4.out' },
          '-=0.3',
        )
        .from('[data-cta-lede]', { autoAlpha: 0, y: 20, duration: 0.7 }, '-=0.6')
        .from('[data-cta-buttons] > *', { autoAlpha: 0, y: 18, stagger: 0.09, duration: 0.6 }, '-=0.45')
        .from('[data-cta-assurance]', { autoAlpha: 0, y: 14, stagger: 0.08, duration: 0.5 }, '-=0.4')

      // Slow drift on the oversized backdrop word.
      gsap.to('[data-cta-ghost]', {
        xPercent: -8,
        ease: 'none',
        scrollTrigger: {
          trigger: scope.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Kinetic accent: the italic word stretches and leans as the section
      // travels, so the type is doing something rather than sitting still.
      gsap.fromTo(
        '[data-cta-accent]',
        { scaleX: 0.9, skewX: 6, letterSpacing: '-0.04em' },
        {
          scaleX: 1.06,
          skewX: -4,
          letterSpacing: '0.01em',
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        },
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      className="relative isolate overflow-hidden bg-accent py-section text-ink"
      aria-labelledby="quote-cta-heading"
    >
      {/* Oversized ghost word behind the content. */}
      <span
        data-cta-ghost
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.34em] left-0 select-none whitespace-nowrap font-display text-mega font-semibold leading-none text-ink/5"
      >
        SPRAY IT SOLUTIONS
      </span>

      <div className="shell relative">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="eyebrow !text-ink/70" data-cta-eyebrow>
              {quoteCta.eyebrow}
            </span>

            <h2 id="quote-cta-heading" className="mt-6 text-display font-semibold">
              {quoteCta.headingLines.map((line) => {
                const word = quoteCta.accentWord
                const parts = word && line.includes(word) ? line.split(word) : null
                return (
                  <span className="line-mask" key={line}>
                    <span className="line-inner" data-cta-line>
                      {parts ? (
                        <>
                          {parts[0]}
                          <span
                            data-cta-accent
                            className="inline-block origin-left italic text-bone transition-transform duration-500 ease-expo hover:!scale-x-110"
                          >
                            {word}
                          </span>
                          {parts.slice(1).join(word)}
                        </>
                      ) : (
                        line
                      )}
                    </span>
                  </span>
                )
              })}
            </h2>
          </div>

          <div className="lg:col-span-5">
            <p data-cta-lede className="max-w-measure text-lead text-ink/80">
              {quoteCta.lede}
            </p>

            <div data-cta-buttons className="mt-9 flex flex-wrap gap-3">
              <MagneticButton href={site.cta.primary.href} variant="ink" strength={0.32}>
                {site.cta.primary.label}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </MagneticButton>

              <MagneticButton
                href={site.phone.tel}
                variant="outline-ink"
                strength={0.24}
                ariaLabel={`Call Spray It Solutions on ${site.phone.display}`}
              >
                <Phone className="size-4" aria-hidden="true" />
                {site.cta.secondary.label}
              </MagneticButton>
            </div>

            <ul className="mt-10 flex flex-col gap-3">
              {quoteCta.assurances.map((assurance) => (
                <li
                  key={assurance}
                  data-cta-assurance
                  className="flex items-center gap-3 text-small font-semibold text-ink/85"
                >
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  {assurance}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
