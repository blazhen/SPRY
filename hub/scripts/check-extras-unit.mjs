// Unit tests for the Round 5 maths and rules in src/lib/extras.ts (foam calculator, chase schedule, duplicate check,
// costing, lost report, settings repair). No browser, no server. Run: node scripts/check-extras-unit.mjs
import { build } from 'esbuild'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hub-extras-')), 'bundle.mjs')
await build({ entryPoints: [path.join(ROOT, 'src/lib/extras.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' })
const X = await import(pathToFileURL(out).href)

let failed = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' :: got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)}`)
}

// ---- Foam calculator (hand worked) ----
const open = { yieldBdFtPerSet: 14000, pricePerM3: 350, costPerM3: 150 }
const closed = { yieldBdFtPerSet: 4500, pricePerM3: 1200, costPerM3: 520 }
let r = X.foamCalc({ areaM2: 100, thicknessMm: 100, wastePct: 10 }, open)
eq('open cell 100 m2 x 100 mm, 10% waste: volumes', [r.netM3, r.grossM3], [10, 11])
eq('open cell: board feet (11 m3 x 423.776)', r.boardFeet, 4661.5)
eq('open cell: litres of cured foam', r.litres, 11000)
eq('open cell: sets at 14000 bf per set', r.sets, 0.33)
eq('open cell: price on the net volume, cost on the gross volume', [r.price, r.cost], [3500, 1650])
eq('open cell: margin and margin percent', [r.margin, r.marginPct], [1850, 52.9])
r = X.foamCalc({ areaM2: 50, thicknessMm: 50, wastePct: 8 }, closed)
eq('closed cell 50 m2 x 50 mm, 8% waste: net and gross', [r.netM3, r.grossM3], [2.5, 2.7])
eq('closed cell: price, cost, margin percent', [r.price, r.cost, r.marginPct], [3000, 1404, 53.2])
eq('closed cell: sets', r.sets, 0.25)
r = X.foamCalc({ areaM2: 10, thicknessMm: 25, wastePct: 0 }, { yieldBdFtPerSet: 1000, pricePerM3: 0, costPerM3: 100 })
eq('no price: margin percent is 0, not a divide by zero', [r.price, r.marginPct], [0, 0])
eq('0 waste: net equals gross', r.netM3 === r.grossM3, true)
eq('one cubic metre is 423.776 board feet', X.foamCalc({ areaM2: 1000, thicknessMm: 1, wastePct: 0 }, open).boardFeet, 423.8)
eq('input problems: no area', X.foamInputProblem({ areaM2: 0, thicknessMm: 50, wastePct: 5 }), 'Enter the area in square metres.')
eq('input problems: no thickness', X.foamInputProblem({ areaM2: 5, thicknessMm: 0, wastePct: 5 }), 'Enter the thickness in millimetres.')
eq('input problems: waste over 100', X.foamInputProblem({ areaM2: 5, thicknessMm: 5, wastePct: 120 }), 'Waste is a percent from 0 to 100.')
eq('input problems: fine', X.foamInputProblem({ areaM2: 5, thicknessMm: 5, wastePct: 5 }), '')
const calc = X.foamCalc({ areaM2: 100, thicknessMm: 100, wastePct: 10 }, open)
const line = X.foamLine({ areaM2: 100, thicknessMm: 100, wastePct: 10 }, { name: 'Open cell' }, calc)
eq('the quote line: area as quantity, rate = price / area', [line.qty, line.unit, line.unitPrice], [100, 'm²', 35])
eq('the quote line total equals the calculator price', Math.abs(line.qty * line.unitPrice - calc.price) < 0.01, true)
eq('the quote line text has no cost or margin', /cost|margin/i.test(line.name + ' ' + line.description), false)
const odd = X.foamCalc({ areaM2: 37, thicknessMm: 73, wastePct: 7 }, closed)
const oddLine = X.foamLine({ areaM2: 37, thicknessMm: 73, wastePct: 7 }, { name: 'Closed cell' }, odd)
eq('odd numbers: the line total is within half a cent per m2 of the price', Math.abs(oddLine.qty * oddLine.unitPrice - odd.price) <= 37 * 0.005 + 0.001, true)

// ---- Chase schedule ----
const days = [2, 5, 10]
const now = new Date('2026-11-10T12:00:00Z')
const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString()
eq('default chase days', X.DEFAULT_CHASE_DAYS, [2, 5, 10])
eq('sent 1 day ago: not due', X.chaseState(ago(1), [], days, now).dueNow, false)
let s = X.chaseState(ago(3), [], days, now)
eq('sent 3 days ago, no chase yet: chase 1 due, 1 day late', [s.nextN, s.dueNow, s.daysLate], [1, true, 1])
s = X.chaseState(ago(3), [ago(1)], days, now)
eq('one chase logged, 3 days: chase 2 not due until day 5', [s.nextN, s.dueNow, s.nextDay], [2, false, 5])
s = X.chaseState(ago(11), [ago(8), ago(5)], days, now)
eq('11 days, two chases: chase 3 due', [s.nextN, s.dueNow], [3, true])
s = X.chaseState(ago(30), [ago(1), ago(1), ago(1)], days, now)
eq('all three done: nothing next', [s.nextN, s.dueNow, s.nextDay], [0, false, null])
eq('no sent date: never due', X.chaseState(undefined, [], days, now).dueNow, false)
eq('custom days [1,3]', X.chaseState(ago(1), [], [1, 3], now).dueNow, true)
eq('chase days: good', X.chaseDaysProblem([2, 5, 10]), '')
eq('chase days: not rising', X.chaseDaysProblem([5, 5]) !== '', true)
eq('chase days: decimals', X.chaseDaysProblem([1.5]) !== '', true)
eq('chase days: empty', X.chaseDaysProblem([]) !== '', true)
eq('chase days: over 90', X.chaseDaysProblem([100]) !== '', true)

const quotes = [
  { id: 'a', status: 'Sent', sentAt: ago(6) },
  { id: 'b', status: 'Sent', sentAt: ago(4) },
  { id: 'c', status: 'Accepted', sentAt: ago(6) },
  { id: 'd', status: 'Sent', sentAt: ago(20) },
  { id: 'e', status: 'Draft' },
]
const opens = { a: { count: 2, first: ago(3), last: ago(0.2) }, b: { count: 1, first: ago(1), last: ago(0.5) }, c: { count: 4, first: ago(5), last: ago(0.1) }, d: { count: 1, first: ago(10), last: ago(9) }, e: { count: 1, first: ago(1), last: ago(1) } }
const called = X.openedCallNow(quotes, opens)
eq('Opened, call now: sent and opened only, newest open first', called.map((x) => x.quote.id), ['a', 'b', 'd'])
eq('Opened, call now: an accepted quote is never listed', called.some((x) => x.quote.id === 'c'), false)
eq('Just opened: within 24 hours', X.justOpened(called, now).map((x) => x.quote.id), ['a', 'b'])
eq('Opened, call now: a quote with count 0 is not listed', X.openedCallNow([{ id: 'z', status: 'Sent' }], { z: { count: 0, first: ago(1), last: ago(1) } }).length, 0)
eq('Chase due: most late first, sent only', X.chaseDue(quotes, days, now).map((x) => x.quote.id), ['d', 'a', 'b'])

// ---- Duplicate check ----
const people = [
  { id: 'p1', name: 'Travis Gillespie', phone: '0400 000 001', mobile: '0400 000 011', email: 'travis@quadricon.com.au', address: '14 Example Ave, Clayton VIC', jobAddresses: ['12 Example St, Dandenong VIC'] },
  { id: 'p2', name: 'Jess Marlow', phone: '03 5550 1234', email: 'jess@quadricon.com.au' },
  { id: 'p3', name: 'Pat Gmail', email: 'pat@gmail.com' },
]
eq('phone match ignores spaces and the leading zero', X.findDuplicates({ phone: '+61 400 000 001' }, people).map((m) => m.id), ['p1'])
eq('mobile match', X.findDuplicates({ phone: '0400000011' }, people)[0].reasons, ['phone'])
eq('email match ignores case', X.findDuplicates({ email: 'JESS@quadricon.com.au' }, people)[0].reasons, ['email'])
eq('address match with Avenue written out', X.findDuplicates({ address: '14 Example Avenue, Clayton' }, people)[0].reasons, ['address'])
eq('address match on a job site address', X.findDuplicates({ address: '12 example street' }, people)[0].id, 'p1')
eq('two reasons sort first', X.findDuplicates({ phone: '0400 000 001', email: 'travis@quadricon.com.au' }, people)[0].reasons, ['phone', 'email'])
eq('no match', X.findDuplicates({ phone: '0412 999 888', email: 'new@new.com', address: '1 Nowhere Rd' }, people), [])
eq('a short number does not match', X.findDuplicates({ phone: '123' }, people), [])
eq('same company by business email domain', X.sameCompanyHint('sam@quadricon.com.au', people).map((p) => p.id), ['p1', 'p2'])
eq('free mail is never a company hint', X.sameCompanyHint('lee@gmail.com', people), [])
eq('street key', X.streetKey('14 Example Avenue, Clayton VIC'), '14 example ave')

// ---- Costing ----
eq('costing: quoted 10000, cost 7000, materials 4000', X.jobCosting(10000, 4000, 7000), { quoted: 10000, actualCost: 7000, actualMaterials: 4000, profit: 3000, marginPct: 30, materialsPct: 57.1 })
eq('costing: nothing entered yet', X.jobCosting(10000, undefined, undefined), null)
eq('costing: materials only count as the cost so far', X.jobCosting(2000, 500, undefined).profit, 1500)
eq('costing: a loss shows a negative margin', X.jobCosting(1000, 0, 1500).marginPct, -50)
eq('costing: zero quote does not divide by zero', X.jobCosting(0, 0, 100).marginPct, 0)

// ---- Lost report ----
const rep = X.lostReport([
  { status: 'lost', lostReason: 'Price too high', leadSource: 'Website', value: 1000 },
  { status: 'lost', lostReason: 'Price too high', leadSource: 'Referral', value: 3000 },
  { status: 'lost', lostReason: 'Timing', source: 'Website', value: 500 },
  { status: 'lost', value: 200 },
  { status: 'open', lostReason: 'Price too high', value: 9999 },
  { status: 'won', value: 5000 },
])
eq('lost report: total and value', [rep.total, rep.value], [4, 4700])
eq('lost report: by reason, most first then by value, blanks as Not noted', rep.byReason, [{ label: 'Price too high', count: 2, value: 4000 }, { label: 'Timing', count: 1, value: 500 }, { label: 'Not noted', count: 1, value: 200 }])
eq('lost report: by source (uses the CRM source when no lead source)', rep.bySource.find((x) => x.label === 'Website'), { label: 'Website', count: 2, value: 1500 })

// ---- Settings repair ----
eq('fixExtras: nothing saved -> nothing set', X.fixExtras(undefined), {})
eq('fixExtras: junk dropped', X.fixExtras({ on: { chasing: 'yes', myDay: false, zzz: true }, chaseDays: [5, 2], foam: [{ id: 1 }], lostReasons: [] }), { on: { myDay: false } })
eq('fixExtras: good values kept and trimmed', X.fixExtras({ chaseDays: [1, 4], lostReasons: [' A ', 'A', 'B'], foam: [{ id: 'f', name: ' Foam ', yieldBdFtPerSet: 100, pricePerM3: 10, costPerM3: 5, wastePct: 3, placeholder: false }] }), { chaseDays: [1, 4], foam: [{ id: 'f', name: 'Foam', yieldBdFtPerSet: 100, pricePerM3: 10, costPerM3: 5, wastePct: 3, placeholder: false }], lostReasons: ['A', 'B'] })
eq('every extra is on by default', X.EXTRA_LIST.every((e) => X.isExtraOn(undefined, e.key)), true)
eq('a switch set to off is off', X.isExtraOn({ on: { calculator: false } }, 'calculator'), false)
eq('default foam types are all flagged placeholder', X.DEFAULT_FOAM.every((f) => f.placeholder === true), true)
eq('sending extras are listed as spec only', X.SEND_EXTRAS.every((e) => /Spec only/.test(e.help)), true)

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
