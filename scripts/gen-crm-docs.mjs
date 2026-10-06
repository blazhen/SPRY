/**
 * Generates the CRM documents from client-journey-onepage/journey-data.js,
 * so the documents can never drift from the page:
 *
 *   CRM-MESSAGING.md, CRM-TASKS-NOTIFICATIONS.md, CRM-WORKFLOWS.md,
 *   CRM-PIPELINES.md, and client-journey-onepage/docs/pipelines.html
 *
 * The prose lives here; the stages, messages, tasks, alerts and workflows live
 * in the data file and nowhere else.
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
const RES = J.pipelines[0]
const COM = J.pipelines[1]
const STAGES = RES.stages.length
const BRAND = J.brand.name
const cv = (k) => (J.customValues.find((v) => v.key === k) || {}).value

/* where a message appears */
const stagesUsing = (id) => {
  const out = []
  for (const p of J.pipelines) for (const s of p.stages) for (const g of s.groups || []) if (g.messages.includes(id)) out.push(`${p.short} · ${s.name}`)
  for (const g of J.alwaysOn.groups || []) if (g.messages.includes(id)) out.push('Always on')
  return [...new Set(out)]
}

const FROM_KEY = { contact: 'from_name_contact', brand: 'from_name_brand' }
const fromLine = (m) => `{{custom_values.${FROM_KEY[m.from] || 'from_name_brand'}}} <{{custom_values.business_email}}>`

/* The kit is printed in journey order. Every message must land in exactly one
   section, or the generator stops: a document that silently drops a message
   is worse than no document. Entries are exact ids or id prefixes. */
const SECTIONS = [
  { title: 'Shared: first contact, Dial 1 and Dial 2', match: ['X-ACK', 'DIAL', 'X-APPT', 'X-INSP'], intro: 'Used by both boards. The acknowledgement, the tried-to-call text, the three Dial 2 emails, the phone call booking and the site inspection.' },
  { title: 'Residential: quote to decision', match: ['R-QUOTE', 'R-FU', 'LOST'] },
  { title: 'Nurture', match: ['NUR'], intro: 'Marketing. Sends only when `{{contact.consent_marketing}}` is `yes`. Every one carries an unsubscribe.' },
  { title: 'Quote accepted, booking and reminders', match: ['X-ACC', 'JOB-01', 'JOB-02', 'REM', 'JOB-04', 'JOB-06'] },
  { title: 'Deposit', match: ['DEP'], intro: 'Timed to the install date and the foam, never to the booking.' },
  { title: 'Job completed and payment', match: ['JOB-05', 'PAY', 'RPT', 'REV'] },
  { title: 'Retention', match: ['RET'] },
  { title: 'Always on', match: ['SYS'] },
  { title: 'Commercial messages', match: ['C-'], intro: 'Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.' },
]
const inSection = (sec) => ids.filter((id) => sec.match.some((p) => id === p || id.startsWith(p)))
{
  const seen = new Map()
  for (const sec of SECTIONS) for (const id of inSection(sec)) {
    if (seen.has(id)) { console.error(`${id} is in two sections: ${seen.get(id)} and ${sec.title}`); process.exit(1) }
    seen.set(id, sec.title)
  }
  const loose = ids.filter((id) => !seen.has(id))
  if (loose.length) { console.error(`messages in no section: ${loose.join(', ')}`); process.exit(1) }
}

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

const section = (n, sec) => [`## ${n}. ${sec.title}`, '', ...(sec.intro ? [sec.intro, ''] : []), ...inSection(sec).map(messageBlock)].join('\n')

const inventory = ids.map((id) => {
  const m = M[id]
  return `| ${id} | ${m.channel === 'sms' ? 'SMS' : 'Email'} | ${m.trigger} | ${m.delay} | ${m.type} | ${m.reuse === 'TRADE' ? '**TRADE**' : 'CORE'} | ${stagesUsing(id).join(', ')} |`
}).join('\n')

const valuesTable = J.customValues.map((v) => `| \`${v.key}\` | ${v.value} | ${v.note} |`).join('\n')

const fieldsMd = (prefix) => J.customFields.map((grp, i) => {
  const head = `| ${grp.columns.join(' | ')} |\n| ${grp.columns.map(() => '---').join(' | ')} |`
  const rows = grp.rows.map((r) => `| ${r.map((c, ci) => (ci === 0 ? c.split(', ').map((k) => '`' + k + '`').join(', ') : c)).join(' | ')} |`).join('\n')
  return `### ${prefix}.${i + 1} ${grp.group}\n\n${head}\n${rows}\n${grp.note ? '\n' + grp.note + '\n' : ''}`
}).join('\n')

const reuseMd = J.reuseSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
const goLiveMd = J.goLive.map((s) => `- [ ] ${s}`).join('\n')

/* How a card moves, stage by stage. Shared by the pipeline document and its
   HTML page. */
const MOVES = [
  ["New Lead", "The lead lands and the acknowledgement text and email go. Ring within 15 minutes, twice back to back. They answer and want a quote: Quoting. A request to ring back later: Follow-Up. Not now: Nurture. No answer to either call: Dial 1."],
  ["Dial 1", "Entering it sends the tried-to-call text about ten seconds later. A second round of calls the same day. Still nothing: Dial 2."],
  ["Dial 2", "Entering it starts three emails: a check-in on day 2, an offer of a time to talk on day 4, and an honest close on day 7. Any reply or booking stops them. Nothing by day 8: Lost, reason Unreachable."],
  ["Quoting", "The office has spoken to them and they want a quote. The card is assigned to the owner, who gets a text and an email and a task to write and send it, often ringing them first for more detail. Sending the quote moves the card to Quote Sent."],
  ["Quote Sent", "The quote carries accept and decline buttons, and can carry more than one option. Follow-ups on days 2, 5, 10 and 21. Accept moves the card to Quote Accepted by itself; decline closes it as Lost. A yes by phone or a purchase order is moved by hand."],
  ["Follow-Up", "The customer asked for a callback. A task at the time they asked; every sequence paused. Then Quoting, Quote Accepted, Nurture or Lost."],
  ["Nurture", "Not now, or not affordable yet. Quotes come back after one or two years, so the card is kept: a marketing drip for those who opted in, and a call for everyone at twelve months. Coming back means Quoting."],
  ["Quote Accepted", "The job is won. Thank-you and what happens next, with no deposit request. The owner then moves it to Inspection Required if the site needs a look, otherwise Booking Required. An add-on quote on a live job never brings a card back here."],
  ["Inspection Required", "Only after acceptance, about one job in ten or twenty. Staff attend, so there is no no-show handling. A cancellation alerts the owner, who rebooks it. Then Booking Required, or Lost if the job cannot be done."],
  ["Booking Required", "The owner books the install in the calendar for the vehicle doing it: the InjectaCore rig, the van, the Fuso truck or the Mercedes rig. Several days or two rigs means a booking for each block. Two-way sync with the Apple calendar."],
  ["Job Booked", "The booking moves the card here. Confirmation and preparation notes, then reminders a month before (only when booked more than six weeks ahead), 7 days and 48 hours before, each with Yes and No. A No alerts the team; rescheduling is done by a person."],
  ["Deposit Requested", "A draft deposit invoice is prepared 14 days before the job, timed by foam type, and the owner checks it and sends it. Sending it moves the card here. Unpaid at 4pm on the due date: a text asks for the remittance and the team is told. Jobs with no deposit skip it."],
  ["Job Completed", "The crew marks the job complete. A draft final invoice is prepared for the owner to check and send, with a task to decide on the Google review. The reminders start when it is sent. The job report goes only once it is paid. Paid with no retention: the card closes as Won."],
  ["Retention Claim", "Run by hand, with a task on the release date."],
]

