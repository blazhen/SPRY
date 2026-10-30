// Client for the customer quote routes (server/API.md: /api/public/quote). Live mode only: mock mode never calls this file.
// No staff token here. The key in the link (#/view/<id>?k=<key>) is the access, and it is for that one quote.

import { PROXY_URL } from '../config'
import type { Quote } from '../types'
import { apiFetch } from './api'
import { href } from './router'

/** What the server returns for GET and for every respond call. */
export interface PublicQuote {
  quote: Quote
  businessName: string
  /** First name only. */
  recipientName: string
  jobName: string
  jobAddress: string
}

export type PublicResult =
  | { kind: 'ok'; data: PublicQuote }
  /** Unknown id, wrong key, draft or replaced: one answer, no hints. */
  | { kind: 'notfound' }
  | { kind: 'expired' }
  /** The quote is in a state that does not allow this (for example already declined). */
  | { kind: 'conflict' }
  | { kind: 'error' }

/** The key from the address: #/view/<id>?k=<key>. */
export function linkKey(): string {
  const hash = typeof window === 'undefined' ? '' : window.location.hash
  const at = hash.indexOf('?')
  return at >= 0 ? new URLSearchParams(hash.slice(at + 1)).get('k') ?? '' : ''
}

function isPublicQuote(v: unknown): v is PublicQuote {
  const o = v as Partial<PublicQuote> | null
  return !!o && typeof o === 'object' && !!o.quote && typeof o.quote === 'object' && Array.isArray(o.quote.lines) && Array.isArray(o.quote.upgrades) && Array.isArray(o.quote.payments)
}

async function call(path: string, id: string, key: string, init?: RequestInit): Promise<PublicResult> {
  try {
    const r = await fetch(`${PROXY_URL}${path}?id=${encodeURIComponent(id)}&k=${encodeURIComponent(key)}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    })
    if (r.status === 404) return { kind: 'notfound' }
    if (r.status === 410) return { kind: 'expired' }
    if (r.status === 409) return { kind: 'conflict' }
    if (!r.ok) return { kind: 'error' }
    const j: unknown = await r.json().catch(() => null)
    return isPublicQuote(j) ? { kind: 'ok', data: j } : { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}

export const publicQuoteApi = {
  get: (id: string, key: string) => call('/api/public/quote', id, key),
  tick: (id: string, key: string, upgradeId: string, ticked: boolean) =>
    call('/api/public/quote/respond', id, key, { method: 'POST', body: JSON.stringify({ action: 'tick', upgradeId, ticked }) }),
  accept: (id: string, key: string) => call('/api/public/quote/respond', id, key, { method: 'POST', body: JSON.stringify({ action: 'accept' }) }),
  decline: (id: string, key: string, reason: string) =>
    call('/api/public/quote/respond', id, key, { method: 'POST', body: JSON.stringify({ action: 'decline', reason }) }),
}

// ---- Staff side: build the customer link ---------------------------------------

const keys = new Map<string, string>()

/** Staff only (needs the staff token). The key for one quote, cached for the session. */
export async function quoteLinkKey(id: string): Promise<string> {
  const hit = keys.get(id)
  if (hit) return hit
  const j = (await apiFetch('/api/quote-link', { query: { id } })) as { key?: unknown }
  const key = typeof j?.key === 'string' ? j.key : ''
  if (!key) throw new Error('No link key')
  keys.set(id, key)
  return key
}

/** The full customer link for a quote. Live: carries the key (#/view/<id>?k=<key>). Mock: the plain link. */
export async function customerLink(id: string, live: boolean): Promise<string> {
  const path = live ? href.view(id, await quoteLinkKey(id)) : href.view(id)
  return `${window.location.origin}${window.location.pathname}${path}`
}
