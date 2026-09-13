/**
 * Generates CRM-MESSAGING.md and CRM-TASKS-NOTIFICATIONS.md from
 * client-journey-onepage/journey-data.js, so the documents can never drift
 * from the page. The prose lives here; the messages, tasks and alerts live in
 * the data file and nowhere else.
 */
import fs from 'node:fs'
import vm from 'node:vm'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/'
const src = fs.readFileSync(ROOT + 'client-journey-onepage/journey-data.js', 'utf8')
const sandbox = { window: {} }
vm.runInNewContext(src, sandbox)
const J = sandbox.window.JOURNEY

const ids = Object.keys(J.messages)
const M = J.messages
const count = ids.length
const emails = ids.filter((id) => M[id].channel === 'email').length
const trade = ids.filter((id) => M[id].reuse === 'TRADE')
const mktg = ids.filter((id) => M[id].type === 'MKTG')

/* where a message appears */
const stagesUsing = (id) => {
  const out = []
  for (const p of J.pipelines) for (const s of p.stages) for (const g of s.groups || []) if (g.messages.includes(id)) out.push(`${p.short} · ${s.name}`)
  for (const g of J.alwaysOn.groups || []) if (g.messages.includes(id)) out.push('Always on')
  return [...new Set(out)]
}

const fromLine = (m) => (m.from === 'owner' ? '{{custom_values.from_name_owner}}' : '{{custom_values.from_name_brand}}') + ' <{{custom_values.business_email}}>'

const messageBlock = (id) => {
  const m = M[id]
  const chan = m.channel === 'sms' ? 'SMS' : 'Email'
  const lines = []
  lines.push(`### ${id} · ${chan} · ${m.trigger}, ${m.delay.toLowerCase()} · ${m.type} · ${m.reuse === 'TRADE' ? '**TRADE**' : 'CORE'}${m.manual ? ' · manual send' : ''}`)
  lines.push('')
  if (m.channel === 'email') {
    lines.push(`**From:** ${fromLine(m)}  `)
    lines.push(`**Reply-to:** {{custom_values.business_email}}  `)
    lines.push(`**Subject:** ${m.subject}  `)
    lines.push(`**Preheader:** ${m.preheader}`)
    lines.push('')
  }
  lines.push('```')
  lines.push(m.body)
  if (m.sig) lines.push('', m.sig.join('\n'))
  if (m.footer) lines.push('', m.footer)
  lines.push('```')
  lines.push('')
  lines.push(`*Stops:* ${m.stops} *Window:* ${m.window === 'immediate' ? 'sends immediately.' : 'waits for the send window.'}`)
  if (m.note) lines.push('', m.note)
  if (m.agencyNote) lines.push('', `**Agency note.** ${m.agencyNote}`)
  lines.push('')
  return lines.join('\n')
}

const section = (title, prefixes, intro) => {
  const members = ids.filter((id) => prefixes.some((p) => id.startsWith(p)))
  return [`## ${title}`, '', ...(intro ? [intro, ''] : []), ...members.map(messageBlock)].join('\n')
}

const inventory = ids.map((id) => {
  const m = M[id]
  return `| ${id} | ${m.channel === 'sms' ? 'SMS' : 'Email'} | ${m.trigger} | ${m.delay} | ${m.type} | ${m.reuse === 'TRADE' ? '**TRADE**' : 'CORE'} | ${stagesUsing(id).join(', ')} |`
}).join('\n')

const valuesTable = J.customValues.map((v) => `| \`${v.key}\` | ${v.value} | ${v.note} |`).join('\n')

const fieldsMd = () => J.customFields.map((grp, i) => {
  const head = `| ${grp.columns.join(' | ')} |\n| ${grp.columns.map(() => '---').join(' | ')} |`
  const rows = grp.rows.map((r) => `| ${r.map((c, ci) => (ci === 0 ? c.split(', ').map((k) => '`' + k + '`').join(', ') : c)).join(' | ')} |`).join('\n')
  return `### 3.${i + 1} ${grp.group}\n\n${head}\n${rows}\n${grp.note ? '\n' + grp.note + '\n' : ''}`
}).join('\n')

const reuseMd = J.reuseSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
const goLiveMd = J.goLive.map((s) => `- [ ] ${s}`).join('\n')

