import { useEffect, useSyncExternalStore } from 'react'
import { DATA_SOURCE } from '../config'
import { ApiError, AuthError, NetworkError, NotConfiguredError, filesApi, type ApiFileRow } from './api'
import { uid } from './format'
import { isPurpose, type PhotoMeta } from './photoPurposes'
import { currentOwnerId, getOwner } from './store'

/**
 * Documents of a job: files and links. Same screens in both modes.
 * Live: the Hub server checks the staff token and the file rules, and the file goes to a private bucket through a short
 * signed address (api.ts filesApi). Mock (the standalone demo): the details are kept in this browser (localStorage) and the
 * file itself in this browser's IndexedDB, so nothing leaves the computer.
 * Customers never see these: the public quote page does not read them.
 */
export const ATTACH_KEY = 'hub.attachments.v1'
const LIVE = DATA_SOURCE === 'live'

export const ATTACH_KINDS = ['Plan', 'Energy report', 'Photo', 'Certificate', 'Other'] as const
export type AttachKind = (typeof ATTACH_KINDS)[number]

export interface Attachment {
  id: string
  jobId: string
  /** 'file' (uploaded) or 'link' (a web address). */
  source: 'file' | 'link'
  name: string
  /** The web address of a link. '' for a file. */
  url: string
  kind: AttachKind
  size: number
  type: string
  uploadedBy: string
  /** When it was added (ISO). */
  addedAt: string
  /** Site photos only (kind Photo taken with Take photos): purpose, label, caption, who and when. */
  photo?: PhotoMeta
}

// ---- Rules (the server applies the same ones; the browser checks first so people get an answer at once) -----------------

export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_FILES_PER_JOB = 50
/** Extension to the MIME types a browser reports for it. */
const TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  heic: ['image/heic', 'image/heif'],
}
/** For the file picker's accept attribute. */
export const FILE_ACCEPT = Object.keys(TYPES).map((e) => `.${e}`).join(',')
export const FILE_TYPES_TEXT = 'PDF, Word, Excel, text, or a picture (png, jpg, gif, webp, heic), up to 25 MB'

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')

/** Checks one file against the rules. Returns a plain sentence when it is refused. */
export function checkFile(file: { name: string; size: number; type: string }): string | undefined {
  const ext = extOf(file.name)
  const okTypes = TYPES[ext]
  if (!okTypes) return `${shortName(file.name)} is not a type we accept. Use ${FILE_TYPES_TEXT}.`
  // Browsers sometimes report no type for a known extension; an explicit wrong type is refused.
  if (file.type && !okTypes.includes(file.type)) return `${shortName(file.name)} does not look like a .${ext} file.`
  if (file.size <= 0) return `${shortName(file.name)} is empty.`
  if (file.size > MAX_FILE_BYTES) return `${shortName(file.name)} is ${fmtSize(file.size)}. The limit is 25 MB.`
  return undefined
}

/** "12 KB", "3.4 MB". */
export function fmtSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

/** A long name cut in the middle, keeping the extension, for messages. The full name is still shown (wrapped) on the card. */
export function shortName(name: string, max = 40): string {
  if (name.length <= max) return name
  const ext = extOf(name)
  const tail = ext ? `.${ext}` : ''
  return `${name.slice(0, Math.max(8, max - tail.length - 1))}…${tail}`
}

const isKind = (x: unknown): x is AttachKind => ATTACH_KINDS.includes(x as AttachKind)
const isPhoto = (x: unknown): x is PhotoMeta => !!x && typeof x === 'object' && isPurpose((x as PhotoMeta).purpose)

/** Only http and https addresses are allowed (anything else, such as javascript:, is refused). Returns the clean address or undefined. */
export function cleanUrl(raw: string): string | undefined {
  const t = raw.trim()
  if (!/^https?:\/\//i.test(t)) return undefined
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined
  } catch {
    return undefined
  }
}

// ---- State -------------------------------------------------------------------------------------------------------------

function load(): Attachment[] {
  if (LIVE) return []
  try {
    const raw = window.localStorage.getItem(ATTACH_KEY)
    const v: unknown = raw ? JSON.parse(raw) : null
    if (!Array.isArray(v)) return []
    return v
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof (x as Attachment).id === 'string' && typeof (x as Attachment).jobId === 'string')
      .map((x) => {
        const source: 'file' | 'link' = x.source === 'file' ? 'file' : 'link'
        const url = typeof x.url === 'string' ? x.url : ''
        return { x, source, url }
      })
      .filter(({ source, url }) => source === 'file' || !!cleanUrl(url))
      .map(({ x, source, url }) => ({
        id: String(x.id),
        jobId: String(x.jobId),
        source,
        name: String(x.name ?? ''),
        url,
        kind: isKind(x.kind) ? x.kind : 'Other',
        size: typeof x.size === 'number' ? x.size : 0,
        type: String(x.type ?? ''),
        uploadedBy: String(x.uploadedBy ?? ''),
        addedAt: String(x.addedAt ?? x.uploadedAt ?? ''),
        ...(isPhoto(x.photo) ? { photo: x.photo } : {}),
      }))
  } catch {
    return []
  }
}

