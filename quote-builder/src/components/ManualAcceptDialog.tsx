import { useId, useState } from 'react'
import { Check } from 'lucide-react'
import { quoteTotals } from '../lib/calc'
import { VIA_LABEL } from '../lib/due'
import { fmtMoney } from '../lib/format'
import { markAccepted, openSiblingOptions } from '../lib/store'
import type { AcceptedVia, Quote } from '../types'
import { Dialog, Notice, toast } from './ui'

const CHOICES: { id: AcceptedVia; label: string; hint: string }[] = [
  { id: 'phone', label: 'By phone', hint: 'The customer rang to accept.' },
  { id: 'purchase-order', label: 'By purchase order', hint: 'The customer sent a purchase order. Enter its number.' },
  { id: 'email', label: 'By email reply', hint: 'The customer replied to the email instead of clicking Accept.' },
]

/**
 * Staff record an acceptance that did not come from the click in the email:
 * a phone call or a purchase order (Glenn, call of 2 Oct 2026). Demo only:
 * it changes the status saved in this browser and nothing is sent.
 */
export function ManualAcceptDialog({ open, onClose, quote, onDone }: { open: boolean; onClose: () => void; quote: Quote; onDone: () => void }) {
  const uid = useId()
  const [via, setVia] = useState<AcceptedVia>('phone')
  const [po, setPo] = useState('')
  const [chosen, setChosen] = useState<string[]>(quote.selectedUpgradeIds)
  const [closeOthers, setCloseOthers] = useState(true)
  const [err, setErr] = useState('')

  const siblings = open ? openSiblingOptions(quote.id) : []
  const total = quoteTotals(quote, chosen).total

  function confirm() {
    if (via === 'purchase-order' && !po.trim()) {
      setErr('Enter the purchase order number.')
      return
    }
    markAccepted(quote.id, chosen, { via, poNumber: via === 'purchase-order' ? po : undefined, closeOptions: closeOthers })
    toast(`Quote ${quote.number} recorded as accepted ${VIA_LABEL[via]}`)
    onDone()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record an acceptance"
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm}>
            <Check size={18} aria-hidden="true" />
            Mark as accepted
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[0.9375rem] text-muted">
          Use this when a customer accepts quote {quote.number} by phone or sends a purchase order, instead of clicking Accept in the email.
        </p>

        <fieldset className="min-w-0 border-0 p-0">
          <legend className="label">How was it accepted?</legend>
          <div className="space-y-1">
            {CHOICES.map((c) => (
              <label key={c.id} htmlFor={`${uid}-${c.id}`} className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1">
                <input
                  id={`${uid}-${c.id}`}
                  type="radio"
                  name={`${uid}-via`}
                  className="mt-1.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]"
                  checked={via === c.id}
                  onChange={() => {
                    setVia(c.id)
                    setErr('')
                  }}
                />
                <span>
                  <span className="block font-bold">{c.label}</span>
                  <span className="hint !mt-0 block">{c.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {via === 'purchase-order' && (
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
            <legend className="label">Optional upgrades the customer accepted</legend>
            <div className="space-y-1">
              {quote.upgrades.map((u) => (
                <label key={u.id} htmlFor={`${uid}-u-${u.id}`} className="flex min-h-[44px] cursor-pointer items-center gap-3 py-1">
                  <input
                    id={`${uid}-u-${u.id}`}
                    type="checkbox"
                    className="check"
                    checked={chosen.includes(u.id)}
                    onChange={() => setChosen((cur) => (cur.includes(u.id) ? cur.filter((x) => x !== u.id) : [...cur, u.id]))}
                  />
                  <span className="min-w-0 flex-1 break-words">{u.name}</span>
                  <span className="num shrink-0 font-bold">{u.price == null ? '-' : `+${fmtMoney(u.price)}`}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {siblings.length > 0 && (
          <div>
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1" htmlFor={`${uid}-close`}>
              <input id={`${uid}-close`} type="checkbox" className="check mt-0.5" checked={closeOthers} onChange={(e) => setCloseOthers(e.target.checked)} />
              <span>
                <span className="block font-bold">
                  Close the other {siblings.length === 1 ? 'option' : `${siblings.length} options`} on this job
                </span>
                <span className="hint !mt-0 block">Only one option can be accepted. {siblings.map((s) => s.number).join(', ')} will be marked Declined.</span>
              </span>
            </label>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4 rounded-md bg-navy-wash px-4 py-3">
          <span className="font-bold">Accepted total, inc GST</span>
          <span className="num font-display text-2xl">{fmtMoney(total)}</span>
        </div>

        <Notice>Demo mode: this only changes the status saved in this browser. Nothing is sent.</Notice>
      </div>
    </Dialog>
  )
}
