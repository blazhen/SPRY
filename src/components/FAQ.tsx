import { useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ArrowUpRight, Phone } from 'lucide-react'
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { faqSets, type Faq, type FaqSet } from '@/data/faqs'
import SectionHeading from '@/components/ui/SectionHeading'
import MagneticButton from '@/components/ui/MagneticButton'
import { site } from '@/data/site'
import SectionBackdrop from '@/components/ui/SectionBackdrop'

interface ItemProps {
  faq: Faq
  index: number
  open: boolean
  onToggle: () => void
}

function FaqItem({ faq, index, open, onToggle }: ItemProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const buttonId = `faq-button-${faq.id}`
  const panelId = `faq-panel-${faq.id}`

  useGSAP(
    () => {
      const panel = panelRef.current
      if (!panel) return

      if (reduced) {
        gsap.set(panel, { height: open ? 'auto' : 0, autoAlpha: open ? 1 : 0 })
        return
      }

      gsap.to(panel, {
        // autoAlpha drops visibility to hidden when closed, which also takes
        // the panel's links out of the tab order.
        height: open ? 'auto' : 0,
        autoAlpha: open ? 1 : 0,
        duration: 0.55,
        ease: 'power3.inOut',
        // The page just got taller or shorter, so re-measure every trigger below.
        onComplete: () => ScrollTrigger.refresh(),
      })
    },
    { dependencies: [open, reduced] },
  )

  return (
    <li className="border-b border-line/10">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex w-full items-start gap-5 py-6 text-left transition-colors duration-300 sm:gap-8"
        >
          <span
            className="mt-1 font-body text-eyebrow font-bold tabular-nums tracking-[0.18em] text-accent"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Question size, not heading size. A list of questions has to be
              scannable, and at display size the answers fell off the screen. */}
          <span
            className={`flex-1 font-display text-[clamp(1rem,1.4vw,1.25rem)] font-semibold leading-[1.35] transition-colors duration-300 ${
              open ? 'text-accent' : 'text-bone group-hover:text-accent'
            }`}
          >
            {faq.question}
          </span>

          {/* Plus morphs into a minus: the vertical bar collapses to nothing
              while the horizontal one stays. Two spans rather than an icon,
              because an icon can only be rotated, and a rotated plus is a
              cross, not a minus. */}
          <span
            aria-hidden="true"
            className={`relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-pill border transition-colors duration-500 ease-expo ${
              open
                ? 'border-accent bg-accent text-ink'
                : 'border-line/20 text-bone group-hover:border-accent group-hover:text-accent'
            }`}
          >
            <span className="absolute h-[2px] w-3.5 rounded-full bg-current" />
            <span
              className={`absolute h-3.5 w-[2px] rounded-full bg-current transition-transform duration-500 ease-expo ${
                open ? 'scale-y-0' : 'scale-y-100'
              }`}
            />
          </span>
        </button>
      </h3>

      {/* The answer is in the document whether open or closed. Hidden with
          CSS, never fetched on click, so a crawler reads all of it. */}
      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="overflow-hidden"
        style={{ height: 0, visibility: 'hidden', opacity: 0 }}
      >
        <p className="max-w-measure pb-7 pl-[3.1rem] text-body text-bone-400 sm:pl-[4rem]">
          {faq.answer}
        </p>
      </div>
    </li>
  )
}

interface FAQProps {
  /** Which set of questions. Each page has its own; the homepage takes the general one. */
  set?: FaqSet
}

/**
 * FAQ accordion.
 *
 * One panel open at a time. Each panel is a labelled region controlled by its
 * button, and every open/close refreshes ScrollTrigger because the document
 * height changes underneath every trigger further down the page.
 *
 * The questions are also published as FAQPage structured data, built from the
 * same array the page renders, so the markup can never say something the
 * visitor cannot see.
 */
export default function FAQ({ set = faqSets.general }: FAQProps) {
  const [openId, setOpenId] = useState<string | null>(set.items[0]?.id ?? null)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: set.items.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <section
      id="faq"
      className="relative overflow-hidden border-t border-line/6 bg-surface py-section"
      aria-labelledby="faq-heading"
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      {/* Cells rather than strata: the diagonal planes ran behind the
          questions and competed with them. */}
      <SectionBackdrop variant="cells" tone="cool" />

      <div className="relative shell grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading intro={set.intro} headingId="faq-heading" />

          <div className="mt-10 rounded-lg border border-line/10 bg-ink-800 p-7">
            <p className="text-body text-bone-400">
              Still not sure whether spray foam suits your building? Ask us. We will tell you
              honestly if it is not the right answer.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <MagneticButton
                href={site.phone.tel}
                variant="ghost"
                strength={0.2}
                className="w-full"
                ariaLabel={`Call Spray It Solutions on ${site.phone.display}`}
              >
                <Phone className="size-4" aria-hidden="true" />
                {site.cta.secondary.label}
              </MagneticButton>
              <MagneticButton href={site.cta.primary.href} variant="primary" strength={0.2} className="w-full">
                {site.cta.primary.label}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </MagneticButton>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <ul className="border-t border-line/10">
            {set.items.map((faq, i) => (
              <FaqItem
                key={faq.id}
                faq={faq}
                index={i}
                open={openId === faq.id}
                onToggle={() => setOpenId((current) => (current === faq.id ? null : faq.id))}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
