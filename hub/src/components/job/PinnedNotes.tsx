import { useState, type ReactNode } from 'react'
import { History } from 'lucide-react'
import { fmtDate } from '../../lib/format'
import { notesForJob, useNotesStore } from '../../lib/notesStore'
import { useStore } from '../../lib/store'
import { OPEN_SECTION, Section } from './Section'
import './jobRight.css'
import { scrollWithin } from '../../lib/scrollIn'

/**
 * Long lists in the right panel: show the first 5, then "Show all (N)" and "Show fewer".
 * Shared by every section of the right panel (kept in this file so the right panel owns no extra files).
 */
export function useLimited<T>(items: T[]): { shown: T[]; toggle: ReactNode } {
  const limit = 5
  const [all, setAll] = useState(false)
  // Never hide just one row behind a button.
  const over = items.length > limit
  const shown = over && !all ? items.slice(0, limit) : items
  const toggle = over ? (
    <button type="button" className="btn btn-neutral btn-sm jr-more" aria-expanded={all} onClick={() => setAll((a) => !a)}>
      {all ? 'Show fewer' : `Show all (${items.length})`}
    </button>
  ) : null
  return { shown, toggle }
}

/** Opens the middle panel's notes section and scrolls to it. */
function seeInHistory() {
  window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'job-notes-section' }))
  // Wait one frame so the section has opened before scrolling to it.
  window.requestAnimationFrame(() => scrollWithin(document.getElementById('job-notes-section'), 'start'))
}

/** Remove the "[Job name] " tag that job notes start with (it is the way a note is tied to a job). */
const plain = (text: string) => text.replace(/^\s*\[[^\]]*\]\s*/, '')

/**
 * RIGHT panel: pinned notes, read only. Notes are written and pinned in the history (middle panel), never here.
 */
export function PinnedNotes({ jobId }: { jobId: string }) {
  const ns = useNotesStore()
  const s = useStore()
  const pinned = notesForJob(jobId, ns, s)
    .filter((n) => n.pinned)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  const { shown, toggle } = useLimited(pinned)
  const latest = pinned[0]

  return (
    <Section
      id="job-pinned-section"
      title="Pinned notes"
      count={pinned.length}
      summary={latest ? `${pinned.length} pinned, latest ${fmtDate(latest.at)}` : 'Nothing pinned'}
    >
      {pinned.length === 0 ? (
        <p className="jr-empty">Nothing pinned. Pin a note in the history to keep it here.</p>
      ) : (
        <>
          <ul className="jr-list" aria-label="Pinned notes, newest first">
            {shown.map((n) => (
              <li key={n.id} className="jr-card">
                <p className="jr-note">{plain(n.text)}</p>
                <div className="jr-row jr-meta">
                  <span>
                    {n.author}, {fmtDate(n.at)}
                  </span>
                  <button type="button" className="btn btn-neutral btn-sm" onClick={seeInHistory} aria-label={`See this note in the history, by ${n.author}, ${fmtDate(n.at)}`}>
                    <History size={16} aria-hidden="true" />
                    See in history
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {toggle}
        </>
      )}
    </Section>
  )
}

export default PinnedNotes
