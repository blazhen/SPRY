import { Mail, MapPin, Phone } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import SectionHeading from '@/components/ui/SectionHeading'
import Breadcrumbs from '@/components/Breadcrumbs'
import QuoteForm from '@/components/QuoteForm'
import { contactIntro } from '@/data/forms'
import { site } from '@/data/site'

/**
 * Quote enquiry page.
 *
 * Every "Get a Free Quote" button on the site lands here, so this is the one
 * page where the funnel either converts or leaks. The form is the page:
 * contact details and the map sit beside it for people who would rather call
 * or drop in, and the booking link is offered for people who would rather
 * talk than type.
 */
export default function Contact() {
  return (
    <>
      <Seo
        title="Get a Free Spray Foam Quote | Spray It Solutions"
        description="Tell us what needs insulating and we will come back with honest advice and a free quote. Australia-wide."
        path="/contact"
      />

      <section className="bg-ink pb-section pt-[calc(var(--header-h)+clamp(2.5rem,6vh,4.5rem))]">
        <div className="shell">
          <Breadcrumbs items={[{ label: 'Contact' }]} className="mb-8" />
        </div>

        <div className="shell grid gap-14 lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-5">
            <SectionHeading intro={contactIntro} as="h1" headingClassName="text-h1" />

            <dl className="mt-12 space-y-7 border-t border-line/10 pt-10">
              <div className="flex items-start gap-4">
                <dt className="sr-only">Phone</dt>
                <Phone className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
                <dd>
                  <a href={site.phone.tel} className="link-wipe text-h4 font-semibold text-bone">
                    {site.phone.display}
                  </a>
                  <p className="mt-1 text-small text-bone-400">
                    Straight through to the family, not a call centre.
                  </p>
                </dd>
              </div>

              <div className="flex items-start gap-4">
                <dt className="sr-only">Email</dt>
                <Mail className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
                <dd>
                  <a href={site.emailHref} className="link-wipe break-all text-body text-bone">
                    {site.email}
                  </a>
                </dd>
              </div>

              <div className="flex items-start gap-4">
                <dt className="sr-only">Address</dt>
                <MapPin className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
                <dd>
                  <span className="mb-1 block text-eyebrow font-bold uppercase tracking-[0.16em] text-bone-400">
                    Workshop
                  </span>
                  <address className="not-italic text-body text-bone-400">
                    <a
                      href={site.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-wipe inline-block"
                    >
                      {site.address.line1}
                      <br />
                      {site.address.suburb} {site.address.state} {site.address.postcode}
                      <span className="sr-only"> (opens Google Maps in a new tab)</span>
                    </a>
                  </address>
                  <p className="mt-1 text-small text-bone-400">Servicing {site.serviceArea}.</p>
                </dd>
              </div>
            </dl>

            {/* The listing on a map. Loaded lazily: it is below the form on a
                phone and a Google frame is the heaviest thing on the page. */}
            <div className="mt-10 overflow-hidden rounded-xl border border-line/10 bg-surface">
              <iframe
                src={site.mapEmbedUrl}
                title={`Map showing ${site.name} at ${site.address.full}`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="block aspect-[4/3] w-full border-0 sm:aspect-[16/10]"
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <QuoteForm />
          </div>
        </div>
      </section>
    </>
  )
}
