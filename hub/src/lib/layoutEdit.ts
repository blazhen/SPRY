import { useSyncExternalStore } from 'react'

/** Whether the job page is in Edit layout mode. A tiny shared switch: the rail, Customise and the page all read it. */
let editing = false
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setEditingLayout(on: boolean) {
  if (editing === on) return
  editing = on
  listeners.forEach((l) => l())
}

export const useEditingLayout = (): boolean => useSyncExternalStore(subscribe, () => editing, () => false)
