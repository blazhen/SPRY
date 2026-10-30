// Mock data. Every name, address, phone number and price here is made up and
// flagged as a placeholder. Real data and prices come from the client later.
// All dates are worked out from today when the data is seeded, so the demo never goes stale.
import { VALID_DAYS_DEFAULT } from '../config'
import type {
  Company, Contact, Invoice, InvoiceLine, Job, JobAppointment, JobTask, LineItem, Message, Owner, PriceItem, Quote, Template, Terms, TimelineEvent, Upgrade,
} from '../types'
import { paymentAmounts, quoteTotals } from '../lib/calc'
import { paymentRowsFor } from '../lib/due'
import { invoiceTotals, lineForAmount, syncInvoice } from '../lib/invoices'
import { addDaysISO, fmtDate, todayISO } from '../lib/format'

export const owners: Owner[] = [
  { id: 'glenn', name: 'Glenn', placeholder: true },
  { id: 'office', name: 'Office', placeholder: true },
]

export const seedCompanies: Company[] = [
  { id: 'k1', name: 'Forsyth Projects', phone: '03 5550 0101', email: 'office@forsyth.example.com', address: '1 Sample Way, Dandenong VIC', attnContactId: 'c2', placeholder: true },
  { id: 'k2', name: 'MCR Constructions', phone: '03 5550 0102', email: 'office@mcr.example.com', address: '40 Placeholder St, Richmond VIC', attnContactId: 'c3', placeholder: true },
  { id: 'k3', name: 'Quadricon', phone: '03 5550 0103', email: 'info@quadricon.example.com', address: '9 Test Rd, Clayton VIC', placeholder: true },
  { id: 'k4', name: 'Whitfield Homes', phone: '03 5550 0104', email: 'hello@whitfield.example.com', address: '22 Fake Pde, Pakenham VIC', attnContactId: 'c4', placeholder: true },
  { id: 'k5', name: 'Shah Property Group', phone: '03 5550 0105', email: 'team@shah.example.com', address: '5 Demo Ct, Berwick VIC', placeholder: true },
  { id: 'k6', name: 'Lee Logistics', phone: '03 5550 0106', email: 'ops@leelogistics.example.com', address: '300 Made Up Rd, Dandenong South VIC', attnContactId: 'c9', placeholder: true },
]

export const seedContacts: Contact[] = [
  { id: 'c1', name: 'Travis Gillespie', companyId: 'k3', email: 'travis@example.com', phone: '0400 000 001', mobile: '0400 000 011', address: '14 Example Ave, Clayton VIC', note: 'Prefers a text before a call.', placeholder: true },
  { id: 'c2', name: 'Lachlan Hart', companyId: 'k1', email: 'lachlan@example.com', phone: '0400 000 002', note: 'Repeat client. Pays on time.', placeholder: true },
  { id: 'c3', name: 'Nick Iverson', companyId: 'k2', email: 'nick@example.com', phone: '0400 000 003', mobile: '0400 000 013', placeholder: true },
  { id: 'c4', name: 'Dana Whitfield', companyId: 'k4', email: 'dana@example.com', phone: '0400 000 004', address: '22 Fake Pde, Pakenham VIC', placeholder: true },
  { id: 'c5', name: 'Priya Shah', companyId: 'k5', email: 'priya@example.com', phone: '0400 000 005', mobile: '0400 000 015', note: 'Best reached after 3pm.', placeholder: true },
  { id: 'c6', name: 'Tom Carter', email: 'tom@example.com', phone: '0400 000 006', address: '5 Placeholder Ct, Cranbourne VIC', placeholder: true },
  { id: 'c7', name: 'Marcus Bell', email: 'marcus@example.com', phone: '0400 000 007', mobile: '0400 000 017', address: '17 Demo St, Narre Warren VIC', note: 'Dog in the yard. Ring the bell.', placeholder: true },
  { id: 'c8', name: 'Hannah Okafor', email: 'hannah@example.com', phone: '0400 000 008', address: '61 Sample Cres, Narre Warren VIC', placeholder: true },
  { id: 'c9', name: 'Ben Lee', companyId: 'k6', email: 'ben@example.com', phone: '0400 000 009', mobile: '0400 000 019', placeholder: true },
  { id: 'c10', name: 'Rosa Marino', email: 'rosa@example.com', phone: '0400 000 010', address: '8 Test Ln, Frankston VIC', placeholder: true },
  { id: 'c11', name: 'Sam Dutta', email: 'sam@example.com', phone: '0400 000 021', mobile: '0400 000 022', address: '70 Made Up Ave, Cranbourne VIC', note: 'Works from home. Any time is fine.', placeholder: true },
]

const pi = (p: Omit<PriceItem, 'placeholder'>): PriceItem => ({ ...p, placeholder: true })

