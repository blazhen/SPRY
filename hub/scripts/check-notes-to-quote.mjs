// Unit tests for quote-from-inspection-notes: the reader (src/lib/notesToQuoteRead.ts) and the pricing and
// interface (src/lib/notesToQuote.ts). 50+ realistic spray foam notes. No browser, no server, no network.
// Run: node scripts/check-notes-to-quote.mjs
import { build } from 'esbuild'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-nq-'))
const load = async (rel, name) => {
  const out = path.join(dir, name + '.mjs')
  await build({ entryPoints: [path.join(ROOT, rel)], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' })
  return import(pathToFileURL(out).href)
}
const R = await load('src/lib/notesToQuoteRead.ts', 'read')
const D = await load('src/lib/notesToQuote.ts', 'draft')
const E = await load('src/lib/extras.ts', 'extras')

let failed = 0
let passed = 0
const ok = (name, cond, extra = '') => {
  if (cond) passed++
  else failed++
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' :: ' + extra}`)
}
const close = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.011

// ---- Reader: realistic notes. Each case lists only what it must find. ----
// items: [part, m2, extras]  extras: { t: thickness, f: foam, r: rvalue, places, ex: left out, ap: approx }
export const CASES = [
  ['simple roof, dims', 'Roof 12 x 8 closed cell 100mm', { items: [['roof', 96, { t: 100, f: 'closed' }]] }],
  ['roof and walls, one line', 'Roof 12 x 8 closed cell 100mm, walls 40 m2 open cell 90mm', { items: [['roof', 96, { t: 100, f: 'closed' }], ['walls', 40, { t: 90, f: 'open' }]] }],
  ['dictation, no commas', 'roof twelve by eight closed cell one hundred mil walls forty square metres open cell ninety mil', { items: [['roof', 96, { t: 100, f: 'closed' }], ['walls', 40, { t: 90, f: 'open' }]] }],
  ['cc and oc short forms', 'walls 35sqm OC 90mm\nroof 60sqm CC 75mm', { items: [['walls', 35, { f: 'open', t: 90 }], ['roof', 60, { f: 'closed', t: 75 }]] }],
  ['m on both numbers', 'Skillion roof 12m x 6.5m, closed cell, 100 mm', { items: [['roof', 78, { f: 'closed', t: 100 }]] }],
  ['half pound and 2lb', 'walls 50 m2 half pound 90mm. roof 40 m2 2lb 75mm', { items: [['walls', 50, { f: 'open' }], ['roof', 40, { f: 'closed' }]] }],
  ['area first', '96 m2 roof, closed cell, 100mm', { items: [['roof', 96, { f: 'closed', t: 100 }]] }],
  ['approx word', 'approx 60 sqm of walls, open cell', { items: [['walls', 60, { ap: true, f: 'open' }]] }],
  ['around and ish', 'roof around 85 m2, ceiling 40ish m2', { items: [['roof', 85, { ap: true }], ['ceiling', 40, { ap: true }]] }],
  ['rooms add up on one ceiling', 'ceiling: bed 1 3x4, bed 2 3.5x4, living 6x5', { items: [['ceiling', 56, { places: ['bed 1', 'bed 2', 'living'] }]] }],
  ['heading on its own line', 'Ceiling\nbed 1 3 x 4\nbed 2 4 x 4', { items: [['ceiling', 28]] }],
  ['same part twice with and', 'roof 12 x 8 and 10 x 6, closed cell 100mm', { items: [['roof', 156, { f: 'closed', t: 100 }]] }],
  ['garage stays its own line', 'house roof 12 x 8, garage roof 6 x 6', { items: [['roof', 96], ['roof', 36, { places: ['garage'] }]] }],
  ['not the garage', 'roof 12 x 8, garage roof 6 x 6, not the garage', { items: [['roof', 96], ['roof', 36, { ex: true }]], exclusions: 1 }],
  ['excluding the shed', 'walls 40 m2 excluding the shed. shed walls 18 m2', { items: [['walls', 40], ['walls', 18, { ex: true }]] }],
  ['garage is not included', 'garage walls 24 m2, house walls 60 m2. garage is not included', { items: [['walls', 24, { ex: true }], ['walls', 60]] }],
  ['no ceiling', 'walls 40 m2, ceiling 30 m2. no ceiling', { items: [['walls', 40], ['ceiling', 30, { ex: true }]] }],
  ['two storey', '2 storey house, walls 120 m2 closed cell 75mm', { storeys: 2, items: [['walls', 120, { f: 'closed', t: 75 }]] }],
  ['double storey words', 'double storey, roof 90 m2', { storeys: 2, items: [['roof', 90]] }],
  ['single level', 'single storey, ceiling 110 m2', { storeys: 1, items: [['ceiling', 110]] }],
  ['access remark', 'roof 60 m2, tight access, no power on site', { access: 2, items: [['roof', 60]] }],
  ['crawl space sub-floor', 'subfloor 45 m2, crawl space, closed cell 50mm', { access: 1, items: [['subfloor', 45, { f: 'closed', t: 50 }]] }],
  ['underfloor word', 'underfloor 30sqm open cell', { items: [['subfloor', 30, { f: 'open' }]] }],
  ['remove batts with size', 'ceiling 80 m2 top up. remove old batts 80 m2', { items: [['ceiling', 80]], extras: [['removeBatts', 80]] }],
  ['remove batts no size', 'roof 50 m2. old batts to come out', { items: [['roof', 50]], extras: [['removeBatts', null]] }],
  ['size before batts', '60 m2 of old batts to remove, ceiling 60 m2', { items: [['ceiling', 60]], extras: [['removeBatts', 60]] }],
  ['skip bin and masking', 'walls 40 m2. need a skip bin and mask the windows', { items: [['walls', 40]], extras: [['skipBin', null], ['masking', null]] }],
  ['fire rated coating', 'roof 70 m2 closed cell 100mm, fire rated coating 70 m2', { items: [['roof', 70]], extras: [['fireCoating', 70]] }],
  ['inches', 'walls 40 m2 closed cell 4 inch', { items: [['walls', 40, { t: 102 }]] }],
  ['centimetres', 'roof 50 m2, 10cm closed cell', { items: [['roof', 50, { t: 100, f: 'closed' }]] }],
  ['r value only', 'roof 70 m2 closed cell R3.5', { items: [['roof', 70, { r: 3.5, f: 'closed' }]] }],
  ['r value of', 'ceiling 90 m2, r value of 4.1', { items: [['ceiling', 90, { r: 4.1 }]] }],
  ['sq ft', 'sub floor 800 sq ft', { items: [['subfloor', 74.32]] }],
  ['wall long by high', 'wall 12m long by 2.4m high open cell', { items: [['walls', 28.8, { f: 'open' }]] }],
  ['three numbers on walls', 'room 4 x 5 x 2.4 walls open cell 90mm', { items: [['walls', 43.2, { f: 'open', t: 90 }]] }],
  ['three numbers on ceiling', 'ceiling 4 x 5 x 2.4', { items: [['ceiling', 20]] }],
  ['both closed cell', 'walls 40 m2 and roof 60 m2, both closed cell 100mm', { items: [['walls', 40, { f: 'closed', t: 100 }], ['roof', 60, { f: 'closed', t: 100 }]] }],
  ['everything throughout', 'roof 50 m2, walls 30 m2. closed cell 100mm throughout', { items: [['roof', 50, { f: 'closed', t: 100 }], ['walls', 30, { f: 'closed', t: 100 }]] }],
  ['attributes for the line before', 'Roof 12 x 8.\nClosed cell 100mm.', { items: [['roof', 96, { f: 'closed', t: 100 }]] }],
  ['thickness range', 'roof 40 m2, 100 to 150mm closed cell', { items: [['roof', 40, { t: 150, f: 'closed' }]] }],
  ['part with no size', 'walls need doing, roof 40 m2', { items: [['walls', null], ['roof', 40]] }],
  ['bare number after the part', 'roof 60', { items: [['roof', 60]] }],
  ['total is not a line', 'roof 50 m2, walls 30 m2, 80 m2 in total', { items: [['roof', 50], ['walls', 30]], totals: 1 }],
  ['timber sizes are not areas', 'walls 40 m2, studs are 90 x 45 timber', { items: [['walls', 40]] }],
  ['gable ends are walls', 'gable ends 18 m2 closed cell', { items: [['walls', 18, { f: 'closed' }]] }],
  ['filler words', 'um so the roof is like 12 by 8 you know closed cell 100 mil', { items: [['roof', 96, { f: 'closed', t: 100 }]] }],
  ['commas in big numbers', 'roof 1,200 sqm closed cell', { items: [['roof', 1200, { f: 'closed' }]] }],
  ['decimal wording', 'walls twelve point five by two point four', { items: [['walls', 30]] }],
  ['approx. with a full stop', 'Approx. 40 m2 walls. Open cell.', { items: [['walls', 40, { ap: true, f: 'open' }]] }],
  ['extra access hours', 'roof 60 m2, hard to get to, extra 2 hours for access', { items: [['roof', 60]], extras: [['accessTime', 2]], access: 1 }],
  ['edge sealing', 'subfloor 40 m2 and edge sealing', { items: [['subfloor', 40]], extras: [['edgeSealing', null]] }],
  ['nothing useful', 'Customer is friendly and has two dogs', { items: [], leftovers: 0, access: 1 }],
  ['chatter only', 'Customer is friendly and wants it done by Friday', { items: [], leftovers: 1 }],
  ['empty text', '   ', { items: [], leftovers: 0 }],
  ['new lines and bullets', '- roof 12 x 8 closed cell\n- walls 40 m2 open cell', { items: [['roof', 96, { f: 'closed' }], ['walls', 40, { f: 'open' }]] }],
  ['ground floor is a level, not the sub-floor', 'Ground floor walls cavity 55 m2 half pound 90 mil', { items: [['walls', 55, { f: 'open', t: 90, places: ['downstairs'] }]] }],
  ['long real note', 'Inspected today. Double storey brick veneer. Roof is skillion approx 14.5 x 7.2 sheeting, wants 100mm closed cell. Garage not part of the job. Access is fine, ute can get up the drive. Remove existing batts from ceiling about 70 sqm and a skip bin on site.', { storeys: 2, items: [['roof', 104.4, { ap: true, f: 'closed', t: 100 }]], extras: [['removeBatts', 70], ['skipBin', null]], exclusions: 1 }],
  ['upstairs and downstairs ceilings', 'upstairs ceiling 55 m2, downstairs ceiling 60 m2', { items: [['ceiling', 55, { places: ['upstairs'] }], ['ceiling', 60, { places: ['downstairs'] }]] }],
]

for (const [name, notes, want] of CASES) {
  const r = R.readNotes(notes)
  const errs = []
  if (want.items) {
    if (r.items.length !== want.items.length) errs.push(`items ${r.items.length} want ${want.items.length}: ${JSON.stringify(r.items.map((i) => [i.part, i.areaM2]))}`)
    want.items.forEach(([part, m2, x = {}], k) => {
      const i = r.items[k]
      if (!i) return
      if (i.part !== part) errs.push(`#${k} part ${i.part} want ${part}`)
      if (m2 === null ? i.areaM2 !== null : !close(i.areaM2, m2)) errs.push(`#${k} area ${i.areaM2} want ${m2}`)
      if (x.t !== undefined && Math.abs((i.thicknessMm ?? -1) - x.t) > 1) errs.push(`#${k} thickness ${i.thicknessMm} want ${x.t}`)
      if (x.f !== undefined && i.foam !== x.f) errs.push(`#${k} foam ${i.foam} want ${x.f}`)
      if (x.r !== undefined && i.rValue !== x.r) errs.push(`#${k} r ${i.rValue} want ${x.r}`)
      if (x.ap && !i.approx) errs.push(`#${k} should be approx`)
      if (x.ex && !i.excluded) errs.push(`#${k} should be left out`)
      if (x.places) for (const p of x.places) if (!i.places.includes(p)) errs.push(`#${k} places ${i.places} want ${p}`)
    })
  }
  if (want.extras) {
    if (r.extras.length !== want.extras.length) errs.push(`extras ${JSON.stringify(r.extras.map((e) => [e.kind, e.qty]))}`)
    want.extras.forEach(([kind, qty], k) => {
      const e = r.extras[k]
      if (e && (e.kind !== kind || e.qty !== qty)) errs.push(`extra #${k} ${e.kind}/${e.qty} want ${kind}/${qty}`)
    })
  }
  if (want.storeys !== undefined && r.storeys?.count !== want.storeys) errs.push(`storeys ${r.storeys?.count} want ${want.storeys}`)
  if (want.access !== undefined && r.access.length !== want.access) errs.push(`access ${r.access.length} want ${want.access}`)
  if (want.exclusions !== undefined && r.exclusions.length !== want.exclusions) errs.push(`exclusions ${r.exclusions.length} want ${want.exclusions}`)
  if (want.totals !== undefined && r.totals.length !== want.totals) errs.push(`totals ${r.totals.length} want ${want.totals}`)
  if (want.leftovers !== undefined && r.leftovers.length !== want.leftovers) errs.push(`leftovers ${JSON.stringify(r.leftovers)} want ${want.leftovers}`)
  ok(`reader: ${name}`, errs.length === 0, errs.join('; '))
}
ok(`reader: at least 40 realistic examples (${CASES.length})`, CASES.length >= 40)

