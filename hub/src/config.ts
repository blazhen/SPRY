// Settings that change per client or per deploy. One file, easy to find.

export const BUSINESS = {
  name: 'SprayIT Solutions',
  /** The owner's name and mobile go on everything (call of 2 Oct 2026). */
  contactName: 'Glenn',
  contactPhone: '04XX XXX XXX',
  email: 'quotes@example.com',
  abn: 'ABN to be confirmed',
  region: 'Melbourne, Victoria',
  /** Real values come from the client later. */
  placeholder: true,
}

/** The person using the Hub. Drives the To do queue. */
export const OWNER = {
  id: 'glenn',
  name: 'Glenn',
  placeholder: true,
}

/** GST rate used for display. Prices are entered ex GST. */
export const GST_RATE = 0.1

/**
 * GST is worked out once on the subtotal and rounded half up to the cent.
 * OPEN QUESTION for Zen: confirm with the accountant. Show the note next to totals.
 */
export const GST_ROUNDING_TO_CONFIRM = true
export const GST_ROUNDING_NOTE = 'GST is worked out once on the subtotal and rounded to the nearest cent. To be confirmed.'

/** Default quote validity. To confirm with the client: validity, or payment terms? */
export const VALID_DAYS_DEFAULT = 60
export const VALID_DAYS_TO_CONFIRM = true

/**
 * Stage roles. Automation never uses stage names directly, only these roles, matched by name
 * (case-insensitive) against the pipeline's stage list (see lib/format.ts roleIndex).
 * queue: jobs waiting for a quote (the To do list). sent: where a sent quote moves a job.
 * accepted: where an accepted quote moves a job.
 */
export const STAGE_ROLE = { queue: 'Quoting', sent: 'Quote Sent', accepted: 'Quote Accepted' } as const

/** Up to this many companies can be attached to one job. */
export const MAX_COMPANIES = 10

/**
 * Demo mode: Send, Accept and Decline only change the saved status in this
 * browser. Nothing is emailed and nothing talks to the platform. Set to false
 * when real sending is wired in.
 */
export const DEMO = true

/**
 * Where data comes from. 'mock' keeps everything in this browser (localStorage).
 * 'live' talks to the Hub proxy under PROXY_URL and the staff app sits behind the access gate.
 * Set VITE_DATA_SOURCE=mock for mock mode. Default is 'live'.
 */
export const DATA_SOURCE: 'mock' | 'live' = import.meta.env.VITE_DATA_SOURCE === 'mock' ? 'mock' : 'live'

/** Base address of the proxy. '' means same origin (the normal case). No trailing slash. */
export const PROXY_URL: string = ((import.meta.env.VITE_PROXY_URL as string | undefined) ?? '').replace(/\/+$/, '')

/** Shows the thin "demo" bar above the customer view. Hide it in production. */
export const SHOW_DEMO_BAR = true
