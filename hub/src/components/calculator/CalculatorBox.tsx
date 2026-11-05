import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Eye, Minus, Plus, Undo2 } from 'lucide-react'
import { ConfirmDialog, Notice, toast } from '../ui'
import { Section } from '../job/Section'
import { buildLines, calcTotals, foamMissing, groupOrder, itemPrice, itemsInGroup, unitInfo, type CalcItem, type Qtys } from '../../lib/calcEngine'
import { updateItem, useCalcItems, useSavedCalcs } from '../../lib/calcItems'
import { fmtDate, fmtMoney, fmtQty } from '../../lib/format'
import type { FoamType } from '../../lib/extras'
import { getJob } from '../../lib/store'
import { useExtraSettings } from '../../lib/useExtras'
import { CalcStepDialog, type CalcStepMode } from './CalcAddToQuote'
import { CalcItemDialog } from './CalcItemDialog'
import { parseNumber, qtyLabel, round2, stepFor, unitWords } from './CalcParse'
import './calculator.css'

// ---- The sum lives in React state and, so a reload loses nothing, in sessionStorage per job (or 'page') ----

interface Sum {
  qtys: Qtys
  /** Earlier sums, newest last. Undo steps back through them. */
  hist: Qtys[]
}
const HIST_MAX = 100
const sumKey = (jobId?: string) => `hub.calc.sum.v1.${jobId ?? 'page'}`
function loadSum(jobId?: string): Sum {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(sumKey(jobId)) ?? 'null') as Partial<Sum> | null
    const clean = (q: unknown): Qtys => {
      const out: Qtys = {}
      if (q && typeof q === 'object') for (const [k, v] of Object.entries(q)) if (typeof v === 'number' && v > 0 && Number.isFinite(v)) out[k] = v
      return out
    }
    if (raw && typeof raw === 'object') return { qtys: clean(raw.qtys), hist: Array.isArray(raw.hist) ? raw.hist.slice(-HIST_MAX).map(clean) : [] }
  } catch {
    /* start empty */
  }
  return { qtys: {}, hist: [] }
}
const same = (a: Qtys, b: Qtys) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

// ---- One item row -----------------------------------------------------------

