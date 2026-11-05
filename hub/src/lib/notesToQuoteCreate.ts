import type { LineItem, Quote } from '../types'
import { uid } from './format'
import { createQuote, getJob, saveQuote } from './store'
import type { DraftLine } from './notesToQuote'

/**
 * Make a DRAFT quote on the job from the ticked review lines. Uses the normal createQuote (so the number, terms and
 * payment rows are the usual ones), then fills the lines. Each line remembers the words it came from (staff only).
 * Nothing is sent. Lines with no size are left out. A line with no price is kept with an empty price, so the editor
 * and "send" checks ask for it.
 */
export function createQuoteFromDraft(jobId: string, lines: DraftLine[], notAdded: string[] = []): Quote | undefined {
  const job = getJob(jobId)
  if (!job) return undefined
  const ref = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  if (!ref) return undefined
  const q = createQuote(jobId, ref)
  if (!q) return undefined
  const items: LineItem[] = lines
    .filter((l) => l.checked && l.qty !== null && l.qty > 0)
    .map((l) => ({
      id: uid('li'),
      section: l.section,
      name: l.name,
      description: l.description,
      qty: l.qty as number,
      unit: l.unit,
      unitPrice: l.unitPrice,
      ...(l.priceItemId ? { priceItemId: l.priceItemId } : {}),
      fromNotes: l.phrase,
    }))
  const extra = notAdded.length ? `Not included: ${notAdded.join('; ')}.` : ''
  const notes = [q.notes, extra].filter((x) => x && x.trim()).join('\n\n')
  saveQuote({ ...q, lines: items, notes })
  return { ...q, lines: items, notes }
}
