/**
 * Regenerates client-journey-onepage/docs/alerts-and-tasks.html from
 * journey-data.js. Keeps the page's own head and stylesheet, replaces the
 * whole body, so the roles, alerts, tasks, quiet hours and go-live list can
 * never drift from the data.
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

const existing = fs.readFileSync(SCRATCH + 'alerts-and-tasks.html', 'utf8')
const headEnd = existing.indexOf('</head>')
if (headEnd < 0) { console.error('alerts-and-tasks.html: no </head>'); process.exit(1) }
const head = existing.slice(0, headEnd + '</head>'.length)

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
    <p class="screen-label">${/sms/i.test(a.channel) ? 'SMS' : /email/i.test(a.channel) ? 'Email' : 'In-app'} payload${/sms/i.test(a.channel) && /email/i.test(a.channel) ? ', the same text by email' : ''}</p>
    <pre class="screen">${esc(a.body)}</pre>${a.note ? `\n    <p class="fine" style="margin-top:.7rem">${esc(a.note)}</p>` : ''}`).join('\n\n')

const taskRows = (pipeline) => {
  const rows = []
  for (const s of pipeline.stages) {
    if (pipeline.wonAt === s.key) rows.push(`          <tr class="divider"><td colspan="4">Won is set here</td></tr>`)
    for (const t of s.tasks || []) {
      const urgent = /15 minutes|30 minutes|1 hour|Same day|due date/.test(t.due)
      rows.push(`          <tr><td>${s.n}. ${esc(s.name)}</td><td class="mono">${esc(t.title)}</td><td>${esc(t.role)}</td><td class="${urgent ? 'urgent' : 'num'}">${esc(t.due)}</td></tr>`)
    }
  }
  return rows.join('\n')
}
const alwaysRows = (J.alwaysOn.tasks || []).map((t) => `          <tr><td>Any</td><td class="mono">${esc(t.title)}</td><td>${esc(t.role)}</td><td class="urgent">${esc(t.due)}</td></tr>`).join('\n')

/* Every distinct task, written out with the description that sits inside it. */
const collect = (pipeline) => {
  const out = []
  for (const s of pipeline.stages) for (const t of s.tasks || []) out.push({ stage: s.name, t })
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

const body = `
<body>

<header class="masthead">
  <div class="masthead-inner">
    <p class="kicker">${esc(J.brand.name)} &middot; Systemations &middot; Doc 3 of 3</p>
    <h1>What the team gets told, and when</h1>
    <p class="standfirst">
      ${J.alerts.length} real-time alerts with what each one says, ${taskCount} tasks across both boards, two
      escalation ladders and three digests. The messaging kit covers what the customer receives. This covers what
      you receive. Revised after the client call on Friday 2 October 2026.
    </p>
    <div class="meta">
      <div><b>Prepared for</b><span>${esc(J.meta.preparedFor)}</span></div>
      <div><b>System</b><span>Systemations</span></div>
      <div><b>Real-time alerts</b><span>${J.alerts.length}</span></div>
      <div><b>Source of truth</b><span class="mono">journey-data.js</span></div>
    </div>
  </div>
</header>

<div class="wrap">

  <section id="principle">
    <div class="sec-head"><span class="sec-n">01</span><h2>The governing principle</h2></div>
    <div class="stack">
      <div class="keystone">
        <p class="big">A notification is a request to do something. If nothing needs doing, it is not a notification, it is a report.</p>
        <p class="sub">Reports go in the daily summary. Only actions interrupt.</p>
      </div>
      <p>
        This is the rule that decides everything below, and it is the one most CRM
        builds get wrong. A system that pings on every stage change trains everyone to
        ignore it inside a fortnight, and then the one alert that actually mattered gets
        ignored too.
      </p>
      <p>
        There are ${J.alerts.length} real-time alerts. After the October call the list was reworked: the
        hour-long unattended lead alert became a fifteen minute email to the office, the missed site
        visit alert went because our own people attend every visit, and two were added that each
        protect a crew day: a customer saying the booked date no longer works, and a deposit unpaid at
        its due date. Anything that goes to the owner arrives by text and by email, and every alert
        names a role or the team, never a person.
      </p>
    </div>
  </section>

  <section id="roles">
    <div class="sec-head"><span class="sec-n">02</span><h2>Roles</h2></div>
    <div class="stack">
      <p>
        Set up as users on the platform, then referenced by role throughout, so a change of staff
        is a reassignment rather than a rewrite.
      </p>
      <div class="t-scroll">
        <table>
          <thead><tr><th>Role</th><th>Who at SprayIT</th><th>Owns</th></tr></thead>
          <tbody>
${J.roles.map((r) => `            <tr><td><code>${esc(r.key)}</code></td><td>${esc(r.who)}</td><td>${esc(r.owns)}</td></tr>`).join('\n')}
          </tbody>
        </table>
      </div>
      <div class="why">
        <h4>Assignment</h4>
        <p>
          New Lead is assigned to the office on both boards. OWNER and ESTIMATOR are the same
          person, so the escalation ladder runs from the office to the owner, a genuine second
          person. If more people take first calls later, switch the New Lead assignment to round
          robin. Unassigned leads are the single most common way a lead dies: everybody assumes
          somebody.
        </p>
      </div>
    </div>
  </section>

  <section id="alerts">
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
        <li>Stage changes in general. Only a quote accepted, a deposit landing, a No on a reminder and an unpaid deposit do.</li>
        <li>A customer not turning up. Our own people attend site visits, so there is no no-show.</li>
        <li>Emails opened or links clicked. Interesting, not actionable.</li>
        <li>Form views, page views, chat opens.</li>
        <li>Every message in a sequence sending as designed.</li>
        <li>Nurture activity of any kind.</li>
        <li>A Yes on a reminder. It is noted on the card, and that is all it needs.</li>
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

CALL Emma: new lead, Underfloor, Roof or ceiling
BOOK Emma: install date
CHASE Daniel: purchase order</pre>
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

  <section id="escalation">
    <div class="sec-head"><span class="sec-n">05</span><h2>Escalation</h2></div>

    <h3>Lead not called</h3>
    <ol class="ladder">
      <li class="rung rung-1"><span class="rung-when">0 min</span><span class="rung-what">Assign to the office, alert, create the call task. Customer gets X-ACK-01. On commercial the owner is told at once (alert 6).</span></li>
      <li class="rung rung-2"><span class="rung-when">15 min</span><span class="rung-what"><b>No call logged:</b> email to the office (alert 7)</span></li>
      <li class="rung rung-3"><span class="rung-when">60 min</span><span class="rung-what"><b>Still no call:</b> text and email to the owner, <em>this lead has been waiting since {{time}}</em></span></li>
      <li class="rung rung-4"><span class="rung-when">Next morning</span><span class="rung-what">Top of the daily summary until a call is logged</span></li>
    </ol>
    <p class="fine" style="margin-top:.8rem">
      Business hours only, and it pauses overnight. A lead arriving at 11pm starts its clock
      when the office opens, otherwise everyone wakes to a false alarm and starts ignoring
      the escalation.
    </p>

    <h3>Stalled card</h3>
    <div class="t-scroll">
      <table>
        <thead><tr><th>Breach</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>First</td><td>Task reappears at the top of the assigned user's list</td></tr>
          <tr><td>2&times; the stall time</td><td>Line item in the daily summary</td></tr>
          <tr><td>3&times; the stall time</td><td>Named in the weekly review, with the card</td></tr>
        </tbody>
      </table>
    </div>
    <div class="why" style="margin-top:1rem">
      <h4>Escalation here moves toward visibility, not toward more alarms</h4>
      <p>
        A card sitting in Nurture for 40 days is not an emergency. It is a conversation to
        have on Monday. Only the lead-not-called ladder above interrupts anyone, because only
        that one has a window in which the outcome can still change.
      </p>
    </div>
  </section>

  <section id="digests">
    <div class="sec-head"><span class="sec-n">06</span><h2>Digests</h2></div>
    <p style="margin-bottom:1.2rem">Where everything that is not an emergency goes.</p>

    <p class="screen-label">Daily, 7:00am, to OWNER and OFFICE</p>
    <pre class="screen">YESTERDAY
  New enquiries          {{count}}
  Calls made             {{count}}
  Quotes sent            {{count}}
  Quotes accepted        {{count}}, {{value}}

TODAY
  Inspections            {{list with time and address}}
  Installs               {{list with crew}}
  Phone calls booked     {{list with time}}
  Deposits due           {{list with amount}}

NEEDS YOU
  Leads not called       {{list}}
  Callbacks due          {{list}}
  Installs to book       {{list, over 2 days in Booking Required}}
  Dates not confirmed    {{list, no Yes or No on either reminder}}
  Deposits unpaid        {{list with amount and due date}}
  Invoices overdue       {{list with amount and days}}
  Job reports to send    {{list, paid but report not sent}}
  Retentions due         {{list with release date}}</pre>
    <p class="fine" style="margin-top:.7rem">
      <b>NEEDS YOU goes last on purpose.</b> It is the section people act on, so it should be
      what their eye lands on when they stop scrolling.
    </p>

    <p class="screen-label" style="margin-top:1.8rem">Weekly, Monday 7:00am, to OWNER</p>
    <pre class="screen">LAST WEEK, BOTH BOARDS
  Enquiries              {{count}}, by source
  Median time to first call
  Closed as Unreachable  {{count}}
  Quotes sent            {{count}}, {{value}}
  Quotes accepted        {{count}}, {{value}}
  Lost                   {{count}}, by reason

PIPELINE NOW
  Open value             {{value}}      &lt;- the forecast
  Accepted, not done     {{value}}      &lt;- committed work
  Cards stalled 3x       {{list}}

DELIVERY
  Jobs completed         {{count}}
  Average days accepted to paid
  Invoices outstanding   {{value}}
  Retentions held        {{value}}</pre>
    <div class="ask" style="margin-top:1rem">
      <b>The two pipeline lines are separated on purpose.</b> Each board runs the sale and the
      job on the same card, so an unfiltered pipeline figure adds work already sold to work still
      being chased. The digest never shows one. Both boards share stage keys, so every line is one
      number across the business.
    </div>

    <p class="screen-label" style="margin-top:1.8rem">Monthly, to OWNER</p>
    <p>
      Cost per enquiry and cost per accepted job by <code>utm_source</code>, <code>gclid</code>
      and <code>fbclid</code>, against <b>paid revenue</b>, not quotes sent. This is the
      number that decides ad spend, and it only exists because attribution survives all
      the way to payment.
    </p>
  </section>

  <section id="quiet">
    <div class="sec-head"><span class="sec-n">07</span><h2>Quiet hours</h2></div>

    <div class="t-scroll">
      <table>
        <thead><tr><th></th><th>Alerts</th><th>Tasks</th><th>Customer messages</th></tr></thead>
        <tbody>
${J.quietHours.map((q) => `          <tr><td>${esc(q.when)}</td><td>${esc(q.alerts)}</td><td>${esc(q.tasks)}</td><td>${esc(q.customer)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>

    <p style="margin-top:1rem">
      Held customer messages queue and release at the next window. Use the platform's
      <em>Wait until a time window</em> step; do not rely on nobody enquiring at midnight.
    </p>

    <div class="why" style="margin-top:1rem">
      <h4>On the legal position</h4>
      <p>
        The Do Not Call industry standard sets permitted hours for telemarketing
        <em>calls</em>. It does not govern SMS to someone who enquired, and transactional
        messages are a different category again. The window above is policy, not a legal
        minimum, and it exists because a 6am quote chase costs more goodwill than it earns.
      </p>
    </div>

    <div class="ask" style="margin-top:1rem">
      <b>Needs Glenn:</b> confirm trading hours, and whether Saturday work happens. The table
      above is a placeholder shaped like a normal trades week.
    </div>
  </section>

  <section id="template">
    <div class="sec-head"><span class="sec-n">08</span><h2>What changes if the business changes</h2></div>

    <div class="t-scroll">
      <table>
        <thead><tr><th>Layer</th><th>What changes</th></tr></thead>
        <tbody>
          <tr><td>Roles</td><td>Reassign OWNER, OFFICE, ESTIMATOR or CREW_LEAD when someone joins or leaves. Nothing else moves, because no alert or task names a person.</td></tr>
          <tr><td>Alerts</td><td>Nothing. Not one of them depends on the product or the crew.</td></tr>
          <tr><td>Tasks</td><td>Verbs may change (SPRAY to INSTALL). Structure holds.</td></tr>
          <tr><td>Escalation</td><td>The 15 minute threshold is worth tuning as enquiry volume grows</td></tr>
          <tr><td>Digests</td><td>Nothing, while the pipeline shape holds</td></tr>
          <tr><td>Quiet hours</td><td>Follow the trading hours, whatever they become</td></tr>
        </tbody>
      </table>
    </div>

    <div class="why" style="margin-top:1rem">
      <h4>The part worth protecting is &sect;1</h4>
      <p>
        More than any specific alert. The failure mode is always the same: a business asks to
        be "notified on everything", gets it, and has stopped reading any of it by week
        three.
      </p>
    </div>
  </section>

  <section id="golive">
    <div class="sec-head"><span class="sec-n">09</span><h2>Before go-live</h2></div>
    <ul class="check">
${J.goLive.map((g) => `      <li>${esc(g)}</li>`).join('\n')}
    </ul>
  </section>

</div>

</body>
</html>
`

const html = head + '\n' + body
const dashes = (html.match(/\u2014/g) || []).length
const vendor = (html.match(/GoHighLevel|HighLevel|LeadConnector|\bGHL\b|Spray It/g) || []).length
if (dashes || vendor) { console.error(`em dashes ${dashes}, vendor or old name ${vendor}`); process.exit(1) }
fs.writeFileSync(SCRATCH + 'alerts-and-tasks.html', html)
console.log(`docs/alerts-and-tasks.html regenerated: ${J.alerts.length} alerts with bodies, ${taskCount} tasks${journeyUrl ? ', linked to the journey page' : ''}`)