function ItemRow({
  item,
  foam,
  qty,
  onType,
  onStep,
  onFocus,
  onBlur,
  onChange,
}: {
  item: CalcItem
  foam: FoamType[]
  qty: number
  onType: (n: number) => void
  onStep: (dir: 1 | -1) => void
  onFocus: () => void
  onBlur: () => void
  onChange: () => void
}) {
  const id = useId()
  const [t, setT] = useState(qty ? String(qty) : '')
  const [err, setErr] = useState('')
  const isFoam = !!item.foamId && !foamMissing(item, foam)
  const price = itemPrice(item, foam)
  const unit = unitInfo(item.unit)
  const example = isFoam ? foam.find((f) => f.id === item.foamId)?.placeholder : item.placeholder

  // The box follows the sum when something else changes it (plus, minus, undo, start again, load).
  useEffect(() => {
    const p = parseNumber(t)
    if (p.ok ? p.n !== qty : !(t.trim() === '' && qty === 0)) {
      setT(qty ? String(qty) : '')
      setErr('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty])

  const type = (v: string) => {
    setT(v)
    if (v.trim() === '') {
      setErr('')
      return onType(0)
    }
    const p = parseNumber(v, 100000)
    if (!p.ok) return setErr(p.why)
    setErr('')
    onType(p.n)
  }

  return (
    <li className="calc-item" data-calc-item={item.id}>
      <div className="calc-item-info">
        <p className="calc-item-name">{item.name}</p>
        <p className="calc-sub">
          {fmtMoney(price)} {unitWords(item.unit)}, before GST
        </p>
        {isFoam && <p className="calc-sub">Price comes from Foam prices</p>}
        {example && <span className="calc-tag">Example price, not confirmed</span>}
      </div>
      <div className="calc-item-ctl">
        <label className="calc-ask" htmlFor={`${id}-q`}>
          {unit.ask}
        </label>
        <div className="calc-qtyrow">
          <button type="button" className="btn calc-step" data-calc-minus aria-label={`One less of ${item.name}`} disabled={qty <= 0} onClick={() => onStep(-1)}>
            <Minus size={22} aria-hidden="true" />
          </button>
          <input
            id={`${id}-q`}
            className="field num calc-qty"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={t}
            aria-label={qtyLabel(item)}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? `${id}-e` : undefined}
            data-calc-qty
            onFocus={onFocus}
            onChange={(e) => type(e.target.value)}
            onBlur={() => {
              if (err) {
                setT(qty ? String(qty) : '')
                setErr('')
              }
              onBlur()
            }}
          />
          <button type="button" className="btn calc-step" data-calc-plus aria-label={`One more of ${item.name}`} onClick={() => onStep(1)}>
            <Plus size={22} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-quiet calc-change" data-calc-edit={item.id} aria-label={`Change ${item.name}`} onClick={onChange}>
            Change
          </button>
        </div>
        {err && (
          <p id={`${id}-e`} className="err calc-err" role="alert">
            {err}
          </p>
        )}
        {qty > 0 && !err && <p className="calc-sub calc-linetotal">{fmtMoney(round2(qty * price))} before GST</p>}
      </div>
    </li>
  )
}

// ---- The calculator ----------------------------------------------------------------

export function CalculatorBox({ jobId }: { jobId?: string }) {
  const items = useCalcItems()
  const saved = useSavedCalcs().find((s) => s.id === jobId)
  const { foam } = useExtraSettings()
  const root = useRef<HTMLDivElement>(null)
  const [sum, setSum] = useState<Sum>(() => loadSum(jobId))
  const editStart = useRef<Qtys | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [askClear, setAskClear] = useState(false)
  const [dlg, setDlg] = useState<{ edit?: CalcItem } | null>(null)
  const [step, setStep] = useState<CalcStepMode | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'info'; text: string; showId?: string } | null>(null)
  const [focusId, setFocusId] = useState('')

  // Reload keeps the sum: a different job (or the page) starts from its own saved copy.
  const loadedFor = useRef(jobId)
  useEffect(() => {
    if (loadedFor.current !== jobId) {
      loadedFor.current = jobId
      setSum(loadSum(jobId))
      setMsg(null)
    }
  }, [jobId])
  useEffect(() => {
    try {
      window.sessionStorage.setItem(sumKey(loadedFor.current), JSON.stringify(sum))
    } catch {
      /* in memory only */
    }
  }, [sum])

  // The total bar sticks below the app header when the page scrolls, and to the top of its own panel inside the job page.
  useLayoutEffect(() => {
    const place = () => {
      const el = root.current
      if (!el) return
      let p: HTMLElement | null = el.parentElement
      let inPanel = false
      while (p && p !== document.body && p !== document.documentElement) {
        const o = getComputedStyle(p).overflowY
        if (o === 'auto' || o === 'scroll') {
          inPanel = true
          break
        }
        p = p.parentElement
      }
      const bar = document.querySelector('.topbar')
      el.style.setProperty('--calc-top', `${inPanel ? 0 : Math.ceil(bar ? bar.getBoundingClientRect().height : 0)}px`)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [])

  const change = useCallback((fn: (q: Qtys) => Qtys, push: boolean) => {
    setSum((p) => {
      const next = fn(p.qtys)
      if (same(next, p.qtys)) return p
      return { qtys: next, hist: push ? [...p.hist, p.qtys].slice(-HIST_MAX) : p.hist }
    })
  }, [])
  const setQty = (id: string, n: number, push: boolean) =>
    change((q) => {
      const o = { ...q }
      if (n > 0) o[id] = n
      else delete o[id]
      return o
    }, push)
  const commitEdit = () => {
    const before = editStart.current
    editStart.current = null
    if (before) setSum((p) => (same(before, p.qtys) ? p : { ...p, hist: [...p.hist, before].slice(-HIST_MAX) }))
  }
  const undo = () => setSum((p) => (p.hist.length ? { qtys: p.hist[p.hist.length - 1], hist: p.hist.slice(0, -1) } : p))

  useEffect(() => {
    if (!focusId) return
    const t = setTimeout(() => {
      const input = root.current?.querySelector<HTMLInputElement>(`[data-calc-item="${focusId}"] [data-calc-qty]`)
      input?.focus()
      input?.scrollIntoView({ block: 'center' })
      setFocusId('')
    }, 60)
    return () => clearTimeout(t)
  }, [focusId, items])

  const lines = useMemo(() => buildLines(items, foam, sum.qtys), [items, foam, sum.qtys])
  const totals = useMemo(() => calcTotals(lines), [lines])
  const groups = groupOrder(items)
  const hiddenItems = items.filter((i) => i.hidden)
  const hasLines = lines.length > 0
  const canLoad = !!saved && Object.keys(saved.qtys).length > 0 && !same(saved.qtys, sum.qtys)

  const onSaved = (savedJob: string, at: string) => {
    const j = getJob(savedJob)
    setMsg({ tone: 'ok', text: `Saved with ${jobId ? 'this job' : (j?.name ?? 'the job')} on ${fmtDate(at)}` })
    toast('Saved with the job')
  }

  const bar = (
    <div className="calc-bar" data-calc-total>
      <div className="calc-bar-main" aria-live="polite" aria-atomic="true">
        <span className="calc-bar-label">Total with GST</span>
        <span className="calc-grand num" data-calc-grand>
          {fmtMoney(totals.total)}
        </span>
        <span className="calc-bar-small">
          Before GST <span className="num" data-calc-subtotal>{fmtMoney(totals.subtotal)}</span>
        </span>
        <span className="calc-bar-small">
          GST <span className="num" data-calc-gst>{fmtMoney(totals.gst)}</span>
        </span>
      </div>
      <div className="calc-bar-undo">
        <button type="button" className="btn btn-primary calc-big" data-calc-undo disabled={!sum.hist.length} aria-describedby={sum.hist.length ? undefined : 'calc-undo-why'} onClick={undo}>
          <Undo2 size={22} aria-hidden="true" />
          Undo
        </button>
        {!sum.hist.length && (
          <span id="calc-undo-why" className="calc-bar-small">
            Nothing to undo yet
          </span>
        )}
      </div>
    </div>
  )

  const body = (
    <div className="calc" data-calc ref={root}>
      {bar}

      {saved && (
        <div className="calc-saved">
          <span>Last saved {fmtDate(saved.at)}</span>
          {canLoad && (
            <button type="button" className="btn btn-quiet" data-calc-load onClick={() => change(() => ({ ...saved.qtys }), true)}>
              Load saved sum
            </button>
          )}
        </div>
      )}

      <div className="calc-tools">
        <button type="button" className="btn btn-primary calc-big" data-calc-new onClick={() => setDlg({})}>
          <Plus size={22} aria-hidden="true" />
          New item
        </button>
        <button type="button" className="btn btn-quiet calc-big" data-calc-clear disabled={!Object.keys(sum.qtys).length} onClick={() => setAskClear(true)}>
          Start again
        </button>
      </div>

      {msg && (
        <Notice tone={msg.tone} className="calc-note">
          <span role="status" data-calc-msg>
            {msg.text}
          </span>
          {msg.showId && (
            <>
              {' '}
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  updateItem(msg.showId!, { hidden: false })
                  setMsg(null)
                }}
              >
                Show it again
              </button>
            </>
          )}
        </Notice>
      )}

      {groups.map((g) => {
        const list = itemsInGroup(items, g)
        if (!list.length) return null
        return (
          <section key={g} className="calc-group" aria-label={g}>
            <h3 className="calc-group-h">{g}</h3>
            <ul className="calc-list">
              {list.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  foam={foam}
                  qty={sum.qtys[item.id] ?? 0}
                  onType={(n) => setQty(item.id, n, false)}
                  onStep={(dir) => setQty(item.id, Math.max(0, round2((sum.qtys[item.id] ?? 0) + dir * stepFor(item))), true)}
                  onFocus={() => {
                    editStart.current = sum.qtys
                  }}
                  onBlur={commitEdit}
                  onChange={() => setDlg({ edit: item })}
                />
              ))}
            </ul>
          </section>
        )
      })}
      {!groups.length && <p className="calc-sub">No items yet. Press New item to add the first one.</p>}

      {hiddenItems.length > 0 && (
        <div className="calc-hidden">
          <button type="button" className="btn btn-quiet" data-calc-show-hidden aria-expanded={showHidden} onClick={() => setShowHidden((v) => !v)}>
            <Eye size={22} aria-hidden="true" />
            {showHidden ? 'Hide the hidden items again' : `Show hidden items (${hiddenItems.length})`}
          </button>
          {showHidden && (
            <ul className="calc-list">
              {hiddenItems.map((h) => (
                <li key={h.id} className="calc-item calc-item-hidden" data-calc-hidden-item={h.id}>
                  <div className="calc-item-info">
                    <p className="calc-item-name">{h.name}</p>
                    <p className="calc-sub">Hidden. {h.group}</p>
                  </div>
                  <button type="button" className="btn btn-primary" data-calc-unhide={h.id} aria-label={`Show ${h.name} again`} onClick={() => updateItem(h.id, { hidden: false })}>
                    Show again
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="calc-output" data-calc-output aria-label="Your sum">
        <h3 className="calc-group-h">Your sum</h3>
        {!hasLines ? (
          <p className="calc-sub">Type how many above and your sum shows here.</p>
        ) : (
          <>
            <ul className="calc-lines">
              {lines.map((l) => (
                <li key={l.itemId} className="calc-line" data-calc-line={l.itemId}>
                  <span className="calc-line-name">{l.name}</span>
                  <span className="calc-sub">
                    {fmtQty(l.qty)} {unitInfo(l.unit).short} at {fmtMoney(l.unitPrice)} {unitWords(l.unit)}
                  </span>
                  <span className="num calc-line-total">{fmtMoney(l.total)}</span>
                </li>
              ))}
            </ul>
            <dl className="calc-sums">
              <div>
                <dt>Total before GST</dt>
                <dd className="num">{fmtMoney(totals.subtotal)}</dd>
              </div>
              <div>
                <dt>GST</dt>
                <dd className="num">{fmtMoney(totals.gst)}</dd>
              </div>
              <div className="calc-sums-grand">
                <dt>Total with GST</dt>
                <dd className="num">{fmtMoney(totals.total)}</dd>
              </div>
            </dl>
            <div className="calc-staff">
              <p className="calc-staff-h">Your team only. Never shown to the customer.</p>
              {totals.missingCost.length > 0 ? (
                <p data-calc-missing>Cost not set for: {totals.missingCost.join(', ')}</p>
              ) : (
                <dl className="calc-sums">
                  <div>
                    <dt>Material cost</dt>
                    <dd className="num" data-calc-material>
                      {fmtMoney(totals.materialCost)}
                    </dd>
                  </div>
                  <div>
                    <dt>Labour hours</dt>
                    <dd className="num" data-calc-hours>
                      {fmtQty(totals.labourHours)}
                    </dd>
                  </div>
                  {totals.margin && (
                    <div>
                      <dt>Margin</dt>
                      <dd className="num" data-calc-margin>
                        {fmtMoney(totals.margin.dollars)}, {totals.margin.pct}%
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </>
        )}
        <div className="calc-tools">
          <button type="button" className="btn btn-primary calc-big" data-calc-add-to-quote disabled={!hasLines} onClick={() => setStep('quote')}>
            Add to quote
          </button>
          <button type="button" className="btn calc-big" data-calc-save-job disabled={!hasLines} onClick={() => setStep('save')}>
            {jobId ? 'Save calculation to this job' : 'Save calculation to a job'}
          </button>
        </div>
        {!hasLines && <p className="calc-sub">Add at least one amount to use these buttons.</p>}
      </section>

      <ConfirmDialog
        open={askClear}
        title="Start again?"
        confirmLabel="Start again"
        onClose={() => setAskClear(false)}
        onConfirm={() => {
          change(() => ({}), true)
          setAskClear(false)
          toast('Cleared. Press Undo to bring it back.')
        }}
      >
        <p>Every amount goes back to 0. You can press Undo to bring them back.</p>
      </ConfirmDialog>

      <CalcItemDialog
        open={!!dlg}
        onClose={() => setDlg(null)}
        item={dlg?.edit}
        items={items}
        foam={foam}
        onSaved={(made) => {
          if (made) setFocusId(made.id)
        }}
        onHidden={(h) => {
          if (sum.qtys[h.id]) setQty(h.id, 0, true)
          setMsg({ tone: 'info', text: `Hidden. Show it again under Show hidden items.`, showId: h.id })
        }}
      />

      {step && <CalcStepDialog open mode={step} jobId={jobId} lines={lines} qtys={sum.qtys} onClose={() => setStep(null)} onSaved={onSaved} />}
    </div>
  )

  if (jobId) {
    return (
      <Section id="job-calculator-section" title="Calculator" summary={hasLines ? `${fmtMoney(totals.total)} with GST` : 'Add up a price'}>
        {body}
      </Section>
    )
  }
  return <div className="card calc-card">{body}</div>
}
