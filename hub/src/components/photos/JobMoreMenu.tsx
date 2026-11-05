import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Award, MoreHorizontal } from 'lucide-react'
import { openCertificate } from './CertificateDialog'
import './photos.css'

/** The job header's More menu: things you do now and then on a finished job. Escape and a click outside close it. */
export function JobMoreMenu({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState(0)
  const id = useId()
  // The menu is right-aligned to its button; on a phone that can run off either edge, so nudge it back inside the screen.
  useLayoutEffect(() => {
    if (!open || !popRef.current) return
    const r = popRef.current.getBoundingClientRect()
    const base = r.left - shift
    const room = document.documentElement.clientWidth
    setShift(base < 8 ? 8 - base : base + r.width > room - 8 ? room - 8 - (base + r.width) : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        btn.current?.focus()
      }
    }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key, true)
    }
  }, [open])
  return (
    <div ref={wrap} className="ph-more">
      <button ref={btn} type="button" className="btn btn-neutral" data-job-more aria-haspopup="true" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={20} aria-hidden="true" />
        More
      </button>
      {open && (
        <div ref={popRef} id={id} className="ph-more-pop" data-job-more-pop style={shift ? { transform: `translateX(${shift}px)` } : undefined}>
          <button
            type="button"
            className="ph-more-item"
            data-more-certificate
            onClick={() => {
              setOpen(false)
              openCertificate(jobId)
            }}
          >
            <Award size={18} aria-hidden="true" />
            Make the warranty certificate
          </button>
        </div>
      )}
    </div>
  )
}
