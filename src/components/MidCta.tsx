import { ArrowUpRight, Phone } from 'lucide-react'
import MagneticButton from '@/components/ui/MagneticButton'
import { site } from '@/data/site'

interface MidCtaProps {
  heading?: string
  text?: string
  /** Match the ground of the sections either side. */
  tone?: 'base' | 'surface'
}

/**
 * A short call to action for the middle of a page, placed just after the
 * proof (the numbers, the photographs, the client list). The closing CTA is a
 * full band; this is one line and two buttons, so the page keeps moving.
 */
export default function MidCta({
  heading = 'Sound like your building?',
  text = 'Tell us what needs insulating and we will come back with honest advice and a price.',
  tone = 'base',
}: MidCtaProps) {
  return (
    <section
      className={`border-t border-line/6 py-14 sm:py-16 ${tone === 'surface' ? 'bg-surface' : 'bg-ink'}`}
      aria-label="Get a quote"
    >
      <div className="shell flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
        <div className="max-w-xl">
          <h2 className="font-display text-h3 font-semibold leading-tight text-bone">{heading}</h2>
          <p className="mt-2 text-body text-bone-400">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <MagneticButton href={site.cta.primary.href} variant="primary" strength={0.2}>
            {site.cta.primary.label}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </MagneticButton>
          <MagneticButton href={site.phone.tel} variant="ghost" strength={0.2}>
            <Phone className="size-4" aria-hidden="true" />
            {site.cta.secondary.label}
          </MagneticButton>
        </div>
      </div>
    </section>
  )
}