// ---- Reader: it never crashes and never makes silly numbers ----
const nasty = ['', '\n\n', 'x x x', '12 x', 'by by by', '999999 m2 roof', '0 m2 walls', '-5 m2', 'roof '.repeat(500), 'R999', '1e9 m2', '\u0000\u0001', 'roof 12 x 8 x', '12 x 8 x 6 x 4']
for (const t of nasty) {
  let bad = ''
  try {
    const r = R.readNotes(t)
    for (const i of r.items) if (i.areaM2 !== null && !(i.areaM2 > 0 && i.areaM2 < 1e6)) bad = `area ${i.areaM2}`
  } catch (e) {
    bad = String(e)
  }
  ok(`reader: odd input ${JSON.stringify(t.slice(0, 20))} does not crash`, bad === '', bad)
}

// ---- Pricing ----
const price = (id, section, name, unit, unitPrice, description = '') => ({ id, section, name, description, unit, unitPrice, productType: 'Spray foam', placeholder: true })
const PRICES = [
  price('p1', 'Walls', 'Wall insulation, open cell', 'm²', 38, 'Sprayed between wall framing.'),
  price('p2', 'Roof', 'Roof insulation, closed cell', 'm²', 52, 'Sprayed to the underside of the roof sheeting.'),
  price('p4', 'Ceiling', 'Ceiling cavity top-up', 'm²', 31, 'Added over existing insulation.'),
  price('p5', 'Preparation', 'Removal of old batts', 'm²', 9),
  price('p6', 'Preparation', 'Site setup and masking', 'each', 450),
  price('p7', 'Walls', 'Wall insulation, closed cell', 'm²', 55),
  price('p8', 'Roof', 'Roof insulation, open cell', 'm²', 41),
  price('p9', 'Ceiling', 'Ceiling insulation, new build', 'm²', 36),
  price('p11', 'Preparation', 'Skip bin and waste removal', 'each', 320),
  price('p12', 'Preparation', 'Extra access time', 'hour', 95),
  price('p3', 'Sub-floor', 'Sub-floor insulation', 'm²', 44),
  { id: 'pi1', section: 'Walls', name: 'Wall cavity fill', description: '', unit: 'm²', unitPrice: 46, productType: 'InjectaCore', placeholder: true },
]
const ctx = { productType: 'Spray foam', foam: E.DEFAULT_FOAM, priceItems: PRICES }
const draft = (t, c = ctx) => D.priceRead(R.readNotes(t), c)

