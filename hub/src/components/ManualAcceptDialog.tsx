import { useEffect, useId, useState } from 'react'
import { Check } from 'lucide-react'
import { quoteTotals, upgradeTotal } from '../lib/calc'
import { VIA_LABEL, VIA_OPTIONS } from '../lib/due'
import { fmtMoney } from '../lib/format'
import { acceptQuote, getQuote, saveQuote } from '../lib/store'
import type { AcceptedVia, Quote } from '../types'
import { noteForAction } from '../lib/confirmNotes'
import { MayHappen } from './confirmText'
import { Dialog, toast } from './ui'

/**
 * Staff record an acceptance that did not come from the click in the email:
 * a phone call or a purchase order. Demo only: it changes the status saved in
 * this browser and nothing is sent.
 */
export function ManualAcceptDialog({ open, onClose, quote, onDone }: { open: boolean; onClose: () => void; quote: Quote; onDone: () => void }) {
  const uid = useId()
  const [via, setVia] = useState<AcceptedVia>('phone')
  const [po, setPo] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setVia('phone')
      setPo('')
      setErr('')
      setChosen(quote.upgrades.filter((u) => u.ticked).map((u) => u.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const withChoice: Quote = { ...quote, upgrades: quote.upgrades.map((u) => ({ ...u, ticked: chosen.includes(u.id) })) }
  const total = quoteTotals(withChoice).total

  function confirm() {
    if (via === 'purchaseOrder' && !po.trim()) {
      setErr('Please type the purchase order number.')
      return
    }
    // The prop may be stale: read the stored quote and change only the ticks.
    const stored = getQuote(quote.id)
    if (!stored || (stored.status !== 'Draft' && stored.status !== 'Sent')) {
      toast('This quote has changed since you opened it. Nothing was saved.')
      onDone()
      return
    }
    // acceptQuote uses the ticked upgrades, so store the chosen ones first.
    saveQuote({ ...stored, upgrades: stored.upgrades.map((u) => ({ ...u, ticked: chosen.includes(u.id) })) })
    acceptQuote(quote.id, via, via === 'purchaseOrder' ? po.trim() : undefined)
    toast(`Quote ${quote.number} marked as accepted ${VIA_LABEL[via]}`)
    onDone()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mark as accepted"
      footer={
        <>
          <button type="button" className="btn btn-neutral" data-autofocus onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm}>
            <Check size={18} aria-hidden="true" />
            Yes, mark as accepted
          </button>
        </>
      }
    >
      <div className="dg-stack">
        <p className="dg-muted dg-adv">
          Use this when the customer said yes to quote {quote.number} on the phone, or sent a purchase order, instead of clicking Accept in the email.
        </p>

        <fieldset className="dg-fs">
          <legend className="dg-legend">How did they say yes?</legend>
          <div className="dg-list" role="radiogroup" aria-label="How did they say yes?">
            {VIA_OPTIONS.map((c) => (
              <label key={c.id} htmlFor={`${uid}-${c.id}`} className="dg-row">
                <input
                  id={`${uid}-${c.id}`}
                  type="radio"
                  name={`${uid}-via`}
                  checked={via === c.id}
                  onChange={() => {
                    setVia(c.id)
                    setErr('')
                  }}
                />
                <span className="dg-name font-bold">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {via === 'purchaseOrder' && (
          <div>
            <label className="label" htmlFor={`${uid}-po`}>
              Purchase order number
            </label>
            <input
              id={`${uid}-po`}
              className="field"
              value={po}
              onChange={(e) => {
                setPo(e.target.value)
                setErr('')
              }}
              autoComplete="off"
              aria-invalid={!!err}
              aria-describedby={err ? `${uid}-po-e` : undefined}
            />
            {err && (
              <p id={`${uid}-po-e`} className="err" role="alert">
                {err}
              </p>
            )}
          </div>
        )}

        {quote.upgrades.length > 0 && (
          <fieldset className="dg-fs">
            <legend className="dg-legend">Extras they said yes to</legend>
            <div className="dg-list">
              {quote.upgrades.map((u) => {
                const amt = u.unitPrice == null ? null : upgradeTotal(u, quote.lines)
                return (
                  <label key={u.id} htmlFor={`${uid}-u-${u.id}`} className="dg-row dg-check">
                    <input
                      id={`${uid}-u-${u.id}`}
                      type="checkbox"
                      className="check"
                      checked={chosen.includes(u.id)}
                      onChange={() => setChosen((cur) => (cur.includes(u.id) ? cur.filter((x) => x !== u.id) : [...cur, u.id]))}
                    />
                    <span className="dg-name">{u.name}</span>
                    <span className="num dg-end font-bold">{amt == null ? 'No price' : `+${fmtMoney(amt)}`}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        <div className="dg-total">
          <span className="font-bold">Total with GST</span>
          <span className="num dg-amt">{fmtMoney(total)}</span>
        </div>

        <MayHappen note={noteForAction('accept-quote')} />

        <p className="dg-muted">Demo only: saved in this browser, nothing is sent.</p>
      </div>
    </Dialog>
  )
}