/* ============================================================ MESSAGING */
const messaging = `# CRM Messaging Kit

Every SMS and email the pipelines send, with the sender, subject and preheader
for each, plus the fields and custom values they depend on. Built for
Systemations.

**Generated.** This file is produced from
\`client-journey-onepage/journey-data.js\`, which is also what renders the
customer journey page. Edit the data file, run the generator, and both stay in
step. Editing this file by hand will be overwritten.

**This is written as a template.** Nothing client-specific is hardcoded in a
message body. A new client is a Custom Values swap (§2) plus rewriting the
${trade.length} messages marked \`TRADE\`, not a rewrite of the kit.

The visual companion is the customer journey page in \`client-journey-onepage/\`.
Open its \`index.html\` to see every message below as the customer would receive
it, stage by stage, with the alerts and tasks that sit behind each one. Its
Fields mode shows the raw merge fields and its Copy button hands over the
template text ready to paste into the builder.

---

## 1. How to reuse this for another client

${reuseMd}

Of the ${count} messages, ${trade.length} are trade-specific: ${trade.join(', ')}.
Everything else moves between clients untouched.

### A warning about tokens

The platform has changed token names between releases, particularly the
appointment ones. Treat the token names below as **what to look for in the
dropdown**, not as guaranteed strings. Confirm each one against your platform
version and send a test to yourself before go-live. A token that does not
resolve sends the raw \`{{...}}\` text to the customer.

### Sender identity

Every email carries a From name, a From address and a Reply-to, so the reader
knows who wrote it and a reply lands with a person. Two From names are used:

- **\`from_name_owner\`**, "Glenn at Spray It Solutions", on anything personal:
  the chase, the quote, the follow-up, the thank-you, the nurture drip.
- **\`from_name_brand\`**, "Spray It Solutions", on confirmations, invoices and
  paperwork, where a person's name would look odd on a receipt.

Both send from \`business_email\`. The sending domain needs SPF and DKIM set up
in Systemations before go-live, or the first thing the customer sees is a
spam warning.

### Preheaders

Every email has one. It is the grey line the inbox shows under the subject, and
on a phone it is most of what the reader sees before deciding whether to open.
They are written to complete the subject rather than repeat it, and kept under
110 characters so nothing is cut off.

---

## 2. Custom Values: the swap layer

Create these under **Settings → Custom Values**. This is the whole template
mechanism: change these ${J.customValues.length} values and every message below
works for a different client.

| Custom value | Spray It Solutions | Notes |
| --- | --- | --- |
${valuesTable}

> **Needs Glenn:** trading hours. That is the only outstanding value.
>
> There is deliberately no ABN field: quotes and invoices are documents the
> client issues himself and they carry it, so repeating it in a covering email
> would create a value with no owner.

---

## 3. Custom fields

${fieldsMd()}
---

## 4. Assets each message needs

| Asset | Used by | Status |
| --- | --- | --- |
| Booking calendar | X-BOOK, X-APPT | Needs the Systemations calendar built |
| Quote template | R-QUOTE | Glenn's existing template, or built in Systemations |
| Review link | REV-01 | Done. The link opens the Reviews tab of the Google listing. Set it up as a trigger link so it is shortened in SMS. |
| Job preparation notes | JOB-02 | Written, in the message. Confirm the list with the crew. |
| Completion pack | JOB-05, C-DONE-01 | Needs Glenn's existing warranty or completion document |
| Compliance pack | C-INSP-01, C-PROP-01, C-MOB-01 | SWMS and insurances, current copies |
| Unsubscribe link | All marketing email | The platform provides \`{{unsubscribe_link}}\` |
| Sending domain | All email | SPF and DKIM on the business domain |

---

## 5. The compliance line: transactional against marketing

Every message below is tagged.

**\`TRANS\` (transactional).** About an enquiry, appointment or job the person
already has with us. No marketing consent required. No unsubscribe link
required. Still identifies the sender, which the Spam Act requires of commercial
electronic messages generally.

**\`MKTG\` (marketing).** Promotional. Sends **only** when
\`{{contact.consent_marketing}}\` is \`yes\`. Must carry a functional unsubscribe.
This is the entire reason the consent fields exist. There are ${mktg.length} of these:
${mktg.join(', ')}. None of them is an SMS.

Three rules that apply to every message:

1. **Every SMS identifies the sender.** \`{{custom_values.sms_signoff}}\` appears
   in every one. An unidentified SMS is the most common Spam Act failure.
2. **Every marketing message carries an opt-out.** The platform handles STOP
   natively and sets do-not-SMS, and \`{{unsubscribe_link}}\` handles email, but
   the wording still has to be there.
3. **Outbound send window: 8am to 8pm, Monday to Saturday, local time.**
   Confirmations send immediately because the person is waiting for them.
   Everything else waits. Use the platform's workflow **Wait until a time
   window** step, not a hope that nobody submits at midnight.

---

## 6. Message inventory

${count} messages. Every SMS fits in one segment with the sample values, which
was checked on the journey page rather than assumed.

| ID | Channel | Trigger | Delay | Type | Reuse | Appears in |
| --- | --- | --- | --- | --- | --- | --- |
${inventory}

Build the \`X-\` and \`R-\` sets first; the commercial set can follow, since that
board runs at a pace where a human writing the email is still viable.

---

${section('7. Shared messages', ['X-ACK', 'X-CHASE', 'X-APPT', 'X-BOOK'], 'Used by both boards. The chase, the phone consult booking, and the step from the call to the assessment.')}
---

${section('8. Residential: assessment to decision', ['R-ASSESS', 'R-QUOTING', 'R-QUOTE', 'R-FU', 'LOST'])}
---

${section('9. Won and delivery', ['X-WON', 'DEP', 'JOB', 'PAY'])}
---

${section('10. After the job', ['REV'])}
---

${section('11. Nurture', ['NUR'], 'Marketing. Sends only when `{{contact.consent_marketing}}` is `yes`. Every one carries an unsubscribe.')}
---

${section('12. Always on', ['SYS'])}
---

${section('13. Commercial messages', ['C-'], 'Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.')}
> **Needs Glenn:** payment terms for commercial work, and whether progress
> claims follow a percentage, a milestone, or a monthly cycle.

---

## 14. Build order

Do not build all ${count} at once. In order of what earns most:

${J.buildOrder.map((b, i) => `${i + 1}. **${b.ids}**, ${b.why.charAt(0).toLowerCase() + b.why.slice(1)}`).join('\n')}
`