{
  const d = draft('Roof 12 x 8 closed cell 100mm, walls 40 m2 open cell 90mm')
  const [roof, walls] = d.lines
  ok('pricing: roof takes the closed cell roof item and its price', roof.priceItemId === 'p2' && roof.unitPrice === 52 && close(roof.qty, 96))
  ok('pricing: walls take the open cell wall item', walls.priceItemId === 'p1' && walls.unitPrice === 38)
  ok('pricing: lines are ticked when sized and priced', roof.checked && walls.checked)
  ok('pricing: foam calculator sets worked out from Glenn values', close(roof.calc.sets, E.foamCalc({ areaM2: 96, thicknessMm: 100, wastePct: 8 }, E.DEFAULT_FOAM[1]).sets))
  ok('pricing: placeholder foam values are flagged', roof.flags.includes('placeholderFoam'))
  ok('pricing: the source phrase is kept', roof.phrase.includes('12 x 8'))
  ok('pricing: thickness goes in the description', roof.description.includes('100 mm'))
  ok('pricing: subtotal is qty x price of ticked lines', close(D.draftSubtotal(d.lines), 96 * 52 + 40 * 38))
  ok('pricing: no questions when the notes are complete', d.questions.length === 0, JSON.stringify(d.questions))
}
{
  const d = draft('roof 60 m2')
  ok('pricing: no foam named gives a question and no price', d.lines[0].unitPrice === null && d.questions.some((q) => /open cell or closed/.test(q.text)) && !d.lines[0].checked)
  ok('pricing: no foam and no thickness flagged', d.lines[0].flags.includes('noFoam') && d.lines[0].flags.includes('noThickness'))
}
{
  const d = draft('ceiling 50 m2 new build')
  ok('pricing: "new build" picks the new build ceiling item', d.lines[0].priceItemId === 'p9')
  const d2 = draft('ceiling 50 m2 top up over existing batts')
  ok('pricing: "top up" picks the top-up ceiling item', d2.lines[0].priceItemId === 'p4')
}
{
  const d = draft('walls need doing')
  ok('pricing: a part with no size is unticked and asks for the size', d.lines[0].qty === null && !d.lines[0].checked && d.questions.some((q) => /no size/.test(q.text)))
}
{
  const d = draft('12 x 8')
  ok('pricing: a size with no part asks what it is for', d.lines[0].flags.includes('unknownPart') && !d.lines[0].checked && d.questions.some((q) => /What is/.test(q.text)))
}
{
  const d = draft('roof 12 x 8 closed cell 100mm. garage roof 6 x 6 closed cell 100mm, not the garage')
  ok('pricing: left-out items get no line but are listed', d.lines.length === 1 && d.leftOut.length === 1 && /garage/.test(d.leftOut[0].reason), JSON.stringify(d.lines.map((l) => l.name)))
}
{
  const d = draft('ceiling 80 m2 new build, remove old batts 80 m2, skip bin, mask the windows')
  const by = (n) => d.lines.find((l) => l.name === n)
  ok('pricing: removal uses its price item and size', by('Removal of old batts')?.qty === 80 && by('Removal of old batts')?.unitPrice === 9)
  ok('pricing: skip bin and masking are one each', by('Skip bin and waste removal')?.qty === 1 && by('Site setup and masking')?.qty === 1)
}
{
  const d = draft('roof 60 m2 closed cell 100mm, tight access, 2 storey')
  ok('pricing: 2 storey and access become questions and add no price', d.questions.some((q) => /scaffold/.test(q.text)) && d.questions.some((q) => /Access/.test(q.text)) && d.lines.length === 1)
}
{
  const d = draft('roof 50 m2, walls 30 m2, 100 m2 in total')
  ok('pricing: a total that does not match the lines is a question', d.questions.some((q) => /in total/.test(q.text)))
}
{
  const d = draft('roof 12 x 8 closed cell 100mm', { ...ctx, priceItems: PRICES.filter((p) => p.id !== 'p2' && p.id !== 'p8') })
  ok('pricing: with no price list item the calculator price is used and flagged', d.lines[0].flags.includes('priceFromCalculator') && close(d.lines[0].unitPrice, 1200 * 0.1))
}
{
  const d = draft('roof 12 x 8 closed cell 100mm', { ...ctx, foam: E.DEFAULT_FOAM.map((f) => ({ ...f, placeholder: false })) })
  ok('pricing: real (not placeholder) foam values clear the flag', !d.lines[0].flags.includes('placeholderFoam'))
}
{
  const read = R.readNotes('roof 12 x 8 closed cell 100mm')
  const id = 'li-' + read.items[0].id
  const d = D.priceRead(read, ctx, { price: { [id]: 60 }, checked: { [id]: false } })
  ok('pricing: typed price and tick survive a re-price', d.lines[0].unitPrice === 60 && d.lines[0].checked === false)
}
{
  const d = draft('walls 40 m2 closed cell 100mm', { ...ctx, productType: 'InjectaCore', priceItems: PRICES })
  ok('pricing: InjectaCore job uses InjectaCore items and asks no foam question', d.lines[0].priceItemId === 'pi1' && !d.questions.some((q) => /open cell or closed/.test(q.text)))
}
{
  const d = draft('roof 50 m2 closed cell R3.5')
  ok('pricing: R-value without thickness asks for mm', d.questions.some((q) => /R3\.5/.test(q.text)))
}

