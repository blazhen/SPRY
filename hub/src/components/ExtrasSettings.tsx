import { useEffect, useId, useState } from 'react'
import { toast } from './ui'
import {
  DEFAULT_CHASE_DAYS,
  DEFAULT_LEAD_SOURCES,
  DEFAULT_LOST_REASONS,
  EXTRA_LIST,
  SEND_EXTRAS,
  chaseDaysProblem,
  isExtraOn,
  type ExtraKey,
} from '../lib/extras'
import { href } from '../lib/router'
import { updateExtras } from '../lib/store'
import { useExtraSettings } from '../lib/useExtras'
import { useStore } from '../lib/store'

/** A list of words, one per line, saved when you click away. */
function ListEditor({ label, hint, value, dflt, onSave }: { label: string; hint: string; value: string[]; dflt: string[]; onSave: (v: string[] | undefined) => void }) {
  const id = useId()
  const [text, setText] = useState(value.join('\n'))
  useEffect(() => setText(value.join('\n')), [value.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    const list = [...new Set(text.split('\n').map((x) => x.trim()).filter(Boolean))]
    if (list.join('\n') === value.join('\n')) return
    onSave(list.length === 0 || list.join('\n') === dflt.join('\n') ? undefined : list)
    toast(`${label} saved`)
  }
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} className="field" rows={Math.min(8, Math.max(3, value.length + 1))} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} aria-describedby={`${id}-h`} />
      <p id={`${id}-h`} className="hint">
        {hint}
      </p>
    </div>
  )
}

/** Settings, Extras. */
export function ExtrasSettings() {
  const s = useStore()
  const x = useExtraSettings()
  const [daysText, setDaysText] = useState(x.chaseDays.join(', '))
  const [daysErr, setDaysErr] = useState('')
  useEffect(() => setDaysText(x.chaseDays.join(', ')), [x.chaseDays.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (key: ExtraKey, on: boolean) => updateExtras({ on: { ...s.settings.extras?.on, [key]: on } })

  const saveDays = () => {
    const days = daysText.split(/[\s,]+/).filter(Boolean).map(Number)
    const problem = chaseDaysProblem(days)
    if (problem) {
      setDaysErr(problem)
      return
    }
    setDaysErr('')
    if (days.join(',') === x.chaseDays.join(',')) return
    updateExtras({ chaseDays: days.join(',') === DEFAULT_CHASE_DAYS.join(',') ? undefined : days })
    toast('Chase days saved')
  }

  return (
    <section className="stack-lg" aria-labelledby="extras-h" data-extras-settings>
      <div>
        <h2 id="extras-h" className="t-section">
          Extras
        </h2>
        <p className="t-body text-muted">Extra tools. Switch off the ones you do not want.</p>
      </div>

      <fieldset className="card stack" style={{ border: 0 }}>
        <legend className="t-small font-bold">Switches</legend>
        {EXTRA_LIST.map((e) => (
          <label key={e.key} className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={isExtraOn(s.settings.extras, e.key)} onChange={(ev) => flip(e.key, ev.target.checked)} />
            <span>
              <span className="block font-bold">{e.label}</span>
              <span className="block text-muted">{e.help}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="card stack" style={{ border: 0 }}>
        <legend className="t-small font-bold">Sending (off, not built)</legend>
        <p className="t-body text-muted">These would send a text or an email. They are written down as a plan only. The Hub sends nothing.</p>
        {SEND_EXTRAS.map((e) => (
          <label key={e.label} className="flex items-start gap-3 opacity-70">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={false} disabled readOnly />
            <span>
              <span className="block font-bold">{e.label}</span>
              <span className="block text-muted">{e.help}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="card stack">
        <h3 className="t-small font-bold">Quote chase days</h3>
        <label className="label" htmlFor="chase-days">
          Days after sending a quote when you chase it
        </label>
        <input
          id="chase-days"
          className="field"
          style={{ maxWidth: '16rem' }}
          value={daysText}
          aria-invalid={daysErr ? true : undefined}
          aria-describedby="chase-days-h"
          onChange={(e) => setDaysText(e.target.value)}
          onBlur={saveDays}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <p id="chase-days-h" className="hint">
          For example 2, 5, 10: the first chase is due 2 days after sending, the second at 5, the third at 10. Placeholder: these are the starting numbers, not Glenn's.
        </p>
        {daysErr && (
          <p className="err" role="alert">
            {daysErr}
          </p>
        )}
      </div>

      <div className="card">
        <a href={href.foam()} className="font-bold">
          Edit the foam prices
        </a>
      </div>

      <div className="card stack">
        <h3 className="t-small font-bold">Lists</h3>
        <ListEditor label="Lost reasons" hint="One per line. Asked when a job is marked lost." value={x.lostReasons} dflt={DEFAULT_LOST_REASONS} onSave={(v) => updateExtras({ lostReasons: v })} />
        <ListEditor label="Lead sources" hint="One per line. Where the enquiry came from." value={x.leadSources} dflt={DEFAULT_LEAD_SOURCES} onSave={(v) => updateExtras({ leadSources: v })} />
      </div>
    </section>
  )
}
