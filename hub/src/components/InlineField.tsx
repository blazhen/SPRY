import { useEffect, useId, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import './inlineField.css'

/**
 * A field you edit where it stands: click it and type. No Edit button, no popup, no other page.
 * The change is saved when you click away. Enter saves too (Ctrl+Enter in a multi-line field), Escape cancels.
 * After a save the field says "Saved" with an Undo for a few seconds. An empty value is valid, so a field can be
 * cleared and saved.
 */
export interface InlineFieldProps {
  label: string
  value: string
  /** Called with the new text (may be empty). Return false when the text was refused, so no "Saved" shows. */
  onSave: (next: string) => void | boolean
  multiline?: boolean
  rows?: number
  type?: 'text' | 'tel' | 'email' | 'url'
  inputMode?: 'text' | 'tel' | 'email' | 'url' | 'decimal'
  autoComplete?: string
  /** Shown in the field while it is empty, for example "Click to add the job site address". */
  placeholder?: string
  /** Hide the visible label (the label is still read by screen readers). */
  hideLabel?: boolean
  /** A line under the field that says what it is for. */
  hint?: string
  className?: string
}

export function InlineField({ label, value, onSave, multiline, rows = 3, type = 'text', inputMode, autoComplete, placeholder, hideLabel, hint, className = '' }: InlineFieldProps) {
  const uid = useId()
  const [draft, setDraft] = useState(value)
  /** After a save: the text before it, so Undo can put it back. */
  const [undo, setUndo] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const sent = useRef<string | null>(null)
  const dirty = draft !== value

  // A new saved value from outside replaces the text, unless the person is in the middle of typing.
  useEffect(() => {
    sent.current = null
    if (document.activeElement !== ref.current || !dirty) setDraft(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (undo === null) return
    const t = window.setTimeout(() => setUndo(null), 8000)
    return () => window.clearTimeout(t)
  }, [undo])

  // Warn before leaving the page with an unsaved change.
  useEffect(() => {
    if (!dirty) return
    const on = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', on)
    return () => window.removeEventListener('beforeunload', on)
  }, [dirty])

  const save = () => {
    if (!dirty || sent.current === draft) return
    if (onSave(draft) === false) return
    sent.current = draft
    setUndo(value)
  }
  const cancel = () => setDraft(value)
  const undoSave = () => {
    if (undo === null) return
    onSave(undo)
    setDraft(undo)
    setUndo(null)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && dirty) {
      e.stopPropagation()
      cancel()
    } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      save()
    }
  }

  const common = {
    id: uid,
    ref,
    value: draft,
    placeholder: placeholder ?? 'Click to add',
    autoComplete,
    className: `inline-field ${dirty ? 'inline-field-dirty' : ''}`,
    'aria-describedby': hint ? `${uid}-hint ${uid}-state` : `${uid}-state`,
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setDraft(e.target.value),
    onKeyDown: onKey,
    onBlur: save,
  }

  return (
    <div className={`inline-field-wrap ${className}`}>
      <label htmlFor={uid} className={hideLabel ? 'sr-only' : 'inline-field-label'}>
        {label}
      </label>
      {multiline ? <textarea {...common} rows={rows} /> : <input {...common} type={type} inputMode={inputMode} />}
      {hint ? (
        <p id={`${uid}-hint`} className="inline-field-hint">
          {hint}
        </p>
      ) : null}
      <div id={`${uid}-state`} className="inline-field-state" aria-live="polite">
        {dirty ? (
          <span className="inline-field-unsaved">Not saved yet. Click away to save, or press Esc.</span>
        ) : undo !== null ? (
          <span className="inline-field-saved">
            <Check size={16} aria-hidden="true" /> Saved
            <button type="button" className="btn btn-neutral btn-sm" onClick={undoSave}>
              Undo
            </button>
          </span>
        ) : null}
      </div>
    </div>
  )
}
