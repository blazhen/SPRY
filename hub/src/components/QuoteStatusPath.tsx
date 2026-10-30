import { Check, CircleX, Clock, Eye, FileEdit, Layers, Send } from 'lucide-react'
import { quoteStage, waitingText, whenText, type StageId } from '../lib/quoteStatus'
import type { Quote } from '../types'

const LOOK: Record<StageId, { cls: string; Icon: typeof Check }> = {
  draft: { cls: 'st-slate', Icon: FileEdit },
  sent: { cls: 'st-blue', Icon: Send },
  opened: { cls: 'st-teal', Icon: Eye },
  accepted: { cls: 'st-green', Icon: Check },
  declined: { cls: 'st-hot', Icon: CircleX },
  expired: { cls: 'st-amber', Icon: Clock },
  superseded: { cls: 'st-lost', Icon: Layers },
}

const WAIT_CLS = { blue: 'st-blue', amber: 'st-amber', hot: 'st-hot' } as const

/**
 * A quote's status in words and an icon, with the date and time of its last
 * step and, for sent quotes, how long it has been waiting. Text is always shown.
 */
export function QuoteStatusPath({ q }: { q: Quote }) {
  const st = quoteStage(q)
  const { cls, Icon } = LOOK[st.id]
  const when = whenText(st.at)
  return (
    <div className="flex flex-col items-start gap-1" data-stage={st.id}>
      <span className={`badge ${cls}`}>
        <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
        {st.label}
      </span>
      {st.id === 'opened' && q.sentAt && <span className="t-small block text-muted">Sent {whenText(q.sentAt)}</span>}
      {when && (
        <span className="t-small block text-muted">
          {st.id === 'opened' ? 'First opened' : st.id === 'sent' ? 'Sent' : ''} {when}
          {st.id === 'opened' && q.openCount && q.openCount > 1 ? `, opened ${q.openCount} times` : ''}
        </span>
      )}
      {st.waitDays !== undefined && st.waitTone && (
        <span className={`badge ${WAIT_CLS[st.waitTone]}`}>
          <Clock size={16} strokeWidth={2.5} aria-hidden="true" />
          {waitingText(st.waitDays)}
        </span>
      )}
    </div>
  )
}

export default QuoteStatusPath
