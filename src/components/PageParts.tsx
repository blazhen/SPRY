import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, Phone } from 'lucide-react'
import { gsap, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import SectionHeading from '@/components/ui/SectionHeading'
import SectionBackdrop from '@/components/ui/SectionBackdrop'
import ProtectedImage from '@/components/ui/ProtectedImage'
import Breadcrumbs, { type Crumb } from '@/components/Breadcrumbs'
import MagneticButton from '@/components/ui/MagneticButton'
import { site } from '@/data/site'
import { routes } from '@/data/routes'
import type { CopyBlock, PagePhoto, PageSection, SitePage } from '@/data/pages'

/**
 * Shared building blocks for the interior pages.
 *
 * Deliberately separate pieces rather than one renderer that takes a page
 * object. The pages are not the same shape: Residential needs an interactive
 * house, Commercial needs the client logos, Spray Foam needs the 3D wall. A
 * single renderer would either grow a flag per page or force every page to be
 * a column of prose, which is what made them feel empty.
 */

/* ------------------------------------------------------------- Page opener */

/**
 * A job photograph beside the page heading.
 *
 * Real work rather than a 3D object, which is what the SEO agency asked for,
 * and the photo is the largest thing above the fold, so it loads eagerly at
 * high priority instead of waiting its turn. It also keeps the 3D library off
 * the critical path of every service page, which is most of what made them
 * slow on a first visit.
 */
export function HeroPhoto({ photo }: { photo: PagePhoto }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line/10 bg-surface shadow-lift">
      <div className="relative aspect-[4/3]">
        <ProtectedImage
          src={photo.src}
          alt={photo.alt}
          width={photo.size[0]}
          height={photo.size[1]}
          frameClassName="size-full"
          loading="eager"
          fetchPriority="high"
          watermark
        />
      </div>
    </div>
  )
}

