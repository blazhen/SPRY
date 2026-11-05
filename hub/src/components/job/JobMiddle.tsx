import { Fragment } from 'react'
import { renderBox } from './BoxView'
import { boxesIn, useJobLayout } from '../../lib/jobLayout'
import './jobMiddle.css'

/**
 * MIDDLE panel: the boxes Edit layout put here. By default the composer (note, text, email, task), the open tasks, the
 * history (newest first) and the milestone buttons. Anchors: job-notes-section and job-tasks-section exist while those
 * boxes are in this panel.
 */
export function JobMiddle({ jobId }: { jobId: string }) {
  const cfg = useJobLayout()
  const boxes = boxesIn(cfg, 'middle')
  return (
    <div className="jm-col">
      {boxes.map((b) => (
        <Fragment key={b.id}>{renderBox(b.id, jobId, b)}</Fragment>
      ))}
    </div>
  )
}
