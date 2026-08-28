/**
 * Marketing attribution.
 *
 * Captures where a visitor came from and carries it through to the CRM on every
 * form submission. Without this you get bookings with no idea which channel
 * produced them.
 *
 * Two touches are stored, because they answer different questions:
 *   first  - what originally introduced this person (localStorage, persistent)
 *   last   - what brought them back the day they converted (sessionStorage)
 *
 * First touch is written once and never overwritten. That is the whole point:
 * if someone arrives from a Google ad, leaves, and returns a week later by
 * typing the domain, the ad still deserves the credit.
 */

const FIRST_KEY = 'sprayit:attr:first'
const LAST_KEY = 'sprayit:attr:last'

/** Click identifiers worth keeping, alongside the standard UTM set. */
const PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid', // Google Ads
  'wbraid', // Google Ads, web-to-app
  'gbraid', // Google Ads, app-to-web
  'fbclid', // Meta
  'msclkid', // Microsoft
  'ttclid', // TikTok
] as const

export interface Touch {
  params: Record<string, string>
  /** Document referrer, or 'direct'. */
  referrer: string
  /** Path the visitor first landed on, which is often the best ad clue. */
  landingPath: string
  /** ISO timestamp. */
  at: string
}

function readTouch(storage: Storage, key: string): Touch | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as Touch) : null
  } catch {
    // Private browsing, quota, or corrupt JSON. Attribution is nice to have,
    // never a reason to break a form.
    return null
  }
}

function currentTouch(): Touch {
  const search = new URLSearchParams(window.location.search)
  const params: Record<string, string> = {}
  for (const key of PARAM_KEYS) {
    const value = search.get(key)
    if (value) params[key] = value.slice(0, 200)
  }

  let referrer = 'direct'
  if (document.referrer) {
    try {
      const url = new URL(document.referrer)
      // Internal navigation is not a referral.
      if (url.hostname !== window.location.hostname) referrer = document.referrer
    } catch {
      referrer = document.referrer
    }
  }

  return {
    params,
    referrer,
    landingPath: window.location.pathname + window.location.search,
    at: new Date().toISOString(),
  }
}

/** True when this visit carries any campaign signal at all. */
function isMeaningful(touch: Touch): boolean {
  return Object.keys(touch.params).length > 0 || touch.referrer !== 'direct'
}

/**
 * Record this visit. Safe to call on every route change; only the first call
 * of a session can write the last-touch record, and only the very first visit
 * ever writes the first-touch one.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  const touch = currentTouch()

  try {
    if (!localStorage.getItem(FIRST_KEY)) {
      localStorage.setItem(FIRST_KEY, JSON.stringify(touch))
    }
    // Overwrite last touch only when this visit actually says something, so an
    // internal navigation cannot wipe the campaign that brought them in.
    if (!sessionStorage.getItem(LAST_KEY) || isMeaningful(touch)) {
      sessionStorage.setItem(LAST_KEY, JSON.stringify(touch))
    }
  } catch {
    /* storage unavailable; carry on without attribution */
  }
}

/** Flattened attribution for the CRM payload. */
export function attributionFields(): Record<string, string> {
  const first = readTouch(localStorage, FIRST_KEY)
  const last = readTouch(sessionStorage, LAST_KEY) ?? first
  const out: Record<string, string> = {}

  if (first) {
    out.first_touch_at = first.at
    out.first_touch_referrer = first.referrer
    out.first_touch_landing = first.landingPath
    for (const [k, v] of Object.entries(first.params)) out[`first_${k}`] = v
  }
  if (last) {
    out.last_touch_referrer = last.referrer
    out.last_touch_landing = last.landingPath
    // The click IDs the ad platforms actually match on come from the last touch.
    for (const [k, v] of Object.entries(last.params)) out[k] = v
  }
  return out
}