/** The starting price list. Spray foam items first (p1 to p6 keep their ids: templates and quotes point at them). */
export function seedPriceItems(): PriceItem[] {
  return [
    pi({ id: 'p1', productType: 'Spray foam', section: 'Walls', name: 'Wall insulation, open cell', description: 'Sprayed between wall framing.', unit: 'm²', unitPrice: 38, upgrade: { name: 'Upgrade to R4.0', description: 'Deeper cavity fill for higher thermal performance.', unitPrice: 12 } }),
    pi({ id: 'p2', productType: 'Spray foam', section: 'Roof', name: 'Roof insulation, closed cell', description: 'Sprayed to the underside of the roof sheeting.', unit: 'm²', unitPrice: 52, upgrade: { name: 'Upgrade to R6.0', description: 'A thicker application for higher thermal performance.', unitPrice: 14 } }),
    pi({ id: 'p3', productType: 'Spray foam', section: 'Sub-floor', name: 'Sub-floor insulation', description: 'Applied to the underside of the floor.', unit: 'm²', unitPrice: 44 }),
    pi({ id: 'p4', productType: 'Spray foam', section: 'Ceiling', name: 'Ceiling cavity top-up', description: 'Added over existing insulation.', unit: 'm²', unitPrice: 31 }),
    pi({ id: 'p5', productType: 'Spray foam', section: 'Preparation', name: 'Removal of old batts', description: 'Removal and disposal of existing batts.', unit: 'm²', unitPrice: 9 }),
    pi({ id: 'p6', productType: 'Spray foam', section: 'Preparation', name: 'Site setup and masking', description: 'Protecting surfaces, windows and fittings.', unit: 'each', unitPrice: 450 }),
    pi({ id: 'p7', productType: 'Spray foam', section: 'Walls', name: 'Wall insulation, closed cell', description: 'Sprayed to the inside of the wall cladding.', unit: 'm²', unitPrice: 55 }),
    pi({ id: 'p8', productType: 'Spray foam', section: 'Roof', name: 'Roof insulation, open cell', description: 'Sprayed under the roof deck.', unit: 'm²', unitPrice: 41 }),
    pi({ id: 'p9', productType: 'Spray foam', section: 'Ceiling', name: 'Ceiling insulation, new build', description: 'Sprayed to the underside of the ceiling frame.', unit: 'm²', unitPrice: 36 }),
    pi({ id: 'p10', productType: 'Spray foam', section: 'Sub-floor', name: 'Sub-floor edge sealing', description: 'Sealing the gaps around the floor edge.', unit: 'each', unitPrice: 380 }),
    pi({ id: 'p11', productType: 'Spray foam', section: 'Preparation', name: 'Skip bin and waste removal', description: 'Bin hire and tip fees.', unit: 'each', unitPrice: 320 }),
    pi({ id: 'p12', productType: 'Spray foam', section: 'Preparation', name: 'Extra access time', description: 'Extra time where access is hard.', unit: 'hour', unitPrice: 95 }),
    pi({ id: 'p13', productType: 'Spray foam', section: 'Finishing', name: 'Fire-rated coating', description: 'A coating over the foam where the rules need one.', unit: 'm²', unitPrice: 18 }),
    pi({ id: 'pi1', productType: 'InjectaCore', section: 'Walls', name: 'Wall cavity fill', description: 'Injected into the wall cavity through small holes.', unit: 'm²', unitPrice: 46, upgrade: { name: 'Upgrade to denser fill', description: 'A denser fill for higher thermal performance.', unitPrice: 9 } }),
    pi({ id: 'pi2', productType: 'InjectaCore', section: 'Walls', name: 'Drilling and making good', description: 'Drilling the holes and patching them after.', unit: 'm²', unitPrice: 14 }),
    pi({ id: 'pi3', productType: 'InjectaCore', section: 'Ceiling', name: 'Ceiling void fill', description: 'Injected into the ceiling void.', unit: 'm²', unitPrice: 33 }),
    pi({ id: 'pi4', productType: 'InjectaCore', section: 'Preparation', name: 'Site setup and protection', description: 'Protecting floors and furniture.', unit: 'each', unitPrice: 280 }),
    pi({ id: 'pi5', productType: 'InjectaCore', section: 'Checks', name: 'Thermal camera check', description: 'A picture of the wall to check the fill.', unit: 'each', unitPrice: 160 }),
  ]
}

/** Kept so older imports keep working. The live price list is State.priceItems. */
export const priceList: PriceItem[] = seedPriceItems()

const CLAUSES = [
  '1. Acceptance. This quote becomes a contract when the customer accepts it in writing, online or by purchase order.',
  '2. Price. Prices are in Australian dollars and exclude GST unless stated. Prices are fixed for the validity period shown.',
  '3. Scope. Work is limited to the areas and products listed. Anything else is a variation and is quoted and agreed before it starts.',
  '4. Access. The customer provides safe, clear access to all areas, power and water. Delays caused by poor access may be charged.',
  '5. Preparation. Areas must be free of stored goods. We mask and protect surfaces, but cannot guarantee against overspray on unmasked items.',
  '6. Weather. Exterior work depends on suitable conditions. We will rebook at no cost if weather stops the job.',
  '7. Payment. Invoices are payable by the due rule on each payment row. Late payments may attract interest at a reasonable commercial rate.',
  '8. Ownership. Materials remain the property of the contractor until paid for in full.',
  '9. Warranty. Workmanship is warranted for the period stated in the product documentation. Warranty does not cover damage by others.',
  '10. Cancellation. If the customer cancels after materials are ordered, the cost of those materials and work done is payable.',
  '11. Variations. A written variation is needed for changes to scope, price or timing. Verbal changes are not binding.',
  '12. Disputes. Both parties will try to resolve a dispute in good faith before taking any formal step.',
  '13. Privacy. Customer details are used only to deliver and support this work.',
  '14. Governing law. This agreement is governed by the law of Victoria, Australia.',
]

export const seedTerms: Terms[] = [
  { id: 'terms-sprayit', name: 'Spray It standard terms', productType: 'Spray foam', text: CLAUSES.join(' ') + ' [Placeholder text for the layout only. Long on purpose, to show the auto-shrink.]', placeholder: true },
  {
    id: 'terms-sprayit-open',
    name: 'Spray It open-cell terms',
    productType: 'Spray foam',
    text: 'Open-cell spray foam terms of business. Open-cell foam is not a moisture barrier and is not used where it will get wet. The customer keeps the area clear for 24 hours after spraying. Payment is due as set out on each payment row. [Placeholder text for the layout only.]',
    placeholder: true,
  },
  {
    id: 'terms-injectacore',
    name: 'InjectaCore standard terms',
    productType: 'InjectaCore',
    text: 'InjectaCore terms of business. Different conditions apply to injected core installations, including drilling of wall cavities and making good. [Placeholder text for the layout only.]',
    placeholder: true,
  },
  {
    id: 'terms-injectacore-retrofit',
    name: 'InjectaCore retrofit terms',
    productType: 'InjectaCore',
    text: 'InjectaCore retrofit terms of business. For existing walls: the customer tells us about wiring and pipes in the walls before drilling starts. Small holes are patched but the paint is not matched. [Placeholder text for the layout only.]',
    placeholder: true,
  },
]