/* ============================================================== TASKS */
const prio = { now: 'Act now', heads: 'Heads up', win: 'Win', fyi: 'Good to know' }
const alertsTable = J.alerts.map((a) => `| ${a.n} | **${a.name}** | ${a.trigger} | ${a.to} | ${a.channel} | ${a.why} |`).join('\n')
const alertBodies = J.alerts.map((a) => `**${a.n}. ${a.name}** · ${prio[a.prio]}\n\n\`\`\`\n${a.body}\n\`\`\`${a.note ? '\n\n' + a.note : ''}`).join('\n\n')

const taskTable = (pipeline) => {
  const rows = []
  for (const s of pipeline.stages) for (const t of s.tasks || []) rows.push(`| ${s.won ? 'Won' : s.name} | \`${t.title}\` | ${t.role} | ${t.due} |`)
  return rows.join('\n')
}
const alwaysTasks = (J.alwaysOn.tasks || []).map((t) => `| Any | \`${t.title}\` | ${t.role} | ${t.due} |`).join('\n')
let taskCount = (J.alwaysOn.tasks || []).length
for (const p of J.pipelines) for (const s of p.stages) taskCount += (s.tasks || []).length

const tasks = `# CRM Tasks and Notifications

What the team gets told, when, and what they are expected to do about it.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md) and
[CRM-MESSAGING.md](CRM-MESSAGING.md). Messaging covers what the *customer*
receives. This covers what *you* receive.

**Generated.** The alerts and tasks below are produced from
\`client-journey-onepage/journey-data.js\`, the same file that renders the
customer journey page, where each of them is shown under the stage it belongs
to. Edit the data file and run the generator. Editing this file by hand will be
overwritten.

Written as a template. Roles are tokenised, so a new client is a reassignment
rather than a rebuild.

---

## 1. The governing principle

> **A notification is a request to do something. If nothing needs doing, it is
> not a notification, it is a report.**

Reports go in a digest. Only actions interrupt.

This is the rule that decides everything below, and it is the one most CRM
builds get wrong. A system that pings on every stage change trains everyone to
ignore it inside a fortnight, and then the one alert that actually mattered gets
ignored too. There are ${J.alerts.length} real-time alerts in this document. That is
deliberate, and adding a twelfth should require an argument.

---

## 2. Roles

Set up as users on the platform, then referenced by role throughout so another
client is a reassignment rather than a rewrite.

| Role | Who at Spray It | Owns |
| --- | --- | --- |
${J.roles.map((r) => `| \`${r.key}\` | ${r.who} | ${r.owns} |`).join('\n')}

