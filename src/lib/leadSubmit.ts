import { integrations, isConfigured } from '@/config/integrations'
import { attributionFields } from '@/lib/attribution'

/**
 * Delivery of a quote enquiry to Systemations.
 *
 * Posts JSON to a Systemations inbound webhook. The webhook is an unauthenticated,
 * write-only endpoint, which is why it is safe to call straight from the
 * browser with no backend of our own.
 *
 * On CORS: Systemations's hook endpoints answer the preflight for JSON POSTs, so this
 * works from the browser. If that ever changes, the failure is reported to the
 * visitor rather than swallowed, and the fix is to point `VITE_CRM_LEAD_WEBHOOK`
 * at a one-line serverless proxy. What this deliberately does not do is fall
 * back to a `no-cors` request: that always resolves opaque, so it would report
 * success for leads that never arrived.
 */

const TIMEOUT_MS = 12_000

export interface LeadPayload {
  firstName: string
  lastName: string
  phone: string
  email: string
  postcode: string
  /** Optional. Asked for so the assessment can be booked without a call back. */
  street: string
  suburb: string
  propertyType: string
  areas: string[]
  stage: string
  timeframe: string
  message: string
  /** Marketing opt-in. Separate from the enquiry itself. */
  marketingOptIn: boolean
  /** Exact wording the visitor agreed to, stored as consent evidence. */
  consentText: string
}

/**
 * Australian mobile and landline numbers to E.164.
 *
 * The CRM matches a person across web, SMS, chat and voice on this value, so
 * one canonical format matters more than being clever. Anything unrecognised
 * is passed through untouched rather than mangled.
 */
export function toE164AU(input: string): string {
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('61') && digits.length >= 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+61${digits.slice(1)}`
  return input.trim()
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' | 'network' | 'server'; detail?: string }

export async function submitLead(lead: LeadPayload): Promise<SubmitResult> {
  if (!isConfigured.leadWebhook) {
    return { ok: false, reason: 'unconfigured' }
  }

  // Destructured rather than spread: the camelCase originals would otherwise
  // ride along beside their snake_case equivalents and give Systemations two fields
  // meaning the same thing to map.
  const { marketingOptIn, consentText, ...rest } = lead

  const body = {
    ...rest,
    // Systemations keys contacts on first and last name separately, and every
    // message in the kit greets people by first name. Sending the joined name
    // as well means an import that expects one field still finds one.
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    phone: toE164AU(lead.phone),
    phone_raw: lead.phone,
    areas: lead.areas.join(', '),
    source: 'website',
    form: 'quote_request',
    // Consent evidence. The Spam Act cares about what was shown and when, not
    // just that a box was ticked, so the wording travels with the record.
    consent_marketing: marketingOptIn ? 'yes' : 'no',
    consent_text: consentText,
    consent_at: new Date().toISOString(),
    consent_page: typeof window !== 'undefined' ? window.location.href : '',
    submitted_at: new Date().toISOString(),
    page_title: typeof document !== 'undefined' ? document.title : '',
    ...attributionFields(),
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(integrations.leadWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) {
      return { ok: false, reason: 'server', detail: `HTTP ${response.status}` }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: 'network',
      detail: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}