export const builtInTemplates: Template[] = [
  {
    id: 't-house',
    name: 'Full house, walls and roof',
    description: 'Preparation, walls and roof with an upgrade on each.',
    builtIn: true,
    productType: 'Spray foam',
    lines: [
      { section: 'Preparation', name: 'Site setup and masking', description: 'Protecting surfaces, windows and fittings.', qty: 1, unit: 'each', priceItemId: 'p6' },
      { section: 'Walls', name: 'Wall insulation, open cell', description: 'Sprayed between wall framing.', qty: 0, unit: 'm²', priceItemId: 'p1' },
      { section: 'Roof', name: 'Roof insulation, closed cell', description: 'Sprayed to the underside of the roof sheeting.', qty: 0, unit: 'm²', priceItemId: 'p2' },
    ],
    upgrades: [
      { lineIndex: 1, name: 'Upgrade to R4.0', description: 'Deeper cavity fill for higher thermal performance.' },
      { lineIndex: 2, name: 'Upgrade to R6.0', description: 'A thicker application for higher thermal performance.' },
    ],
    payments: [
      { label: 'Deposit', kind: 'percent', value: 20, dueRule: 'onAcceptance' },
      { label: 'Balance', kind: 'percent', value: 80, dueRule: 'onCompletion' },
    ],
    paymentPreset: 'deposit',
    notes: '',
    termsId: 'terms-sprayit',
    validDays: VALID_DAYS_DEFAULT,
  },
  {
    id: 't-shed',
    name: 'Shed or garage, roof only',
    description: 'A single large surface.',
    builtIn: true,
    productType: 'Spray foam',
    lines: [
      { section: 'Preparation', name: 'Site setup and masking', description: 'Protecting surfaces and equipment.', qty: 1, unit: 'each', priceItemId: 'p6' },
      { section: 'Roof', name: 'Roof insulation, closed cell', description: 'Sprayed to the underside of the roof sheeting.', qty: 0, unit: 'm²', priceItemId: 'p2' },
    ],
    upgrades: [{ lineIndex: 1, name: 'Upgrade to R6.0', description: 'A thicker application for higher thermal performance.' }],
    payments: [{ label: 'Full payment', kind: 'percent', value: 100, dueRule: 'onCompletion' }],
    paymentPreset: 'full',
    notes: '',
    termsId: 'terms-sprayit',
    validDays: VALID_DAYS_DEFAULT,
  },
  {
    id: 't-fitout',
    name: 'Commercial fitout, per area',
    description: 'Staged payments for a larger job.',
    builtIn: true,
    productType: 'Spray foam',
    lines: [
      { section: 'Preparation', name: 'Site setup and masking', description: 'Protecting surfaces, equipment and fittings.', qty: 1, unit: 'each', priceItemId: 'p6' },
      { section: 'Ceiling', name: 'Ceiling cavity top-up', description: 'Added over existing insulation.', qty: 0, unit: 'm²', priceItemId: 'p4' },
      { section: 'Walls', name: 'Wall insulation, open cell', description: 'Sprayed between wall framing.', qty: 0, unit: 'm²', priceItemId: 'p1' },
    ],
    upgrades: [],
    payments: [
      { label: 'Deposit', kind: 'percent', value: 20, dueRule: 'onAcceptance' },
      { label: 'Progress payment', kind: 'percent', value: 50, dueRule: 'sevenDaysBeforeJob' },
      { label: 'Balance', kind: 'percent', value: 30, dueRule: 'onCompletion' },
    ],
    paymentPreset: 'threeStage',
    notes: '',
    termsId: 'terms-sprayit',
    validDays: VALID_DAYS_DEFAULT,
  },
]

