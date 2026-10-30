import { useId, type ReactNode } from 'react'
import { BUSINESS, GST_RATE } from '../config'
import logo from '../assets/logo.png'
import { dueShort } from '../lib/due'
import { lineTotal, paymentAmounts, quoteTotals } from '../lib/calc'
import { fmtDate, fmtMoney, fmtQty } from '../lib/format'
import type { Contact, Job, LineItem, Quote } from '../types'
import { AnimatedMoney } from './ui'

/**
 * The quote exactly as the customer sees it. Used for the live preview in the
 * editor and for the customer page, so the two can never drift apart.
 * Always light (class theme-light): it is a document, and it prints.
 */
export function QuoteSheet({
  quote,
  contact,
  job,
  selectedIds,
  onToggleUpgrade,
  upgradesLocked = false,
  children,
}: {
  quote: Quote
  contact?: Contact
  job?: Job
  selectedIds: string[]
  /** When missing, the upgrade boxes are not interactive. */
  onToggleUpgrade?: (id: string) => void
  upgradesLocked?: boolean
  /** Slot under the totals, used for the Accept panel on the customer page. */
  children?: ReactNode
}) {
  const totals = quoteTotals(quote, selectedIds)
  const sections = groupBySection(quote.items)
  const amounts = paymentAmounts(quote.payments, totals.total)
  const upId = useId()
  const accepted = quote.status === 'accepted'
  const shownUpgrades = accepted ? quote.upgrades : quote.upgrades

  return (
    <article className="sheet theme-light" aria-label={`Quote ${quote.number}`}>
      <div className="sheet-body px-5 py-6 sm:px-9 sm:py-9">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div>
            <img src={logo} alt={BUSINESS.name} width={150} height={92} className="h-[74px] w-auto" />
          </div>
          <div className="text-right">
            <p className="font-display text-[1.75rem] leading-none text-navy">Quote</p>
            <p className="num mt-1 text-sm font-bold">{quote.number}</p>
            <dl className="mt-2 text-sm text-muted">
              <div className="flex justify-end gap-2">
                <dt>Issued</dt>
                <dd className="num font-bold text-ink">{fmtDate(quote.issuedOn) || '-'}</dd>
              </div>
              <div className="flex justify-end gap-2">
                <dt>Valid until</dt>
                <dd className="num font-bold text-ink">{fmtDate(quote.validUntil) || '-'}</dd>
              </div>
            </dl>
            {quote.isAddOn && (
              <p className="mt-2 inline-block rounded-full bg-amber-wash px-2.5 py-1 text-[0.8125rem] font-bold text-amber-ink">Add-on quote</p>
            )}
            {quote.isOption && (
              <p className="mt-2 inline-block rounded-full bg-navy-wash px-2.5 py-1 text-[0.8125rem] font-bold text-navy">Option: accept one</p>
            )}
          </div>
        </header>

        {/* Parties */}
        <div className="mt-7 grid gap-5 border-y rule py-5 text-[0.9375rem] sm:grid-cols-3">
          <div>
            <p className="mb-1 text-sm font-bold text-muted">Prepared for</p>
            {contact ? (
              <p>
                <span className="font-bold">{contact.name}</span>
                <br />
                {contact.email}
                <br />
                {contact.phone}
              </p>
            ) : (
              <p className="text-muted">No contact chosen yet</p>
            )}
          </div>
          <div>
            <p className="mb-1 text-sm font-bold text-muted">Job site</p>
            {job ? (
              <p>
                <span className="font-bold">{job.title}</span>
                <br />
                {job.address}
              </p>
            ) : (
              <p className="text-muted">No job chosen yet</p>
            )}
          </div>
          <div>
            <p className="mb-1 text-sm font-bold text-muted">Your contact</p>
            <p>
              <span className="font-bold">{BUSINESS.contactName}</span>, {BUSINESS.name}
              <br />
              Mobile {BUSINESS.contactPhone}
              <br />
              {BUSINESS.email}
            </p>
          </div>
        </div>

        <h2 className="mt-7 text-[1.5rem] sm:text-[1.75rem]">{quote.title || 'Untitled quote'}</h2>

        {/* Line items */}
        <div className="mt-4">
          {sections.length === 0 && <p className="rounded-md bg-raise px-4 py-6 text-center text-muted">Line items will show here as you add them.</p>}
          {sections.map(([section, items]) => (
            <section key={section || 'none'} className="avoid-break mb-5">
              {section && <h3 className="mb-1 border-b-2 pb-1 text-[1.0625rem]" style={{ borderColor: 'rgb(var(--c-ink))' }}>{section}</h3>}
              <ul>
                {items.map((i) => (
                  <li key={i.id} className="li-row border-b rule py-3">
                    <div className="li-name min-w-0">
                      <p className="break-words font-bold">{i.name || <span className="text-muted">Unnamed line</span>}</p>
                      {i.description && <p className="break-words text-[0.9375rem] text-muted">{i.description}</p>}
                    </div>
                    <p className="li-calc num text-[0.9375rem] text-muted">
                      {fmtQty(i.qty)} {i.unit} <span aria-hidden="true">x</span>
                      <span className="sr-only"> at </span> {i.unitPrice == null ? 'price needed' : fmtMoney(i.unitPrice)}
                    </p>
                    <p className="li-amount num text-right font-bold">{i.unitPrice == null ? '-' : fmtMoney(lineTotal(i))}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Optional upgrades */}
        {shownUpgrades.length > 0 && (
          <fieldset className="avoid-break mt-6 rounded-lg bg-navy-wash p-4 sm:p-5" disabled={upgradesLocked || !onToggleUpgrade} style={{ border: 0 }}>
            <legend className="float-left mb-3 w-full font-display text-[1.25rem]">
              {accepted ? 'Upgrades you chose' : 'Optional upgrades'}
            </legend>
            {!accepted && onToggleUpgrade && !upgradesLocked && (
              <p className="mb-3 clear-both text-[0.9375rem] text-muted">Tick any you would like. The total updates as you go.</p>
            )}
            <ul className="clear-both space-y-2">
              {shownUpgrades.map((u) => {
                const on = selectedIds.includes(u.id)
                const id = `${upId}-${u.id}`
                const interactive = !!onToggleUpgrade && !upgradesLocked
                return (
                  <li key={u.id}>
                    <label
                      htmlFor={id}
                      className={`flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md bg-surface p-3.5 ${interactive ? 'cursor-pointer hover:bg-white' : ''}`}
                      style={{ border: `2px solid ${on ? 'rgb(var(--c-navy))' : 'rgb(var(--c-line))'}` }}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        className="check mt-0.5"
                        checked={on}
                        disabled={!interactive}
                        onChange={() => onToggleUpgrade?.(u.id)}
                      />
                      <span className="min-w-[11rem] flex-1">
                        <span className="block break-words font-bold">{u.name || 'Unnamed upgrade'}</span>
                        {u.description && <span className="block break-words text-[0.9375rem] text-muted">{u.description}</span>}
                      </span>
                      <span className="num ml-auto shrink-0 pl-9 text-right font-bold sm:pl-0">
                        {u.price == null ? 'price needed' : `+${fmtMoney(u.price)}`}
                        <span className="block text-[0.75rem] font-normal text-muted">ex GST</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )}

        {/* Totals */}
        <section className="avoid-break mt-7 ml-auto max-w-md" aria-label="Totals">
          <dl className="space-y-1.5 text-[0.9375rem]">
            <Row label="Quoted work" value={fmtMoney(totals.itemsSubtotal)} />
            {totals.upgradesSubtotal > 0 && <Row label="Chosen upgrades" value={fmtMoney(totals.upgradesSubtotal)} />}
            <Row label="Subtotal, ex GST" value={fmtMoney(totals.subtotal)} />
            <Row label={`GST (${Math.round(GST_RATE * 100)}%)`} value={fmtMoney(totals.gst)} />
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-4 rounded-md bg-navy px-4 py-4 text-onnavy">
            <p className="text-[0.9375rem] font-bold">Total, inc GST</p>
            <p className="total-figure text-[2rem] sm:text-[2.5rem]">
              <AnimatedMoney value={totals.total} />
            </p>
          </div>
          <p className="sr-only" aria-live="polite" role="status">
            Total including GST {fmtMoney(totals.total)}
          </p>
        </section>

        {/* Payment schedule */}
        {quote.payments.length > 0 && (
          <section className="avoid-break mt-8" aria-label="Payment schedule">
            <h3 className="mb-1 border-b-2 pb-1 text-[1.0625rem]" style={{ borderColor: 'rgb(var(--c-ink))' }}>Payment schedule</h3>
            <ul>
              {quote.payments.map((p, idx) => (
                <li key={p.id} className="flex items-baseline justify-between gap-4 border-b rule py-2.5 text-[0.9375rem]">
                  <span className="min-w-0 break-words">
                    {p.label || 'Payment'}
                    {dueShort(p.due) && <span className="block text-sm text-muted">Due {dueShort(p.due)}</span>}
                  </span>
                  <span className="num shrink-0 text-right">
                    <span className="text-muted">{p.percent}%</span> <span className="ml-2 font-bold">{fmtMoney(amounts[idx] ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">Amounts include GST. An invoice with this quote attached is issued for each stage.</p>
          </section>
        )}

        {(quote.notes.trim() || quote.terms.trim()) && (
          <div className="mt-8 grid gap-6 text-[0.9375rem] sm:grid-cols-2">
            {quote.notes.trim() && (
              <section>
                <h3 className="mb-1 text-[1.0625rem]">Notes</h3>
                <p className="whitespace-pre-line break-words text-muted">{quote.notes}</p>
              </section>
            )}
            {quote.terms.trim() && (
              <section>
                <h3 className="mb-1 text-[1.0625rem]">Terms</h3>
                <p className="whitespace-pre-line break-words text-muted">{quote.terms}</p>
              </section>
            )}
          </div>
        )}

        {children && <div className="sheet-actions mt-8">{children}</div>}

        <footer className="mt-9 border-t rule pt-4 text-sm text-muted">
          {BUSINESS.name} | {BUSINESS.contactName}, {BUSINESS.contactPhone} | {BUSINESS.abn}
        </footer>
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

function groupBySection(items: LineItem[]): [string, LineItem[]][] {
  const map = new Map<string, LineItem[]>()
  for (const i of items) {
    const k = i.section.trim()
    map.set(k, [...(map.get(k) ?? []), i])
  }
  return [...map.entries()]
}
