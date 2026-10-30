import type { Invoice, InvoiceKind, InvoiceLine, PaymentMethod } from '../types'
import { roundHalfUp } from './calc'
import { uid } from './format'

/** Plain words for the screens. */
export const KIND_LABEL: Record<InvoiceKind, string> = { deposit: 'Deposit', final: 'Final payment', other: 'Other' }
export const METHOD_LABEL: Record<PaymentMethod, string> = { card: 'Card', bank: 'Bank transfer', cash: 'Cash', cheque: 'Cheque' }
export const UNIT_LABEL = { each: 'each', m2: 'm²', hour: 'hour' } as const

export const lineExGst = (l: Pick<InvoiceLine, 'qty' | 'unitPrice'>) => roundHalfUp((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))

export interface InvoiceTotals {
  /** After the discount, before GST. */
  subtotalEx: number
  gst: number
  /** Inc GST. */
  total: number
  /** Money received so far, inc GST. */
  paid: number
  /** What is still owed, never below 0. 0 for a void invoice. */
  due: number
}

/** GST is 10% of the GST lines after the discount is shared across all lines, rounded once to the cent. */
export function invoiceTotals(inv: Pick<Invoice, 'items' | 'discount' | 'payments'> & { status?: Invoice['status'] }): InvoiceTotals {
  const lines = inv.items.map(lineExGst)
  const sum = lines.reduce((a, b) => a + b, 0)
  const discount = Math.min(Math.max(Number(inv.discount) || 0, 0), sum)
  const gstBase = inv.items.reduce((a, l, i) => a + (l.gst ? lines[i] : 0), 0)
  const gstAfter = sum > 0 ? gstBase * (1 - discount / sum) : 0
  const subtotalEx = roundHalfUp(sum - discount)
  const gst = roundHalfUp(gstAfter * 0.1)
  const total = roundHalfUp(subtotalEx + gst)
  const paid = roundHalfUp(inv.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0))
  const due = inv.status === 'void' ? 0 : Math.max(0, roundHalfUp(total - paid))
  return { subtotalEx, gst, total, paid, due }
}

/** Late = sent or part paid, something still owed, and the due date is before today. */
export function isOverdue(inv: Pick<Invoice, 'status' | 'dueDate'>, today: string): boolean {
  return (inv.status === 'sent' || inv.status === 'part') && !!inv.dueDate && inv.dueDate < today
}

/** Whole days past the due date, 0 when not overdue. */
export function daysOverdue(inv: Pick<Invoice, 'status' | 'dueDate'>, today: string): number {
  if (!isOverdue(inv, today)) return 0
  const a = new Date(inv.dueDate + 'T00:00:00').getTime()
  const b = new Date(today + 'T00:00:00').getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

const STATUS_WORD = { draft: 'Draft', sent: 'Sent', part: 'Part paid', paid: 'Paid', void: 'Void' } as const

/** The word to show: Draft, Sent, Part paid, Paid, Void, or Overdue when sent or part paid and late. */
export function statusLabel(inv: Pick<Invoice, 'status' | 'dueDate'>, today: string): string {
  return isOverdue(inv, today) ? 'Overdue' : STATUS_WORD[inv.status]
}

/** Short name for the older screens: "Deposit" or "Final payment", or the first line's text for other. */
export function invoiceLabel(inv: Pick<Invoice, 'kind' | 'items'>): string {
  if (inv.kind === 'other') return inv.items[0]?.description || KIND_LABEL.other
  return KIND_LABEL[inv.kind]
}

/** Fills the older fields from the real ones so older screens keep working. */
export function syncInvoice(inv: Invoice): Invoice {
  const t = invoiceTotals(inv)
  const last = inv.payments[inv.payments.length - 1]
  return { ...inv, label: inv.label || invoiceLabel(inv), amount: t.total, paidAt: inv.status === 'paid' ? last?.at ?? inv.paidAt : undefined }
}

/** An ex-GST line that comes to exactly this inc-GST amount (to the cent) when GST applies. */
export function lineForAmount(description: string, amountInc: number, gst = true): InvoiceLine {
  const cents = roundHalfUp(amountInc)
  if (!gst) return { id: uid('il'), description, qty: 1, unit: 'each', unitPrice: cents, gst: false }
  let ex = roundHalfUp(cents / 1.1)
  for (const d of [0, 0.01, -0.01]) {
    const tryEx = roundHalfUp(ex + d)
    if (roundHalfUp(tryEx + roundHalfUp(tryEx * 0.1)) === cents) {
      ex = tryEx
      break
    }
  }
  return { id: uid('il'), description, qty: 1, unit: 'each', unitPrice: ex, gst: true }
}