let state: Attachment[] = load()
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
function commit(next: Attachment[]) {
  state = next
  if (!LIVE) {
    try {
      window.localStorage.setItem(ATTACH_KEY, JSON.stringify(state))
    } catch {
      /* in-memory only */
    }
  }
  listeners.forEach((l) => l())
}

const fromRow = (r: ApiFileRow): Attachment => ({
  id: r.id,
  jobId: r.jobId,
  source: r.source,
  name: r.name,
  url: r.url,
  kind: isKind(r.kind) ? r.kind : 'Other',
  size: r.size,
  type: r.type,
  uploadedBy: r.uploadedBy,
  addedAt: r.uploadedAt,
  ...(r.photo ? { photo: r.photo } : {}),
})

const loaded = new Set<string>()
/** Live: the files of one job are fetched once per session and merged by id. */
function loadJob(jobId: string) {
  if (!LIVE || loaded.has(jobId)) return
  loaded.add(jobId)
  filesApi.list(jobId).then(
    (rows) => commit([...state.filter((a) => a.jobId !== jobId), ...rows.map(fromRow)]),
    () => loaded.delete(jobId), // try again the next time the job opens
  )
}

// ---- Browser storage for the demo (IndexedDB, with a memory fallback) ----------------------------------------------------

const memoryBlobs = new Map<string, Blob>()
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open('hub-files', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('blobs')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function putBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await idb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('blobs', 'readwrite')
      tx.objectStore('blobs').put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    memoryBlobs.set(id, blob)
  }
}
async function getBlob(id: string): Promise<Blob | undefined> {
  const mem = memoryBlobs.get(id)
  if (mem) return mem
  try {
    const db = await idb()
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const req = db.transaction('blobs').objectStore('blobs').get(id)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return blob
  } catch {
    return undefined
  }
}
async function delBlob(id: string): Promise<void> {
  memoryBlobs.delete(id)
  try {
    const db = await idb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction('blobs', 'readwrite')
      tx.objectStore('blobs').delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    /* nothing to remove */
  }
}

// ---- Actions ----------------------------------------------------------------------------------------------------------

export type AddResult = { ok: true; item: Attachment } | { ok: false; error: string }

/** Turns a failure into one plain sentence. */
function plain(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof AuthError || e instanceof NotConfiguredError) return e.message
  if (e instanceof NetworkError) return 'No connection. Please try again.'
  return fallback
}

const who = () => getOwner(currentOwnerId())

const countFor = (jobId: string) => state.filter((a) => a.jobId === jobId).length

export async function addLink(jobId: string, name: string, url: string, kind: AttachKind): Promise<AddResult> {
  const href = cleanUrl(url)
  if (!href) return { ok: false, error: 'The web address must start with http:// or https://. Please paste the full link.' }
  if (countFor(jobId) >= MAX_FILES_PER_JOB) return { ok: false, error: `Too many files on this job (${MAX_FILES_PER_JOB} limit).` }
  const label = name.trim().slice(0, 200) || href.slice(0, 200)
  const k = isKind(kind) ? kind : 'Other'
  if (LIVE) {
    try {
      const item = fromRow(await filesApi.link({ jobId, name: label, url: href, kind: k, uploadedBy: who() }))
      commit([item, ...state])
      return { ok: true, item }
    } catch (e) {
      return { ok: false, error: plain(e, 'The link could not be saved.') }
    }
  }
  const item: Attachment = { id: uid('att'), jobId, source: 'link', name: label, url: href, kind: k, size: 0, type: 'link', uploadedBy: who(), addedAt: new Date().toISOString() }
  commit([item, ...state])
  return { ok: true, item }
}

export interface UploadOptions {
  photo?: PhotoMeta
  onProgress?: (fraction: number) => void
}

export async function uploadFile(jobId: string, file: File, kind: AttachKind, opts: UploadOptions = {}): Promise<AddResult> {
  const bad = checkFile(file)
  if (bad) return { ok: false, error: bad }
  if (countFor(jobId) >= MAX_FILES_PER_JOB) return { ok: false, error: `Too many files on this job (${MAX_FILES_PER_JOB} limit).` }
  const k = isKind(kind) ? kind : 'Other'
  if (LIVE) {
    try {
      const item = fromRow(await filesApi.upload({ jobId, file, kind: k, uploadedBy: who(), photo: opts.photo, onProgress: opts.onProgress }))
      commit([item, ...state.filter((a) => a.id !== item.id)])
      return { ok: true, item }
    } catch (e) {
      return { ok: false, error: plain(e, 'The file could not be uploaded.') }
    }
  }
  const id = uid('att')
  await putBlob(id, file)
  const item: Attachment = { id, jobId, source: 'file', name: file.name.slice(0, 200), url: '', kind: k, size: file.size, type: file.type || 'application/octet-stream', uploadedBy: who(), addedAt: new Date().toISOString(), ...(opts.photo ? { photo: opts.photo } : {}) }
  commit([item, ...state])
  opts.onProgress?.(1)
  return { ok: true, item }
}

