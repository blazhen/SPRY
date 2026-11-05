import type { Unit } from '../../types'
import type { CalcItem } from '../../lib/calcEngine'

export type Parsed = { ok: true; n: number } | { ok: false; why: string }

/**
 * A number typed by a person. Accepts "12", "12.5", ".5", "$1,200.50". Rejects letters and anything negative,
 * with a plain reason. An empty box is not a number here (the caller decides what empty means).
 */
export function parseNumber(raw: string, max = 1e7): Parsed {
  let s = raw.trim().replace(/^\$/, '').replace(/\s/g, '')
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '')
  if (s.startsWith('-')) return { ok: false, why: 'It cannot be less than 0.' }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { ok: false, why: 'Numbers only, for example 12.5.' }
  const n = Number(s)
  if (!Number.isFinite(n)) return { ok: false, why: 'Numbers only, for example 12.5.' }
  if (n > max) return { ok: false, why: 'That number is too big.' }
  return { ok: true, n }
}

/** The price in plain words, before GST. */
export function unitWords(u: Unit): string {
  return u === 'm²' ? 'per m²' : u === 'hour' ? 'per hour' : u === 'each' ? 'each' : 'for the lot'
}

/** How much one press of plus adds: half an hour for hours, one for everything else. */
export const stepFor = (item: Pick<CalcItem, 'unit'>) => (item.unit === 'hour' ? 0.5 : 1)

/** Label for the quantity box, for example "Square metres of Closed cell foam, 50 mm". */
export function qtyLabel(item: Pick<CalcItem, 'unit' | 'name'>): string {
  const what = item.unit === 'm²' ? 'Square metres' : item.unit === 'hour' ? 'Hours' : 'How many'
  return `${what} of ${item.name}`
}

export const round2 = (n: number) => Math.round(n * 100) / 100
