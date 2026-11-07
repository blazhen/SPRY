// Print only the quote or invoice sheet. The job workspace has panels, rails and menus around the sheet, and printing the
// whole page puts all of them on the paper. So the visible sheet is copied into #print-root, the rest of the page is hidden
// for printing (see styles.css), and the copy is removed afterwards.
const SHEET = 'article.sheet'

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
  let root = document.getElementById('print-root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'print-root'
    document.body.appendChild(root)
  }
  root.replaceChildren(sheet.cloneNode(true))
  const html = document.documentElement
  html.classList.add('printing-sheet')
  const done = () => {
    html.classList.remove('printing-sheet')
    root?.replaceChildren()
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}
