import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/** The rail (and anything else) can ask a section to open: window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'job-notes-section' })). */
export const OPEN_SECTION = 'hub-open-section'

/** True inside the right pane when the rail shows one section only: the section is always open and its heading is plain text. */
export const SoloSection = createContext(false)

/**
 * A panel section with a heading that opens and closes it. One shared component for the three job panels.
 * Open by default; when closed the heading shows a one-line summary and a count, so a closed section still tells you
 * what is inside. The rail opens a section when it jumps to it.
 * `id` is the anchor the icon rail jumps to. `empty` text is shown (quietly) inside when count is 0.
 */
export function Section({
  id,
  title,
  count,
  summary,
  action,
  sticky = false,
  children,
}: {
  id?: string
  title: string
  count?: number
  summary?: string
  /** Small buttons (for example "Add") on their own row under the heading, left aligned. Must be real buttons or links. */
  action?: ReactNode
  /** The heading stays at the top of its scrolling panel while this section is on screen (the History box). */
  sticky?: boolean
  children: ReactNode
}) {
  const uid = useId()
  const hasContent = count === undefined ? true : count > 0
  const solo = useContext(SoloSection)
  const [openState, setOpen] = useState(true)
  const open = solo || openState

  useEffect(() => {
    if (!id) return
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) setOpen(true)
    }
    window.addEventListener(OPEN_SECTION, on)
    return () => window.removeEventListener(OPEN_SECTION, on)
  }, [id])

  return (
    <section id={id} className="sec" data-open={open} data-empty={!hasContent} data-sticky={sticky || undefined} aria-labelledby={`${uid}-h`}>
      <div className="sec-head">
        <h2 id={`${uid}-h`} className="sec-title">
          {solo ? (
            <span className="sec-btn sec-solo">
              <span className="sec-name">{title}</span>
              {count !== undefined && <span className="sec-count num">{count}</span>}
            </span>
          ) : (
            <button type="button" className="sec-btn" aria-expanded={open} aria-controls={open ? `${uid}-b` : undefined} onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
              <span className="sec-name">{title}</span>
              {count !== undefined && <span className="sec-count num">{count}</span>}
              {!open && summary ? <span className="sec-summary">{summary}</span> : null}
            </button>
          )}
        </h2>
      </div>
      {/* The buttons get their own row under the heading, so the heading (chevron, title, count) never wraps. */}
      {action && open ? <div className="sec-action">{action}</div> : null}
      {open && (
        <div id={`${uid}-b`} className="sec-body">
          {children}
        </div>
      )}
    </section>
  )
}
