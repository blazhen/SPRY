// Mock data. Every name, address, phone number and price here is made up and
// flagged as a placeholder. Real SPRY data and prices come from Glenn later.
import type { CatalogProduct, Contact, Job, Quote, Template } from '../types'
import { addDaysISO, todayISO } from '../lib/format'

export const contacts: Contact[] = [
  { id: 'c1', name: 'Maya Fletcher', email: 'maya.fletcher@example.com', phone: '0400 000 101', suburb: 'Brunswick', placeholder: true },
  { id: 'c2', name: 'Tom Okafor', email: 'tom.okafor@example.com', phone: '0400 000 102', suburb: 'Geelong', placeholder: true },
  { id: 'c3', name: 'Priya Nandakumar', email: 'priya.n@example.com', phone: '0400 000 103', suburb: 'Ballarat', placeholder: true },
  { id: 'c4', name: 'Harbour Street Cafe', email: 'accounts@harbourstreet.example.com', phone: '0400 000 104', suburb: 'Williamstown', placeholder: true },
  { id: 'c5', name: 'Luca Moretti', email: 'luca.moretti@example.com', phone: '0400 000 105', suburb: 'Bendigo', placeholder: true },
  { id: 'c6', name: 'Joanne Whitcombe', email: 'joanne.w@example.com', phone: '0400 000 106', suburb: 'Frankston', placeholder: true },
  { id: 'c7', name: 'Redgum Storage Pty Ltd', email: 'ops@redgumstorage.example.com', phone: '0400 000 107', suburb: 'Dandenong', placeholder: true },
  { id: 'c8', name: 'Sam Kowalczyk', email: 'sam.k@example.com', phone: '0400 000 108', suburb: 'Mornington', placeholder: true },
  { id: 'c9', name: 'Aisha Rahman', email: 'aisha.rahman@example.com', phone: '0400 000 109', suburb: 'Footscray', placeholder: true },
  { id: 'c10', name: 'Dennis Cartwright', email: 'dennis.c@example.com', phone: '0400 000 110', suburb: 'Warrnambool', placeholder: true },
]

export const seedJobs: Job[] = [
  { id: 'j1', contactId: 'c1', title: 'Roof and wall insulation', address: '12 Example Street, Brunswick VIC', stage: 'Quote Accepted' },
  { id: 'j2', contactId: 'c2', title: 'Shed roof spray', address: '48 Sample Road, Geelong VIC', stage: 'Quote Sent' },
  { id: 'j3', contactId: 'c3', title: 'Sub-floor insulation', address: '7 Placeholder Court, Ballarat VIC', stage: 'Quoting' },
  { id: 'j4', contactId: 'c4', title: 'Cafe ceiling and wall fit-out', address: '3 Demo Parade, Williamstown VIC', stage: 'Quote Sent' },
  { id: 'j5', contactId: 'c5', title: 'Extension roof', address: '21 Mock Avenue, Bendigo VIC', stage: 'Qualified' },
  { id: 'j6', contactId: 'c7', title: 'Warehouse roof', address: 'Unit 5, 90 Test Drive, Dandenong VIC', stage: 'Client Retention' },
  { id: 'j7', contactId: 'c6', title: 'Garage conversion', address: '16 Pretend Lane, Frankston VIC', stage: 'Quote Sent' },
]

export const catalog: CatalogProduct[] = [
  { id: 'p1', section: 'Roof', name: 'Closed-cell spray foam, R3.0', description: 'Sprayed to the underside of the roof sheeting.', unit: 'm²', unitPrice: 62, placeholder: true },
  { id: 'p2', section: 'Roof', name: 'Closed-cell spray foam, R4.0', description: 'Thicker application, higher thermal performance.', unit: 'm²', unitPrice: 78, placeholder: true },
  { id: 'p3', section: 'Walls', name: 'Open-cell spray foam, R2.5', description: 'Sprayed between wall framing.', unit: 'm²', unitPrice: 38, placeholder: true },
  { id: 'p4', section: 'Walls', name: 'Open-cell spray foam, R3.5', description: 'Deeper cavity fill.', unit: 'm²', unitPrice: 46, placeholder: true },
  { id: 'p5', section: 'Sub-floor', name: 'Sub-floor spray foam, R2.0', description: 'Applied to the underside of the floor.', unit: 'm²', unitPrice: 44, placeholder: true },
  { id: 'p6', section: 'Preparation', name: 'Site preparation and masking', description: 'Protecting surfaces, windows and fittings.', unit: 'lot', unitPrice: 350, placeholder: true },
  { id: 'p7', section: 'Preparation', name: 'Removal of old insulation', description: 'Removal and disposal of existing batts.', unit: 'm²', unitPrice: 9, placeholder: true },
  { id: 'p8', section: 'Extras', name: 'Fire retardant coating', description: 'Applied over exposed foam where required.', unit: 'm²', unitPrice: 14, placeholder: true },
  { id: 'p9', section: 'Extras', name: 'Additional labour', description: 'Extra time on site, charged by the hour.', unit: 'hour', unitPrice: 95, placeholder: true },
]

