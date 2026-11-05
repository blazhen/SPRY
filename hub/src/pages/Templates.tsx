import { useState } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import { PagedList } from '../components/Pager'
import { ConfirmDialog, Dialog, EmptyState, PageHead, focusPageHeading, toast } from '../components/ui'
import { jobText, word } from '../lib/format'
import { go, href } from '../lib/router'
import { allTemplates, canQuoteRecipient, createQuote, deleteTemplate, getTerms, useStore } from '../lib/store'
import type { ProductType, Template } from '../types'

function productOf(t: Template, termsProduct?: ProductType): ProductType {
  return t.productType ?? termsProduct ?? 'Spray foam'
}

export default function Templates() {
  const store = useStore()
  const templates = allTemplates(store)
  const [toDelete, setToDelete] = useState<Template | null>(null)
  const [toUse, setToUse] = useState<Template | null>(null)
  const [jobId, setJobId] = useState('')
  const [error, setError] = useState('')
  const hasOwn = templates.some((t) => !t.builtIn)

  const closeUse = () => {
    setToUse(null)
    setJobId('')
    setError('')
  }

  const apply = () => {
    const job = store.jobs.find((j) => j.id === jobId)
    if (!toUse || !job) {
      setError(jobText('Choose a %j first.'))
      return
    }
    const ref = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
    if (!ref) {
      setError(jobText('This %j has nobody on it yet. Add a contact on the %j page first.'))
      return
    }
    if (!canQuoteRecipient(job.id, ref, store)) {
      setError('That customer cannot be quoted again (the limit is reached).')
      return
    }
    const q = createQuote(job.id, ref, { templateId: toUse.id })
    if (!q) {
      setError('The quote could not be created.')
      return
    }
    closeUse()
    go(href.edit(q.id))
  }

  return (
    <div className="stack-lg">
      <PageHead
        title="Templates"
        subtitle="A template is a quote you can start from. It keeps the sections, products and wording. It never keeps a customer or prices."
      />

      {templates.length === 0 ? (
        <EmptyState title="No templates yet">Open a quote and choose "Save as template" to keep it for next time.</EmptyState>
      ) : (
        <PagedList items={templates} noun="templates" render={(rows) => (
        <div className="tbl-wrap">
          <table className="tbl tbl-stack">
            <caption className="sr-only">Templates</caption>
            <thead>
              <tr>
                <th scope="col">Template</th>
                <th scope="col">For</th>
                <th scope="col" className="num-col">
                  Items
                </th>
                <th scope="col">Used for</th>
                <th scope="col">What to do</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const product = productOf(t, getTerms(t.termsId, store)?.productType)
                return (
                  <tr key={t.id} style={{ height: 'auto' }}>
                    <th scope="row" data-label="Template">
                      {t.name}
                      {t.builtIn && <span className="badge st-slate ml-2">Built-in</span>}
                    </th>
                    <td data-label="For">
                      <span className={`badge ${product === 'InjectaCore' ? 'st-teal' : 'st-blue'}`}>{product}</span>
                    </td>
                    <td data-label="Items" className="num-col">
                      {t.lines.length} {t.lines.length === 1 ? 'item' : 'items'}
                    </td>
                    <td data-label="Used for" className="break-words">
                      {t.description || 'No description'}
                    </td>
                    <td data-label="What to do">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-primary btn-lg" onClick={() => setToUse(t)} aria-label={`Use template ${t.name}`}>
                          Use template
                          <ArrowRight size={18} aria-hidden="true" />
                        </button>
                        {!t.builtIn && (
                          <button type="button" className="btn btn-danger" onClick={() => setToDelete(t)} aria-label={`Delete template ${t.name}`}>
                            <Trash2 size={16} aria-hidden="true" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )} />
      )}

      {!hasOwn && templates.length > 0 && (
        <p className="t-body max-w-2xl text-muted">Want your own? Open any quote and choose "Save as template". It will appear here, without the customer or prices.</p>
      )}

      <Dialog
        open={!!toUse}
        onClose={closeUse}
        title={`Use "${toUse?.name ?? ''}"`}
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={closeUse}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={apply}>
              Create quote
            </button>
          </>
        }
      >
        <p>{jobText('A new draft quote is made on the %j you choose, addressed to its main contact.')}</p>
        <div className="mt-3">
          <label className="label" htmlFor="tpl-job">
            {word()}
          </label>
          <select id="tpl-job" className="field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Choose</option>
            {store.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        action="delete-other"
        onClose={() => setToDelete(null)}
        title="Delete this template?"
        confirmLabel="Delete template"
        tone="danger"
        onConfirm={() => {
          if (toDelete) {
            deleteTemplate(toDelete.id)
            toast(`Template "${toDelete.name}" deleted`)
            focusPageHeading()
          }
          setToDelete(null)
        }}
      >
        <p>"{toDelete?.name}" will be removed. Quotes already made from it are not changed.</p>
      </ConfirmDialog>
    </div>
  )
}