// ---- The interface: rules now, model later, fallback when the model fails ----
{
  const d = await D.draftFromNotes('roof 12 x 8 closed cell 100mm', ctx)
  ok('interface: rules reader by default', d.engine === 'rules' && d.lines.length === 1 && !d.fallbackReason)
}
{
  const d = await D.draftFromNotes('roof 12 x 8 closed cell 100mm', ctx, { useModel: true })
  ok('interface: the model stub is off, so the rules run and say why', d.engine === 'rules' && /not switched on/.test(d.fallbackReason ?? '') && d.lines.length === 1)
}
{
  const bad = async () => {
    throw new Error('boom')
  }
  const d = await D.draftFromNotes('walls 40 m2 open cell', ctx, { useModel: true, model: bad })
  ok('interface: a failing model falls back to rules', d.engine === 'rules' && d.fallbackReason === 'boom' && d.lines.length === 1)
}
{
  const slow = () => new Promise(() => {})
  const d = await D.draftFromNotes('walls 40 m2 open cell', ctx, { useModel: true, model: slow, timeoutMs: 30 })
  ok('interface: a model that never answers times out and falls back', d.engine === 'rules' && /too long/.test(d.fallbackReason ?? ''))
}
{
  const fake = async () => ({ items: [{ id: 'm1', part: 'roof', places: [], areaM2: 50, pieces: [], phrase: 'roof 50', thicknessMm: 100, foam: 'closed' }, { id: 'm2', part: 'walls', places: [], areaM2: -4, pieces: [], phrase: 'bad' }], extras: [], access: [], exclusions: [], totals: [], leftovers: [], unusedNumbers: [] })
  const d = await D.draftFromNotes('anything', ctx, { useModel: true, model: fake })
  ok('interface: a model answer is used, priced by the same code, and bad rows dropped', d.engine === 'model' && d.lines.length === 1 && d.lines[0].unitPrice === 52 && d.lines[0].engine === 'model', JSON.stringify(d.lines.map((l) => [l.name, l.unitPrice])))
}
{
  const ctxIn = D.readerContextOf(ctx)
  ok('interface: what a model could be told has names only, no prices', JSON.stringify(ctxIn).indexOf('52') === -1 && ctxIn.productNames.includes('Roof insulation, closed cell'))
}
{
  const d = await D.draftFromNotes('Customer is friendly and wants it done by Friday', ctx)
  ok('empty state: nothing found gives empty, the leftover text, no lines', d.empty && d.lines.length === 0 && d.leftovers.length === 1)
}

