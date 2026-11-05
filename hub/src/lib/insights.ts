import { seedAll, seedCompanies, seedContacts, seedTerms } from '../data/mock'
import type { Invoice, Job, Quote } from '../types'
import { quoteTotals } from './calc'
import { daysOverdue, invoiceTotals } from './invoices'
import { whatChanged } from './family'
import { addDaysISO, daysSince, localDay, stall, toISODate } from './format'
import { allInvoices, currentOwnerId, getState, invoiceState, invoicesForJob, todoQueue, type State } from './store'

export interface TodoSummary {
  /** Jobs waiting for you to write the quote (the To do list). */
  waitingToQuote: number
  /** Sent quotes the customer has not answered and that are still open. */
  sentWaiting: number
  /** Total of those quotes, inc GST. */
  sentWaitingValue: number
  /** Quotes accepted in the last 30 days. */
  wonThisMonth: number
  /** Total of those quotes, inc GST. */
  wonThisMonthValue: number
}

export interface ExpiryNudge {
  quote: Quote
  job: Job
  /** Days until the quote runs out. Negative = already ran out. */
  daysLeft: number
  /** Whole days since the quote was sent (0 when it has no sent date). */
  daysQuiet: number
  kind: 'expiring' | 'expired' | 'quiet'
}

export interface WeeklySummary {
  /** ISO dates: seven days back, and seven days ahead. */
  from: string
  to: string
  quotesSent: number
  quotesAccepted: number
  acceptedValue: number
  newJobs: number
  waitingToQuote: number
  sentWaiting: number
  invoicesPaidTotal: number
  overdueInvoices: Invoice[]
  overdueTotal: number
  expiring: ExpiryNudge[]
  stuckJobs: Job[]
}

const WON_DAYS = 30
const EXPIRING_DAYS = 7
const EXPIRED_WINDOW_DAYS = 14
const QUIET_DAYS = 10

const isoDay = (d: Date) => toISODate(d)
const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((new Date(localDay(toISO) + 'T00:00:00').getTime() - new Date(localDay(fromISO) + 'T00:00:00').getTime()) / 86400000)

/** Sent quotes that are still open (not past their date). */
const openSent = (s: State, now: Date) => s.quotes.filter((q) => q.status === 'Sent' && !(q.validUntil && q.validUntil < isoDay(now)))

export function todoSummary(s: State = getState(), now: Date = new Date()): TodoSummary {
  const sent = openSent(s, now)
  const since = addDaysISO(isoDay(now), -WON_DAYS)
  const won = s.quotes.filter((q) => q.status === 'Accepted' && q.acceptedAt && localDay(q.acceptedAt) >= since)
  return {
    waitingToQuote: todoQueue(currentOwnerId(), s, now).length,
    sentWaiting: sent.length,
    sentWaitingValue: Math.round(sent.reduce((n, q) => n + quoteTotals(q).total, 0) * 100) / 100,
    wonThisMonth: won.length,
    wonThisMonthValue: Math.round(won.reduce((n, q) => n + (q.acceptedTotal ?? quoteTotals(q).total), 0) * 100) / 100,
  }
}

const KIND_RANK: Record<ExpiryNudge['kind'], number> = { expiring: 0, expired: 1, quiet: 2 }

/**
 * Sent quotes with 7 days or less left, quotes that ran out in the last 14 days, and sent
 * quotes with no reply for 10 days or more. One entry per quote, most urgent first.
 */
export function expiryNudges(s: State = getState(), now: Date = new Date()): ExpiryNudge[] {
  const today = isoDay(now)
  const out: ExpiryNudge[] = []
  for (const quote of s.quotes) {
    const job = s.jobs.find((j) => j.id === quote.jobId)
    if (!job || !quote.validUntil) continue
    const daysLeft = daysBetween(today, quote.validUntil)
    const open = quote.status === 'Sent' && daysLeft >= 0
    const ranOut = (quote.status === 'Expired' || (quote.status === 'Sent' && daysLeft < 0)) && daysLeft < 0 && daysLeft >= -EXPIRED_WINDOW_DAYS
    const daysQuiet = quote.sentAt ? daysSince(quote.sentAt, now) : 0
    if (open && daysLeft <= EXPIRING_DAYS) out.push({ quote, job, daysLeft, daysQuiet, kind: 'expiring' })
    else if (ranOut) out.push({ quote, job, daysLeft, daysQuiet, kind: 'expired' })
    else if (open && quote.sentAt && daysQuiet >= QUIET_DAYS) out.push({ quote, job, daysLeft, daysQuiet, kind: 'quiet' })
  }
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return KIND_RANK[a.kind] - KIND_RANK[b.kind]
    // Soonest to run out first; for expired, the most recent first; for quiet, the longest quiet first.
    return a.kind === 'expired' ? b.daysLeft - a.daysLeft : a.kind === 'quiet' ? (a.quote.sentAt ?? '').localeCompare(b.quote.sentAt ?? '') : a.daysLeft - b.daysLeft
  })
}

