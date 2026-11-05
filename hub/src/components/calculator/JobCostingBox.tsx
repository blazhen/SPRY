import { useId, useState } from 'react'
import { CheckCircle2, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Section } from '../job/Section'
import { CostingDocs } from '../photos/CostingDocs'
import { ConfirmDialog, Notice } from '../ui'
import { actualCosting, emptyActuals, labourCostPerHour, type ExtraCost, type FoamUsed, type JobActuals } from '../../lib/calcEngine'
import { getActuals, saveActuals, useActuals, useCalcItems } from '../../lib/calcItems'
import { jobCosting } from '../../lib/extras'
import { fmtMoney, uid } from '../../lib/format'
import { quoteTotals } from '../../lib/calc'
import { getJob, quotesForJob, useStore } from '../../lib/store'
import { useExtra, useExtraSettings } from '../../lib/useExtras'
import './jobCosting.css'

/** What the customer pays before GST: the accepted quote, else the newest sent one, else the job value. */
function quotedExGst(jobId: string, s: ReturnType<typeof useStore>): { amount: number; from: string } {
  const qs = quotesForJob(jobId, s).filter((q) => q.kind !== 'addon')
  const accepted = qs.filter((q) => q.status === 'Accepted').sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''))[0]
  if (accepted) return { amount: quoteTotals(accepted).subtotal, from: `accepted quote ${accepted.number}` }
  const sent = qs.filter((q) => q.status === 'Sent').sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? ''))[0]
  if (sent) return { amount: quoteTotals(sent).subtotal, from: `sent quote ${sent.number}` }
  return { amount: getJob(jobId, s)?.value ?? 0, from: 'the job value' }
}

/** The verdict for a job ("Made $1,200.00, 24.0%"), or undefined until real figures are in. For a list to show later. */
export function useJobMargin(jobId: string): string | undefined {
  const s = useStore()
  const recs = useActuals()
  const items = useCalcItems()
  const x = useExtraSettings()
  const a = recs.find((r) => r.id === jobId)
  return actualCosting(quotedExGst(jobId, s).amount, a, x.foam, items, fmtMoney)?.verdict
}

export function JobCostingSummary({ jobId }: { jobId: string }) {
  const v = useJobMargin(jobId)
  return v ? <span data-jc-summary>{v}</span> : null
}

/** A typed number: keeps its own text so "12." and an empty box work, saves each valid value at once. */
function parseNum(t: string): number | 'bad' {
  const c = t.replace(/[$,\s]/g, '')
  if (c === '') return 0
  const n = Number(c)
  return Number.isFinite(n) && n >= 0 ? n : 'bad'
}

function NumField({ label, value, onValue, allowEmpty = false, placeholder }: { label: string; value: number | undefined; onValue: (n: number | undefined) => void; allowEmpty?: boolean; placeholder?: string }) {
  const id = useId()
  const [text, setText] = useState(value ? String(value) : '')
  const [bad, setBad] = useState(false)
  return (
    <div className="jc-f">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        className="field"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? `${id}-e` : undefined}
        onChange={(e) => {
          const t = e.target.value
          setText(t)
          const n = parseNum(t)
          if (n === 'bad') return setBad(true)
          setBad(false)
          onValue(allowEmpty && t.trim() === '' ? undefined : n)
        }}
      />
      {bad && (
        <p id={`${id}-e`} className="err">
          Type a number like 12 or 12.5. No letters, no minus.
        </p>
      )}
    </div>
  )
}

function TextField({ label, value, onValue }: { label: string; value: string; onValue: (v: string) => void }) {
  const id = useId()
  return (
    <div className="jc-f">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} className="field" type="text" autoComplete="off" value={value} onChange={(e) => onValue(e.target.value)} />
    </div>
  )
}

type Ask = { kind: 'foam' | 'extra'; id: string; name: string }

