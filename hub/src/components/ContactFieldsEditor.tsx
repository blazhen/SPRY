import { useEffect, useId, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DATA_SOURCE } from '../config'
import { contactFieldsApi, type ContactField } from '../lib/api'
import { saveContactCustomFields } from '../lib/customFields'
import { getContact, useStore } from '../lib/store'
import { toast } from './ui'

const LIVE = DATA_SOURCE === 'live'

type FieldDef = ContactField

const catOf = (d: FieldDef) => d.category || 'General'

function valueToString(v: string | number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v)
}

function renderFieldInput(f: FieldDef, value: string, set: (v: string) => void, idBase: string) {
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
    return <input id={id} type="date" className="field" value={value.length === 10 ? value : ''} onChange={(e) => set(e.target.value)} />
  }
  if (f.dataType === 'NUMBER' || f.dataType === 'number' || f.dataType === 'CURRENCY' || f.dataType === 'currency') {
    return <input id={id} type="number" inputMode="decimal" className="field" value={value} onChange={(e) => set(e.target.value)} />
  }
  return <input id={id} className="field" value={value} onChange={(e) => set(e.target.value)} />
}

const chipOn = 'inline-flex min-h-[44px] items-center rounded-full border px-4 py-1 text-base font-semibold border-navy bg-navy text-white'
const chipOff = 'inline-flex min-h-[44px] items-center rounded-full border px-4 py-1 text-base font-semibold border-soft text-muted hover:border-ink hover:text-ink'

/** Live only. The fields are always open for typing; a change shows "Not saved yet" with Save and Cancel. */
/** `only`: show just these custom fields (`cf:<key>` ids), flat and in that order. Absent = every field, grouped. */
export function ContactFieldsEditor({ contactId, embedded, only }: { contactId: string; embedded?: boolean; only?: string[] }) {
  const s = useStore()
  const contact = getContact(contactId, s)
  const [defs, setDefs] = useState<FieldDef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [visibleCats, setVisibleCats] = useState<Set<string>>(new Set())
  const formId = useId()

  // The saved values, as the CRM last gave them.
  const savedValues = (): Record<string, string> => {
    const current = new Map((contact?.customFields ?? []).map((f) => [f.id, valueToString(f.value)]))
    const next: Record<string, string> = {}
    for (const d of defs) next[d.id] = current.get(d.id) ?? ''
    return next
  }

  useEffect(() => {
    if (!LIVE) return
    setLoading(true)
    setError('')
    contactFieldsApi
      .list()
      .then((fields) => {
        setDefs(fields || [])
        const current = new Map((contact?.customFields ?? []).map((f) => [f.id, valueToString(f.value)]))
        const next: Record<string, string> = {}
        for (const d of fields || []) next[d.id] = current.get(d.id) ?? ''
        setValues(next)
      })
      .catch(() => setError('Could not load contact fields.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId])

  if (!contact) return null

  const saved = savedValues()
  const dirty = defs.some((d) => (values[d.id] ?? '') !== (saved[d.id] ?? ''))
  const chosen: FieldDef[] | undefined = only
    ? only.flatMap((id) => {
        const d = defs.find((x) => `cf:${x.key}` === id)
        return d ? [d] : []
      })
    : undefined
  const categories = chosen ? [] : Array.from(new Set(defs.map(catOf))).sort()
  const inScope = chosen ?? defs.filter((d) => visibleCats.size === 0 || visibleCats.has(catOf(d)))

  const groupMap = new Map<string, FieldDef[]>()
  inScope.forEach((d) => {
    const c = chosen ? '' : catOf(d)
    if (!groupMap.has(c)) groupMap.set(c, [])
    groupMap.get(c)!.push(d)
  })
  const groups = Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

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
    // Every field is sent, including the ones that are now empty, so a cleared field is really cleared.
    const payload = defs.map((d) => ({ id: d.id, value: values[d.id] ?? '' }))
    const ok = await saveContactCustomFields(contact.id, payload)
    setSaving(false)
    if (ok) toast('Contact fields saved')
    else toast('Could not save fields. Please try again.')
  }

  return (
    <div className={embedded ? 'space-y-3' : 'card stack'}>
      <div className="border-b border-soft pb-2">
        <h3 className="t-small font-bold text-ink">Contact fields</h3>
        <p className="t-small text-muted">{LIVE ? `${defs.length} custom fields. Click one and type.` : 'Demo data mode'}</p>
      </div>

      {!LIVE ? (
        <p className="t-body text-muted">Contact custom fields come from the CRM in live mode.</p>
      ) : loading ? (
        <div className="flex items-center gap-2 py-4 text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="t-small">Loading fields...</span>
        </div>
      ) : error ? (
        <p className="t-small text-red-600">{error}</p>
      ) : defs.length === 0 ? (
        <p className="t-small text-muted">No custom fields defined in CRM for contacts.</p>
      ) : (
        <div className="space-y-4">
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter fields by category">
              <button type="button" className={visibleCats.size === 0 ? chipOn : chipOff} aria-pressed={visibleCats.size === 0} onClick={() => setVisibleCats(new Set())}>
                All
              </button>
              {categories.map((c) => {
                const on = visibleCats.has(c)
                return (
                  <button key={c} type="button" className={on ? chipOn : chipOff} aria-pressed={on} onClick={() => toggleCat(c)}>
                    {c}
                  </button>
                )
              })}
            </div>
          )}

          {groups.length === 0 ? (
            <p className="t-small text-muted">No fields to show in the selected categories.</p>
          ) : (
            <div className="space-y-4">
              {groups.map(([cat, fields]) => (
                <div key={cat} className="space-y-2">
                  {cat && <p className="t-small font-bold text-muted">{cat}</p>}
                  <div className="grid gap-3">
                    {fields.map((d) => {
                      const changed = (values[d.id] ?? '') !== (saved[d.id] ?? '')
                      return (
                        <div key={d.id}>
                          <label className="label" htmlFor={`${formId}-${d.id}`}>
                            {d.name}
                            {changed && <span className="ml-2 font-bold text-amber-ink">Not saved yet</span>}
                          </label>
                          {renderFieldInput(d, values[d.id] ?? '', (v) => setValues((prev) => ({ ...prev, [d.id]: v })), formId)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {dirty && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-ink bg-amber-wash p-3" role="group" aria-label="Unsaved contact fields">
              <span className="t-small font-bold text-amber-ink">Not saved yet</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                Save
              </button>
              <button type="button" className="btn btn-neutral btn-sm" onClick={() => setValues(savedValues())} disabled={saving}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ContactFieldsEditor
