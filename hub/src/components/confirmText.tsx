import type { ReactNode } from 'react'
import './confirmText.css'
import { AUTOMATION_TAGS, UNDO_LINE, noteForAction, noteForStage, type Note } from '../lib/confirmNotes'
import type { ConfirmText } from '../lib/confirmActions'

/** "What happens" under a confirm question: the facts from src/lib/confirm-notes (words are edited there). */
export function MayHappen({ note }: { note?: Note }) {
  if (!note || (note.lines.length === 0 && note.stops.length === 0)) return null
  return (
    <div className="confirm-may" data-confirm-may>
      {note.lines.length > 0 && (
        <>
          <p className="t-small font-bold">What happens:</p>
          <ul className="confirm-may-list">
            {note.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )}
      {note.stops.length > 0 && (
        <>
          <p className="t-small font-bold">Stops:</p>
          <ul className="confirm-may-list">
            {note.stops.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )}
      {note.sends && <p className="t-small text-muted">{UNDO_LINE}</p>}
    </div>
  )
}

/** Dialog text for any stage change: "Move <job> from X to Y?". `kind` is 'won' or 'lost' for the end states. */
export function stageChangeText(job: string, from: string, to: string, kind: 'stage' | 'won' | 'lost' = 'stage'): ConfirmText {
  const note = noteForStage(kind === 'won' ? 'Won' : kind === 'lost' ? 'Lost' : to)
  const title = kind === 'won' ? `Mark ${job} as won?` : kind === 'lost' ? `Mark ${job} as lost?` : `Move ${job} from ${from} to ${to}?`
  return {
    title,
    body: (
      <>
        {kind !== 'stage' && <p>It is now in {from}.</p>}
        <MayHappen note={note} />
      </>
    ),
    confirmLabel: kind === 'won' ? 'Yes, mark won' : kind === 'lost' ? 'Yes, mark lost' : 'Yes, move it',
    tone: kind === 'lost' ? 'danger' : 'normal',
  }
}

/** Dialog text for a non-stage action: the question plus the note for `key` (tags: pass the tag). */
export function actionText(key: string, title: string, confirmLabel: string, opts: { body?: ReactNode; tone?: 'normal' | 'danger'; tag?: string } = {}): ConfirmText {
  return {
    title,
    body: (
      <>
        {opts.body}
        <MayHappen note={noteForAction(key, opts.tag)} />
      </>
    ),
    confirmLabel,
    tone: opts.tone,
  }
}

/** True for a tag that is known to start CRM automations. */
export const isAutomationTag = (tag: string): boolean => AUTOMATION_TAGS.some((t) => tag === t || (t.endsWith('-') && tag.startsWith(t)))
