import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

/**
 * ONE list of the actions that ask "Are you sure?" (Round 10), and the one switch that turns the asking off.
 * Only actions that are hard to take back belong here. Opening, editing, saving a note and a normal forward stage move
 * (which has its own Undo) never ask.
 * Two ways to ask, both through the same dialog (ConfirmDialog in components/ui.tsx):
 *  - a page that already keeps its own dialog state gives its ConfirmDialog an `action` key from this list;
 *  - everything else calls confirmAction(key, text, run) and the host in the Shell draws the dialog.
 * With the switch off ("Ask me to confirm" in Settings) every key here runs at once, no dialog.
 */
export type ConfirmKey =
  | 'delete-note' | 'delete-task' | 'delete-quote' | 'delete-invoice' | 'delete-file' | 'delete-link' | 'delete-contact' | 'delete-company' | 'delete-other'
  | 'task-done' | 'task-undone'
  | 'mark-won' | 'mark-lost' | 'stage-change' | 'stage-backward'
  | 'tag-add' | 'tag-remove' | 'job-value' | 'accept-quote'
  | 'void-invoice' | 'record-payment' | 'discard-revision'
  | 'send-quote' | 'send-invoice' | 'send-text' | 'send-email'
  | 'visit-book' | 'visit-move' | 'visit-cancel'

export const CONFIRM_ACTIONS: Record<ConfirmKey, { label: string; group: 'Delete' | 'Tasks' | 'Jobs' | 'Money' | 'Send' }> = {
  'delete-note': { label: 'Delete a note', group: 'Delete' },
  'delete-task': { label: 'Delete a task', group: 'Delete' },
  'delete-quote': { label: 'Delete a quote', group: 'Delete' },
  'delete-invoice': { label: 'Delete an invoice', group: 'Delete' },
  'delete-file': { label: 'Delete a file', group: 'Delete' },
  'delete-link': { label: 'Remove a link', group: 'Delete' },
  'delete-contact': { label: 'Delete a contact', group: 'Delete' },
  'delete-company': { label: 'Delete a company', group: 'Delete' },
  'delete-other': { label: 'Delete a template, terms text, price or other saved item', group: 'Delete' },
  'task-done': { label: 'Tick a task as done', group: 'Tasks' },
  'task-undone': { label: 'Untick a done task', group: 'Tasks' },
  'mark-won': { label: 'Mark a job won', group: 'Jobs' },
  'mark-lost': { label: 'Mark a job lost', group: 'Jobs' },
  'stage-change': { label: 'Move a job to another stage (any direction)', group: 'Jobs' },
  'stage-backward': { label: '(old key, use stage-change)', group: 'Jobs' },
  'tag-add': { label: 'Add a tag', group: 'Jobs' },
  'tag-remove': { label: 'Remove a tag', group: 'Jobs' },
  'job-value': { label: 'Change the job value', group: 'Jobs' },
  'accept-quote': { label: 'Mark a quote as accepted', group: 'Money' },
  'void-invoice': { label: 'Void an invoice', group: 'Money' },
  'record-payment': { label: 'Record a payment', group: 'Money' },
  'discard-revision': { label: 'Supersede or discard a quote revision', group: 'Money' },
  'send-quote': { label: 'Send a quote', group: 'Send' },
  'send-invoice': { label: 'Send an invoice', group: 'Send' },
  'send-text': { label: 'Send (log) a text', group: 'Send' },
  'send-email': { label: 'Send (log) an email', group: 'Send' },
  'visit-book': { label: 'Book a visit in the calendar', group: 'Jobs' },
  'visit-move': { label: 'Move a visit to another time', group: 'Jobs' },
  'visit-cancel': { label: 'Cancel a visit', group: 'Jobs' },
}

/* ---------- the switch, remembered per browser, on by default ---------- */
const KEY = 'hub.confirm.on.v1'
function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
let on = read()
const listeners = new Set<() => void>()

export const confirmEnabled = (): boolean => on
export function setConfirmEnabled(v: boolean): void {
  if (v === on) return
  on = v
  try {
    if (v) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, 'off')
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  listeners.forEach((f) => f())
}
export function useConfirmEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => on,
    () => true,
  )
}

/* ---------- ask from anywhere: the host in the Shell draws the dialog ---------- */
export interface ConfirmText {
  title: string
  body?: ReactNode
  confirmLabel: string
  tone?: 'normal' | 'danger'
}
export interface PendingConfirm extends ConfirmText {
  key: ConfirmKey
  run: () => void
}

let pending: PendingConfirm | null = null
const hostListeners = new Set<() => void>()
const emit = () => hostListeners.forEach((f) => f())

/** Ask first, then run. With the switch off, or no host mounted, it just runs. */
export function confirmAction(key: ConfirmKey, text: ConfirmText, run: () => void): void {
  if (!on || hostListeners.size === 0) {
    run()
    return
  }
  pending = { key, ...text, run }
  emit()
}
export const closeConfirm = (): void => {
  pending = null
  emit()
}
export function usePendingConfirm(): PendingConfirm | null {
  return useSyncExternalStore(
    (cb) => {
      hostListeners.add(cb)
      return () => hostListeners.delete(cb)
    },
    () => pending,
    () => null,
  )
}
