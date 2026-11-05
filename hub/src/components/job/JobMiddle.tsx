import { BoxSlot } from './BoxView'
import { boxesIn } from '../../lib/jobLayout'
import { useLayoutSession } from '../../lib/layoutDraft'
import './jobMiddle.css'

/**
 * MIDDLE panel: the boxes Edit layout put here. By default the composer (note, text, email, task), the open tasks, the
 * history (newest first) and the milestone buttons. Anchors: job-notes-section and job-tasks-section exist while those
 * boxes are in this panel.
 */
export function JobMiddle({ jobId }: { jobId: string }) {
  const { layout } = useLayoutSession()
  const boxes = boxesIn(layout, 'middle')
  return (
    <div className="jm-col">
      {boxes.map((b) => (
        <BoxSlot key={b.id} id={b.id} jobId={jobId} state={b} />
      ))}
    </div>
  )
}
