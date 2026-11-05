import './quoteInvoice.css'
import './invoiceEdit.css'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Plus, Save, Search, Send, Trash2, X } from 'lucide-react'
import ContactCard from '../components/ContactCard'
import InvoiceSheet from '../components/InvoiceSheet'
import JobDetailsPanel from '../components/JobDetailsPanel'
import { NewInvoicePage } from '../components/NewInvoiceDialog'
import SplitPane from '../components/SplitPane'
import { ConfirmDialog, EmptyState, Notice, toast } from '../components/ui'
import { DATA_SOURCE, DEMO } from '../config'
import { quoteTotals } from '../lib/calc'
import { addDaysISO, fmtMoney, uid, todayISO } from '../lib/format'
import { KIND_LABEL, invoiceTotals, lineExGst, statusLabel } from '../lib/invoices'
import { go, href, useRoute } from '../lib/router'
import { deleteInvoice, duplicateInvoice, duplicateInvoiceAsync, getContact, getInvoice, getJob, getPriceList, getQuote, invoiceSyncState, participantEmail, participantName, retryInvoiceSave, sendInvoice, updateInvoice, useStore } from '../lib/store'
import type { Invoice, InvoiceLine, InvoiceUnit, ParticipantRef } from '../types'

const UNITS: { id: InvoiceUnit; label: string }[] = [
  { id: 'each', label: 'each' },
  { id: 'm2', label: 'm²' },
  { id: 'hour', label: 'hour' },
]

type PaneChoice = 'preview' | 'job' | 'contact'
const PANES: { id: PaneChoice; label: string }[] = [
  { id: 'preview', label: 'Invoice preview' },
  { id: 'job', label: 'Job' },
  { id: 'contact', label: 'Contact' },
]

const fieldsOf = (i: Invoice) => ({ kind: i.kind, items: i.items, discount: i.discount, issueDate: i.issueDate, dueDate: i.dueDate, notes: i.notes })

const timeFmt = (d: Date) => d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })

/** `ws`: the invoice editor inside the job page (Round 8): form in the middle, preview portalled into the right panel slot. */
export type InvoiceWs = { id: string; jobId: string; slot: HTMLElement | null }

