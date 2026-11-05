import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

/**
 * One paging hook for every long list. Page size is shared by all lists and kept in
 * localStorage. A list with `url: true` also keeps its page in the hash query
 * (#/jobs?page=3) so Back works and a link can be shared.
 */
export const PAGE_SIZES = [5, 10, 25, 50, 100] as const
const SIZE_KEY = 'hub.pageSize.v1'
const DEFAULT_SIZE = 5

function readSize(): number {
  try {
    const n = Number(window.localStorage.getItem(SIZE_KEY))
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_SIZE
  } catch {
    return DEFAULT_SIZE
  }
}

let size = readSize()
const sizeListeners = new Set<() => void>()
const subscribeSize = (l: () => void) => {
  sizeListeners.add(l)
  return () => sizeListeners.delete(l)
}
function setSize(n: number) {
  size = n
  try {
    window.localStorage.setItem(SIZE_KEY, String(n))
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  sizeListeners.forEach((l) => l())
}

function hashParts(): { path: string; params: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '')
  const i = raw.indexOf('?')
  return { path: i < 0 ? raw : raw.slice(0, i), params: new URLSearchParams(i < 0 ? '' : raw.slice(i + 1)) }
}

function readUrlPage(): number {
  const n = parseInt(hashParts().params.get('page') ?? '', 10)
  return n >= 1 ? n : 1
}

function writeUrlPage(page: number, push: boolean) {
  const { path, params } = hashParts()
  if (page > 1) params.set('page', String(page))
  else params.delete('page')
  const qs = params.toString()
  const url = `#${path}${qs ? `?${qs}` : ''}`
  if (url === window.location.hash) return
  // pushState and replaceState do not fire hashchange, so the route is not re-run.
  if (push) window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
}

export interface Paged<T> {
  rows: T[]
  page: number
  pageCount: number
  pageSize: number
  total: number
  /** First and last row number on this page, 1 based. 0 and 0 when empty. */
  from: number
  to: number
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  /** Spread onto the wrapper around the table: where the page scrolls and focus goes after a page change. */
  anchorProps: { ref: React.RefObject<HTMLDivElement>; tabIndex: -1 }
}

/**
 * `resetKey` is any string that changes when the search, filter or sort changes: the
 * page goes back to 1. Lists must be in a stable order so rows do not jump between pages.
 */
export function usePaged<T>(items: T[], opts: { url?: boolean; resetKey?: string } = {}): Paged<T> {
  const url = !!opts.url
  const pageSize = useSyncExternalStore(subscribeSize, () => size)
  const [raw, setRaw] = useState(() => (url ? readUrlPage() : 1))
  const anchor = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, raw), pageCount)

  // Back and Forward (pushState entries) and edits to the address.
  useEffect(() => {
    if (!url) return
    const on = () => setRaw(readUrlPage())
    window.addEventListener('popstate', on)
    window.addEventListener('hashchange', on)
    return () => {
      window.removeEventListener('popstate', on)
      window.removeEventListener('hashchange', on)
    }
  }, [url])

  // Search, filter or sort changed: back to page 1.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setRaw(1)
    if (url) writeUrlPage(1, false)
  }, [opts.resetKey, url])

  // The list shrank under the current page: keep the address honest.
  useEffect(() => {
    if (url && raw !== page) writeUrlPage(page, false)
  }, [url, raw, page])

  const setPage = useCallback(
    (p: number) => {
      const next = Math.min(Math.max(1, p), pageCount)
      moved.current = true
      setRaw(next)
      if (url) writeUrlPage(next, true)
    },
    [pageCount, url],
  )

  const setPageSize = useCallback(
    (n: number) => {
      setSize(n)
      setRaw(1)
      if (url) writeUrlPage(1, false)
    },
    [url],
  )

  // After a page change by the user: bring the table into view and move focus to it.
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    const el = anchor.current
    if (!el) return
    el.scrollIntoView({ block: 'start' })
    el.focus({ preventScroll: true })
  }, [page])

  const rows = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize])
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return { rows, page, pageCount, pageSize, total, from, to, setPage, setPageSize, anchorProps: { ref: anchor, tabIndex: -1 } }
}
