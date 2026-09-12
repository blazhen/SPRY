import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowUpRight } from 'lucide-react'
import { site } from '@/data/site'
import {
  CONSENT_VERSION,
  ENQUIRY_NOTICE,
  MARKETING_CONSENT_TEXT,
  areaOptions,
  contactCopy,
  propertyTypes,
  stageOptions,
  timeframeOptions,
} from '@/data/forms'
import { submitLead } from '@/lib/leadSubmit'

type Errors = Partial<Record<string, string>>

const FIELD =
  'w-full rounded-md border border-line/15 bg-ink-800 px-4 py-3.5 text-body text-bone transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40'
const LABEL = 'block text-small font-bold text-bone'
const HINT = 'mt-1 block text-eyebrow font-medium uppercase tracking-[0.14em] text-bone-400'

/** Deliberately loose: the goal is catching typos, not policing formats. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const AU_PHONE_RE = /^(\+?61|0)[2-478](?:[ -]?\d){8}$/

/**
 * Quote enquiry form.
 *
 * Posts straight to a Systemations inbound webhook, so there is no backend of
 * our own to run. Three things here are load-bearing beyond the obvious:
 *
 *  - Consent is captured as evidence, not as a boolean. The marketing opt-in is
 *    unticked by default and the exact wording shown travels with the record,
 *    because that is what the Spam Act asks you to be able to produce.
 *  - Spam is handled without a third-party widget: a honeypot no human sees,
 *    plus a minimum time on form. Bots complete instantly and fill everything.
 *  - A failed send never looks like a success. If the webhook is unconfigured
 *    or unreachable the visitor is told, and given the phone number.
 */
