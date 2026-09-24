import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Phone } from 'lucide-react'
import { site } from '@/data/site'

/** Pages where the bar would point at the page you are already on. */
const HIDDEN_ON = ['/contact', '/book']

/**
 * Two buttons pinned to the bottom of a phone screen: call, and get a quote.
 *
 * Most enquiries to a trade come from a phone, usually from someone standing
 * in the cold room in question. Whatever they are reading, the two things
 * they might do next are one thumb away. Desktop has the header for this, so
 * the bar only exists below the medium breakpoint, and the footer carries
 * matching bottom padding so its last line is never hidden under it.
 */
export default function MobileCtaBar() {
  const { pathname } = useLocation()
  if (
    HIDDEN_ON.includes(pathname) ||
    pathname.startsWith('/thanks') ||
    pathname.startsWith('/heroes')
  ) {
    return null
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/10 bg-ink/90 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      role="region"
      aria-label="Call or get a quote"
    >
      <div className="grid grid-cols-2 gap-3">
        <a href={site.phone.tel} className="btn btn-ghost !px-3">
          <Phone className="size-4" aria-hidden="true" />
          Call us
        </a>
        <Link to={site.cta.primary.href} className="btn btn-primary !px-3">
          {site.cta.primary.label}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