/** Starting jobs. Dates are relative to today so days waiting always make sense. */
export function seedJobs(): Job[] {
  const today = todayISO()
  const ago = (d: number) => addDaysISO(today, -d)
  const ahead = (d: number) => addDaysISO(today, d)
  const t = (id: string, title: string, dueDate?: string, done = false): JobTask => ({ id, title, dueDate, done })
  const a = (id: string, title: string, kind: JobAppointment['kind'], date: string, time: string, reminderOn: boolean): JobAppointment => ({ id, title, kind, date, time, reminderOn })
  return [
    {
      id: 'j1', name: 'Bupa aged care installation', address: '12 Example St, Dandenong VIC', source: 'Referral', value: 18400, ownerId: 'glenn', stage: 'Quoting', status: 'open', productType: 'Spray foam',
      businessName: 'Quadricon Pty Ltd', notes: 'Roof and walls only. Access via the north gate. Works must finish before the 14th.',
      createdAt: ago(30) + 'T09:00:00', stageSince: ago(12),
      participants: [
        { kind: 'contact', id: 'c1', role: 'main' },
        { kind: 'contact', id: 'c5', role: 'extra' },
        { kind: 'contact', id: 'c4', role: 'extra' },
        { kind: 'company', id: 'k1', role: 'company' },
        { kind: 'company', id: 'k2', role: 'company' },
      ],
      tasks: [
        t('t1', 'Call Travis about access', ahead(1)),
        t('t2', 'Send photos of roof to office', ahead(2)),
        t('t2b', 'Book the site visit', ago(14), true),
      ],
      appointments: [
        a('a1', 'Site visit', 'Inspection', ago(12), '10:00', false),
        a('a2', 'Re-measure the roof', 'Inspection', ahead(4), '09:00', true),
      ],
      placeholder: true,
    },
    {
      id: 'j2', name: 'Whitfield new build, Lot 14', address: 'Lot 14 Sample Rd, Pakenham VIC', source: 'Website', value: 9250, ownerId: 'glenn', stage: 'Quoting', status: 'open', productType: 'Spray foam',
      businessName: 'Whitfield Homes', notes: '', createdAt: ago(14) + 'T09:00:00', stageSince: ago(7),
      participants: [{ kind: 'contact', id: 'c4', role: 'main' }],
      tasks: [t('t3', 'Confirm wall frame stage', ahead(3))],
      appointments: [a('a3', 'Site visit', 'Inspection', ago(8), '11:30', false)],
      placeholder: true,
    },
    {
      id: 'j3', name: 'Carter shed insulation', address: '5 Placeholder Ct, Cranbourne VIC', source: 'Google', value: 4100, ownerId: 'glenn', stage: 'Quoting', status: 'open', productType: 'InjectaCore',
      businessName: '', notes: 'Shed with lined walls. Wall fill only.', createdAt: ago(5) + 'T09:00:00', stageSince: ago(3),
      participants: [{ kind: 'contact', id: 'c6', role: 'main' }], tasks: [t('t3b', 'Measure the shed walls', ahead(1))], appointments: [], placeholder: true,
    },
    {
      id: 'j4', name: 'Richmond office fitout', address: '88 Sample Lane, Richmond VIC', source: 'Referral', value: 12800, ownerId: 'office', stage: 'Quoting', status: 'open', productType: 'Spray foam',
      businessName: 'MCR Constructions', notes: '', createdAt: ago(9) + 'T09:00:00', stageSince: ago(5),
      participants: [{ kind: 'contact', id: 'c3', role: 'main' }], tasks: [], appointments: [], placeholder: true,
    },
    {
      id: 'j5', name: 'Harper extension', address: '3 Test Ave, Berwick VIC', source: 'Facebook', value: 7600, ownerId: 'glenn', stage: 'Quote Sent', status: 'open', productType: 'Spray foam',
      businessName: 'Shah Property Group', notes: '', createdAt: ago(10) + 'T09:00:00', stageSince: ago(4),
      participants: [{ kind: 'contact', id: 'c5', role: 'main' }], tasks: [t('t4', 'Follow up on the quote', ahead(1))], appointments: [], placeholder: true,
    },
    {
      id: 'j6', name: 'Ng warehouse', address: '200 Fake Rd, Dandenong South VIC', source: 'Repeat client', value: 31200, ownerId: 'glenn', stage: 'Job Booked', status: 'won', productType: 'Spray foam',
      businessName: 'Forsyth Projects', notes: '', createdAt: ago(40) + 'T09:00:00', stageSince: ago(20),
      participants: [{ kind: 'contact', id: 'c2', role: 'main' }],
      tasks: [t('t5', 'Order the foam for the install', ago(3), true), t('t5b', 'Confirm the install day with Lachlan', ahead(5))],
      appointments: [a('a4', 'Install', 'Install', ahead(10), '07:30', true)],
      placeholder: true,
    },
    {
      id: 'j7', name: 'Bell garage conversion', address: '17 Demo St, Narre Warren VIC', source: 'Google', value: 6800, ownerId: 'glenn', stage: 'Inspection Required', status: 'open', productType: 'Spray foam',
      businessName: '', notes: 'Double garage turned into a studio. Walls and ceiling.', createdAt: ago(4) + 'T09:00:00', stageSince: ago(3),
      participants: [{ kind: 'contact', id: 'c7', role: 'main' }],
      tasks: [t('t6', 'Confirm the visit time with Marcus', ahead(1))],
      appointments: [a('a5', 'Site visit', 'Inspection', ahead(2), '14:00', true)],
      placeholder: true,
    },
    {
      id: 'j8', name: 'Okafor extension, Narre Warren', address: '61 Sample Cres, Narre Warren VIC', source: 'Referral', value: 11200, ownerId: 'glenn', stage: 'Quote Sent', status: 'open', productType: 'Spray foam',
      businessName: '', notes: 'Two quotes: one from us and one through the builder.', createdAt: ago(32) + 'T09:00:00', stageSince: ago(25),
      participants: [
        { kind: 'contact', id: 'c8', role: 'main' },
        { kind: 'company', id: 'k4', role: 'company' },
      ],
      tasks: [t('t7', 'Ring Hannah about the quote', ago(1))],
      appointments: [a('a6', 'Site visit', 'Inspection', ago(28), '09:30', false)],
      placeholder: true,
    },
    {
      id: 'j9', name: 'Lee warehouse retrofit', address: '300 Made Up Rd, Dandenong South VIC', source: 'Repeat client', value: 8050, ownerId: 'glenn', stage: 'Job Completed', status: 'won', productType: 'Spray foam',
      businessName: 'Lee Logistics', notes: 'Install finished. Customer happy.', createdAt: ago(45) + 'T09:00:00', stageSince: ago(9),
      participants: [{ kind: 'contact', id: 'c9', role: 'main' }, { kind: 'company', id: 'k6', role: 'company' }],
      tasks: [t('t8', 'Send the job report and ask for a review', ago(8))],
      appointments: [a('a7', 'Site visit', 'Inspection', ago(40), '10:00', false), a('a8', 'Install', 'Install', ago(10), '07:30', false)],
      placeholder: true,
    },
    {
      id: 'j10', name: 'Marino beach house', address: '8 Test Ln, Frankston VIC', source: 'Facebook', value: 5400, ownerId: 'glenn', stage: 'Quote Sent', status: 'lost', lostReason: 'Went with another contractor', productType: 'Spray foam',
      businessName: '', notes: 'Went with another contractor.', createdAt: ago(50) + 'T09:00:00', stageSince: ago(30),
      participants: [{ kind: 'contact', id: 'c10', role: 'main' }],
      tasks: [], appointments: [a('a9', 'Site visit', 'Inspection', ago(46), '13:00', false)],
      placeholder: true,
    },
    {
      id: 'j11', name: 'Dutta home extension', address: '70 Made Up Ave, Cranbourne VIC', source: 'Website', value: 14300, ownerId: 'glenn', stage: 'Quote Accepted', status: 'won', productType: 'Spray foam',
      businessName: '', notes: 'Roof and walls. Deposit invoice sent.', createdAt: ago(35) + 'T09:00:00', stageSince: ago(14),
      participants: [{ kind: 'contact', id: 'c11', role: 'main' }],
      tasks: [t('t9', 'Chase the deposit', ago(1))],
      appointments: [a('a10', 'Site visit', 'Inspection', ago(30), '15:00', false), a('a11', 'Install', 'Install', ahead(20), '07:30', false)],
      placeholder: true,
    },
    {
      id: 'j12', name: 'Iverson shopfront retrofit', address: '12 Sample Pde, Richmond VIC', source: 'Referral', value: 2730, ownerId: 'glenn', stage: 'Quote Accepted', status: 'won', productType: 'Spray foam',
      businessName: 'MCR Constructions', notes: 'Accepted yesterday. Deposit invoice not sent yet.', createdAt: ago(8) + 'T09:00:00', stageSince: ago(1),
      participants: [{ kind: 'contact', id: 'c3', role: 'main' }],
      tasks: [t('t10', 'Send the deposit invoice', ahead(0))],
      appointments: [a('a12', 'Site visit', 'Inspection', ago(6), '10:30', false)],
      placeholder: true,
    },
  ]
}

