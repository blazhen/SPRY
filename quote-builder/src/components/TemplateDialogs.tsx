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
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save template
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        noValidate
      >
        <Notice>Saved: sections, products, upgrade options and wording. Not saved: customer, job, prices.</Notice>
        <div>
          <label className="label" htmlFor={`${id}-n`}>
            Template name
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
          <textarea id={`${id}-d`} className="field" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} />
        </div>
        <button type="submit" className="sr-only" tabIndex={-1}>
          Save template
        </button>
      </form>
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
      title="Load a template"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!chosen} onClick={() => chosen && onPick(chosen)}>
            Load template
          </button>
        </>
      }
    >
      {willReplace && (
        <Notice tone="warn" className="mb-4">
          This quote already has line items. Loading a template replaces its line items, upgrades, payment stages, notes and terms. The customer, job and title stay.
        </Notice>
      )}
      <fieldset>
        <legend className="label">Choose a template</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => {
            const on = t.id === sel
            return (
              <label
                key={t.id}
                htmlFor={`${id}-${t.id}`}
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-md bg-raise p-3.5 hover:bg-navy-wash"
                style={{ border: `2px solid ${on ? 'rgb(var(--c-navy))' : 'rgb(var(--c-line))'}` }}
              >
                <input
                  id={`${id}-${t.id}`}
                  type="radio"
                  name={`${id}-tpl`}
                  className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]"
                  checked={on}
                  onChange={() => setSel(t.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-bold">{t.name}</span>
                    {t.builtIn && <span className="badge bg-soft text-ink">Built-in</span>}
                  </span>
                  {t.description && <span className="mt-0.5 block break-words text-sm text-muted">{t.description}</span>}
                  <span className="mt-1 block text-sm text-muted">
                    {t.items.length} {t.items.length === 1 ? 'line item' : 'line items'}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <p className="hint">Templates carry no prices. You set them on each line after loading.</p>
    </Dialog>
  )
}
