// Client for the Hub proxy (see server/API.md for every route and shape).
// Used only in live mode. Mock mode never calls this file.
//
// Token: the signed link carries ?t=... (in the query or inside the hash). We keep it in sessionStorage,
// send it as X-Quote-Token on every call, and remove it from the address bar. It is never logged.

import { PROXY_URL } from '../config'
import { stageIndex, stageList } from './format'
import { isPurpose, type PhotoMeta } from './photoPurposes'
import type { Contact, Invoice, Job, JobStatus, Message, Participant, ParticipantKind, ParticipantRole, Stage } from '../types'

// ---- Token -----------------------------------------------------------------

const TOKEN_KEY = 'hub.token'
const TOKEN_HEADER = 'X-Quote-Token'
/** Fired on window when any call gets a 401. */
export const AUTH_LOST_EVENT = 'hub:auth-lost'

function readSession(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Finds ?t= in the address (query or hash query), stores it, and cleans the address. Safe to call often. */
export function captureToken(): void {
  if (typeof window === 'undefined') return
  const { search, hash, pathname } = window.location
  let found = ''
  let newSearch = search
  let newHash = hash

  const q = new URLSearchParams(search)
  if (q.has('t')) {
    found = q.get('t') ?? ''
    q.delete('t')
    const rest = q.toString()
    newSearch = rest ? `?${rest}` : ''
  }

  const at = hash.indexOf('?')
  if (at >= 0) {
    const hq = new URLSearchParams(hash.slice(at + 1))
    if (hq.has('t')) {
      if (!found) found = hq.get('t') ?? ''
      hq.delete('t')
      const rest = hq.toString()
      newHash = hash.slice(0, at) + (rest ? `?${rest}` : '')
    }
  }

  if (newSearch === search && newHash === hash) return
  if (found) {
    try {
      sessionStorage.setItem(TOKEN_KEY, found)
    } catch {
      /* storage blocked: the token only lives for this page load */
      memoryToken = found
    }
  }
  window.history.replaceState(window.history.state, '', pathname + newSearch + newHash)
}

let memoryToken = ''

export function getToken(): string {
  captureToken()
  return readSession() || memoryToken
}

// ---- Errors ----------------------------------------------------------------

/** 401: no token, or a bad or expired one. */
export class AuthError extends Error {
  constructor(message = 'Not allowed') {
    super(message)
    this.name = 'AuthError'
  }
}

/** 503: the server has no access settings yet. */
export class NotConfiguredError extends Error {
  constructor(message = 'The Hub is not set up yet') {
    super(message)
    this.name = 'NotConfiguredError'
  }
}

/** The request never got an answer (offline, server down, blocked). */
export class NetworkError extends Error {
  constructor(message = 'Could not reach the server') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** Any other failed answer. status 409 on a store write means a newer copy exists. */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---- Fetch -----------------------------------------------------------------

type Json = unknown

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : d)
const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : d
}
const rows = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isRecord) : [])

function buildUrl(path: string, query?: FetchOptions['query']): string {
  const p = new URLSearchParams()
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const qs = p.toString()
  return `${PROXY_URL}${path}${qs ? `?${qs}` : ''}`
}

async function once(url: string, opts: FetchOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers[TOKEN_HEADER] = token
  let body: string | undefined
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  return fetch(url, { method: opts.method ?? 'GET', headers, body, credentials: 'same-origin', cache: 'no-store' })
}

