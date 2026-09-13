/**
 * Regenerates sections 03 (alerts) and 04 (tasks) of
 * client-journey-onepage/docs/alerts-and-tasks.html from journey-data.js,
 * leaving everything else on the page as it was.
 * Usage: node scripts/gen-alerts-page.mjs
 */
import fs from 'node:fs'
import vm from 'node:vm'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/'
const SCRATCH = REPO + 'client-journey-onepage/docs/'
const ROOT = REPO
const journeyUrl = process.argv[2] || '../index.html'

let html = fs.readFileSync(SCRATCH + 'alerts-and-tasks.html', 'utf8')
const sandbox = { window: {} }
vm.runInNewContext(fs.readFileSync(ROOT + 'client-journey-onepage/journey-data.js', 'utf8'), sandbox)
const J = sandbox.window.JOURNEY
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const chips = (channel) => channel.split(/ and |, /).map((c) => {
  const k = /sms/i.test(c) ? 'sms' : /email/i.test(c) ? 'eml' : 'app'
  const label = k === 'sms' ? 'SMS' : k === 'eml' ? 'Email' : 'App'
  return `<span class="ch ch-${k}">${label}</span>`
}).join(' ')

const alertRows = J.alerts.map((a) => `          <tr><td class="num">${a.n}</td><td>${esc(a.name)}</td><td>${esc(a.trigger)}</td><td>${esc(a.to)}</td><td>${chips(a.channel)}</td><td>${esc(a.why)}</td></tr>`).join('\n')
const alertBodies = J.alerts.map((a) => `    <h3>Alert ${a.n}: ${esc(a.name)}</h3>
    <p>${esc(a.desc)}</p>
    <p class="screen-label">${/email/i.test(a.channel) ? 'Email' : /app/i.test(a.channel) && !/sms/i.test(a.channel) ? 'In-app' : 'SMS'} payload</p>
    <pre class="screen">${esc(a.body)}</pre>${a.note ? `\n    <p class="fine" style="margin-top:.7rem">${esc(a.note)}</p>` : ''}`).join('\n\n')

const taskRows = (pipeline) => {
  const rows = []
  for (const s of pipeline.stages) {
    if (s.won) rows.push(`          <tr class="divider"><td colspan="4">Won is marked here</td></tr>`)
    for (const t of s.tasks || []) {
      const urgent = /1 hour|2 days|30 minutes|2 working days/.test(t.due)
      rows.push(`          <tr><td>${esc(s.won ? 'Won' : s.name)}</td><td class="mono">${esc(t.title)}</td><td>${esc(t.role)}</td><td class="${urgent ? 'urgent' : 'num'}">${esc(t.due)}</td></tr>`)
    }
  }
  return rows.join('\n')
}
const alwaysRows = (J.alwaysOn.tasks || []).map((t) => `          <tr><td>Any</td><td class="mono">${esc(t.title)}</td><td>${esc(t.role)}</td><td class="urgent">${esc(t.due)}</td></tr>`).join('\n')

/* Every distinct task, written out with the description that sits inside it. */
const collect = (pipeline) => {
  const out = []
  for (const s of pipeline.stages) for (const t of s.tasks || []) out.push({ stage: s.won ? 'Won' : s.name, t })
  return out
}
const seenTitle = new Set()
const taskDetail = [...collect(J.pipelines[0]), ...collect(J.pipelines[1]), ...(J.alwaysOn.tasks || []).map((t) => ({ stage: 'Any stage', t }))]
  .filter(({ t }) => (seenTitle.has(t.title) ? false : seenTitle.add(t.title)))
  .map(({ stage, t }) => `      <div class="why">
        <h4>${esc(t.title)}</h4>
        <p class="fine">${esc(stage)} &middot; ${esc(t.role)} &middot; due ${esc(t.due)}</p>
        <p>${esc(t.desc)}</p>
      </div>`).join('\n')
let taskCount = (J.alwaysOn.tasks || []).length
for (const p of J.pipelines) for (const s of p.stages) taskCount += (s.tasks || []).length