/* Things still to confirm with Glenn after the 2 October call. Shared by
   the pipeline document and its HTML page. */
const OPEN_ITEMS = [
  "Commercial payment terms, and whether progress claims follow a percentage, a milestone or a monthly cycle.",
  "Which system sends invoice reminders, the platform or Xero. Glenn said Xero already sends them; a customer should never get both.",
  "How Glenn wants invoices set out. Until he has settled it, deposit and final invoices are drafts he checks and sends; once he has, the send can be automated.",
  "The month-out check (REM-06) for jobs booked more than six weeks ahead was raised by Glenn on the call. Easy to drop if it is not wanted.",
  "The morning-of \"crew on the way\" text (JOB-04) is still in. On the call Glenn said a reminder on the morning was probably not needed, since the crew arrive at seven; confirm whether to keep the on-the-way text or drop it.",
  "Optional upgrades on a quote that update the total live (for example R2.5 to R4) are pending scope confirmation. Nothing is built for them.",
  "Xero sync for invoices carrying GST is untested. Only GST-free invoices have been seen reaching Xero so far.",
  "The out-of-hours text gives Rachael's mobile for anything urgent. Confirm that is wanted, or point it at the business line.",
  "Trading hours, and whether Saturday work happens. The send windows and quiet hours are placeholders shaped like a normal trades week.",
  "Service area boundary, so Outside service area can be automated.",
  "Whether AI voice calls are recorded, which decides the script opening.",
]

/* Deposits, invoices and payment, as agreed on the call. Shared by the
   pipeline document and its HTML page. */
const MONEY = [
  ["Never at booking.", "A draft deposit invoice is prepared 14 days before the install date, or straight away if the job is closer, which is when Glenn said on the call he generally sends them. It is due 1 business day before the job for stock open cell, and 7 days before for special-order foam, because that material is made and shipped for the job and is only ordered once the deposit lands."],
  ["Drafts, sent by the owner.", "Deposit and final invoices are created as drafts from the accepted quote and the owner checks and sends each one, as Glenn asked. Sending is what moves the card and starts the reminders. Once he has settled how he wants them set out, the send can be automated."],
  ["Unpaid at its due date.", "At 4pm on the due date, one text asks the customer for the remittance, and the owner and the office are told, so the crew can be reassigned. Nothing goes before the due date, because Xero already sends its own reminders. No card storage, no automatic charging."],
  ["Deposits are a liability", "in the accounts, not sales income, until the job is done. Map the deposit item in Xero accordingly."],
  ["The final invoice", "is prepared when the crew marks the job complete: the balance after any deposit, with a payment schedule by percentage or fixed amounts, each with a due date. The owner adjusts it for the area actually sprayed, with a variation or a credit, and sends it."],
  ["Every invoice carries the accepted quote,", "which holds the terms and conditions, and the client's purchase order where there is one."],
  ["The job report and certificates of completion", "go only once the final invoice is fully paid, sent by the owner from a task."],
  ["Retentions", "on larger commercial jobs, held six to twelve months, sit in Retention Claim with a task on the release date."],
  ["Xero.", "Sync is agreed, but only GST-free invoices have been seen reaching Xero so far and these carry GST: test a GST invoice before promising it. If marking an invoice paid in the platform before the bank transfer clears breaks the bookkeeper's reconciliation, switch off the payment receipt sync. Decide which system sends invoice reminders, so a customer never gets both."],
  ["Contracts and variations.", "Document templates fill in the client details for digital signature, including site variations such as an extra 100 sqm agreed mid-job."],
]

/* ============================================================ MESSAGING */
const messaging = `# CRM Messaging Kit

Every SMS and email the pipelines send, with the sender, subject and preheader
for each, plus the fields and custom values they depend on. Built for
Systemations. Revised after the client call on Friday 2 October 2026.

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
resolve sends the raw \`{{...}}\` text to the customer. The Yes and No links in
the reminders are trigger links: \`{{trigger_link.confirm_yes}}\` and
\`{{trigger_link.confirm_no}}\` stand for whatever token the platform inserts.

### Sender identity

Every email carries a From name, a From address and a Reply-to, so the reader
knows who wrote it and a reply lands with a person. Two From names are used:

- **\`from_name_contact\`**, "${cv('from_name_contact')}", on anything personal:
  the acknowledgement, the Dial 2 emails, the quote, the follow-up, the
  thank-you, the job report, the nurture drip. Signed
  ${cv('contact_name')}, ${BRAND}, ${cv('contact_mobile')}.
- **\`from_name_brand\`**, "${cv('from_name_brand')}", on confirmations,
  reminders, invoices and paperwork, where a person's name would look odd on a
  receipt. Signed with the business name and the business line.

Messages are written as the business, "we", and signed off with Rachael's name
and mobile, because she handles about 99% of customer contact. "Ring us" lines
use her mobile. The business line, ${cv('business_phone')}, is the number on the
Google listing and the website, and appears on the business signature.

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

| Custom value | ${BRAND} | Notes |
| --- | --- | --- |
${valuesTable}

> **Needs Glenn:** trading hours. Rachael's mobile, ${cv('contact_mobile')}, was
> confirmed by Glenn on the 2 October call.
>
> There is deliberately no ABN field: quotes and invoices are documents the
> client issues himself and they carry it, so repeating it in a covering email
> would create a value with no owner.

---

## 3. Custom fields

${fieldsMd('3')}
---

## 4. Assets each message needs

| Asset | Used by | Status |
| --- | --- | --- |
| Phone call calendar | X-APPT, DIAL-03 | Needs the Systemations calendar built, embedded on the site at /book/ |
| Inspection calendar | X-INSP, C-INSP-01 | Needs building. Used after a quote is accepted. Staff attend, so no no-show handling; a cancellation alerts the owner to rebook. |
| Install calendars, one per vehicle | JOB-01, JOB-02, REM, C-MOB-01 | Four to build: the InjectaCore rig, the van, the Fuso truck and the Mercedes rig. Bookings run over several days, and one job can use two rigs on different days. Book in the platform first. Two-way sync with the owner's Apple (iCloud) calendar is the separate calendars task. |
| Quote tool with accept and decline buttons | R-QUOTE-01, C-PROP-01 | Several options per job, one accepted. Optional upgrades pending scope confirmation. |
| Trigger links, Yes and No | REM-01 to 04 | Two links, each firing WF-20 with its branch, landing on a short thank-you page |
| Invoice templates with payment schedules | DEP-02, PAY-01, C-PAY-01 | Created as drafts from the accepted quote, checked and sent by the owner. Percentage or fixed stages with due dates. Accepted quote attached, and the purchase order where there is one. |
| Contract and variation documents | Job Booked, Job Completed | Templates that fill in the client details for digital signature, including variations such as an extra 100 sqm |
| Job report template and certificate of completion | RPT-01, C-DONE-01 | Needs Glenn's existing report and certificate. Sent only after the final invoice is paid. |
| Retention claim template | RET-01 | Needs the claim format Glenn uses |
| Review link | REV-01 | Done. The link opens the Reviews tab of the Google listing. Set it up as a trigger link so it is shortened in SMS. |
| Job preparation notes | JOB-02, REM-03 | Written, in the message. Confirm the list with the crew. |
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

1. **Every SMS identifies the sender.** \`{{custom_values.sms_signoff}}\`,
   "${cv('sms_signoff')}", ends every one. An unidentified SMS is the most common
   Spam Act failure.
2. **Every marketing message carries an opt-out.** The platform handles STOP
   natively and sets do-not-SMS, and \`{{unsubscribe_link}}\` handles email, but
   the wording still has to be there.
3. **Outbound send window: 8am to 8pm, Monday to Saturday, local time.**
   Confirmations send immediately because the person is waiting for them.
   Everything else waits. Use the platform's workflow **Wait until a time
   window** step, not a hope that nobody submits at midnight.

---

## 6. Message inventory

${count} messages. Every SMS fits in one segment with the sample values and a
realistic shortened link, which was checked rather than assumed.

| ID | Channel | Trigger | Delay | Type | Reuse | Appears in |
| --- | --- | --- | --- | --- | --- | --- |
${inventory}

Build the shared and residential sets first; the commercial set can follow,
since that board runs at a pace where a person writing the email is still
viable.

---

${SECTIONS.map((sec, i) => section(i + 7, sec)).join('---\n\n')}
> **Needs Glenn:** payment terms for commercial work, and whether progress
> claims follow a percentage, a milestone, or a monthly cycle.

---

## ${SECTIONS.length + 7}. Build order

Do not build all ${count} at once. In order of what earns most:

${J.buildOrder.map((b, i) => `${i + 1}. **${b.ids}**, ${b.why.charAt(0).toLowerCase() + b.why.slice(1)}`).join('\n')}
`