/** Change a photo's purpose, label, caption or quote flag. Returns false when the server refused. */
export async function updatePhoto(id: string, edit: Partial<Pick<PhotoMeta, 'purpose' | 'sub' | 'caption' | 'onQuote'>>): Promise<boolean> {
  const a = state.find((x) => x.id === id)
  if (!a?.photo) return false
  if (LIVE) {
    try {
      await filesApi.photo(id, edit)
    } catch {
      return false
    }
  }
  // Only Inspection photos can be on the customer's quote (the server applies the same rule).
  commit(state.map((x) => (x.id === id && x.photo ? { ...x, photo: { ...x.photo, ...edit, ...((edit.purpose ?? x.photo.purpose) !== 'inspection' ? { onQuote: false } : {}) } } : x)))
  return true
}

const srcCache = new Map<string, { url: string; at: number }>()
/** A web address a picture or PDF of this file can be shown from. Live: a signed address (cached 4 minutes). Demo: a blob address from this browser. */
export async function attachmentSrc(a: Attachment): Promise<string | undefined> {
  if (a.source === 'link') return a.url
  const hit = srcCache.get(a.id)
  if (hit && Date.now() - hit.at < 240_000) return hit.url
  let url = ''
  if (LIVE) {
    try {
      url = await filesApi.address(a.id, true)
    } catch {
      return undefined
    }
  } else {
    const blob = await getBlob(a.id)
    if (!blob) return undefined
    url = URL.createObjectURL(blob)
  }
  srcCache.set(a.id, { url, at: Date.now() })
  return url
}

/** The bytes of a stored file (the certificate embeds After photos). Undefined when they cannot be read. */
export async function attachmentBytes(a: Attachment): Promise<Uint8Array | undefined> {
  try {
    if (!LIVE) {
      const blob = await getBlob(a.id)
      return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined
    }
    const url = await attachmentSrc(a)
    if (!url) return undefined
    const res = await fetch(url)
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : undefined
  } catch {
    return undefined
  }
}

export async function renameAttachment(id: string, name: string): Promise<boolean> {
  const clean = name.trim().slice(0, 200)
  if (!clean) return false
  if (LIVE) {
    try {
      await filesApi.rename(id, clean)
    } catch {
      return false
    }
  }
  commit(state.map((a) => (a.id === id ? { ...a, name: clean } : a)))
  return true
}

/** Removes the file (and its stored copy) and the row. Returns false when the server refused. */
export async function removeAttachment(id: string): Promise<boolean> {
  const a = state.find((x) => x.id === id)
  if (LIVE) {
    try {
      await filesApi.remove(id)
    } catch {
      return false
    }
  } else if (a?.source === 'file') {
    await delBlob(id)
  }
  commit(state.filter((x) => x.id !== id))
  return true
}

/** Opens a document in a new tab, or downloads it. Links open at their address. Returns a plain sentence when it fails. */
export async function openAttachment(a: Attachment, mode: 'open' | 'download'): Promise<string | undefined> {
  let href = ''
  let revoke = false
  if (a.source === 'link') {
    href = a.url
  } else if (LIVE) {
    try {
      href = await filesApi.address(a.id, mode === 'open')
    } catch (e) {
      return plain(e, 'The file could not be opened.')
    }
  } else {
    const blob = await getBlob(a.id)
    if (!blob) return 'This demo file is no longer in this browser.'
    href = URL.createObjectURL(blob)
    revoke = true
  }
  if (!href) return 'The file could not be opened.'
  const link = document.createElement('a')
  link.href = href
  if (mode === 'download' && a.source === 'file') link.download = a.name
  else {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  document.body.appendChild(link)
  link.click()
  link.remove()
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 60_000)
  return undefined
}

/** The attachments of one job, newest first. */
export const attachmentsFor = (jobId: string, s: Attachment[] = state): Attachment[] => s.filter((a) => a.jobId === jobId).sort((a, b) => b.addedAt.localeCompare(a.addedAt))

export const attachmentCount = (jobId: string, s: Attachment[] = state): number => attachmentsFor(jobId, s).length

export function useAttachments(jobId: string): Attachment[] {
  const all = useSyncExternalStore(subscribe, () => state)
  useEffect(() => loadJob(jobId), [jobId])
  return attachmentsFor(jobId, all)
}
