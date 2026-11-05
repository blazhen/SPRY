import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PagedList } from '../components/Pager'
import { ConfirmDialog, Notice, PageHead, focusPageHeading, toast } from '../components/ui'
import { termsFontPx } from '../lib/format'
import { createTerms, deleteTerms, updateTerms, useStore } from '../lib/store'
import { PRODUCT_TYPES, type ProductType } from '../types'

export default function Terms() {
  const s = useStore()
  const [selId, setSelId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<{ name: string; text: string; productType: ProductType }>({ name: '', text: '', productType: 'Spray foam' })
  const [toDelete, setToDelete] = useState(false)
  const [error, setError] = useState('')

  const sel = s.terms.find((t) => t.id === selId) ?? s.terms[0]
  const shown = creating ? draft : sel ? { name: sel.name, text: sel.text, productType: sel.productType } : draft

  const startNew = (p: ProductType) => {
    setDraft({ name: '', text: '', productType: p })
    setError('')
    setCreating(true)
  }

  const save = () => {
    if (!draft.name.trim() || !draft.text.trim()) {
      setError('Please give the terms a name and some text.')
      return
    }
    setError('')
    const t = createTerms(draft.name.trim(), draft.text.trim(), draft.productType)
    setCreating(false)
    setSelId(t.id)
    toast('Terms saved')
  }

  return (
    <div className="stack-lg">
      <PageHead
        title="Terms"
        subtitle="The terms and conditions printed at the end of a quote. Each quote uses one set."
        action={
          <button type="button" className="btn btn-primary btn-lg" onClick={() => startNew('Spray foam')}>
            <Plus size={18} aria-hidden="true" />
            New terms
          </button>
        }
      />

      <Notice tone="info">Spray foam jobs only ever see Spray foam terms; InjectaCore jobs only see InjectaCore terms.</Notice>

      {PRODUCT_TYPES.map((p) => {
        const list = s.terms.filter((t) => t.productType === p)
        return (
          <section key={p} aria-labelledby={`terms-${p}`} className="stack">
            <h2 id={`terms-${p}`} className="t-section">
              {p} terms
            </h2>
            {list.length === 0 ? (
              <p className="t-body text-muted">
                No {p} terms yet.{' '}
                <button type="button" className="inline-flex min-h-[44px] items-center font-bold text-navy underline" onClick={() => startNew(p)}>
                  Add some
                </button>
              </p>
            ) : (
              <PagedList items={list} noun="terms" resetKey={p} render={(rows) => (
              <div className="tbl-wrap">
                <table className="tbl tbl-click tbl-stack">
                  <caption className="sr-only">{p} terms</caption>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">For</th>
                      <th scope="col" className="num-col">
                        Length
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => {
                      const on = !creating && sel?.id === t.id
                      return (
                        <tr key={t.id} className={on ? 'bg-navy-wash' : ''}>
                          <th scope="row" data-label="Name">
                            <button
                              type="button"
                              className="row-link text-left"
                              aria-current={on ? 'true' : undefined}
                              onClick={() => {
                                setCreating(false)
                                setSelId(t.id)
                                setError('')
                              }}
                            >
                              {t.name}
                              {on && <span className="sr-only"> (editing below)</span>}
                            </button>
                          </th>
                          <td data-label="For">
                            <span className={`badge ${t.productType === 'InjectaCore' ? 'st-teal' : 'st-blue'}`}>{t.productType}</span>
                          </td>
                          <td data-label="Length" className="num-col">
                            {t.text.length} characters
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              )} />
            )}
          </section>
        )
      })}

      <section className="card stack" aria-labelledby="terms-edit">
        <h2 id="terms-edit" className="t-section">
          {creating ? 'New terms' : 'Edit terms'}
        </h2>
        <p className="t-body text-muted">You can change the wording only. The look of the terms on the quote is fixed, and long text is made smaller only when the quote is printed.</p>

        <div>
          <label className="label" htmlFor="terms-name">
            Name
          </label>
          <input
            id="terms-name"
            className="field"
            value={shown.name}
            onChange={(e) => (creating ? setDraft({ ...draft, name: e.target.value }) : sel && updateTerms(sel.id, { name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label" htmlFor="terms-product">
            Product type
          </label>
          <select
            id="terms-product"
            className="field max-w-sm"
            value={shown.productType}
            disabled={!creating}
            onChange={(e) => setDraft({ ...draft, productType: e.target.value as ProductType })}
          >
            {PRODUCT_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {!creating && <p className="hint">The product type is set when the terms are made. To change it, make new terms.</p>}
        </div>
        <div>
          <label className="label" htmlFor="terms-text">
            Terms text
          </label>
          <textarea
            id="terms-text"
            className="field"
            rows={10}
            value={shown.text}
            onChange={(e) => (creating ? setDraft({ ...draft, text: e.target.value }) : sel && updateTerms(sel.id, { text: e.target.value }))}
          />
          <p className="hint">{shown.text.length} characters</p>
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}

        <div>
          <h3 className="text-lg font-bold">Preview</h3>
          <div className="mt-2 rounded-md border p-4 rule" style={{ background: '#fff', color: '#111' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{shown.text || 'Nothing to preview yet.'}</p>
          </div>
          <p className="hint">
            {shown.text.length > 0 && termsFontPx(shown.text.length) < 9
              ? 'This is shown big so it is easy to read. When the quote is printed, long terms are made smaller to fit the page.'
              : 'This is shown big so it is easy to read. On the printed quote the terms may be a little smaller.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {creating ? (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={save}>
                Save terms
              </button>
              <button type="button" className="btn btn-neutral" onClick={() => setCreating(false)}>
                Cancel
              </button>
            </>
          ) : (
            sel && (
              <button type="button" className="btn btn-danger" onClick={() => setToDelete(true)}>
                <Trash2 size={16} aria-hidden="true" />
                Delete terms
              </button>
            )
          )}
        </div>
      </section>

      <ConfirmDialog
        open={toDelete}
        action="delete-other"
        onClose={() => setToDelete(false)}
        title="Delete these terms?"
        confirmLabel="Delete terms"
        tone="danger"
        onConfirm={() => {
          if (sel) {
            if (deleteTerms(sel.id)) {
              toast('Terms deleted')
              focusPageHeading()
            } else {
              setError(`These are the only ${sel.productType} terms, so they cannot be deleted. Make new terms first, then delete these.`)
            }
          }
          setToDelete(false)
        }}
      >
        <p>"{sel?.name}" will be removed from the list. Quotes using it print no terms.</p>
      </ConfirmDialog>
    </div>
  )
}
