import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { FileText, Wand2 } from 'lucide-react'
import { Section } from '../components/job/Section'
import { Notice, toast } from '../components/ui'
import { TalkButton, talkSupported } from '../components/TalkButton'
import { fmtMoney } from '../lib/format'
import { getInspectionNote, setInspectionNote, useInspectionNotes } from '../lib/inspectionNotesStore'
import { DATA_SOURCE } from '../config'
import { apiFetch } from '../lib/api'
import { FLAG_TEXT, MAX_NOTES_CHARS, NOT_ON_MESSAGE, draftFromNotes, makeServerReader,draftSets, draftSubtotal, priceRead, type DraftContext, type DraftLine, type DraftOverrides, type DraftResult } from '../lib/notesToQuote'
import { createQuoteFromDraft } from '../lib/notesToQuoteCreate'
import { PART_LABEL, type Foam, type Part, type ReadItem, type ReadResult } from '../lib/notesToQuoteRead'
import { go, quoteOnJob } from '../lib/router'
import { getJob, getPriceList, useStore } from '../lib/store'
import { useExtraSettings } from '../lib/useExtras'
import './inspectionNotes.css'

const PARTS: Part[] = ['roof', 'walls', 'ceiling', 'subfloor', 'unknown']

const serverReader = makeServerReader((body) => apiFetch('/api/notes-to-quote', { method: 'POST', body }))

/** A number box that lets you type "1." and "0.5" without the text jumping. null means empty. */
function NumField({ label, value, onCommit, step = 'any' }: { label: string; value: number | null | undefined; onCommit: (v: number | null) => void; step?: string }) {
  const id = useId()
  const [txt, setTxt] = useState(value === null || value === undefined ? '' : String(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setTxt(value === null || value === undefined ? '' : String(value))
  }, [value])
  return (
    <div className="nq-f">
      <label className="nq-lab" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field num"
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={txt}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false
          setTxt(value === null || value === undefined ? '' : String(value))
        }}
        onChange={(e) => {
          setTxt(e.target.value)
          const n = Number(e.target.value)
          onCommit(e.target.value === '' || !Number.isFinite(n) || n < 0 ? null : n)
        }}
      />
    </div>
  )
}

/**
 * Quote from inspection notes. Glenn types (or dictates with the phone keyboard) his notes on the job, taps
 * "Draft quote lines", checks the lines (each shows the words it came from) and creates a DRAFT quote.
 * Nothing is sent. Every line can be changed here, and again in the quote editor.
 */
