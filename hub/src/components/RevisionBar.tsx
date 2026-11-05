import { effectiveStatus } from '../lib/calc'
import { whatChanged } from '../lib/family'
import { href } from '../lib/router'
import { quotesForRecipient, useStore } from '../lib/store'
import type { Quote } from '../types'

/** Rev 1, Rev 2... for this customer on the job, as links, with a plain line about what changed. */
export default function RevisionBar({ quote, quoteHref = href.edit }: { quote: Quote; quoteHref?: (id: string) => string }) {
  const s = useStore()
  const revisions = quotesForRecipient(quote.jobId, quote.recipient, s)
    .slice()
    .sort((a, b) => a.revision - b.revision)
  return (
    <nav aria-label="Earlier and later versions of this quote" className="space-y-2">
      {revisions.length > 1 && (
        <ul className="flex flex-wrap items-center gap-2">
          {revisions.map((r) => {
            const current = r.id === quote.id
            return (
              <li key={r.id}>
                <a
                  href={quoteHref(r.id)}
                  className={`chip min-h-[44px] ${current ? 'font-bold' : ''}`}
                  aria-current={current ? 'page' : undefined}
                  title={`${r.number}, ${effectiveStatus(r)}`}
                >
                  Rev {r.revision} <span className="text-muted">{effectiveStatus(r)}</span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
      <p className="t-small text-muted">
        <span className="font-bold text-ink">What changed: </span>
        {whatChanged(quote, s)}
      </p>
    </nav>
  )
}
