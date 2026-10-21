import { GST_RATE } from '../config'
import type { LineItem, PaymentStage, Quote, QuoteStatus, Upgrade } from '../types'
import { todayISO } from './format'

export const lineTotal = (i: LineItem) => round2((i.qty || 0) * (i.unitPrice ?? 0))
export const round2 = (n: number) => Math.round(n * 100) / 100

export interface Totals {
  itemsSubtotal: number
  upgradesSubtotal: number
  subtotal: number
  gst: number
  total: number
}

/** Totals for a quote given the ticked upgrade ids. Prices are ex GST. */
export function computeTotals(
  items: LineItem[],
  upgrades: Upgrade[],
  selectedIds: string[],
): Totals {
  const itemsSubtotal = round2(items.reduce((s, i) => s + lineTotal(i), 0))
  const upgradesSubtotal = round2(
    upgrades.filter((u) => selectedIds.includes(u.id)).reduce((s, u) => s + (u.price ?? 0), 0),
  )
  const subtotal = round2(itemsSubtotal + upgradesSubtotal)
  const gst = round2(subtotal * GST_RATE)
  return { itemsSubtotal, upgradesSubtotal, subtotal, gst, total: round2(subtotal + gst) }
}

export const quoteTotals = (q: Quote, selectedIds = q.selectedUpgradeIds) =>
  computeTotals(q.items, q.upgrades, selectedIds)

/** A sent quote past its validity date counts as expired. */
export function effectiveStatus(q: Pick<Quote, 'status' | 'validUntil'>): QuoteStatus {
  if (q.status === 'sent' && q.validUntil && q.validUntil < todayISO()) return 'expired'
  return q.status
}

/** Payment stage amounts that add up to the total to the cent. */
export function paymentAmounts(stages: PaymentStage[], total: number): number[] {
  const amounts = stages.map((s) => round2((total * s.percent) / 100))
  const diff = round2(total - amounts.reduce((a, b) => a + b, 0))
  if (amounts.length && diff !== 0) amounts[amounts.length - 1] = round2(amounts[amounts.length - 1] + diff)
  return amounts
}

export const paymentPercentTotal = (stages: PaymentStage[]) =>
  Math.round(stages.reduce((s, p) => s + (Number(p.percent) || 0), 0) * 100) / 100

/** Problems that stop a quote being sent. Empty list = ready. */
export function sendProblems(q: Quote, hasContact: boolean, hasJob: boolean): string[] {
  const out: string[] = []
  if (!hasContact) out.push('Choose a contact.')
  if (!hasJob) out.push('Choose or create a job.')
  if (!q.title.trim()) out.push('Add a quote title.')
  if (q.items.length === 0) out.push('Add at least one line item.')
  if (q.items.some((i) => i.unitPrice == null || !i.name.trim())) out.push('Every line needs a name and a price.')
  if (q.upgrades.some((u) => u.price == null || !u.name.trim())) out.push('Every optional upgrade needs a name and a price.')
  if (!q.validUntil || q.validUntil < todayISO()) out.push('Set a valid-until date in the future.')
  if (q.payments.length && paymentPercentTotal(q.payments) !== 100) out.push('Payment stages must add up to 100%.')
  return out
}
