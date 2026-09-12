import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowUpRight, Check } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import { thanks } from '@/data/forms'
import { site } from '@/data/site'
import { trackConversion } from '@/lib/analytics'

/**
 * Confirmation pages, at their own URLs.
 *
 * A distinct URL per outcome is what makes conversion tracking reliable: the
 * ad platforms count a landing on this page rather than a click on a button,
 * so a submission that failed on the way to the CRM is never counted as a lead.
 * It also gives Systemations somewhere to send people after a booking.
 *
 * Marked noindex: these pages are meaningless in search results and would
 * otherwise report phantom conversions from organic traffic landing directly.
 */
export default function ThankYou() {
  const { kind } = useParams<{ kind: string }>()
  const booked = kind === 'booked'
  const copy = booked ? thanks.booked : thanks.quote

  useEffect(() => {
    trackConversion(booked ? 'call_booked' : 'quote_submitted')
  }, [booked])

  return (
    <>
      <Seo
        title={`${copy.title} | Spray It Solutions`}
        description={copy.lede}
        path={`/thanks/${booked ? 'booked' : 'quote'}`}
        noindex
      />

      <section className="grid min-h-[70vh] place-items-center bg-ink pb-section pt-[calc(var(--header-h)+clamp(3rem,8vh,6rem))]">
        <div className="shell max-w-3xl text-center">
          <span
            className="mx-auto grid size-16 place-items-center rounded-pill bg-accent text-ink"
            aria-hidden="true"
          >
            <Check className="size-8" strokeWidth={3} />
          </span>

          <p className="mt-8 text-eyebrow font-bold uppercase tracking-[0.2em] text-accent">
            {copy.eyebrow}
          </p>
          <h1 className="mt-5 font-display text-h1 font-semibold text-bone">{copy.title}</h1>
          <p className="mx-auto mt-6 max-w-measure text-lead text-bone-400">{copy.lede}</p>

          <div className="mt-11 flex flex-wrap items-center justify-center gap-4">
            <Link to="/" className="btn btn-primary">
              Back to the homepage
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <a href={site.phone.tel} className="btn btn-ghost">
              Call {site.phone.display}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