export interface MoneyToChase {
  invoice: Invoice
  job: Job | undefined
  /** overdue: late. part: part paid, balance still owed. unsent: made but not sent to the customer yet. */
  reason: 'overdue' | 'part' | 'unsent'
  /** Whole days past the due date (0 unless overdue). */
  daysLate: number
  /** What is still owed, inc GST. */
  owing: number
}

const CHASE_ORDER = { overdue: 0, part: 1, unsent: 2 } as const

/**
 * Money to chase: invoices that are late, part paid with a balance, or made but never sent. Not only the overdue ones,
 * because a deposit that was never sent is money nobody is asking for. Late ones first, the longest late at the top.
 */
export function moneyToChase(s: State = getState(), now: Date = new Date()): MoneyToChase[] {
  const today = toISODate(now)
  const out: MoneyToChase[] = []
  for (const invoice of s.invoices) {
    if (invoice.status === 'paid' || invoice.status === 'void') continue
    const owing = invoiceTotals(invoice).due
    if (owing <= 0) continue
    const late = daysOverdue(invoice, today)
    const reason: MoneyToChase['reason'] | undefined = late > 0 ? 'overdue' : invoice.status === 'part' ? 'part' : invoice.status === 'draft' ? 'unsent' : undefined
    if (!reason) continue
    out.push({ invoice, job: s.jobs.find((j) => j.id === invoice.jobId), reason, daysLate: late, owing })
  }
  return out.sort((a, b) => CHASE_ORDER[a.reason] - CHASE_ORDER[b.reason] || b.daysLate - a.daysLate || b.owing - a.owing)
}

/** Sent quotes the customer has not answered (still open), the ones waiting longest first. */
export function sentQuotesWaiting(s: State = getState(), now: Date = new Date()): Quote[] {
  return openSent(s, now).sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? ''))
}

/** The last 7 days and the next 7. */
export function weeklySummary(s: State = getState(), now: Date = new Date()): WeeklySummary {
  const today = isoDay(now)
  const from = addDaysISO(today, -7)
  const to = addDaysISO(today, 7)
  const inPast = (iso?: string) => !!iso && localDay(iso) >= from && localDay(iso) <= today
  const sentQuotes = s.quotes.filter((q) => inPast(q.sentAt))
  const accepted = s.quotes.filter((q) => q.status === 'Accepted' && inPast(q.acceptedAt))
  const overdue = s.invoices.filter((i) => invoiceState(i, now) === 'Overdue')
  const sum = (n: number[]) => Math.round(n.reduce((a, b) => a + b, 0) * 100) / 100
  const t = todoSummary(s, now)
  return {
    from,
    to,
    quotesSent: sentQuotes.length,
    quotesAccepted: accepted.length,
    acceptedValue: sum(accepted.map((q) => q.acceptedTotal ?? quoteTotals(q).total)),
    newJobs: s.jobs.filter((j) => inPast(j.createdAt)).length,
    waitingToQuote: t.waitingToQuote,
    sentWaiting: t.sentWaiting,
    invoicesPaidTotal: sum(s.invoices.filter((i) => inPast(i.paidAt)).map((i) => i.amount)),
    overdueInvoices: overdue,
    overdueTotal: sum(overdue.map((i) => i.amount)),
    expiring: expiryNudges(s, now),
    stuckJobs: s.jobs.filter((j) => stall(j, now).level === 'stuck'),
  }
}

