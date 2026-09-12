import { Clock, PhoneCall, ShieldCheck } from 'lucide-react'
import Seo from '@/components/ui/Seo'
import SectionHeading from '@/components/ui/SectionHeading'
import { integrations, isConfigured } from '@/config/integrations'
import { booking } from '@/data/booking'
import { site } from '@/data/site'

const ICONS = { clock: Clock, phone: PhoneCall, shield: ShieldCheck }

/**
 * Phone consult booking.
 *
 * Deliberately a real URL rather than a modal. The assistant needs something it
 * can text or read aloud ("head to sprayitsolutions.com.au/book"), which a
 * modal cannot provide, and a single URL is also what ad platforms and
 * conversion tracking key off.
 *
 * The calendar itself is owned by Systemations and only embedded here. The
 * assistant books into that same calendar through the CRM, so availability can
 * never disagree between what a visitor sees and what the AI offers. If the
 * site ever grows its own scheduler, the two will double book.
 */
export default function Book() {
  return (
    <>
      <Seo title={booking.seoTitle} description={booking.seoDescription} path="/book" />

      <section className="bg-ink pb-section pt-[calc(var(--header-h)+clamp(3rem,8vh,6rem))]">
        <div className="shell grid gap-14 lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-5">
            <SectionHeading intro={booking.intro} as="h1" headingClassName="text-h1" />

            <ul className="mt-12 space-y-6 border-t border-line/10 pt-10">
              {booking.points.map((point) => {
                const Icon = ICONS[point.icon]
                return (
                  <li key={point.title} className="flex items-start gap-4">
                    <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <h2 className="text-body font-bold text-bone">{point.title}</h2>
                      <p className="mt-1 text-small leading-relaxed text-bone-400">{point.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <p className="mt-10 text-small text-bone-400">
              {booking.callInstead}{' '}
              <a href={site.phone.tel} className="link-wipe font-semibold text-bone">
                {site.phone.display}
              </a>
              .
            </p>
          </div>

          <div className="lg:col-span-7">
            {isConfigured.booking ? (
              <div className="overflow-hidden rounded-xl border border-line/10 bg-ink-800">
                <iframe
                  src={integrations.bookingCalendarUrl}
                  title={booking.calendarTitle}
                  className="h-[46rem] w-full border-0"
                  scrolling="no"
                />
              </div>
            ) : (
              /* No calendar configured yet. Show the fallback rather than an
                 empty frame, so this page still converts on day one. */
              <div className="rounded-xl border border-line/10 bg-ink-800 p-10 text-center">
                <PhoneCall className="mx-auto size-8 text-accent" aria-hidden="true" />
                <h2 className="mt-6 font-display text-h3 font-semibold text-bone">
                  {booking.fallbackTitle}
                </h2>
                <p className="mx-auto mt-4 max-w-measure text-body text-bone-400">
                  {booking.fallbackBody}
                </p>
                <a href={site.phone.tel} className="btn btn-primary mt-8">
                  Call {site.phone.display}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
