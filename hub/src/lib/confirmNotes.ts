/**
 * WHAT HAPPENS: the one place for the text in the confirm dialogs (Round 10): exactly what an action starts in the CRM,
 * as designed. The text is data, not code: one JSON file per group in src/lib/confirm-notes/ (stages-1, stages-2, stages-3,
 * actions). Edit the words there. Each entry is
 *   { "sends": true|false, "lines": ["plain sentence", ...], "stops": ["what stops", ...], "sources": ["WF-10", "R-QUOTE-01"] }
 * `sends` is true when the customer (not the team) gets a text or an email: only then the dialog adds the Undo line.
 * `sources` are workflow and template ids; scripts/check-confirm-notes.mjs fails if one is missing from the CRM data file,
 * so the dialog and the documents cannot drift apart. HUB-DIALOG-TEXTS.md prints every dialog text (scripts/print-confirm-notes.mjs).
 * Keys: a stage name ("Quote Sent"), "Won", "Lost", an action key from lib/confirmActions.ts ("send-quote"),
 * or a tag: "tag-add:<tag>", "tag-remove:<tag>", with "tag-add:*" and "tag-remove:*" for any other tag.
 */
export interface Note {
  sends: boolean
  lines: string[]
  stops: string[]
  sources: string[]
}

/** The only line shown under a list, and only when `sends` is true. */
export const UNDO_LINE = 'Undo moves the job back, but cannot take back a message already sent.'

const files = import.meta.glob('./confirm-notes/*.json', { eager: true, import: 'default' }) as Record<string, Record<string, Note>>

/** Every entry from every file in src/lib/confirm-notes/. */
export const NOTES: Record<string, Note> = Object.assign({}, ...Object.values(files))

/** The note for a stage move, Won or Lost. Undefined when the stage has none (a stage added later): then no list is shown. */
export const noteForStage = (stage: string): Note | undefined => NOTES[stage]

/** The note for an action key, or for one tag (key 'tag-add' or 'tag-remove' with the tag name). */
export function noteForAction(key: string, tag?: string): Note | undefined {
  if (tag && (key === 'tag-add' || key === 'tag-remove')) return NOTES[`${key}:${tag}`] ?? NOTES[`${key}:*`]
  return NOTES[key]
}

/** Tags that are known to start automations (used to word the tag dialogs). Matched by prefix or exact name. */
export const AUTOMATION_TAGS = ['hub-', 'in-quote-queue', 'chase']
