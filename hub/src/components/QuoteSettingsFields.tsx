import { useId } from 'react'
import { GST_RATE, GST_ROUNDING_NOTE, GST_ROUNDING_TO_CONFIRM, VALID_DAYS_DEFAULT, VALID_DAYS_TO_CONFIRM } from '../config'
import { PRODUCT_TYPES, type ProductType, type Quote } from '../types'
import './quoteSections.css'
import { defaultTermsId, getTerms, termsForProduct, useStore } from '../lib/store'

export interface QuoteSettingsFieldsProps {
  quote: Quote
  onChange: (patch: Partial<Quote>) => void
}

const PRODUCT_LABEL: Record<ProductType, string> = { 'Spray foam': 'Spray foam', InjectaCore: 'InjectaCore' }

function ToConfirm({ children }: { children: string }) {
  return <span className="badge st-amber ml-2 align-middle">{children}</span>
}

export function QuoteSettingsFields({ quote, onChange }: QuoteSettingsFieldsProps) {
  const base = useId()
  const s = useStore()
  const product = quote.productType
  const choices = termsForProduct(product, s)
  const active = quote.termsId === 'custom' ? undefined : getTerms(quote.termsId, s)
  const inList = choices.some((t) => t.id === quote.termsId)
  const gstOn = quote.gstApplies !== false
  const termsText = (
    <>
      Terms for {product}: <strong>{active?.name ?? (quote.termsId === 'custom' ? 'written just for this quote' : 'none chosen')}</strong>
    </>
  )
  const gstText = (
    <>
      {gstOn ? 'Prices you type are before GST. The quote shows the subtotal, the GST and the total.' : 'No GST is added. The quote says so.'} {GST_ROUNDING_NOTE}
      {GST_ROUNDING_TO_CONFIRM && <ToConfirm>Open question</ToConfirm>}
    </>
  )

  return (
    <div className="stack-lg qs-root qs-settings">
      <fieldset>
        <legend className="label qs-legend">What kind of job is this?</legend>
        <div className="grid gap-3 sm:grid-cols-2 qs-radios">
          {PRODUCT_TYPES.map((p) => {
            const on = product === p
            return (
              <label
                key={p}
                className="qs-radio flex min-h-[64px] cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-[1.125rem] font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
                style={{ border: `${on ? 3 : 1}px solid rgb(var(${on ? '--c-navy' : '--c-line'}))`, background: on ? 'rgb(var(--c-navy-wash))' : undefined }}
              >
                <input
                  type="radio"
                  name={`${base}-product`}
                  className="h-6 w-6 shrink-0 accent-[rgb(var(--c-navy))]"
                  checked={on}
                  onChange={() => {
                    // Same rule as setQuoteProduct, but through onChange so the editor's own copy is the one saved.
                    const cur = getTerms(quote.termsId, s)
                    onChange(cur && cur.productType !== p ? { productType: p, termsId: defaultTermsId(p, s), termsCustom: undefined } : { productType: p })
                  }}
                />
                <span>{PRODUCT_LABEL[p]}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="qs-terms">
        <div className="qs-labelrow">
          <label className="label" htmlFor={`${base}-terms`}>Terms and conditions</label>        </div>
        <select id={`${base}-terms`} className="field" value={quote.termsId} onChange={(e) => onChange({ termsId: e.target.value, termsCustom: undefined })}>
          {!inList && quote.termsId === 'custom' && <option value="custom">Written just for this quote</option>}
          {!inList && quote.termsId !== 'custom' && <option value={quote.termsId}>Choose terms</option>}
          {choices.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="hint">{termsText}</p>
      </div>

      <div className="qs-days">
        <label className="label" htmlFor={`${base}-days`}>
          How many days the quote stays open
          {VALID_DAYS_TO_CONFIRM && <ToConfirm>To confirm</ToConfirm>}
        </label>
        <input
          id={`${base}-days`}
          className="field num max-w-[10rem]"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={quote.validDays || ''}
          placeholder={String(VALID_DAYS_DEFAULT)}
          onChange={(e) => onChange({ validDays: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
        />
      </div>

      <div className="qs-gst">
        <label className="qs-gst-label flex min-h-[48px] cursor-pointer items-center gap-3 text-[1.125rem] font-bold" htmlFor={`${base}-gst`}>
          <input
            id={`${base}-gst`}
            type="checkbox"
            role="switch"
            className="h-6 w-6 shrink-0 accent-[rgb(var(--c-navy))]"
            checked={gstOn}
            onChange={(e) => onChange({ gstApplies: e.target.checked })}
          />
          Add GST ({Math.round(GST_RATE * 100)}%) to the total
        </label>
        <p className="hint">{gstText}</p>
      </div>
    </div>
  )
}

export default QuoteSettingsFields
