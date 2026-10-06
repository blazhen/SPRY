/**
 * Regenerates client-journey-onepage/docs/messaging.html from journey-data.js.
 * Keeps the page's own head and stylesheet, replaces everything after it.
 * Usage: node scripts/gen-messaging-page.mjs
 */
import fs from 'node:fs'
import vm from 'node:vm'

import path from 'node:path'
import { fileURLToPath } from 'node:url'
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/'
const SCRATCH = REPO + 'client-journey-onepage/docs/'
const ROOT = REPO
const journeyUrl = process.argv[2] || '../index.html'

const existing = fs.readFileSync(SCRATCH + 'messaging.html', 'utf8')
const headEnd = existing.indexOf('</style>') + '</style>'.length
const head = existing.slice(0, headEnd)

const sandbox = { window: {} }
vm.runInNewContext(fs.readFileSync(ROOT + 'client-journey-onepage/journey-data.js', 'utf8'), sandbox)
const J = sandbox.window.JOURNEY
const M = J.messages
const ids = Object.keys(M)
const count = ids.length
const trade = ids.filter((id) => M[id].reuse === 'TRADE')
const mktg = ids.filter((id) => M[id].type === 'MKTG')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tag = (cls, label) => `<span class="tag tag-${cls}">${label}</span>`

const stagesUsing = (id) => {
  const out = []
  for (const p of J.pipelines) for (const s of p.stages) for (const g of s.groups || []) if (g.messages.includes(id)) out.push(`${p.short} · ${s.name}`)
  for (const g of J.alwaysOn.groups || []) if (g.messages.includes(id)) out.push('Always on')
  return [...new Set(out)]
}

const FROM_KEY = { contact: 'from_name_contact', brand: 'from_name_brand' }
const fromLine = (m) => `{{custom_values.${FROM_KEY[m.from] || 'from_name_brand'}}} &lt;{{custom_values.business_email}}&gt;`
const cv = (k) => (J.customValues.find((v) => v.key === k) || {}).value

const msg = (id) => {
  const m = M[id]
  let h = `    <article class="msg">
      <div class="msg-head">
        <span class="msg-id">${id}</span>
        ${tag(m.channel === 'sms' ? 'sms' : 'eml', m.channel === 'sms' ? 'SMS' : 'Email')}${tag(m.type === 'TRANS' ? 'trans' : 'mktg', m.type === 'TRANS' ? 'Trans' : 'Mktg')}${tag(m.reuse === 'CORE' ? 'core' : 'trade', m.reuse === 'CORE' ? 'Core' : 'Trade')}
        <span class="msg-when">${esc(m.trigger)}, ${esc(m.delay.toLowerCase())}${m.manual ? ', manual send' : ''}</span>
      </div>\n`
  if (m.channel === 'email') {
    h += `      <div class="msg-subject"><b>From</b>${fromLine(m)}</div>\n`
    h += `      <div class="msg-subject"><b>Reply-to</b>{{custom_values.business_email}}</div>\n`
    h += `      <div class="msg-subject"><b>Subject</b>${esc(m.subject)}</div>\n`
    h += `      <div class="msg-subject"><b>Preheader</b>${esc(m.preheader)}</div>\n`
  }
  let body = m.body
  if (m.sig) body += '\n\n' + m.sig.join('\n')
  if (m.footer) body += '\n\n' + m.footer
  h += `      <pre class="msg-body">${esc(body)}</pre>\n`
  h += `      <p class="msg-note"><b>Stops:</b> ${esc(m.stops)} <b>Window:</b> ${m.window === 'immediate' ? 'sends immediately.' : 'waits for the send window.'}${m.note ? ' ' + esc(m.note) : ''}</p>\n`
  h += `    </article>\n`
  return h
}

/* Journey order. Every message lands in exactly one section, or the page is
   not written: a page that silently drops a message is worse than none.
   Entries are exact ids or id prefixes. */
