import { useEffect, useId, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { boxDef, settingOf, type BoxId, type BoxState } from '../../lib/jobLayout'

/** The gear of a box card in Edit layout: choose what is inside the box (what it offers or lists). */
export function BoxSettings({ box, state, onChange }: { box: BoxId; state: BoxState; onChange: (settings: Record<string, string[] | string> | undefined) => void }) {
  const def = boxDef(box)
  const [open, setOpen] = useState(false)
  const uid = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const wrap = useRef<HTMLSpanElement>(null)
  const pop = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!def.settings) return null
  const close = () => {
    setOpen(false)
    btn.current?.focus()
  }
  const save = (name: string, value: string[] | string) => {
    onChange({ ...(state.settings ?? {}), [name]: value })
    window.requestAnimationFrame(() => pop.current?.focus({ preventScroll: true }))
  }

  return (
    <span className="le-pick" ref={wrap}>
      <button ref={btn} type="button" className="le-btn" data-le-btn={`${box}:settings`} aria-label={`Settings for ${def.label}`} title="Settings" aria-expanded={open} aria-haspopup="true" aria-controls={open ? `${uid}-p` : undefined} onClick={() => setOpen((o) => !o)}>
        <Settings2 size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${uid}-p`}
          ref={pop}
          tabIndex={-1}
          className="le-pop"
          role="group"
          aria-label={`Settings for ${def.label}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              close()
            }
          }}
        >
          <p className="le-pop-head">{def.label}</p>
          {def.settings.map((s) => {
            const value = settingOf(state, box, s.name)
            if (s.type === 'multi') {
              const on = Array.isArray(value) ? value : s.default
              return (
                <fieldset key={s.name} className="le-set">
                  <legend className="le-pop-sub">{s.label}</legend>
                  {s.options.map((o) => (
                    <label key={o.id} className="le-pop-label">
                      <input
                        type="checkbox"
                        className="check"
                        checked={on.includes(o.id)}
                        disabled={on.includes(o.id) && on.length === 1}
                        onChange={(e) => save(s.name, e.target.checked ? s.options.map((x) => x.id).filter((id) => on.includes(id) || id === o.id) : on.filter((id) => id !== o.id))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </fieldset>
              )
            }
            return (
              <label key={s.name} className="le-set le-opt">
                <span className="le-pop-sub">{s.label}</span>
                <select className="field" value={String(value)} onChange={(e) => save(s.name, e.target.value)}>
                  {s.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
          <div className="le-pop-actions">
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => onChange(undefined)} disabled={!state.settings}>
              Back to the default
            </button>
            <button type="button" className="btn btn-primary btn-sm is-primary-here" onClick={close}>
              Close
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
