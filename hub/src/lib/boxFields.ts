import { useEffect, useState } from 'react'
import { DATA_SOURCE } from '../config'
import { contactFieldsApi, opportunityFieldsApi } from './api'

/**
 * The fields the Job, Contact and Company boxes can show. A saved list of ids (BoxState.fields) picks which and in what
 * order; absent means every field. Custom CRM fields have the id `cf:<key>` and exist in live mode only.
 */
export interface FieldDef {
  id: string
  label: string
  /** 'key' is what shows first; 'more' sits behind "More". */
  tier: 'key' | 'more'
  custom?: boolean
}

export type FieldBox = 'job' | 'contact' | 'company'

export const JOB_FIELDS: FieldDef[] = [
  { id: 'address', label: 'Job site address', tier: 'key' },
  { id: 'notes', label: 'Job notes', tier: 'key' },
  { id: 'name', label: 'Job name', tier: 'more' },
  { id: 'stage', label: 'Stage', tier: 'more' },
  { id: 'value', label: 'Job value', tier: 'more' },
  { id: 'owner', label: 'Looked after by', tier: 'more' },
  { id: 'kind', label: 'Kind of job', tier: 'more' },
  { id: 'source', label: 'Where it came from', tier: 'more' },
  { id: 'business', label: 'Business name', tier: 'more' },
]

export const CONTACT_FIELDS: FieldDef[] = [
  { id: 'name', label: 'Name', tier: 'key' },
  { id: 'phone', label: 'Phone', tier: 'key' },
  { id: 'email', label: 'Email', tier: 'key' },
  { id: 'actions', label: 'Call, email and open buttons', tier: 'key' },
  { id: 'mobile', label: 'Mobile', tier: 'more' },
  { id: 'address', label: 'Home or office address', tier: 'more' },
  { id: 'note', label: 'Private note', tier: 'more' },
]

export const COMPANY_FIELDS: FieldDef[] = [
  { id: 'name', label: 'Company name', tier: 'key' },
  { id: 'phone', label: 'Phone', tier: 'key' },
  { id: 'email', label: 'Email', tier: 'key' },
  { id: 'address', label: 'Address', tier: 'key' },
  { id: 'attn', label: 'Who quotes go to', tier: 'key' },
]

const STATIC: Record<FieldBox, FieldDef[]> = { job: JOB_FIELDS, contact: CONTACT_FIELDS, company: COMPANY_FIELDS }

const LIVE = DATA_SOURCE === 'live'

// One load per box for the whole page: the definitions rarely change and every box on the page asks.
const cache: Partial<Record<FieldBox, FieldDef[]>> = {}
const pending: Partial<Record<FieldBox, Promise<FieldDef[]>>> = {}

function loadCustom(box: 'job' | 'contact'): Promise<FieldDef[]> {
  const hit = cache[box]
  if (hit) return Promise.resolve(hit)
  const inflight = pending[box]
  if (inflight) return inflight
  const toDefs = (rows: { key: string; name: string }[]): FieldDef[] =>
    rows.map((f) => ({ id: `cf:${f.key}`, label: f.name || f.key, tier: 'more' as const, custom: true }))
  const p = (box === 'job' ? opportunityFieldsApi.list().then((r) => toDefs(r?.fields ?? [])) : contactFieldsApi.list().then((r) => toDefs(r ?? [])))
    .then((defs) => {
      cache[box] = defs
      return defs
    })
    .finally(() => {
      delete pending[box]
    })
  pending[box] = p
  return p
}

/** The static fields, plus (live mode, Job and Contact) the CRM custom fields once loaded. */
export function useFieldCatalog(box: FieldBox): { fields: FieldDef[]; loading: boolean } {
  const wantsCustom = LIVE && box !== 'company'
  const [custom, setCustom] = useState<FieldDef[]>(() => (wantsCustom ? cache[box as 'job' | 'contact'] ?? [] : []))
  const [loading, setLoading] = useState(() => wantsCustom && !cache[box as 'job' | 'contact'])

  useEffect(() => {
    if (!wantsCustom) return
    let live = true
    setLoading(!cache[box as 'job' | 'contact'])
    loadCustom(box as 'job' | 'contact')
      .then((defs) => {
        if (live) setCustom(defs)
      })
      .catch(() => {
        if (live) setCustom([])
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [box, wantsCustom])

  return { fields: custom.length ? [...STATIC[box], ...custom] : STATIC[box], loading }
}

/** The static field ids in catalog order (the box default before custom fields have loaded). */
export function defaultFieldIds(box: FieldBox): string[] {
  return STATIC[box].map((f) => f.id)
}

/** The fields to draw: the saved order filtered to the catalog (unknown ids dropped), or the whole catalog when nothing is saved. */
export function resolveFields(_box: FieldBox, saved: string[] | undefined, catalog: FieldDef[]): FieldDef[] {
  if (!saved) return catalog
  const byId = new Map(catalog.map((f) => [f.id, f]))
  const seen = new Set<string>()
  const out: FieldDef[] = []
  for (const id of saved) {
    const f = byId.get(id)
    if (f && !seen.has(id)) {
      seen.add(id)
      out.push(f)
    }
  }
  return out
}