const SECTIONS = [
  ['06', 'shared', 'Shared: first contact, Dial 1 and Dial 2', ['X-ACK', 'DIAL', 'X-APPT', 'X-INSP'], 'Used by both boards: the acknowledgement, the tried-to-call text, the three Dial 2 emails, the phone call booking and the site inspection.'],
  ['07', 'residential', 'Residential: quote to decision', ['R-QUOTE', 'R-FU', 'LOST']],
  ['08', 'nurture', 'Nurture', ['NUR'], 'Marketing. Sends only when <code>consent_marketing</code> is <code>yes</code>. Every one carries an unsubscribe.'],
  ['09', 'booked', 'Quote accepted, booking and reminders', ['X-ACC', 'JOB-01', 'JOB-02', 'REM', 'JOB-04', 'JOB-06']],
  ['10', 'deposit', 'Deposit', ['DEP'], 'Timed to the install date and the foam, never to the booking.'],
  ['11', 'completed', 'Job completed and payment', ['JOB-05', 'PAY', 'RPT', 'REV']],
  ['12', 'retention', 'Retention', ['RET']],
  ['13', 'system', 'Always on', ['SYS']],
  ['14', 'commercial', 'Commercial', ['C-'], 'Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.'],
]
const inSection = (prefixes) => ids.filter((x) => prefixes.some((p) => x === p || x.startsWith(p)))
{
  const seen = new Map()
  for (const s of SECTIONS) for (const id of inSection(s[3])) {
    if (seen.has(id)) { console.error(id + ' is in two sections'); process.exit(1) }
    seen.set(id, s[2])
  }
  const loose = ids.filter((id) => !seen.has(id))
  if (loose.length) { console.error('messages in no section: ' + loose.join(', ')); process.exit(1) }
}
const section = (n, id, title, prefixes, intro) => {
  const members = inSection(prefixes)
  return `  <section id="${id}">
    <div class="sec-head"><span class="sec-n">${n}</span><h2>${title}</h2></div>
${intro ? `    <div class="stack"><p>${intro}</p></div>\n` : ''}${members.map(msg).join('\n')}  </section>\n`
}

const inventoryRows = ids.map((id) => {
  const m = M[id]
  return `          <tr><td><code>${id}</code></td><td>${m.channel === 'sms' ? 'SMS' : 'Email'}</td><td>${esc(m.trigger)}<br><span class="fine">${esc(m.delay)}</span></td><td>${tag(m.type === 'TRANS' ? 'trans' : 'mktg', m.type === 'TRANS' ? 'Trans' : 'Mktg')}</td><td>${tag(m.reuse === 'CORE' ? 'core' : 'trade', m.reuse === 'CORE' ? 'Core' : 'Trade')}</td><td>${esc(stagesUsing(id).join(', '))}</td></tr>`
}).join('\n')

const AGENCY_WORDS = /another client|other client|new client|reus(e|able)|sub-account|tokenis/i
const fieldsHtml = () => J.customFields.map((grp) => {
  const note = grp.note && !AGENCY_WORDS.test(grp.note) ? `<p class="fine" style="margin-top:.7rem">${esc(grp.note)}</p>` : ''
  return `    <h3>${esc(grp.group)}</h3>\n    <div class="t-scroll">\n      <table>\n        <thead><tr>${grp.columns.map((c) => '<th>' + esc(c) + '</th>').join('')}</tr></thead>\n        <tbody>\n${grp.rows.map((r) => '          <tr>' + r.map((c, i) => '<td>' + (i === 0 ? c.split(', ').map((k) => '<code>' + esc(k) + '</code>').join(', ') : esc(c)) + '</td>').join('') + '</tr>').join('\n')}\n        </tbody>\n      </table>\n    </div>\n${note}`
}).join('\n')

const valuesRows = J.customValues.map((v) => `            <tr><td><code>${v.key}</code></td><td>${esc(v.value)}</td><td>${esc(v.note)}</td></tr>`).join('\n')

