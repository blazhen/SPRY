import type { ParticipantRef, Quote } from '../types'
import { quoteTotals } from './calc'
import { fmtMoneyWhole } from './format'
import { getQuote, participantLabel, quotesForJob, sameRef, getJob, type State, getState } from './store'

export interface FamilyItem {
  quote: Quote
  /** "Rev 1", "Rev 2"... */
  tag: string
  role: 'quote' | 'alternative' | 'addon'
  /** Plain line about what changed since the previous version. */
  changed: string
}

export interface FamilyGroup {
  recipient: ParticipantRef
  label: string
  items: FamilyItem[]
}

const roleOf = (q: Quote): FamilyItem['role'] => (q.kind === 'primary' ? 'quote' : q.kind)

const names = (q: Quote) => new Map(q.lines.map((l) => [l.name.trim().toLowerCase(), l.name.trim()]))

/**
 * A plain line comparing a quote with the version before it:
 * "Total up $1,200 (10%). Added: Ceiling insulation. Removed: Wall batts."
 * Rev 1 says "First version"; an alternative says which quote it is an alternative to;
 * an add-on says "Add-on to the accepted job".
 */
export function whatChanged(q: Quote, s: State = getState()): string {
  if (q.kind === 'addon') return 'Add-on to the accepted job'
  const mine = quotesForJob(q.jobId, s).filter((x) => sameRef(x.recipient, q.recipient))
  const prev = (q.previousId ? getQuote(q.previousId, s) : undefined) ?? (q.revision > 1 ? mine.filter((x) => x.revision < q.revision).sort((a, b) => b.revision - a.revision)[0] : undefined)
  if (!prev) {
    if (q.kind === 'alternative') {
      const base = quotesForJob(q.jobId, s).filter((x) => x.kind === 'primary' && x.id !== q.id).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0]
      return base ? `Alternative to ${base.number}` : 'Alternative quote'
    }
    return 'First version'
  }
  const now = quoteTotals(q).total
  const before = quoteTotals(prev).total
  const diff = Math.round((now - before) * 100) / 100
  const parts: string[] = []
  if (Math.abs(diff) < 0.005) parts.push('Total unchanged.')
  else {
    const pct = before > 0 ? ` (${Math.round((Math.abs(diff) / before) * 100)}%)` : ''
    parts.push(`Total ${diff > 0 ? 'up' : 'down'} ${fmtMoneyWhole(Math.abs(diff))}${pct}.`)
  }
  const a = names(q)
  const b = names(prev)
  const added = [...a].filter(([k]) => !b.has(k)).map(([, v]) => v)
  const removed = [...b].filter(([k]) => !a.has(k)).map(([, v]) => v)
  if (added.length) parts.push(`Added: ${added.join(', ')}.`)
  if (removed.length) parts.push(`Removed: ${removed.join(', ')}.`)
  return parts.join(' ')
}

/** The quotes on a job, grouped by who they are for, oldest version first inside each group. */
export function quoteFamily(jobId: string, s: State = getState()): FamilyGroup[] {
  const qs = quotesForJob(jobId, s)
  const order: ParticipantRef[] = []
  // People and companies on the job come first, in job order; anyone else follows.
  for (const p of getJob(jobId, s)?.participants ?? []) if (qs.some((q) => sameRef(q.recipient, p))) order.push({ kind: p.kind, id: p.id })
  for (const q of qs) if (!order.some((r) => sameRef(r, q.recipient))) order.push(q.recipient)
  return order.map((recipient) => ({
    recipient,
    label: participantLabel(recipient, s),
    items: qs
      .filter((q) => sameRef(q.recipient, recipient))
      .sort((a, b) => a.revision - b.revision || (a.createdAt < b.createdAt ? -1 : 1))
      .map((quote) => ({ quote, tag: `Rev ${quote.revision}`, role: roleOf(quote), changed: whatChanged(quote, s) })),
  }))
}
