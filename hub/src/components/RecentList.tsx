import { useId } from 'react'
import { href } from '../lib/router'
import { useRecent, whenText, type RecentItem } from '../lib/recent'
import { getContact, getJob, getQuote, participantName, useStore } from '../lib/store'

const KIND_LABEL = { job: 'Job', contact: 'Contact', quote: 'Quote' } as const

export interface RecentRow {
  item: RecentItem
  name: string
  to: string
}

/** The recent items that still exist, with a plain name and a link each. */
export function useRecentRows(): RecentRow[] {
  const items = useRecent()
  const s = useStore()
  const rows: RecentRow[] = []
  for (const item of items) {
    if (item.kind === 'job') {
      const j = getJob(item.id, s)
      if (j) rows.push({ item, name: j.name, to: href.job(j.id) })
    } else if (item.kind === 'contact') {
      const c = getContact(item.id, s)
      if (c) rows.push({ item, name: c.name, to: href.contact(c.id) })
    } else {
      const q = getQuote(item.id, s)
      if (q) rows.push({ item, name: `${q.number} for ${participantName(q.recipient, s)}`, to: href.edit(q.id) })
    }
  }
  return rows
}

export const kindLabel = (k: RecentItem['kind']) => KIND_LABEL[k]

/** A simple labelled list of what was opened lately. Shows nothing when empty. */
export function RecentList({ onPick }: { onPick?: () => void }) {
  const rows = useRecentRows()
  const id = useId()
  if (rows.length === 0) return null
  return (
    <section aria-labelledby={id} className="stack">
      <h2 id={id} className="font-display text-2xl">
        Recently opened
      </h2>
      <ul className="m-0 list-none divide-y p-0 rule">
        {rows.map(({ item, name, to }) => (
          <li key={item.kind + item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
            <a href={to} className="cell-link min-w-0" onClick={onPick}>
              {name}
            </a>
            <span className="text-muted">
              {KIND_LABEL[item.kind]}, {whenText(item.at)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