const journeyLine = journeyUrl
  ? `The visual companion is the <a href="${journeyUrl}">customer journey page</a>: every message below as the customer would receive it, stage by stage, with the alerts and tasks behind each one. Its Fields mode shows the raw merge fields and its Copy button hands over the template text ready to paste.`
  : `The visual companion is the customer journey page: every message below as the customer would receive it, stage by stage, with the alerts and tasks behind each one.`

const body = `

<header class="masthead">
  <div class="masthead-inner">
    <p class="kicker">${esc(J.brand.name)} &middot; Systemations &middot; Doc 2 of 3</p>
    <h1>Every message the pipelines send</h1>
    <p class="standfirst">
      ${count} SMS and emails with their sender, subject and preheader, the custom fields they
      read from, and the values every message draws its names, numbers and links from.
      Change a value once and every message that uses it follows.
    </p>
    <div class="meta">
      <div><b>Prepared for</b><span>${esc(J.meta.preparedFor)}</span></div>
      <div><b>System</b><span>Systemations</span></div>
      <div><b>Messages</b><span>${count}</span></div>
      <div><b>Source of truth</b><span class="mono">journey-data.js</span></div>
    </div>
  </div>
</header>

<div class="wrap">

  <section id="template">
    <div class="sec-head"><span class="sec-n">01</span><h2>How the kit is organised</h2></div>
    <div class="stack">
      <p>${journeyLine}</p>
      <ol class="plain">
        <li>The values in &sect;2 are set once. Every message reads your name, number and links from them.</li>
        <li>The fields in &sect;3 are what the website sends and what the team fills in as a job moves.</li>
        <li>Messages tagged ${tag('core', 'Core')} use wording that does not depend on the product.</li>
        <li>Messages tagged ${tag('trade', 'Trade')} are written around spray foam itself: the R-value explanation, the preparation list, the completion notes. They are the ones to revisit if the product range or the process changes.</li>
      </ol>
      <p>
        Of the ${count}, ${trade.length} are written around the product: ${trade.join(', ')}.
      </p>
      <h3>Sender identity</h3>
      <p>
        Every email carries a From name, a From address and a Reply-to. Two From names are used:
        <code>from_name_contact</code>, "${esc(cv('from_name_contact'))}", on anything personal, signed
        ${esc(cv('contact_name'))} with the mobile ${esc(cv('contact_mobile'))}, and
        <code>from_name_brand</code>, "${esc(cv('from_name_brand'))}", on confirmations, reminders, invoices and
        paperwork, signed with the business name and the business line. Messages are written as the business,
        "we", and "ring us" lines use the mobile, because Rachael handles about 99% of customer contact.
        Both send from <code>business_email</code>. The sending domain needs SPF and DKIM before
        go-live, or the first thing the customer sees is a spam warning.
      </p>
      <h3>Preheaders</h3>
      <p>
        Every email has one. It is the grey line the inbox shows under the subject, and on a phone
        it is most of what the reader sees before deciding whether to open. They complete the
        subject rather than repeat it, and stay under 110 characters.
      </p>
      <div class="ask">
        <b>A warning about tokens.</b> The platform has changed token names between releases,
        particularly the appointment ones. Treat every token below as <em>what to look for
        in the dropdown</em>, not as a guaranteed string. Confirm each against your Systemations
        version and send yourself a test before go-live. A token that does not resolve
        sends the raw <code>{{...}}</code> text to the customer.
      </div>
    </div>
  </section>

  <section id="values">
    <div class="sec-head"><span class="sec-n">02</span><h2>Custom Values: the swap layer</h2></div>
    <div class="stack">
      <p>
        Under <b>Settings &rarr; Custom Values</b>. This is the whole template mechanism:
        change these ${J.customValues.length} values and every message works for a different client.
      </p>
      <div class="t-scroll">
        <table>
          <thead><tr><th>Custom value</th><th>${esc(J.brand.name)}</th><th>Notes</th></tr></thead>
          <tbody>
${valuesRows}
          </tbody>
        </table>
      </div>
      <div class="ask">
        <b>Needs Glenn:</b> trading hours. Rachael's mobile, ${esc(cv('contact_mobile'))}, was confirmed by Glenn on
        the 2 October call. There is deliberately no ABN value: quotes and invoices are documents the business
        issues itself and they carry it.
      </div>
    </div>
  </section>

  <section id="fields">
    <div class="sec-head"><span class="sec-n">03</span><h2>Custom fields</h2></div>

${fieldsHtml()}
  </section>

  <section id="compliance">
    <div class="sec-head"><span class="sec-n">04</span><h2>The compliance line</h2></div>
    <div class="stack">
      <div class="cols">
        <div class="rule rule-yes">
          <h4>${tag('trans', 'Transactional')}</h4>
          <ul>
            <li>About an enquiry, appointment or job the person already has with us</li>
            <li>No marketing consent required</li>
            <li>No unsubscribe required</li>
            <li>Still identifies the sender</li>
          </ul>
        </div>
        <div class="rule rule-no">
          <h4>${tag('mktg', 'Marketing')}</h4>
          <ul>
            <li>Promotional. ${mktg.length} of the ${count}: ${mktg.join(', ')}. None is an SMS.</li>
            <li>Sends <b>only</b> when <code>consent_marketing</code> is <code>yes</code></li>
            <li>Must carry a functional unsubscribe</li>
            <li>This is the entire reason the consent fields exist</li>
          </ul>
        </div>
      </div>

      <h3>Three rules that apply to every message</h3>
      <ul class="plain">
        <li><b>Every SMS identifies the sender.</b> <code>{{custom_values.sms_signoff}}</code> appears in every one. An unidentified SMS is the most common Spam Act failure.</li>
        <li><b>Every marketing message carries an opt-out.</b> The platform handles STOP natively and sets do-not-SMS, and <code>{{unsubscribe_link}}</code> handles email, but the wording still has to be there.</li>
        <li><b>Send window 8am to 8pm, Monday to Saturday.</b> Confirmations send immediately because the person is waiting for them. Everything else waits. Use the platform's <em>Wait until a time window</em> step rather than hoping nobody enquires at midnight.</li>
      </ul>
    </div>
  </section>

  <section id="inventory">
    <div class="sec-head"><span class="sec-n">05</span><h2>All ${count} messages</h2></div>
    <div class="stack">
      <p>Every SMS fits in one segment with the sample values and a realistic shortened link, checked rather than assumed.</p>
      <div class="t-scroll">
        <table>
          <thead><tr><th>ID</th><th>Channel</th><th>Trigger</th><th>Type</th><th>Reuse</th><th>Appears in</th></tr></thead>
          <tbody>
${inventoryRows}
          </tbody>
        </table>
      </div>
    </div>
  </section>

${SECTIONS.map((s) => section(...s)).join('\n')}
  <div class="ask">
    <b>Needs Glenn:</b> payment terms for commercial work, and whether progress claims
    follow a percentage, a milestone, or a monthly cycle.
  </div>

  <section id="order">
    <div class="sec-head"><span class="sec-n">15</span><h2>Build order</h2></div>
    <div class="stack">
      <p>Do not build all ${count} at once. In order of what earns most:</p>
      <ol class="plain">
${J.buildOrder.map((b) => `        <li><b>${esc(b.ids)}</b>, ${esc(b.why.charAt(0).toLowerCase() + b.why.slice(1))}</li>`).join('\n')}
      </ol>
    </div>
  </section>

</div>
`

const out = head + body
const dashes = (out.match(/\u2014/g) || []).length
const vendor = (out.match(/GoHighLevel|HighLevel|LeadConnector|\bGHL\b|Spray It/g) || []).length
const abn = (out.match(/ABN \{\{/g) || []).length
if (dashes || vendor || abn) { console.error(`em dashes ${dashes}, vendor ${vendor}, abn tokens ${abn}`); process.exit(1) }
fs.writeFileSync(SCRATCH + 'messaging.html', out + '\n</body>\n</html>\n')
console.log(`docs/messaging.html regenerated: ${count} messages, ${out.length} chars${journeyUrl ? ', linked to the journey page' : ''}`)
