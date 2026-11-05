import { useEffect, useId, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Pencil, Save, X } from 'lucide-react'
import { DATA_SOURCE } from '../config'
import { opportunityFieldsApi, type OpportunityField } from '../lib/api'
import { saveJobCustomFields } from '../lib/customFields'
import { getJob, useStore } from '../lib/store'
import type { JobCustomField } from '../types'
import { toast } from './ui'

const LIVE = DATA_SOURCE === 'live'

type FieldDef = OpportunityField

const catOf = (d: FieldDef) => d.category || 'General'

function valueToString(v: string | number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v)
}

function renderFieldInput(
  f: FieldDef,
  value: string,
  set: (v: string) => void,
  idBase: string,
) {
  const id = `${idBase}-${f.id}`
  if (f.options && f.options.length > 0) {
    return (
      <select id={id} className="field" value={value} onChange={(e) => set(e.target.value)}>
        <option value="">Not set</option>
        {f.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (f.dataType === 'DATE' || f.dataType === 'date') {
    return (
      <input
        id={id}
        type="date"
        className="field"
        value={value.length === 10 ? value : ''}
        onChange={(e) => set(e.target.value)}
      />
    )
  }
  if (f.dataType === 'NUMBER' || f.dataType === 'number' || f.dataType === 'CURRENCY' || f.dataType === 'currency') {
    return (
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className="field"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    )
  }
  return <input id={id} className="field" value={value} onChange={(e) => set(e.target.value)} />
}

const chipOn = 'inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold border-navy bg-navy text-white'
const chipOff = 'inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold border-soft text-muted hover:border-ink hover:text-ink'

/** `only`: show just these custom fields (`cf:<key>` ids), flat and in that order. Absent = every field, grouped. */
export function JobFieldsEditor({ jobId, embedded, only }: { jobId: string; embedded?: boolean; only?: string[] }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [editing, setEditing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [defs, setDefs] = useState<FieldDef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [visibleCats, setVisibleCats] = useState<Set<string>>(new Set())
  const formId = useId()

  useEffect(() => {
    if (!LIVE) return
    setLoading(true)
    setError('')
    opportunityFieldsApi
      .list()
      .then((res) => {
        const fields = res?.fields || []
        setDefs(fields)
        const current = new Map((job?.customFields ?? []).map((f) => [f.id, valueToString(f.value)]))
        const next: Record<string, string> = {}
        for (const d of fields) next[d.id] = current.get(d.id) ?? ''
        setValues(next)
      })
      .catch(() => setError('Could not load job fields.'))
      .finally(() => setLoading(false))
  }, [jobId])

  if (!job) return null

  const chosen: FieldDef[] | undefined = only
    ? only.flatMap((id) => {
        const d = defs.find((x) => `cf:${x.key}` === id)
        return d ? [d] : []
      })
    : undefined
  const categories = chosen ? [] : Array.from(new Set(defs.map(catOf))).sort()
  const inScope = chosen ?? defs.filter((d) => visibleCats.size === 0 || visibleCats.has(catOf(d)))
  const hasValue = (d: FieldDef) => (values[d.id] ?? '').toString().trim() !== ''
  const filled = inScope.filter(hasValue)
  const emptyCount = inScope.length - filled.length
  // When not editing: if some fields are filled and user hasn't chosen showAll, show filled.
  // If no fields are filled yet, or if user toggles showAll, show all inScope fields with placeholders so fields are visible.
  const display = chosen || editing ? inScope : showAll ? inScope : filled.length > 0 ? filled : inScope

  const groupMap = new Map<string, FieldDef[]>()
  display.forEach((d) => {
    const c = chosen ? '' : catOf(d)
    if (!groupMap.has(c)) groupMap.set(c, [])
    groupMap.get(c)!.push(d)
  })
  const groups = chosen ? (display.length ? [['', display] as [string, FieldDef[]]] : []) : Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  const toggleCat = (c: string) => {
    setVisibleCats((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: JobCustomField[] = Object.entries(values).map(([id, value]) => {
      const d = defs.find((x) => x.id === id)
      return { id, name: d?.name ?? '', value }
    })
    const ok = await saveJobCustomFields(job.id, payload)
    setSaving(false)
    if (ok) {
      toast('Job fields saved')
      setEditing(false)
    } else {
      toast('Could not save fields. Please try again.')
    }
  }

  const handleCancel = () => {
    const current = new Map((job?.customFields ?? []).map((f) => [f.id, valueToString(f.value)]))
    const next: Record<string, string> = {}
    for (const d of defs) next[d.id] = current.get(d.id) ?? ''
    setValues(next)
    setEditing(false)
  }

  return (
    <div className={embedded ? 'space-y-3' : 'card stack'}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soft pb-2">
        <div>
          <h2 id="ov-fields" className={embedded ? 't-small font-bold uppercase tracking-wide text-ink' : 't-section'}>
            Job fields
          </h2>
          <p className="t-tiny text-muted">
            {LIVE ? `${defs.length} custom fields configured for this job` : 'Demo data mode'}
          </p>
        </div>
        {LIVE && defs.length > 0 && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn btn-neutral inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1 text-sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X size={14} aria-hidden="true" />
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1 text-sm"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} aria-hidden="true" />}
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-tint inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1 text-sm font-semibold text-navy"
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} aria-hidden="true" />
                Edit fields
              </button>
            )}
          </div>
        )}
      </div>

      {!LIVE ? (
        <p className="t-body text-muted">Job fields come from the CRM in live mode.</p>
      ) : loading ? (
        <div className="flex items-center gap-2 py-4 text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="t-small">Loading fields...</span>
        </div>
      ) : error ? (
        <p className="t-small text-red-600">{error}</p>
      ) : defs.length === 0 ? (
        <p className="t-body text-muted">No job fields are defined in the CRM.</p>
      ) : (
        <div className="space-y-4">
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter fields by category">
              <button
                type="button"
                className={visibleCats.size === 0 ? chipOn : chipOff}
                onClick={() => setVisibleCats(new Set())}
              >
                All
              </button>
              {categories.map((c) => {
                const on = visibleCats.has(c)
                return (
                  <button
                    key={c}
                    type="button"
                    className={on ? chipOn : chipOff}
                    aria-pressed={on}
                    onClick={() => toggleCat(c)}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          )}

          {groups.length === 0 ? (
            <p className="t-small text-muted">No fields to show in the selected categories.</p>
          ) : editing ? (
            <div className="space-y-4">
              {groups.map(([cat, fields]) => (
                <div key={cat} className="space-y-2">
                  {cat && <p className="t-tiny font-bold uppercase tracking-wide text-muted">{cat}</p>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fields.map((d) => (
                      <div key={d.id} className="space-y-1">
                        <label className="t-tiny font-bold text-ink" htmlFor={`${formId}-${d.id}`}>
                          {d.name}
                        </label>
                        {renderFieldInput(d, values[d.id] ?? '', (v) => setValues((prev) => ({ ...prev, [d.id]: v })), formId)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(([cat, fields]) => (
                <div key={cat} className="space-y-2">
                  {cat && <p className="t-tiny font-bold uppercase tracking-wide text-muted">{cat}</p>}
                  <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {fields.map((d) => {
                      const val = values[d.id]
                      return (
                        <div key={d.id} className="border-b border-soft/50 pb-1.5">
                          <dt className="t-tiny font-medium text-muted">{d.name}</dt>
                          <dd className="t-small break-words font-semibold text-ink">
                            {val || <span className="font-normal text-muted/60">-</span>}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              ))}
              {!chosen && emptyCount > 0 && filled.length > 0 && !showAll && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-navy hover:underline"
                  onClick={() => setShowAll(true)}
                >
                  <ChevronDown size={14} /> Show all {inScope.length} fields ({emptyCount} empty)
                </button>
              )}
              {!chosen && showAll && emptyCount > 0 && filled.length > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-navy hover:underline"
                  onClick={() => setShowAll(false)}
                >
                  <ChevronUp size={14} /> Show filled only ({filled.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default JobFieldsEditor