// Checks the dialog text against the CRM data file (client-journey-onepage/journey-data.js, the source the documents are generated from):
//  - every id in "sources" (workflow ids, template ids) must appear in that data file;
//  - every stage, Won, Lost and action key must have an entry; no entry has an empty "lines";
//  - no hedging words ("may", "might", "no workflow confirmed", "cannot see") in any line;
//  - no em dash or en dash.
// Run: node scripts/check-confirm-notes.mjs
import { readdirSync, readFileSync } from 'node:fs'

const dir = 'src/lib/confirm-notes'
const NOTES = {}
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  try {
    Object.assign(NOTES, JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
  } catch (e) {
    console.log(`FAIL ${f} is not valid JSON :: ${e.message}`)
    process.exit(1)
  }
}
const data = readFileSync('../client-journey-onepage/journey-data.js', 'utf8')
let fails = 0
const rec = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' :: ' + d : ''}`) }

const STAGES = ['New Lead', 'Dial 1', 'Dial 2', 'Quoting', 'Quote Sent', 'Follow-Up', 'Nurture', 'Quote Accepted', 'Inspection Required', 'Booking Required', 'Job Booked', 'Deposit Requested', 'Job Completed', 'Retention Claim', 'Won', 'Lost']
const keysSrc = readFileSync('src/lib/confirmActions.ts', 'utf8')
const ACTIONS = [...keysSrc.matchAll(/^\s+'([a-z-]+)': \{ label:/gm)].map((m) => m[1]).filter((k) => !['stage-change', 'stage-backward', 'mark-won', 'mark-lost', 'tag-add', 'tag-remove'].includes(k))
for (const k of [...STAGES, ...ACTIONS]) rec(`entry for ${k}`, !!NOTES[k])
for (const k of ['tag-add:*', 'tag-remove:*']) rec(`entry for ${k}`, !!NOTES[k])

const HEDGE = /\b(may|might|could|no workflow confirmed|cannot see|probably|unconfirmed)\b/i
const DASH = /[–—]/
const CODES = /\b(WF|HX)-?\d+|\b[A-Z]{1,6}-(?:[A-Z]+-)?\d{2}\b|\b(?:hub|is|been|opp|in)-[a-z]|\balert \d+|consent_marketing|\b[a-z]+_[a-z_]+\b/
for (const [k, n] of Object.entries(NOTES)) {
  rec(`${k}: has lines and the right shape`, Array.isArray(n.lines) && n.lines.length > 0 && typeof n.sends === 'boolean' && Array.isArray(n.stops) && Array.isArray(n.sources))
  const text = [...(n.lines || []), ...(n.stops || [])].join(' | ')
  rec(`${k}: no hedging words`, !HEDGE.test(text), (text.match(HEDGE) || [''])[0])
  rec(`${k}: no em or en dash`, !DASH.test(text))
  // The client reads these: no workflow codes, message codes, tag names or alert numbers, only what is sent, received or created.
  rec(`${k}: no codes or tag names in the visible text`, !CODES.test(text), (text.match(CODES) || [''])[0])
  for (const id of n.sources || []) rec(`${k}: source ${id} exists in the data file`, data.includes(id))
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
