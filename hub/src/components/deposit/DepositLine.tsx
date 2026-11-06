import { quoteTotals } from '../../lib/calc'
import { depositFor, depositOf } from '../../lib/extras'
import { fmtDate, fmtMoney, localDay, todayISO } from '../../lib/format'
import type { Quote } from '../../types'
import { useExtraSettings } from '../../lib/useExtras'
import './deposit.css'

/**
 * Read only: "Deposit: $X due <date>" for a quote. Nothing is sent. Shows nothing when deposits are switched off.
 * An accepted quote uses the accepted day and total; an open quote shows what it would be if accepted today.
 * What the Hub would write to the CRM on acceptance: deposit_amount and deposit_due_date (not written from here).
 */
export function DepositLine({ quote }: { quote: Quote }) {
  const ex = useExtraSettings()
  const rule = depositOf(ex.raw)
  if (!rule.enabled) return null
  const accepted = quote.status === 'Accepted' && !!quote.acceptedAt
  const t = quoteTotals(quote)
  const total = accepted && quote.acceptedTotal != null ? quote.acceptedTotal : t.total
  const d = depositFor({ lines: quote.lines, subtotal: t.subtotal, total, acceptedOn: accepted ? localDay(quote.acceptedAt as string) : todayISO() }, ex.foam, rule)
  if (!(d.amount > 0)) return null
  return (
    <p className="dp-line" data-deposit-line>
      <strong>{accepted ? 'Deposit' : 'Deposit if accepted today'}: {fmtMoney(d.amount)}</strong> due {fmtDate(d.dueDate)}
      {!rule.confirmed && ' (example rule, not confirmed)'}
      <span className="dp-why">{d.reason}</span>
    </p>
  )
}
