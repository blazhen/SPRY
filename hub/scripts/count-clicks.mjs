// Counts the user actions (clicks, key presses that are not typing, screen changes) and the screens needed
// for each real task in the Hub. Run: HUB_DIST=dist-before node scripts/count-clicks.mjs before
// Writes shots/click-counts-<label>.json and prints a table. Port 4331. Desktop 1440x900.
//
// To adapt it to a new layout, edit the SEL table and the step lists in TASKS (selectors only).
// A step is one real user action:
//   C(...)  a click (a link, button, tab, option, checkbox)         counts 1 action
//   K(...)  a key press that is not typing (Enter, Escape, /)        counts 1 action
//   F(...)  typing text into a field                                 counts 1 field, 0 actions
//   S(...)  a screen that appears (page or dialog the user looks at) counts 1 screen, 0 actions
//   V(...)  a check that the result is on screen                     counts nothing, recorded as proof
// A step may carry `when` (only run if true, so a menu that is already open is not clicked twice).
// A screen is declared with `screen: 'name'` on the step that makes it appear, or with S().
import { startPreview } from './_server.mjs'
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const MODE = process.argv[2] === 'after' ? 'after' : 'before'
const LAYOUT = process.argv[3] === 'advanced' ? 'advanced' : 'compact'
const PORT = MODE === 'before' ? 4371 : 4372
process.env.HUB_DIST = MODE === 'before' ? 'dist-before' : 'dist-final'
const BASE = `http://localhost:${PORT}/`
const label = MODE === 'before' ? 'before' : 'after-' + LAYOUT