// ---- The server: the agent reply is checked, the call is shaped right, and every failure is a clean non-200 ----
const S = await load('server/handlers/notes-to-quote.ts', 'server')
const AG = await load('server/lib/notes-agent.ts', 'agent')
{
  const red = S.redactNotes('Call Tom on 0412 345 678 or tom@example.com at 12 Smith Street. Roof 12 x 8, walls 40 m2.')
  ok('server: phone, email and street address are cut out before text leaves', !/0412|tom@|Smith/.test(red) && /\[phone\]/.test(red) && /\[email\]/.test(red) && /\[address\]/.test(red), red)
  ok('server: the measurements survive the clean-up', /12 x 8/.test(red) && /40 m2/.test(red), red)
  const src = fs.readFileSync(path.join(ROOT, 'server/handlers/notes-to-quote.ts'), 'utf8').replace(/\/\/.*$/gm, '')
  ok('server: no AI key and no AI package: the call goes through the platform integration only', !/anthropic|api[_-]?key|openai/i.test(src) && /crmFetch\(/.test(src))
}
{
  const good = '```json\n{"items":[{"part":"roof","places":["main"],"areaM2":96,"pieces":[],"thicknessMm":100,"foam":"closed","phrase":"roof 12 x 8"},{"part":"walls","areaM2":-5,"phrase":"bad"},{"part":"attic","areaM2":10},{"part":"walls","areaM2":40,"foam":"purple","rValue":500,"phrase":"walls 40"}],"extras":[{"kind":"skipBin","qty":1,"phrase":"skip"},{"kind":"magic","qty":2}],"storeys":{"count":2,"phrase":"2 storey"},"exclusions":[{"text":"garage","phrase":"not the garage"}],"totals":[{"m2":140,"phrase":"140 total"}],"price":999}\n```'
  const r = AG.readFromAgentReply('Here you go: ' + good)
  ok('agent reply: JSON inside a code fence and a sentence is found', !!r)
  ok('agent reply: good items kept, silly size dropped, unknown part dropped', r && r.items.length === 2 && r.items[0].part === 'roof' && r.items[0].areaM2 === 96 && r.items[0].foam === 'closed' && r.items[1].areaM2 === 40, JSON.stringify(r?.items))
  ok('agent reply: a bad foam word and a silly R-value are dropped', r && r.items[1].foam === undefined && r.items[1].rValue === undefined)
  ok('agent reply: unknown extra dropped, known extra kept, ids added', r && r.extras.length === 1 && r.extras[0].kind === 'skipBin' && r.extras[0].id === 'x1' && r.items[0].id === 'a1')
  ok('agent reply: storeys, exclusions and totals come through', r && r.storeys?.count === 2 && r.exclusions[0].text === 'garage' && r.totals[0].m2 === 140)
  ok('agent reply: a price in the answer is never carried', !JSON.stringify(r).includes('999') && !('price' in r))
  ok('agent reply: text with no JSON gives nothing', AG.readFromAgentReply('Sorry, I cannot help with that.') === null)
  ok('agent reply: broken JSON gives nothing', AG.readFromAgentReply('{"items": [') === null)
  ok('agent reply: JSON with no items and no extras gives nothing', AG.readFromAgentReply('{"items":[],"extras":[]}') === null)
  ok('agent reply: the Hub prices an agent answer like any other (96 m2 closed 100mm)', await (async () => {
    const reader = async () => ({ ...r, leftovers: [], unusedNumbers: [] })
    const d = await D.draftFromNotes('x', ctx, { useModel: true, model: reader })
    return d.engine === 'model' && d.lines.length >= 1 && d.lines[0].unitPrice === 52
  })())
  const msg = JSON.parse(AG.buildAgentMessage('roof 12 x 8', { productType: 'Spray foam', foamNames: ['Open cell'], productNames: ['Roof insulation, closed cell'] }))
  ok('agent message: notes and names only, no price field', msg.notes === 'roof 12 x 8' && msg.foamNames[0] === 'Open cell' && !/price|cost|\$/i.test(JSON.stringify(msg)))
}
{
  // The handler with a pretend platform. Nothing leaves this machine.
  const saved = { ...process.env }
  const realFetch = globalThis.fetch
  const calls = []
  let reply = { ok: true, status: 200, body: { success: true, finalText: '{"items":[{"part":"roof","areaM2":50,"thicknessMm":100,"foam":"closed","phrase":"roof 50"}]}' } }
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    if (reply.hang) return new Promise((_, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } })
  }
  const post = (body) => S.POST(new Request('http://hub.test/api/notes-to-quote', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://hub.test' }, body: JSON.stringify(body) }))
  const body = { notes: 'Call 0412 345 678. Roof 50 m2 closed cell 100mm', productType: 'Spray foam', foamNames: [], productNames: [] }
  Object.assign(process.env, { SPRY_ALLOW_OPEN: '1', SPRY_CRM_TOKEN: 'TEST-TOKEN', SPRY_CRM_API_BASE: 'http://platform.test', SPRY_CRM_LOCATION_ID: 'LOC123', NODE_ENV: 'test' })
  delete process.env.SPRY_IFRAME_SECRET
  try {
    delete process.env.SPRY_NOTES_AGENT_ID
    let res = await post(body)
    ok('handler: agent not set up answers 501 and calls nothing', res.status === 501 && calls.length === 0)

    process.env.SPRY_NOTES_AGENT_ID = 'agent-123456'
    res = await post(body)
    const j = await res.json()
    ok('handler: with an agent set, 200 and the facts', res.status === 200 && j.read?.items?.[0]?.areaM2 === 50, JSON.stringify(j))
    const c = calls[0]
    const sent = JSON.parse(c.init.body)
    ok('handler: calls the managed agent execute route with Version v3, the location and a JSON message', c.url === 'http://platform.test/agent-studio/managed-agents/agent-123456/execute' && c.init.headers.Version === 'v3' && sent.locationId === 'LOC123' && typeof sent.message === 'string')
    ok('handler: sends a fresh Idempotency-Key each call', typeof c.init.headers['Idempotency-Key'] === 'string' && c.init.headers['Idempotency-Key'].length > 8)
    ok('handler: the phone number never reaches the agent', !/0412/.test(sent.message) && /\[phone\]/.test(sent.message))
    ok('handler: no session or contact id is sent', !('sessionId' in sent) && !('contactId' in sent) && !('extraVariables' in sent))

    reply = { ok: false, status: 500, body: { error: 'x' } }
    res = await post(body)
    ok('handler: platform error gives 502', res.status === 502)
    reply = { ok: true, status: 200, body: { success: true, finalText: 'I am sorry' } }
    res = await post(body)
    ok('handler: unusable answer gives 502', res.status === 502)
    res = await post({ notes: '   ' })
    ok('handler: empty notes give 400', res.status === 400)
    process.env.SPRY_NOTES_AGENT_ID = '../x'
    res = await post(body)
    ok('handler: a strange agent id is refused (501)', res.status === 501)
  } finally {
    globalThis.fetch = realFetch
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
    Object.assign(process.env, saved)
  }
}
{
  // The browser reader.
  const okPost = async () => ({ read: { items: [{ id: 'a1', part: 'roof', places: [], areaM2: 50, pieces: [], phrase: 'r', thicknessMm: 100, foam: 'closed' }] } })
  const d = await D.draftFromNotes('x', ctx, { useModel: true, model: D.makeServerReader(okPost) })
  ok('browser reader: server facts are used and priced, missing lists are filled in', d.engine === 'model' && d.lines.length === 1 && !d.fallbackReason)
  const off = async () => {
    throw Object.assign(new Error('x'), { status: 501 })
  }
  const d2 = await D.draftFromNotes('roof 12 x 8 closed cell 100mm', ctx, { useModel: true, model: D.makeServerReader(off) })
  ok('browser reader: a 501 falls back to the rules with the quiet "not switched on" reason', d2.engine === 'rules' && d2.fallbackReason === D.NOT_ON_MESSAGE && d2.lines.length === 1)
  const down = async () => {
    throw new Error('network')
  }
  const d3 = await D.draftFromNotes('roof 12 x 8 closed cell 100mm', ctx, { useModel: true, model: D.makeServerReader(down) })
  ok('browser reader: a network failure falls back to the rules with a real reason', d3.engine === 'rules' && /did not answer/.test(d3.fallbackReason ?? '') && d3.lines.length === 1)
  const junk = async () => ({ nothing: true })
  const d4 = await D.draftFromNotes('roof 12 x 8 closed cell 100mm', ctx, { useModel: true, model: D.makeServerReader(junk) })
  ok('browser reader: a junk answer falls back to the rules', d4.engine === 'rules' && d4.lines.length === 1)
}

// ---- The customer page can never carry the notes phrase: the public quote lists line fields one by one ----
{
  const src = fs.readFileSync(path.join(ROOT, 'server/lib/public-quote.ts'), 'utf8')
  ok('privacy: the public quote never names fromNotes and builds each line field by field', !/fromNotes/.test(src) && /lines: arr\(q\.lines\)\.map\(\(l\) => \(\{/.test(src) && !/lines:[^\n]*\.\.\.l\b/.test(src))
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'}: ${passed} PASS, ${failed} FAIL`)
process.exit(failed === 0 ? 0 : 1)
