import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { ArrowLeftRight, Columns2, Eye, GripVertical, Pencil } from 'lucide-react'
import { Tabs } from './ui'

export interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  storageKey: string
  leftLabel: string
  rightLabel: string
  /** Shown above the right pane (the "Show next to the quote" picker). */
  rightHeader?: ReactNode
  /** Name for the right pane in the Preview button and narrow tab. */
  rightName?: string
  /** Give the right pane its own scroll (for views that are not the preview). */
  rightScroll?: boolean
  /** Always printed instead of the right pane when it shows something else. */
  printOnly?: ReactNode
}

type Mode = 'both' | 'edit' | 'preview'

const MIN = 30
const MAX = 70
const STEP = 4
const MIN_PANE = 360
const HANDLE = 24
const WIDE = 1100
const NARROW = 900

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage blocked: the setting just is not remembered */
  }
}

function useWidth(): number {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth))
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n))

/** Editor on the left, customer preview on the right, with a divider you can drag or move with the arrow keys. */
export function SplitPane({ left, right, storageKey, leftLabel, rightLabel, rightHeader, rightName = 'Preview', rightScroll = false, printOnly }: SplitPaneProps) {
  const vw = useWidth()
  const narrow = vw < NARROW
  const modeKey = `${storageKey}.mode`
  const widthKey = `${storageKey}.width`
  const swapKey = `${storageKey}.swapped`
  const [swapped, setSwapped] = useState(() => read(swapKey) === '1')

  const [mode, setModeState] = useState<Mode>(() => {
    const saved = read(modeKey)
    if (saved === 'both' || saved === 'edit' || saved === 'preview') return saved
    return window.innerWidth >= WIDE ? 'both' : 'edit'
  })
  const [pct, setPctState] = useState<number>(() => {
    const n = parseFloat(read(widthKey) ?? '')
    return Number.isFinite(n) ? clamp(n) : 50
  })
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const setMode = (m: Mode) => {
    setModeState(m)
    write(modeKey, m)
  }
  const pctRef = useRef(pct)
  /** Move the divider. Stored only when `save` is true (key press or end of a drag). */
  const setPct = useCallback(
    (n: number, save = true) => {
      const v = clamp(Math.round(n * 10) / 10)
      pctRef.current = v
      setPctState(v)
      if (save) write(widthKey, String(v))
    },
    [widthKey],
  )

  function swap() {
    const next = !swapped
    setSwapped(next)
    write(swapKey, next ? '1' : '0')
    setPct(100 - pctRef.current)
  }

  const showLeft = narrow ? tab === 'edit' : mode !== 'preview'
  const showRight = narrow ? tab === 'preview' : mode !== 'edit'
  const both = !narrow && mode === 'both'

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') setPct(pct - STEP)
    else if (e.key === 'ArrowRight') setPct(pct + STEP)
    else if (e.key === 'Home') setPct(MIN)
    else if (e.key === 'End') setPct(MAX)
    else return
    e.preventDefault()
  }
  function onDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !boxRef.current) return
    const r = boxRef.current.getBoundingClientRect()
    const avail = r.width - HANDLE
    if (avail <= 0) return
    // Measure against the area without the handle, so the handle sits under the pointer.
    setPct(((e.clientX - r.left - HANDLE / 2) / avail) * 100, false)
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (dragging.current) write(widthKey, String(pctRef.current))
    dragging.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const modes: { id: Mode; label: string; icon: ReactNode }[] = [
    { id: 'both', label: 'Side by side', icon: <Columns2 size={20} aria-hidden="true" /> },
    { id: 'edit', label: 'Edit', icon: <Pencil size={20} aria-hidden="true" /> },
    { id: 'preview', label: rightName, icon: <Eye size={20} aria-hidden="true" /> },
  ]

  const modeRefs = useRef<(HTMLButtonElement | null)[]>([])
  function onModeKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let n = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % modes.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i + modes.length - 1) % modes.length
    if (n < 0) return
    e.preventDefault()
    setMode(modes[n].id)
    modeRefs.current[n]?.focus()
  }

  const leftPane = (
    <section
      aria-label={leftLabel}
      className={`no-print min-w-0 ${showLeft ? '' : 'hidden'}`}
      style={{ containerType: 'inline-size', containerName: 'pane', ...(both ? { minWidth: MIN_PANE } : null) }}
    >
      {left}
    </section>
  )
  // Side by side: the second pane stays in view while the editor scrolls, and scrolls on its own if it is taller than the screen.
  const scrolls = both
  const rightPane = (
    <section
      aria-label={rightLabel}
      className={`print-pane min-w-0 ${showRight ? '' : 'hidden print:block'}`}
      style={both ? { minWidth: MIN_PANE, position: 'sticky', top: '5rem', alignSelf: 'start' } : undefined}
    >
      {rightHeader}
      {rightScroll && printOnly && <div className="hidden print:block">{printOnly}</div>}
      <div
        className={`min-w-0 ${rightScroll ? 'print:hidden' : ''} ${scrolls ? 'max-h-[calc(100vh-9rem)] overflow-y-auto rounded-md pr-1 print:max-h-none print:overflow-visible' : ''}`}
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? 'region' : undefined}
        aria-label={scrolls ? rightLabel : undefined}
      >
        {right}
      </div>
    </section>
  )

  return (
    <div className="min-w-0 max-w-full">
      <div className="no-print mb-5">
        {narrow ? (
          <Tabs
            label={`Show the editor or ${rightName.toLowerCase()}`}
            value={tab}
            onChange={(id) => setTab(id === 'preview' ? 'preview' : 'edit')}
            tabs={[
              { id: 'edit', label: 'Edit' },
              { id: 'preview', label: rightName },
            ]}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="What to show" className="flex flex-wrap gap-2">
            {modes.map((m, i) => {
              const on = mode === m.id
              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    modeRefs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className={`btn min-h-[48px] ${on ? 'btn-primary' : 'btn-neutral'}`}
                  onClick={() => setMode(m.id)}
                  onKeyDown={(e) => onModeKey(e, i)}
                >
                  {m.icon}
                  {m.label}
                </button>
              )
            })}
          </div>
          {both && (
            <button type="button" className="btn btn-neutral min-h-[48px]" onClick={swap}>
              <ArrowLeftRight size={16} aria-hidden="true" />
              Swap sides
            </button>
          )}
          </div>
        )}
      </div>

      {both ? (
        <div
          ref={boxRef}
          className="grid min-w-0 items-start"
          style={{ gridTemplateColumns: `minmax(${MIN_PANE}px, ${pct}fr) ${HANDLE}px minmax(${MIN_PANE}px, ${100 - pct}fr)` }}
        >
          {swapped ? rightPane : leftPane}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the two sides"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={MIN}
            aria-valuemax={MAX}
            aria-valuetext={`Left side ${Math.round(pct)} percent, right side ${100 - Math.round(pct)} percent`}
            tabIndex={0}
            className="no-print group relative mx-auto h-full min-h-[200px] w-6 cursor-col-resize touch-none select-none outline-none"
            onKeyDown={onKey}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={() => setPct(50)}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-[rgb(var(--c-navy))] group-hover:w-1.5 group-focus-visible:w-1.5 group-focus-visible:outline group-focus-visible:outline-[3px] group-focus-visible:outline-offset-2 group-focus-visible:outline-[rgb(var(--c-blue))]"
            />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-24 flex h-12 w-5 -translate-x-1/2 items-center justify-center rounded-md border-2 border-[rgb(var(--c-control))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-ink))]"
            >
              <GripVertical size={16} aria-hidden="true" />
            </span>
          </div>
          {swapped ? leftPane : rightPane}
        </div>
      ) : (
        <div className="min-w-0">
          {leftPane}
          {rightPane}
        </div>
      )}
      {both && <p className="no-print t-small mt-2 text-muted">Tip: drag the bar between the two sides, or use the left and right arrow keys. Double click to put it back in the middle.</p>}
    </div>
  )
}

export default SplitPane
