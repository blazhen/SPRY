import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { termsFontPx } from '../lib/format'
import type { Terms } from '../types'

/**
 * Terms. On screen they are 15px in a bordered box (max about 20rem tall) that scrolls,
 * with a visible label and a "Scroll for more" line when there is more to read.
 * The tiny shrink steps (5 to 8.5px) apply only when printing the sheet.
 */
const CSS = `
.terms-block .terms-text { font-size: 16px; line-height: 1.5; max-height: 20rem; overflow-y: auto; padding: 0.5rem 0.75rem; border: 2px solid rgb(var(--c-control, 112 126 154)); border-radius: 6px; }
.terms-block .terms-head { font-size: 16px; }
.terms-block .terms-more { font-size: 16px; font-weight: 700; }
@media print {
  .terms-block .terms-text { font-size: var(--terms-print-px); line-height: 1.35; max-height: none; overflow: visible; padding: 0; border: 0; }
  .terms-block .terms-head { font-size: var(--terms-print-head); }
  .terms-block .terms-screen-only { display: none; }
}
`

export default function TermsBlock({ terms }: { terms: Terms | undefined }) {
  const text = terms?.text.trim() ?? ''
  const boxRef = useRef<HTMLParagraphElement>(null)
  const [overflows, setOverflows] = useState(false)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [text])
  if (!text) return null
  const px = termsFontPx(text.length)
  const vars = { '--terms-print-px': `${px}px`, '--terms-print-head': `${Math.max(px + 1, 8)}px` } as CSSProperties
  return (
    <section className="terms-block mt-8 border-t rule pt-3" aria-label="Terms" style={vars}>
      <style>{CSS}</style>
      <h3 className="terms-head mb-1 font-bold text-muted">
        Terms and conditions<span className="terms-screen-only"> (scroll to read all)</span>
      </h3>
      <p ref={boxRef} className="terms-text whitespace-pre-line break-words text-muted" tabIndex={0}>
        {text}
      </p>
      {overflows && <p className="terms-more terms-screen-only mt-1 text-muted">Scroll for more</p>}
    </section>
  )
}
