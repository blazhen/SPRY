import { useEffect, useId, useState } from 'react'
import { allTemplates, saveTemplateFromQuote, useStore } from '../lib/store'
import type { Quote, Template } from '../types'
import { Dialog, Notice, toast } from './ui'

export function SaveTemplateDialog({ open, onClose, quote }: { open: boolean; onClose: () => void; quote: Quote }) {
  const id = useId()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setErr('')
    }
  }, [open])

  function save() {
    if (!name.trim()) {
      setErr('Give the template a name.')
      return
    }
    saveTemplateFromQuote(quote, name, description)
    toast(`Template "${name.trim()}" saved`)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Save as template"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save template
          </button>
        </>
      }
    >
      <form
        className="dg-stack"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        noValidate
      >
        <div>
          <label className="label" htmlFor={`${id}-n`}>
            Name
            <span className="sr-only"> Template name</span>
          </label>
          <input
            id={`${id}-n`}
            className="field"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (err) setErr('')
            }}
            aria-invalid={!!err}
            aria-describedby={err ? `${id}-e` : undefined}
            autoComplete="off"
            maxLength={80}
          />
          {err && (
            <p id={`${id}-e`} className="err" role="alert">
              {err}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor={`${id}-d`}>
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id={`${id}-d`} className="field" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} />
        </div>
        <p className="dg-muted">Keeps sections, products, upgrades and wording. Not the customer, job or prices.</p>
        <button type="submit" className="sr-only" tabIndex={-1}>
          Save template
        </button>
      </form>
    </Dialog>
  )
}

/** "Write new..." terms: text only, formatting stays fixed. Asks whether to keep it for next time. */
export function WriteTermsDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (text: string, saveAsTemplate: boolean, name: string) => void
}) {
  const id = useId()
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [keep, setKeep] = useState(false)
  const [err, setErr] = useState<{ field: 't' | 'n'; text: string } | null>(null)

  useEffect(() => {
    if (open) {
      setText('')
      setName('')
      setKeep(false)
      setErr(null)
    }
  }, [open])

  function save() {
    if (!text.trim()) {
      setErr({ field: 't', text: 'Write the terms first.' })
      return
    }
    if (keep && !name.trim()) {
      setErr({ field: 'n', text: 'Give the template a name.' })
      return
    }
    onSave(text.trim(), keep, name.trim())
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Write new terms"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Use these terms
          </button>
        </>
      }
    >
      <div className="dg-stack">
        <div>
          <label className="label" htmlFor={`${id}-t`}>
            Terms <span className="sr-only">Terms text</span>
          </label>
          <textarea
            id={`${id}-t`}
            className="field"
            rows={6}
            value={text}
            onChange={(e) => { setText(e.target.value); setErr(null) }}
            aria-invalid={err?.field === 't' ? true : undefined}
            aria-describedby={err?.field === 't' ? `${id}-te` : undefined}
          />
          {err?.field === 't' && (
            <p id={`${id}-te`} className="err" role="alert">
              {err.text}
            </p>
          )}
          <p className="dg-muted dg-adv mt-1">Text only. Size and layout are set for you.</p>
        </div>
        <label htmlFor={`${id}-k`} className="dg-row dg-check" style={{ paddingLeft: 0 }}>
          <input id={`${id}-k`} type="checkbox" className="check" checked={keep} onChange={(e) => { setKeep(e.target.checked); setErr(null) }} />
          <span className="font-bold">Save as a template for next time?</span>
        </label>
        {keep && (
          <div>
            <label className="label" htmlFor={`${id}-n`}>
              Name <span className="sr-only">Template name</span>
            </label>
            <input
              id={`${id}-n`}
              className="field"
              value={name}
              maxLength={80}
              autoComplete="off"
              onChange={(e) => { setName(e.target.value); setErr(null) }}
              aria-invalid={err?.field === 'n' ? true : undefined}
              aria-describedby={err?.field === 'n' ? `${id}-ne` : undefined}
            />
            {err?.field === 'n' && (
              <p id={`${id}-ne`} className="err" role="alert">
                {err.text}
              </p>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

export function LoadTemplateDialog({
  open,
  onClose,
  onPick,
  willReplace,
}: {
  open: boolean
  onClose: () => void
  onPick: (t: Template) => void
  willReplace: boolean
}) {
  const store = useStore()
  const templates = allTemplates(store)
  const id = useId()
  const [sel, setSel] = useState('')

  useEffect(() => {
    if (open) setSel('')
  }, [open])

  const chosen = templates.find((t) => t.id === sel)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Use a template"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!chosen} onClick={() => chosen && onPick(chosen)}>
            Load template
          </button>
        </>
      }
    >
      {willReplace && (
        <Notice tone="warn" className="mb-3">
          This replaces the quote's line items, upgrades, payment stages and terms. Customer, job and title stay.
        </Notice>
      )}
      <fieldset className="dg-fs">
        <legend className="sr-only">Choose a template</legend>
        <div className="dg-list dg-scroll" title="Templates carry no prices. You set them on each line after loading.">
          {templates.map((t) => {
            const n = `${t.lines.length} ${t.lines.length === 1 ? 'line' : 'lines'}`
            return (
              <label key={t.id} htmlFor={`${id}-${t.id}`} className="dg-row" title={[t.description, n].filter(Boolean).join('. ')}>
                <input id={`${id}-${t.id}`} type="radio" name={`${id}-tpl`} checked={t.id === sel} onChange={() => setSel(t.id)} />
                <span className="dg-name">{t.name}</span>
                {t.builtIn && <span className="dg-tag">Built-in</span>}
                {t.description && <span className="dg-sub dg-adv">{t.description}</span>}
                <span className="dg-end">{n}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <p className="dg-muted dg-adv mt-2">Templates carry no prices. You set them on each line after loading.</p>
    </Dialog>
  )
}
