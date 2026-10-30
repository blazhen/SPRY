import { effectiveStatus } from './calc'
import { daysSince } from './format'
import { getQuote, saveQuote } from './store'
import type { Quote, QuoteStatus } from '../types'

/**
 * Where a quote is on its way, in plain words. DEMO: "Opened by customer" is a
 * demo of what the customer link will report; the real count needs the
 * Systemations link tracking, which is not tested yet.
 */
export type StageId = 'draft' | 'sent' | 'opened' | 'accepted' | 'declined' | 'expired' | 'superseded'

export interface QuoteStage {
  id: StageId
  label: string
  /** ISO timestamp of the last step. */
  at?: string
  /** Days waiting, only for Sent quotes with no answer yet. */
  waitDays?: number
  /** Colour of the "Waiting" note: none, amber after 2 days, red after 7. */
  waitTone?: 'blue' | 'amber' | 'hot'
}

export function quoteStage(q: Quote, now: Date = new Date()): QuoteStage {
  const st: QuoteStatus = effectiveStatus(q)
  if (st === 'Draft') return { id: 'draft', label: 'Draft', at: q.updatedAt }
  if (st === 'Accepted') return { id: 'accepted', label: 'Accepted', at: q.acceptedAt }
  if (st === 'Declined') return { id: 'declined', label: 'Declined', at: q.declinedAt }
  if (st === 'Expired') return { id: 'expired', label: 'Ran out', at: q.validUntil }
  if (st === 'Superseded') return { id: 'superseded', label: 'Replaced by a newer version', at: q.updatedAt }
  const waitDays = q.sentAt ? daysSince(q.sentAt, now) : 0
  const waitTone = waitDays > 7 ? 'hot' : waitDays > 2 ? 'amber' : 'blue'
  if (q.firstOpenedAt) return { id: 'opened', label: 'Opened by customer', at: q.firstOpenedAt, waitDays, waitTone }
  return { id: 'sent', label: 'Sent', at: q.sentAt, waitDays, waitTone }
}

/** "Waiting 5 days" and friends. */
export const waitingText = (days: number) => (days <= 0 ? 'Sent today' : `Waiting ${days} ${days === 1 ? 'day' : 'days'}`)

export function whenText(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  if (iso.length === 10) return day
  return `${day}, ${d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`
}

/** Quotes the customer has opened but not answered. */
export const isOpenedNotAnswered = (q: Quote) => effectiveStatus(q) === 'Sent' && !!q.firstOpenedAt

/**
 * Called when a customer opens the quote link. Only a Sent quote counts.
 * Sets firstOpenedAt once, then updates lastOpenedAt and the count.
 */
export function markQuoteOpened(id: string) {
  const q = getQuote(id)
  if (!q || q.status !== 'Sent') return
  const now = new Date().toISOString()
  saveQuote({ ...q, firstOpenedAt: q.firstOpenedAt ?? now, lastOpenedAt: now, openCount: (q.openCount ?? 0) + 1 })
}
