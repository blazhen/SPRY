import { ArrowLeft } from 'lucide-react'
import { boxesIn, type BoxState } from '../../lib/jobLayout'
import { useLayoutSession } from '../../lib/layoutDraft'
import { peopleOnJob, useLiveNotes } from '../../lib/notesStore'
import { PANE_SECTIONS, setPaneView, usePane, type PaneSectionId } from '../../lib/paneView'
import { getJob, useStore } from '../../lib/store'
import { useExtra } from '../../lib/useExtras'
import { BoxSlot } from './BoxView'
import { SoloSection } from './Section'
import './jobSide.css'

/** The boxes that can show right now: job costing only when its Settings switch is on (and the layout is Advanced). */
export function useAvailableSections(): PaneSectionId[] {
  const costing = useExtra('costing')
  return PANE_SECTIONS.map((s) => s.id).filter((id) => id !== 'costing' || costing)
}

/** Everything the pane and the rail share: the layout, what shows, and the current view. */
export function usePaneState() {
  const available = useAvailableSections()
  const pane = usePane(available)
  return { available, ...pane }
}

/**
 * The right pane of the job page: the boxes Edit layout put in the right panel (by default Quotes, People and companies,
 * Documents, Invoices, Job costing, Pinned notes). A "Customise" button at the top chooses which boxes show and opens
 * Edit layout; both read the one saved layout (per browser and per layout). The icon rail shows all of them stacked
 * (All) or just one; one box gets the whole pane. There is no notes editor here: notes are written in the history
 * (middle panel); this pane only shows the pinned ones.
 * `railed` is false on phones and tablets (no rail there): the pane always shows every chosen box.
 */
export function JobSide({ jobId }: { jobId: string; railed?: boolean }) {
  const store = useStore()
  const job = getJob(jobId, store)
  const { available } = usePaneState()
  const { layout: cfg } = useLayoutSession()
  // The draft while Edit layout is on, the saved layout otherwise.
  const sections = boxesIn(cfg, 'right').map((b) => b.id).filter((id) => available.includes(id))
  // Live: load the notes of everyone on the job so the pinned list is complete.
  useLiveNotes(peopleOnJob(jobId, store))

  if (!job) return null

  // The rail now opens focus views of the whole workspace (FocusView.tsx), so the pane never shows one box alone here any more.
  const solo = null as PaneSectionId | null
  const shown = solo ? [solo] : sections
  const stateOf = (id: PaneSectionId) => cfg.boxes.find((b) => b.id === id) as BoxState

  const backToAll = () => {
    setPaneView('all')
    // The button that was pressed is gone: put focus on the rail's All item.
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-rail="all"]')?.focus({ preventScroll: true }))
  }

  return (
    <div
      className="job-side"
      data-pane-view={solo ?? 'all'}
      onKeyDown={(e) => {
        // Escape inside one section goes back to All (a dialog or menu inside handles its own Escape first).
        if (e.key === 'Escape' && solo && !e.defaultPrevented && !(e.target as HTMLElement).closest('dialog, .menu-pop, .pane-pop')) backToAll()
      }}
    >
      <div className="pane-bar">
        {solo ? (
          <button type="button" className="btn btn-neutral btn-sm pane-back" onClick={backToAll}>
            <ArrowLeft size={16} aria-hidden="true" />
            All sections
          </button>
        ) : (
          <span className="pane-bar-title">Job details</span>
        )}
      </div>
      <SoloSection.Provider value={!!solo}>
        {shown.map((id) => (
          <div key={id} className="pane-part" data-pane-part={id}>
            <BoxSlot id={id} jobId={jobId} state={stateOf(id)} />
          </div>
        ))}
      </SoloSection.Provider>
      {shown.length === 0 && <p className="hint pane-empty">No boxes in this panel. Use Edit layout to add one.</p>}
    </div>
  )
}

export default JobSide
