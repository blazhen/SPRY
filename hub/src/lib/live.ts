import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { DATA_SOURCE } from '../config'
import { AuthError, NotConfiguredError, contactFromApi, contactsApi, invoicesApi, jobFromApi, jobsApi, participantsApi, pipelinesApi, storeApi, usersApi } from './api'
import { applyStages, applyUsers, ensureContactTasks, getContact, getJob, getState, liveMergeContacts, liveMergeInvoices, liveMergeJobs, liveSetExtras, liveSetInvoiceExtras, peopleOfJob, processAcceptedPending, syncJobTasks } from './store'
import type { Contact, Invoice } from '../types'

/**
 * Live mode: loads the CRM's jobs, owners and stage names once at start, and fetches contacts and extra people lazily.
 * Mock mode never uses this file (every function here does nothing and the status is always ready).
 *
 * - Jobs: the first page of each status (open, won, lost) tells the total, the rest of the pages are fetched in parallel.
 *   Caps: 500 open, 200 won, 200 lost (100 a page). Filtering and paging on screen then work on the loaded set.
 * - A failed load shows a retry card (see Shell), never an empty list. Owners and stage names fail softly (built-in list).
 * - The CRM's search lags a few seconds, so a job or contact made here is added to the state from the POST answer and
 *   merged by id with every later load (store.liveMergeJobs).
 */

export type LiveStatus = 'loading' | 'ready' | 'error'
export interface LiveInfo {
  status: LiveStatus
  /** Plain words for the retry card when status is error. */
  error: string
}

const LIVE = DATA_SOURCE === 'live'
const PAGE = 100
const CAPS = { open: 500, won: 200, lost: 200 } as const

let info: LiveInfo = { status: LIVE ? 'loading' : 'ready', error: '' }
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const set = (next: LiveInfo) => {
  info = next
  listeners.forEach((l) => l())
}
export const useLive = (): LiveInfo => useSyncExternalStore(subscribe, () => info)

async function loadStatus(status: 'open' | 'won' | 'lost') {
  const cap = CAPS[status]
  const first = await jobsApi.listAll({ page: 1, pageSize: PAGE, status })
  const rows = [...first.jobs]
  if (first.total !== undefined) {
    const pages = Math.ceil(Math.min(first.total, cap) / PAGE)
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => jobsApi.listAll({ page: i + 2, pageSize: PAGE, status })))
    for (const r of rest) rows.push(...r.jobs)
  } else {
    let more = first.hasMore
    for (let page = 2; more && rows.length < cap; page++) {
      const r = await jobsApi.listAll({ page, pageSize: PAGE, status })
      rows.push(...r.jobs)
      more = r.hasMore
    }
  }
  return rows.slice(0, cap)
}

let running: Promise<void> | undefined

async function run() {
  set({ status: 'loading', error: '' })
  try {
    // Stage names first: jobs are mapped onto them. Owners may fail softly.
    const [pipes, users] = await Promise.all([
      pipelinesApi.list().catch((e: unknown) => {
        if (e instanceof AuthError || e instanceof NotConfiguredError) throw e
        return []
      }),
      usersApi.list().catch((e: unknown) => {
        if (e instanceof AuthError || e instanceof NotConfiguredError) throw e
        return []
      }),
    ])
    if (pipes[0]?.stages.length) applyStages(pipes[0].stages.map((st) => st.name))
    applyUsers(users)
    const [open, won, lost] = await Promise.all([loadStatus('open'), loadStatus('won'), loadStatus('lost')])
    const all = [...open, ...won, ...lost]
    // Names the CRM sent with the jobs: the list shows them at once, and the full contact still loads when a screen needs it.
    liveMergeContacts(all.filter((r) => r.contactId && r.contactName).map((r) => ({ id: r.contactId, name: r.contactName ?? '', email: '', phone: '', placeholder: true as const })), true)
    liveMergeJobs(all.map((row) => jobFromApi(row)))
    set({ status: 'ready', error: '' })
    void loadInvoices() // the invoices list has its own retry card, so it never holds the jobs back
  } catch (e) {
    const message = e instanceof NotConfiguredError || e instanceof AuthError ? e.message : 'The list could not be loaded. Check your connection and try again.'
    set({ status: 'error', error: message })
  }
}