const STD_TERMS =
  'This quote is valid until the date shown. Prices are in Australian dollars and exclude GST unless stated. Work is booked once the quote is accepted. Deposits are due before the job date as set out in the payment schedule. Variations to the scope are quoted separately.'

export const builtInTemplates: Template[] = [
  {
    id: 't-roof-walls',
    name: 'Roof and wall insulation',
    description: 'A standard residential job: preparation, roof, walls and optional upgrades.',
    builtIn: true,
    items: [
      { section: 'Preparation', name: 'Site preparation and masking', description: 'Protecting surfaces, windows and fittings.', qty: 1, unit: 'lot', catalogId: 'p6' },
      { section: 'Roof', name: 'Closed-cell spray foam, R3.0', description: 'Sprayed to the underside of the roof sheeting.', qty: 0, unit: 'm²', catalogId: 'p1' },
      { section: 'Walls', name: 'Open-cell spray foam, R2.5', description: 'Sprayed between wall framing.', qty: 0, unit: 'm²', catalogId: 'p3' },
    ],
    upgrades: [
      { name: 'Roof upgrade to R4.0', description: 'A thicker roof application for higher thermal performance.' },
      { name: 'Fire retardant coating', description: 'Applied over exposed foam where required.' },
    ],
    payments: [
      { label: 'Deposit, due before the job date', percent: 30 },
      { label: 'Final payment, on completion', percent: 70 },
    ],
    notes: 'Thanks for the opportunity to quote. Rachael and the team are happy to answer any questions before you accept.',
    terms: STD_TERMS,
    validDays: 30,
  },
  {
    id: 't-commercial',
    name: 'Commercial roof or shed',
    description: 'A single large surface with a staged payment schedule.',
    builtIn: true,
    items: [
      { section: 'Preparation', name: 'Site preparation and masking', description: 'Protecting surfaces, equipment and fittings.', qty: 1, unit: 'lot', catalogId: 'p6' },
      { section: 'Roof', name: 'Closed-cell spray foam, R3.0', description: 'Sprayed to the underside of the roof sheeting.', qty: 0, unit: 'm²', catalogId: 'p1' },
    ],
    upgrades: [{ name: 'Roof upgrade to R4.0', description: 'A thicker application for higher thermal performance.' }],
    payments: [
      { label: 'Deposit, due before the job date', percent: 40 },
      { label: 'Progress payment, on completion of spraying', percent: 40 },
      { label: 'Final payment, after the job report', percent: 20 },
    ],
    notes: '',
    terms: STD_TERMS,
    validDays: 21,
  },
  {
    id: 't-addon',
    name: 'Add-on quote',
    description: 'A small extra on a job that already has a quote. Mark the quote as an add-on.',
    builtIn: true,
    items: [{ section: 'Extras', name: 'Additional work', description: 'Describe the extra work here.', qty: 1, unit: 'lot' }],
    upgrades: [],
    payments: [{ label: 'Full payment, on completion', percent: 100 }],
    notes: 'This is an add-on to your existing job. Your booking and the original quote are not affected.',
    terms: STD_TERMS,
    validDays: 14,
  },
]

function mk(partial: Partial<Quote> & Pick<Quote, 'id' | 'number' | 'status' | 'jobId' | 'contactId' | 'title'>): Quote {
  const today = todayISO()
  return {
    isAddOn: false,
    items: [],
    upgrades: [],
    selectedUpgradeIds: [],
    payments: [
      { id: partial.id + '-pay1', label: 'Deposit, due before the job date', percent: 30 },
      { id: partial.id + '-pay2', label: 'Final payment, on completion', percent: 70 },
    ],
    notes: 'Thanks for the opportunity to quote. Rachael and the team are happy to answer any questions before you accept.',
    terms: STD_TERMS,
    issuedOn: today,
    validUntil: addDaysISO(today, 30),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    placeholder: true,
    ...partial,
  }
}

