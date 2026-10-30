import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CalendarCheck, CalendarDays, Check, CircleX, Clock, FileEdit, Layers, MapPin, Phone, Receipt, Send, Sparkles, Sprout, Trophy, X } from 'lucide-react'
import type { Job, QuoteStatus, Stage } from '../types'
import { fmtMoney, fmtMoneyWhole } from '../lib/format'
import { stall } from '../lib/store'

// ---- Status badge ----------------------------------------------------------

const STATUS: Record<QuoteStatus, { label: string; cls: string; Icon: typeof Check }> = {
  Draft: { label: 'Draft', cls: 'st-slate', Icon: FileEdit },
  Sent: { label: 'Sent', cls: 'st-blue', Icon: Send },
  Accepted: { label: 'Accepted', cls: 'st-green', Icon: Check },
  Declined: { label: 'Declined', cls: 'st-hot', Icon: X },
  Expired: { label: 'Expired', cls: 'st-amber', Icon: Clock },
  Superseded: { label: 'Superseded', cls: 'st-lost', Icon: Layers },
}

export const statusLabel = (s: QuoteStatus) => STATUS[s].label

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const { label, cls, Icon } = STATUS[status]
  return (
    <span className={`badge ${cls}`}>
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  )
}

/** Small revision tag, for example "Rev 2". */
export function RevTag({ revision }: { revision: number }) {
  return <span className="inline-block rounded-full bg-soft px-2.5 py-1 text-[0.9375rem] font-bold text-ink">Rev {revision}</span>
}

