import type { AcceptedVia, DueRule, PaymentPresetId, PaymentRow } from '../types'
import { uid } from './format'

/** Payment due rules. */
export const DUE_OPTIONS: { id: DueRule; label: string; short: string }[] = [
  { id: 'onAcceptance', label: 'When the quote is accepted', short: 'on acceptance' },
  { id: 'oneBusinessDayBeforeJob', label: '1 business day before the job', short: '1 business day before the job' },
  { id: 'sevenDaysBeforeJob', label: '7 days before the job', short: '7 days before the job' },
  { id: 'onCompletion', label: 'When the job is completed', short: 'on completion of the job' },
  { id: 'other', label: 'Other, as described in the label', short: '' },
]

export const dueShort = (d?: DueRule) => DUE_OPTIONS.find((o) => o.id === d)?.short ?? ''

export const VIA_LABEL: Record<AcceptedVia, string> = {
  online: 'online',
  phone: 'by phone',
  purchaseOrder: 'by purchase order',
}

export const VIA_OPTIONS: { id: AcceptedVia; label: string }[] = [
  { id: 'phone', label: 'By phone' },
  { id: 'purchaseOrder', label: 'Purchase order' },
]

export interface PaymentPreset {
  id: PaymentPresetId
  name: string
  /** null for custom: the user edits the rows. */
  rows: Omit<PaymentRow, 'id'>[] | null
}

export const PAYMENT_PRESETS: PaymentPreset[] = [
  {
    id: 'deposit',
    name: '20% deposit, balance on completion',
    rows: [
      { label: 'Deposit', kind: 'percent', value: 20, dueRule: 'onAcceptance' },
      { label: 'Balance', kind: 'percent', value: 80, dueRule: 'onCompletion' },
    ],
  },
  {
    id: 'threeStage',
    name: '20% deposit, 50% before the job, balance on completion',
    rows: [
      { label: 'Deposit', kind: 'percent', value: 20, dueRule: 'onAcceptance' },
      { label: 'Progress payment', kind: 'percent', value: 50, dueRule: 'sevenDaysBeforeJob' },
      { label: 'Balance', kind: 'percent', value: 30, dueRule: 'onCompletion' },
    ],
  },
  { id: 'full', name: 'Full payment on completion', rows: [{ label: 'Full payment', kind: 'percent', value: 100, dueRule: 'onCompletion' }] },
  { id: 'custom', name: 'Custom (edit the rows)', rows: null },
]

/** Fresh payment rows (new ids) for a preset. Custom gives the deposit preset as a starting point. */
export function paymentRowsFor(id: PaymentPresetId): PaymentRow[] {
  const p = PAYMENT_PRESETS.find((x) => x.id === id)
  const rows = p?.rows ?? PAYMENT_PRESETS[0].rows ?? []
  return rows.map((r) => ({ ...r, id: uid('pay') }))
}
