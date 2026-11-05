// The width the live layout editor is previewing (0 = the real window). A few parts choose their layout in JavaScript from the window
// width (the stage steps drop names on a phone); while a preview is on they follow this width instead.
import { useSyncExternalStore } from 'react'

let width = 0
const subs = new Set<() => void>()
export function setPreviewWidth(w: number) {
  if (w === width) return
  width = w
  subs.forEach((f) => f())
}
export function usePreviewWidth(): number {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => width,
    () => 0,
  )
}
