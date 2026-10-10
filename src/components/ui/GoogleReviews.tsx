import { ArrowUpRight } from 'lucide-react'
import Stars from '@/components/ui/Stars'
import { site } from '@/data/site'

/**
 * Links to the business's Google reviews, with the marks people recognise.
 *
 * Rachael asked on 10 October for more ways into the Google reviews and
 * clearer Google symbols, so every link to them is this one component:
 * Google's four-colour G, the stars in Google's gold, the rating, and a plain
 * "Google reviews" label, opening the listing's reviews in a new tab. It sits
 * in the home hero, in the reviews section, at the end of every inner page,
 * on the contact page and in the footer.
 *
 * The rating is the listing's own, 5.0. It never shows a review count,
 * because a count printed here would be out of date the day the next review
 * arrives.
 */

/** Google's "G", in its four colours. Decorative: the text says "Google". */
export function GoogleG({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

const RATING = '5.0'
const LABEL = 'Rated 5.0 on Google'

interface GoogleReviewsProps {
  /**
   * 'badge': a bordered pill with the G, stars, rating and "Read our Google
   * reviews". 'inline': the same marks on one line, for a row of small text.
   */
  variant?: 'badge' | 'inline'
  className?: string
}

export default function GoogleReviews({ variant = 'badge', className = '' }: GoogleReviewsProps) {
  if (!site.reviewsUrl) return null

  if (variant === 'inline') {
    return (
      <a
        href={site.reviewsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`group inline-flex min-h-11 items-center gap-2 text-small text-bone-200/80 transition-colors hover:text-bone ${className}`}
      >
        <GoogleG className="size-4" />
        <Stars tone="google" label={LABEL} />
        <span className="font-semibold text-bone">{RATING}</span>
        <span className="underline decoration-bone/25 underline-offset-4 group-hover:decoration-bone">
          Google reviews
        </span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  }

  return (
    <a
      href={site.reviewsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex min-h-11 items-center gap-3 rounded-pill border border-line/15 bg-ink-800 py-2 pl-3 pr-4 shadow-sm transition-colors duration-300 hover:border-bone ${className}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-white shadow-sm ring-1 ring-black/5">
        <GoogleG className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="text-small font-bold text-bone">{RATING}</span>
          <Stars tone="google" size="size-3.5" label={LABEL} />
        </span>
        <span className="text-small font-semibold text-accent">
          Read our Google reviews
          <ArrowUpRight className="ml-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
        </span>
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
