import type { Contact, Job } from '../types'
import { getCompany, getContact, getState, type State } from './store'

/**
 * Two people from the same company on one job is the biggest source of mix-ups (who asked, who the quote is for, who
 * pays). These helpers find them so the screens can warn and link to each person.
 */

const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, ' ')

/** The company a person belongs to, as a comparable name ('' when unknown). */
export function companyNameOf(c: Contact, s?: State): string {
  const fromId = c.companyId ? getCompany(c.companyId, s)?.name : ''
  return norm(fromId || c.companyName || '')
}

/** What to call the company on screen. */
export function companyLabel(c: Contact, s?: State): string {
  return (c.companyId ? getCompany(c.companyId, s)?.name : '') || c.companyName || ''
}

export interface SameCompanyGroup {
  company: string
  people: Contact[]
}

/** Groups of two or more people on the job who share a company. */
export function sameCompanyOnJob(job: Job, s?: State): SameCompanyGroup[] {
  const groups = new Map<string, SameCompanyGroup>()
  for (const p of job.participants) {
    if (p.kind !== 'contact') continue
    const c = getContact(p.id, s)
    if (!c) continue
    const key = companyNameOf(c, s)
    if (!key) continue
    const g = groups.get(key) ?? { company: companyLabel(c, s), people: [] }
    g.people.push(c)
    groups.set(key, g)
  }
  return [...groups.values()].filter((g) => g.people.length > 1)
}

/** People already on the job who work at the same company as this person. */
export function sameCompanyAs(candidate: Contact, job: Job, s?: State): Contact[] {
  const key = companyNameOf(candidate, s)
  if (!key) return []
  return job.participants
    .filter((p) => p.kind === 'contact' && p.id !== candidate.id)
    .map((p) => getContact(p.id, s))
    .filter((c): c is Contact => !!c && companyNameOf(c, s) === key)
}

/** Jobs that someone else from this person's company is already on (so a new job may be the same work). */
export function jobsOfSameCompany(candidate: Contact, s: State = getState()): { job: Job; who: Contact }[] {
  if (!companyNameOf(candidate, s)) return []
  const out: { job: Job; who: Contact }[] = []
  for (const job of s.jobs) {
    const who = sameCompanyAs(candidate, job, s)[0]
    if (who) out.push({ job, who })
  }
  return out
}