/* ============================================================== TASKS */
const prio = { now: 'Act now', heads: 'Heads up', win: 'Win', fyi: 'Good to know' }
const alertsTable = J.alerts.map((a) => `| ${a.n} | **${a.name}** | ${a.trigger} | ${a.to} | ${a.channel} | ${a.why} |`).join('\n')
const alertBodies = J.alerts.map((a) => `### ${a.n}. ${a.name}

**Priority:** ${prio[a.prio]} · **To:** ${a.to} · **By:** ${a.channel}
**Fires when:** ${a.trigger}

${a.desc}

\`\`\`
${a.body}
\`\`\`${a.note ? '\n\n' + a.note : ''}`).join('\n\n')

const taskBlocks = (list, where) => list.map(({ stage, t }) => `### \`${t.title}\`

**${where}:** ${stage} · **Assigned:** ${t.role} · **Due:** ${t.due}

${t.desc}`).join('\n\n')
const collect = (pipeline) => {
  const out = []
  for (const s of pipeline.stages) for (const t of s.tasks || []) out.push({ stage: s.name, t })
  return out
}
const allTasks = [...collect(RES), ...collect(COM), ...(J.alwaysOn.tasks || []).map((t) => ({ stage: 'Any stage', t }))]
/* one description per distinct task title, so the same task appearing on both
   boards is written out once */
const seenTitle = new Set()
const uniqueTasks = allTasks.filter(({ t }) => (seenTitle.has(t.title) ? false : seenTitle.add(t.title)))

const taskTable = (pipeline) => {
  const rows = []
  for (const s of pipeline.stages) for (const t of s.tasks || []) rows.push(`| ${s.n}. ${s.name} | \`${t.title}\` | ${t.role} | ${t.due} |`)
  return rows.join('\n')
}
const alwaysTasks = (J.alwaysOn.tasks || []).map((t) => `| Any | \`${t.title}\` | ${t.role} | ${t.due} |`).join('\n')
let taskCount = (J.alwaysOn.tasks || []).length
for (const p of J.pipelines) for (const s of p.stages) taskCount += (s.tasks || []).length

const tasks = `# CRM Tasks and Notifications

What the team gets told, when, and what they are expected to do about it.
Revised after the client call on Friday 2 October 2026.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md) and
[CRM-MESSAGING.md](CRM-MESSAGING.md). Messaging covers what the *customer*
receives. This covers what *you* receive.

**Generated.** The alerts and tasks below are produced from
\`client-journey-onepage/journey-data.js\`, the same file that renders the
customer journey page, where each of them is shown under the stage it belongs
to. Edit the data file and run the generator. Editing this file by hand will be
overwritten.

Written as a template. Roles are tokenised, and every alert and task names a
role or "the team", never a person, so a new hire is a reassignment rather
than a rebuild.

---

## 1. The governing principle

> **A notification is a request to do something. If nothing needs doing, it is
> not a notification, it is a report.**

Reports go in the daily summary. Only actions interrupt.

This is the rule that decides everything below, and it is the one most CRM
builds get wrong. A system that pings on every stage change trains everyone to
ignore it inside a fortnight, and then the one alert that actually mattered gets
ignored too. There are ${J.alerts.length} real-time alerts in this document. After the
October call the list was reworked: the hour-long unattended lead alert became a
fifteen minute email to the office, the missed site visit alert went because
our own people attend every visit, and three were added: a customer saying the
booked date no longer works, a deposit unpaid at its due date, and anything
assigned to someone. The channel follows the role, as agreed on the call:
anything to the office arrives by email and in-app, never by text, so it sits
there unread until it is dealt with; anything to the owner arrives by text and
by email, so it is seen on site.

---

## 2. Roles

Set up as users on the platform, then referenced by role throughout so a change
of staff is a reassignment rather than a rewrite.

| Role | Who at SprayIT | Owns |
| --- | --- | --- |
${J.roles.map((r) => `| \`${r.key}\` | ${r.who} | ${r.owns} |`).join('\n')}

OWNER and ESTIMATOR are the same person, so the escalation ladder in §5 runs from
the office to the owner, which is a genuine second person.

**Assignment.** New Lead is assigned to the office on both boards. Moving a
card to Quoting assigns it to the owner, who is told by text and email (alert
14). If more
people take first calls later, switch that assignment to round robin.
Unassigned leads are the single most common way a lead dies: everybody assumes
somebody.

---

## 3. Real-time alerts

${J.alerts.length}. These interrupt. Everything else waits for the daily summary.

| # | Alert | Trigger | To | Channel | Why it interrupts |
| --- | --- | --- | --- | --- | --- |
${alertsTable}

### What each one says

Written so the person can act without opening the CRM. Someone standing on a
roof can read the first one and decide whether to climb down.

${alertBodies}

### What deliberately does not alert

Listed so nobody adds them back in later without a reason.

- Stage changes in general. Only a hand-over to someone, a quote accepted, a deposit landing, a No on a reminder and an unpaid deposit do.
- A customer not turning up. Our own people attend site visits, so there is no no-show.
- Emails opened or links clicked. Interesting, not actionable.
- Form views, page views, chat opens.
- Every message in a sequence sending as designed.
- Nurture activity of any kind.
- A Yes on a reminder. It is noted on the card, and that is all it needs.

---

## 4. Tasks

Alerts say *something happened*. Tasks say *you owe something*, and they persist
until closed. Anything with a deadline is a task, not an alert. ${taskCount} in
total across both boards.

