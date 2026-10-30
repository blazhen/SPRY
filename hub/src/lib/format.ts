import { STAGE_ROLE } from '../config'
import { STAGES } from '../types'
import type { Job, JobWord, Settings, Stage } from '../types'

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
const moneyWhole = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export const fmtMoney = (n: number) => money.format(n)
export const fmtMoneyWhole = (n: number) => moneyWhole.format(n)

/** "21 Oct 2026" from an ISO date or timestamp. */
export function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local date as YYYY-MM-DD. */
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = () => toISODate(new Date())

/**
 * The local calendar day (YYYY-MM-DD) of an ISO timestamp or date. Timestamps are UTC
 * ("...Z"), so slice(0, 10) can be the wrong day; use this for every timestamp-to-day step.
 * A plain date (10 characters) is returned as is.
 */
export function localDay(iso: string): string {
  if (!iso) return ''
  if (iso.length === 10) return iso
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : toISODate(d)
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(localDay(iso) + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Whole days from an ISO date or timestamp to today (never negative). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const a = new Date(localDay(iso) + 'T00:00:00').getTime()
  const b = new Date(toISODate(now) + 'T00:00:00').getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`

export const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('en-AU', { maximumFractionDigits: 2 }))

/** Font size in px for terms text on the quote sheet: longer text prints smaller. Formatting is fixed, only the size follows the length. */
export const termsFontPx = (length: number) =>
  length > 2400 ? 5 : length > 1500 ? 5.5 : length > 900 ? 6.5 : length > 400 ? 7.5 : 8.5

// ---- How long a job has been in its stage ------------------------------------

export type StallLevel = 'ok' | 'slow' | 'stuck'

/**
 * Days in a stage before a job counts as slow and then stuck. null = never flagged.
 * PROPOSED limits: no client sign-off yet.
 */
export const STALL_LIMITS: Record<Stage, { slow: number; stuck: number } | null> = {
  'New Lead': { slow: 2, stuck: 5 },
  'Dial 1': { slow: 2, stuck: 4 },
  'Dial 2': { slow: 2, stuck: 4 },
  Quoting: { slow: 3, stuck: 7 },
  'Quote Sent': { slow: 5, stuck: 10 },
  'Follow-Up': { slow: 5, stuck: 10 },
  Nurture: null,
  'Quote Accepted': { slow: 3, stuck: 7 },
  'Inspection Required': { slow: 5, stuck: 10 },
  'Booking Required': { slow: 3, stuck: 7 },
  'Job Booked': null,
  'Deposit Requested': { slow: 5, stuck: 10 },
  'Job Completed': null,
  'Retention Claim': null,
}

/** One plain line per stage: what is going on, and who is waiting. (Wording proposed, not signed off.) */
export const STAGE_HELP: Record<Stage, string> = {
  'New Lead': 'A new enquiry, not yet contacted.',
  'Dial 1': 'First call attempt.',
  'Dial 2': 'Second call attempt.',
  Quoting: 'Assessment done, the quote is being prepared.',
  'Quote Sent': 'Waiting for the customer to reply.',
  'Follow-Up': 'Chasing the quote.',
  Nurture: 'Not ready yet, kept warm.',
  'Quote Accepted': 'The customer said yes. It needs booking.',
  'Inspection Required': 'An inspection has to happen before the job.',
  'Booking Required': 'The job needs a date in the diary.',
  'Job Booked': 'The job has a date.',
  'Deposit Requested': 'Waiting for the deposit.',
  'Job Completed': 'The work is done.',
  'Retention Claim': 'A retention payment is being claimed.',
}

// ---- Stage list and roles (live mode replaces the list from the CRM) -----------

let stageNames: string[] = [...STAGES]

/**
 * Live mode: replace the stage order and names with the pipeline's. Blank names are dropped;
 * an empty list changes nothing. Roles (STAGE_ROLE) are resolved by name against this list.
 */
export function setStages(names: string[]): void {
  const clean = names.map((n) => n.trim()).filter(Boolean)
  if (clean.length) stageNames = clean
}

/** The active stage names, in pipeline order. */
export const stageList = (): Stage[] => stageNames as Stage[]

/** Position of a stage in the active list, -1 when it is not in it. */
export const stageIndex = (stage: string): number => stageNames.findIndex((n) => n.toLowerCase() === stage.toLowerCase())

/** Position of a role's stage in the active list, -1 when the CRM has no stage with that name. */
export const roleIndex = (role: keyof typeof STAGE_ROLE): number => stageIndex(STAGE_ROLE[role])

/** The active stage name for a role, or undefined when it is missing (then no automation for that role). */
export const roleStage = (role: keyof typeof STAGE_ROLE): Stage | undefined => stageList()[roleIndex(role)]

/** True when the stage is the role's stage or later in the list. False when the role or the stage is missing. */
export const atOrAfterRole = (stage: string, role: keyof typeof STAGE_ROLE): boolean => {
  const r = roleIndex(role)
  const i = stageIndex(stage)
  return r >= 0 && i >= 0 && i >= r
}

/** True when the stage is strictly earlier than the role's stage. False when the role or the stage is missing. */
export const beforeRole = (stage: string, role: keyof typeof STAGE_ROLE): boolean => {
  const r = roleIndex(role)
  const i = stageIndex(stage)
  return r >= 0 && i >= 0 && i < r
}

/** One line per role the CRM list lacks. Empty when all is well. */
export const stageWarnings = (): string[] =>
  (Object.keys(STAGE_ROLE) as (keyof typeof STAGE_ROLE)[]).filter((r) => roleIndex(r) < 0).map((r) => `Stage "${STAGE_ROLE[r]}" not found in the CRM, so the ${r} automation is off.`)

export type StallLimit = { slow: number; stuck: number } | null
type StoredLimits = NonNullable<Settings['stallLimits']>

/** The saved limits, set by the store whenever settings load or change (like the job word). */
let currentLimits: StoredLimits = {}

export const setCurrentStallLimits = (l: Settings['stallLimits']) => {
  currentLimits = l ?? {}
}

/** The limit for a stage: the saved one if there is one, else the built-in default. null = never flagged. */
export function stallLimitFor(stage: string, s?: { settings: Settings }): StallLimit {
  const saved = (s ? s.settings.stallLimits : currentLimits) as Record<string, { slow: number | null; stuck: number | null } | undefined> | undefined
  const own = saved?.[stage]
  if (own) return own.slow === null || own.stuck === null ? null : { slow: own.slow, stuck: own.stuck }
  return (STALL_LIMITS as Record<string, StallLimit>)[stage] ?? null
}

/** Plain message when a pair of limits is not allowed, else ''. Both null (never flagged) is allowed. */
export function stallLimitProblem(l: { slow: number | null; stuck: number | null }): string {
  if (l.slow === null && l.stuck === null) return ''
  if (l.slow === null || l.stuck === null) return 'Enter both days, or switch the stage off.'
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= 365
  if (!ok(l.slow)) return 'Slow after must be a whole number of days from 1 to 365.'
  if (!ok(l.stuck)) return 'Stuck after must be a whole number of days from 1 to 365.'
  if (l.stuck <= l.slow) return 'Stuck after must be more days than Slow after.'
  return ''
}

/** How long the job has been in its stage, and whether that is too long. Closed (won or lost) jobs are never flagged. */
export function stall(job: Pick<Job, 'stage' | 'stageSince'> & { status?: Job['status'] }, now: Date = new Date()): { days: number; level: StallLevel; label: string } {
  const days = daysSince(job.stageSince, now)
  const lim = job.status && job.status !== 'open' ? null : stallLimitFor(job.stage)
  const level: StallLevel = !lim ? 'ok' : days >= lim.stuck ? 'stuck' : days >= lim.slow ? 'slow' : 'ok'
  const label = days === 0 ? 'Here since today' : days === 1 ? '1 day here' : `${days} days here`
  return { days, level, label }
}

// ---- The job word (Job, Project or Deal) ------------------------------------

let currentWord: JobWord = 'Job'

/** Called by the store when settings load or change. Screens re-render on store changes. */
export const setCurrentWord = (w: JobWord) => {
  currentWord = w
}

/** The job word: word() "Job", word(true) "Jobs", word(false, true) "job", word(true, true) "jobs". */
export const word = (plural = false, lower = false): string => {
  const s = plural ? currentWord + 's' : currentWord
  return lower ? s.toLowerCase() : s
}

/** Replaces %J (Job), %Js (Jobs), %j (job) and %js (jobs) in a string with the current word. */
export const jobText = (s: string) =>
  s
    .replace(/%Js/g, word(true))
    .replace(/%js/g, word(true, true))
    .replace(/%J/g, word())
    .replace(/%j/g, word(false, true))
