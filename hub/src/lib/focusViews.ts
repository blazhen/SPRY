import type { BoxId } from './jobLayout'

/**
 * A rail item is a FOCUS VIEW of the whole workspace: the left panel stays, the middle panel shows the boxes below, and
 * the right panel shows its own boxes or the usual sections. One definition per box, so it follows Edit layout and the
 * rail editor (any rail item that points at a box opens that box's view). Address: #/jobs/<id>/<box>.
 */
export interface FocusView {
  /** Boxes drawn in the middle panel, in order. */
  middle: BoxId[]
  /** Boxes drawn in the right panel, or 'sections' for the usual right panel. */
  right: BoxId[] | 'sections'
}

const FOCUS: Partial<Record<BoxId, FocusView>> = {
  notes: { middle: ['addNote', 'notesAll'], right: ['pinned'] },
  addNote: { middle: ['addNote', 'notesAll'], right: ['pinned'] },
  notesAll: { middle: ['addNote', 'notesAll'], right: ['pinned'] },
  pinned: { middle: ['addNote', 'notesAll'], right: ['pinned'] },
  tasks: { middle: ['addTask', 'tasks'], right: ['next'] },
  addTask: { middle: ['addTask', 'tasks'], right: ['next'] },
  quotes: { middle: ['quotes'], right: ['quotePreview'] },
  quotePreview: { middle: ['quotes'], right: ['quotePreview'] },
  invoices: { middle: ['invoices'], right: ['money'] },
  payments: { middle: ['payments'], right: ['money'] },
  people: { middle: ['people'], right: ['contact'] },
  documents: { middle: ['documents'], right: 'sections' },
  texts: { middle: ['addText', 'texts'], right: 'sections' },
  addText: { middle: ['addText', 'texts'], right: 'sections' },
  emails: { middle: ['addEmail', 'emails'], right: 'sections' },
  addEmail: { middle: ['addEmail', 'emails'], right: 'sections' },
  calls: { middle: ['calls'], right: 'sections' },
  history: { middle: ['notes', 'history'], right: 'sections' },
}

/** Any other box (job costing, money summary, next action, other jobs, access notes, recent files, map, library boxes...): that box full size in the middle, the usual sections on the right. */
export const focusFor = (box: BoxId): FocusView => FOCUS[box] ?? { middle: [box], right: 'sections' }