/** Light self-check against the starting data (not the saved data). Call it from a script or the console. */
export function insightsSelfCheck(): { ok: boolean; failures: string[] } {
  const failures: string[] = []
  const eq = (name: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)
  }
  const yes = (name: string, cond: boolean) => {
    if (!cond) failures.push(name)
  }
  const now = new Date()
  const seed = seedAll()
  const s: State = { ...seed, contacts: seedContacts, companies: seedCompanies, terms: seedTerms, userTemplates: [], settings: { jobWord: 'Job' }, persistent: true }
  const q = (id: string) => s.quotes.find((x) => x.id === id) as Quote
  const j = (id: string) => s.jobs.find((x) => x.id === id) as Job
  const total = (ids: string[]) => Math.round(ids.reduce((n, id) => n + quoteTotals(q(id)).total, 0) * 100) / 100

  // todoSummary matches the seed.
  const t = todoSummary(s, now)
  eq('todo waitingToQuote', t.waitingToQuote, 3)
  eq('todo sentWaiting', t.sentWaiting, 4)
  eq('todo sentWaitingValue', t.sentWaitingValue, total(['q6', 'q8', 'q9', 'q10']))
  eq('todo wonThisMonth', t.wonThisMonth, 4)
  eq('todo wonThisMonthValue', t.wonThisMonthValue, Math.round((q('q7').acceptedTotal! + q('q11').acceptedTotal! + q('q13').acceptedTotal! + q('q14').acceptedTotal!) * 100) / 100)

  // expiryNudges finds the expiring quote, the one that ran out, and the quiet one. Others stay out.
  const n = expiryNudges(s, now)
  const byId = (id: string) => n.find((x) => x.quote.id === id)
  eq('nudge expiring kind', byId('q9')?.kind, 'expiring')
  eq('nudge expiring daysLeft', byId('q9')?.daysLeft, 5)
  eq('nudge expired kind', byId('q5')?.kind, 'expired')
  eq('nudge quiet kind', byId('q10')?.kind, 'quiet')
  eq('nudge leaves out fresh quotes', [byId('q6'), byId('q8'), byId('q7')].filter(Boolean).length, 0)
  eq('nudge most urgent first', n.map((x) => x.quote.id), ['q9', 'q5', 'q10'])

  // stall levels.
  eq('stall stuck (Quoting 12 days)', stall(j('j1'), now).level, 'stuck')
  eq('stall slow (Quoting 3 days)', stall(j('j3'), now).level, 'slow')
  eq('stall ok (Quote sent 4 days)', stall(j('j5'), now).level, 'ok')
  eq('stall ok (Won)', stall(j('j6'), now).level, 'ok')
  eq('stall stuck (Quote accepted 14 days)', stall(j('j11'), now).level, 'stuck')
  eq('stall label', stall(j('j1'), now).label, '12 days here')

  // whatChanged.
  const w2 = whatChanged(q('q2'), s)
  yes(`whatChanged Rev 2 total up (${w2})`, w2.startsWith('Total up '))
  yes(`whatChanged Rev 2 added line (${w2})`, w2.includes('Added: Ceiling cavity top-up.'))
  eq('whatChanged Rev 1', whatChanged(q('q1'), s), 'First version')
  eq('whatChanged add-on', whatChanged(q('q8'), s), 'Add-on to the accepted job')
  eq('whatChanged alternative', whatChanged(q('q10'), s), 'Alternative to Q-1046')

  // invoiceState.
  const inv = (jobId: string) => invoicesForJob(jobId, s).map((i) => invoiceState(i, now))
  eq('invoices j11 (deposit overdue)', inv('j11'), ['Overdue', 'Not sent'])
  eq('invoices j6 (deposit paid, final not sent)', inv('j6'), ['Paid', 'Not sent'])
  eq('invoices j9 (all paid)', inv('j9'), ['Paid', 'Paid'])
  const overdueDeposit = invoicesForJob('j11', s)[0]
  eq('overdue by 6 days', overdueDeposit.dueDate && daysBetween(overdueDeposit.dueDate, isoDay(now)), 6)
  eq('invoices j12 (deposit unsent and not overdue)', inv('j12'), ['Not sent', 'Not sent'])
  eq('nudge quiet daysQuiet', byId('q10')?.daysQuiet, 12)
  eq('allInvoices counts seed', allInvoices(s).length, 13)
  eq('weekly overdue total', weeklySummary(s, now).overdueTotal, overdueDeposit.amount)

  return { ok: failures.length === 0, failures }
}
