import { useSyncExternalStore } from 'react'

/**
 * Live mode: a change that the server refused or could not take is undone on screen, and this holds a
 * plain message for the top bar and the notice under it. It clears itself after a while or when dismissed.
 */
const SHOW_MS = 15000
let message = ''
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function reportWriteError(text: string) {
  message = text
  clearTimeout(timer)
  timer = setTimeout(clearWriteError, SHOW_MS)
  emit()
}

export function clearWriteError() {
  clearTimeout(timer)
  if (!message) return
  message = ''
  emit()
}

export const useWriteError = (): string => useSyncExternalStore(subscribe, () => message)
