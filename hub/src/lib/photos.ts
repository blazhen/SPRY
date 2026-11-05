import { useEffect, useSyncExternalStore } from 'react'
import { currentOwnerId, getOwner } from './store'
import { uploadFile } from './attachments'
import { purposeDef, type PhotoMeta, type PhotoPurposeId } from './photoPurposes'

/**
 * Site photos: shrink on the phone, then upload through a queue that survives a dropped signal.
 * - processImage(): picture to a JPEG, longest side 1600 px, quality 0.8, the phone's rotation applied.
 * - The queue keeps every photo in this browser (IndexedDB, memory when blocked) until the server has it. A failed send because
 *   of the network waits and tries again by itself (every 15 seconds, and at once when the connection comes back).
 *   A refusal by the server (wrong type, too many files) stops that photo and says why; it can be retried or removed.
 * - Only what is in the queue is "not saved yet". Once a photo is uploaded it is removed from the queue.
 */

export const PHOTO_MAX_SIDE = 1600
export const PHOTO_QUALITY = 0.8

// ---- Shrinking ---------------------------------------------------------------------------------------------------------

export interface Processed {
  blob: Blob
  width: number
  height: number
  /** True when the picture could not be decoded here and the original file is kept as it is. */
  original: boolean
}

async function decode(file: Blob): Promise<{ draw: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' applies the phone's rotation (EXIF) to the pixels.
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { draw: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      /* fall through to an img element */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { draw: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/** Shrinks and compresses one picture. Never throws: when it cannot decode the file the original is returned. */
export async function processImage(file: File): Promise<Processed> {
  try {
    const d = await decode(file)
    try {
      const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(d.width, d.height))
      const w = Math.max(1, Math.round(d.width * scale))
      const h = Math.max(1, Math.round(d.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no canvas')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(d.draw, 0, 0, w, h)
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', PHOTO_QUALITY))
      if (!blob) throw new Error('no blob')
      return { blob, width: w, height: h, original: false }
    } finally {
      d.close()
    }
  } catch {
    return { blob: file, width: 0, height: 0, original: true }
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
/** A tidy file name: purpose, date, time and a number. The extension follows the real type. */
export function photoFileName(purpose: PhotoPurposeId, at: Date, n: number, type: string): string {
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/heic' || type === 'image/heif' ? 'heic' : type === 'image/gif' ? 'gif' : 'jpg'
  return `${purpose}-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}-${n}.${ext}`
}

// ---- Location (only when the person allows it) ----------------------------------------------------------------------------

export type GeoResult = { ok: true; geo: NonNullable<PhotoMeta['geo']> } | { ok: false; reason: string }

/** Asks the browser for a place. Used only after the person ticks "Add the location". */
export function askLocation(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({ ok: false, reason: 'This device cannot give a location.' })
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ ok: true, geo: { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy } }),
      (e) => resolve({ ok: false, reason: e.code === 1 ? 'Location is not allowed. Photos are saved without it.' : 'The location could not be found. Photos are saved without it.' }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  })
}

// ---- The upload queue ------------------------------------------------------------------------------------------------------

export type QueueStatus = 'waiting' | 'sending' | 'retry' | 'failed'

export interface QueueItem {
  qid: string
  jobId: string
  name: string
  blob: Blob
  meta: PhotoMeta
  status: QueueStatus
  /** 0 to 1 while sending. */
  progress: number
  tries: number
  /** Plain sentence for 'retry' (waiting for the signal) and 'failed'. */
  note: string
  /** A small picture to show while it waits (an object address; not stored). */
  thumb: string
}

type Stored = Omit<QueueItem, 'thumb' | 'progress' | 'status' | 'note'>

const memory = new Map<string, Stored>()
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open('hub-photo-queue', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('queue', { keyPath: 'qid' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function saveStored(s: Stored): Promise<void> {
  try {
    const db = await idb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite')
      tx.objectStore('queue').put(s)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    memory.set(s.qid, s)
  }
}
async function dropStored(qid: string): Promise<void> {
  memory.delete(qid)
  try {
    const db = await idb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction('queue', 'readwrite')
      tx.objectStore('queue').delete(qid)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    /* nothing to remove */
  }
}
async function loadStored(): Promise<Stored[]> {
  const out = [...memory.values()]
  try {
    const db = await idb()
    const all = await new Promise<Stored[]>((resolve, reject) => {
      const req = db.transaction('queue').objectStore('queue').getAll()
      req.onsuccess = () => resolve(req.result as Stored[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return [...out, ...all]
  } catch {
    return out
  }
}

let queue: QueueItem[] = []
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const emit = () => listeners.forEach((l) => l())
function patch(qid: string, p: Partial<QueueItem>) {
  queue = queue.map((q) => (q.qid === qid ? { ...q, ...p } : q))
  emit()
}
const toStored = (q: QueueItem): Stored => ({ qid: q.qid, jobId: q.jobId, name: q.name, blob: q.blob, meta: q.meta, tries: q.tries })

let running = false
let timer: number | undefined

async function pump(): Promise<void> {
  if (running) return
  running = true
  try {
    for (;;) {
      const next = queue.find((q) => q.status === 'waiting' || (q.status === 'retry' && q.tries < 1000))
      if (!next) break
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        queue = queue.map((q) => (q.status === 'waiting' ? { ...q, status: 'retry', note: 'No signal. Kept on this phone. It will send when the signal is back.' } : q))
        emit()
        break
      }
      patch(next.qid, { status: 'sending', progress: 0, note: '' })
      const file = new File([next.blob], next.name, { type: next.blob.type || 'image/jpeg' })
      const r = await uploadFile(next.jobId, file, 'Photo', { photo: next.meta, onProgress: (f) => patch(next.qid, { progress: Math.min(1, f) }) })
      if (r.ok) {
        URL.revokeObjectURL(next.thumb)
        queue = queue.filter((q) => q.qid !== next.qid)
        await dropStored(next.qid)
        emit()
        continue
      }
      const net = r.error.startsWith('No connection')
      const tries = next.tries + 1
      if (net) {
        patch(next.qid, { status: 'retry', tries, note: 'No signal. Kept on this phone. It will try again by itself.' })
        await saveStored({ ...toStored(next), tries })
        break
      }
      patch(next.qid, { status: 'failed', tries, note: r.error })
    }
  } finally {
    running = false
    schedule()
  }
}

function schedule() {
  if (timer !== undefined) window.clearTimeout(timer)
  timer = undefined
  if (queue.some((q) => q.status === 'retry')) timer = window.setTimeout(() => void pump(), 15_000)
}

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('online', () => void pump())
  void loadStored().then((rows) => {
    const have = new Set(queue.map((q) => q.qid))
    const add = rows.filter((s) => !have.has(s.qid)).map<QueueItem>((s) => ({ ...s, status: 'retry', progress: 0, note: 'Kept on this phone from earlier. Sending…', thumb: URL.createObjectURL(s.blob) }))
    if (add.length) {
      queue = [...queue, ...add]
      emit()
      void pump()
    }
  })
}

/** Puts photos in the queue (they are kept locally at once) and starts sending. */
export async function queuePhotos(jobId: string, items: { blob: Blob; name: string; meta: PhotoMeta }[]): Promise<void> {
  start()
  const added = items.map<QueueItem>((i) => ({ qid: `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, jobId, name: i.name, blob: i.blob, meta: i.meta, status: 'waiting', progress: 0, tries: 0, note: '', thumb: URL.createObjectURL(i.blob) }))
  queue = [...queue, ...added]
  emit()
  await Promise.all(added.map((q) => saveStored(toStored(q))))
  void pump()
}

export function retryPhoto(qid: string) {
  patch(qid, { status: 'waiting', note: '', progress: 0 })
  void pump()
}

export function removeQueued(qid: string) {
  const q = queue.find((x) => x.qid === qid)
  if (q) URL.revokeObjectURL(q.thumb)
  queue = queue.filter((x) => x.qid !== qid)
  emit()
  void dropStored(qid)
}

/** Test and diagnostics helper: how many photos are still only on this device. */
export const queuedCount = (): number => queue.length

export function usePhotoQueue(jobId?: string): QueueItem[] {
  const all = useSyncExternalStore(subscribe, () => queue)
  useEffect(() => start(), [])
  return jobId ? all.filter((q) => q.jobId === jobId) : all
}

/** The details every new photo carries. */
export function newMeta(purpose: PhotoPurposeId, sub: string, caption: string, p: Processed, geo?: PhotoMeta['geo']): PhotoMeta {
  return { purpose, sub: purposeDef(purpose).subLabels ? sub : '', caption: caption.trim().slice(0, 500), takenAt: new Date().toISOString(), takenBy: getOwner(currentOwnerId()), width: p.width, height: p.height, onQuote: false, ...(geo ? { geo } : {}) }
}