export function PageHero({
  page,
  crumb,
  crumbs,
  aside,
  children,
}: {
  page: SitePage
  /** The page's own name in the breadcrumb trail, after Home. */
  crumb: string
  /** Steps between Home and this page, e.g. Residential above Underfloor. */
  crumbs?: Crumb[]
  /** Optional visual beside the headline. Defaults to the page's own photo. */
  aside?: ReactNode
  children?: ReactNode
}) {
  const visual = aside ?? (page.hero ? <HeroPhoto photo={page.hero} /> : null)
  return (
    <section className="relative overflow-hidden bg-ink pb-14 pt-[calc(var(--header-h)+clamp(2.5rem,6vh,4.5rem))] lg:pb-20">
      <SectionBackdrop variant="orbs" tone="both" />

      <div className="relative shell">
        <Breadcrumbs items={[...(crumbs ?? []), { label: crumb }]} className="mb-8" />
      </div>

      {visual ? (
        /* Two columns once there is something to put beside the words. The
           visual is deliberately the smaller half: it supports the headline
           rather than competing with it. */
        <div className="relative shell grid items-center gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <SectionHeading intro={page.intro} as="h1" headingClassName="text-h1" />
          </div>
          <div className="lg:col-span-5">{visual}</div>
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

/** Ordered body copy: paragraphs, plain lists, and term lists. */
export function CopyBlocks({ blocks }: { blocks: CopyBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if ('p' in block) {
          return (
            <p key={i} className="max-w-measure text-body text-bone-400">
              {block.p}
            </p>
          )
        }
        if ('list' in block) {
          return (
            <ul key={i} className="max-w-measure space-y-2.5 py-1">
              {block.list.map((item) => (
                <li key={item} className="flex gap-3 text-body text-bone-400">
                  <Check className="mt-1.5 size-4 shrink-0 text-accent" strokeWidth={3} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <dl key={i} className="max-w-measure space-y-3 border-l-2 border-accent/25 py-1 pl-5">
            {block.terms.map(([term, text]) => (
              <div key={term}>
                <dt className="inline font-bold text-bone">{term}: </dt>
                <dd className="inline text-body text-bone-400">{text}</dd>
              </div>
            ))}
          </dl>
        )
      })}
    </div>
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

  const ground = section.tone === 'surface' ? 'bg-surface' : 'bg-ink'
  const copy = (
    <>
      {section.blocks && <CopyBlocks blocks={section.blocks} />}
      {section.body?.map((paragraph) => (
        <p key={paragraph} className="mb-5 max-w-measure text-body text-bone-400 last:mb-0">
          {paragraph}
        </p>
      ))}
      {section.link && (
        <p className="mt-8">
          <Link to={section.link.href} className="link-wipe inline-flex font-semibold text-accent">
            {section.link.label}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </p>
      )}
    </>
  )

  /* An unheaded run of copy, straight after the page heading: one readable
     column, no eyebrow, no second H1-sized line competing with the hero. */
  if (!section.heading) {
    return (
      <section ref={scope} id={section.id} className={`relative border-t border-line/6 py-16 sm:py-20 ${ground}`}>
        <div className="relative shell">
          <div className="max-w-3xl text-lead" data-reveal>
            {copy}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={scope}
      id={section.id}
      className={`relative overflow-hidden border-t border-line/6 py-section ${ground}`}
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
          {copy}

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

      {/* Cards run the full width under the heading and copy, one per
          service, each linking to the page that goes deeper. */}
      {section.cards && (
        <ul className="relative shell mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {section.cards.map((card, i) => (
            <li key={card.title} data-reveal>
              <article className="card flex h-full flex-col rounded-xl">
                {card.image && (
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-line/10">
                    <ProtectedImage
                      src={card.image.src}
                      alt={card.image.alt}
                      width={card.image.size[0]}
                      height={card.image.size[1]}
                      frameClassName="size-full"
                      watermark
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <p className="font-body text-eyebrow font-bold tabular-nums tracking-[0.18em] text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-3 font-display text-h3 font-semibold leading-tight text-bone">
                    {card.title}
                  </h3>
                  <div className="mt-4 flex-1 space-y-3">
                    {card.body.map((p) => (
                      <p key={p} className="text-small leading-relaxed text-bone-400">
                        {p}
                      </p>
                    ))}
                  </div>
                  {card.href && (
                    <p className="mt-6 border-t border-line/10 pt-5">
                      <Link to={card.href} className="link-wipe inline-flex font-semibold text-accent">
                        {card.linkLabel ?? card.title}
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Renders one named section from a page's data by id. */
export function Prose({ page, id }: { page: SitePage; id: string }) {
  const section = page.sections.find((s) => s.id === id)
  return section ? <ProseSection section={section} /> : null
}

/* ----------------------------------------------------------------- Closing */

/**
 * The closing call to action. By default the business tagline over two
 * buttons; a page can give it its own H2 and copy, which is how the agency's
 * "Upgrade Your Home Insulation" section on Residential is rendered.
 */
export function PageCta({ heading, text }: { heading?: string; text?: string } = {}) {
  return (
    <section
      className="relative overflow-hidden border-t border-line/6 bg-ink py-section"
      aria-labelledby={heading ? 'page-cta-heading' : undefined}
    >
      <SectionBackdrop variant="orbs" tone="both" />
      <div className="relative shell flex flex-wrap items-center justify-between gap-8">
        <div className="max-w-xl">
          <p className="text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
            Next step
          </p>
          {heading ? (
            <h2 id="page-cta-heading" className="mt-5 font-display text-h2 font-semibold leading-tight text-bone">
              {heading}
            </h2>
          ) : (
            <p className="mt-5 font-display text-h2 font-semibold leading-tight text-bone">
              {site.tagline}
            </p>
          )}
          <p className="mt-5 text-body text-bone-400">
            {text ??
              'Tell us what needs insulating and we will come back with honest advice, or book fifteen minutes on the phone and talk it through.'}
          </p>
          <p className="mt-3 text-body text-bone-400">
            Call{' '}
            <a href={site.phone.tel} className="link-wipe font-semibold text-bone">
              {site.phone.display}
            </a>
            , or complete our online form to request a free quote.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <MagneticButton href={site.cta.primary.href} variant="primary" strength={0.2}>
            {site.cta.primary.label}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </MagneticButton>
          <MagneticButton href={site.phone.tel} variant="ghost" strength={0.2}>
            <Phone className="size-4" aria-hidden="true" />
            {site.cta.secondary.label}
          </MagneticButton>
          <Link to={routes.book} className="btn btn-ghost">
            Book a phone call
          </Link>
        </div>
      </div>
    </section>
  )
}