// ---- Invoices -----------------------------------------------------------------------------------
// Every CRM invoice (all pages) plus the Hub's saved details for them (storage collection invoices, keyed by the CRM id).

const INVOICE_PAGE_CAP = 40
let invoiceInfo: LiveInfo = { status: LIVE ? 'loading' : 'ready', error: '' }
const invoiceListeners = new Set<() => void>()
const subscribeInvoices = (l: () => void) => {
  invoiceListeners.add(l)
  return () => invoiceListeners.delete(l)
}
const setInvoiceInfo = (next: LiveInfo) => {
  invoiceInfo = next
  invoiceListeners.forEach((l) => l())
}
/** Loading state of the invoices list (error: show a retry card, not an empty list). */
export const useInvoiceLoad = (): LiveInfo => useSyncExternalStore(subscribeInvoices, () => invoiceInfo)

let invoicesRunning: Promise<void> | undefined

async function fetchInvoices(): Promise<Invoice[]> {
  const first = await invoicesApi.listPage(1)
  const out = [...first.invoices]
  const size = first.pageSize ?? 20
  let last = first.invoices.length
  for (let page = 2; page <= INVOICE_PAGE_CAP && last > 0 && last >= size && (first.total === undefined || out.length < first.total); page++) {
    const r = await invoicesApi.listPage(page)
    out.push(...r.invoices)
    last = r.invoices.length
  }
  return out
}

/** Loads all invoices and the Hub details once at start (and again from the retry card). */
export function loadInvoices(): Promise<void> {
  if (!LIVE) return Promise.resolve()
  if (invoicesRunning) return invoicesRunning
  setInvoiceInfo({ status: 'loading', error: '' })
  invoicesRunning = (async () => {
    try {
      const [extras, rows] = await Promise.all([storeApi.list('invoices'), fetchInvoices()])
      liveSetInvoiceExtras(extras)
      extrasReady = true
      liveMergeInvoices(rows)
      setInvoiceInfo({ status: 'ready', error: '' })
      void processAcceptedPending(true) // quotes the customer accepted while nobody was looking
    } catch (e) {
      const message = e instanceof NotConfiguredError || e instanceof AuthError ? e.message : 'The invoices could not be loaded. Check your connection and try again.'
      setInvoiceInfo({ status: 'error', error: message })
    } finally {
      invoicesRunning = undefined
    }
  })()
  return invoicesRunning
}

/** True once the full invoice list has been loaded (quotes accepted online wait for this before they make their invoices). */
export const invoicesLoaded = (): boolean => invoiceInfo.status === 'ready'

/** The retry card's button on the Invoices page. */
export const retryInvoices = (): void => void loadInvoices()

let extrasReady = false
const contactInvoicesDone = new Set<string>()

/** Live: the invoices of one contact, fetched once per session when its page opens and merged by id. */
export function useContactInvoices(contactId: string): void {
  useEffect(() => {
    if (!LIVE || !contactId || contactInvoicesDone.has(contactId)) return
    contactInvoicesDone.add(contactId)
    void (async () => {
      try {
        if (!extrasReady) liveSetInvoiceExtras(await storeApi.list('invoices'))
        liveMergeInvoices(await invoicesApi.listForContact(contactId))
      } catch {
        contactInvoicesDone.delete(contactId) // try again the next time the page opens
      }
    })()
  }, [contactId])
}

/** Live: loads the tasks of everyone on a job (they are kept on the people, see store.ts). */
export function ensureJobTasks(jobId: string): void {
  const job = LIVE ? getJob(jobId) : undefined
  if (!job) return
  const people = peopleOfJob(job)
  people.forEach(ensureContactTasks)
  syncJobTasks(people)
}

