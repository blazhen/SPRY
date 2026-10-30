import { GST_RATE } from '../config'
import type { LineItem, PaymentRow, Quote, QuoteStatus, Upgrade } from '../types'
import { todayISO } from './format'

// Money is in dollars as plain numbers, rounded to the cent at every step.
/**
 * Round to the cent, true half up (1.005 gives 1.01, 2.675 gives 2.68). Works on the
 * shortest decimal text of the number so binary noise cannot push a half cent down.
 */
export function roundHalfUp(n: number): number {
  if (!Number.isFinite(n)) return 0
  const sign = n < 0 ? -1 : 1
  const abs = Math.abs(n)
  const text = String(abs)
  const scaled = text.includes('e') ? abs * 100 + Number.EPSILON * 100 : Number(text + 'e2')
  const out = Math.round(scaled) / 100
  return out === 0 ? 0 : sign * out
}
export const round2 = roundHalfUp

export const lineTotal = (l: LineItem) => round2((l.qty || 0) * (l.unitPrice ?? 0))

/** Upgrade total = price per unit x the quantity of the line it belongs to. */
export const upgradeTotal = (u: Upgrade, lines: LineItem[]) => {
  const line = lines.find((l) => l.id === u.lineId)
  return round2((line?.qty || 0) * (u.unitPrice ?? 0))
}

export const upgradesForLine = (upgrades: Upgrade[], lineId: string) => upgrades.filter((u) => u.lineId === lineId)

export interface Totals {
  itemsSubtotal: number
  upgradesSubtotal: number
  subtotal: number
  gst: number
  total: number
}

/** Totals for lines and upgrades. Only ticked upgrades count. Prices are ex GST. */
export function computeTotals(lines: LineItem[], upgrades: Upgrade[], gstApplies = true): Totals {
  const itemsSubtotal = round2(lines.reduce((s, l) => s + lineTotal(l), 0))
  const upgradesSubtotal = round2(upgrades.filter((u) => u.ticked).reduce((s, u) => s + upgradeTotal(u, lines), 0))
  const subtotal = round2(itemsSubtotal + upgradesSubtotal)
  // GST is worked out once on the subtotal, rounded half up to the cent.
  const gst = gstApplies ? round2(subtotal * GST_RATE) : 0
  return { itemsSubtotal, upgradesSubtotal, subtotal, gst, total: round2(subtotal + gst) }
}

/** Honours `gstApplies` (missing means GST applies). */
export const quoteTotals = (q: Pick<Quote, 'lines' | 'upgrades'> & { gstApplies?: boolean }) => computeTotals(q.lines, q.upgrades, q.gstApplies !== false)

/** A sent quote past its validity date counts as expired. */
export function effectiveStatus(q: Pick<Quote, 'status' | 'validUntil'>): QuoteStatus {
  if (q.status === 'Sent' && q.validUntil && q.validUntil < todayISO()) return 'Expired'
  return q.status
}

/**
 * Payment amounts for a total (inc GST). Percent rows take that share, fixed
 * rows are dollars. When every row is a percent and they add to 100, the last
 * row absorbs any rounding cent so the rows add up to the total.
 */
export function paymentAmounts(rows: PaymentRow[], total: number): number[] {
  const amounts = rows.map((r) => (r.kind === 'fixed' ? round2(r.value) : round2((total * r.value) / 100)))
  const allPercent = rows.length > 0 && rows.every((r) => r.kind === 'percent')
  if (allPercent && paymentPercentTotal(rows) === 100) {
    const diff = round2(total - amounts.reduce((a, b) => a + b, 0))
    if (diff !== 0) amounts[amounts.length - 1] = round2(amounts[amounts.length - 1] + diff)
  }
  return amounts
}

/** Sum of the percent rows only. */
export const paymentPercentTotal = (rows: PaymentRow[]) =>
  Math.round(rows.filter((r) => r.kind === 'percent').reduce((s, p) => s + (Number(p.value) || 0), 0) * 100) / 100

/** True when the payment rows add up to the quote total. */
export function paymentsBalance(rows: PaymentRow[], total: number): boolean {
  if (rows.length === 0) return true
  const sum = round2(paymentAmounts(rows, total).reduce((a, b) => a + b, 0))
  return Math.abs(sum - total) < 0.005
}

