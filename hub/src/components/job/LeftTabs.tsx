import { useState } from 'react'
import { BoxSlot, renderBox } from './BoxView'
import { SoloSection } from './Section'
import { boxesIn, type BoxId } from '../../lib/jobLayout'
import { useLayoutSession } from '../../lib/layoutDraft'
import { getJob, useStore } from '../../lib/store'

/** The left panel switch: All (every box of this panel), or only the Job, Contact or Company box. */
export type LeftView = 'all' | 'job' | 'contact' | 'company'

const KEY = 'hub.left.view.v1.advanced'

export function readLeftView(): LeftView {
  try {
    const v = window.localStorage.getItem(KEY)
    if (v === 'all' || v === 'job' || v === 'contact' || v === 'company') return v
  } catch {
    /* storage blocked: use the default */
  }
  return 'all'
}

function saveLeftView(v: LeftView) {
  try {
    window.localStorage.setItem(KEY, v)
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
}

/** Remembered choice. */
export function useLeftView(): [LeftView, (v: LeftView) => void] {
  const [view, setView] = useState<LeftView>(() => readLeftView())
  return [
    view,
    (v) => {
      setView(v)
      saveLeftView(v)
    },
  ]
}

const LABEL: Record<Exclude<LeftView, 'all'>, string> = { job: 'Job', contact: 'Contact', company: 'Company' }

/**
 * LEFT panel with a switch at the top: All | Job | Contact | Company. All draws every box Edit layout put in this panel,
 * in order. Job, Contact and Company show just that box. The switch lists only the boxes that are in this panel (and
 * Company only when the job has a company). With several people on the job the Contact box has its own person picker.
 */
export function LeftPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const { layout: cfg, editing } = useLayoutSession()
  const job = getJob(jobId, s)
  const [view, setView] = useLeftView()
  if (!job) return null
  const hasCompany = job.participants.some((p) => p.kind === 'company')
  const left = boxesIn(cfg, 'left')
  const here = (id: BoxId) => left.some((b) => b.id === id)
  const options: LeftView[] = ['all', ...((['job', 'contact', 'company'] as const).filter((id) => here(id) && (id !== 'company' || hasCompany)))]
  // A remembered view whose box is gone (moved, hidden, no company) falls back to All, without forgetting the choice.
  // While Edit layout is on every box of the panel shows, so each one has its frame.
  const shown: LeftView = !editing && options.includes(view) ? view : 'all'
  const one = shown === 'all' ? null : left.find((b) => b.id === shown)

  return (
    <div className="jl-viewwrap" data-left-view={shown}>
      {options.length > 1 && !editing && (
        <div className="jl-switch" role="group" aria-label="Show in this panel">
          {options.map((o) => (
            <button key={o} type="button" className="jl-switch-btn" aria-pressed={shown === o} onClick={() => setView(o)}>
              {o === 'all' ? 'All' : LABEL[o]}
            </button>
          ))}
        </div>
      )}
      {one ? (
        <SoloSection.Provider value>
          <div className="jl-flat" data-left-job={one.id === 'job' ? '' : undefined} data-left-contact={one.id === 'contact' ? '' : undefined} data-left-company={one.id === 'company' ? '' : undefined}>
            {renderBox(one.id, jobId, one)}
          </div>
        </SoloSection.Provider>
      ) : (
        <div className="jl-stack">
          {left.map((b) => (
            <BoxSlot key={b.id} id={b.id} jobId={jobId} state={b} />
          ))}
          {left.length === 0 && <p className="hint">No boxes in this panel. Use Edit layout to add one.</p>}
        </div>
      )}
    </div>
  )
}