> **Needs Glenn:** who fills OFFICE and ESTIMATOR, and whether they are separate
> people or both him. If they are both him, the escalation ladder in §5 needs a
> second name or it escalates to itself.

**Round robin.** If more than one person can take a new lead, use the platform's
round robin assignment on the New Enquiry trigger. Unassigned leads are the
single most common way a lead dies: everybody assumes somebody.

---

## 3. Real-time alerts

${J.alerts.length}. These interrupt. Everything else waits for a digest.

| # | Alert | Trigger | To | Channel | Why it interrupts |
| --- | --- | --- | --- | --- | --- |
${alertsTable}

### What each one says

Written so the person can act without opening the CRM. Someone standing on a
roof can read the first one and decide whether to climb down.

${alertBodies}

### What deliberately does not alert

Listed so nobody adds them back in later without a reason.

- Stage changes in general. Only Won and deposit do.
- Emails opened or links clicked. Interesting, not actionable.
- Form views, page views, chat opens.
- Every message in a sequence sending as designed.
- Nurture activity of any kind.
- Delivery stage progression. The crew know where they are.

---

## 4. Tasks

Alerts say *something happened*. Tasks say *you owe something*, and they persist
until closed. Anything with a deadline is a task, not an alert. ${taskCount} in
total across both boards.

### Naming convention