/** Problems that stop a quote being sent. Empty list = ready. */
export function sendProblems(q: Quote): string[] {
  const out: string[] = []
  if (!q.title.trim()) out.push('Add a quote title.')
  if (q.lines.length === 0) out.push('Add at least one line item.')
  if (q.lines.some((l) => l.unitPrice == null || !l.name.trim())) out.push('Every line needs a name and a price.')
  if (q.upgrades.some((u) => u.unitPrice == null || !u.name.trim())) out.push('Every optional upgrade needs a name and a price.')
  if (!(q.validDays >= 1)) out.push('Set how many days the quote is valid for.')
  if (!paymentsBalance(q.payments, quoteTotals(q).total)) out.push('Payment rows must add up to the quote total.')
  return out
}

/**
 * Tiny self-check for the money math. No test framework: call it from the
 * browser console or a script. Returns ok and a list of failure messages.
 */
export function calcSelfCheck(): { ok: boolean; failures: string[] } {
  const failures: string[] = []
  const eq = (name: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)
  }
  const line = (id: string, qty: number, unitPrice: number): LineItem => ({ id, section: '', name: id, description: '', qty, unit: 'm²', unitPrice })
  const lines = [line('a', 120, 38), line('b', 80, 52), line('c', 1, 450)]
  const up = (ticked: boolean): Upgrade[] => [{ id: 'u1', lineId: 'a', name: 'R4.0', description: '', unitPrice: 12, ticked }]

  eq('lineTotal', lineTotal(lines[0]), 4560)
  eq('upgradeTotal per unit x qty', upgradeTotal(up(true)[0], lines), 1440)
  eq('totals with upgrade ticked', computeTotals(lines, up(true)), { itemsSubtotal: 9170, upgradesSubtotal: 1440, subtotal: 10610, gst: 1061, total: 11671 })
  eq('totals with upgrade unticked', computeTotals(lines, up(false)), { itemsSubtotal: 9170, upgradesSubtotal: 0, subtotal: 9170, gst: 917, total: 10087 })

  eq('totals with no GST', computeTotals(lines, up(true), false), { itemsSubtotal: 9170, upgradesSubtotal: 1440, subtotal: 10610, gst: 0, total: 10610 })
  eq('quoteTotals gstApplies false', quoteTotals({ lines, upgrades: up(false), gstApplies: false }).total, 9170)
  eq('quoteTotals gstApplies missing', quoteTotals({ lines, upgrades: up(false) }).total, 10087)
  // 10% of 0.05 is 0.005: half up gives 0.01.
  const one = (price: number): LineItem[] => [line('r', 1, price)]
  eq('GST rounding half up (small)', computeTotals(one(0.05), []).gst, 0.01)
  eq('GST rounding on subtotal, not per line', computeTotals([line('r1', 1, 0.04), line('r2', 1, 0.04)], []).gst, 0.01)
  eq('GST rounding down', computeTotals(one(0.04), []).gst, 0)
  eq('GST rounding 12.34', computeTotals(one(12.34), []).gst, 1.23)
  eq('roundHalfUp 1.005', roundHalfUp(1.005), 1.01)
  eq('roundHalfUp 2.675', roundHalfUp(2.675), 2.68)
  eq('roundHalfUp 1.004', roundHalfUp(1.004), 1)
  eq('roundHalfUp negative', roundHalfUp(-1.005), -1.01)
  eq('GST on 10.05 (0.1005)', computeTotals(one(10.05), []).gst, 1.01)
  eq('GST on 26.75 (2.675)', computeTotals(one(26.75), []).gst, 2.68)

  const pct = (value: number): PaymentRow => ({ id: 'p', label: 'x', kind: 'percent', value, dueRule: 'onCompletion' })
  eq('20/80 split', paymentAmounts([pct(20), pct(80)], 11671), [2334.2, 9336.8])
  eq('rounding cent goes to the last row', paymentAmounts([pct(33.33), pct(33.33), pct(33.34)], 1000.01), [333.3, 333.3, 333.41])
  eq('fixed plus percent', paymentAmounts([{ ...pct(500), kind: 'fixed' }, pct(50)], 1000), [500, 500])
  eq('balance check true', paymentsBalance([pct(20), pct(80)], 11671), true)
  eq('balance check false', paymentsBalance([pct(20), pct(70)], 11671), false)
  return { ok: failures.length === 0, failures }
}
