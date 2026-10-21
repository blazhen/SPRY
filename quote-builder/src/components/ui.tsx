import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Check, Clock, FileEdit, Send, X } from 'lucide-react'
import type { QuoteStatus } from '../types'
import { fmtMoney } from '../lib/format'

// ---- Status badge ----------------------------------------------------------

const STATUS: Record<QuoteStatus, { label: string; cls: string; Icon: typeof Check }> = {
  draft: { label: 'Draft', cls: 'bg-soft text-ink', Icon: FileEdit },
  sent: { label: 'Sent', cls: 'bg-navy-wash text-navy', Icon: Send },
  accepted: { label: 'Accepted', cls: 'bg-green-wash text-green-ink', Icon: Check },
  declined: { label: 'Declined', cls: 'bg-hot-wash text-hot-ink', Icon: X },
  expired: { label: 'Expired', cls: 'bg-amber-wash text-amber-ink', Icon: Clock },
}

export const statusLabel = (s: QuoteStatus) => STATUS[s].label

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const { label, cls, Icon } = STATUS[status]
  return (
    <span className={`badge ${cls}`}>
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  )
}

// ---- Modal dialog (native <dialog>: focus trap, Escape, focus return) -----

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className={`panel pop-in flex max-h-[calc(100vh-2rem)] w-full flex-col shadow-pop ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'}`}>
          <div className="flex items-start justify-between gap-4 border-b rule px-5 py-4">
            <h2 id={titleId} className="text-xl">
              {title}
            </h2>
            <button type="button" className="btn btn-ghost btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Close">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t rule px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

// ---- Toast -----------------------------------------------------------------

let toastText = ''
let toastKey = 0
const toastListeners = new Set<() => void>()
export function toast(message: string) {
  toastText = message
  toastKey++
  toastListeners.forEach((l) => l())
}
export function Toaster() {
  const key = useSyncExternalStore(
    (l) => {
      toastListeners.add(l)
      return () => toastListeners.delete(l)
    },
    () => toastKey,
  )
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!key) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 4200)
    return () => clearTimeout(t)
  }, [key])
  return (
    <div role="status" aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-50 lg:bottom-4 flex justify-center px-4">
      {visible && (
        <div key={key} className="pop-in pointer-events-auto flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-bold text-ground shadow-pop">
          <Check size={16} aria-hidden="true" />
          {toastText}
        </div>
      )}
    </div>
  )
}

// ---- Animated money figure -------------------------------------------------

export function AnimatedMoney({ value, className = '' }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || from.current === value) {
      from.current = value
      setShown(value)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 380)
      const e = 1 - Math.pow(1 - t, 3)
      setShown(a + (value - a) * e)
      if (t < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value])
  return (
    <span className={`num ${className}`} aria-hidden="true">
      {fmtMoney(shown)}
    </span>
  )
}

// ---- Small helpers ---------------------------------------------------------

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-10 text-center" style={{ borderColor: 'rgb(var(--c-control))' }}>
      <p className="font-display text-lg">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-muted">{children}</div>}
    </div>
  )
}

export function Notice({ tone = 'info', children, className = '' }: { tone?: 'info' | 'warn' | 'ok' | 'bad'; children: ReactNode; className?: string }) {
  const cls = {
    info: 'bg-navy-wash text-ink',
    warn: 'bg-amber-wash text-ink',
    ok: 'bg-green-wash text-ink',
    bad: 'bg-hot-wash text-ink',
  }[tone]
  const bar = { info: '--c-navy', warn: '--c-amber', ok: '--c-green-ink', bad: '--c-hot' }[tone]
  return (
    <div className={`rounded-md px-4 py-3 text-[0.9375rem] ${cls} ${className}`} style={{ borderLeft: `4px solid rgb(var(${bar}))` }}>
      {children}
    </div>
  )
}
