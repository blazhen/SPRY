import type { Contact, Invoice, InvoicePayment, InvoiceStatus, Job, Quote } from '../types'
import { STAGES } from '../types'
import { addDaysISO, todayISO } from './format'
import { invoiceTotals, syncInvoice } from './invoices'

/**
 * Development helper. Opening the app with ?bulk=1000 (before the hash) adds that many
 * made-up jobs, quotes and contacts in memory. Nothing is saved: the store skips writing
 * to localStorage while this is on. Without the query nothing here runs.
 */
export function bulkCount(): number {
  if (typeof window === 'undefined') return 0
  const n = parseInt(new URLSearchParams(window.location.search).get('bulk') ?? '', 10)
  return n > 0 ? Math.min(n, 20000) : 0
}

const FIRST = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Taylor', 'Morgan', 'Jamie', 'Chris', 'Dana', 'Lee', 'Pat']
const LAST = ['Example', 'Sample', 'Testman', 'Placeholder', 'Madeup', 'Fakeson', 'Demoworth', 'Nobody']
const STREETS = ['Example St', 'Sample Rd', 'Test Ave', 'Mock Cres', 'Demo Pde']
const SUBURBS = ['Dandenong', 'Pakenham', 'Cranbourne', 'Berwick', 'Frankston', 'Narre Warren']

export function makeBulk(n: number, seedJob: Job, seedQuote: Quote, ownerId: string) {
  const contacts: Contact[] = []
  const jobs: Job[] = []
  const quotes: Quote[] = []
  const invoices: Invoice[] = []
  const statuses: InvoiceStatus[] = ['draft', 'sent', 'part', 'paid', 'void', 'sent']
  const today = todayISO()
  const day = 86400000
  for (let i = 1; i <= n; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]} ${i}`
    const cid = `bulk-c${i}`
    contacts.push({ id: cid, name, email: `bulk${i}@example.test`, phone: `0400 000 ${String(i).padStart(3, '0')}`, placeholder: true })
    const jid = `bulk-j${i}`
    const created = new Date(Date.now() - i * day).toISOString()
    jobs.push({
      ...seedJob,
      id: jid,
      name: `Bulk job ${i}, ${SUBURBS[i % SUBURBS.length]}`,
      address: `${i} ${STREETS[i % STREETS.length]}, ${SUBURBS[i % SUBURBS.length]} VIC`,
      value: 1000 + ((i * 137) % 40000),
      ownerId,
      stage: STAGES[i % STAGES.length],
      createdAt: created,
      stageSince: created.slice(0, 10),
      participants: [{ kind: 'contact', id: cid, role: 'main' }],
      tasks: [],
      appointments: [],
    })
    quotes.push({
      ...seedQuote,
      id: `bulk-q${i}`,
      jobId: jid,
      recipient: { kind: 'contact', id: cid },
      number: `Q-B${i}`,
      title: `Bulk job ${i}`,
      revision: 1,
      status: (['Draft', 'Sent', 'Accepted', 'Declined'] as const)[i % 4],
      kind: 'primary',
      createdAt: created,
      updatedAt: created,
      sentAt: undefined,
      acceptedAt: undefined,
      declinedAt: undefined,
    })
    // One invoice per job, cycling through every status. Every third one is late.
    const status = statuses[i % statuses.length]
    const late = i % 3 === 0
    const inv = {
      id: `bulk-i${i}`, number: `INV-B${i}`, jobId: jid, contactId: cid, kind: (['deposit', 'final', 'other'] as const)[i % 3], status,
      items: [{ id: `bulk-i${i}-l1`, description: 'Bulk test payment', qty: 1, unit: 'each' as const, unitPrice: 500 + ((i * 53) % 4000), gst: true }],
      discount: 0, issueDate: addDaysISO(today, -20), dueDate: addDaysISO(today, late ? -(i % 40) - 1 : (i % 20) + 1), notes: '', payments: [] as InvoicePayment[],
      sentAt: status === 'draft' ? undefined : created, label: '', amount: 0,
    } as Invoice
    const tot = invoiceTotals(inv).total
    if (status === 'part') inv.payments = [{ id: `bulk-i${i}-p1`, amount: Math.round(tot / 2), method: 'card', at: addDaysISO(today, -2) + 'T10:00:00' }]
    if (status === 'paid') inv.payments = [{ id: `bulk-i${i}-p1`, amount: tot, method: 'bank', at: addDaysISO(today, -(i % 40)) + 'T10:00:00' }]
    invoices.push(syncInvoice(inv))
  }
  return { contacts, jobs, quotes, invoices }
}