### Naming convention

\`\`\`
[VERB] [WHO]: [WHAT]
\`\`\`

For example \`CALL Emma: new lead, Underfloor, Roof or ceiling\`. Verb first,
so a list of twenty tasks is scannable without opening any of them.

### Residential

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
${taskTable(RES)}

### Commercial & Industrial

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
${taskTable(COM)}

### Always on

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
${alwaysTasks}

### What each task says

Every task carries a title and a description. The title is what shows in a
list, so it leads with the verb. The description is what the person reads when
they open it, and it is written to be enough on its own: what to do, what has
already happened automatically, and what moving the card will trigger next.

${taskBlocks(uniqueTasks, 'Stage')}

### Two rules

1. **Every task has an owner and a due date.** The platform will let you create
   a task with neither. A task with no due date is a note.
2. **Completing the task does not move the card.** Moving the card is a
   separate, deliberate act. Otherwise the board reflects who is tidy about
   tasks rather than where jobs actually are.

---

## 5. Escalation

Two ladders. One for a lead nobody has rung, one for a card that has stopped
moving.

### Lead not called

| Elapsed | Action |
| --- | --- |
| 0 min | Assign to the office, alert, create the call task. Customer gets X-ACK-01. On commercial the owner is told at once (alert 6). |
| **15 min** | **No call logged: email to the office (alert 7)** |
| 60 min | Still no call: text and email to the owner, *this lead has been waiting since {{time}}* |
| Next morning | Listed at the top of the daily summary until a call is logged |

Business hours only, and it pauses overnight. A lead that arrives at 11pm starts
its clock when the office opens, otherwise everyone wakes to a false alarm and
starts ignoring the escalation.

### Stalled card

Uses the stall times from the pipeline document. On breach:

| Breach | Action |
| --- | --- |
| First | Task reappears at the top of the assigned user's list |
| 2× the stall time | Line item in the daily summary |
| 3× the stall time | Named in the weekly review, with the card |

Note the escalation is toward **visibility**, not more alarms. A card sitting in
Nurture for 40 days is not an emergency. It is a conversation to have on
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
  Quotes accepted        {{count}}, {{value}}

TODAY
  Inspections            {{list with time and address}}
  Installs               {{list with crew}}
  Phone calls booked     {{list with time}}
  Deposits due           {{list with amount}}

NEEDS YOU
  Leads not called       {{list}}
  Quotes to write        {{list, waiting in Quoting}}
  Callbacks due          {{list}}
  Installs to book       {{list, over 2 days in Booking Required}}
  Dates not confirmed    {{list, no Yes or No on either reminder}}
  Deposits unpaid        {{list with amount and due date}}
  Invoices to send       {{list, drafts not yet sent}}
  Invoices overdue       {{list with amount and days}}
  Job reports to send    {{list, paid but report not sent}}
  Retentions due         {{list with release date}}
\`\`\`

\`NEEDS YOU\` goes last on purpose. It is the section people act on, so it should
be the thing their eye lands on when they stop scrolling.

### Weekly, Monday 7:00am, to OWNER

\`\`\`
LAST WEEK, BOTH BOARDS
  Enquiries              {{count}}, by source
  Median time to first call
  Days in Quoting        {{average}}
  Closed as Unreachable  {{count}}
  Quotes sent            {{count}}, {{value}}
  Quotes accepted        {{count}}, {{value}}
  Lost                   {{count}}, by reason

PIPELINE NOW
  Open value             {{value}}      <- the forecast
  Accepted, not done     {{value}}      <- committed work
  Cards stalled 3x       {{list}}

DELIVERY
  Jobs completed         {{count}}
  Average days accepted to paid
  Invoices outstanding   {{value}}
  Retentions held        {{value}}
\`\`\`

The two pipeline lines are separated because each board runs the sale and the
job on the same card. An unfiltered pipeline figure adds work already sold to
work still being chased, so the digest never shows one. Both boards share stage
keys, so every line is one number across the business.

### Monthly, to OWNER

Cost per enquiry and cost per accepted job by \`utm_source\`, \`gclid\` and
\`fbclid\`, against **paid revenue**, not quotes sent. This is the number that
decides ad spend, and it only exists because attribution survives all the way
to payment.

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
| **Escalation** (§5) | The 15 minute threshold is worth tuning to their volume |
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

/* ============================================================ WORKFLOWS */
const stepMd = (st, depth) => {
  const pad = '  '.repeat(depth)
  const label = st.t.toUpperCase()
  let line
  switch (st.t) {
    case 'send': { const m = M[st.id]; line = `**${label}** \`${st.id}\` (${m ? (m.channel === 'sms' ? 'SMS' : 'Email: ' + m.subject) : 'unknown'})${st.note ? ', ' + st.note : ''}`; break }
    case 'task': line = `**${label}** \`${st.title}\` to ${st.role}, due ${st.due}${st.desc ? `  \n${pad}  *${st.desc}*` : ''}`; break
    case 'alert': { const a = J.alerts[st.n - 1]; line = `**${label}** ${st.n}, ${a.name}, to ${a.to} by ${a.channel}`; break }
    case 'wait': line = `**${label}** ${st.for}`; break
    case 'if': line = `**${label}** ${st.cond}`; break
    case 'move': line = `**${label}** stage to ${st.stage}`; break
    case 'set': line = `**${label}** \`${st.field}\` = ${st.value}`; break
    case 'stop': line = `**${label}** ${st.when}`; break
    default: line = `**${label}** ${st.text}`
  }
  let out = `${pad}- ${line}\n`
  if (st.t === 'if') {
    for (const s of st.then || []) out += stepMd(s, depth + 1)
    if (st.else && st.else.length) { out += `${pad}  - *otherwise*\n`; for (const s of st.else) out += stepMd(s, depth + 2) }
  }
  return out
}
const boardName = { both: 'Both boards', residential: 'Residential', commercial: 'Commercial & Industrial' }
const tagLine = (w) => {
  if (!w.tags) return ''
  const parts = []
  if (w.tags.add && w.tags.add.length) parts.push('adds ' + w.tags.add.map((t) => '`' + t + '`').join(', '))
  if (w.tags.remove && w.tags.remove.length) parts.push('removes ' + w.tags.remove.map((t) => '`' + t + '`').join(', '))
  return `**Tags:** ${parts.join('; ')}${w.tags.note ? ` (${w.tags.note})` : ''}  \n`
}
const wfMd = (w) => `### ${w.id} · ${w.name}

**Board:** ${boardName[w.board]}
**Trigger:** ${w.trigger}

${w.why ? w.why + '\n\n' : ''}${w.steps.map((s) => stepMd(s, 0)).join('')}
${tagLine(w)}**Stops:** ${w.stops}${w.error ? `  \n**On error:** ${w.error}` : ''}
`

/* Filed by journey phase, which is how somebody looks a workflow up. Build
   order is a separate list and stays one: it is a priority, and a priority
   makes a poor filing system. */
const workflowsMd = (J.folders || []).map((f) => {
  const mine = J.workflows.filter((w) => w.folder === f.n)
  return `## ${f.n} ${f.name}

${f.why}

${mine.length} workflow${mine.length === 1 ? '' : 's'}: ${mine.map((w) => w.id).join(', ')}

${mine.map(wfMd).join('\n')}`
}).join('\n---\n\n')