export default function QuoteForm() {
  const navigate = useNavigate()
  const startedAt = useRef(Date.now())

  const [areas, setAreas] = useState<string[]>([])
  const [optIn, setOptIn] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'failed'>('idle')
  const [failure, setFailure] = useState('')

  const toggleArea = (value: string) =>
    setAreas((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const get = (key: string) => String(data.get(key) ?? '').trim()

    // Honeypot: a real person never sees this field, so anything in it is a
    // bot. Reported as success so the bot has no signal to adapt to.
    if (get('company_website')) {
      navigate('/thanks/quote')
      return
    }
    // Bots submit near instantly. Three seconds is under any human fill time.
    if (Date.now() - startedAt.current < 3000) {
      setStatus('failed')
      setFailure('That was a little quick. Please take a moment and try again.')
      return
    }

    const next: Errors = {}
    if (!get('firstName')) next.firstName = 'Please tell us your first name.'
    if (!get('lastName')) next.lastName = 'Please tell us your last name.'
    if (!get('phone')) next.phone = 'We need a number to call you back on.'
    else if (!AU_PHONE_RE.test(get('phone')))
      next.phone = 'That does not look like an Australian number.'
    if (!get('email')) next.email = 'Please add an email address.'
    else if (!EMAIL_RE.test(get('email'))) next.email = 'Please check that email address.'
    if (!/^\d{4}$/.test(get('postcode'))) next.postcode = 'Please enter a four digit postcode.'
    if (!get('propertyType')) next.propertyType = 'Please choose a property type.'
    if (areas.length === 0) next.areas = 'Please choose at least one area.'

    setErrors(next)
    if (Object.keys(next).length > 0) {
      // Move focus to the first problem rather than leaving it at the button.
      const first = Object.keys(next)[0]
      const el = form.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`)
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }

    setStatus('sending')
    const result = await submitLead({
      firstName: get('firstName'),
      lastName: get('lastName'),
      phone: get('phone'),
      email: get('email'),
      postcode: get('postcode'),
      street: get('street'),
      suburb: get('suburb'),
      propertyType: get('propertyType'),
      areas,
      stage: get('stage'),
      timeframe: get('timeframe'),
      message: get('message'),
      marketingOptIn: optIn,
      consentText: `${CONSENT_VERSION}: ${MARKETING_CONSENT_TEXT}`,
    })

    if (result.ok) {
      navigate('/thanks/quote')
      return
    }
    setStatus('failed')
    setFailure(
      result.reason === 'unconfigured' ? contactCopy.unconfigured : contactCopy.networkError,
    )
  }

  const err = (key: string) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-2 flex items-center gap-1.5 text-small text-accent">
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        {errors[key]}
      </p>
    ) : null

  const aria = (key: string) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-7">
      {/* Honeypot. Positioned off screen rather than display:none, which some
          bots know to skip. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="company_website">Company website</label>
        <input
          id="company_website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/*
        First and last name are separate fields, not one "your name" box. The
        CRM matches and addresses people on the first name alone, and a single
        field gives it whatever the visitor typed: sometimes a full name,
        sometimes just "Dave", sometimes a business. Two fields make the split
        the visitor's decision rather than a guess made by a parser afterwards.
      */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={LABEL}>
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className={`${FIELD} mt-2`}
            {...aria('firstName')}
          />
          {err('firstName')}
        </div>

        <div>
          <label htmlFor="lastName" className={LABEL}>
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            className={`${FIELD} mt-2`}
            {...aria('lastName')}
          />
          {err('lastName')}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">

        <div>
          <label htmlFor="phone" className={LABEL}>
            Mobile
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0400 000 000"
            className={`${FIELD} mt-2`}
            {...aria('phone')}
          />
          {err('phone')}
        </div>

        <div>
          <label htmlFor="email" className={LABEL}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={`${FIELD} mt-2`}
            {...aria('email')}
          />
          {err('email')}
        </div>

        <div>
          <label htmlFor="postcode" className={LABEL}>
            Postcode
          </label>
          <input
            id="postcode"
            name="postcode"
            type="text"
            inputMode="numeric"
            maxLength={4}
            autoComplete="postal-code"
            placeholder="3201"
            className={`${FIELD} mt-2`}
            {...aria('postcode')}
          />
          {err('postcode')}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="street" className={LABEL}>
            Street address <span className="font-normal text-bone-400">(optional)</span>
          </label>
          <input
            id="street"
            name="street"
            type="text"
            autoComplete="street-address"
            placeholder="12 Example Street"
            className={`${FIELD} mt-2`}
            {...aria('street')}
          />
          {err('street')}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="suburb" className={LABEL}>
            Suburb <span className="font-normal text-bone-400">(optional)</span>
          </label>
          <input
            id="suburb"
            name="suburb"
            type="text"
            autoComplete="address-level2"
            className={`${FIELD} mt-2`}
            {...aria('suburb')}
          />
          {err('suburb')}
        </div>
      </div>

      <div>
        <label htmlFor="propertyType" className={LABEL}>
          What are we insulating?
        </label>
        <select
          id="propertyType"
          name="propertyType"
          defaultValue=""
          className={`${FIELD} mt-2`}
          {...aria('propertyType')}
        >
          <option value="" disabled>
            Choose one
          </option>
          {propertyTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {err('propertyType')}
      </div>

      <fieldset data-field="areas" tabIndex={-1} className="focus:outline-none">
        <legend className={LABEL}>Which parts?</legend>
        <span className={HINT}>Choose all that apply</span>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {areaOptions.map((option) => {
            const on = areas.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleArea(option.value)}
                aria-pressed={on}
                className={`rounded-pill border px-4 py-2.5 text-small font-semibold transition-colors duration-200 ${
                  on
                    ? 'border-accent bg-accent text-ink'
                    : 'border-line/15 text-bone-400 hover:border-line/30 hover:text-bone'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {err('areas')}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="stage" className={LABEL}>
            Stage <span className="font-medium text-bone-400">({contactCopy.optional})</span>
          </label>
          <select id="stage" name="stage" defaultValue="" className={`${FIELD} mt-2`}>
            <option value="">Choose one</option>
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="timeframe" className={LABEL}>
            Timeframe <span className="font-medium text-bone-400">({contactCopy.optional})</span>
          </label>
          <select id="timeframe" name="timeframe" defaultValue="" className={`${FIELD} mt-2`}>
            <option value="">Choose one</option>
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className={LABEL}>
          Anything else? <span className="font-medium text-bone-400">({contactCopy.optional})</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={`${FIELD} mt-2 resize-y`}
          placeholder="Rough size, access, when you need it done"
        />
      </div>

      {/* Consent. Unticked by default, and kept separate from the enquiry. */}
      <div className="rounded-lg border border-line/10 bg-ink-800 p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(event) => setOptIn(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span className="text-small leading-relaxed text-bone-400">
            {MARKETING_CONSENT_TEXT}
          </span>
        </label>
        <p className="mt-4 border-t border-line/10 pt-4 text-small leading-relaxed text-bone-400">
          {ENQUIRY_NOTICE}{' '}
          <Link to="/privacy" className="link-wipe font-semibold text-bone">
            privacy policy
          </Link>
          .
        </p>
      </div>

      {status === 'failed' && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-4 text-small text-bone"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          {failure}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn btn-primary disabled:opacity-60"
        >
          {status === 'sending' ? contactCopy.submitting : contactCopy.submit}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </button>
        <p className="text-small text-bone-400">{contactCopy.responseTime}</p>
      </div>

      <p className="text-small text-bone-400">
        {contactCopy.preferCall}{' '}
        <Link to="/book" className="link-wipe font-semibold text-bone">
          {contactCopy.bookLink}
        </Link>
        , or call{' '}
        <a href={site.phone.tel} className="link-wipe font-semibold text-bone">
          {site.phone.display}
        </a>
        .
      </p>
    </form>
  )
}
