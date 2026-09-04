import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SectionHeading from '@/components/ui/SectionHeading'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import { site } from '@/data/site'
import type { PageSection, SitePage } from '@/data/pages'

/**
 * Shared building blocks for the interior pages.
 *
 * Deliberately separate pieces rather than one renderer that takes a page
 * object. The four pages are not the same shape: Residential needs an
 * interactive house, Commercial needs the client logos, Spray Foam needs the
 * 3D wall. A single renderer would either grow a flag per page or force every
 * page to be a column of prose, which is what made them feel empty.
 */

/* ------------------------------------------------------------- Page opener */

export function PageHero({
  page,
  aside,
  children,
}: {
  page: SitePage
  /** Optional visual beside the headline, e.g. the 3D building. */
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-ink pb-14 pt-[calc(var(--header-h)+clamp(3rem,8vh,6rem))] lg:pb-20">
      <SectionBackdrop variant="orbs" tone="both" />

      {aside ? (
        /* Two columns once there is something to put beside the words. The
           visual is deliberately the smaller half: it decorates the headline
           rather than competing with it. */
        <div className="relative shell grid items-center gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <SectionHeading intro={page.intro} as="h1" headingClassName="text-h1" />
          </div>
          <div className="lg:col-span-5">{aside}</div>
        </div>
      ) : (
        <div className="relative shell max-w-4xl">
          <SectionHeading intro={page.intro} as="h1" headingClassName="text-h1" />
        </div>
      )}
      {children}
    </section>
  )
}

/* -------------------------------------------------------- Prose + bullets */

/** Splits a heading so the accent word can be coloured independently. */
function Heading({ section, id }: { section: PageSection; id: string }) {
  const { heading, accentWord } = section
  if (!accentWord || !heading.includes(accentWord)) {
    return (
      <h2 id={id} className="mt-6 font-display text-h2 font-semibold leading-tight text-bone">
        {heading}
      </h2>
    )
  }
  const [before, ...rest] = heading.split(accentWord)
  return (
    <h2 id={id} className="mt-6 font-display text-h2 font-semibold leading-tight text-bone">
      {before}
      <span data-accent-word className="text-accent">
        {accentWord}
      </span>
      {rest.join(accentWord)}
    </h2>
  )
}

export function ProseSection({ section }: { section: PageSection }) {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      gsap.from('[data-reveal]', {
        y: 34,
        opacity: 0,
        duration: 0.85,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: scope.current, start: 'top 80%' },
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <section
      ref={scope}
      id={section.id}
      className={`relative overflow-hidden border-t border-line/6 py-section ${
        section.tone === 'surface' ? 'bg-surface' : 'bg-ink'
      }`}
      aria-labelledby={`${section.id}-heading`}
    >
      {/* Alternating variants, so consecutive prose sections do not sit on the
          same wash and blur into one another. */}
      <SectionBackdrop
        variant={section.tone === 'surface' ? 'cells' : 'orbs'}
        tone={section.tone === 'surface' ? 'cool' : 'warm'}
      />

      <div className="relative shell grid gap-12 lg:grid-cols-12 lg:gap-x-16">
        <div className="lg:col-span-5" data-reveal>
          {section.eyebrow && (
            <p className="flex items-center gap-4 text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
              <span className="h-px w-8 bg-accent" aria-hidden="true" />
              {section.eyebrow}
            </p>
          )}
          <Heading section={section} id={`${section.id}-heading`} />
        </div>

        <div className="lg:col-span-7" data-reveal>
          {section.body?.map((paragraph) => (
            <p key={paragraph} className="mb-5 max-w-measure text-body text-bone-400 last:mb-0">
              {paragraph}
            </p>
          ))}

          {section.bullets && (
            <ul className="mt-10 space-y-7 border-t border-line/10 pt-9">
              {section.bullets.map((bullet) => (
                <li key={bullet.title} className="flex gap-4">
                  <Check
                    className="mt-1 size-4 shrink-0 text-accent"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-body font-bold text-bone">{bullet.title}</h3>
                    <p className="mt-1.5 max-w-measure text-body leading-relaxed text-bone-400">
                      {bullet.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {section.stats && (
            <dl className="mt-11 grid gap-8 border-t border-line/10 pt-9 sm:grid-cols-3">
              {section.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-h2 font-semibold leading-none text-accent">
                      {stat.figure}
                    </span>
                    <span className="mt-3 block text-small leading-snug text-bone-400">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  )
}

/** Renders one named section from a page's data by id. */
export function Prose({ page, id }: { page: SitePage; id: string }) {
  const section = page.sections.find((s) => s.id === id)
  return section ? <ProseSection section={section} /> : null
}

/* ----------------------------------------------------------------- Closing */

export function PageCta() {
  return (
    <section className="relative overflow-hidden border-t border-line/6 bg-ink py-section">
      <SectionBackdrop variant="orbs" tone="both" />
      <div className="relative shell flex flex-wrap items-center justify-between gap-8">
        <div className="max-w-xl">
          <p className="text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
            Next step
          </p>
          <p className="mt-5 font-display text-h2 font-semibold leading-tight text-bone">
            {site.tagline}
          </p>
          <p className="mt-5 text-body text-bone-400">
            Tell us what needs insulating and we will come back with honest advice, or book fifteen
            minutes on the phone and talk it through.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/contact" className="btn btn-primary">
            {site.cta.primary.label}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          <Link to="/book" className="btn btn-ghost">
            Book a phone call
          </Link>
        </div>
      </div>
    </section>
  )
}