const sentBy = new Set()
const walkAll = (steps) => { for (const s of steps) { if (s.t === 'send') sentBy.add(s.id); if (s.then) walkAll(s.then); if (s.else) walkAll(s.else) } }
for (const w of J.workflows) walkAll(w.steps)
const manualIds = ids.filter((id) => M[id].manual)

const workflows = `# CRM Workflows

Every workflow to build in Systemations for the ${BRAND} journey,
written in the platform's own building blocks: a trigger, the steps in order,
the branches, and what stops it. Revised after the client call on Friday
2 October 2026.

**Generated.** This file is produced from
\`client-journey-onepage/journey-data.js\`, which also renders the agency
workflows page (\`client-journey-onepage/workflows.html\`). Edit the data
file and run \`npm run docs:crm\`. Editing this file by hand will be
overwritten.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md), [CRM-MESSAGING.md](CRM-MESSAGING.md)
and [CRM-TASKS-NOTIFICATIONS.md](CRM-TASKS-NOTIFICATIONS.md). Message ids,
alert numbers and task names below refer to those documents.

${J.workflows.length} workflows in ${(J.folders || []).length} folders. ${sentBy.size} of the ${count} messages are sent by them; the other
${manualIds.length} (${manualIds.join(', ')}) are saved templates sent by hand.

The whole-pipeline view across both boards is a saved view, not a workflow.
How to build it is in [CRM-PIPELINES.md](CRM-PIPELINES.md) §5.

## Step types

| Type | Meaning |
| --- | --- |
| DO | An action in the platform that is not one of the others: create a contact, map fields, assign, tag, reassign |
| SEND | Send a message from the kit, by id |
| TASK | Create a task, with owner and due date |
| ALERT | Fire one of the ${J.alerts.length} real-time alerts |
| WAIT | Pause for a duration, or until a time relative to an appointment or date |
| IF | Branch. Nested steps run when the condition holds; *otherwise* steps when it does not |
| MOVE | Change the opportunity stage |
| SET | Set a field or the status |
| STOP | End the workflow |

## Conventions that apply to every workflow

- **Stop on reply.** Every sales sequence checks for an inbound reply before each send and stops if one has arrived. WF-34 handles the pause; each sequence still needs its own exit condition. Reminders about an agreed date keep running.
- **Send window.** Anything the messaging kit marks "waits for the send window" sits behind a Wait until a time window step: 8am to 8pm, Monday to Saturday. Confirmations are exempt.
- **Acceptance kills sales.** WF-14 stops every sales sequence before it does anything else. Test it specifically: accept a quote mid-follow-up and confirm nothing further sends.
- **Add-on quotes.** WF-12 checks \`is-active-job\` before it moves anything. An accepted add-on or variation quote on a live job updates the value and tasks the office; it never resends the thank-you or moves the card.
- **Book in the platform first.** Install dates go in the calendar for the vehicle doing the job, never straight into the Apple calendar first, because WF-20 is what moves the card and starts the reminders and the deposit timing. There is one install calendar per vehicle, and one job can hold bookings on two.
- **Invoices are drafts.** WF-24 and WF-27 create deposit and final invoices as drafts with a task to the owner; WF-25 and WF-28 run only when the owner sends them. Nothing is invoiced automatically until Glenn asks for it.
- **Alerts follow the role.** Anything to the office by email and in-app, never SMS; anything to the owner by SMS and email. The checker enforces it.
- **No automatic rescheduling.** A No on a reminder alerts the team. Crews and rigs are moved by a person.
- **Error branches.** Every workflow gets an error branch that fires alert 11 with the workflow name and the contact.
- **Human labels.** Dropdown fields store the label, not the form value, or the echo emails read "new-build".
- **Required fields on entry.** Stages that need a field to send correctly require it on the stage change rather than reminding afterwards: callback time, inspection date, install date, deposit amount and foam order type, photos captured, invoice number, retention amount and release date.

---

${workflowsMd}`

/* ============================================================= PIPELINES */
/* Stages the AI may move a card into. Everything else is a person's call. */
const AI_MAY = ['new-lead', 'follow-up', 'nurture']
const phaseWord = { sale: 'Open, still winning the job', won: 'Set to Won here', job: 'Won, job underway' }
const stageTable = (p) => p.stages.map((s) => `| ${s.n} | **${s.name}** | ${s.means} | ${s.exits} | ${s.stalls || ''} |`).join('\n')
const bothTable = RES.stages.map((s, i) => `| ${s.n} | **${s.name}** | ${phaseWord[s.phase]} | ${s.means} | ${COM.stages[i].means} |`).join('\n')
const autoTable = RES.stages.map((s, i) => {
  const msgs = (st) => [...new Set((st.groups || []).flatMap((g) => g.messages))].join(', ') || 'none'
  const al = [...new Set([...(s.alerts || []), ...(COM.stages[i].alerts || [])])].sort((a, b) => a - b).join(', ') || 'none'
  return `| ${s.n}. ${s.name} | ${msgs(s)} | ${msgs(COM.stages[i])} | ${al} |`
}).join('\n')
const opFields = J.customFields.find((g) => /^Opportunity/.test(g.group))

