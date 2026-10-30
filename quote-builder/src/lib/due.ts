import type { AcceptedVia, DueRule } from '../types'

/** Payment due rules. The deposit rule depends on the foam type (Glenn, call of 2 Oct 2026). */
export const DUE_OPTIONS: { id: DueRule; label: string; short: string }[] = [
  { id: 'before-1bd', label: '1 business day before the job (open-cell foam)', short: '1 business day before the job' },
  { id: 'before-7d', label: '7 days before the job (special-order foam)', short: '7 days before the job' },
  { id: 'on-acceptance', label: 'When the quote is accepted', short: 'on acceptance' },
  { id: 'on-completion', label: 'When the job is completed', short: 'on completion of the job' },
  { id: 'custom', label: 'Other, as described in the label', short: '' },
]

export const dueShort = (d?: DueRule) => DUE_OPTIONS.find((o) => o.id === d)?.short ?? ''

export const VIA_LABEL: Record<AcceptedVia, string> = {
  email: 'by email',
  phone: 'by phone',
  'purchase-order': 'by purchase order',
}
