// Unit tests for the calculator and job costing maths (src/lib/calcEngine.ts). No browser, no server.
// Run: node scripts/check-calculator-unit.mjs
import { build } from 'esbuild'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hub-calc-')), 'bundle.mjs')
await build({ entryPoints: [path.join(ROOT, 'src/lib/calcEngine.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', define: { 'import.meta.env': '{}' } })
const E = await import(pathToFileURL(out).href)

let failed = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' :: got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)}`)
}

const foam = [
  { id: 'foam-closed', name: 'Closed cell', yieldBdFtPerSet: 4500, pricePerM3: 1200, costPerM3: 520, wastePct: 8, placeholder: true },
  { id: 'foam-open', name: 'Open cell', yieldBdFtPerSet: 14000, pricePerM3: 350, costPerM3: 150, wastePct: 10, placeholder: true },
]
const items = E.seedCalcItems()
const byId = (id) => items.find((i) => i.id === id)
const totalsFor = (qtys) => E.calcTotals(E.buildLines(items, foam, qtys))

// ---- Prices from the one source (Foam prices) ----
eq('closed 50 mm price per m2 = 1200 x 0.05', E.itemPrice(byId('ci-closed-50'), foam), 60)
eq('open 100 mm price per m2 = 350 x 0.1', E.itemPrice(byId('ci-open-100'), foam), 35)
eq('open 150 mm price per m2', E.itemPrice(byId('ci-open-150'), foam), 52.5)
eq('closed 50 mm cost includes waste: 520 x 1.08 x 0.05', E.itemCost(byId('ci-closed-50'), foam), 28.08)
eq('changing the foam price changes the item', E.itemPrice(byId('ci-closed-50'), [{ ...foam[0], pricePerM3: 1500 }, foam[1]]), 75)
eq('foam type gone: saved price is used', E.itemPrice(byId('ci-closed-50'), []), 60)
eq('plain item price', E.itemPrice(byId('ci-labour'), foam), 95)

// ---- Totals and GST (sums to the cent) ----
const t1 = totalsFor({ 'ci-closed-50': 100, 'ci-labour': 8 })
eq('case 1: 100 m2 closed 50 + 8 h labour: before GST', t1.subtotal, 6760)
eq('case 1: GST', t1.gst, 676)
eq('case 1: with GST', t1.total, 7436)

const t2 = totalsFor({ 'ci-open-100': 33.3, 'ci-travel': 1 })
eq('case 2: 33.3 m2 open 100 (35.00) + travel 80: before GST', t2.subtotal, 1245.5)
eq('case 2: GST 124.55', t2.gst, 124.55)
eq('case 2: with GST', t2.total, 1370.05)

// A GST half cent: 10% of 0.05 is 0.005 and rounds up to 0.01 (rule in calc.ts)
const half = E.calcTotals([{ itemId: 'x', name: 'x', unit: 'each', group: 'Other', qty: 1, unitPrice: 0.05, total: 0.05 }])
eq('case 3: GST half cent rounds up (0.05 -> 0.01)', [half.subtotal, half.gst, half.total], [0.05, 0.01, 0.06])

// GST on the sum, not per line: two lines of 0.04 give GST 0.01 (per line it would be 0.00)
const two = E.calcTotals([
  { itemId: 'a', name: 'a', unit: 'each', group: 'Other', qty: 1, unitPrice: 0.04, total: 0.04 },
  { itemId: 'b', name: 'b', unit: 'each', group: 'Other', qty: 1, unitPrice: 0.04, total: 0.04 },
])
eq('case 4: GST worked out once on the subtotal', [two.subtotal, two.gst, two.total], [0.08, 0.01, 0.09])

const t5 = totalsFor({ 'ci-open-100': 7.77, 'ci-labour': 2.5 })
eq('case 5: 7.77 x 35 = 271.95, 2.5 x 95 = 237.5: before GST', t5.subtotal, 509.45)
eq('case 5: GST 50.945 rounds half up to 50.95', t5.gst, 50.95)
eq('case 5: with GST', t5.total, 560.4)

const t6 = totalsFor({ 'ci-closed-100': 0.01 })
eq('case 6: tiny area 0.01 m2 x 120 = 1.20, GST 0.12', [t6.subtotal, t6.gst, t6.total], [1.2, 0.12, 1.32])

for (const [n, t] of [['1', t1], ['2', t2], ['5', t5], ['6', t6]]) {
  eq(`case ${n}: before GST + GST = with GST to the cent`, Math.round((t.subtotal + t.gst) * 100), Math.round(t.total * 100))
}

eq('no quantities: nothing', totalsFor({}).total, 0)
eq('zero and negative quantities are ignored', E.buildLines(items, foam, { 'ci-labour': 0, 'ci-travel': -2 }).length, 0)

// ---- Cost, material, hours and margin ----
const m = totalsFor({ 'ci-closed-50': 100, 'ci-labour': 8 })
eq('material cost: 100 x 28.08', m.materialCost, 2808)
eq('labour hours', m.labourHours, 8)
eq('cost: 2808 + 8 x 55', m.cost, 3248)
eq('margin dollars: 6760 - 3248', m.margin?.dollars, 3512)
eq('margin percent', m.margin?.pct, 52)
const noCost = E.calcTotals([{ itemId: 'x', name: 'Mystery', unit: 'each', group: 'Other', qty: 2, unitPrice: 10, total: 20 }])
eq('no cost set: no margin and the item is named', [noCost.margin, noCost.missingCost], [null, ['Mystery']])

// ---- Lines keep their own price; quote lines hide cost ----
const lines = E.buildLines(items, foam, { 'ci-closed-50': 10 })
const cheaper = E.buildLines(items, [{ ...foam[0], pricePerM3: 1 }, foam[1]], { 'ci-closed-50': 10 })
eq('a built line carries the price of the day', [lines[0].unitPrice, cheaper[0].unitPrice], [60, 0.05])
let n = 0
const ql = E.quoteLinesFrom(lines, () => `li${++n}`)
eq('quote line: name, qty, unit, price, thickness text', [ql[0].name, ql[0].qty, ql[0].unit, ql[0].unitPrice, ql[0].description], ['Closed cell foam, 50 mm', 10, 'm²', 60, 'Sprayed at 50 mm thick.'])
eq('quote lines never carry a cost', JSON.stringify(ql).includes('ost'), false)

// ---- Order, groups, most used first ----
const used = items.map((i) => (i.id === 'ci-open-100' ? { ...i, uses: 5 } : i))
eq('most used first inside Foam', E.itemsInGroup(used, 'Foam').map((i) => i.id)[0], 'ci-open-100')
eq('hidden items are left out', E.itemsInGroup(items.map((i) => (i.id === 'ci-travel' ? { ...i, hidden: true } : i)), 'Travel').length, 0)
eq('own groups come after the five, A to Z', E.groupOrder([...items, { ...byId('ci-travel'), id: 'z', group: 'Zinc' }, { ...byId('ci-travel'), id: 'y', group: 'Awnings' }]), ['Foam', 'Labour', 'Travel', 'Extras', 'Awnings', 'Zinc'])
eq('fix: bad item dropped, bad unit becomes each', [E.fixCalcItem({ id: '', name: 'x' }), E.fixCalcItem({ id: 'a', name: ' Hi ', unit: 'kg', group: '', price: -4 })?.unit], [null, 'each'])
eq('fix: negative price becomes 0, empty group becomes Other', [E.fixCalcItem({ id: 'a', name: 'Hi', price: -4, group: ' ' })?.price, E.fixCalcItem({ id: 'a', name: 'Hi', price: 3, group: ' ' })?.group], [0, 'Other'])

// ---- Job costing ----
const fmt = (v) => '$' + v.toFixed(2)
eq('foam used 1000 litres cured closed: 1 m3 x 520', E.foamUsedCost({ id: 'u', foamId: 'foam-closed', unit: 'litres', amount: 1000 }, foam), 520)
eq('foam used 1 set closed: 4500 / 423.776 x 520', E.foamUsedCost({ id: 'u', foamId: 'foam-closed', unit: 'sets', amount: 1 }, foam), 5521.79)
eq('foam used in his own measure: 3 drums x 450', E.foamUsedCost({ id: 'u', foamId: 'foam-closed', unit: 'own', ownName: 'drums', ownCost: 450, amount: 3 }, foam), 1350)
eq('fix keeps the own measure', E.fixActuals({ id: 'j', foams: [{ id: 'u', foamId: 'x', unit: 'own', amount: 2, ownName: 'kg', ownCost: 9 }] }).foams[0].ownName, 'kg')
const act = { id: 'j1', foams: [{ id: 'u', foamId: 'foam-closed', unit: 'litres', amount: 2500 }], hours: 20, extras: [{ id: 'e', name: 'Skip', amount: 300 }], updatedAt: '' }
const c = E.actualCosting(4000, act, foam, items, fmt)
eq('costing: foam 2.5 m3 x 520 = 1300, labour 20 x 55 = 1100, extras 300', [c.foamCost, c.labourCost, c.extrasCost, c.cost], [1300, 1100, 300, 2700])
eq('costing: profit and percent', [c.profit, c.marginPct], [1300, 32.5])
eq('costing: verdict made', c.verdict, 'Made $1300.00, 32.5%')
const loss = E.actualCosting(2000, act, foam, items, fmt)
eq('costing: verdict lost', loss.verdict, 'Lost $700.00, minus 35%')
eq('costing: nothing entered is null', E.actualCosting(4000, { id: 'j', foams: [], hours: 0, extras: [], updatedAt: '' }, foam, items, fmt), null)
eq('costing: own hourly cost wins', E.actualCosting(4000, { ...act, hourlyCost: 80 }, foam, items, fmt).labourCost, 1600)
eq('costing: hours with no hourly cost warn', E.actualCosting(100, { ...act, foams: [], extras: [] }, foam, [], fmt).warnings.length, 1)

console.log(failed ? `\n${failed} FAILED` : '\nAll calculator unit checks passed')
process.exit(failed ? 1 : 0)
