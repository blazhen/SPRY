import { useState } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Dialog, EmptyState, toast } from '../components/ui'
import { href } from '../lib/router'
import { allTemplates, deleteTemplate, useStore } from '../lib/store'
import type { Template } from '../types'

function Count({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <div>
      <dt className="sr-only">{many}</dt>
      <dd className="text-sm text-muted">
        <span className="num font-display text-xl text-ink">{n}</span> {n === 1 ? one : many}
      </dd>
    </div>
  )
}

function TemplateCard({ t, onDelete }: { t: Template; onDelete: (t: Template) => void }) {
  const lineNames = t.items.slice(0, 4).map((i) => i.name).filter(Boolean)
  const moreLines = t.items.length - lineNames.length
  const sections = [...new Set(t.items.map((i) => i.section).filter(Boolean))]
  return (
    <li className="panel flex min-w-0 flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 break-words text-xl">{t.name}</h2>
        {t.builtIn && <span className="badge bg-navy-wash text-navy">Built-in</span>}
      </div>
      {t.description && <p className="mt-1.5 break-words text-muted">{t.description}</p>}

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y rule py-3">
        <Count n={t.items.length} one="line" many="lines" />
        <Count n={t.upgrades.length} one="upgrade" many="upgrades" />
        <Count n={t.payments.length} one="payment stage" many="payment stages" />
      </dl>

      <div className="mt-3 min-w-0 flex-1 space-y-2 text-sm">
        {lineNames.length > 0 && (
          <p className="break-words">
            <span className="font-bold">Lines: </span>
            <span className="text-muted">
              {lineNames.join(', ')}
              {moreLines > 0 ? `, and ${moreLines} more` : ''}
            </span>
          </p>
        )}
        {sections.length > 0 && (
          <p className="break-words">
            <span className="font-bold">Sections: </span>
            <span className="text-muted">{sections.join(', ')}</span>
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a href={href.new({ templateId: t.id })} className="btn btn-primary" aria-label={`Use template ${t.name}`}>
          Use template
          <ArrowRight size={18} aria-hidden="true" />
        </a>
        {!t.builtIn && (
          <button type="button" className="btn btn-danger" onClick={() => onDelete(t)} aria-label={`Delete template ${t.name}`}>
            <Trash2 size={18} aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

export default function TemplatesPage() {
  const store = useStore()
  const templates = allTemplates(store)
  const [toDelete, setToDelete] = useState<Template | null>(null)
  const hasOwn = templates.some((t) => !t.builtIn)

  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">Templates</h1>
      <p className="mt-2 max-w-2xl text-muted">
        A template keeps the structure of a quote: sections, products, upgrade options and wording. It never keeps a customer or prices, so it can be reused for other clients.
      </p>

      {templates.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No templates yet">Open a quote in the editor and choose "Save as template" to keep its structure for next time.</EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} onDelete={setToDelete} />
          ))}
        </ul>
      )}

      {!hasOwn && templates.length > 0 && (
        <p className="mt-8 max-w-2xl text-sm text-muted">
          Want your own? Open any quote in the editor and choose "Save as template". It will appear here, without the customer or prices.
        </p>
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this template?"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setToDelete(null)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (toDelete) {
                  deleteTemplate(toDelete.id)
                  toast(`Template "${toDelete.name}" deleted`)
                }
                setToDelete(null)
              }}
            >
              Delete template
            </button>
          </>
        }
      >
        <p>"{toDelete?.name}" will be removed. Quotes already made from it are not changed.</p>
      </Dialog>
    </div>
  )
}
