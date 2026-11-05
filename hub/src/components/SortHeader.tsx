import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SortDir } from '../lib/sortFilter'

interface Props {
  /** The column's name, shown as it always was. */
  children: ReactNode
  /** Which direction this column is sorted, or null when the list is not sorted by it. */
  dir: SortDir | null
  onSort: () => void
  className?: string
}

/** A column header that sorts the list: a real button inside the th, with the sort announced by aria-sort. */
export function SortHeader({ children, dir, onSort, className }: Props) {
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <th scope="col" className={className} aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-transparent px-1 text-base font-bold text-ink hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2"
        style={{ font: 'inherit', fontSize: '1rem', fontWeight: 700, color: 'inherit', outlineColor: 'rgb(var(--c-navy))' }}
      >
        {children}
        <Icon size={18} aria-hidden="true" style={{ opacity: dir ? 1 : 0.5 }} />
      </button>
    </th>
  )
}

interface PickerProps {
  id: string
  options: { id: string; label: string }[]
  sort: string
  dir: SortDir
  onChange: (sort: string, dir: SortDir) => void
}

/** The narrow-screen way to sort (the table headers are hidden there): a select and a direction button. */
export function SortPicker({ id, options, sort, dir, onChange }: PickerProps) {
  return (
    <div className="sort-picker flex items-end gap-2 sm:hidden">
      <div className="min-w-0 flex-1">
        <label className="label" htmlFor={id}>
          Sort by
        </label>
        <select id={id} className="field" value={sort} onChange={(e) => onChange(e.target.value, dir)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="btn btn-neutral"
        style={{ minHeight: 44, minWidth: 44 }}
        onClick={() => onChange(sort, dir === 'asc' ? 'desc' : 'asc')}
        aria-label={dir === 'asc' ? 'Sorted ascending. Switch to descending' : 'Sorted descending. Switch to ascending'}
      >
        {dir === 'asc' ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}
        {dir === 'asc' ? 'Low to high' : 'High to low'}
      </button>
    </div>
  )
}
