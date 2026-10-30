import { VALID_DAYS_DEFAULT } from '../config'
import { paymentAmounts, quoteTotals } from './calc'
import { fmtDate, fmtMoney } from './format'
import { getJob, type State } from './store'
import type { DueRule, Quote } from '../types'

/** "a, b and c" */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** How each due rule reads in a sentence. An empty phrase means "described in the notes". */
const DUE_PHRASE: Record<DueRule, string> = {
  onAcceptance: 'when you accept this quote',
  oneBusinessDayBeforeJob: 'one business day before the job starts',
  sevenDaysBeforeJob: 'seven days before the job starts',
  onCompletion: 'when the job is finished',
  other: '',
}

const lower =(s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Three to five short plain sentences about a quote, written for the customer. */
export function plainSummary(q: Quote, s?: State): string[] {
  const out: string[] = []
  const job = s ? getJob(q.jobId, s) : getJob(q.jobId)
  const totals = quoteTotals(q)
  const amounts = paymentAmounts(q.payments, totals.total)

  // 1. What it covers and where.
  const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))]
  const sections = uniq(q.lines.map((l) => l.section))
  const names = uniq(q.lines.map((l) => l.name))
  const covers = (sections.length > 0 ? sections : names).slice(0, 4).map(lower)
  const where = job?.address?.trim() ? ` at ${job.address.trim()}` : ''
  if (covers.length > 0) out.push(`This quote covers ${joinList(covers)}${where}.`)
  else out.push(`This quote is for your job${where}.`)

  // 2. Total.
  out.push(
    q.gstApplies === false
      ? `The total is ${fmtMoney(totals.total)}. No GST is added.`
      : `The total is ${fmtMoney(totals.total)} including GST.`,
  )

  // 3. Payment plan.
  if (q.payments.length > 0) {
    const last = q.payments.length - 1
    let hasOther = false
    const parts = q.payments.map((p, i) => {
      const pctText = p.kind === 'percent' && i !== last ? ` (${p.value}%)` : ''
      const when = DUE_PHRASE[p.dueRule]
      if (!when) hasOther = true
      return `${fmtMoney(amounts[i] ?? 0)}${pctText}${when ? ` ${when}` : ''}`
    })
    const sentence =
      parts.length === 1
        ? `You pay ${parts[0].replace(/^(\S+)/, '$1 in full')}.`
        : parts.length === 2
          ? `You pay ${parts[0]}, and ${parts[1]}.`
          : `You pay ${joinList(parts)}.`
    out.push(hasOther ? `${sentence} The rest is described in the payment notes.` : sentence)
  }

  // 4. Optional extras.
  const extras = uniq(q.upgrades.map((u) => u.name))
  if (extras.length > 0) out.push(`You can also choose ${extras.length === 1 ? 'this extra' : 'these extras'}: ${joinList(extras.slice(0, 4))}.`)

  // 5. How long it stays open.
  if (q.validUntil) out.push(`This quote is open until ${fmtDate(q.validUntil)}.`)
  else out.push(`This quote stays open for ${q.validDays || VALID_DAYS_DEFAULT} days after we send it.`)

  return out
}
