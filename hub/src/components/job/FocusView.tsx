import { Fragment } from 'react'
import { ArrowLeft } from 'lucide-react'
import { renderBox } from './BoxView'
import { JobRight } from './JobRight'
import { focusFor } from '../../lib/focusViews'
import { boxDef, useJobLayout, type BoxId } from '../../lib/jobLayout'
import { href } from '../../lib/router'
import { SoloSection } from './Section'
import './jobMiddle.css'

/** The settings and fields of a box come from the saved layout even when the box itself is hidden there. */
function useBoxState(id: BoxId) {
  return useJobLayout().boxes.find((b) => b.id === id)
}

function Drawn({ id, jobId }: { id: BoxId; jobId: string }) {
  const st = useBoxState(id)
  return <Fragment>{renderBox(id, jobId, st)}</Fragment>
}

/** MIDDLE panel of a focus view: only that box (and its composer), full size, with a clear way back to All. */
export function FocusMiddle({ view, jobId }: { view: BoxId; jobId: string }) {
  const f = focusFor(view)
  return (
    <div className="jm-col" data-focus-middle={view}>
      <a className="focus-back" href={href.job(jobId)} data-focus-back>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to all
      </a>
      <h2 className="sr-only" id="focus-heading" tabIndex={-1}>
        {boxDef(view).label}
      </h2>
      <SoloSection.Provider value>
        {f.middle.map((id) => (
          <Drawn key={id} id={id} jobId={jobId} />
        ))}
      </SoloSection.Provider>
    </div>
  )
}

/** RIGHT panel of a focus view: its own boxes, or the usual sections. */
export function FocusRight({ view, jobId }: { view: BoxId; jobId: string }) {
  const f = focusFor(view)
  if (f.right === 'sections') return <JobRight jobId={jobId} railed />
  return (
    <div className="job-side" data-focus-right={view}>
      <div className="pane-bar">
        <span className="pane-bar-title">{boxDef(view).label}</span>
      </div>
      {f.right.map((id) => (
        <div key={id} className="pane-part">
          <Drawn id={id} jobId={jobId} />
        </div>
      ))}
    </div>
  )
}
