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

/* workflows: ids unique, every send is a real message, every alert exists,
   and every automated message is sent by at least one workflow */
if (!Array.isArray(J.workflows) || !J.workflows.length) bad('workflows missing')
else {
  const seenIds = new Set()
  const sent = new Set()
  const walk = (steps, wid) => {
    for (const st of steps) {
      if (st.t === 'send') { sent.add(st.id); if (!J.messages[st.id]) bad(`${wid} sends unknown message ${st.id}`) }
      if (st.t === 'alert' && !J.alerts[st.n - 1]) bad(`${wid} references alert ${st.n}`)
      if (st.t === 'if') { walk(st.then || [], wid); walk(st.else || [], wid) }
    }
  }
  for (const w of J.workflows) {
    if (seenIds.has(w.id)) bad(`duplicate workflow id ${w.id}`)
    seenIds.add(w.id)
    for (const f of ['name', 'board', 'trigger', 'steps', 'stops']) if (!w[f]) bad(`${w.id} has no ${f}`)
    walk(w.steps || [], w.id)
  }
  const unsent = Object.keys(J.messages).filter((id) => !sent.has(id) && !J.messages[id].manual)
  if (unsent.length) bad(`no workflow sends: ${unsent.join(', ')}`)
  ok(`${J.workflows.length} workflows, every automated message is sent by one`)

  /* every workflow is filed, and every folder has something in it */
  if (!Array.isArray(J.folders) || !J.folders.length) bad('folders missing')
  else {
    const filed = new Map()
    for (const f of J.folders) {
      if (!/^\d{2}$/.test(f.n)) bad(`folder ${f.n} is not two digits`)
      if (!f.ids.length) bad(`folder ${f.n} ${f.name} is empty`)
      if (!f.why) bad(`folder ${f.n} has no note saying what belongs in it`)
      for (const id of f.ids) {
        if (filed.has(id)) bad(`${id} is in folder ${filed.get(id)} and ${f.n}`)
        filed.set(id, f.n)
        if (!J.workflows.some((w) => w.id === id)) bad(`folder ${f.n} lists unknown ${id}`)
      }
    }
    for (const w of J.workflows) {
      if (!w.folder) bad(`${w.id} has no folder`)
      else if (filed.get(w.id) !== w.folder) bad(`${w.id} says folder ${w.folder}, filed under ${filed.get(w.id)}`)
    }
    const nums = J.folders.map((f) => f.n)
    if (nums.join(',') !== [...nums].sort().join(',')) bad('folders are not in number order')
    ok(`${J.folders.length} folders, all ${J.workflows.length} workflows filed exactly once`)
  }
}

/* every task and notification carries a title and a description, because both
   are fields that have to be filled in when the thing is built */
{
  let n = 0
  const bad2 = []
  const checkTask = (t, where) => {
    n += 1
    if (!t.title) bad2.push(`${where}: task with no title`)
    if (!t.desc || t.desc.length < 40) bad2.push(`${where}: "${t.title}" has no usable description`)
  }
  for (const { p, s } of stages) for (const t of s.tasks || []) checkTask(t, `${p}/${s.key}`)
  const walkTasks = (steps, id) => {
    for (const st of steps) {
      if (st.t === 'task') checkTask(st, id)
      if (st.t === 'if') { walkTasks(st.then || [], id); walkTasks(st.else || [], id) }
    }
  }
  for (const w of J.workflows || []) walkTasks(w.steps || [], w.id)
  for (const a of J.alerts) {
    if (!a.name) bad2.push(`alert ${a.n} has no title`)
    if (!a.desc || a.desc.length < 40) bad2.push(`alert ${a.n} has no usable description`)
    if (!a.body) bad2.push(`alert ${a.n} has no message text`)
  }
  if (bad2.length) for (const m of bad2) bad(m)
  else ok(`${n} tasks and ${J.alerts.length} notifications all carry a title and a description`)
}

/* the client's guide: every stage has a "you do" list, and the guide text is agency-free */
for (const { p, s } of stages) if (!Array.isArray(s.clientDo) || !s.clientDo.length) bad(`${p}/${s.key} has no clientDo list`)
if (!J.guide || !J.guide.principle || !J.guide.howTo || !J.guide.alertActions) bad('guide content missing')
else {
  for (const a of J.alerts) if (!J.guide.alertActions[a.n]) bad(`guide has no action for alert ${a.n}`)
  const guideText = []
  for (const { p, s } of stages) for (const d of s.clientDo || []) guideText.push([`${p}/${s.key} clientDo`, d])
  guideText.push(['principle', J.guide.principle.body])
  for (const r of J.guide.routine) guideText.push(['routine', r.what])
  for (const h of J.guide.howTo) guideText.push(['howTo ' + h.title, h.body])
  for (const s of J.guide.never) guideText.push(['never', s])
  for (const r of J.guide.ifNothing) guideText.push(['ifNothing', r.then])
  for (const s of J.guide.ask) guideText.push(['ask', s])
  for (const [k, v] of Object.entries(J.guide.alertActions)) guideText.push(['alert action ' + k, v])
  for (const [where, text] of guideText) {
    if (AGENCY_WORDS.test(text)) bad(`agency wording in the client guide: ${where}`)
    if (/\{\{/.test(text)) bad(`merge field in the client guide: ${where}`)
  }
  ok('every stage has a "you do" list; the guide is free of agency wording and merge fields')
}

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
