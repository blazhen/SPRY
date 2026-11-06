// Unit tests for the deposit rule (depositFor in src/lib/extras.ts). No browser, no server.
// Run: node scripts/check-deposit-unit.mjs
import { build } from 'esbuild'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hub-dep-')), 'bundle.mjs')
await build({ entryPoints: [path.join(ROOT, 'src/lib/extras.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' })
const X = await import(pathToFileURL(out).href)

let failed = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' :: got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)}`)
}

const foam = X.DEFAULT_FOAM // open cell 20, closed cell 30 (placeholders)
const on = { ...X.DEFAULT_DEPOSIT, enabled: true }
const open = { name: 'Open cell foam, 100 mm', foamId: 'foam-open' }
const closed = { name: 'Closed cell foam, 50 mm', foamId: 'foam-closed' }
const q = (lines, subtotal, total = Math.round(subtotal * 1.1 * 100) / 100) => ({ lines, subtotal, total, acceptedOn: '2026-11-06' })

eq('defaults are off and not confirmed', [X.DEFAULT_DEPOSIT.enabled, X.DEFAULT_DEPOSIT.confirmed, X.DEFAULT_DEPOSIT.dueDays, X.DEFAULT_DEPOSIT.basis, X.DEFAULT_DEPOSIT.mixed], [false, false, 7, 'withGst', 'larger'])
eq('foam defaults: open 20, closed 30', foam.map((f) => f.depositPct), [20, 30])

// Switch off: no deposit worked out
eq('switch off: amount 0, no date', X.depositFor(q([open], 1000), foam, X.DEFAULT_DEPOSIT), { amount: 0, dueDate: '', percentUsed: 0, reason: 'Deposits are switched off.' })
eq('no settings at all counts as off', X.depositFor(q([open], 1000), foam, undefined).amount, 0)

// One foam type. Default basis is the total WITH GST: 20% of 1,100.00
let d = X.depositFor(q([open], 1000), foam, on)
eq('open cell only: 20% of total with GST (1100) = 220.00', [d.amount, d.percentUsed, d.dueDate], [220, 20, '2026-11-13'])
d = X.depositFor(q([closed], 1000), foam, on)
eq('closed cell only: 30% of 1100 = 330.00', [d.amount, d.percentUsed], [330, 30])
eq('reason names the foam and the base', d.reason, '30% (Closed cell) of the total with GST.')

// GST handling is a setting
d = X.depositFor(q([closed], 1000), foam, { ...on, basis: 'beforeGst' })
eq('before GST: 30% of 1000 = 300.00', [d.amount, d.reason.includes('before GST')], [300, true])

// Mixed foam, both ways, and fixed
d = X.depositFor(q([open, closed], 2000), foam, on)
eq('mixed, larger: 30% of 2200 = 660.00', [d.amount, d.percentUsed], [660, 30])
d = X.depositFor(q([open, closed], 2000), foam, { ...on, mixed: 'average' })
eq('mixed, average of 20 and 30 = 25%: 550.00', [d.amount, d.percentUsed], [550, 25])
d = X.depositFor(q([open, closed], 2000), foam, { ...on, mixed: 'fixed', fixedPct: 40 })
eq('mixed, fixed 40%: 880.00', [d.amount, d.percentUsed], [880, 40])
d = X.depositFor(q([open, closed], 2000), foam, { ...on, mixed: 'fixed', fixedPct: 10 })
eq('fixed ignores the foam percents (10% of 2200 = 220.00)', d.amount, 220)
eq('the same foam on two lines counts once (average = its own percent)', X.depositFor(q([open, { ...open, name: 'Open cell foam, 150 mm' }], 1000), foam, { ...on, mixed: 'average' }).percentUsed, 20)

// A foam found by name only (a typed quote line), and no foam at all
eq('foam found by name when the line has no foam id', X.depositFor(q([{ name: 'Spray foam insulation, closed cell' }], 1000), foam, on).percentUsed, 30)
d = X.depositFor(q([{ name: 'Labour' }], 1000), foam, { ...on, fixedPct: 15 })
eq('no foam line: the fixed percent (15% of 1100 = 165.00) and says so', [d.amount, d.reason.includes('no foam line found')], [165, true])
eq('a foam type with no deposit percent uses the fixed percent', X.depositFor(q([open], 1000), [{ ...foam[0], depositPct: undefined }, foam[1]], { ...on, fixedPct: 12 }).percentUsed, 12)

// Minimum
d = X.depositFor(q([open], 100), foam, { ...on, minAmount: 50 })
eq('minimum: 20% of 110 = 22.00, raised to 50.00', [d.amount, d.reason.includes('minimum')], [50, true])
d = X.depositFor(q([open], 10), foam, { ...on, minAmount: 50 })
eq('minimum never goes above the total (11.00)', d.amount, 11)
eq('minimum not needed: unchanged', X.depositFor(q([open], 1000), foam, { ...on, minAmount: 50 }).amount, 220)

// Cents, half up
eq('rounding half up: 25% of 0.30 (0.075) = 0.08', X.depositFor({ lines: [{ name: 'x' }], subtotal: 0.3, total: 0.3, acceptedOn: '2026-11-06' }, foam, { ...on, mixed: 'fixed', fixedPct: 25 }).amount, 0.08)
eq('rounding: 30% of 1234.56 = 370.37 (370.368)', X.depositFor({ lines: [closed], subtotal: 1234.56, total: 1234.56, acceptedOn: '2026-11-06' }, foam, on).amount, 370.37)

// Due date
eq('due in 14 days across a month end', X.depositFor({ lines: [open], subtotal: 100, total: 110, acceptedOn: '2026-11-25' }, foam, { ...on, dueDays: 14 }).dueDate, '2026-12-09')
eq('due the same day with 0 days', X.depositFor({ lines: [open], subtotal: 100, total: 110, acceptedOn: '2026-11-25' }, foam, { ...on, dueDays: 0 }).dueDate, '2026-11-25')

// Empty quote
eq('no total yet: no deposit', X.depositFor(q([open], 0, 0), foam, on).amount, 0)

// What the Hub would write to the CRM (HX-4): nothing is written from the Hub
eq('CRM fields on acceptance', X.depositCrmFields(X.depositFor(q([closed], 1000), foam, on)), { deposit_amount: 330, deposit_due_date: '2026-11-13' })
eq('no CRM fields when switched off', X.depositCrmFields(X.depositFor(q([closed], 1000), foam, X.DEFAULT_DEPOSIT)), null)

// Saved settings clean-up (same rules as foam types and certificate wording)
const fixed = X.fixExtras({ deposit: { enabled: true, mixed: 'nonsense', fixedPct: 500, dueDays: -3, minAmount: 'x', basis: 'beforeGst', confirmed: true }, foam: [{ id: 'f', name: 'F', depositPct: 150 }, { id: 'g', name: 'G', depositPct: 35 }] })
eq('bad deposit values fall back to defaults, good ones stay', fixed.deposit, { enabled: true, mixed: 'larger', fixedPct: 25, dueDays: 7, minAmount: 0, basis: 'beforeGst', confirmed: true })
eq('bad foam deposit percent dropped, good one kept', fixed.foam.map((f) => f.depositPct), [undefined, 35])
eq('no deposit saved: nothing in the clean-up', X.fixExtras({}).deposit, undefined)
eq('depositOf fills the defaults', X.depositOf({ deposit: { ...X.DEFAULT_DEPOSIT, dueDays: 3 } }).dueDays, 3)

console.log(failed ? `\n${failed} FAILED` : '\nAll deposit unit checks passed')
process.exit(failed ? 1 : 0)
