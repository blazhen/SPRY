import type { SectionIntro } from '@/data/content'

/**
 * Quote form content and consent wording.
 *
 * The consent text is versioned deliberately. Under the Spam Act 2003 what
 * matters is what a person was actually shown when they agreed, so the exact
 * string is stored against the CRM record. If you edit MARKETING_CONSENT_TEXT,
 * bump the version: old records must keep pointing at the wording their owner
 * actually saw.
 */

export const contactIntro: SectionIntro = {
  eyebrow: 'Get a quote',
  headingLines: ['Tell us what', 'needs sealing.'],
  accentWord: 'sealing',
  lede: 'A few details is all it takes. We will come back to you with honest advice on whether spray foam is the right answer, what it involves and what it costs.',
}

export const contactCopy = {
  submit: 'Request my free quote',
  submitting: 'Sending…',
  required: 'Required',
  optional: 'Optional',
  /** Shown when the webhook is not configured, so a lead is never lost quietly. */
  unconfigured:
    'Our online form is not accepting submissions right now. Please call us on 0428 26 36 26 and we will sort it out straight away.',
  networkError:
    'That did not send. Please check your connection and try again, or call us on 0428 26 36 26.',
  responseTime: 'We reply to every enquiry, usually the same working day.',
  preferCall: 'Would rather talk it through?',
  bookLink: 'Book a 15 minute phone call',
}

export const CONSENT_VERSION = 'v1-2026-08'

/** Shown beside the unticked marketing checkbox, and stored with the record. */
export const MARKETING_CONSENT_TEXT =
  'I agree to receive SMS and email updates from Spray It Solutions about quotes, offers and services. I can opt out at any time by replying STOP or using the unsubscribe link.'

/**
 * Always shown, never a checkbox. Replying to an enquiry is consent the
 * enquiry itself implies, so it is stated rather than asked for.
 */
export const ENQUIRY_NOTICE =
  'By submitting this form you agree we can contact you about this enquiry by phone, SMS or email. See our'

export interface FieldOption {
  value: string
  label: string
}

export const propertyTypes: FieldOption[] = [
  { value: 'home', label: 'Home' },
  { value: 'new-build', label: 'New build' },
  { value: 'shed', label: 'Shed or garage' },
  { value: 'factory', label: 'Factory or warehouse' },
  { value: 'farm', label: 'Farm or agricultural' },
  { value: 'other', label: 'Something else' },
]

/** What actually needs insulating. Drives the quote and the crew required. */
export const areaOptions: FieldOption[] = [
  { value: 'roof', label: 'Roof or ceiling' },
  { value: 'walls', label: 'Walls' },
  { value: 'underfloor', label: 'Underfloor' },
  { value: 'whole', label: 'Whole property' },
  { value: 'unsure', label: 'Not sure yet' },
]

export const stageOptions: FieldOption[] = [
  { value: 'existing', label: 'Existing building (retrofit)' },
  { value: 'construction', label: 'Under construction' },
  { value: 'planning', label: 'Still planning' },
]

export const timeframeOptions: FieldOption[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1-3-months', label: 'Next 1 to 3 months' },
  { value: '3-plus-months', label: '3 months or more' },
  { value: 'researching', label: 'Just researching' },
]

export const thanks = {
  quote: {
    eyebrow: 'Enquiry received',
    title: 'Thanks, we have got it.',
    lede: 'One of the family will be in touch, usually the same working day. If it is urgent, call us on 0428 26 36 26.',
  },
  booked: {
    eyebrow: 'Call booked',
    title: 'You are in the diary.',
    lede: 'You will get a confirmation by SMS and email with the time and a reminder before the call. If you need to change it, use the link in that message.',
  },
} as const