const line = (qid: string, n: number, p: PriceItem, qty: number): LineItem => ({
  id: `${qid}-l${n}`, section: p.section, name: p.name, description: p.description, qty, unit: p.unit, unitPrice: p.unitPrice, priceItemId: p.id,
})
const upg = (qid: string, n: number, l: LineItem, p: PriceItem, ticked = false): Upgrade | undefined =>
  p.upgrade ? { id: `${qid}-u${n}`, lineId: l.id, name: p.upgrade.name, description: p.upgrade.description, unitPrice: p.upgrade.unitPrice, ticked } : undefined

/** Starting quotes, written to localStorage the first time the page opens. */
export function seedQuotes(): Quote[] {
  const today = todayISO()
  const jobs = seedJobs()
  const prices = seedPriceItems()
  const P = (i: number) => prices[i]
  const PI = (id: string) => prices.find((p) => p.id === id) as PriceItem

  function mk(id: string, num: number, jobId: string, recipientId: string, kind: 'contact' | 'company', parts: Partial<Quote>, sentAgo?: number): Quote {
    const job = jobs.find((j) => j.id === jobId) as Job
    const sentDay = sentAgo === undefined ? undefined : addDaysISO(today, -sentAgo)
    const validDays = parts.validDays ?? VALID_DAYS_DEFAULT
    return {
      id, jobId, recipient: { kind, id: recipientId }, number: `Q-${num}`, title: job.name, revision: 1, status: 'Draft', kind: 'primary', productType: job.productType,
      validDays, sentAt: sentDay ? sentDay + 'T09:00:00' : undefined, validUntil: sentDay ? addDaysISO(sentDay, validDays) : undefined,
      notes: job.notes, lines: [], upgrades: [], payments: paymentRowsFor('deposit').map((r, i) => ({ ...r, id: `${id}-pay${i + 1}` })), paymentPreset: 'deposit',
      termsId: 'terms-sprayit', createdAt: addDaysISO(today, -(sentAgo ?? 0)) + 'T08:00:00', updatedAt: new Date().toISOString(), placeholder: true,
      ...parts,
    }
  }

  // The three-line set used by the Bupa job (Rev 1, Rev 2 and the two company copies).
  const set = (qid: string) => {
    const l1 = line(qid, 1, P(0), 120)
    const l2 = line(qid, 2, P(1), 80)
    const l3 = line(qid, 3, P(5), 1)
    const ups = [upg(qid, 1, l1, P(0)), upg(qid, 2, l2, P(1))].filter((u): u is Upgrade => !!u)
    return { lines: [l1, l2, l3], upgrades: ups }
  }
  // Rev 2 of the Bupa quote adds a ceiling top-up.
  const set2 = (qid: string) => {
    const s = set(qid)
    return { lines: [...s.lines, line(qid, 4, P(3), 40)], upgrades: s.upgrades }
  }

  const q1 = mk('q1', 1038, 'j1', 'c1', 'contact', { ...set('q1'), status: 'Superseded' }, 20)
  const q2 = mk('q2', 1039, 'j1', 'c1', 'contact', { ...set2('q2'), revision: 2, previousId: 'q1' })
  const q3 = mk('q3', 1040, 'j1', 'k1', 'company', { ...set('q3') })
  const q4 = mk('q4', 1041, 'j1', 'k2', 'company', { ...set('q4') })
  const q5l = line('q5', 1, PI('pi1'), 60)
  const q5 = mk('q5', 1042, 'j3', 'c6', 'contact', { lines: [q5l], upgrades: [], status: 'Expired', termsId: 'terms-injectacore' }, 70)
  const q6l1 = line('q6', 1, P(0), 90)
  const q6l2 = line('q6', 2, P(4), 90)
  const q6 = mk('q6', 1043, 'j5', 'c5', 'contact', { lines: [q6l1, q6l2], upgrades: [upg('q6', 1, q6l1, P(0))].filter((u): u is Upgrade => !!u), status: 'Sent', firstOpenedAt: addDaysISO(today, -3) + 'T19:20:00', lastOpenedAt: addDaysISO(today, -1) + 'T07:45:00', openCount: 3 }, 4)
  const q7l1 = line('q7', 1, P(1), 300)
  const q7u = upg('q7', 1, q7l1, P(1), true)
  const q7 = mk('q7', 1044, 'j6', 'c2', 'contact', {
    lines: [q7l1], upgrades: q7u ? [q7u] : [], status: 'Accepted', acceptedVia: 'online', acceptedAt: addDaysISO(today, -22) + 'T16:00:00',
    acceptedTotal: 21780,// (300 x 52 + 300 x 14) x 1.1
  }, 25)
  const q8l1 = line('q8', 1, P(3), 150)
  const q8 = mk('q8', 1045, 'j6', 'c2', 'contact', { title: 'Add-on: ceiling top-up, Ng warehouse', kind: 'addon', lines: [q8l1], upgrades: [], status: 'Sent', payments: paymentRowsFor('full').map((r, i) => ({ ...r, id: `q8-pay${i + 1}` })), paymentPreset: 'full' }, 2)

  // Okafor: our quote runs out in 5 days; the builder's copy has had no reply for 12 days.
  const q9 = mk('q9', 1046, 'j8', 'c8', 'contact', { lines: [line('q9', 1, P(0), 70), line('q9', 2, P(5), 1)], upgrades: [], status: 'Sent', validDays: 30, firstOpenedAt: addDaysISO(today, -24) + 'T12:10:00', lastOpenedAt: addDaysISO(today, -9) + 'T18:00:00', openCount: 4 }, 25)
  const q10 = mk('q10', 1047, 'j8', 'k4', 'company', { kind: 'alternative', title: 'Okafor extension, builder option', lines: [line('q10', 1, P(6), 70), line('q10', 2, P(5), 1)], upgrades: [], status: 'Sent', firstOpenedAt: addDaysISO(today, -11) + 'T08:30:00', lastOpenedAt: addDaysISO(today, -11) + 'T08:30:00', openCount: 1 }, 12)
  // Lee: accepted and finished.
  const q11 = mk('q11', 1048, 'j9', 'c9', 'contact', { lines: [line('q11', 1, P(0), 200), line('q11', 2, P(5), 1)], upgrades: [], status: 'Accepted', acceptedVia: 'phone' }, 28)
  q11.acceptedAt = addDaysISO(today, -26) + 'T11:00:00'
  q11.acceptedTotal = quoteTotals(q11).total
  // Marino: went elsewhere.
  const q12 = mk('q12', 1049, 'j10', 'c10', 'contact', { lines: [line('q12', 1, P(7), 100)], upgrades: [], status: 'Declined', validDays: 30 }, 36)
  q12.declinedAt = addDaysISO(today, -30) + 'T10:00:00'
  q12.declineReason = 'Went with another contractor.'
  // Dutta: accepted, deposit overdue.
  const q13l1 = line('q13', 1, P(1), 110)
  const q13 = mk('q13', 1050, 'j11', 'c11', 'contact', { lines: [q13l1, line('q13', 2, P(0), 140)], upgrades: [], status: 'Accepted', acceptedVia: 'online', firstOpenedAt: addDaysISO(today, -15) + 'T20:05:00', lastOpenedAt: addDaysISO(today, -14) + 'T09:25:00', openCount: 2 }, 16)
  q13.acceptedAt = addDaysISO(today, -14) + 'T09:30:00'
  q13.acceptedTotal = quoteTotals(q13).total

  // Iverson: accepted yesterday, the deposit invoice is made but not sent, due today (not overdue).
  const q14 = mk('q14', 1051, 'j12', 'c3', 'contact', { lines: [line('q14', 1, P(0), 60), line('q14', 2, P(5), 1)], upgrades: [], status: 'Accepted', acceptedVia: 'online' }, 3)
  q14.acceptedAt = addDaysISO(today, -1) + 'T10:00:00'
  q14.acceptedTotal = quoteTotals(q14).total

  return [q14, q13, q12, q11, q10, q9, q8, q7, q6, q5, q4, q3, q2, q1]
}

