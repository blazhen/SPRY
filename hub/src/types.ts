import type { ExtrasSettings } from './lib/extras'
// Quote Hub data model. All seed values are made up and flagged as placeholders.

/**
 * The 14 stages both CRM pipelines have, in order. This is the default list: in live mode
 * setStages() (lib/format.ts) replaces the order and names from the CRM. Won and Lost are NOT
 * stages: they are job statuses (see JobStatus).
 */
export const STAGES = [
  'New Lead', 'Dial 1', 'Dial 2', 'Quoting', 'Quote Sent', 'Follow-Up', 'Nurture', 'Quote Accepted',
  'Inspection Required', 'Booking Required', 'Job Booked', 'Deposit Requested', 'Job Completed', 'Retention Claim',
] as const
export type Stage = (typeof STAGES)[number]

/** open = being worked, won / lost = closed. The stage stays where it was. */
export type JobStatus = 'open' | 'won' | 'lost'

/** Which product a job or quote is for. Decides the terms set. */
export type ProductType = 'Spray foam' | 'InjectaCore'
export const PRODUCT_TYPES: ProductType[] = ['Spray foam', 'InjectaCore']

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired' | 'Superseded'
/** primary: the main quote. alternative: another option or another company's quote. addon: an extra on a job that already has a quote. */
export type QuoteKind = 'primary' | 'alternative' | 'addon'
export type AcceptedVia = 'online' | 'phone' | 'purchaseOrder'

export type Unit = 'm²' | 'each' | 'hour' | 'lot'
export type JobWord = 'Job' | 'Project' | 'Deal'

export type ParticipantKind = 'contact' | 'company'
export type ParticipantRole = 'main' | 'extra' | 'company'

/** Points at a contact or a company. Used for job participants and quote recipients. */
export interface ParticipantRef {
  kind: ParticipantKind
  id: string
}

export interface Participant extends ParticipantRef {
  role: ParticipantRole
}

export interface Contact {
  id: string
  name: string
  companyId?: string
  /** Live: the company name the CRM holds for this person. */
  companyName?: string
  email: string
  phone: string
  /** Mobile, if different from phone. */
  mobile?: string
  /** Street address of the person (not the job site). */
  address?: string
  /** Short private note, for example "Prefers texts". */
  note?: string
  /** Live: the contact's custom field values (from the CRM). Empty in mock. */
  customFields?: ContactCustomField[]
  placeholder: true
}

export interface Company {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  /** The person a quote to this company is addressed to. */
  attnContactId?: string
  placeholder: true
}

export interface Owner {
  id: string
  name: string
  placeholder: true
}

/** Mock of a CRM task on a job. Ticking it done is allowed in the mock. */
export interface JobTask {
  id: string
  /** The task's TITLE: one short line. (Named `title`, as it always was.) */
  title: string
  /** Optional longer text, several lines. */
  description?: string
  /** ISO date. */
  dueDate?: string
  /** 'HH:MM' 24 hour, Hub time zone. Absent or '' means all day. */
  dueTime?: string
  done: boolean
  /** Owner id of who should do it. Missing means the job's owner. */
  assigneeId?: string
}

export type AppointmentKind = 'Inspection' | 'Install' | 'Other'

/** Mock of a CRM appointment on a job. */
export interface JobAppointment {
  id: string
  title: string
  kind: AppointmentKind
  /** ISO date. */
  date: string
  /** 24 hour "HH:MM". */
  time: string
  /** Is a reminder text going to the customer. */
  reminderOn: boolean
}

export type MessageChannel = 'sms' | 'email' | 'call'

/** One text, email or call on a job. Read-only history in the mock. */
export interface Message {
  id: string
  jobId: string
  contactId?: string
  channel: MessageChannel
  /** out = from the business, in = from the customer. For a call: out = we rang them. */
  direction: 'out' | 'in'
  /** ISO timestamp. */
  at: string
  /** Emails only. */
  subject?: string
  /** Text or email body, or the note for a call. */
  body: string
  /** Sent by an automatic workflow rather than a person. */
  automated: boolean
  /** Calls only. */
  callMinutes?: number
  /** Optional AI summary of a call, one point per line ("- ..."). The history shows it only when present (slot for later). */
  summary?: string
  /** Optional word for word transcript of a call. The history shows it only when present (slot for later). */
  transcript?: string
}

