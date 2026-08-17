import { ArrowLeft, Phone } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import Marquee from '@/components/Marquee'
import QuoteCTA from '@/components/QuoteCTA'
import MagneticButton from '@/components/ui/MagneticButton'
import { site } from '@/data/site'

interface PageStubProps {
  eyebrow: string
  title: string
  lede: string
  path: string
  /** Overrides the SEO title; defaults to `<title> | Spray It Solutions`. */
  seoTitle?: string
  seoDescription?: string
}

/**
 * Shared shell for the routes that are scaffolded but not yet written.
 *
 * The homepage is the proof-of-concept deliverable; these exist so navigation,
 * SEO and the shared chrome are all genuinely wired rather than dead links.
 * Each renders a real heading, the closing CTA and both contact routes.
 */
export default function PageStub({
  eyebrow,
  title,
  lede,
  path,
  seoTitle,
  seoDescription,
}: PageStubProps) {
  return (
    <>
      <Seo
        title={seoTitle ?? `${title.replace(/\.$/, '')} | ${site.name}`}
        description={seoDescription ?? lede}
        path={path}
      />

      <section className="relative flex min-h-[78svh] flex-col justify-center overflow-hidden bg-ink pb-section pt-[calc(var(--header-h)+6rem)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 50% at 12% 0%, rgb(var(--c-accent) / 0.16), transparent 60%)',
          }}
        />

        <div className="shell relative">
          <span className="eyebrow">{eyebrow}</span>

          <h1 className="mt-6 max-w-[16ch] text-display font-semibold text-bone">{title}</h1>

          <p className="mt-8 max-w-measure text-lead text-bone-400">{lede}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <MagneticButton href="/" variant="ghost" strength={0.24}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to home
            </MagneticButton>
            <MagneticButton
              href={site.phone.tel}
              variant="primary"
              strength={0.3}
              ariaLabel={`Call Spray It Solutions on ${site.phone.display}`}
            >
              <Phone className="size-4" aria-hidden="true" />
              {site.cta.secondary.label}
            </MagneticButton>
          </div>
        </div>
      </section>

      <Marquee
        className="border-y border-line/10 bg-ink py-6"
        itemClassName="font-display text-[clamp(1.5rem,3.4vw,2.5rem)] font-semibold uppercase leading-none tracking-tight text-bone"
      />

      <QuoteCTA />
    </>
  )
}
