/**
 * Static checks on journey-data.js, before a browser is involved.
 *
 * - every message referenced by a stage exists
 * - every message is referenced by at least one stage
 * - every merge field used has a sample value
 * - every email has subject, preheader, from, sig
 * - no em dashes, no vendor name, anywhere in the folder
 */
import fs from 'node:fs'
import vm from 'node:vm'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client-journey-onepage') + '/'
const src = fs.readFileSync(DIR + 'journey-data.js', 'utf8')
const sandbox = { window: {} }
vm.runInNewContext(src, sandbox)
const J = sandbox.window.JOURNEY

let fail = 0
const bad = (msg) => { fail += 1; console.log('FAIL  ' + msg) }
const ok = (msg) => console.log('ok    ' + msg)

/* referenced ids exist, and all ids are referenced */
const referenced = new Set()
const stages = []
for (const p of J.pipelines) for (const s of p.stages) stages.push({ p: p.id, s })
stages.push({ p: 'always-on', s: J.alwaysOn })
for (const { p, s } of stages) {
  for (const g of s.groups || []) for (const id of g.messages) {
    referenced.add(id)
    if (!J.messages[id]) bad(`${p}/${s.key} references missing message ${id}`)
  }
}
for (const id of Object.keys(J.messages)) if (!referenced.has(id)) bad(`message ${id} is never shown on any stage`)
ok(`${Object.keys(J.messages).length} messages, ${referenced.size} referenced`)

/* tokens have samples */
const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g
const samples = {
  residential: { ...J.samples.common, ...J.samples.residential },
  commercial: { ...J.samples.common, ...J.samples.commercial },
}
const usedTokens = new Set()
const missing = new Set()
const scan = (text, pid, where) => {
  for (const m of String(text || '').matchAll(TOKEN)) {
    usedTokens.add(m[1])
    if (samples[pid][m[1]] == null) missing.add(`${m[1]}  (${where}, ${pid})`)
  }
}
for (const { p, s } of stages) {
  const pid = p === 'commercial' ? 'commercial' : 'residential'
  for (const g of s.groups || []) for (const id of g.messages) {
    const m = J.messages[id]
    for (const f of ['subject', 'preheader', 'body', 'footer']) scan(m[f], pid, id)
    for (const l of m.sig || []) scan(l, pid, id)
  }
  for (const t of s.tasks || []) scan(t.title, pid, `task in ${s.key}`)
  for (const n of s.alerts || []) scan(J.alerts[n - 1].body, pid, `alert ${n}`)
}
if (missing.size) for (const m of missing) bad('no sample value for ' + m)
else ok(`${usedTokens.size} distinct merge fields, all have sample values`)

/* email completeness */
for (const [id, m] of Object.entries(J.messages)) {
  if (m.channel === 'email') {
    for (const f of ['subject', 'preheader', 'from', 'sig']) if (!m[f]) bad(`${id} has no ${f}`)
    if (m.preheader && m.preheader.length > 110) bad(`${id} preheader is ${m.preheader.length} chars, keep under 110`)
    if (m.subject && m.subject.length > 78) bad(`${id} subject is ${m.subject.length} chars`)
    if (m.type === 'MKTG' && !/unsubscribe_link/.test(m.footer || '')) bad(`${id} is marketing but has no unsubscribe`)
  }
  if (m.channel === 'sms') {
    if (m.type === 'MKTG') bad(`${id} is a marketing SMS, which the kit does not use`)
  }
  for (const f of ['trigger', 'delay', 'stops', 'type', 'reuse']) if (!m[f]) bad(`${id} has no ${f}`)
}
ok('every email has subject, preheader, from and signature; marketing emails carry an unsubscribe')

/* the client reads every note, caption and intro: nothing agency-facing in them */
const AGENCY_WORDS = /another client|other client|new client|reus(e|able)|template mechanism|sub-account|tokenis/i
const clientText = []
for (const [id, m] of Object.entries(J.messages)) if (m.note) clientText.push([id + ' note', m.note])
for (const { p, s } of stages) {
  if (s.intro) clientText.push([`${p}/${s.key} intro`, s.intro])
  for (const g of s.groups || []) if (g.caption) clientText.push([`${p}/${s.key} caption`, g.caption])
  for (const a of s.automation || []) clientText.push([`${p}/${s.key} automation`, a])
}
for (const v of J.customValues) clientText.push([`value ${v.key}`, v.note])
for (const c of J.compliance) clientText.push([`compliance ${c.title}`, c.body])
for (const [where, text] of clientText) if (AGENCY_WORDS.test(text)) bad(`agency wording where the client reads it: ${where}`)
ok('nothing agency-facing in the text the client reads (agency notes live in agencyNote)')

/* agency-only data the build sheet and the documents render */
if (!Array.isArray(J.customFields) || !J.customFields.length) bad('customFields missing')
else for (const g of J.customFields) for (const r of g.rows) if (r.length !== g.columns.length) bad(`customFields "${g.group}": a row has ${r.length} cells for ${g.columns.length} columns`)
if (!Array.isArray(J.reuseSteps) || J.reuseSteps.length < 3) bad('reuseSteps missing')
if (!Array.isArray(J.goLive) || J.goLive.length < 5) bad('goLive checklist missing')
ok(`${(J.customFields || []).length} field groups, ${(J.reuseSteps || []).length} reuse steps, ${(J.goLive || []).length} go-live checks`)

/* alerts referenced exist */
for (const { p, s } of stages) for (const n of s.alerts || []) if (!J.alerts[n - 1]) bad(`${p}/${s.key} references alert ${n}`)
ok(`${J.alerts.length} alerts`)

/* house style across the folder */
for (const f of fs.readdirSync(DIR)) {
  if (!/\.(js|css|html)$/.test(f)) continue
  const t = fs.readFileSync(DIR + f, 'utf8')
  const dashes = (t.match(/\u2014/g) || []).length
  const vendor = (t.match(/GoHighLevel|\bGHL\b|_GHL_/g) || []).length
  const agile = (t.match(/Agile|Corey/g) || []).length
  if (dashes) bad(`${f}: ${dashes} em dashes`)
  if (vendor) bad(`${f}: ${vendor} vendor mentions`)
  if (agile) bad(`${f}: ${agile} leftovers from the previous client`)
}
ok('no em dashes, no vendor name, nothing left from the previous client')

/* counts for the report */
let tasks = 0
for (const { s } of stages) tasks += (s.tasks || []).length
const emails = Object.values(J.messages).filter((m) => m.channel === 'email').length
console.log(`\nstages ${stages.length - 3} (plus 2 Won markers and Always on), messages ${Object.keys(J.messages).length} (${emails} email, ${Object.keys(J.messages).length - emails} sms), tasks ${tasks}, alerts ${J.alerts.length}`)
console.log(fail ? `\n${fail} FAILED` : '\nALL CHECKS PASSED')
process.exit(fail ? 1 : 0)