const pipelines = `# CRM Pipelines: ${BRAND}

Pipeline and stage design for the Systemations build. Revised after the client
call on Friday 2 October 2026, which replaced "Contacting" with Dial 1 and
Dial 2, added Quoting for the hand-over to the owner, put Inspection Required
after acceptance, dropped the stages that did not fit the way the business
works, and put both boards on the same ${STAGES} stages.

This is the reference for three audiences: whoever configures Systemations, whoever runs
the board day to day, and the AI agent that will be allowed to move cards on it.

**Generated.** This file is produced from
\`client-journey-onepage/journey-data.js\`, the same file that renders the
customer journey page and the other three documents, so they cannot disagree.
Edit the data file and run \`npm run docs:crm\`. Editing this file by hand will
be overwritten.

---

## 1. Two boards, one shape

| Board | Covers | Stages |
| --- | --- | --- |
${J.pipelines.map((p) => `| **${p.name}** | ${p.blurb} | ${p.stages.length} |`).join('\n')}

Each one runs a job from first enquiry to final payment, and a job keeps the
same card for its whole life. Both boards carry the same ${STAGES} stages, with
the same names, in the same order, so a new hire learns one board and can read
the other, and the whole business can be read in one view (§5).

**Why two boards at all.** The stages are the same, but the detail is not. A
commercial job carries a company, a purchase order, SWMS, inductions, a site
contact, progress claims and often a retention, and it runs for months. Keeping
the boards apart keeps those cards from cluttering the residential work, and it
lets every figure be read by sector as well as in total.

---

## 2. The ${STAGES} stages

${RES.stages.map((s) => s.name).join(' > ')}.

| # | Stage | Status | Residential: it means | Commercial: it means |
| --- | --- | --- | --- | --- |
${bothTable}

The names are written so somebody new can read the board without training. A
dial is a call attempt, not a conversation, which is why Contacting became
Dial 1 and Dial 2.

### How a card moves

${MOVES.map(([k, v]) => `- **${k}.** ${v}`).join('\n')}

---

## 3. ${RES.name}

| # | Stage | It means | Exits when | Stalls after |
| --- | --- | --- | --- | --- |
${stageTable(RES)}

### The stages that carry weight

- **New Lead exists to be measured.** Time to first call is the single biggest lever in the pipeline, and the 15 minute timer is what protects it.
- **Dial 1 and Dial 2 are capped.** Two rounds of calls and a text, then three emails over a week, then Lost with the reason Unreachable. Nothing rots.
- **Quoting makes the hand-over visible.** Once the office has spoken to them and they want a quote, the card is assigned to the owner, who gets a text and an email. Anyone can see the job is waiting on the quote.
- **Quote Sent carries the buttons.** The accept button moves the card and records the option chosen, so most acceptances need nobody to touch the board.
- **Inspection Required comes after the yes.** Most jobs are quoted from the call; where the area is uncertain the quote covers the worst case, and the visit happens once the customer is happy with the price.
- **Booking Required is separate from Quote Accepted** because an inspection can sit between them, and because a job waiting for a date should be visible as exactly that. One calendar per vehicle.
- **Deposit Requested is timed to the job, not the booking.** A job booked months out gets no invoice until two weeks before, and then only once the owner has checked the draft and sent it.
- **Job Completed is where the money and the paperwork meet.** A draft final invoice for the owner on completion; job report and certificates only once it is paid; and the owner's call on whether to ask for a review.

---

## 4. ${COM.name}

| # | Stage | It means | Exits when | Stalls after |
| --- | --- | --- | --- | --- |
${stageTable(COM)}

**What is different on commercial.** The first email asks for the five things
that make the scoping call useful, and in Quoting the owner nearly always rings
for more detail before pricing. Inspections need inductions, PPE and a site
contact. The proposal can be accepted online, by a signed acceptance or by a
purchase order, and a verbal yes is never counted as Won. Job Booked carries the
mobilisation email with SWMS and insurances, inductions, a 6:30am text to the
site contact each site day, weekly progress on staged jobs and progress claims.
A reference is asked for instead of relying on a Google review, and repeat
clients such as Bondor and Australian Housing are set to No for the review
request. Retentions of six to twelve months are common.

---

## 5. ${J.overview.title}

${J.overview.lede}

How to build it:

${J.overview.build.map((b, i) => `${i + 1}. ${b}`).join('\n')}

---

## 6. Status, the Won line, and Lost reasons

Do not build "Won" or "Lost" stages. Status already carries it, building it
twice double-counts, and it breaks the built-in conversion reporting. Quote
Accepted is a real stage where the status is set, not a marker.

- **Won** when the card enters Quote Accepted. On residential, any acceptance: the button, a phone call or a purchase order. On commercial, a written acceptance or a purchase order; a verbal yes waits in Quote Accepted, status Open, until the paperwork lands.
- **Lost** with a reason, always. A Lost with no reason teaches nothing.
- **Abandoned** for duplicates, spam and wrong numbers, so they stay out of the conversion maths entirely.

| Question | Where the answer lives |
| --- | --- |
| What might we win? | Open cards, stages 1 to 7 |
| What have we committed to deliver? | Won cards, stages 8 to 14 |
| What is the forecast worth? | **Open only.** Never the whole board. |

### Lost reasons (fixed list, single select)

Price · Went with another contractor · Chose batts or another product ·
Timing, project deferred · Outside service area · Not suitable for spray foam ·
Unreachable · Not the decision maker · Budget withdrawn · Cancelled after
acceptance · Duplicate · Spam

The distinction between *Price* and *Chose batts* is the one worth having. They
point at completely different fixes, and the R-value explainer on the site
exists to answer the second one. A "not now" is Nurture, not Lost.

---

## 7. Opportunity value

| Stage | What value to carry |
| --- | --- |
| New Lead to Quoting, and Follow-Up before a quote | Zero |
| Quote Sent onward | The quoted figure; on a job with options, the option most likely to be chosen |
| Quote Accepted onward | The accepted option, plus accepted add-ons and signed variations |
| Nurture | The last quoted figure, so the forecast of returning work is visible |

Commercial ranges from small to millions, which is too wide to forecast from,
so those cards carry nothing until a real number exists.

---

## 8. Deposits, invoices and payment

${MONEY.map(([k, v]) => `- **${k}** ${v}`).join('\n')}

---

## 9. Routing: which board a lead enters

Routed automatically on \`propertyType\` from the webhook payload.

| \`propertyType\` | Board |
| --- | --- |
| \`home\`, \`new-build\` | Residential |
| \`shed\` | Residential |
| \`factory\` | Commercial & Industrial |
| \`farm\` | Commercial & Industrial |
| \`other\` | Residential, plus a review task to confirm |

Override rule: any enquiry whose message mentions a tender, a builder or head
contractor, or an area over 500 sqm, goes to Commercial regardless of
\`propertyType\`. A card that turns out to be on the wrong board gets moved, not
recreated. Moving preserves the attribution and the consent record, and because
the stage keys match, it lands in the same stage on the other board.

---

## 10. Opportunity fields

The full field list, contact and opportunity, is in
[CRM-MESSAGING.md](CRM-MESSAGING.md) §3. These are the ones the stages set.

| ${opFields.columns.join(' | ')} |
| ${opFields.columns.map(() => '---').join(' | ')} |
${opFields.rows.map((r) => `| ${r.map((c, ci) => (ci === 0 ? c.split(', ').map((k) => '`' + k + '`').join(', ') : c)).join(' | ')} |`).join('\n')}

---

## 11. Automation per stage

Message ids refer to [CRM-MESSAGING.md](CRM-MESSAGING.md), alert numbers to
[CRM-TASKS-NOTIFICATIONS.md](CRM-TASKS-NOTIFICATIONS.md), and the workflows that
send them are in [CRM-WORKFLOWS.md](CRM-WORKFLOWS.md).

| Stage | Residential messages | Commercial messages | Alerts |
| --- | --- | --- | --- |
${autoTable}
| Any time | ${(J.alwaysOn.groups || []).flatMap((g) => g.messages).join(', ')} | same | ${(J.alwaysOn.alerts || []).join(', ')} |

Two rules that matter more than the table:

1. **Every sales sequence stops the moment the person replies.** A sequence that
   keeps firing after someone has answered is the fastest way to turn a won job
   into a complaint. Reminders about an agreed date keep running.
2. **Entering Quote Accepted kills every sales sequence on the card**, and an
   add-on quote on a live job never re-fires it.

---

## 12. What the AI agent may and may not do

The voice and chat agents share the boards with the team. That only works if
the boundary is explicit: the AI works the first conversation and never touches
a quote, a price, a booking date or money.

**The AI may**

- Create the opportunity at New Lead
- Answer questions the site already answers: what spray foam is, open cell against closed cell, what the process looks like, service area
- Book, reschedule and cancel in the phone call calendar
- Move a card to Follow-Up with a callback time when someone asks to be rung later
- Move a card to Nurture when someone says not now
- Send reminders and confirmations

**The AI may not**

- Send a quote, or state a price, a firm lead time, or a performance figure
- Set or change the opportunity value
- Set any status: not Won, not Lost, not Abandoned
- Move any card to Quote Accepted or beyond, on either board
- Book an install date, or touch a deposit, an invoice or a retention
- Promise compliance, suitability or warranty outcomes for a specific building

**Escalate to a person immediately**

- Any commercial enquiry, once identified as commercial
- Any request for a firm price
- Anything mentioning a complaint, insurance, legal, or an existing job
- Any contact about a booked job, including "where is the crew" or "I need to change the date"
- An unhappy customer, at any point
- Anything the agent has answered twice without the person accepting the answer

---

## 13. Compliance the pipeline has to respect

${J.compliance.map((c) => `- **${c.title}.** ${c.body}`).join('\n')}
- **Do Not Call Register.** Applies to cold outbound, not to someone who enquired. Any purchased or scraped list needs washing first.
- **Australian Consumer Law.** Any performance claim the agent makes has to be substantiated. This is the same reason the R-value figure on the site is gated behind sign-off rather than published.

---

## 14. Reports worth watching

Every value report below filters on **status**. On a board that runs the sale
and the job together, an unfiltered figure is meaningless.

1. **Time to first call** on New Lead. The one number that moves everything else.
2. **Dial 1 and Dial 2 outcomes.** How many leads answer the text, the day 4 booking link, or the close-off, and how many close as Unreachable.
3. **Open pipeline value**, status Open only. This is the forecast.
4. **Committed work**, status Won and not yet closed. This is the schedule, and the cash coming.
5. **Quote Sent to Quote Accepted**, by board and by source. Measure conversion across the sales stages only.
6. **Online acceptance rate.** How many acceptances come from the button rather than a phone call.
7. **Days in Quoting and in Booking Required.** Both should be under two business days, five for commercial quotes.
8. **Reminder answers.** Yes, No and no answer, and how many Nos turn into a new date.
9. **Days from acceptance to final payment**, and deposits paid late.
10. **Lost reason mix.** Watch the ratio of *Price* to *Chose batts*.
11. **Nurture returns.** Cards that come back to Quoting after six, twelve and twenty-four months.
12. **Paid revenue by \`utm_source\` / \`gclid\` / \`fbclid\`.** The attribution fields survive all the way to payment, so ad spend can be judged on money received rather than on form fills.

---

## 15. Open items to confirm with Glenn

${OPEN_ITEMS.map((s) => `- ${s}`).join('\n')}
`

