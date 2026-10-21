// Settings that change per client or per deploy. One file, easy to find.

export const BUSINESS = {
  name: 'SprayIT Solutions',
  /** Rachael's name and mobile go on everything (call of 2 Oct 2026). */
  contactName: 'Rachael',
  contactPhone: '04XX XXX XXX',
  email: 'quotes@example.com',
  abn: 'ABN to be confirmed',
  region: 'Melbourne, Victoria',
  /** Real values come from the client later. */
  placeholder: true,
}

/** GST rate used for display. Prices are entered ex GST. */
export const GST_RATE = 0.1

/**
 * Demo mode: Send, Accept and Decline only change the saved status in this
 * browser. Nothing is emailed and nothing talks to the platform. Set to false
 * when real sending is wired in.
 */
export const DEMO = true

/** Shows the thin "demo" bar above the customer view. Hide it in production. */
export const SHOW_DEMO_BAR = true
