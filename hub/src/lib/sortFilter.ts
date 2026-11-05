/** Pure helpers for sortable lists: direction, comparators and the "time in stage" buckets. */

export type SortDir = 'asc' | 'desc'

export const parseDir = (v: string | null | undefined): SortDir | null => (v === 'asc' || v === 'desc' ? v : null)

export const flipDir = (d: SortDir): SortDir => (d === 'asc' ? 'desc' : 'asc')

const collator = new Intl.Collator('en-AU', { sensitivity: 'base', numeric: true })

/** Text compare, A to Z, ignoring case. Empty text always sorts last, whichever way round. */
export function compareText(a: string, b: string, dir: SortDir): number {
  const ea = !a.trim()
  const eb = !b.trim()
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1
  const r = collator.compare(a, b)
  return dir === 'asc' ? r : -r
}

export function compareNumber(a: number, b: number, dir: SortDir): number {
  return dir === 'asc' ? a - b : b - a
}

/** A stable sort that returns a new array. Ties keep their original order. */
export function sortBy<T>(items: T[], cmp: (a: T, b: T) => number): T[] {
  return items.map((item, i) => ({ item, i })).sort((x, y) => cmp(x.item, y.item) || x.i - y.i).map((x) => x.item)
}

/** The quick-start views on the Jobs list (the morning overview). '' = no view. */
export type JobView = '' | 'stalled' | 'write' | 'chase'

export const parseView = (v: string | null | undefined): JobView => (v === 'stalled' || v === 'write' || v === 'chase' ? v : '')

/** Days in the current stage, in plain-word buckets. */
export interface WaitBucket {
  id: string
  label: string
  min: number
  max: number
}

export const WAIT_BUCKETS: WaitBucket[] = [
  { id: '0-3', label: '0 to 3 days', min: 0, max: 3 },
  { id: '4-7', label: '4 to 7 days', min: 4, max: 7 },
  { id: '8-14', label: '8 to 14 days', min: 8, max: 14 },
  { id: '15+', label: 'Over 14 days', min: 15, max: Infinity },
]

export const findWaitBucket = (id: string | null | undefined): WaitBucket | undefined => WAIT_BUCKETS.find((b) => b.id === id)

export const inWaitBucket = (days: number, b: WaitBucket | undefined): boolean => !b || (days >= b.min && days <= b.max)