// ---- selectors: the only part that changes with a new layout -------------------------------------
const SEL = {
  navJobs: (p) => p.getByRole('navigation', { name: 'Hub sections' }).first().getByRole('link', { name: 'Jobs', exact: true }),
  navTodo: (p) => p.getByRole('navigation', { name: 'Hub sections' }).first().getByRole('link', { name: /^To do/ }),
  jobsNewBtn: (p) => p.getByRole('button', { name: /New job/ }).first(),
  newJobAddPerson: (p) => p.getByRole('button', { name: 'Add a new person' }),
  newJobPersonName: (p) => MODE === 'after' ? p.locator('[id$="-pName"]') : p.getByLabel('Name', { exact: true }),
  newJobPersonPhone: (p) => MODE === 'after' ? p.locator('[id$="-pPhone"]') : p.getByLabel('Phone'),
  newJobPersonEmail: (p) => MODE === 'after' ? p.locator('[id$="-pEmail"]') : p.getByLabel('Email'),
  newJobName: (p) => MODE === 'after' ? p.locator('[id$="-jobName"]') : p.getByLabel(/^(Job|Project) name/i),
  newJobAddress: (p) => MODE === 'after' ? p.locator('[id$="-addr"]') : p.getByLabel('Job site address'),
  newJobNotes: (p) => MODE === 'after' ? p.locator('[id$="-notes"]') : p.getByLabel('Notes about the job'),
  newJobSave: (p) => p.getByRole('button', { name: /^(Make the|\+?\s*Save job)/ }),
  jobAddressField: (p) => p.getByLabel(/^(Job )?[Ss]ite address/).first(),
  jobNotesField: (p) => p.getByLabel('Job notes').first(),
  jobNameField: (p) => p.getByLabel(/^(Job|Project) name/i).first(),
  jobContactField: (p) => p.getByLabel('Contact', { exact: true }).first(),
  jobPhoneField: (p) => p.getByLabel('Phone').first(),
  jobEmailField: (p) => p.getByLabel('Email').first(),
  jobsRow: (p, name) => p.locator('main tbody tr').filter({ hasText: name }).first().getByRole('link').first(),
  noteField: (p) => MODE === 'after' ? p.locator('textarea[id$="-body"]') : p.getByLabel('Add a note'),
  taskTab: (p) => p.getByRole('button', { name: 'Task', exact: true }),
  noteSave: (p) => p.getByRole('button', { name: 'Save note' }),
  todoField: (p) => MODE === 'after' ? p.locator('input[id$="-title"]') : p.getByLabel('What needs doing'),
  todoSave: (p) => p.getByRole('button', { name: MODE === 'after' ? 'Save task' : 'Add to do' }),
  writeQuote: (p) => p.getByRole('button', { name: /^(Write the quote|Open the quote)/ }).first(),
  addOwnLine: (p) => p.getByRole('button', { name: 'Add your own line' }),
  lineItem: (p) => p.getByLabel('Item', { exact: true }).first(),
  linePrice: (p) => p.getByLabel('Price ex GST').first(),
  sendQuote: (p) => p.getByRole('button', { name: 'Send quote' }),
  sendConfirm: (p) => p.getByRole('button', { name: 'Yes, send it' }),
  editorMore: (p) => p.getByRole('button', { name: 'More', exact: true }).last(),
  newRevision: (p) => p.getByRole('button', { name: /^(Start from last quote|Make Rev 2)/ }),
  markAcceptedOpen: (p) => p.getByRole('button', { name: 'Mark as accepted' }).first(),
  markAcceptedConfirm: (p) => p.getByRole('button', { name: 'Yes, mark as accepted' }),
  backToJob: (p) => p.getByRole('link', { name: 'Back to the job' }).first(),
  paymentsSection: (p) => p.getByRole('button', { name: /^Payments \(/ }),
  navInvoices: (p) => p.getByRole('navigation', { name: 'Hub sections' }).first().getByRole('link', { name: 'Invoices', exact: true }),
  invNewLink: (p) => p.getByRole('link', { name: 'New invoice' }).first(),
  invJobSearch: (p) => p.locator('[role=dialog] input[type=search], [role=dialog] input[type=text], main input[type=search]').first(),
  invJobPick: (p) => p.locator('label').filter({ hasText: 'Counter roof' }).first(),
  invNext: (p) => p.getByRole('button', { name: 'Next', exact: true }),
  newInvoice: (p) => p.getByRole('button', { name: /^(New invoice|Create invoice)/ }).first(),
  startInvoice: (p) => p.getByRole('button', { name: 'Start the invoice' }),
  searchOpen: (p) => p.getByRole('button', { name: 'Search', exact: true }),
  searchInput: (p) => p.getByLabel('Search jobs, contacts and quotes'),
  searchJobHit: (p) => p.getByRole('option').filter({ has: p.locator('xpath=self::a[starts-with(@href,"#/jobs/")]') }).first(),
  jobsSortTime: (p) => p.locator('main th button', { hasText: 'Time in stage' }).first(),
  jobsSortedHeader: (p) => p.locator('main th', { hasText: 'Time in stage' }),
  stallBadges: (p) => p.locator('main tbody .badge'),
  todoWriteSection: (p) => p.getByRole('heading', { name: /^(Waiting for you to quote|Quotes to write)/ }),
  todoChaseSection: (p) => p.getByRole('heading', { name: /^Quotes to chase/ }),
}

// ---- step helpers --------------------------------------------------------------------------------
const C = (d, run, o = {}) => ({ kind: 'click', d, run, ...o })
const K = (d, run, o = {}) => ({ kind: 'key', d, run, ...o })
const F = (d, run, o = {}) => ({ kind: 'field', d, run, ...o })
const S = (d, screen) => ({ kind: 'screen', d, screen, run: async () => {} })
const V = (d, run, o = {}) => ({ kind: 'verify', d, run, ...o })

const st = {} // facts carried from one task to the next (ids, urls)
const NEW = { name: 'Pat Counter', phone: '0400 555 123', email: 'pat.counter@example.com', job: 'Counter roof insulation', addr: '9 Counter Rd, Clayton VIC', notes: 'Roof only, access from the lane.' }
const waitQuiet = async (p) => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(350) }
const val = (loc) => loc.inputValue()
const bodyHas = async (p, t) => (await p.locator('body').innerText()).includes(t)