export type InvoiceKind = 'deposit' | 'final' | 'other'
/** Stored status. Overdue is worked out from dueDate (see lib/invoices.ts), never stored. */
export type InvoiceStatus = 'draft' | 'sent' | 'part' | 'paid' | 'void'
/** Old four-way state, still returned by invoiceState() for the older screens. */
export type InvoiceState = 'Not sent' | 'Sent' | 'Paid' | 'Overdue'
export type InvoiceUnit = 'each' | 'm2' | 'hour'
export type PaymentMethod = 'card' | 'bank' | 'cash' | 'cheque'

export interface InvoiceLine {
  id: string
  description: string
  qty: number
  unit: InvoiceUnit
  /** Dollars ex GST. */
  unitPrice: number
  /** Does 10% GST apply to this line. */
  gst: boolean
}

export interface InvoicePayment {
  id: string
  /** Dollars inc GST. */
  amount: number
  method: PaymentMethod
  /** ISO timestamp. */
  at: string
  note?: string
}

export interface Invoice {
  id: string
  /** Like INV-2009. Real numbers will come from the platform. */
  number: string
  jobId: string
  contactId?: string
  kind: InvoiceKind
  status: InvoiceStatus
  items: InvoiceLine[]
  /** Dollars ex GST, taken off before GST. */
  discount: number
  /** ISO dates. dueDate is '' when not known yet. */
  issueDate: string
  dueDate: string
  notes: string
  payments: InvoicePayment[]
  voidReason?: string
  /** ISO timestamps. */
  sentAt?: string
  sentTo?: string
  viewedAt?: string
  quoteId?: string
  /**
   * Older fields, kept in step by the store so older screens keep working. Read only:
   * label = short name, amount = total inc GST, paidAt = when fully paid. Never set these.
   */
  label: string
  amount: number
  paidAt?: string
}

export type TimelineKind = 'stage' | 'quote' | 'payment' | 'message' | 'call' | 'appointment' | 'task' | 'stamp' | 'note'

/** One line in the job's history. Added automatically when things happen. */
export interface TimelineEvent {
  id: string
  jobId: string
  /** ISO timestamp. */
  at: string
  kind: TimelineKind
  /** Plain words, past tense: "Quote Q-1042 sent to Travis". */
  text: string
  /** Optional summary and transcript, same slot as on Message. Shown only when present. */
  summary?: string
  transcript?: string
}

/** One opportunity (job) custom field value, as the CRM holds it. */
export interface JobCustomField {
  id: string
  name: string
  value: string | number | null
}

/** One contact custom field value, as the CRM holds it. */
export interface ContactCustomField {
  id: string
  key?: string
  name: string
  dataType?: string
  options?: string[]
  value: string | number | null
}

/** The CRM opportunity. */
export interface Job {
  id: string
  name: string
  address: string
  source: string
  /** Dollars ex GST. */
  value: number
  ownerId: string
  stage: Stage
  /** open (default), won or lost. Closing a job never changes its stage. */
  status: JobStatus
  lostReason?: string
  businessName: string
  /** Decides which terms set new quotes start with. */
  productType: ProductType
  /** ISO timestamp the job report was sent (stamp button). */
  /** Where the lead came from (Advanced extra: lost report). Hub-only, kept in jobmeta in live mode. */
  leadSource?: string
  /** Job costing (Advanced extra), dollars ex GST. Hub-only. */
  actualMaterials?: number
  actualCost?: number
  jobReportSentAt?: string
  /** ISO timestamp the review was asked for (stamp button). */
  reviewAskedAt?: string
  /** Job notes. New quotes start with a copy. */
  notes: string
  /** ISO timestamp. */
  createdAt: string
  /** ISO date the job entered its current stage. Drives "days waiting". */
  stageSince: string
  participants: Participant[]
  tasks: JobTask[]
  appointments: JobAppointment[]
  /** Live: the opportunity's custom field values (from the CRM). Empty in mock. */
  customFields?: JobCustomField[]
  placeholder: true
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
  priceItemId?: string
  /** The foam type this line is (from the calculator), used for the deposit. */
  foamId?: string
  /** Staff only: the words in the inspection notes this line was drafted from. Never shown to the customer. */
  fromNotes?: string
}

/** An optional extra on one line. Total = unitPrice x the line's quantity. */
export interface Upgrade {
  id: string
  lineId: string
  name: string
  description: string
  /** Extra per unit, ex GST. null = not set yet. */
  unitPrice: number | null
  /** Set by the customer on a sent quote. */
  ticked: boolean
}

export type DueRule = 'onAcceptance' | 'oneBusinessDayBeforeJob' | 'sevenDaysBeforeJob' | 'onCompletion' | 'other'
export type PaymentKind = 'percent' | 'fixed'
export type PaymentPresetId = 'deposit' | 'threeStage' | 'full' | 'custom'