/** Calls one route. Returns the parsed body (unknown: callers check it). Throws AuthError, NotConfiguredError, NetworkError or ApiError. */
export async function apiFetch(path: string, opts: FetchOptions = {}): Promise<Json> {
  const url = buildUrl(path, opts.query)
  const method = opts.method ?? 'GET'
  let res: Response
  try {
    res = await once(url, opts)
  } catch {
    if (method !== 'GET') throw new NetworkError()
    try {
      res = await once(url, opts) // one retry, GET only
    } catch {
      throw new NetworkError()
    }
  }

  let parsed: Json = null
  try {
    const text = await res.text()
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  const message = isRecord(parsed) && typeof parsed.error === 'string' ? parsed.error : ''

  if (res.status === 401) {
    window.dispatchEvent(new Event(AUTH_LOST_EVENT)) // lets the access gate switch to the locked screen
    throw new AuthError(message || undefined)
  }
  if (res.status === 503) throw new NotConfiguredError(message || undefined)
  if (!res.ok) throw new ApiError(res.status, message || `Request failed (${res.status})`)
  return parsed
}

const field = (body: Json, key: string): unknown => (isRecord(body) ? body[key] : undefined)

// ---- Row types (server shapes) ---------------------------------------------

export interface ApiContactRow {
  id: string
  name: string
  email: string
  phone: string
  suburb: string
  companyName?: string
  customFields?: { id: string; name: string; value: string | number | null }[]
  /** Kept in the CRM as contact custom fields. Missing when the server did not read them. */
  mobile?: string
  homeAddress?: string
  privateNote?: string
}
export interface ApiJobField {
  id: string
  name: string
  value: string | number | null
}
export interface ApiJobRow {
  id: string
  contactId: string
  /** The contact's name from the job row, '' when the server did not send one. */
  contactName?: string
  title: string
  /** The JOB SITE address (the CRM job field site_address). Empty when not set. */
  address: string
  /** Access notes (the CRM job field access_notes). */
  accessNotes?: string
  stage: string
  status: string
  monetaryValue: number
  pipelineName: string
  customFields: ApiJobField[]
  ownerId: string
  source: string
  /** ISO, '' when the server did not send one. */
  createdAt: string
  stageSince: string
  companyName?: string
}
export interface ApiNote {
  id: string
  body: string
  createdAt: string
  createdBy?: string
}
export interface ApiTask {
  id: string
  title: string
  description?: string
  /** YYYY-MM-DD in the Hub time zone (the server converts, so the day never shifts). */
  dueDate?: string
  /** HH:MM in the Hub time zone; missing means all day. */
  dueTime?: string
  completed: boolean
}
export interface ApiParticipant {
  kind: ParticipantKind
  id: string
  role: ParticipantRole
  name: string
}
export interface ApiPipeline {
  id: string
  name: string
  stages: { id: string; name: string }[]
}
export interface ApiUser {
  id: string
  name: string
}
export interface StoreRecord {
  id: string
  data: unknown
  updatedAt: string
}
export type StoreCollection = 'quotes' | 'invoices' | 'terms' | 'templates' | 'priceItems' | 'settings' | 'followups' | 'events' | 'messages' | 'jobmeta' | 'companies' | 'quoteOpens' | 'inspection'

// ---- Parsers and mappers ---------------------------------------------------

function contactRow(r: Record<string, unknown>): ApiContactRow {
  const out: ApiContactRow = { id: str(r.id), name: str(r.name), email: str(r.email), phone: str(r.phone), suburb: str(r.suburb) }
  if (r.companyName) out.companyName = str(r.companyName)
  if (typeof r.mobile === 'string') out.mobile = r.mobile
  if (typeof r.homeAddress === 'string') out.homeAddress = r.homeAddress
  if (typeof r.privateNote === 'string') out.privateNote = r.privateNote
  return out
}

function jobRow(r: Record<string, unknown>): ApiJobRow {
  const out: ApiJobRow = {
    id: str(r.id),
    contactId: str(r.contactId),
    contactName: str(r.contactName),
    title: str(r.title),
    address: str(r.siteAddress ?? r.address),
    accessNotes: str(r.accessNotes),
    stage: str(r.stage),
    status: str(r.status),
    monetaryValue: num(r.monetaryValue),
    pipelineName: str(r.pipelineName),
    customFields: rows(r.customFields).map((f) => ({
      id: str(f.id),
      name: str(f.name),
      value: typeof f.value === 'string' || typeof f.value === 'number' ? f.value : null,
    })),
    ownerId: str(r.ownerId),
    source: str(r.source),
    createdAt: str(r.createdAt),
    stageSince: str(r.stageSince),
  }
  if (r.companyName) out.companyName = str(r.companyName)
  return out
}

/**
 * Server job row to Hub Job. Gaps (the server has no such data, so defaults fill in):
 * - stage: kept when it is in the active stage list (the CRM's, see setStages), else the first stage.
 *   status won/lost sets Job.status and leaves the stage as the CRM has it (abandoned counts as lost).
 * - participants: empty here. Fetch with participantsApi.list(jobId) and set job.participants (the main contact is contactId).
 * - tasks and appointments: empty. Tasks live on the contact (tasksApi.list(contactId)).
 * - ownerId, source, createdAt and stageSince come from the server row (ownerId is the CRM user id, '' when unassigned;
 *   a missing date falls back to now). businessName, notes, productType and the like are Hub-only: the store fills them
 *   from the jobmeta collection (defaults here). Custom fields (row.customFields) are not mapped yet.
 * - placeholder stays true to satisfy the type.
 */
export function jobFromApi(row: ApiJobRow, ownerId = row.ownerId): Job {
  const now = new Date().toISOString()
  const status = row.status.toLowerCase()
  const jobStatus: JobStatus = status === 'won' ? 'won' : status === 'lost' || status === 'abandoned' ? 'lost' : 'open'
  const idx = stageIndex(row.stage)
  const stage: Stage = stageList()[idx >= 0 ? idx : 0]
  const participants: Participant[] = row.contactId ? [{ kind: 'contact', id: row.contactId, role: 'main' }] : []
  return {
    id: row.id,
    name: row.title,
    address: row.address,
    source: row.source,
    value: row.monetaryValue,
    ownerId,
    stage,
    status: jobStatus,
    businessName: '',
    productType: 'Spray foam',
    notes: row.accessNotes ?? '',
    createdAt: row.createdAt || now,
    stageSince: (row.stageSince || row.createdAt || now).slice(0, 10),
    participants,
    tasks: [],
    appointments: [],
    customFields: (row.customFields ?? []).map((f) => ({ id: f.id, name: f.name, value: f.value })),
    placeholder: true,
  }
}

/** Server contact row to Hub Contact. Gaps: no mobile, note or companyId (companyName is dropped), suburb goes in address. */
export function contactFromApi(row: ApiContactRow): Contact {
  const c: Contact = { id: row.id, name: row.name, email: row.email, phone: row.phone, address: row.suburb || undefined, customFields: row.customFields ?? [], placeholder: true }
  // Only set when the CRM sent them, so a merge never wipes what the browser already holds.
  if (row.companyName) c.companyName = row.companyName
  if (row.mobile !== undefined) c.mobile = row.mobile
  if (row.homeAddress !== undefined) c.address = row.homeAddress
  if (row.privateNote !== undefined) c.note = row.privateNote
  return c
}

const contactOf = (b: Json): ApiContactRow => contactRow(isRecord(field(b, 'contact')) ? (field(b, 'contact') as Record<string, unknown>) : {})
const jobOf = (b: Json): ApiJobRow => jobRow(isRecord(field(b, 'job')) ? (field(b, 'job') as Record<string, unknown>) : {})
const noteRow = (r: Record<string, unknown>): ApiNote => ({ id: str(r.id), body: str(r.body), createdAt: str(r.createdAt), createdBy: r.createdBy ? str(r.createdBy) : undefined })
const taskRow = (r: Record<string, unknown>): ApiTask => ({ id: str(r.id), title: str(r.title), description: r.description ? str(r.description) : undefined, dueDate: r.dueDate ? str(r.dueDate) : undefined, dueTime: r.dueTime ? str(r.dueTime) : undefined, completed: r.completed === true })
const partRow = (r: Record<string, unknown>): ApiParticipant => ({
  kind: r.kind === 'company' ? 'company' : 'contact',
  id: str(r.id),
  role: r.role === 'company' ? 'company' : r.role === 'extra' ? 'extra' : 'main',
  name: str(r.name),
})
const recordRow = (r: Record<string, unknown>): StoreRecord => ({ id: str(r.id), data: r.data, updatedAt: str(r.updatedAt) })
const optTotal = (b: Json): number | undefined => (typeof field(b, 'total') === 'number' ? (field(b, 'total') as number) : undefined)

// ---- Typed helpers, one per route in API.md --------------------------------

export async function verifyAuthCall(): Promise<boolean> {
  const b = await apiFetch('/api/auth')
  return field(b, 'ok') === true
}

export const contactsApi = {
  async list(q = '', page = 1): Promise<{ contacts: ApiContactRow[]; total?: number }> {
    const b = await apiFetch('/api/contacts', { query: { q, page } })
    return { contacts: rows(field(b, 'contacts')).map(contactRow), total: optTotal(b) }
  },
  async get(id: string): Promise<ApiContactRow> {
    return contactOf(await apiFetch('/api/contact', { query: { id } }))
  },
  async create(input: { name: string; email?: string; phone?: string; companyName?: string }): Promise<ApiContactRow> {
    return contactOf(await apiFetch('/api/contact', { method: 'POST', body: input }))
  },
  async update(id: string, patch: { name?: string; email?: string; phone?: string; mobile?: string; homeAddress?: string; privateNote?: string }): Promise<ApiContactRow> {
    return contactOf(await apiFetch('/api/contact', { method: 'PUT', query: { id }, body: patch }))
  },
}

export interface JobUpdate {
  stage?: string
  monetaryValue?: number
  name?: string
  assignedTo?: string
  status?: 'open' | 'won' | 'lost' | 'abandoned'
  /** The job site address (CRM field site_address). An empty text clears it. */
  siteAddress?: string
  /** Access notes (CRM field access_notes). */
  accessNotes?: string
  customFields?: { key?: string; id?: string; value: string | number }[]
}

export const jobsApi = {
  async listForContact(contactId: string): Promise<ApiJobRow[]> {
    return rows(field(await apiFetch('/api/jobs', { query: { contactId } }), 'jobs')).map(jobRow)
  },
  /** One page of every job with this status (server default open), up to 100 a page. hasMore is false when the server did not say. */
  async listAll(opts: { page?: number; pageSize?: number; status?: 'open' | 'won' | 'lost' | 'all' } = {}): Promise<{ jobs: ApiJobRow[]; total?: number; hasMore: boolean }> {
    const b = await apiFetch('/api/jobs', { query: { all: 1, page: opts.page ?? 1, pageSize: opts.pageSize, status: opts.status } })
    return { jobs: rows(field(b, 'jobs')).map(jobRow), total: optTotal(b), hasMore: field(b, 'hasMore') === true }
  },
  async create(input: { contactId: string; title: string; monetaryValue?: number; pipelineId?: string; stage?: string; siteAddress?: string; accessNotes?: string }): Promise<ApiJobRow> {
    return jobOf(await apiFetch('/api/jobs', { method: 'POST', body: input }))
  },
  async update(id: string, patch: JobUpdate): Promise<ApiJobRow> {
    return jobOf(await apiFetch('/api/job', { method: 'PUT', query: { id }, body: patch }))
  },
}

export const pipelinesApi = {
  async list(): Promise<ApiPipeline[]> {
    return rows(field(await apiFetch('/api/pipelines'), 'pipelines')).map((p) => ({
      id: str(p.id),
      name: str(p.name),
      stages: rows(p.stages).map((s) => ({ id: str(s.id), name: str(s.name) })),
    }))
  },
}

export interface OpportunityField {
  id: string
  key: string
  name: string
  dataType: string
  options: string[]
  fieldGroup?: string
  category?: string
}
export const opportunityFieldsApi = {
  /** Every job custom field definition plus the category (folder) each falls into. */
  async list(): Promise<{ fields: OpportunityField[]; categories: string[] }> {
    const b = await apiFetch('/api/opportunity-fields')
    const fields = rows(field(b, 'fields')).map((f) => ({
      id: str(f.id),
      key: str(f.key),
      name: str(f.name),
      dataType: str(f.dataType),
      options: Array.isArray(f.options) ? f.options.map((o) => str(o)) : [],
      fieldGroup: f.fieldGroup ? str(f.fieldGroup) : undefined,
      category: f.category ? str(f.category) : undefined,
    }))
    const rawCats = field(b, 'categories')
    const categories = Array.isArray(rawCats)
      ? (rawCats as unknown[]).filter((c): c is string => typeof c === 'string')
      : []
    return { fields, categories }
  },
}

export interface ContactField {
  id: string
  key: string
  name: string
  dataType: string
  options: string[]
  fieldGroup?: string
  category?: string
}
export const contactFieldsApi = {
  /** Every contact custom field definition for this location, with its category (folder). */
  async list(): Promise<ContactField[]> {
    const b = await apiFetch('/api/contact-fields')
    return rows(field(b, 'fields')).map((f) => ({
      id: str(f.id),
      key: str(f.key),
      name: str(f.name),
      dataType: str(f.dataType),
      options: Array.isArray(f.options) ? f.options.map((o) => str(o)) : [],
      fieldGroup: f.fieldGroup ? str(f.fieldGroup) : undefined,
      category: f.category ? str(f.category) : undefined,
    }))
  },
  /** Update one contact's custom field values. `values` is keyed by field id. */
  async update(contactId: string, values: { id: string; value: string | number }[]): Promise<ApiContactRow> {
    return contactOf(await apiFetch('/api/contact-fields', { method: 'PUT', query: { id: contactId }, body: { values } }))
  },
}

export const participantsApi = {
  async list(jobId: string): Promise<ApiParticipant[]> {
    return rows(field(await apiFetch('/api/participants', { query: { jobId } }), 'participants')).map(partRow)
  },
  async add(jobId: string, kind: ParticipantKind, id: string): Promise<ApiParticipant[]> {
    return rows(field(await apiFetch('/api/participants', { method: 'POST', body: { jobId, kind, id } }), 'participants')).map(partRow)
  },
  async remove(jobId: string, kind: ParticipantKind, id: string): Promise<ApiParticipant[]> {
    return rows(field(await apiFetch('/api/participants', { method: 'DELETE', query: { jobId, kind, id } }), 'participants')).map(partRow)
  },
}

export const notesApi = {
  async list(contactId: string): Promise<ApiNote[]> {
    return rows(field(await apiFetch('/api/notes', { query: { contactId } }), 'notes')).map(noteRow)
  },
  async add(contactId: string, body: string): Promise<ApiNote> {
    const b = await apiFetch('/api/notes', { method: 'POST', body: { contactId, body } })
    return noteRow(isRecord(field(b, 'note')) ? (field(b, 'note') as Record<string, unknown>) : {})
  },
  async remove(contactId: string, id: string): Promise<void> {
    await apiFetch('/api/notes', { method: 'DELETE', query: { contactId, id } })
  },
}

export const conversationsApi = {
  async listForContact(contactId: string): Promise<Message[]> {
    try {
      const b = await apiFetch('/api/notes', { query: { contactId, conversations: 1 } })
      return rows(field(b, 'messages')).map((r) => ({
        id: str(r.id),
        jobId: str(r.jobId),
        contactId: str(r.contactId),
        channel: (str(r.channel) === 'email' || str(r.channel) === 'call' ? str(r.channel) : 'sms') as Message['channel'],
        direction: str(r.direction) === 'in' ? 'in' : 'out',
        at: str(r.at),
        subject: r.subject ? str(r.subject) : undefined,
        body: str(r.body),
        automated: r.automated === true,
        callMinutes: typeof r.callMinutes === 'number' ? r.callMinutes : undefined,
      }))
    } catch {
      return []
    }
  },
}

export const tasksApi = {
  async list(contactId: string): Promise<ApiTask[]> {
    return rows(field(await apiFetch('/api/tasks', { query: { contactId } }), 'tasks')).map(taskRow)
  },
  async add(input: { contactId: string; title: string; description?: string; dueDate?: string; dueTime?: string; assignedTo?: string }): Promise<ApiTask> {
    const b = await apiFetch('/api/tasks', { method: 'POST', body: input })
    return taskRow(isRecord(field(b, 'task')) ? (field(b, 'task') as Record<string, unknown>) : {})
  },
  async update(contactId: string, id: string, patch: { completed?: boolean; title?: string; description?: string; dueDate?: string; dueTime?: string }): Promise<ApiTask> {
    const b = await apiFetch('/api/tasks', { method: 'PUT', query: { contactId, id }, body: patch })
    return taskRow(isRecord(field(b, 'task')) ? (field(b, 'task') as Record<string, unknown>) : {})
  },
}

const tagList = (b: Json): string[] => (Array.isArray(field(b, 'tags')) ? (field(b, 'tags') as unknown[]).map((t) => str(t)) : [])
export const tagsApi = {
  async add(contactId: string, tags: string[]): Promise<string[]> {
    return tagList(await apiFetch('/api/tags', { method: 'POST', body: { contactId, tags } }))
  },
  async remove(contactId: string, tag: string): Promise<string[]> {
    return tagList(await apiFetch('/api/tags', { method: 'DELETE', query: { contactId, tag } }))
  },
}

// The server returns the Hub Invoice shape, so these are cast after a light check that each row is an object with an id.
/** The editable parts of a draft invoice (PUT /api/invoices). */
export interface InvoiceUpdate {
  items?: Invoice['items']
  discount?: number
  issueDate?: string
  dueDate?: string
  notes?: string
  contactId?: string
}
const invoiceOf = (v: unknown): Invoice => (isRecord(v) ? (v as unknown as Invoice) : ({} as Invoice))
export const invoicesApi = {
  async listForContact(contactId: string): Promise<Invoice[]> {
    return rows(field(await apiFetch('/api/invoices', { query: { contactId } }), 'invoices')).map(invoiceOf)
  },
  async listAll(page = 1): Promise<Invoice[]> {
    return rows(field(await apiFetch('/api/invoices', { query: { all: 1, page } }), 'invoices')).map(invoiceOf)
  },
  /** One page of every invoice, with the paging numbers the server sent (total and pageSize are undefined when it did not). */
  async listPage(page = 1): Promise<{ invoices: Invoice[]; total?: number; pageSize?: number }> {
    const b = await apiFetch('/api/invoices', { query: { all: 1, page } })
    const size = field(b, 'pageSize')
    return { invoices: rows(field(b, 'invoices')).map(invoiceOf), total: optTotal(b), pageSize: typeof size === 'number' && size > 0 ? size : undefined }
  },
  async create(draft: Invoice): Promise<Invoice> {
    return invoiceOf(field(await apiFetch('/api/invoices', { method: 'POST', body: draft }), 'invoice'))
  },
  async send(id: string): Promise<Invoice> {
    return invoiceOf(field(await apiFetch('/api/invoices/send', { method: 'POST', query: { id } }), 'invoice'))
  },
  /** Drafts only. The server answers 409 "Only drafts can be edited" for anything else. Returns the invoice as the CRM now holds it. */
  async update(id: string, patch: InvoiceUpdate): Promise<Invoice> {
    return invoiceOf(field(await apiFetch('/api/invoices', { method: 'PUT', query: { id }, body: patch }), 'invoice'))
  },
  /** Amount is dollars including GST. Returns the invoice with its new status (part or paid) and its payments. */
  async payment(id: string, p: { amount: number; method: 'card' | 'bank' | 'cash' | 'cheque'; at?: string; note?: string }): Promise<Invoice> {
    return invoiceOf(field(await apiFetch('/api/invoices/payment', { method: 'POST', query: { id }, body: p }), 'invoice'))
  },
  /** 409 when the invoice is paid or part paid. */
  async void(id: string, reason?: string): Promise<Invoice> {
    return invoiceOf(field(await apiFetch('/api/invoices/void', { method: 'POST', query: { id }, body: reason ? { reason } : {} }), 'invoice'))
  },
  /** Drafts only (409 otherwise). */
  async remove(id: string): Promise<void> {
    await apiFetch('/api/invoices', { method: 'DELETE', query: { id } })
  },
}

export const usersApi = {
  async list(): Promise<ApiUser[]> {
    return rows(field(await apiFetch('/api/users'), 'users')).map((u) => ({ id: str(u.id), name: str(u.name) }))
  },
}

/** Shared Hub data. `get` returns null on 404. `put` throws ApiError with status 409 when ifUpdatedAt is older than stored. */
export const storeApi = {
  async list(collection: StoreCollection): Promise<StoreRecord[]> {
    return rows(field(await apiFetch('/api/store', { query: { collection } }), 'records')).map(recordRow)
  },
  async get(collection: StoreCollection, id: string): Promise<StoreRecord | null> {
    try {
      const r = field(await apiFetch('/api/store', { query: { collection, id } }), 'record')
      return isRecord(r) ? recordRow(r) : null
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },
  async put(collection: StoreCollection, id: string, data: unknown, ifUpdatedAt?: string): Promise<StoreRecord> {
    const b = await apiFetch('/api/store', { method: 'PUT', query: { collection, id }, body: ifUpdatedAt ? { data, ifUpdatedAt } : { data } })
    const r = field(b, 'record')
    return recordRow(isRecord(r) ? r : {})
  },
  async remove(collection: StoreCollection, id: string): Promise<void> {
    await apiFetch('/api/store', { method: 'DELETE', query: { collection, id } })
  },
}

// ---- Job files (private bucket, behind the Hub server) -----------------------------------------------------------

export interface ApiFileRow {
  id: string
  jobId: string
  source: 'file' | 'link'
  name: string
  kind: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: string
  url: string
  status: string
  /** Site photos only. */
  photo?: PhotoMeta
}
const photoOf = (v: unknown): PhotoMeta | undefined => {
  if (!isRecord(v) || !isPurpose(v.purpose)) return undefined
  const g = isRecord(v.geo) && typeof v.geo.lat === 'number' && typeof v.geo.lng === 'number' ? { lat: v.geo.lat, lng: v.geo.lng, acc: num(v.geo.acc) } : undefined
  return { purpose: v.purpose, sub: str(v.sub), caption: str(v.caption), takenAt: str(v.takenAt), takenBy: str(v.takenBy), width: num(v.width), height: num(v.height), onQuote: v.onQuote === true, ...(g ? { geo: g } : {}) }
}
const fileRow = (r: Record<string, unknown>): ApiFileRow => ({
  photo: photoOf(r.photo),
  id: str(r.id),
  jobId: str(r.jobId),
  source: r.source === 'link' ? 'link' : 'file',
  name: str(r.name),
  kind: str(r.kind, 'Other'),
  size: num(r.size),
  type: str(r.type),
  uploadedBy: str(r.uploadedBy),
  uploadedAt: str(r.uploadedAt),
  url: str(r.url),
  status: str(r.status, 'ready'),
})
const fileOf = (b: Json): ApiFileRow => fileRow(isRecord(field(b, 'file')) ? (field(b, 'file') as Record<string, unknown>) : {})

/** A PUT with upload progress (fetch cannot report it). Resolves with the HTTP status; rejects when the network fails. */
function putWithProgress(url: string, headers: Record<string, string>, file: Blob, onProgress: (fraction: number) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', url)
    for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v)
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    x.onload = () => resolve(x.status)
    x.onerror = () => reject(new Error('network'))
    x.onabort = () => reject(new Error('network'))
    x.send(file)
  })
}

