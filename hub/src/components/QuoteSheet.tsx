import { useId } from 'react'
import { BUSINESS, GST_RATE } from '../config'
import logo from '../assets/logo.png'
import { dueShort } from '../lib/due'
import { lineTotal, paymentAmounts, quoteTotals, upgradeTotal, upgradesForLine } from '../lib/calc'
import { fmtMoney, fmtQty } from '../lib/format'
import { plainSummary } from '../lib/summary'
import { participantLabel, termsTextFor, useStore } from '../lib/store'
import type { Job, LineItem, Quote, Terms } from '../types'
import TermsBlock from './TermsBlock'

/**
 * The quote as the customer sees it. Used for the staff preview and the
 * customer page so the two cannot drift apart. Always light, and it prints.
 */
export default function QuoteSheet({
  quote,
  job,
  mode,
  onToggleUpgrade,
  businessName = BUSINESS.name,
}: {
  quote: Quote
  job: Job
  mode: 'staff' | 'customer'
  onToggleUpgrade?: (lineId: string) => void
  /** The live customer view passes the name the server sent; everywhere else it is the configured business. */
  businessName?: string
}) {
  const s = useStore()
  const totals = quoteTotals(quote)
  const gstOn = quote.gstApplies !== false
  const summary = plainSummary(quote, s)
  const amounts = paymentAmounts(quote.payments, totals.total)
  const sections = groupBySection(quote.lines)
  const boxId = useId()
  const interactive = mode === 'customer' && !!onToggleUpgrade
  const termsText = termsTextFor(quote)
  const terms: Terms | undefined = termsText.trim() ? { id: quote.termsId, name: '', productType: quote.productType, text: termsText, placeholder: true } : undefined

  return (
    <article className="sheet theme-light" aria-label={`Quote ${quote.number}`}>
      <div className="sheet-body px-5 py-6 sm:px-9 sm:py-9">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <img src={logo} alt={businessName} width={150} height={92} className="h-[74px] w-auto" />
          <p className="num text-sm text-muted">{quote.number}</p>
        </header>

        <div className="mt-6 border-y rule py-4 text-[0.9375rem]">
          <p className="font-bold">{participantLabel(quote.recipient)}</p>
          {job.address && <p className="text-muted">{job.address}</p>}
        </div>

        {quote.notes.trim() && (
          <section className="avoid-break mt-6 rounded-md bg-raise px-4 py-3 text-[0.9375rem]" aria-label="Job notes">
            <h3 className="mb-1 text-sm font-bold text-muted">Job notes</h3>
            <p className="whitespace-pre-line break-words">{quote.notes}</p>
          </section>
        )}

        <h2 className="mt-7 text-[1.5rem] sm:text-[1.75rem]">{quote.title || 'Untitled quote'}</h2>

        <div className="mt-4">
          {sections.length === 0 && <p className="rounded-md bg-raise px-4 py-6 text-center text-muted">Line items will show here as you add them.</p>}
          {sections.map(([section, items]) => (
            <section key={section || 'none'} className="mb-5">
              {section && (
                <h3 className="mb-1 border-b-2 pb-1 text-[1.0625rem]" style={{ borderColor: 'rgb(var(--c-ink))' }}>
                  {section}
                </h3>
              )}
              <ul>
                {items.map((l) => (
                  <li key={l.id} className="avoid-break border-b rule py-3">
                    <div className="li-row">
                      <div className="li-name min-w-0">
                        <p className="break-words font-bold">{l.name || <span className="text-muted">Unnamed line</span>}</p>
                        {l.description && <p className="break-words text-[0.9375rem] text-muted">{l.description}</p>}
                      </div>
                      <p className="li-calc num text-[0.9375rem] text-muted">
                        {fmtQty(l.qty)} {l.unit} <span aria-hidden="true">x</span>
                        <span className="sr-only"> at </span> {l.unitPrice == null ? 'price needed' : fmtMoney(l.unitPrice)}
                      </p>
                      <p className="li-amount num text-right font-bold">{l.unitPrice == null ? '-' : fmtMoney(lineTotal(l))}</p>
                    </div>
                    {upgradesForLine(quote.upgrades, l.id).map((u) => {
                      const id = `${boxId}-${u.id}`
                      return (
                        <div key={u.id} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem] text-green-ink">
                          <p className="num min-w-0 break-words">
                            <span className="font-bold">{u.name || 'Upgrade'}:</span>{' '}
                            {u.unitPrice == null
                              ? 'price needed'
                              : `+${fmtMoney(u.unitPrice)} per ${l.unit} x ${fmtQty(l.qty)} ${l.unit} = ${fmtMoney(upgradeTotal(u, quote.lines))}`}
                          </p>
                          <label
                            htmlFor={id}
                            className={`inline-flex items-center gap-2 font-bold ${interactive ? 'min-h-[44px] cursor-pointer' : ''}`}
                          >
                            <input
                              id={id}
                              type="checkbox"
                              className="check"
                              checked={u.ticked}
                              disabled={!interactive}
                              onChange={() => onToggleUpgrade?.(l.id)}
                            />
                            Add this option
                          </label>
                        </div>
                      )
                    })}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="avoid-break mt-7 ml-auto max-w-md" aria-label="Totals">
          <dl className="space-y-1.5 text-[1.0625rem]">
            <Row label="Subtotal (ex GST)" value={fmtMoney(totals.subtotal)} />
            {gstOn ? <Row label={`GST (${Math.round(GST_RATE * 100)}%)`} value={fmtMoney(totals.gst)} /> : <Row label="GST" value="No GST added" />}
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-4 rounded-md bg-navy px-4 py-4 text-onnavy">
            <p className="text-[1.0625rem] font-bold">{gstOn ? 'Total (inc GST)' : 'Total'}</p>
            <p className="num text-[1.75rem] font-bold sm:text-[2.25rem]">{fmtMoney(totals.total)}</p>
          </div>
        </section>

        {quote.payments.length > 0 && (
          <section className="avoid-break mt-8" aria-label="Payment schedule">
            <h3 className="mb-1 border-b-2 pb-1 text-[1.0625rem]" style={{ borderColor: 'rgb(var(--c-ink))' }}>
              Payment schedule
            </h3>
            <ul>
              {quote.payments.map((p, i) => (
                <li key={p.id} className="flex items-baseline justify-between gap-4 border-b rule py-2.5 text-[0.9375rem]">
                  <span className="min-w-0 break-words">
                    {p.label || 'Payment'}
                    {dueShort(p.dueRule) && <span className="block text-sm text-muted">Due {dueShort(p.dueRule)}</span>}
                  </span>
                  <span className="num shrink-0 text-right">
                    {p.kind === 'percent' && <span className="text-muted">{p.value}%</span>} <span className="ml-2 font-bold">{fmtMoney(amounts[i] ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">{gstOn ? 'Amounts include GST.' : 'No GST added.'}</p>
          </section>
        )}

        {summary.length > 0 && (
          <section className="avoid-break mt-8 rounded-md bg-raise px-5 py-4" style={{ border: '1px solid rgb(var(--c-line))' }} aria-label="In plain words">
            <h3 className="mb-2 text-[1.25rem]">In plain words</h3>
            <div className="space-y-2 text-[1.125rem] leading-snug">
              {summary.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </section>
        )}

        <TermsBlock terms={terms} />
      </div>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="num font-bold">{value}</dd>
    </div>
  )
}

function groupBySection(lines: LineItem[]): [string, LineItem[]][] {
  const map = new Map<string, LineItem[]>()
  for (const l of lines) {
    const k = l.section.trim()
    map.set(k, [...(map.get(k) ?? []), l])
  }
  return [...map.entries()]
}
