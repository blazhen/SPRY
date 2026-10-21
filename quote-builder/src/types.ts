export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export type Unit = 'm²' | 'each' | 'hour' | 'lot'

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  suburb: string
  /** All contact details are made up. */
  placeholder: true
}

export interface Job {
  id: string
  contactId: string
  title: string
  address: string
  /** Pipeline stage name, as agreed on the 2 Oct 2026 call. */
  stage: string
}

export interface LineItem {
  id: string
  /** Heading the line sits under, e.g. "Roof". */
  section: string
  name: string
  description: string
  qty: number
  unit: Unit
  /** Price per unit, ex GST. null = not set yet (templates carry no prices). */
  unitPrice: number | null
  catalogId?: string
}

export interface Upgrade {
  id: string
  name: string
  description: string
  /** Extra cost ex GST when the customer ticks it. null = not set yet. */
  price: number | null
}

export interface PaymentStage {
  id: string
  label: string
  percent: number
}

export interface Quote {
  id: string
  number: string
  status: QuoteStatus
  jobId: string
  /** An extra quote on a job that already has one. Must not restart the welcome messages. */
  isAddOn: boolean
  contactId: string
  title: string
  items: LineItem[]
  upgrades: Upgrade[]
  /** Upgrade ids the customer has ticked. */
  selectedUpgradeIds: string[]
  payments: PaymentStage[]
  notes: string
  terms: string
  /** ISO date, YYYY-MM-DD. */
  issuedOn: string
  validUntil: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  acceptedAt?: string
  acceptedTotal?: number
  declinedAt?: string
  declineReason?: string
  fromTemplate?: string
  placeholder: true
}

export interface Template {
  id: string
  name: string
  description: string
  builtIn: boolean
  /** Structure and wording only: no customer, no prices. */
  items: Omit<LineItem, 'id' | 'unitPrice'>[]
  upgrades: Omit<Upgrade, 'id' | 'price'>[]
  payments: Omit<PaymentStage, 'id'>[]
  notes: string
  terms: string
  validDays: number
}

export interface CatalogProduct {
  id: string
  section: string
  name: string
  description: string
  unit: Unit
  unitPrice: number
  placeholder: true
}