/** Starting quotes, written to localStorage the first time the page opens. */
export function seedQuotes(): Quote[] {
  const today = todayISO()
  const q1: Quote = mk({
    id: 'q1', number: 'Q-1001', status: 'accepted', jobId: 'j1', contactId: 'c1', title: 'Roof and wall insulation, 12 Example Street',
    issuedOn: addDaysISO(today, -12), validUntil: addDaysISO(today, 18),
    items: [
      { id: 'q1i1', section: 'Preparation', name: 'Site preparation and masking', description: 'Protecting surfaces, windows and fittings.', qty: 1, unit: 'lot', unitPrice: 350, catalogId: 'p6' },
      { id: 'q1i2', section: 'Roof', name: 'Closed-cell spray foam, R3.0', description: 'Sprayed to the underside of the roof sheeting.', qty: 96, unit: 'm²', unitPrice: 62, catalogId: 'p1' },
      { id: 'q1i3', section: 'Walls', name: 'Open-cell spray foam, R2.5', description: 'Sprayed between wall framing.', qty: 54, unit: 'm²', unitPrice: 38, catalogId: 'p3' },
    ],
    upgrades: [
      { id: 'q1u1', name: 'Roof upgrade to R4.0', description: 'A thicker roof application for higher thermal performance.', price: 1536 },
      { id: 'q1u2', name: 'Fire retardant coating', description: 'Applied over exposed foam where required.', price: 1344 },
    ],
    selectedUpgradeIds: ['q1u1'],
    sentAt: addDaysISO(today, -12) + 'T09:30:00', acceptedAt: addDaysISO(today, -9) + 'T16:05:00',
  })
  q1.acceptedTotal = 11137.8 // (350 + 5952 + 2052 + 1536) * 1.1
  const q2: Quote = mk({
    id: 'q2', number: 'Q-1002', status: 'accepted', jobId: 'j1', contactId: 'c1', title: 'Add-on: extra insulation for the studio',
    isAddOn: true, issuedOn: addDaysISO(today, -4), validUntil: addDaysISO(today, 10),
    items: [{ id: 'q2i1', section: 'Extras', name: 'Open-cell spray foam, R2.5', description: 'Studio walls.', qty: 18, unit: 'm²', unitPrice: 38 }],
    payments: [{ id: 'q2p1', label: 'Full payment, on completion', percent: 100 }],
    sentAt: addDaysISO(today, -4) + 'T11:00:00', acceptedAt: addDaysISO(today, -3) + 'T08:20:00',
  })
  q2.acceptedTotal = 752.4
  const q3: Quote = mk({
    id: 'q3', number: 'Q-1003', status: 'sent', jobId: 'j2', contactId: 'c2', title: 'Shed roof spray, 48 Sample Road',
    issuedOn: addDaysISO(today, -3), validUntil: addDaysISO(today, 27),
    items: [
      { id: 'q3i1', section: 'Preparation', name: 'Site preparation and masking', description: 'Protecting surfaces and equipment.', qty: 1, unit: 'lot', unitPrice: 350, catalogId: 'p6' },
      { id: 'q3i2', section: 'Roof', name: 'Closed-cell spray foam, R3.0', description: 'Sprayed to the underside of the roof sheeting.', qty: 140, unit: 'm²', unitPrice: 62, catalogId: 'p1' },
    ],
    upgrades: [{ id: 'q3u1', name: 'Roof upgrade to R4.0', description: 'A thicker application for higher thermal performance.', price: 2240 }],
    sentAt: addDaysISO(today, -3) + 'T10:15:00',
  })
  const q4: Quote = mk({
    id: 'q4', number: 'Q-1004', status: 'sent', jobId: 'j4', contactId: 'c4', title: 'Cafe ceiling and walls, 3 Demo Parade',
    issuedOn: addDaysISO(today, -40), validUntil: addDaysISO(today, -10),
    items: [
      { id: 'q4i1', section: 'Roof', name: 'Closed-cell spray foam, R3.0', description: 'Ceiling.', qty: 80, unit: 'm²', unitPrice: 62, catalogId: 'p1' },
      { id: 'q4i2', section: 'Walls', name: 'Open-cell spray foam, R3.5', description: 'Street-facing walls.', qty: 45, unit: 'm²', unitPrice: 46, catalogId: 'p4' },
    ],
    upgrades: [{ id: 'q4u1', name: 'Fire retardant coating', description: 'Applied over exposed foam.', price: 1120 }],
    sentAt: addDaysISO(today, -40) + 'T14:00:00',
  })
  const q5: Quote = mk({
    id: 'q5', number: 'Q-1005', status: 'draft', jobId: 'j3', contactId: 'c3', title: 'Sub-floor insulation, 7 Placeholder Court',
    items: [
      { id: 'q5i1', section: 'Sub-floor', name: 'Sub-floor spray foam, R2.0', description: 'Applied to the underside of the floor.', qty: 72, unit: 'm²', unitPrice: 44, catalogId: 'p5' },
      { id: 'q5i2', section: 'Preparation', name: 'Removal of old insulation', description: 'Removal and disposal of existing batts.', qty: 72, unit: 'm²', unitPrice: 9, catalogId: 'p7' },
    ],
  })
  const q6: Quote = mk({
    id: 'q6', number: 'Q-1006', status: 'declined', jobId: 'j7', contactId: 'c6', title: 'Garage conversion, 16 Pretend Lane',
    issuedOn: addDaysISO(today, -20), validUntil: addDaysISO(today, 10),
    items: [{ id: 'q6i1', section: 'Walls', name: 'Open-cell spray foam, R3.5', description: 'Garage walls and ceiling.', qty: 60, unit: 'm²', unitPrice: 46, catalogId: 'p4' }],
    sentAt: addDaysISO(today, -20) + 'T09:00:00', declinedAt: addDaysISO(today, -15) + 'T19:40:00', declineReason: 'Went with another option for now.',
  })
  const q7: Quote = mk({
    id: 'q7', number: 'Q-1007', status: 'draft', jobId: 'j5', contactId: 'c5', title: 'Extension roof, 21 Mock Avenue',
    items: [{ id: 'q7i1', section: 'Roof', name: 'Closed-cell spray foam, R3.0', description: 'Extension roof.', qty: 38, unit: 'm²', unitPrice: null, catalogId: 'p1' }],
  })
  return [q7, q6, q5, q4, q3, q2, q1]
}