/** /api/files: the server checks the token and the file rules. The browser sends the bytes straight to the signed upload address. */
export const filesApi = {
  async list(jobId: string): Promise<ApiFileRow[]> {
    return rows(field(await apiFetch('/api/files', { query: { jobId } }), 'files')).map(fileRow)
  },
  async link(input: { jobId: string; name: string; url: string; kind: string; uploadedBy: string }): Promise<ApiFileRow> {
    return fileOf(await apiFetch('/api/files', { method: 'POST', body: { op: 'link', ...input } }))
  },
  /** Asks for a signed upload address, sends the bytes to it, then confirms. Throws ApiError with the server's plain message. */
  async upload(input: { jobId: string; file: File; kind: string; uploadedBy: string; photo?: PhotoMeta; onProgress?: (fraction: number) => void }): Promise<ApiFileRow> {
    const { jobId, file, kind, uploadedBy, photo, onProgress } = input
    const b = await apiFetch('/api/files', { method: 'POST', body: { op: 'upload', jobId, name: file.name, size: file.size, type: file.type, kind, uploadedBy, ...(photo ? { photo } : {}) } })
    const row = fileOf(b)
    const uploadUrl = str(field(b, 'uploadUrl'))
    const hdr = field(b, 'uploadHeaders')
    if (!row.id || !uploadUrl) throw new ApiError(502, 'The upload could not be started.')
    const headers: Record<string, string> = isRecord(hdr) ? Object.fromEntries(Object.entries(hdr).map(([k, v]) => [k, String(v)])) : {}
    let status: number
    try {
      status = onProgress ? await putWithProgress(uploadUrl, headers, file, onProgress) : (await fetch(uploadUrl, { method: 'PUT', headers, body: file })).status
    } catch {
      throw new NetworkError()
    }
    if (status < 200 || status > 299) throw new ApiError(status, 'The file could not be sent. Please try again.')
    return fileOf(await apiFetch('/api/files', { method: 'POST', body: { op: 'confirm', id: row.id } }))
  },
  async rename(id: string, name: string): Promise<ApiFileRow> {
    return fileOf(await apiFetch('/api/files', { method: 'POST', body: { op: 'rename', id, name } }))
  },
  /** Change a photo's purpose, label, caption or quote flag. */
  async photo(id: string, edit: Partial<Pick<PhotoMeta, 'purpose' | 'sub' | 'caption' | 'onQuote'>>): Promise<ApiFileRow> {
    return fileOf(await apiFetch('/api/files', { method: 'POST', body: { op: 'photo', id, edit } }))
  },
  /** A short-lived signed address. inline: show it in the tab; otherwise it downloads. */
  async address(id: string, inline: boolean): Promise<string> {
    const b = await apiFetch('/api/files', { query: { id, download: 1, inline: inline ? 1 : undefined } })
    return str(field(b, 'url'))
  },
  async remove(id: string): Promise<void> {
    await apiFetch('/api/files', { method: 'DELETE', query: { id } })
  },
}
