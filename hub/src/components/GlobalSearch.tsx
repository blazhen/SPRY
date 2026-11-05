import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { href } from '../lib/router'
import { daysSince, fmtMoney, jobText, word } from '../lib/format'
import { NewJobDialog } from './NewJobDialog'
import './newJob.css'
import { quoteTotals } from '../lib/calc'
import { kindLabel, useRecentRows } from './RecentList'
import { whenText } from '../lib/recent'
import { getCompany, listJobs, participantName, useStore } from '../lib/store'
import type { Contact, Job, Quote } from '../types'

const MAX = 5
const KIND_ORDER = { job: 0, contact: 1, quote: 2 } as const
const digits = (s: string) => s.replace(/\D/g, '')
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '')

interface Hit {
  key: string
  to: string
  title: string
  detail: string[]
}
interface Group {
  id: 'jobs' | 'contacts' | 'quotes'
  label: string
  total: number
  hits: Hit[]
  seeAll?: { to: string; text: string }
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** True when the query matches any of the texts. Case and spaces are ignored; phone numbers match on digits. */
function matches(query: string, texts: (string | undefined)[], phones: (string | undefined)[] = []): boolean {
  const q = squash(query)
  if (!q) return false
  if (texts.some((t) => t && squash(t).includes(q))) return true
  const qd = digits(query)
  return qd.length >= 3 && phones.some((p) => p && digits(p).includes(qd))
}

function useResults(query: string): Group[] {
  const s = useStore()
  return useMemo(() => {
    const q = query.trim()
    if (!q) return []
    const contactPhones = (c: Contact) => [c.phone, c.mobile]
    const contactsAll = s.contacts.filter((c) => matches(q, [c.name, c.email, c.address, c.companyId ? getCompany(c.companyId, s)?.name : undefined], contactPhones(c)))
    const phoneJobIds = new Set<string>()
    const qd = digits(q)
    if (qd.length >= 3) {
      for (const j of s.jobs) {
        for (const p of j.participants) {
          const c = p.kind === 'contact' ? s.contacts.find((x) => x.id === p.id) : undefined
          if (c && contactPhones(c).some((ph) => ph && digits(ph).includes(qd))) phoneJobIds.add(j.id)
        }
      }
    }
    const jobsAll: Job[] = s.jobs.filter((j) => phoneJobIds.has(j.id) || listJobs({ search: q }, s).some((x) => x.id === j.id) || matches(q, [j.name, j.address]))
    const quotesAll: Quote[] = s.quotes.filter((x) => {
      const job = s.jobs.find((j) => j.id === x.jobId)
      return matches(q, [x.number, x.title, job?.name, participantName(x.recipient, s)])
    })
    const jobLabel = (j: Job) => participantName((j.participants.find((p) => p.role === 'main') ?? j.participants[0]) ?? { kind: 'contact', id: '' }, s)
    const groups: Group[] = [
      {
        id: 'jobs',
        label: word(true),
        total: jobsAll.length,
        hits: jobsAll.slice(0, MAX).map((j) => {
          const d = daysSince(j.stageSince)
          return { key: j.id, to: href.job(j.id), title: j.name, detail: [j.participants.length ? jobLabel(j) : 'No contact yet', j.address, `${j.stage}, ${d} ${d === 1 ? 'day' : 'days'}`].filter(Boolean) }
        }),
        seeAll: jobsAll.length > MAX ? { to: `#/jobs?q=${encodeURIComponent(q)}`, text: `See all ${jobsAll.length} ${word(true, true)}` } : undefined,
      },
      {
        id: 'contacts',
        label: 'Contacts',
        total: contactsAll.length,
        hits: contactsAll.slice(0, MAX).map((c) => ({
          key: c.id,
          to: href.contact(c.id),
          title: c.name,
          detail: [c.companyId ? getCompany(c.companyId, s)?.name : '', c.phone, c.email].filter((x): x is string => !!x),
        })),
      },
      {
        id: 'quotes',
        label: 'Quotes',
        total: quotesAll.length,
        hits: quotesAll.slice(0, MAX).map((x) => ({
          key: x.id,
          to: href.edit(x.id),
          title: `${x.number} for ${participantName(x.recipient, s)}`,
          detail: [s.jobs.find((j) => j.id === x.jobId)?.name, x.status, fmtMoney(quoteTotals(x).total)].filter((v): v is string => !!v),
        })),
      },
    ]
    return groups.filter((g) => g.total > 0)
  }, [query, s])
}

export function GlobalSearch({ variant = 'top' }: { variant?: 'top' | 'icon' }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const btn = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const listId = useId()
  const query = useDebounced(text, 150)
  const groups = useResults(query)
  const [making, setMaking] = useState(false)
  // Recently opened, jobs first (the sort keeps the newest-first order inside each kind).
  const recentRaw = useRecentRows()
  const recent = useMemo(() => [...recentRaw].sort((a, b) => KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind]), [recentRaw])
  const typing = text.trim().length > 0

  // Every row you can step through with the arrow keys, in order.
  const rows = useMemo(() => {
    if (!typing) return recent.map((r) => ({ key: 'r-' + r.item.kind + r.item.id, to: r.to }))
    return groups.flatMap((g) => [...g.hits.map((h) => ({ key: `${g.id}-${h.key}`, to: h.to })), ...(g.seeAll ? [{ key: g.id + '-all', to: g.seeAll.to }] : [])])
  }, [typing, recent, groups])

