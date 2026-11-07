// Print only the quote or invoice sheet. The job workspace has panels, rails and menus around the sheet, and the Hub runs inside
// another page (the CRM), so hiding parts of the live page for printing is fragile. Instead the sheet is copied into a hidden
// frame of its own, with the same styles, and only that frame is printed. Nothing else on the page can reach the paper.
const SHEET = 'article.sheet'
const WAIT_MS = 4000
const CLEAN_MS = 120000

function visibleSheet(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(SHEET))
  return all.find((el) => el.getClientRects().length > 0) ?? all[0] ?? null
}

export function printSheet(): void {
  const sheet = visibleSheet()
  if (!sheet) {
    window.print() // no sheet on screen: fall back to the page's own print rules
    return
  }
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('tabindex', '-1')
  frame.setAttribute('data-print-frame', '')
  frame.title = 'Print'
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const win = frame.contentWindow
  const doc = frame.contentDocument
  if (!win || !doc) {
    frame.remove()
    window.print()
    return
  }
  const label = sheet.getAttribute('aria-label') || document.title
  doc.open()
  doc.write(`<!doctype html><html lang="${document.documentElement.lang || 'en'}"><head><meta charset="utf-8"><title></title></head><body></body></html>`)
  doc.close()
  doc.title = label
  doc.documentElement.className = document.documentElement.className
  doc.body.className = `${document.body.className} print-frame-body`.trim()
  const links: HTMLLinkElement[] = []
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
    const copy = doc.importNode(n, true) as HTMLLinkElement | HTMLStyleElement
    if (copy instanceof HTMLLinkElement) links.push(copy)
    doc.head.appendChild(copy)
  })
  doc.body.appendChild(doc.importNode(sheet, true))

  let cleaned = false
  const clean = () => {
    if (cleaned) return
    cleaned = true
    frame.remove()
  }
  const loaded = Promise.all(
    links.map((l) => new Promise<void>((resolve) => { l.addEventListener('load', () => resolve()); l.addEventListener('error', () => resolve()) })),
  )
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, WAIT_MS))
  void Promise.race([loaded, timeout]).then(async () => {
    try {
      await doc.fonts?.ready
    } catch {
      /* fonts are optional */
    }
    win.addEventListener('afterprint', clean)
    win.focus()
    win.print()
    setTimeout(clean, CLEAN_MS) // some browsers never send afterprint
  })
}