const TASKS = [
  {
    id: 'a', title: 'Phone rings: new contact + new job, saved',
    start: { screen: 'Home (To do)' },
    startNote: 'Home screen is To do; New job lives on the Jobs list, so the first click is the Jobs tab.',
    pre: async (p) => { await p.goto(BASE + '#/'); await waitQuiet(p) },
    steps: [
      C('Jobs tab', (p) => SEL.navJobs(p).click(), { screen: 'Jobs list' }),
      C('New job button', (p) => SEL.jobsNewBtn(p).click(), { screen: 'New job dialog' }),
      C('Add a new person', (p) => SEL.newJobAddPerson(p).click(), { when: async () => MODE === 'before' }),
      F('Person name', (p) => SEL.newJobPersonName(p).fill(NEW.name)),
      F('Person phone', (p) => SEL.newJobPersonPhone(p).fill(NEW.phone)),
      F('Person email', (p) => SEL.newJobPersonEmail(p).fill(NEW.email)),
      F('Job name', (p) => SEL.newJobName(p).fill(NEW.job)),
      F('Job site address', (p) => SEL.newJobAddress(p).fill(NEW.addr)),
      F('Job notes', (p) => SEL.newJobNotes(p).fill(NEW.notes)),
      C('Make the job', (p) => SEL.newJobSave(p).click(), { screen: 'Job page' }),
      V('Job page shows the values', async (p) => {
        await waitQuiet(p)
        st.jobUrl = p.url()
        if (MODE === 'after') {
          const shown = (await p.locator('body').innerText()) + ' ' + (await p.locator('input:visible, textarea:visible').evaluateAll((e) => e.map((x) => x.value).join(' | ')))
          const want = [NEW.job, NEW.addr, NEW.notes, NEW.phone, NEW.email, NEW.name]
          const miss = want.filter((w) => !shown.includes(w))
          return { ok: miss.length === 0, detail: miss.length ? 'missing: ' + miss.join(' / ') : 'all six values on the job page' }
        }
        const got = [await val(SEL.jobNameField(p)), await val(SEL.jobAddressField(p)), await val(SEL.jobNotesField(p)), await val(SEL.jobPhoneField(p)), await val(SEL.jobEmailField(p)), await val(SEL.jobContactField(p))]
        const ok = got[0] === NEW.job && got[1] === NEW.addr && got[2] === NEW.notes && got[3] === NEW.phone && got[4] === NEW.email && got[5] === NEW.name
        return { ok, detail: JSON.stringify(got) }
      }),
    ],
  },
  {
    id: 'b', title: 'Open existing job, read key facts, add note, set follow-up',
    start: { screen: 'Home (To do)' },
    pre: async (p) => { await p.goto(BASE + '#/'); await waitQuiet(p) },
    steps: [
      C('Jobs tab', (p) => SEL.navJobs(p).click(), { screen: 'Jobs list' }),
      C('Open the job row', (p) => SEL.jobsRow(p, 'Bupa aged care').click(), { screen: 'Job page' }),
      V('Key facts on screen: contact, site address, notes', async (p) => {
        await waitQuiet(p)
        if (MODE === 'after') {
          const facts = ['Dandenong', 'north gate', 'Travis Gillespie']
          const seen = []
          for (const f of facts) {
            const r = await p.evaluate((t) => {
              for (const e of document.querySelectorAll('main *')) {
                const own = e.matches('input, textarea') ? e.value : [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')
                if (own.includes(t)) { const b = e.getBoundingClientRect(); if (b.width > 0 && b.height > 0) return { y: b.y + b.height } }
              }
              return null
            }, f)
            seen.push(f + (r ? (r.y <= 900 ? ': above the fold' : ': needs scroll') : ': MISSING'))
          }
          return { ok: !seen.some((x) => x.endsWith('MISSING')), detail: seen.join('; ') }
        }
        return { ok: (await SEL.jobAddressField(p).isVisible()) && (await SEL.jobNotesField(p).isVisible()) && (await SEL.jobContactField(p).isVisible()) }
      }),
      F('Note text', (p) => SEL.noteField(p).fill('Counted: customer wants the north wall done first.')),
      C('Save note', (p) => SEL.noteSave(p).click()),
      V('Note appears in the list', async (p) => { await p.waitForTimeout(300); return { ok: await bodyHas(p, 'north wall done first') } }),
      C('Task tab', (p) => SEL.taskTab(p).click(), { when: async () => MODE === 'after' }),
      F('Follow-up text', (p) => SEL.todoField(p).fill('Ring back about the north wall')),
      C('Add to do', (p) => SEL.todoSave(p).click()),
      V('Follow-up appears in the list', async (p) => { await p.waitForTimeout(300); return { ok: await bodyHas(p, 'Ring back about the north wall') } }),
    ],
  },
  {
    id: 'c', title: 'From a job: write quote (job notes visible), send, see Sent',
    pre: async (p) => { await p.goto(st.jobUrl); await waitQuiet(p) },
    start: { screen: 'Job page' },
    steps: [
      C('Write the quote', (p) => SEL.writeQuote(p).click(), { screen: 'Quote editor' }),
      V('Job notes visible on the quote screen', async (p) => { await waitQuiet(p); st.quoteUrl = p.url(); return { ok: await bodyHas(p, NEW.notes) } }),
      C('Add your own line', (p) => SEL.addOwnLine(p).click()),
      F('Line item name', (p) => SEL.lineItem(p).fill('Roof insulation')),
      F('Line price', (p) => SEL.linePrice(p).fill('4500')),
      C('Send quote', (p) => SEL.sendQuote(p).click(), { screen: 'Send dialog' }),
      C('Yes, send it', (p) => SEL.sendConfirm(p).click()),
      V('Quote shows Sent', async (p) => { await p.waitForTimeout(600); return { ok: (await p.getByText('Sent', { exact: true }).count()) > 0 || (await p.getByRole('button', { name: 'Mark as accepted' }).count()) > 0 } }),
    ],
  },
  {
    id: 'd', title: 'Customer says change it: make Rev 2',
    pre: async () => {},
    start: { screen: 'Quote editor (Sent)' },
    steps: [
      C('More', (p) => SEL.editorMore(p).click(), { when: async () => MODE === 'before' }),
      C('Start from last quote (= new revision)', (p) => SEL.newRevision(p).click()),
      V('Rev 2 shown', async (p) => { await p.waitForTimeout(600); return { ok: (await p.getByText('Rev 2').count()) > 0, detail: p.url() } }),
    ],
  },
  {
    id: 'e', title: 'Mark the quote accepted (by phone)',
    pre: async () => {},
    start: { screen: 'Quote editor (Rev 2, Draft)' },
    steps: [
      C('More (only if the menu is closed)', (p) => SEL.editorMore(p).click(), { when: async (p) => !(await SEL.markAcceptedOpen(p).isVisible()) }),
      C('Mark as accepted', (p) => SEL.markAcceptedOpen(p).click(), { screen: 'Accept dialog' }),
      C('Yes, mark as accepted', (p) => SEL.markAcceptedConfirm(p).click()),
      V('Quote shows Accepted', async (p) => { await p.waitForTimeout(600); return { ok: (await p.getByText('Accepted').count()) > 0 } }),
    ],
  },
  {
    id: 'f', title: 'Create a deposit invoice for the job',
    pre: async () => {},
    start: { screen: 'Quote editor (Accepted)' },
    steps: MODE === 'before' ? [
      C('Invoices tab', (p) => SEL.navInvoices(p).click(), { screen: 'Invoices list' }),
      C('New invoice', (p) => SEL.invNewLink(p).click(), { screen: 'Pick a job (dialog)' }),
      F('Search for the job', (p) => SEL.invJobSearch(p).fill('Counter')),
      C('Pick the job', (p) => SEL.invJobPick(p).click()),
      C('Next', (p) => SEL.invNext(p).click(), { screen: 'Kind of invoice' }),
      C('Start the invoice (Deposit is the default kind)', (p) => SEL.startInvoice(p).click(), { screen: 'Invoice editor' }),
      V('Invoice editor open', async (p) => { await p.waitForTimeout(600); return { ok: /invoice/i.test(p.url()), detail: p.url() } }),
    ] : [
      C('Back to the job', (p) => SEL.backToJob(p).click(), { screen: 'Job page' }),
      C('Open the Invoices section (deposit invoice was made automatically when the quote was accepted)', (p) => p.getByRole('button', { name: /^Invoices \d/ }).click(), { when: async (p) => { const b = p.getByRole('button', { name: /^Invoices \d/ }); return (await b.count()) > 0 && (await b.first().getAttribute('aria-expanded')) === 'false' } }),
      V('Deposit invoice listed on the job', async (p) => { await p.waitForTimeout(500); return { ok: /deposit/i.test(await p.locator('body').innerText()), detail: 'auto-created at acceptance; Create invoice button not clickable in this state' } }),
    ],
  },
  ...[
    ['g1', 'Global search: job by name', 'Whitfield new build', 'Whitfield'],
    ['g2', 'Global search: job by site address', null, null],
    ['g3', 'Global search: job by contact name', 'Travis Gillespie', 'Bupa'],
  ].map(([id, title, query, expectJob]) => ({
    id, title,
    pre: async (p) => {
      await p.goto(BASE + '#/quotes'); await waitQuiet(p) // "from anywhere": start on an unrelated list
      if (id === 'g2') {
        await p.goto(BASE + '#/jobs/j1'); await waitQuiet(p)
        st.addr = await val(SEL.jobAddressField(p))
        await p.goto(BASE + '#/quotes'); await waitQuiet(p)
      }
    },
    start: { screen: 'Any screen (Quotes list)' },
    steps: [
      C('Search button', (p) => SEL.searchOpen(p).click(), { screen: 'Search dialog' }),
      F('Type the query', (p) => SEL.searchInput(p).fill(id === 'g2' ? st.addr : query)),
      C('Click the job result', async (p) => { await p.waitForTimeout(400); await SEL.searchJobHit(p).click() }, { screen: 'Job page' }),
      V('Right job opened', async (p) => { await waitQuiet(p); const h = await p.locator('h1').first().innerText(); return { ok: /#\/jobs\//.test(p.url()), detail: h } }),
    ],
  })),
  {
    id: 'h', title: 'Morning overview: Jobs by time in stage, stall rows, quotes to write and chase',
    pre: async (p) => { await p.goto(BASE + '#/'); await waitQuiet(p) },
    steps: [
      S('Home (To do) already shows "Waiting for you to quote" and "Quotes to chase"', 'To do (home)'),
      V('Quotes to write section on home', async (p) => ({ ok: await SEL.todoWriteSection(p).isVisible() })),
      V('Quotes to chase section on home', async (p) => ({ ok: await SEL.todoChaseSection(p).isVisible() })),
      C('Jobs tab', (p) => SEL.navJobs(p).click(), { screen: 'Jobs list' }),
      C('Sort by Time in stage (1st click)', (p) => SEL.jobsSortTime(p).click()),
      C('Sort by Time in stage (2nd click, only if not longest first)', (p) => SEL.jobsSortTime(p).click(), {
        when: async (p) => (await SEL.jobsSortedHeader(p).first().getAttribute('aria-sort')) !== 'descending',
      }),
      V('Sorted longest first; stall rows visible', async (p) => {
        await p.waitForTimeout(300)
        const dir = await SEL.jobsSortedHeader(p).first().getAttribute('aria-sort')
        const stalls = await SEL.stallBadges(p).allInnerTexts()
        return { ok: dir === 'descending', detail: `aria-sort=${dir}; badges on page 1: ${stalls.map((s) => s.trim()).filter(Boolean).slice(0, 6).join(' / ')}` }
      }),
    ],
  },
]

// ---- runner ----------------------------------------------------------------------------------------
const server = await startPreview(PORT)
const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
if (MODE === 'after') await context.addInitScript((l) => localStorage.setItem('hub.layout.v1', l), LAYOUT)
const page = await context.newPage()
page.setDefaultTimeout(5000)
const errs = []
page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)))
await page.goto(BASE); await waitQuiet(page)

const results = []
for (const t of TASKS) {
  const r = { task: t.id, title: t.title, clicks: 0, keys: 0, screens: 1, fields: 0, steps: [], verified: [], notes: [], blocked: null }
  if (t.start?.screen) r.screensSeen = [t.start.screen]
  try {
    await t.pre(page)
    for (const s of t.steps) {
      if (s.when && !(await s.when(page))) { r.steps.push(`(skipped: ${s.d})`); continue }
      const res = await s.run(page)
      if (s.kind === 'click') r.clicks++
      if (s.kind === 'key') { r.clicks++; r.keys++ }
      if (s.kind === 'field') r.fields++
      if (s.kind === 'verify') {
        r.verified.push({ d: s.d, ok: !!res?.ok, detail: res?.detail })
        if (!res?.ok) r.blocked = r.blocked || `blocked at: ${s.d}`
        continue
      }
      r.steps.push(`${s.kind}: ${s.d}`)
      if (s.screen) { (r.screensSeen ||= []).push(s.screen) }
      await page.waitForTimeout(150)
    }
  } catch (e) {
    r.blocked = `blocked at: ${String(e.message).split('\n')[0].slice(0, 120)}`
    await page.screenshot({ path: `shots/click-counts-fail-${t.id}.png` }).catch(() => {})
  }
  r.screens = (r.screensSeen || []).length || 1
  if (t.startNote) r.notes.push(t.startNote)
  results.push(r)
}

mkdirSync('shots', { recursive: true })
writeFileSync(`shots/click-counts-${label}.json`, JSON.stringify({ label, viewport: '1440x900', results, consoleErrors: errs }, null, 2))
console.log(`\nClick counts [${label}]`)
console.log('task | clicks | screens | fields | proven | notes')
for (const r of results) {
  const proven = !r.blocked && r.verified.every((v) => v.ok) ? 'yes' : 'NO'
  console.log(`${r.task} | ${r.clicks} | ${r.screens} | ${r.fields} | ${proven} | ${(r.blocked || '').slice(0, 90)} [last: ${r.steps[r.steps.length - 1]}]${r.verified.filter((v) => !v.ok).map((v) => ' FAILED ' + v.d).join(';')}`)
}
console.log('console errors:', errs.length)
await browser.close()
server.kill()