export interface PaymentRow {
  id: string
  label: string
  kind: PaymentKind
  /** Percent of the total, or dollars when kind is fixed. */
  value: number
  dueRule: DueRule
}

export interface Quote {
  id: string
  jobId: string
  recipient: ParticipantRef
  /** Like Q-1042. Each revision has its own number. */
  number: string
  /** Defaults to the job name. */
  title: string
  /** 1, 2, 3... per job and recipient. */
  revision: number
  status: QuoteStatus
  kind: QuoteKind
  /** Spray foam or InjectaCore. Decides which terms can be picked. */
  productType: ProductType
  /**
   * Add GST (10%) on top of the ex-GST prices. Missing means true, so older
   * quotes still open. OPEN QUESTION for Zen: GST is worked out once on the
   * subtotal and rounded to the cent (half up). Confirm with the accountant.
   */
  gstApplies?: boolean
  /** The revision this one was made from. */
  previousId?: string
  validDays: number
  /** ISO timestamp. */
  sentAt?: string
  /** ISO date: sentAt + validDays. */
  validUntil?: string
  /** DEMO of what the customer link will report: when the customer first / last opened it, and how many times. */
  firstOpenedAt?: string
  lastOpenedAt?: string
  openCount?: number
  /** Copied from the job when the quote is created, editable. */
  notes: string
  lines: LineItem[]
  upgrades: Upgrade[]
  payments: PaymentRow[]
  paymentPreset: PaymentPresetId
  /** A Terms id, or 'custom' to use termsCustom on this quote only. */
  termsId: string
  termsCustom?: string
  acceptedVia?: AcceptedVia
  /** Live: set by the server when a customer accepts through the public link, until the staff Hub has made the invoices. */
  acceptedPending?: boolean
  poNumber?: string
  acceptedAt?: string
  /** ISO timestamps of each time staff chased this quote (Advanced extra: Chase now). */
  chases?: string[]
  /** Total inc GST when accepted, with the ticked upgrades. */
  acceptedTotal?: number
  declinedAt?: string
  declineReason?: string
  fromTemplate?: string
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
  placeholder: true
}

/** A named block of terms text. Text is editable, formatting is fixed. */
export interface Terms {
  id: string
  name: string
  /** A Spray foam quote can only pick Spray foam terms, and the same for InjectaCore. */
  productType: ProductType
  text: string
  placeholder: true
}

/** A saved quote structure: no customer and no prices. */
export interface Template {
  id: string
  name: string
  description: string
  builtIn: boolean
  lines: Omit<LineItem, 'id' | 'unitPrice'>[]
  /** lineIndex points into lines. */
  upgrades: { lineIndex: number; name: string; description: string }[]
  payments: Omit<PaymentRow, 'id'>[]
  paymentPreset: PaymentPresetId
  notes: string
  termsId: string
  validDays: number
  productType?: ProductType
}

export interface PriceItem {
  id: string
  section: string
  name: string
  description: string
  unit: Unit
  /** Default price per unit, ex GST. Editable in the price list. Real prices come from Glenn. */
  unitPrice: number
  productType?: ProductType
  /** A suggested upgrade for this product, priced per unit. */
  upgrade?: { name: string; description: string; unitPrice: number }
  placeholder: true
}

/** A note on a job or a contact. Hub mock only: saved in the browser, not in the CRM (CRM notes API not yet tested). */
export interface Note {
  id: string
  kind: 'job' | 'contact'
  /** The job id or contact id. */
  targetId: string
  author: string
  /** ISO timestamp. */
  at: string
  /** ISO timestamp, set when the text was edited. */
  editedAt?: string
  text: string
  pinned: boolean
}

/** Contact details the base Contact does not carry. Read-only in the mock. */
export interface ContactExtra {
  contactType: 'Lead' | 'Customer' | 'Builder' | 'Agent'
  source: string
  ownerId: string
  tags: string[]
  /** Do-not-disturb flags per channel. true = do not contact this way. */
  dnd: { sms: boolean; email: boolean; call: boolean }
  property: { type: string; storeys: string; roofType: string; areaNote: string }
  consent: { marketing: boolean; sms: boolean; email: boolean; givenOn?: string }
  /** ISO date. */
  contactSince: string
}

export interface Settings {
  /** What the record is called on screen. A label only. */
  jobWord: JobWord
  /** Saved stall limits in days per stage. A missing stage uses the built-in default; null means never flagged. */
  stallLimits?: Partial<Record<Stage, { slow: number | null; stuck: number | null }>>
  /** Round 5 Advanced extras: switches, chase days, foam table, lost reasons, lead sources. */
  extras?: ExtrasSettings
}
