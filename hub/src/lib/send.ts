// Sending a text or email from the Hub, through the CRM (server route /api/send, the token stays on the server).
// Two locks, both must be open: the server owner allows it (server setting), and staff switch it on in Settings.
// Demo data (mock build): nothing is ever sent. VITE_SEND_DEMO=1 pretends it works, for screens and proofs only.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { DATA_SOURCE } from '../config'
import { ApiError, AuthError, NetworkError, apiFetch } from './api'
import { logManualMessage } from './conversations'

export interface SendState {
  /** The server owner has allowed sending. */
  allowed: boolean
  /** Staff switched it on in Settings. */
  enabled: boolean
  canSend: boolean
  emailFrom: string
  loaded: boolean
  /** Why it could not be read (live only). */
  error: string
}

const DEMO = DATA_SOURCE === 'mock' && (import.meta.env.VITE_SEND_DEMO as string | undefined) === '1'
const OFF: SendState = { allowed: false, enabled: false, canSend: false, emailFrom: '', loaded: false, error: '' }
let state: SendState = DATA_SOURCE === 'mock' ? { ...OFF, allowed: DEMO, enabled: DEMO, canSend: DEMO, loaded: true } : OFF
const listeners = new Set<() => void>()
const set = (s: SendState) => {
  state = s
  listeners.forEach((f) => f())
}

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function fromServer(j: unknown): SendState {
  const r = isRec(j) ? j : {}
  const allowed = r.allowed === true
  const enabled = r.enabled === true
  return { allowed, enabled, canSend: r.canSend === true && allowed && enabled, emailFrom: typeof r.emailFrom === 'string' ? r.emailFrom : '', loaded: true, error: '' }
}

export async function refreshSendState(): Promise<void> {
  if (DATA_SOURCE === 'mock') return
  try {
    set(fromServer(await apiFetch('/send')))
  } catch (e) {
    // A server without the route (404) simply cannot send: say so, never pretend.
    set({ ...OFF, loaded: true, error: e instanceof ApiError && e.status === 404 ? 'This Hub server has no sending route yet.' : e instanceof Error ? e.message : 'Could not read the sending setting.' })
  }
}

/** Reads the setting once per page load and keeps it fresh. */
export function useSendState(): SendState {
  const s = useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), () => state, () => state)
  useEffect(() => {
    if (!s.loaded) void refreshSendState()
  }, [s.loaded])
  return s
}

export async function setSendEnabled(enabled: boolean, by: string): Promise<string> {
  if (DATA_SOURCE === 'mock') return 'Demo data: nothing can be switched on here.'
  try {
    set(fromServer(await apiFetch('/send', { method: 'PUT', body: { enabled, by } })))
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not save the setting.'
  }
}

export interface SendRequest {
  contactId: string
  channel: 'sms' | 'email'
  body: string
  subject?: string
  jobId?: string
  sentBy?: string
}
export type SendResult = { ok: true } | { ok: false; reason: string }

/** One message to one person. Returns the real reason when it is refused. On success the message shows in that person's Messages list at once. */
export async function sendMessage(req: SendRequest): Promise<SendResult> {
  if (DEMO) {
    logManualMessage({ jobId: req.jobId ?? '', contactId: req.contactId, channel: req.channel, direction: 'out', subject: req.subject, body: req.body, automated: false })
    return { ok: true }
  }
  if (!state.canSend) return { ok: false, reason: 'Sending is switched off.' }
  try {
    await apiFetch('/send', { method: 'POST', body: req })
  } catch (e) {
    if (e instanceof NetworkError) return { ok: false, reason: 'The Hub server could not be reached. Nothing was sent.' }
    if (e instanceof AuthError) return { ok: false, reason: 'Your Hub sign-in has run out. Open the Hub again from the CRM. Nothing was sent.' }
    return { ok: false, reason: (e instanceof Error && e.message ? e.message : 'The message was not sent.') }
  }
  logManualMessage({ jobId: req.jobId ?? '', contactId: req.contactId, channel: req.channel, direction: 'out', subject: req.subject, body: req.body, automated: false })
  return { ok: true }
}

/** Small hook for composers: the text of the last send problem and a busy flag. */
export function useSender() {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  return {
    busy,
    problem,
    clear: () => setProblem(''),
    send: async (req: SendRequest): Promise<boolean> => {
      setBusy(true)
      setProblem('')
      const r = await sendMessage(req)
      setBusy(false)
      if (!r.ok) setProblem(r.reason)
      return r.ok
    },
  }
}