// ---- Messages, invoices and the job timeline ----------------------------------

/** Starting texts, emails and calls, on six of the jobs. */
export function seedMessages(): Message[] {
  const today = todayISO()
  const at = (d: number, hhmm: string) => `${addDaysISO(today, -d)}T${hhmm}:00`
  const out: Message[] = []
  let n = 0
  const m = (jobId: string, contactId: string, channel: Message['channel'], direction: Message['direction'], d: number, hhmm: string, body: string, extra: Partial<Message> = {}) => {
    n++
    out.push({ id: `m${n}`, jobId, contactId, channel, direction, at: at(d, hhmm), body, automated: false, ...extra })
  }
  // Bupa
  m('j1', 'c1', 'call', 'in', 30, '09:05', 'Asked about insulating the roof and walls. Wants a site visit.', { callMinutes: 6 })
  m('j1', 'c1', 'sms', 'out', 29, '08:30', 'Hi Travis, this is Glenn from Spray It. Thanks for the call. Can I visit Monday at 10?')
  m('j1', 'c1', 'sms', 'in', 29, '08:41', 'Monday at 10 is fine. Use the north gate.')
  m('j1', 'c1', 'email', 'out', 20, '14:10', 'Hi Travis, your quote Q-1038 is attached. Please have a look and let me know if you have questions.', { subject: 'Your quote Q-1038', automated: true })
  m('j1', 'c1', 'call', 'out', 12, '11:20', 'Talked through the roof price. He wants it a bit higher on the ceiling. I will send a new version.', { callMinutes: 9 })
  m('j1', 'c1', 'sms', 'in', 3, '16:02', 'Any news on the new version? The owners are asking.')
  // Harper
  m('j5', 'c5', 'email', 'out', 4, '10:00', 'Hi Priya, your quote Q-1043 is ready. You can look at it and say yes online.', { subject: 'Your quote Q-1043', automated: true })
  m('j5', 'c5', 'sms', 'out', 4, '10:01', 'Hi Priya, we have emailed your quote. Spray It Solutions.', { automated: true })
  m('j5', 'c5', 'sms', 'in', 3, '17:15', 'Thanks, I will look tonight.')
  // Ng warehouse
  m('j6', 'c2', 'email', 'out', 25, '09:00', 'Hi Lachlan, your quote Q-1044 is attached.', { subject: 'Your quote Q-1044', automated: true })
  m('j6', 'c2', 'call', 'in', 22, '15:50', 'Said yes on the phone, then accepted online. Wants the install on the 20th or later.', { callMinutes: 4 })
  m('j6', 'c2', 'email', 'out', 22, '16:05', 'Thanks for accepting. Your deposit invoice is attached.', { subject: 'Deposit invoice INV-2001', automated: true })
  m('j6', 'c2', 'sms', 'out', 9, '09:00', 'Hi Lachlan, a reminder that the install is booked for next week.', { automated: true })
  // Okafor
  m('j8', 'c8', 'email', 'out', 25, '09:00', 'Hi Hannah, your quote Q-1046 is attached. It is open for 30 days.', { subject: 'Your quote Q-1046', automated: true })
  m('j8', 'c8', 'sms', 'out', 18, '12:30', 'Hi Hannah, just checking you got the quote. Glenn.')
  m('j8', 'c8', 'call', 'out', 10, '16:40', 'No answer. Left a message.', { callMinutes: 1 })
  // Lee
  m('j9', 'c9', 'email', 'out', 26, '11:10', 'Thanks Ben. Your deposit invoice is attached.', { subject: 'Deposit invoice INV-2005', automated: true })
  m('j9', 'c9', 'sms', 'in', 9, '12:20', 'Looks great. Thanks Glenn.')
  // Dutta
  m('j11', 'c11', 'email', 'out', 14, '09:35', 'Thanks for accepting. Your deposit invoice is attached.', { subject: 'Deposit invoice INV-2003', automated: true })
  m('j11', 'c11', 'sms', 'out', 5, '10:00', 'Hi Sam, a friendly reminder that the deposit invoice is now due.', { automated: true })
  m('j11', 'c11', 'sms', 'in', 5, '10:20', 'Sorry, will pay this week.')
  return out
}