const alertsSection = `  <section id="alerts">
    <div class="sec-head"><span class="sec-n">03</span><h2>The ${J.alerts.length} real-time alerts</h2></div>

    <div class="t-scroll">
      <table>
        <thead>
          <tr><th>#</th><th>Alert</th><th>Trigger</th><th>To</th><th>Channel</th><th>Why it interrupts</th></tr>
        </thead>
        <tbody>
${alertRows}
        </tbody>
      </table>
    </div>

    <h3>What each one says</h3>
    <p class="fine">Written so the person can act without opening the CRM.${journeyUrl ? ` Each one is also shown under its stage on the <a href="${journeyUrl}">customer journey page</a>.` : ''}</p>

${alertBodies}

    <h3>What deliberately does not alert</h3>
    <div class="rule rule-no">
      <h4>Listed so nobody adds them back later without a reason</h4>
      <ul>
        <li>Stage changes in general. Only Won and deposit do.</li>
        <li>Emails opened or links clicked. Interesting, not actionable.</li>
        <li>Form views, page views, chat opens.</li>
        <li>Every message in a sequence sending as designed.</li>
        <li>Nurture activity of any kind.</li>
        <li>Delivery stage progression. The crew know where they are.</li>
      </ul>
    </div>
  </section>

  <section id="tasks">
    <div class="sec-head"><span class="sec-n">04</span><h2>Tasks</h2></div>

    <div class="stack">
      <p>
        Alerts say <em>something happened</em>. Tasks say <em>you owe something</em>, and
        they persist until closed. Anything with a deadline is a task, not an alert.
        ${taskCount} in total across both boards.
      </p>

      <h3>Naming convention</h3>
      <pre class="screen">[VERB] [WHO]: [WHAT]

CALL Emma: new enquiry, Underfloor, Roof or ceiling
QUOTE Emma: 22 Ranelagh Drive, Mount Eliza
CHASE Daniel: PO</pre>
      <p class="fine" style="margin-top:.7rem">
        Verb first, so a list of twenty tasks is scannable without opening any of them.
      </p>
    </div>

    <h3>Residential</h3>
    <div class="t-scroll">
      <table>
        <thead><tr><th>Stage</th><th>Task</th><th>Assigned</th><th>Due</th></tr></thead>
        <tbody>
${taskRows(J.pipelines[0])}
        </tbody>
      </table>
    </div>

    <h3>Commercial &amp; Industrial</h3>
    <div class="t-scroll">
      <table>
        <thead><tr><th>Stage</th><th>Task</th><th>Assigned</th><th>Due</th></tr></thead>
        <tbody>
${taskRows(J.pipelines[1])}
        </tbody>
      </table>
    </div>

    <h3>Always on</h3>
    <div class="t-scroll">
      <table>
        <thead><tr><th>Stage</th><th>Task</th><th>Assigned</th><th>Due</th></tr></thead>
        <tbody>
${alwaysRows}
        </tbody>
      </table>
    </div>

    <h3>What each task says</h3>
    <p class="fine" style="margin-bottom:1rem">
      Every task carries a title and a description. The title is what shows in a list, so it
      leads with the verb. The description is what the person reads when they open it, and it
      is written to stand on its own: what to do, what has already happened automatically, and
      what moving the card triggers next.
    </p>
${taskDetail}

    <div class="cols" style="margin-top:1.2rem">
      <div class="rule rule-esc">
        <h4>Rule one</h4>
        <ul><li><b>Every task has an owner and a due date.</b> The platform will let you create one with neither. A task with no due date is a note.</li></ul>
      </div>
      <div class="rule rule-esc">
        <h4>Rule two</h4>
        <ul><li><b>Completing the task does not move the card.</b> Moving the card is a separate, deliberate act, or the board reflects who is tidy about tasks rather than where jobs actually are.</li></ul>
      </div>
    </div>
  </section>
`

const start = html.indexOf('  <section id="alerts">')
const end = html.indexOf('  <section id="escalation">')
if (start < 0 || end < 0) { console.error('could not find the alerts and escalation sections'); process.exit(1) }
html = html.slice(0, start) + alertsSection + '\n' + html.slice(end)

/* masthead: point at the shared source of truth */
html = html.replace('<span class="mono">CRM-TASKS-NOTIFICATIONS.md</span>', '<span class="mono">journey-data.js</span>')
html = html.replace(
  /(?:Eleven|\d+) real-time alerts[^.]*?\n {6}(?:three digests|escalation ladders and three digests)\./,
  `${J.alerts.length} real-time alerts with what each one says, ${taskCount} tasks across both boards, two\n      escalation ladders and three digests.`,
)

const dashes = (html.match(/\u2014/g) || []).length
const vendor = (html.match(/GoHighLevel|\bGHL\b/g) || []).length
if (dashes || vendor) { console.error(`em dashes ${dashes}, vendor ${vendor}`); process.exit(1) }
fs.writeFileSync(SCRATCH + 'alerts-and-tasks.html', html)
console.log(`docs/alerts-and-tasks.html regenerated: ${J.alerts.length} alerts with bodies, ${taskCount} tasks${journeyUrl ? ', linked to the journey page' : ''}`)