\`\`\`
[VERB] [WHO]: [WHAT]
\`\`\`

For example \`CALL Emma: new enquiry, Underfloor, Roof or ceiling\`. Verb first,
so a list of twenty tasks is scannable without opening any of them.

### Residential

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
${taskTable(J.pipelines[0])}

### Commercial & Industrial

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
${taskTable(J.pipelines[1])}

### Always on

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
${alwaysTasks}

### Two rules

1. **Every task has an owner and a due date.** The platform will let you create
   a task with neither. A task with no due date is a note.
2. **Completing the task does not move the card.** Moving the card is a
   separate, deliberate act. Otherwise the board reflects who is tidy about
   tasks rather than where jobs actually are.

---

## 5. Escalation

Two ladders. One for a lead nobody has touched, one for a card that has stopped
moving.

### Unattended lead

| Elapsed | Action |
| --- | --- |
| 0 min | Assign, notify, create the call task. Customer gets X-ACK-01. |
| 15 min | Reminder to the assigned user |
| **60 min** | **Escalate: SMS to assigned user and OWNER, reassign to OFFICE** |
| 4 hours | SMS to OWNER: *this lead has been sitting since {{time}}* |
| Next morning | Appears at the top of the daily digest until it moves |

Business hours only, and it pauses overnight. A lead that arrives at 11pm starts
its clock when the office opens, otherwise everyone wakes to a false alarm and
starts ignoring the escalation. On the commercial board the escalation goes to
Glenn rather than away from him, because commercial is his.

### Stalled card

Uses the stall times from the pipeline document. On breach:

| Breach | Action |
| --- | --- |
| First | Task reappears at the top of the assigned user's list |
| 2× the stall time | Line item in the daily digest |
| 3× the stall time | Named in the weekly review, with the card |

Note the escalation is toward **visibility**, not more alarms. A card stuck in
Follow-up for 40 days is not an emergency. It is a conversation to have on
Monday.

---

## 6. Digests

Where everything that is not an emergency goes.

### Daily, 7:00am, to OWNER and OFFICE

\`\`\`
YESTERDAY
  New enquiries          {{count}}
  Calls made             {{count}}
  Quotes sent            {{count}}
  Jobs won               {{count}}, {{value}}

TODAY
  Assessments            {{list with time and address}}
  Jobs starting          {{list with crew}}
  Calls booked           {{list with time}}

NEEDS YOU
  Leads unattended       {{list}}
  Quotes overdue         {{list, over 2 days in Quoting}}
  Proposals overdue      {{list, over 5 days in Specifying}}
  Follow-ups due         {{count}}
  Invoices overdue       {{list with amount and days}}
\`\`\`

\`NEEDS YOU\` goes last on purpose. It is the section people act on, so it should
be the thing their eye lands on when they stop scrolling.

### Weekly, Monday 7:00am, to OWNER

\`\`\`
LAST WEEK
  Enquiries              {{count}}, by source
  Median time to first contact
  Enquiry to Qualified   {{percent}}
  Quotes sent            {{count}}, {{value}}
  Won                    {{count}}, {{value}}
  Lost                   {{count}}, by reason

PIPELINE NOW
  Open value             {{value}}      <- the forecast
  Won not yet delivered  {{value}}      <- committed work
  Cards stalled 3x       {{list}}

DELIVERY
  Jobs completed         {{count}}
  Average days Won to Paid
  Invoices outstanding   {{value}}
\`\`\`

The two pipeline lines are separated because the boards merged sales and
delivery. An unfiltered pipeline figure on a merged board is roughly double what
is really in play, so the digest never shows one.

### Monthly, to OWNER

Cost per enquiry and cost per won job by \`utm_source\`, \`gclid\` and \`fbclid\`,
against **paid revenue**, not quotes sent. This is the number that decides ad
spend, and it only exists because attribution now survives all the way to
payment.

---

## 7. Quiet hours

| | Alerts | Tasks | Customer messages |
| --- | --- | --- | --- |
${J.quietHours.map((q) => `| ${q.when} | ${q.alerts} | ${q.tasks} | ${q.customer} |`).join('\n')}

Held customer messages queue and release at the next window. Use the platform's
**Wait until a time window** step; do not rely on nobody enquiring at midnight.

On the legal position: the Do Not Call industry standard sets permitted hours
for telemarketing *calls*. It does not govern SMS to someone who enquired, and
transactional messages are a different category again. The window above is
policy, not a legal minimum, and it exists because a 6am quote chase costs more
goodwill than it earns.

> **Needs Glenn:** confirm trading hours, and whether Saturday work happens. The
> table above is a placeholder shaped like a normal trades week.

---

## 8. Templating this for another client

| Layer | What changes |
| --- | --- |
| **Roles** (§2) | Reassign OWNER, OFFICE, ESTIMATOR, CREW_LEAD |
| **Alerts** (§3) | Nothing. All ${J.alerts.length} are trade-agnostic. |
| **Tasks** (§4) | Verbs may change (\`SPRAY\` to \`INSTALL\`). Structure holds. |
| **Escalation** (§5) | The 1 hour threshold is worth tuning to their volume |
| **Digests** (§6) | Nothing, if the pipeline shape is reused |
| **Quiet hours** (§7) | Their trading hours |

The load-bearing part is §1. Carrying that rule across is worth more than
carrying any specific alert, because the failure mode is always the same: a
client asks for "notify me on everything", gets it, and stops reading any of it
by week three.

---

## 9. Before go-live

${goLiveMd}
`

/* ---------------------------------------------------------------- write */
const guard = (name, text) => {
  const dashes = (text.match(/\u2014/g) || []).length
  const vendor = (text.match(/GoHighLevel|\bGHL\b/g) || []).length
  if (dashes || vendor) { console.error(`${name}: ${dashes} em dashes, ${vendor} vendor mentions`); process.exit(1) }
}
guard('messaging', messaging)
guard('tasks', tasks)
fs.writeFileSync(ROOT + 'CRM-MESSAGING.md', messaging)
fs.writeFileSync(ROOT + 'CRM-TASKS-NOTIFICATIONS.md', tasks)
console.log(`CRM-MESSAGING.md: ${count} messages (${emails} email, ${count - emails} sms), ${trade.length} trade-specific, ${mktg.length} marketing`)
console.log(`CRM-TASKS-NOTIFICATIONS.md: ${J.alerts.length} alerts, ${taskCount} tasks`)