/* ======================================================= PIPELINES PAGE */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const pipelinesHtmlPath = ROOT + 'client-journey-onepage/docs/pipelines.html'
const existingPipes = fs.readFileSync(pipelinesHtmlPath, 'utf8')
const pipesHeadEnd = existingPipes.indexOf('</head>')
if (pipesHeadEnd < 0) { console.error('docs/pipelines.html: no </head>'); process.exit(1) }
const pipesHead = existingPipes.slice(0, pipesHeadEnd + '</head>'.length)

const flowHtml = (p, rail) => p.stages.map((s) => {
  const line = p.wonAt === s.key ? '        <li class="wonline" aria-hidden="true"><b>Won<br>line</b></li>\n' : ''
  const urgent = s.key === 'new-lead'
  return line + `        <li class="stage${s.phase === 'job' ? ' sold' : ''}"><span class="stage-n">${AI_MAY.includes(s.key) ? '<span class="ai-dot"></span>' : ''}${String(s.n).padStart(2, '0')}</span><span class="stage-name">${esc(s.name)}</span><span class="rot${urgent ? ' rot-urgent' : ''}">${esc((s.stalls || '').toLowerCase())}</span></li>`
}).join('\n')

const boardHtml = (p, rail, n, id) => `  <section id="${id}">
    <div class="sec-head"><span class="sec-n">${n}</span><h2>${esc(p.name)}</h2></div>

    <div class="board">
      <div class="board-top">
        <span class="board-name">${esc(p.name)}</span>
        <span class="board-note">${esc(p.blurb.split('.')[0])} &middot; ${p.stages.length} stages</span>
      </div>
      <ol class="flow ${rail}">
${flowHtml(p, rail)}
      </ol>
      <div class="legend">
        <span><span class="ai-dot"></span> AI may move a card here</span>
        <span><span class="swatch-sold"></span> already sold, status Won</span>
        <span class="rot-urgent mono">red = the clock that matters</span>
      </div>
    </div>

    <div class="t-scroll" style="margin-top:1rem">
      <table>
        <thead><tr><th>Stage</th><th>It means</th><th>Exits when</th><th>Stalls after</th></tr></thead>
        <tbody>
${p.stages.map((s) => (p.wonAt === s.key ? `          <tr class="divider"><td colspan="4">Won is set here${p.id === 'commercial' ? ', on a written acceptance or a purchase order' : ', on acceptance'}</td></tr>\n` : '') + `          <tr><td>${s.n}. ${esc(s.name)}</td><td>${esc(s.means)}</td><td>${esc(s.exits)}</td><td class="${s.key === 'new-lead' ? 'urgent' : 'num'}">${esc(s.stalls || '')}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
  </section>
`

const pipelinesHtml = `${pipesHead}
<body>

<header class="masthead">
  <div class="masthead-inner">
    <p class="kicker">${esc(BRAND)} &middot; Systemations &middot; Doc 1 of 3</p>
    <h1>Two boards, the same ${STAGES} stages, and what every stage is for</h1>
    <p class="standfirst">
      One board for residential, one for commercial, each running a job from first
      enquiry to final payment on the same card. Revised after the client call on
      Friday 2 October 2026: Contacting became Dial 1 and Dial 2, Quoting was added for
      the hand-over to the owner, Inspection Required moved after acceptance, and both
      boards now share one shape, so the whole business reads in a single view.
    </p>
    <div class="meta">
      <div><b>Prepared for</b><span>${esc(J.meta.preparedFor)}</span></div>
      <div><b>System</b><span>Systemations</span></div>
      <div><b>Status</b><span>Revised, for review</span></div>
      <div><b>Source of truth</b><span class="mono">journey-data.js</span></div>
    </div>
  </div>
</header>

<div class="wrap">

  <section id="shape">
    <div class="sec-head"><span class="sec-n">01</span><h2>Two boards, one shape</h2></div>
    <div class="stack">
      <div class="t-scroll">
        <table>
          <thead><tr><th>Board</th><th>Covers</th><th>Stages</th></tr></thead>
          <tbody>
${J.pipelines.map((p) => `            <tr><td>${esc(p.name)}</td><td>${esc(p.blurb)}</td><td class="num">${p.stages.length}</td></tr>`).join('\n')}
          </tbody>
        </table>
      </div>
      <div class="why">
        <h4>Why two boards with the same stages</h4>
        <p>
          The stages are the same, so somebody new learns one board and can read the other,
          and the whole business can be read in one view. The detail is not the same: a
          commercial job carries a company, a purchase order, SWMS, inductions, a site
          contact, progress claims and often a retention, and it runs for months. Keeping
          the boards apart keeps those cards from cluttering the residential work.
        </p>
      </div>
    </div>
  </section>

  <section id="stages">
    <div class="sec-head"><span class="sec-n">02</span><h2>The ${STAGES} stages</h2></div>
    <div class="stack">
      <div class="t-scroll">
        <table>
          <thead><tr><th>#</th><th>Stage</th><th>Status</th><th>Residential: it means</th><th>Commercial: it means</th></tr></thead>
          <tbody>
