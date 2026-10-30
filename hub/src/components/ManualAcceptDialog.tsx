import { useEffect, useId, useState } from 'react'
import { Check } from 'lucide-react'
import { quoteTotals, upgradeTotal } from '../lib/calc'
import { VIA_LABEL, VIA_OPTIONS } from '../lib/due'
import { fmtMoney } from '../lib/format'
import { acceptQuote, getQuote, saveQuote } from '../lib/store'
import type { AcceptedVia, Quote } from '../types'
import { Dialog, Notice, toast } from './ui'

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
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={confirm}>
            <Check size={20} aria-hidden="true" />
            Yes, mark as accepted
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="t-body text-muted">
          Use this when the customer said yes to quote {quote.number} on the phone, or sent a purchase order, instead of clicking Accept in the email.
        </p>

        <fieldset className="min-w-0 border-0 p-0">
          <legend className="label">How did they say yes?</legend>
          <div className="space-y-1">
            {VIA_OPTIONS.map((c) => (
              <label key={c.id} htmlFor={`${uid}-${c.id}`} className="t-body flex min-h-[48px] cursor-pointer items-center gap-3 py-1">
                <input
                  id={`${uid}-${c.id}`}
                  type="radio"
                  name={`${uid}-via`}
                  className="h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]"
                  checked={via === c.id}
                  onChange={() => {
                    setVia(c.id)
                    setErr('')
                  }}
                />
                <span className="font-bold">{c.label}</span>
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
              <p id={`${uid}-po-e`} className="err">
                {err}
              </p>
            )}
          </div>
        )}

        {quote.upgrades.length > 0 && (
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="label">Extras they said yes to</legend>
            <div className="space-y-1">
              {quote.upgrades.map((u) => {
                const amt = u.unitPrice == null ? null : upgradeTotal(u, quote.lines)
                return (
                  <label key={u.id} htmlFor={`${uid}-u-${u.id}`} className="flex min-h-[44px] cursor-pointer items-center gap-3 py-1">
                    <input
                      id={`${uid}-u-${u.id}`}
                      type="checkbox"
                      className="check"
                      checked={chosen.includes(u.id)}
                      onChange={() => setChosen((cur) => (cur.includes(u.id) ? cur.filter((x) => x !== u.id) : [...cur, u.id]))}
                    />
                    <span className="min-w-0 flex-1 break-words">{u.name}</span>
                    <span className="num shrink-0 font-bold">{amt == null ? 'No price' : `+${fmtMoney(amt)}`}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        <div className="flex items-baseline justify-between gap-4 rounded-md bg-navy-wash px-4 py-3">
          <span className="font-bold">Total with GST</span>
          <span className="num font-display text-2xl">{fmtMoney(total)}</span>
        </div>

        <Notice>Are you sure? This marks the quote as accepted and the job moves on. Demo only: it is saved in this browser and nothing is sent.</Notice>
      </div>
    </Dialog>
  )
}