// ---- Modal dialog (native <dialog>: focus trap, Escape) --------------------
// The content mounts only while open, so autoFocus cannot work. The effect below
// moves focus after showModal(): to [data-autofocus] if present, else the first
// field, else the Close button. When the dialog closes, focus goes back to the
// element that opened it (if it is still on the page).

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
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      d.showModal()
      const target =
        d.querySelector<HTMLElement>('[data-autofocus]') ??
        d.querySelector<HTMLElement>('.overflow-y-auto input:not([type=hidden]):not(:disabled), .overflow-y-auto select:not(:disabled), .overflow-y-auto textarea:not(:disabled)') ??
        d.querySelector<HTMLElement>('button[aria-label="Close"]')
      target?.focus()
    }
    if (!open && d.open) {
      d.close()
      const o = opener.current
      opener.current = null
      if (o && o.isConnected) o.focus()
    }
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
          <div className="flex items-start justify-between gap-4 border-b rule px-6 py-5">
            <h2 id={titleId} className="text-2xl">
              {title}
            </h2>
            <button type="button" className="btn btn-ghost btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Close">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5 text-[1.125rem]">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t rule px-6 py-5">{footer}</div>}
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
    const t = setTimeout(() => setVisible(false), 5200)
    return () => clearTimeout(t)
  }, [key])
  return (
    <div role="status" aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-4">
      {visible && (
        <div key={key} className="pop-in pointer-events-auto flex items-center gap-2 rounded-md bg-ink px-5 py-3.5 text-[1.0625rem] font-bold text-ground shadow-pop">
          <Check size={18} aria-hidden="true" />
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
    <div className="rounded-lg border border-dashed px-6 py-12 text-center text-[1.125rem]" style={{ borderColor: 'rgb(var(--c-control))' }}>
      <p className="font-display text-xl">{title}</p>
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
    <div className={`rounded-md px-4 py-3.5 text-[1.0625rem] ${cls} ${className}`} style={{ borderLeft: `4px solid rgb(var(${bar}))` }}>
      {children}
    </div>
  )
}

// ---- Hub shared components -------------------------------------------------

const STAGE_LOOK: Record<Stage, { cls: string; Icon: typeof Check }> = {
  'New Lead': { cls: 'st-slate', Icon: Sparkles },
  'Dial 1': { cls: 'st-slate', Icon: Phone },
  'Dial 2': { cls: 'st-slate', Icon: Phone },
  Quoting: { cls: 'st-amber', Icon: FileEdit },
  'Quote Sent': { cls: 'st-blue', Icon: Send },
  'Follow-Up': { cls: 'st-blue', Icon: Clock },
  Nurture: { cls: 'st-lost', Icon: Sprout },
  'Quote Accepted': { cls: 'st-green', Icon: Check },
  'Inspection Required': { cls: 'st-teal', Icon: MapPin },
  'Booking Required': { cls: 'st-teal', Icon: CalendarDays },
  'Job Booked': { cls: 'st-green', Icon: CalendarCheck },
  'Deposit Requested': { cls: 'st-amber', Icon: Receipt },
  'Job Completed': { cls: 'st-won', Icon: Trophy },
  'Retention Claim': { cls: 'st-hot', Icon: Layers },
}

/** Where a job is. Muted colour, an icon and the words, never colour alone. */
export function StageBadge({ stage }: { stage: Stage }) {
  const { cls, Icon } = STAGE_LOOK[stage] ?? { cls: 'st-slate', Icon: Layers }
  return (
    <span className={`badge ${cls}`}>
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
      {stage}
    </span>
  )
}

/** Won or Lost chip next to the stage. Renders nothing for an open job. */
export function JobStatusBadge({ job }: { job: Pick<Job, 'status'> }) {
  if (job.status === 'open') return null
  const won = job.status === 'won'
  return (
    <span className={`badge ${won ? 'st-won' : 'st-lost'}`}>
      {won ? <Trophy size={16} strokeWidth={2.5} aria-hidden="true" /> : <CircleX size={16} strokeWidth={2.5} aria-hidden="true" />}
      {won ? 'Won' : 'Lost'}
    </span>
  )
}

/** How long a job has sat in its stage. Renders nothing while it is fine. */
export function StallBadge({ job }: { job: Job }) {
  const st = stall(job)
  if (st.level === 'ok') return null
  return (
    <span className={`badge ${st.level === 'stuck' ? 'st-hot' : 'st-amber'}`}>
      <Clock size={16} strokeWidth={2.5} aria-hidden="true" />
      {st.label}
      {st.level === 'stuck' && <span className="sr-only"> (needs attention)</span>}
    </span>
  )
}

/** A big number with a label. Pass MoneyText as value for dollars. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'plain',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'plain' | 'good' | 'warn' | 'bad'
}) {
  const bar = { plain: '--c-navy', good: '--c-green-ink', warn: '--c-amber', bad: '--c-hot' }[tone]
  return (
    <div className="card" style={{ borderLeft: `6px solid rgb(var(${bar}))`, padding: '1.25rem 1.5rem' }}>
      <p className="t-small font-bold text-muted">{label}</p>
      <p className="num mt-1 font-display text-4xl leading-none">{value}</p>
      {hint && <p className="t-small mt-2 text-muted">{hint}</p>}
    </div>
  )
}

/** After a delete removes the row you were on: put focus on the page heading so it is not lost. Runs after the dialog has closed. */
export function focusPageHeading() {
  setTimeout(() => document.querySelector<HTMLElement>('[data-page-heading]')?.focus(), 0)
}

/** Page title, an optional line under it, and the one main action on the right. */
export function PageHead({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="t-page outline-none" tabIndex={-1} data-page-heading>
          {title}
        </h1>
        {subtitle && <p className="t-body mt-2 text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  )
}

export interface TabDef {
  id: string
  label: string
  count?: number
}

/**
 * A row of tabs. Arrow keys, Home and End move. Ids are built from a useId prefix, so
 * two tab rows never clash. To wrap the matching panel, pass the same `tabsId` to
 * Tabs and to TabPanel (get one from useId). `idPrefix` is for old callers that
 * build the tab id themselves: the tab id is then `${idPrefix}${tab.id}`.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  label,
  tabsId,
  idPrefix,
}: {
  tabs: TabDef[]
  value: string
  onChange: (id: string) => void
  label: string
  tabsId?: string
  idPrefix?: string
}) {
  const own = useId()
  const base = tabsId ?? own
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (to: number) => {
    const n = (to + tabs.length) % tabs.length
    onChange(tabs[n].id)
    refs.current[n]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="tabs">
      {tabs.map((t, i) => {
        const on = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}${t.id}` : tabId(base, t.id)}
            aria-controls={on ? panelId(base, t.id) : undefined}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className="tab"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                move(i + 1)
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                move(i - 1)
              } else if (e.key === 'Home') {
                e.preventDefault()
                move(0)
              } else if (e.key === 'End') {
                e.preventDefault()
                move(tabs.length - 1)
              }
            }}
          >
            {t.label}
            {t.count !== undefined && <span className="tab-count num">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

const tabId = (base: string, id: string) => `${base}-tab-${id}`
const panelId = (base: string, id: string) => `${base}-panel-${id}`

/** The panel for the selected tab. Give it the same tabsId as the Tabs row. */
export function TabPanel({ tabsId, id, children, className }: { tabsId: string; id: string; children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={panelId(tabsId, id)} aria-labelledby={tabId(tabsId, id)} className={className}>
      {children}
    </div>
  )
}

/** The "Are you sure?" step before anything is recorded. Cancel has the focus. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  tone = 'normal',
}: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  tone?: 'normal' | 'danger'
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-quiet btn-lg" onClick={onClose} data-autofocus>
            Cancel
          </button>
          <button type="button" className={`btn btn-lg ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}

/** Dollars in tabular figures. whole drops the cents. */
export function MoneyText({ value, whole = false, className = '' }: { value: number; whole?: boolean; className?: string }) {
  return <span className={`num ${className}`}>{whole ? fmtMoneyWhole(value) : fmtMoney(value)}</span>
}

/** A count of days such as "5 days". Colour is extra; the words always show. */
export function DaysChip({ days, tone = 'plain', suffix = '' }: { days: number; tone?: 'plain' | 'warn' | 'bad'; suffix?: string }) {
  const cls = { plain: 'st-slate', warn: 'st-amber', bad: 'st-hot' }[tone]
  const text = days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}${suffix ? ' ' + suffix : ''}`
  return <span className={`badge ${cls} num`}>{text}</span>
}

/** A titled block of a page with an optional action beside the heading. */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="t-section">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
