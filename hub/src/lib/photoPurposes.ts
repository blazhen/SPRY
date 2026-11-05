/**
 * Site photos: the purposes, and WHERE EACH PURPOSE GOES. This is the one list to edit. The camera screen, the gallery,
 * the plain-words line shown before saving, the certificate, the day sheet and Job costing all read it.
 * Purpose ids are stored on every photo, so never rename an id; change the label, words and routes freely.
 */

/** Places a photo can go. */
export type PhotoRoute = 'job' | 'quote' | 'installPack' | 'certificate' | 'costing' | 'task'

export type PhotoPurposeId = 'inspection' | 'before' | 'during' | 'after' | 'damage' | 'materials' | 'other'

export interface PhotoPurposeDef {
  id: PhotoPurposeId
  label: string
  /** One short line under the button on the first screen. */
  hint: string
  /** Where these photos go. 'job' is always there. */
  routes: PhotoRoute[]
  /** The sentence shown before saving. Plain words. */
  plain: string
  /** Roof, Wall and so on can be chosen. */
  subLabels: boolean
}

export const PHOTO_PURPOSES: PhotoPurposeDef[] = [
  { id: 'inspection', label: 'Inspection', hint: 'Before quoting: what the job looks like', routes: ['job', 'quote'], plain: 'These will go on the job, and you can show them to the customer on the quote.', subLabels: true },
  { id: 'before', label: 'Before', hint: 'The area before any work starts', routes: ['job', 'installPack'], plain: 'These will go on the job and in the install day pack.', subLabels: true },
  { id: 'during', label: 'During', hint: 'The work in progress', routes: ['job'], plain: 'These will go on the job.', subLabels: true },
  { id: 'after', label: 'After (completed)', hint: 'The finished work', routes: ['job', 'certificate'], plain: 'These will go on the job and on the completion certificate.', subLabels: true },
  { id: 'damage', label: 'Damage or problem', hint: 'Something wrong that needs a look', routes: ['job', 'task'], plain: 'These will go on the job, and the owner can get a task to review them.', subLabels: true },
  { id: 'materials', label: 'Materials or receipt', hint: 'Deliveries, drums, receipts', routes: ['job', 'costing'], plain: 'These will go on the job and in the Job costing documents.', subLabels: false },
  { id: 'other', label: 'Other', hint: 'Anything else', routes: ['job'], plain: 'These will stay on the job.', subLabels: false },
]

export const PHOTO_SUBS = ['Roof', 'Wall', 'Ceiling', 'Subfloor', 'Other'] as const

/** The title of the task made for Damage or problem photos. */
export const REVIEW_TASK_TITLE = 'Review problem photos'

export const purposeDef = (id: string | undefined): PhotoPurposeDef => PHOTO_PURPOSES.find((p) => p.id === id) ?? PHOTO_PURPOSES[PHOTO_PURPOSES.length - 1]
export const isPurpose = (x: unknown): x is PhotoPurposeId => PHOTO_PURPOSES.some((p) => p.id === x)
export const routesTo = (id: string | undefined, route: PhotoRoute): boolean => purposeDef(id).routes.includes(route)

/** What the server keeps on a photo row (server/lib/photos.ts has the same shape). */
export interface PhotoMeta {
  purpose: PhotoPurposeId
  sub: string
  caption: string
  takenAt: string
  takenBy: string
  width: number
  height: number
  onQuote: boolean
  geo?: { lat: number; lng: number; acc: number }
}
