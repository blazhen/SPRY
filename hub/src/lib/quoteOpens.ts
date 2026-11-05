import { useSyncExternalStore } from 'react'
import { DATA_SOURCE } from '../config'
import type { SyncAdapter, SyncRec } from './store'
import type { QuoteOpen } from './extras'

/**
 * How often the customer opened each quote page. Live: the SERVER writes these (collection quoteOpens, id = quote id)
 * when the public quote page is fetched; the Hub only reads them. Mock: the customer view in this browser records an
 * open, so the screens can be tried without a server. Only a count and two times, nothing about the visitor.
 */

const KEY = 'hub.quoteopens.v1'
let opens: Record<string, QuoteOpen> = {}
const listeners = new Set<() => void>()
let snapshot = opens

const valid = (v: unknown): v is QuoteOpen => !!v && typeof v === 'object' && typeof (v as QuoteOpen).count === 'number' && typeof (v as QuoteOpen).last === 'string' && typeof (v as QuoteOpen).first === 'string'

if (DATA_SOURCE === 'mock') {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>
    opens = Object.fromEntries(Object.entries(raw).filter(([, v]) => valid(v))) as Record<string, QuoteOpen>
    snapshot = opens
  } catch {
    /* storage blocked or damaged: start empty */
  }
}

function emit() {
  snapshot = { ...opens }
  listeners.forEach((l) => l())
}

/** Mock mode only: the customer view was opened in this browser. Opens less than a minute apart count once, as on the server. */
export function recordMockOpen(quoteId: string): void {
  if (DATA_SOURCE !== 'mock' || !quoteId) return
  const now = new Date().toISOString()
  const cur = opens[quoteId]
  if (cur && Date.parse(now) - Date.parse(cur.last) < 60000) return
  opens[quoteId] = cur ? { count: cur.count + 1, first: cur.first, last: now } : { count: 1, first: now, last: now }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(opens))
  } catch {
    /* storage blocked: kept until the page closes */
  }
  emit()
}

export const getQuoteOpens = (): Record<string, QuoteOpen> => snapshot
export const useQuoteOpens = (): Record<string, QuoteOpen> =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
    () => snapshot,
  )

/** Live sync: read only. `read` returns what was loaded, so the Hub never writes or deletes these records. */
export const quoteOpensAdapter: SyncAdapter = {
  collection: 'quoteOpens',
  read: (): SyncRec[] => Object.entries(opens).map(([id, data]) => ({ id, data })),
  apply: (recs: SyncRec[]) => {
    opens = Object.fromEntries(recs.filter((r) => valid(r.data)).map((r) => [r.id, r.data as QuoteOpen]))
    emit()
  },
  subscribe: (l) => {
    // Nothing local changes these, so there is nothing to watch.
    void l
    return () => {}
  },
}
