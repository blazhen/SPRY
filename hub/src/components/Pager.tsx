import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES, usePaged, type Paged } from '../lib/usePaged'

const fmtN = (n: number) => n.toLocaleString('en-AU')

/** 1 2 3 ... 42 style list: numbers to show, with null where a gap is hidden. */
function pageList(page: number, count: number): (number | null)[] {
  const want = new Set<number>([1, count, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach((n) => want.add(n))
  if (page >= count - 2) [count - 1, count - 2, count - 3].forEach((n) => want.add(n))
  const nums = [...want].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b)
  const out: (number | null)[] = []
  nums.forEach((n, i) => {
    const prev = nums[i - 1]
    if (i > 0 && n - prev === 2) out.push(n - 1)
    else if (i > 0 && n - prev > 2) out.push(null)
    out.push(n)
  })
  return out
}

interface Props<T> {
  paged: Paged<T>
  /** Name of the things listed, plural, e.g. "jobs". */
  noun?: string
  /** The copy at the top of a long table. Gets its own label. */
  top?: boolean
  /** Show the count line even when everything fits on one page. */
  showCount?: boolean
  /** Leave out the per-page choice (small lists inside a screen). */
  noSize?: boolean
}

/** Showing 26 to 50 of 1,043, Previous / page numbers / Next, and a per-page choice. */
export function Pager<T>({ paged, noun = 'items', top = false, showCount = false, noSize = false }: Props<T>) {
  const id = useId()
  const { page, pageCount, pageSize, total, from, to, setPage, setPageSize } = paged
  if (total === 0) return null
  const single = pageCount <= 1
  if (single && !showCount && (noSize || total <= PAGE_SIZES[0])) return null
  const count = single ? `Showing all ${fmtN(total)} ${noun}` : `Showing ${fmtN(from)} to ${fmtN(to)} of ${fmtN(total)}`
  const size = !noSize && (
    <div className="flex items-center gap-2">
      <label htmlFor={`${id}-size`} className="t-small text-muted">
        Show
      </label>
      <select id={`${id}-size`} className="field !w-auto" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n} per page
          </option>
        ))}
      </select>
    </div>
  )

  if (single) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 no-print" data-pager={top ? 'top' : 'bottom'}>
        <p className="t-small text-muted" aria-live="polite">
          {count}
        </p>
        {total > PAGE_SIZES[0] && size}
      </div>
    )
  }

  return (
    <nav aria-label={top ? 'Pagination, top of list' : 'Pagination'} className="stack no-print" data-pager={top ? 'top' : 'bottom'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-body font-bold" aria-live="polite" data-pager-count>
          {count}
        </p>
        {size}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-quiet btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={20} aria-hidden="true" />
          Previous
        </button>
        <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
          {pageList(page, pageCount).map((n, i) =>
            n === null ? (
              <li key={`gap${i}`} aria-hidden="true" className="px-1 text-muted">
                ...
              </li>
            ) : (
              <li key={n}>
                <button
                  type="button"
                  className={`btn btn-sm min-w-[44px] px-2 ${n === page ? 'btn-primary' : 'btn-quiet'}`}
                  aria-current={n === page ? 'page' : undefined}
                  aria-label={`Page ${n}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              </li>
            ),
          )}
        </ul>
        <button type="button" className="btn btn-quiet btn-sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label="Next page">
          Next
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

/** Pager above and below a table: the top one only for long lists. */
export function PagerPair<T>({ paged, noun, children, showCount }: { paged: Paged<T>; noun?: string; children: React.ReactNode; showCount?: boolean }) {
  return (
    <div className="stack">
      {paged.total > 25 && <Pager paged={paged} noun={noun} top />}
      <div {...paged.anchorProps} className="outline-none scroll-mt-24" aria-label={noun ? `List of ${noun}` : undefined} role={noun ? 'region' : undefined}>
        {children}
      </div>
      <Pager paged={paged} noun={noun} showCount={showCount} />
    </div>
  )
}

/**
 * For lists inside maps or conditions, where a hook cannot go: owns its paging and hands
 * the current rows to `render`. Everything that is not on the page is not drawn at all.
 */
export function PagedList<T>({ items, noun, render, resetKey, url = false, showCount = false, noSize = false }: {
  items: T[]
  noun: string
  render: (rows: T[]) => React.ReactNode
  resetKey?: string
  url?: boolean
  showCount?: boolean
  noSize?: boolean
}) {
  const paged = usePaged(items, { url, resetKey })
  return (
    <div className="stack">
      {paged.total > 25 && <Pager paged={paged} noun={noun} top noSize={noSize} />}
      <div {...paged.anchorProps} className="outline-none scroll-mt-24" role="region" aria-label={`List of ${noun}`}>
        {render(paged.rows)}
      </div>
      <Pager paged={paged} noun={noun} showCount={showCount} noSize={noSize} />
    </div>
  )
}