export default function InvoiceEdit({ ws }: { ws?: InvoiceWs } = {}) {
  const route = useRoute()
  const s = useStore()
  if (!ws && route.name === 'invoiceNew') return <NewInvoicePage jobId={route.jobId} />
  if (!ws && route.name !== 'invoiceEdit') return null
  const inv = getInvoice(ws ? ws.id : route.name === 'invoiceEdit' ? route.id : '', s)
  if (!inv) {
    return (
      <div className={ws ? 'ws-missing' : 'mx-auto max-w-lg py-10 text-center'} data-ws-missing={ws ? '' : undefined}>
        {ws ? <p className="t-body font-bold">We could not find that invoice</p> : <h1 className="t-page">We could not find that invoice</h1>}
        <p className="t-body mt-2 text-muted">It may have been deleted, or the link is not quite right.</p>
        <a href={ws ? href.job(ws.jobId) : href.invoices()} className="btn btn-primary btn-lg mt-5">
          <ArrowLeft size={20} aria-hidden="true" />
          {ws ? 'Back to activity' : 'Back to all invoices'}
        </a>
      </div>
    )
  }
  if (inv.status !== 'draft') {
    return (
      <div className={ws ? 'ws-missing' : 'mx-auto max-w-lg py-10'}>
        <Notice tone="info">
          <p className="font-bold">
            Invoice {inv.number} is {statusLabel(inv, todayISO()).toLowerCase()}, so it cannot be changed here.
          </p>
        </Notice>
        <a href={ws ? href.jobInvoice(ws.jobId, inv.id) : href.invoice(inv.id)} className="btn btn-primary btn-lg mt-5">
          Open invoice {inv.number}
        </a>
      </div>
    )
  }
  return <InvoiceEditor key={inv.id} initial={inv} ws={ws} />
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  const hid = useId()
  return (
    <section className="panel ie-sec min-w-0 p-4" aria-labelledby={hid} id={id}>
      <h2 id={hid} className="t-section ie-sec-title mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

const numOrZero = (v: string): number => (v === '' || Number.isNaN(Number(v)) ? 0 : Math.max(0, Number(v)))

function InvoiceEditor({ initial, ws }: { initial: Invoice; ws?: InvoiceWs }) {
  const store = useStore()
  const ids = useId()
  const [inv, setInv] = useState<Invoice>(initial)
  const invRef = useRef(inv)
  const dirtyRef = useRef(false)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(new Date())
  const [sendOpen, setSendOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')
  const [pane, setPane] = useState<PaneChoice>('preview')
  const [focusReq, setFocusReq] = useState<string | null>(null)

  const job = getJob(inv.jobId, store)
  const quote = inv.quoteId ? getQuote(inv.quoteId, store) : undefined
  const totals = invoiceTotals(inv)
  const priceList = getPriceList(store)

  const main = job ? (job.participants.find((p) => p.role === 'main') ?? job.participants[0]) : undefined
  const mainRef: ParticipantRef | undefined = inv.contactId ? { kind: 'contact', id: inv.contactId } : main ? { kind: main.kind, id: main.id } : undefined
  const customer = mainRef ? participantName(mainRef, store) : 'the customer'
  const email = mainRef ? participantEmail(mainRef, store) : ''
  const contactId = inv.contactId ?? (mainRef?.kind === 'contact' ? mainRef.id : undefined)
  const contact = contactId ? getContact(contactId, store) : undefined

  function edit(patch: Partial<Invoice>) {
    const next = { ...invRef.current, ...patch }
    invRef.current = next
    dirtyRef.current = true
    setInv(next)
    setDirty(true)
  }

  function persist(): boolean {
    const stored = getInvoice(invRef.current.id)
    if (!stored || stored.status !== 'draft') {
      toast('This invoice was changed elsewhere, so your last edits were not saved.')
      return false
    }
    updateInvoice(invRef.current.id, fieldsOf(invRef.current))
    dirtyRef.current = false
    setDirty(false)
    setSavedAt(new Date())
    return true
  }

  useEffect(() => {
    if (!dirty) return
    const t = window.setTimeout(persist, 400)
    return () => window.clearTimeout(t)
  }, [dirty, inv])

  useEffect(
    () => () => {
      if (!dirtyRef.current) return
      const stored = getInvoice(invRef.current.id)
      if (stored && stored.status === 'draft') updateInvoice(invRef.current.id, fieldsOf(invRef.current))
    },
    [],
  )

  useEffect(() => {
    if (!focusReq) return
    document.getElementById(focusReq)?.focus()
    setFocusReq(null)
  }, [focusReq])

  // ---- Validation: each message sits next to its field ----
  const errors: Record<string, string> = {}
  if (!inv.issueDate) errors[`${ids}-issue`] = 'Choose the date of the invoice.'
  if (!inv.dueDate) errors[`${ids}-due`] = 'Choose when it is due, or press one of the quick buttons.'
  else if (inv.issueDate && inv.dueDate < inv.issueDate) errors[`${ids}-due`] = 'The due date cannot be before the invoice date.'
  if (inv.items.length === 0) errors[`${ids}-add`] = 'Add at least one line.'
  inv.items.forEach((l) => {
    if (!l.description.trim()) errors[`${ids}-${l.id}-desc`] = 'Say what this line is for.'
    if (!(l.qty > 0)) errors[`${ids}-${l.id}-qty`] = 'Enter a quantity above 0.'
    if (!(l.unitPrice > 0)) errors[`${ids}-${l.id}-price`] = 'Enter a price above 0.'
  })
  const sumEx = inv.items.reduce((a, l) => a + lineExGst(l), 0)
  if (inv.discount > sumEx) errors[`${ids}-disc`] = 'The discount is more than the lines add up to.'
  const errorKeys = Object.keys(errors)
  const err = (key: string) => (showErrors && errors[key] ? <p className="err" id={`${key}-err`}>{errors[key]}</p> : null)
  const bad = (key: string) => (showErrors && errors[key] ? true : undefined)

  function tryFinish(then: () => void) {
    setShowErrors(true)
    if (errorKeys.length > 0) {
      setPicking(false)
      const first = errorKeys[0]
      window.setTimeout(() => document.getElementById(first)?.focus(), 0)
      toast('Please fix the marked fields first.')
      return
    }
    then()
  }

  function saveDraft() {
    if (persist()) toast('Saved')
  }

  function openSend() {
    tryFinish(() => {
      if (dirtyRef.current && !persist()) return
      setSendOpen(true)
    })
  }

  function confirmSend() {
    if (dirtyRef.current && !persist()) {
      setSendOpen(false)
      return
    }
    dirtyRef.current = false
    sendInvoice(inv.id)
    setSendOpen(false)
    toast(`Invoice ${inv.number} marked as sent`)
    go(ws ? href.jobInvoice(ws.jobId, inv.id) : href.invoice(inv.id))
  }

  const toEdit = (id: string) => (ws ? href.jobInvoiceEdit(ws.jobId, id) : href.invoiceEdit(id))

  function duplicate() {
    if (dirtyRef.current && !persist()) return
    if (DATA_SOURCE === 'live') {
      duplicateInvoiceAsync(inv.id).then(
        (copy) => {
          if (!copy) return
          toast(`Made a copy: invoice ${copy.number}`)
          go(toEdit(copy.id))
        },
        () => toast('The copy could not be made. Nothing was saved.'),
      )
      return
    }
    const copy = duplicateInvoice(inv.id)
    if (copy) {
      toast(`Made a copy: invoice ${copy.number}`)
      go(toEdit(copy.id))
    }
  }

  function confirmDelete() {
    const back = job ? href.job(job.id) : href.invoices()
    dirtyRef.current = false
    deleteInvoice(inv.id)
    setDeleteOpen(false)
    toast(`Invoice ${inv.number} deleted`)
    go(back)
  }

  // ---- Items ----
  const updateLine = (id: string, patch: Partial<InvoiceLine>) => edit({ items: invRef.current.items.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  function addLine(base: Partial<InvoiceLine> = {}) {
    const line: InvoiceLine = { id: uid('il'), description: '', qty: 1, unit: 'each', unitPrice: 0, gst: true, ...base }
    edit({ items: [...invRef.current.items, line] })
    setFocusReq(`${ids}-${line.id}-${base.description ? 'qty' : 'desc'}`)
  }
  function removeLine(id: string) {
    edit({ items: invRef.current.items.filter((l) => l.id !== id) })
  }
  function moveLine(index: number, dir: -1 | 1) {
    const to = index + dir
    const items = [...invRef.current.items]
    if (to < 0 || to >= items.length) return
    ;[items[index], items[to]] = [items[to], items[index]]
    edit({ items })
    setFocusReq(`${ids}-${items[to].id}-${dir === -1 ? 'up' : 'down'}`)
  }
  const q = search.trim().toLowerCase()
  const matches = priceList.filter((p) => !q || `${p.name} ${p.section} ${p.description}`.toLowerCase().includes(q))
  function addFromPrice(pid: string) {
    const p = priceList.find((x) => x.id === pid)
    if (!p) return
    const unit: InvoiceUnit = p.unit === 'm²' ? 'm2' : p.unit === 'hour' ? 'hour' : 'each'
    addLine({ description: p.name, unit, unitPrice: p.unitPrice })
    setPicking(false)
    setSearch('')
  }

  // ---- Dates ----
  function quickDue(days: number) {
    const base = inv.issueDate || todayISO()
    edit({ issueDate: base, dueDate: days === 0 ? base : addDaysISO(base, days) })
  }
  const dueDays = inv.issueDate && inv.dueDate ? Math.round((new Date(inv.dueDate + 'T00:00:00').getTime() - new Date(inv.issueDate + 'T00:00:00').getTime()) / 86400000) : -1

  const quoteTotal = quote ? quoteTotals(quote).total : 0
  const quoteNote =
    quote && quoteTotal > 0
      ? inv.kind === 'deposit'
        ? `${Math.round((totals.total / quoteTotal) * 100)}% of quote ${quote.number}`
        : `Quote ${quote.number} was ${fmtMoney(quoteTotal)} with GST`
      : ''

  const savedText = dirty ? 'Saving...' : savedAt ? `Saved at ${timeFmt(savedAt)}` : ''

  // Live: Send waits until the last edit has reached the CRM. Mock mode never blocks.
  const liveSync = DATA_SOURCE === 'live' ? invoiceSyncState(inv.id, store) : 'saved'
  const sendBlocked = DATA_SOURCE === 'live' && (dirty || liveSync !== 'saved')
  function retry() {
    if (dirtyRef.current) persist()
    retryInvoiceSave(inv.id)
  }

  // Live: the CRM's answer to a saved edit (its lines) replaces what is shown, once nothing newer is being typed.
  const stored = getInvoice(inv.id, store)
  useEffect(() => {
    if (DATA_SOURCE !== 'live' || !stored || dirtyRef.current || liveSync !== 'saved') return
    if (JSON.stringify(fieldsOf(stored)) === JSON.stringify(fieldsOf(invRef.current))) return
    invRef.current = { ...invRef.current, ...fieldsOf(stored) }
    setInv(invRef.current)
  }, [store])

  const form = (
    <div className="no-print min-w-0 space-y-5">
      {!ws && (
      <Section title="Customer and job">
        <dl className="t-body space-y-2">
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
            <dt className="text-muted">Customer</dt>
            <dd className="min-w-0 break-words">
              {contact ? (
                <a href={href.contact(contact.id)} className="font-bold underline">
                  {contact.name}
                </a>
              ) : (
                <span className="font-bold">{customer}</span>
              )}
              <span className="text-muted">{email ? `, ${email}` : ', no email on file'}</span>
            </dd>
          </div>
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
            <dt className="text-muted">Job</dt>
            <dd className="min-w-0 break-words">
              {job ? (
                <a href={href.job(job.id)} className="font-bold underline">
                  {job.name}
                </a>
              ) : (
                <span className="font-bold">Unknown job</span>
              )}
            </dd>
          </div>
        </dl>
      </Section>
      )}

      <Section title="Type and dates">
        <div className="ie-dates space-y-4">
          <div className="ie-kind">
            <label className="label" htmlFor={`${ids}-kind`}>
              Type of invoice
            </label>
            <select id={`${ids}-kind`} className="field" value={inv.kind} onChange={(e) => edit({ kind: e.target.value as Invoice['kind'] })}>
              {(Object.keys(KIND_LABEL) as Invoice['kind'][]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="ie-datepair grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`${ids}-issue`}>
                Invoice date
              </label>
              <input id={`${ids}-issue`} type="date" className="field" value={inv.issueDate} onChange={(e) => edit({ issueDate: e.target.value })} aria-invalid={bad(`${ids}-issue`)} aria-describedby={bad(`${ids}-issue`) ? `${ids}-issue-err` : undefined} />
              {err(`${ids}-issue`)}
            </div>
            <div>
              <label className="label" htmlFor={`${ids}-due`}>
                Due date
              </label>
              <input id={`${ids}-due`} type="date" className="field" value={inv.dueDate} onChange={(e) => edit({ dueDate: e.target.value })} aria-invalid={bad(`${ids}-due`)} aria-describedby={bad(`${ids}-due`) ? `${ids}-due-err` : undefined} />
              {err(`${ids}-due`)}
            </div>
          </div>
          <div role="group" aria-label="Quick choices" className="ie-quick flex flex-wrap items-center gap-2">
            {[
              { n: 0, label: 'On receipt' },
              { n: 7, label: '7 days' },
              { n: 14, label: '14 days' },
              { n: 30, label: '30 days' },
            ].map((o) => (
              <button key={o.n} type="button" className={`btn min-h-[44px] ${dueDays === o.n ? 'btn-primary' : 'btn-neutral'}`} aria-pressed={dueDays === o.n} onClick={() => quickDue(o.n)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Items" id={`${ids}-add`}>
        <div className="space-y-3">
          {inv.items.length === 0 && <EmptyState title="No lines yet">Add an item from the price list, or write your own line. Each line has a quantity and a price before GST.</EmptyState>}
          {inv.items.map((l, index) => {
            const f = (n: string) => `${ids}-${l.id}-${n}`
            const label = l.description.trim() || `line ${index + 1}`
            const tools = (
              <span className="flex items-center gap-1">
                <button id={f('up')} type="button" className="btn btn-ghost btn-icon" onClick={() => moveLine(index, -1)} disabled={index === 0} aria-label={`Move ${label} up`} title="Move up">
                  <ArrowUp size={18} aria-hidden="true" />
                </button>
                <button id={f('down')} type="button" className="btn btn-ghost btn-icon" onClick={() => moveLine(index, 1)} disabled={index === inv.items.length - 1} aria-label={`Move ${label} down`} title="Move down">
                  <ArrowDown size={18} aria-hidden="true" />
                </button>
                <button type="button" className="btn btn-ghost btn-icon text-hot-ink hover:bg-hot-wash" onClick={() => removeLine(l.id)} aria-label={`Remove ${label}`} title="Remove line">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </span>
            )
            const gstBox = (
              <label htmlFor={f('gst')} className="ie-gst t-body flex min-h-[44px] cursor-pointer items-center gap-3">
                <input id={f('gst')} type="checkbox" className="h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]" checked={l.gst} onChange={(e) => updateLine(l.id, { gst: e.target.checked })} />
                GST applies to this line
              </label>
            )
            return (
              <div key={l.id} className="ie-line rounded-md border p-3" style={{ borderColor: 'rgb(var(--c-control))' }} role="group" aria-label={`Line ${index + 1}`}>
                <div className="ie-line-grid grid min-w-0 grid-cols-2 gap-3">
                  <div className="ie-desc col-span-2 min-w-0">
                    <div className="ie-desc-in min-w-0">
                      <label className="label" htmlFor={f('desc')}>
                        What it is for
                      </label>
                      <input id={f('desc')} className="field" value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} autoComplete="off" aria-invalid={bad(f('desc'))} aria-describedby={bad(f('desc')) ? `${f('desc')}-err` : undefined} />
                      {err(f('desc'))}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor={f('qty')}>
                      Quantity
                    </label>
                    <input id={f('qty')} className="field num" type="number" inputMode="decimal" min={0} step="any" value={l.qty === 0 ? '' : l.qty} placeholder="0" onChange={(e) => updateLine(l.id, { qty: numOrZero(e.target.value) })} aria-invalid={bad(f('qty'))} aria-describedby={bad(f('qty')) ? `${f('qty')}-err` : undefined} />
                    {err(f('qty'))}
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor={f('unit')}>
                      Unit
                    </label>
                    <select id={f('unit')} className="field" value={l.unit} onChange={(e) => updateLine(l.id, { unit: e.target.value as InvoiceUnit })}>
                      {UNITS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor={f('price')}>
                      Price ex GST
                    </label>
                    <input id={f('price')} className="field num" type="number" inputMode="decimal" min={0} step="0.01" value={l.unitPrice === 0 ? '' : l.unitPrice} placeholder="0.00" onChange={(e) => updateLine(l.id, { unitPrice: numOrZero(e.target.value) })} aria-invalid={bad(f('price'))} aria-describedby={bad(f('price')) ? `${f('price')}-err` : undefined} />
                    {err(f('price'))}
                  </div>
                  <div className="flex min-w-0 flex-col justify-end text-right">
                    <span className="label !mb-1 text-muted" id={f('tot-l')}>
                      Line total ex GST
                    </span>
                    <output aria-labelledby={f('tot-l')} className="num flex min-h-[44px] items-center justify-end font-bold" data-testid="line-total">
                      {fmtMoney(lineExGst(l))}
                    </output>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t rule pt-3">
                  {gstBox}
                  {tools}
                </div>
              </div>
            )
          })}
          {err(`${ids}-add`)}

          {picking && (
            <div className="ie-pick rounded-md border p-3" style={{ borderColor: 'rgb(var(--c-control))' }} role="region" aria-label="Price list">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="label" htmlFor={`${ids}-search`}>
                    Search the price list
                  </label>
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input id={`${ids}-search`} className="field pl-9" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="For example batts, spray, rigid" autoComplete="off" autoFocus />
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setPicking(false)} aria-label="Close price list">
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-navy-wash" onClick={() => addFromPrice(p.id)}>
                      <span className="min-w-0 font-bold">{p.name}</span>
                      <span className="num shrink-0 text-base">
                        {fmtMoney(p.unitPrice)} per {p.unit}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {matches.length === 0 && <p className="hint">Nothing in the price list matches. Add your own line instead.</p>}
            </div>
          )}

          <div className="ie-add flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-add" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
              <Plus size={16} aria-hidden="true" />
              Add from price list
            </button>
            <button type="button" className="btn btn-add" onClick={() => addLine()}>
              <Plus size={16} aria-hidden="true" />
              Add your own line
            </button>
          </div>
        </div>
      </Section>

      <Section title="Discount">
        <label className="label" htmlFor={`${ids}-disc`}>
          Discount in dollars, taken off before GST
        </label>
        <input id={`${ids}-disc`} className="field num" type="number" inputMode="decimal" min={0} step="0.01" value={inv.discount === 0 ? '' : inv.discount} placeholder="0.00" onChange={(e) => edit({ discount: numOrZero(e.target.value) })} aria-invalid={bad(`${ids}-disc`)} aria-describedby={bad(`${ids}-disc`) ? `${ids}-disc-err` : undefined} />
        {err(`${ids}-disc`)}
      </Section>

      <Section title="Notes">
        <label className="label" htmlFor={`${ids}-notes`}>
          Notes the customer will see
        </label>
        <textarea id={`${ids}-notes`} className="field" rows={4} value={inv.notes} onChange={(e) => edit({ notes: e.target.value })} />
      </Section>
    </div>
  )

  const sidePicker = (
    <div className="no-print mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <label htmlFor={`${ids}-pane`} className="t-body font-bold">
        Show next to the invoice:
      </label>
      <select id={`${ids}-pane`} className="field w-auto min-w-[14rem] font-bold" value={pane} onChange={(e) => setPane(e.target.value as PaneChoice)}>
        {PANES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )

  const rightBody =
    pane === 'preview' ? (
      <InvoiceSheet invoice={inv} />
    ) : pane === 'job' ? (
      job ? <JobDetailsPanel job={job} defaultOpen /> : <Notice tone="warn">This invoice has no job.</Notice>
    ) : contactId ? (
      <ContactCard contactId={contactId} compact />
    ) : (
      <Notice tone="warn">This invoice has no contact with their own page yet.</Notice>
    )

  return (
    <div className={ws ? 'qi-page qi-ws' : 'qi-page'} data-invoice-editor={ws ? 'workspace' : 'page'}>
      <div className="no-print ie-head mb-4">
        <a href={job ? href.job(job.id) : href.invoices()} className="btn btn-ghost -ml-3" data-back-to={ws ? 'activity' : 'job'}>
          <ArrowLeft size={20} aria-hidden="true" />
          {ws ? 'Back to activity' : job ? 'Back to the job' : 'All invoices'}
        </a>
        <div className="ie-titlerow mt-2 flex flex-wrap items-center gap-x-4 gap-y-3">
          {ws ? <h2 className="t-section min-w-0 break-words">Invoice {inv.number}</h2> : <h1 className="t-page min-w-0 break-words">Invoice {inv.number}</h1>}
          <span className="badge st-slate">Draft</span>
          <p className="t-small -mt-2 w-full text-muted" role="status" aria-live="polite">
            {KIND_LABEL[inv.kind]}
            {savedText ? `. ${savedText}` : ''}
          </p>
        </div>
      </div>

      <div className="no-print ie-actions mb-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-lg is-primary-here" onClick={openSend} disabled={sendBlocked} aria-describedby={sendBlocked ? `${ids}-sendwhy` : undefined}>
          <Send size={20} aria-hidden="true" />
          Send
        </button>
        <button type="button" className="btn btn-good" onClick={saveDraft}>
          <Save size={16} aria-hidden="true" />
          Save draft
        </button>
        <button type="button" className="btn btn-neutral" onClick={duplicate}>
          <Copy size={16} aria-hidden="true" />
          Duplicate
        </button>
        <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={16} aria-hidden="true" />
          Delete draft
        </button>
        {sendBlocked && (
          <p className="t-small text-muted" id={`${ids}-sendwhy`} role="status" data-invoice-sync={liveSync === 'failed' ? 'failed' : 'saving'}>
            {liveSync === 'failed' ? 'Last change did not reach the CRM: try again' : 'Saving changes to the CRM'}
            {liveSync === 'failed' && (
              <button type="button" className="btn btn-neutral ml-3" onClick={retry}>
                Retry
              </button>
            )}
          </p>
        )}
      </div>

      {/* Totals: always on screen */}
      <section className="no-print panel ie-totals mb-5 p-4" aria-label="Totals" data-testid="totals">
        <dl className="ie-totals-dl t-body grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1">
          <div className="ie-pair contents">
            <dt className="text-muted">Subtotal before GST</dt>
            <dd className="num text-right" data-testid="t-sub">
              {fmtMoney(sumEx)}
            </dd>
          </div>
          {inv.discount > 0 && (
            <div className="ie-pair contents">
              <dt className="text-muted">Discount</dt>
              <dd className="num text-right">{fmtMoney(-Math.min(inv.discount, sumEx))}</dd>
            </div>
          )}
          <div className="ie-pair contents">
            <dt className="text-muted">GST</dt>
            <dd className="num text-right" data-testid="t-gst">
              {fmtMoney(totals.gst)}
            </dd>
          </div>
          <div className="ie-pair ie-pair-total contents">
            <dt className="font-bold">Total with GST</dt>
            <dd className="num text-right text-xl font-bold" data-testid="t-total">
              {fmtMoney(totals.total)}
            </dd>
          </div>
        </dl>
        {quoteNote && <p className="t-small mt-2 text-muted">{quoteNote}</p>}
      </section>

      {ws ? (
        <>
          <div className="min-w-0">{form}</div>
          <div className="hidden print:block">
            <InvoiceSheet invoice={inv} />
          </div>
          {ws.slot && createPortal(<InvoiceSheet invoice={inv} />, ws.slot)}
        </>
      ) : (
      <SplitPane
        storageKey="hub.invoice.split"
        leftLabel="Edit the invoice"
        rightLabel={pane === 'preview' ? 'What the customer will see' : `${PANES.find((p) => p.id === pane)?.label}, next to the invoice`}
        rightName={pane === 'preview' ? 'Preview' : PANES.find((p) => p.id === pane)?.label}
        rightScroll={pane !== 'preview'}
        rightHeader={sidePicker}
        printOnly={<InvoiceSheet invoice={inv} />}
        left={form}
        right={rightBody}
      />
      )}

      <ConfirmDialog open={sendOpen} action="send-invoice" title={`Send invoice ${inv.number}?`} confirmLabel="Yes, send it" onConfirm={confirmSend} onClose={() => setSendOpen(false)}>
        <div className="space-y-3">
          {DEMO && DATA_SOURCE !== 'live' && <Notice>Nothing is sent in this demo. The invoice just shows as Sent in this browser.</Notice>}
          <p className="t-body">
            This will email invoice {inv.number} to {customer} at {email || 'no email on file'}.{DATA_SOURCE === 'live' ? ' The CRM sends it.' : ' Nothing is sent in this demo.'}
          </p>
          <p className="t-body">
            Total with GST <span className="num font-bold">{fmtMoney(totals.total)}</span>
          </p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog open={deleteOpen} action="delete-invoice" title="Delete this draft?" confirmLabel="Yes, delete it" tone="danger" onConfirm={confirmDelete} onClose={() => setDeleteOpen(false)}>
        <p className="t-body">Invoice {inv.number} will be removed for good. This cannot be undone.</p>
      </ConfirmDialog>
    </div>
  )
}