export function JobCostingBox({ jobId }: { jobId: string }) {
  const on = useExtra('costing')
  const s = useStore()
  const recs = useActuals()
  const items = useCalcItems()
  const x = useExtraSettings()
  const [savedAt, setSavedAt] = useState(false)
  const [ask, setAsk] = useState<Ask | null>(null)
  const noteId = useId()
  const job = getJob(jobId, s)
  if (!on || !job) return null

  const rec = recs.find((r) => r.id === jobId)
  const a: JobActuals = rec ?? emptyActuals(jobId)
  const q = quotedExGst(jobId, s)
  const res = actualCosting(q.amount, rec, x.foam, items, fmtMoney)
  const rate = labourCostPerHour(a, items)
  const legacy = !rec && (job.actualCost || job.actualMaterials) ? jobCosting(q.amount, job.actualMaterials, job.actualCost) : null

  /** Always starts from the newest saved record, so quick typing in two boxes never loses a change. */
  const change = (fn: (cur: JobActuals) => JobActuals) => {
    saveActuals(fn(getActuals(jobId) ?? emptyActuals(jobId)))
    setSavedAt(true)
  }
  const setFoam = (id: string, p: Partial<FoamUsed>) => change((c) => ({ ...c, foams: c.foams.map((f) => (f.id === id ? { ...f, ...p } : f)) }))
  const setExtra = (id: string, p: Partial<ExtraCost>) => change((c) => ({ ...c, extras: c.extras.map((e) => (e.id === id ? { ...e, ...p } : e)) }))
  const confirmRemove = () => {
    if (!ask) return
    const { kind, id } = ask
    change((c) => (kind === 'foam' ? { ...c, foams: c.foams.filter((f) => f.id !== id) } : { ...c, extras: c.extras.filter((e) => e.id !== id) }))
    setAsk(null)
  }

  return (
    <Section id="job-costing-section" title="Job costing" summary={res ? res.verdict : 'No actual figures yet'}>
      <div className="jc" data-jc>
        {res && (
          <div className="jc-result stack">
            <Notice tone={res.profit >= 0 ? 'ok' : 'bad'}>
              <p className="jc-verdict" data-jc-verdict>
                {res.profit >= 0 ? <CheckCircle2 size={22} aria-hidden="true" /> : <TriangleAlert size={22} aria-hidden="true" />}
                <span>{res.verdict}</span>
              </p>
            </Notice>
            <dl className="jc-dl">
              <div>
                <dt>Quoted price (before GST)</dt>
                <dd data-jc-quoted>{fmtMoney(res.quoted)}</dd>
                <dd className="hint">From {q.from}</dd>
              </div>
              <div>
                <dt>Foam</dt>
                <dd>{fmtMoney(res.foamCost)}</dd>
              </div>
              <div>
                <dt>Labour</dt>
                <dd>{fmtMoney(res.labourCost)}</dd>
              </div>
              <div>
                <dt>Extra costs</dt>
                <dd>{fmtMoney(res.extrasCost)}</dd>
              </div>
              <div>
                <dt>Real cost, all together</dt>
                <dd data-jc-cost>{fmtMoney(res.cost)}</dd>
              </div>
            </dl>
            {res.warnings.map((w) => (
              <Notice key={w} tone="warn">
                {w}
              </Notice>
            ))}
          </div>
        )}

        {legacy && (
          <div className="jc-legacy" data-jc-legacy>
            <h3 className="jc-h">Earlier entry</h3>
            <p>
              Real cost {fmtMoney(legacy.actualCost)} against {fmtMoney(legacy.quoted)} quoted: {legacy.profit >= 0 ? `made ${fmtMoney(legacy.profit)}, ${legacy.marginPct}%` : `lost ${fmtMoney(-legacy.profit)}, minus ${Math.abs(legacy.marginPct)}%`}.
            </p>
            <p className="hint">Enter the real figures below to replace it.</p>
          </div>
        )}

        <div className="jc-bar">
          <h3 className="jc-h">What was really used</h3>
          <span className="hint jc-saved" role="status" aria-live="polite" data-jc-saved>
            {savedAt ? 'Saved' : ''}
          </span>
        </div>

        <div className="jc-block">
          <h4 className="jc-h2">Foam used</h4>
          {a.foams.map((f) => (
            <FoamRow key={f.id} f={f} foam={x.foam} onChange={(p) => setFoam(f.id, p)} onRemove={() => setAsk({ kind: 'foam', id: f.id, name: x.foam.find((t) => t.id === f.foamId)?.name ?? 'this foam' })} />
          ))}
          <button
            type="button"
            className="btn btn-add jc-btn"
            data-jc-add-foam
            onClick={() => change((c) => ({ ...c, foams: [...c.foams, { id: uid('fu'), foamId: x.foam[0]?.id ?? '', unit: 'litres', amount: 0 }] }))}
          >
            <Plus size={18} aria-hidden="true" />
            Add foam used
          </button>
        </div>

        <div className="jc-block">
          <h4 className="jc-h2">Time</h4>
          <NumField label="Hours worked" value={a.hours || undefined} onValue={(n) => change((c) => ({ ...c, hours: n ?? 0 }))} />
          <p className="jc-rate">{rate !== undefined ? `Cost of one hour in use: ${fmtMoney(rate)}${a.hourlyCost === undefined ? ' (from the calculator)' : ''}.` : 'Set what an hour costs you.'}</p>
          <NumField
            label="Cost of one hour"
            value={a.hourlyCost}
            allowEmpty
            placeholder={rate !== undefined && a.hourlyCost === undefined ? String(rate) : 'for example 55'}
            onValue={(n) =>
              change((c) => {
                const next = { ...c }
                if (n === undefined) delete next.hourlyCost
                else next.hourlyCost = n
                return next
              })
            }
          />
          <p className="hint">Leave it empty to use the calculator&apos;s Labour cost.</p>
        </div>

        <div className="jc-block">
          <h4 className="jc-h2">Extra costs</h4>
          {a.extras.map((e) => (
            <div className="jc-row" data-jc-extra-row key={e.id}>
              <TextField label="Name" value={e.name} onValue={(v) => setExtra(e.id, { name: v })} />
              <NumField label="Amount before GST" value={e.amount || undefined} onValue={(n) => setExtra(e.id, { amount: n ?? 0 })} />
              <button type="button" className="btn btn-quiet jc-x" aria-label={`Remove extra cost ${e.name || ''}`.trim()} onClick={() => setAsk({ kind: 'extra', id: e.id, name: e.name || 'this extra cost' })}>
                <Trash2 size={20} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-add jc-btn" data-jc-add-extra onClick={() => change((c) => ({ ...c, extras: [...c.extras, { id: uid('ec'), name: '', amount: 0 }] }))}>
            <Plus size={18} aria-hidden="true" />
            Add an extra cost
          </button>
        </div>

        <div className="jc-block">
          <label htmlFor={noteId} className="label">
            Note (optional)
          </label>
          <textarea
            id={noteId}
            className="field"
            rows={3}
            value={a.note ?? ''}
            onChange={(e) =>
              change((c) => {
                const next = { ...c }
                if (e.target.value) next.note = e.target.value
                else delete next.note
                return next
              })
            }
          />
        </div>

        <CostingDocs jobId={jobId} />
        <p className="hint">Staff only. Nothing here goes to the customer.</p>

        <ConfirmDialog open={!!ask} title="Remove this?" confirmLabel="Remove" tone="danger" onConfirm={confirmRemove} onClose={() => setAsk(null)}>
          <p>Remove {ask?.name}? You would need to type it in again.</p>
        </ConfirmDialog>
      </div>
    </Section>
  )
}

function FoamRow({ f, foam, onChange, onRemove }: { f: FoamUsed; foam: { id: string; name: string }[]; onChange: (p: Partial<FoamUsed>) => void; onRemove: () => void }) {
  const sel = useId()
  const known = foam.some((t) => t.id === f.foamId)
  return (
    <div className="jc-row" data-jc-foam-row>
      <div className="jc-f">
        <label htmlFor={sel} className="label">
          Foam
        </label>
        <select id={sel} className="field" aria-label="Foam" value={f.foamId} onChange={(e) => onChange({ foamId: e.target.value })}>
          {!known && <option value={f.foamId}>Foam type no longer listed</option>}
          {foam.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="jc-f">
        <span className="label" id={`${sel}-u`}>
          Measured in
        </span>
        <div className="jc-tog" role="group" aria-labelledby={`${sel}-u`}>
          {(['litres', 'sets', 'own'] as const).map((u) => (
            <button key={u} type="button" className={`btn jc-t ${f.unit === u ? 'btn-primary' : 'btn-quiet'}`} aria-pressed={f.unit === u} onClick={() => onChange({ unit: u })}>
              {u === 'litres' ? 'Litres' : u === 'sets' ? 'Sets' : 'My own'}
            </button>
          ))}
        </div>
      </div>
      {f.unit === 'own' && (
        <>
          <div className="jc-f">
            <label htmlFor={`${sel}-on`} className="label">
              Name of your measure
            </label>
            <input id={`${sel}-on`} className="field" maxLength={30} placeholder="for example drums" value={f.ownName ?? ''} onChange={(e) => onChange({ ownName: e.target.value })} />
          </div>
          <NumField label="Cost of one before GST" value={f.ownCost || undefined} onValue={(n) => onChange({ ownCost: n ?? 0 })} />
        </>
      )}
      <NumField label="Amount" value={f.amount || undefined} onValue={(n) => onChange({ amount: n ?? 0 })} />
      <button type="button" className="btn btn-quiet jc-x" aria-label="Remove this foam" onClick={onRemove}>
        <Trash2 size={20} aria-hidden="true" />
      </button>
    </div>
  )
}