/** Starting invoices. Amounts follow the quote's payment rows. */
export function seedInvoices(): Invoice[] {
  const today = todayISO()
  const quotes = seedQuotes()
  const day = (d: number) => addDaysISO(today, d)
  const at = (d: number) => `${day(d)}T10:00:00`
  const contactOf: Record<string, string> = { j1: 'c1', j5: 'c5', j6: 'c2', j7: 'c7', j9: 'c9', j11: 'c11', j12: 'c3' }
  const emailOf = (cid: string) => seedContacts.find((c) => c.id === cid)?.email
  // Gives every invoice the whole new shape. paidAt in extra means "paid in full then" (older way of saying it).
  const build = (id: string, number: string, jobId: string, kind: Invoice['kind'], items: InvoiceLine[], extra: Partial<Invoice> = {}): Invoice => {
    const { paidAt, ...rest } = extra
    const contactId = contactOf[jobId]
    const inv = {
      id, number, jobId, contactId, kind, status: 'draft', items, discount: 0, issueDate: rest.sentAt ? rest.sentAt.slice(0, 10) : day(0), dueDate: '', notes: '', payments: [],
      label: '', amount: 0, ...rest,
    } as Invoice
    if (rest.sentAt && !rest.sentTo) inv.sentTo = emailOf(contactId ?? '')
    if (rest.sentAt && inv.status === 'draft') inv.status = 'sent'
    if (paidAt) {
      inv.payments = [{ id: `${id}-p1`, amount: invoiceTotals(inv).total, method: 'bank', at: paidAt }]
      inv.status = 'paid'
    }
    return syncInvoice(inv)
  }
  const make = (id: string, number: string, quoteId: string, row: number, kind: Invoice['kind'], extra: Partial<Invoice>): Invoice => {
    const q = quotes.find((x) => x.id === quoteId) as Quote
    const amounts = paymentAmounts(q.payments, q.acceptedTotal ?? quoteTotals(q).total)
    return build(id, number, q.jobId, kind, [lineForAmount(q.payments[row].label, amounts[row])], { quoteId, label: q.payments[row].label, ...extra })
  }
  const one = (desc: string, qty: number, unit: InvoiceLine['unit'], price: number, gst = true): InvoiceLine => ({ id: `il-${desc.slice(0, 6)}-${qty}`, description: desc, qty, unit, unitPrice: price, gst })
  return [
    make('inv1', 'INV-2001', 'q7', 0, 'deposit', { dueDate: day(-22), sentAt: at(-22), paidAt: at(-20) }),
    make('inv2', 'INV-2002', 'q7', 1, 'final', { dueDate: day(10) }),
    make('inv3', 'INV-2003', 'q13', 0, 'deposit', { dueDate: day(-6), sentAt: at(-14) }),
    make('inv4', 'INV-2004', 'q13', 1, 'final', {}),
    make('inv5', 'INV-2005', 'q11', 0, 'deposit', { dueDate: day(-26), sentAt: at(-26), paidAt: at(-24) }),
    make('inv6', 'INV-2006', 'q11', 1, 'final', { dueDate: day(-9), sentAt: at(-9), paidAt: at(-7) }),
    make('inv7', 'INV-2007', 'q14', 0, 'deposit', { dueDate: day(0) }),
    make('inv8', 'INV-2008', 'q14', 1, 'final', {}),
    // Extra variety: part paid and late, paid by cash, void, a hand-made draft, and one sent and waiting.
    {
      ...build('inv9', 'INV-2009', 'j6', 'other', [one('Extra scaffold hire, 3 days', 3, 'each', 420), one('Site clean-up', 4, 'hour', 85)], {
        sentAt: at(-12), dueDate: day(-3), notes: 'Extra work asked for on site.', status: 'part',
      }),
    },
    build('inv10', 'INV-2010', 'j9', 'other', [one('Call-out and extra materials', 1, 'each', 640)], { sentAt: at(-5), dueDate: day(9), paidAt: at(-2) }),
    build('inv11', 'INV-2011', 'j11', 'deposit', [one('Deposit (sent twice by mistake)', 1, 'each', 2860)], { sentAt: at(-14), dueDate: day(-6), status: 'void', voidReason: 'Sent twice by mistake. INV-2003 is the right one.' }),
    build('inv12', 'INV-2012', 'j5', 'deposit', [one('Wall insulation, deposit', 1, 'each', 1500), one('Booking fee', 1, 'each', 150, false)], { dueDate: day(7), discount: 100, notes: 'Held until the quote is accepted.' }),
    build('inv13', 'INV-2013', 'j7', 'other', [one('Site inspection report', 2, 'hour', 110)], { sentAt: at(-1), dueDate: day(6) }),
  ].map((inv) => {
    if (inv.id !== 'inv9') return inv
    // Half paid already.
    const pay = { id: 'inv9-p1', amount: invoiceTotals(inv).total / 2, method: 'card' as const, at: at(-6), note: 'Paid half over the phone' }
    return syncInvoice({ ...inv, payments: [pay] })
  })
}