  const close = () => {
    setOpen(false)
    setText('')
    setActive(0)
    btn.current?.focus()
  }

  // "/" and Ctrl+K open it from anywhere (but "/" is left alone while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typingInField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === '/' && !typingInField && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query, typing])

  useEffect(() => {
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  const openRow = (i: number) => {
    const r = rows[i]
    if (!r) return
    setOpen(false)
    setText('')
    window.location.hash = r.to.replace(/^#/, '')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // Like a search box: the first Escape clears what was typed, the second closes.
      if (text) setText('')
      else close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (rows.length) setActive((a) => (a + 1) % rows.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (rows.length) setActive((a) => (a - 1 + rows.length) % rows.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      openRow(active)
    } else if (e.key === 'Tab') {
      // Keep Tab inside the dialog.
      const f = box.current?.querySelectorAll<HTMLElement>('input, button, a[href]')
      // (the "Make a new" button is inside the dialog too, so it is part of this loop)
      if (!f || f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const found = groups.reduce((n, g) => n + g.total, 0)
  const waiting = typing && text !== query
  const count = !typing ? '' : waiting ? 'Searching' : found === 0 ? 'Nothing found' : `${found} ${found === 1 ? 'result' : 'results'} found`
  let idx = -1
  const optId = (i: number) => `${listId}-opt-${i}`
  const optClass = (i: number) => `gs-row ${i === active ? 'bg-navy-wash outline outline-2 outline-offset-[-2px]' : ''}`

  return (
    <>
      <NewJobDialog open={making} onClose={() => setMaking(false)} />
      <button ref={btn} type="button" className={variant === 'icon' ? 'chip' : 'btn btn-neutral'} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Search size={16} aria-hidden="true" />
        <span className="min-[640px]:max-[1099px]:sr-only">Search</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-start sm:p-6 sm:pt-[8vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
          <div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={onKeyDown}
            className="flex h-full w-full flex-col overflow-hidden bg-surface text-ink sm:h-auto sm:max-h-[80vh] sm:max-w-2xl sm:rounded-2xl sm:border-2"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <h2 id={titleId} className="font-display text-2xl">
                Search
              </h2>
              <button type="button" className="btn btn-neutral" onClick={close}>
                <X size={16} aria-hidden="true" />
                Close
              </button>
            </div>
            <div className="px-4 py-3">
              <label className="label" htmlFor={`${listId}-input`}>
                Search jobs, contacts and quotes
              </label>
              <input
                ref={input}
                id={`${listId}-input`}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={rows.length ? optId(active) : undefined}
                className="field"
                autoComplete="off"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="A name, address, phone number or quote number"
              />
              <p className="sr-only" role="status" aria-live="polite">
                {count}
              </p>
            </div>
            <div id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {!typing && recent.length > 0 && (
                <div className="px-2">
                  <h3 className="mb-1 mt-2 px-2 text-[1.0625rem] font-bold text-muted">Recently opened</h3>
                  {recent.map((r) => {
                    idx++
                    const i = idx
                    return (
                      <a key={r.item.kind + r.item.id} id={optId(i)} role="option" aria-selected={i === active} href={r.to} className={optClass(i)} onClick={() => { setOpen(false); setText('') }} onMouseMove={() => setActive(i)}>
                        <span className="gs-title">{r.name}</span>
                        <span className="gs-meta">{kindLabel(r.item.kind)}, {whenText(r.item.at)}</span>
                      </a>
                    )
                  })}
                </div>
              )}
              {typing && !waiting && found === 0 && (
                <div className="gs-empty">
                  <p className="text-lg">Nothing found. Try fewer letters, or make a new {word(false, true)}.</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setOpen(false)
                      setText('')
                      setMaking(true)
                    }}
                  >
                    {jobText('Make a new %j')}
                  </button>
                </div>
              )}
              {typing &&
                groups.map((g) => (
                  <div key={g.id} className="px-2">
                    <h3 className="mb-1 mt-3 px-2 text-[1.0625rem] font-bold text-muted">{g.label}</h3>
                    {g.hits.map((h) => {
                      idx++
                      const i = idx
                      return (
                        <a key={h.key} id={optId(i)} role="option" aria-selected={i === active} href={h.to} className={optClass(i)} onClick={() => { setOpen(false); setText('') }} onMouseMove={() => setActive(i)}>
                          <span className="gs-title">{h.title}</span>
                          <span className="gs-meta">
                            {h.detail.map((d, n) => (
                              <span key={n}>{d}</span>
                            ))}
                          </span>
                        </a>
                      )
                    })}
                    {g.seeAll && (() => {
                      idx++
                      const i = idx
                      return (
                        <a id={optId(i)} role="option" aria-selected={i === active} href={g.seeAll.to} className={optClass(i) + ' font-bold underline'} onClick={() => { setOpen(false); setText('') }} onMouseMove={() => setActive(i)}>
                          {g.seeAll.text}
                        </a>
                      )
                    })()}
                  </div>
                ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