${RES.stages.map((s, i) => `            <tr><td class="num">${s.n}</td><td><b>${esc(s.name)}</b></td><td>${esc(phaseWord[s.phase])}</td><td>${esc(s.means)}</td><td>${esc(COM.stages[i].means)}</td></tr>`).join('\n')}
          </tbody>
        </table>
      </div>
      <p class="fine">A dial is a call attempt, not a conversation, which is why Contacting became Dial 1 and Dial 2. The names are written so somebody new can read the board without training.</p>
      <h3>How a card moves</h3>
      <ul class="plain">
${MOVES.map(([k, v]) => `        <li><b>${esc(k)}.</b> ${esc(v)}</li>`).join('\n')}
      </ul>
    </div>
  </section>

${boardHtml(RES, 'rail-res', '03', 'residential')}
${boardHtml(COM, 'rail-com', '04', 'commercial')}
  <section id="overview">
    <div class="sec-head"><span class="sec-n">05</span><h2>${esc(J.overview.title)}</h2></div>
    <div class="stack">
      <p>${esc(J.overview.lede)}</p>
      <ol class="plain">
${J.overview.build.map((b) => `        <li>${esc(b)}</li>`).join('\n')}
      </ol>
    </div>
  </section>

  <section id="status">
    <div class="sec-head"><span class="sec-n">06</span><h2>Status, the Won line, and Lost reasons</h2></div>
    <div class="stack">
      <div class="keystone">
        <p class="big">The job is Won when the card enters Quote Accepted.</p>
        <p class="sub">On residential, any acceptance: the button, a phone call or a purchase order. On commercial, a written acceptance or a purchase order; a verbal yes waits in Quote Accepted, status Open, until the paperwork lands. Quote Accepted is a real stage, not a marker, and there are no Won or Lost stages.</p>
      </div>
      <ul class="plain">
        <li><b>Lost</b> with a reason, always. A Lost with no reason teaches nothing. A not now is Nurture, not Lost.</li>
        <li><b>Abandoned</b> for duplicates, spam and wrong numbers, so they stay out of the conversion maths entirely.</li>
      </ul>
      <h3>Lost reasons, fixed list, single select</h3>
      <div class="chips">
${['Price', 'Went with another contractor', 'Chose batts or another product', 'Timing, project deferred', 'Outside service area', 'Not suitable for spray foam', 'Unreachable', 'Not the decision maker', 'Budget withdrawn', 'Cancelled after acceptance', 'Duplicate', 'Spam'].map((r) => `        <span class="chip">${esc(r)}</span>`).join('\n')}
      </div>
    </div>
  </section>

  <section id="money">
    <div class="sec-head"><span class="sec-n">07</span><h2>Deposits, invoices and payment</h2></div>
    <ul class="plain">
${MONEY.map(([k, v]) => `      <li><b>${esc(k)}</b> ${esc(v)}</li>`).join('\n')}
    </ul>
  </section>

  <section id="automation">
    <div class="sec-head"><span class="sec-n">08</span><h2>What fires at each stage</h2></div>
    <p class="fine" style="margin-bottom:1rem">Message ids refer to the Messaging Kit, alert numbers to Alerts and Tasks. The customer journey page shows each of these under its stage, for both boards.</p>
    <div class="t-scroll">
      <table>
        <thead><tr><th>Stage</th><th>Residential messages</th><th>Commercial messages</th><th>Alerts</th></tr></thead>
        <tbody>
${RES.stages.map((s, i) => {
  const msgs = (st) => [...new Set((st.groups || []).flatMap((g) => g.messages))].join(', ') || 'none'
  const al = [...new Set([...(s.alerts || []), ...(COM.stages[i].alerts || [])])].sort((a, b) => a - b).join(', ') || 'none'
  return `          <tr><td>${s.n}. ${esc(s.name)}</td><td class="mono">${esc(msgs(s))}</td><td class="mono">${esc(msgs(COM.stages[i]))}</td><td class="mono">${esc(al)}</td></tr>`
}).join('\n')}
        </tbody>
      </table>
    </div>
  </section>

  <section id="ai">
    <div class="sec-head"><span class="sec-n">09</span><h2>What the AI is allowed to do</h2></div>
    <div class="cols">
      <div class="rule rule-yes">
        <h4>The AI may</h4>
        <ul>
          <li>Create the opportunity at New Lead</li>
          <li>Answer what the site already answers: what spray foam is, open cell against closed cell, the process, the service area</li>
          <li>Book, reschedule and cancel in the phone call calendar</li>
          <li>Move a card to Follow-Up with a callback time, or to Nurture when someone says not now</li>
        </ul>
      </div>
      <div class="rule rule-no">
        <h4>The AI may not</h4>
        <ul>
          <li>Send a quote, or state a price, a firm lead time, or a performance figure</li>
          <li>Set or change the value, or any status</li>
          <li><b>Move any card to Quote Accepted or beyond, on either board</b></li>
          <li>Book an install date, or touch a deposit, an invoice or a retention</li>
        </ul>
      </div>
      <div class="rule rule-esc">
        <h4>Escalate to a person immediately</h4>
        <ul>
          <li>Any commercial enquiry, once identified as commercial</li>
          <li>Any request for a firm price</li>
          <li>Anything about a booked job, including a change of date</li>
          <li>A complaint, insurance or legal question, or an unhappy customer</li>
        </ul>
      </div>
    </div>
  </section>

  <section id="open">
    <div class="sec-head"><span class="sec-n">10</span><h2>Open items to confirm with Glenn</h2></div>
    <div class="rule rule-esc">
      <ul>
${OPEN_ITEMS.map((s) => `        <li>${esc(s)}</li>`).join('\n')}
      </ul>
    </div>
  </section>

</div>

</body>
</html>
`

/* ---------------------------------------------------------------- write */
const guard = (name, text) => {
  const dashes = (text.match(/\u2014/g) || []).length
  const vendor = (text.match(/GoHighLevel|HighLevel|LeadConnector|\bGHL\b/g) || []).length
  const oldName = (text.match(/Spray It|Sprayit\b/g) || []).length
  if (dashes || vendor || oldName) { console.error(`${name}: ${dashes} em dashes, ${vendor} vendor mentions, ${oldName} old business name`); process.exit(1) }
}
guard('messaging', messaging)
guard('tasks', tasks)
guard('workflows', workflows)
guard('pipelines', pipelines)
guard('pipelines page', pipelinesHtml)
fs.writeFileSync(ROOT + 'CRM-MESSAGING.md', messaging)
fs.writeFileSync(ROOT + 'CRM-TASKS-NOTIFICATIONS.md', tasks)
fs.writeFileSync(ROOT + 'CRM-WORKFLOWS.md', workflows)
fs.writeFileSync(ROOT + 'CRM-PIPELINES.md', pipelines)
fs.writeFileSync(pipelinesHtmlPath, pipelinesHtml)
console.log(`CRM-MESSAGING.md: ${count} messages (${emails} email, ${count - emails} sms), ${trade.length} trade-specific, ${mktg.length} marketing`)
console.log(`CRM-TASKS-NOTIFICATIONS.md: ${J.alerts.length} alerts, ${taskCount} tasks`)
console.log(`CRM-WORKFLOWS.md: ${J.workflows.length} workflows, ${sentBy.size} messages sent by them`)
console.log(`CRM-PIPELINES.md and docs/pipelines.html: ${J.pipelines.length} boards of ${STAGES} stages`)
