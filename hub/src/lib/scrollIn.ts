/**
 * Scroll and focus helpers that move ONLY the panel an element lives in, never the page or the CRM frame around the Hub.
 * Element.scrollIntoView and a plain focus() also scroll every ancestor, including the page (and, inside an iframe, the parent
 * frame in some browsers). That is what made the page jump and stick. Use these instead.
 */

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p
  }
  return null
}

/** Brings `el` into view inside its nearest scrolling panel. 'start' puts it near the top, 'nearest' only moves when it is out of view. The page itself never moves. */
export function scrollWithin(el: HTMLElement | null | undefined, block: 'start' | 'nearest' = 'start', behavior: ScrollBehavior = 'auto', allowPage = false): void {
  if (!el) return
  const box = scrollParent(el)
  const a = el.getBoundingClientRect()
  if (!box) {
    // Only pages that scroll as a whole (lists, not the three-panel frames) pass allowPage. window.scrollTo moves this window only.
    if (allowPage && block === 'start') window.scrollTo({ top: Math.max(0, window.scrollY + a.top - 8), behavior })
    return
  }
  const b = box.getBoundingClientRect()
  const pad = 8
  let top = box.scrollTop
  if (block === 'start') top += a.top - b.top - pad
  else if (a.top < b.top + pad) top += a.top - b.top - pad
  else if (a.bottom > b.bottom - pad) top += a.bottom - b.bottom + pad
  else return
  box.scrollTo({ top: Math.max(0, top), behavior })
}

/** Focus without the browser scrolling any ancestor, then scroll only the panel so the element is visible. */
export function focusIn(el: HTMLElement | null | undefined, block: 'start' | 'nearest' = 'nearest'): void {
  if (!el) return
  el.focus({ preventScroll: true })
  scrollWithin(el, block)
}