export function InspectionNotes({ jobId }: { jobId: string }) {
  const s = useStore()
  const notes = useInspectionNotes()
  const job = getJob(jobId, s)
  const { foam } = useExtraSettings()
  const noteId = useId()
  const saved = getInspectionNote(jobId, notes)

  const [text, setText] = useState(saved?.text ?? '')
  const [status, setStatus] = useState<'saved' | 'saving' | ''>(saved ? 'saved' : '')
  const [busy, setBusy] = useState(false)
  const [read, setRead] = useState<ReadResult | null>(null)
  const [meta, setMeta] = useState<{ engine: 'rules' | 'model'; fallbackReason?: string; draftedText: string } | null>(null)
  const [ov, setOv] = useState<DraftOverrides>({})
  const [addExclusions, setAddExclusions] = useState(true)
  const timer = useRef<number | undefined>(undefined)
  const lastSaved = useRef(saved?.text ?? '')

  // Another tab or the server changed the saved notes while this box has nothing unsaved: follow them.
  useEffect(() => {
    const t = saved?.text ?? ''
    if (t !== lastSaved.current && text === lastSaved.current) {
      lastSaved.current = t
      setText(t)
      setStatus(t ? 'saved' : '')
    }
  }, [saved?.text]) // eslint-disable-line react-hooks/exhaustive-deps

  const flush = (value: string) => {
    window.clearTimeout(timer.current)
    if (value !== lastSaved.current) {
      lastSaved.current = value.slice(0, MAX_NOTES_CHARS)
      setInspectionNote(jobId, value)
    }
    setStatus(value.trim() ? 'saved' : '')
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const onType = (value: string) => {
    setText(value)
    setStatus('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => flush(value), 600)
  }

  const ctx: DraftContext | null = useMemo(() => (job ? { productType: job.productType, foam, priceItems: getPriceList(s) } : null), [job?.productType, foam, s]) // eslint-disable-line react-hooks/exhaustive-deps
  const result: DraftResult | null = useMemo(() => (read && ctx ? priceRead(read, ctx, ov, meta?.engine ?? 'rules') : null), [read, ctx, ov, meta?.engine])

  if (!job || !ctx) return null

  const draft = async () => {
    flush(text)
    setBusy(true)
    try {
      // Live mode asks the server's smart reader first; any failure (including "not set up") runs the built-in rules.
      const r = await draftFromNotes(text, ctx, DATA_SOURCE === 'live' ? { useModel: true, model: serverReader } : { useModel: false })
      setRead(r.read)
      setOv({})
      setMeta({ engine: r.engine, fallbackReason: r.fallbackReason, draftedText: text })
      if (r.empty) toast('Nothing to draft yet. Your notes are kept.')
    } finally {
      setBusy(false)
    }
  }

  const editItem = (itemId: string | undefined, patch: Partial<ReadItem>) => {
    if (!itemId || !read) return
    setRead({ ...read, items: read.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) })
  }
  /** Remember one edit on a line (by line id). null clears it, so the worked-out value comes back. */
  const put = (key: keyof DraftOverrides, lineId: string, v: boolean | number | string | null) =>
    setOv((o) => {
      const m: Record<string, unknown> = { ...(o[key] ?? {}) }
      if (v === null) delete m[lineId]
      else m[lineId] = v
      return { ...o, [key]: m }
    })

  const lines = result?.lines ?? []
  const ticked = lines.filter((l) => l.checked && l.qty !== null && l.qty > 0)
  const stale = !!meta && meta.draftedText !== text
  const leftOutText = result?.exclusions.map((e) => e.text.replace(/^(?:not|no|excluding|exclude|except|without)\s+(?:the\s+)?/, '')) ?? []

  const create = () => {
    if (!result) return
    const q = createQuoteFromDraft(jobId, lines, addExclusions ? leftOutText : [])
    if (!q) {
      toast('The quote could not be made. Check the job has a person on it.')
      return
    }
    toast(`Draft quote ${q.number} made from ${q.lines.length} line${q.lines.length === 1 ? '' : 's'}`)
    go(quoteOnJob(jobId, q.id))
  }

  return (
    <Section id="job-inspection-section" title="Inspection notes" summary={saved ? 'Notes saved' : 'No notes yet'}>
      <div className="nq" data-inspection-notes>
        <div>
          <label className="label" htmlFor={noteId}>
            What you saw and measured
          </label>
          <textarea
            id={noteId}
            className="field nq-text"
            rows={7}
            maxLength={MAX_NOTES_CHARS}
            value={text}
            placeholder="For example: roof 12 x 8 closed cell 100mm, walls 40 m2 open cell 90mm, 2 storey, tight access, not the garage."
            onChange={(e) => onType(e.target.value)}
            onBlur={() => flush(text)}
            spellCheck
          />
          <TalkButton getBox={() => document.getElementById(noteId) as HTMLTextAreaElement | null} value={text} onChange={onType} maxLength={MAX_NOTES_CHARS} />
          {talkSupported() && <p className="hint">Speech is turned into text by your browser, the audio is not saved by the Hub.</p>}
          <p className="hint">
            {talkSupported() ? 'Tap Talk to speak your notes instead of typing, or use the microphone on your phone keyboard.' : 'On your phone keyboard, tap the microphone to talk instead of typing.'} Do not put the customer&rsquo;s phone, email or address here. Notes save as you type
            {status === 'saving' ? ' (saving...)' : status === 'saved' ? ' (saved)' : ''}.
          </p>
        </div>

        <div className="nq-actions">
          <button type="button" className="btn btn-primary" onClick={draft} disabled={busy || text.trim() === ''}>
            <Wand2 size={18} aria-hidden="true" />
            {read ? 'Draft the lines again' : 'Draft quote lines'}
          </button>
          <span className="hint nq-inline">Draft only. Nothing is sent to anyone.</span>
        </div>

        {stale && (
          <Notice tone="warn">
            Your notes have changed since this draft. Press &ldquo;Draft the lines again&rdquo; to update it. That replaces the changes you made to the lines below.
          </Notice>
        )}

        {meta?.fallbackReason && meta.fallbackReason !== NOT_ON_MESSAGE && <Notice tone="info">Read with the built-in rules. {meta.fallbackReason}</Notice>}

        {result?.empty && (
          <div className="nq-empty" role="status" data-nq-empty>
            <p className="font-bold">I could not find any areas or work in these notes.</p>
            <p>Your notes are kept as they are. Try writing a part and a size, for example &ldquo;roof 12 x 8&rdquo; or &ldquo;walls 40 m2&rdquo;, and add open or closed cell and the thickness in mm.</p>
            {result.leftovers.length > 0 && (
              <details>
                <summary>What I could not read ({result.leftovers.length})</summary>
                <ul>
                  {result.leftovers.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {result && !result.empty && (
          <div className="nq-review" data-nq-review>
            <h3 className="nq-h">Draft lines</h3>
            <p className="hint nq-tidy">The words under each line are your notes, tidied (lower case, numbers as digits). Change anything that is wrong. Ticked lines go into the quote.</p>
            {lines.some((l) => l.flags.includes('placeholderFoam')) && (
              <Notice tone="warn">The foam values (yield, price per m³, waste) are placeholders until Glenn confirms them in Foam prices. The price list prices are also still to be confirmed.</Notice>
            )}

            {lines.length === 0 && <p className="hint">Everything in the notes was left out. Nothing to put on a quote.</p>}

            <ul className="nq-lines">
              {lines.map((l) => (
                <LineCard key={l.id} line={l} item={read?.items.find((i) => i.id === l.itemId)} ov={ov} put={put} editItem={editItem} />
              ))}
            </ul>

            {lines.length > 0 && (
              <p className="nq-total" data-nq-total>
                {ticked.length} line{ticked.length === 1 ? '' : 's'} ticked, <strong>{fmtMoney(draftSubtotal(lines))}</strong> before GST.
                {draftSets(lines).map((x) => (
                  <span key={x.foamName} className="nq-sets">
                    {' '}
                    Chemical: about {x.sets} sets of {x.foamName.toLowerCase()}
                    {x.placeholder ? ' (placeholder yield)' : ''}.
                  </span>
                ))}
              </p>
            )}

            {result.questions.length > 0 && (
              <div className="nq-box" data-nq-questions>
                <h3 className="nq-h">Questions to answer ({result.questions.length})</h3>
                <ul>
                  {result.questions.map((q) => (
                    <li key={q.id}>{q.text}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.leftOut.length > 0 && (
              <div className="nq-box" data-nq-leftout>
                <h3 className="nq-h">Left out</h3>
                <ul>
                  {result.leftOut.map((x, i) => (
                    <li key={i}>
                      {x.label}: {x.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.leftovers.length > 0 && (
              <details className="nq-box">
                <summary>Parts of your notes I could not use ({result.leftovers.length})</summary>
                <ul>
                  {result.leftovers.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            )}

            {leftOutText.length > 0 && (
              <label className="nq-check">
                <input type="checkbox" checked={addExclusions} onChange={(e) => setAddExclusions(e.target.checked)} />
                <span>Add &ldquo;Not included: {leftOutText.join('; ')}&rdquo; to the quote notes</span>
              </label>
            )}

            <div className="nq-actions">
              <button type="button" className="btn btn-primary" onClick={create} disabled={ticked.length === 0}>
                <FileText size={18} aria-hidden="true" />
                Create quote from these lines
              </button>
              <span className="hint nq-inline">Makes a new draft quote on this job and opens it. Other quotes are not changed.</span>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

function LineCard({ line: l, item, ov, put, editItem }: { line: DraftLine; item?: ReadItem; ov: DraftOverrides; put: (k: keyof DraftOverrides, id: string, v: boolean | number | string | null) => void; editItem: (id: string | undefined, p: Partial<ReadItem>) => void }) {
  const id = useId()
  const total = l.qty !== null && l.unitPrice !== null ? l.qty * l.unitPrice : null
  return (
    <li className="nq-line" data-nq-line data-checked={l.checked} data-engine={l.engine}>
      <div className="nq-line-head">
        <label className="nq-check">
          <input type="checkbox" checked={l.checked} onChange={(e) => put('checked', l.id, e.target.checked)} aria-label={`Include ${l.name}`} />
          <span className="nq-name">{l.name}</span>
        </label>
        <span className="nq-money num">{total !== null ? fmtMoney(total) : 'No price'}</span>
      </div>
      <p className="nq-src" data-nq-source>
        <span className="nq-src-tag">From your notes</span> &ldquo;{l.phrase}&rdquo;
      </p>

      <div className="nq-fields">
        {item && (
          <>
            <div className="nq-f">
              <label className="nq-lab" htmlFor={`${id}-part`}>
                Part
              </label>
              <select id={`${id}-part`} className="field" value={item.part} onChange={(e) => editItem(item.id, { part: e.target.value as Part, partGuessed: false })}>
                {PARTS.map((p) => (
                  <option key={p} value={p}>
                    {p === 'unknown' ? 'Not known' : PART_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <NumField label="Size (m²)" value={item.areaM2} onCommit={(v) => editItem(item.id, { areaM2: v, pieces: v === null ? [] : [{ text: 'typed', m2: v }], approx: false, noUnit: false })} />
            <div className="nq-f">
              <label className="nq-lab" htmlFor={`${id}-foam`}>
                Foam
              </label>
              <select id={`${id}-foam`} className="field" value={item.foam ?? ''} onChange={(e) => editItem(item.id, { foam: (e.target.value || undefined) as Foam | undefined })}>
                <option value="">Not said</option>
                <option value="open">Open cell</option>
                <option value="closed">Closed cell</option>
              </select>
            </div>
            <NumField label="Thickness (mm)" value={item.thicknessMm} onCommit={(v) => editItem(item.id, { thicknessMm: v ?? undefined, thicknessRange: undefined })} />
            {l.alternatives.length > 0 && (
              <div className="nq-f nq-wide">
                <label className="nq-lab" htmlFor={`${id}-pi`}>
                  Price list item
                </label>
                <select id={`${id}-pi`} className="field" value={ov.priceItem?.[l.id] ?? l.priceItemId ?? ''} onChange={(e) => put('priceItem', l.id, e.target.value || null)}>
                  {!l.priceItemId && <option value="">None found</option>}
                  {l.alternatives.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({fmtMoney(a.unitPrice)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        {!item && <NumField label={l.unit === 'hour' ? 'Hours' : l.unit === 'each' ? 'How many' : 'Size (m²)'} value={l.qty} onCommit={(v) => put('qty', l.id, v)} />}
        <NumField label={`Price per ${l.unit} (ex GST)`} value={l.unitPrice} step="0.01" onCommit={(v) => put('price', l.id, v)} />
      </div>

      {l.flags.length > 0 && (
        <ul className="nq-flags" aria-label="Things to check">
          {l.flags.map((f) => (
            <li key={f} className={`nq-flag nq-flag-${f}`}>
              {FLAG_TEXT[f]}
            </li>
          ))}
        </ul>
      )}
      {l.calc && (
        <p className="nq-calc" data-staff-only>
          Staff only. Foam calculator: about {l.calc.litres.toLocaleString('en-AU')} litres, {l.calc.sets} sets of {l.calc.foamName.toLowerCase()}, {fmtMoney(l.calc.pricePerM2)} per m² at this thickness.
        </p>
      )}
    </li>
  )
}