/** Starting timeline, built from the seed jobs, quotes, invoices and messages. Newest first is done on read. */
export function seedEvents(jobs: Job[], quotes: Quote[], invoices: Invoice[], messages: Message[]): TimelineEvent[] {
  const now = new Date().toISOString()
  const out: TimelineEvent[] = []
  let n = 0
  const add = (jobId: string, at: string, kind: TimelineEvent['kind'], text: string) => {
    n++
    out.push({ id: `ev${n}`, jobId, at: at > now ? now : at, kind, text })
  }
  const nameOf = (r: { kind: 'contact' | 'company'; id: string }) =>
    (r.kind === 'contact' ? seedContacts : seedCompanies).find((x) => x.id === r.id)?.name ?? 'the customer'
  const contactName = (id?: string) => seedContacts.find((c) => c.id === id)?.name.split(' ')[0] ?? 'the customer'
  const today = todayISO()
  for (const j of jobs) {
    add(j.id, j.createdAt, 'stage', `Job started: ${j.name}`)
    if (j.stage !== 'New Lead') add(j.id, `${j.stageSince}T08:00:00`, 'stage', `Moved to ${j.stage}`)
    if (j.status !== 'open') add(j.id, `${j.stageSince}T09:00:00`, 'stage', `Marked ${j.status}${j.lostReason ? `: ${j.lostReason}` : ''} (stage stays ${j.stage})`)
    for (const ap of j.appointments) if (ap.date < today) add(j.id, `${ap.date}T${ap.time}:00`, 'appointment', `${ap.title} on ${fmtDate(ap.date)}`)
    for (const tk of j.tasks) if (tk.done) add(j.id, `${tk.dueDate ?? j.createdAt.slice(0, 10)}T12:00:00`, 'task', `Task done: ${tk.title}`)
  }
  for (const q of quotes) {
    if (q.sentAt) add(q.jobId, q.sentAt, 'quote', `Quote ${q.number} sent to ${nameOf(q.recipient)}`)
    if (q.acceptedAt) add(q.jobId, q.acceptedAt, 'quote', `Quote ${q.number} accepted`)
    if (q.declinedAt) add(q.jobId, q.declinedAt, 'quote', `Quote ${q.number} declined`)
  }
  for (const i of invoices) {
    if (i.sentAt) add(i.jobId, i.sentAt, 'payment', `Invoice ${i.number} sent`)
    if (i.paidAt) add(i.jobId, i.paidAt, 'payment', `Invoice ${i.number} paid`)
  }
  for (const m of messages) {
    const who = contactName(m.contactId)
    if (m.channel === 'call') add(m.jobId, m.at, 'call', m.direction === 'out' ? `Called ${who}` : `${who} called`)
    else add(m.jobId, m.at, 'message', `${m.channel === 'sms' ? 'Text' : 'Email'} ${m.direction === 'out' ? 'sent to' : 'from'} ${who}`)
  }
  return out
}

/** Everything the store starts with, built in one go so the pieces agree. */
export function seedAll() {
  const jobs = seedJobs()
  const quotes = seedQuotes()
  const messages = seedMessages()
  const invoices = seedInvoices()
  return { jobs, quotes, messages, invoices, events: seedEvents(jobs, quotes, invoices, messages), priceItems: seedPriceItems() }
}