/** Load (and keep in step) the tasks of these people. Mock mode does nothing. */
export function useLiveTasks(contactIds: string[]): void {
  const key = contactIds.join(',')
  useEffect(() => {
    if (!LIVE || !key) return
    const ids = key.split(',')
    ids.forEach(ensureContactTasks)
    syncJobTasks(ids)
  }, [key])
}

/** Starts the first load once (live mode). Calling it again does nothing while a load is running or done. */
export function startLive(): void {
  if (!LIVE || running || info.status === 'ready') return
  running = run().finally(() => {
    running = undefined
  })
}

/** The retry card's button. */
export function retryLive(): void {
  if (!LIVE || running) return
  running = run().finally(() => {
    running = undefined
  })
}

// ---- Extra people on a job ---------------------------------------------------------

const participantsDone = new Set<string>()

/** Live mode: fetches the extra people of a job once per session (when its page opens). */
export function ensureParticipants(jobId: string): void {
  if (!LIVE || participantsDone.has(jobId)) return
  participantsDone.add(jobId)
  ensureJobTasks(jobId) // the main contact's tasks start loading now, the extra people's once they are known
  participantsApi.list(jobId).then(
    (list) => {
      liveSetExtras(jobId, list.filter((p) => p.kind === 'contact' && p.role !== 'main'))
      ensureJobTasks(jobId)
    },
    () => {
      participantsDone.delete(jobId) // try again the next time the job opens
    },
  )
}

/** Call from a job page: loads that job's extra people in live mode. */
export function useJobParticipants(jobId: string): void {
  useEffect(() => {
    ensureParticipants(jobId)
  }, [jobId])
}

// ---- Searching contacts -----------------------------------------------------------

export interface ContactSearch {
  /** null in mock mode: filter the local list instead. */
  rows: Contact[] | null
  loading: boolean
  /** Plain words when the last search failed. */
  error: string
  hasMore: boolean
  more: () => void
}

/**
 * Live mode: asks the CRM for contacts matching the text (300 ms after typing stops, one page at a time) and keeps
 * the answers in the store. Mock mode: does nothing (rows is null).
 */
export function useContactSearch(text: string, enabled = true): ContactSearch {
  const q = text.trim()
  const [ids, setIds] = useState<string[]>([])
  const [loading, setLoading] = useState(LIVE && enabled)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const page = useRef(1)
  const seq = useRef(0)

  const fetchPage = (p: number, replace: boolean) => {
    const mine = ++seq.current
    setLoading(true)
    contactsApi.list(q, p).then(
      (r) => {
        if (mine !== seq.current) return
        const rows = r.contacts.map(contactFromApi)
        liveMergeContacts(rows)
        page.current = p
        setIds((old) => (replace ? rows.map((c) => c.id) : [...old, ...rows.map((c) => c.id).filter((id) => !old.includes(id))]))
        setHasMore(r.total !== undefined ? p * Math.max(1, r.contacts.length) < r.total : r.contacts.length >= 20)
        setError('')
        setLoading(false)
      },
      () => {
        if (mine !== seq.current) return
        setError('The search could not reach the server. Try again.')
        setLoading(false)
      },
    )
  }

  useEffect(() => {
    if (!LIVE || !enabled) return
    setLoading(true)
    const t = setTimeout(() => fetchPage(1, true), 300)
    return () => clearTimeout(t)
    // fetchPage only uses q
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, enabled])

  if (!LIVE || !enabled) return { rows: null, loading: false, error: '', hasMore: false, more: () => undefined }
  const rows = ids.flatMap((id) => {
    const c = getState().contacts.find((x) => x.id === id) ?? getContact(id)
    return c ? [c] : []
  })
  return { rows, loading, error, hasMore, more: () => fetchPage(page.current + 1, false) }
}
