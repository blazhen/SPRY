/**
 * External service configuration.
 *
 * Resolved at RUNTIME, not at build time. This matters: `import.meta.env.VITE_*`
 * values are compiled into the bundle when `npm run build` runs, so once the
 * built site is handed to a host that has no build step, they can never be
 * changed again. Anyone editing an env var on the server would see no effect.
 *
 * So the real source of truth is a plain object on `window`, written by an
 * inline script in index.html. After deployment that block can be edited
 * directly in the served HTML, with no toolchain and no rebuild.
 *
 * Precedence, first non-empty wins:
 *   1. window.SPRAYIT_CONFIG   (edit in index.html after deploy)
 *   2. import.meta.env.VITE_*  (local development via .env.local)
 *
 * Everything here ships to the browser and is public. That is correct for
 * measurement IDs and for a Systemations inbound webhook, which is an
 * unauthenticated write-only endpoint. Never put an API key here.
 */

export interface RuntimeConfig {
  leadWebhook?: string
  bookingCalendarUrl?: string
  ga4Id?: string
  googleAdsId?: string
  googleAdsQuoteLabel?: string
  googleAdsBookingLabel?: string
  metaPixelId?: string
  /**
   * 'history' gives clean URLs (/contact) but needs the host to serve
   * index.html for unknown paths. 'hash' (/#/contact) works on any static host
   * with no server configuration at all. See index.html for the trade-off.
   */
  router?: 'history' | 'hash'
  /**
   * Whether this deployment is the staging copy.
   *
   * Defaults to TRUE, deliberately. While the site sits on a staging domain
   * awaiting sign-off, search engines must not index it: a crawled staging
   * copy competes with the live domain for the same content and can surface an
   * unfinished page in results. Getting this wrong in the safe direction costs
   * a day of indexing; getting it wrong the other way is much harder to undo.
   *
   * Set to false only at go-live. See the checklist in DEPLOY.md.
   */
  staging?: boolean
}

declare global {
  interface Window {
    SPRAYIT_CONFIG?: RuntimeConfig
  }
}

const env = import.meta.env

/**
 * Trim, and treat both an empty string and an unreplaced `__PLACEHOLDER__`
 * token as "not configured". The placeholder check is what stops a freshly
 * deployed, not-yet-edited index.html from posting leads into a dead URL.
 */
const read = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const value = candidate.trim()
    if (!value) continue
    if (value.startsWith('__') && value.endsWith('__')) continue
    return value
  }
  return ''
}

const runtime = (): RuntimeConfig =>
  (typeof window !== 'undefined' && window.SPRAYIT_CONFIG) || {}

export const integrations = {
  /** Systemations inbound webhook that receives quote submissions. */
  get leadWebhook() {
    return read(runtime().leadWebhook, env.VITE_Systemations_LEAD_WEBHOOK)
  },
  /**
   * Full embed URL of the Systemations phone-consult calendar. The assistant books into
   * this same calendar, so the site must never schedule independently of it.
   */
  get bookingCalendarUrl() {
    return read(runtime().bookingCalendarUrl, env.VITE_Systemations_BOOKING_URL)
  },
  get ga4Id() {
    return read(runtime().ga4Id, env.VITE_GA4_ID)
  },
  get googleAdsId() {
    return read(runtime().googleAdsId, env.VITE_GOOGLE_ADS_ID)
  },
  get googleAdsQuoteLabel() {
    return read(runtime().googleAdsQuoteLabel, env.VITE_GOOGLE_ADS_QUOTE_LABEL)
  },
  get googleAdsBookingLabel() {
    return read(runtime().googleAdsBookingLabel, env.VITE_GOOGLE_ADS_BOOKING_LABEL)
  },
  get metaPixelId() {
    return read(runtime().metaPixelId, env.VITE_META_PIXEL_ID)
  },
  /** Defaults to clean URLs; only falls back to hashes when asked. */
  get router(): 'history' | 'hash' {
    return runtime().router === 'hash' ? 'hash' : 'history'
  },
  /**
   * Staging unless explicitly told otherwise. Only the literal `false` turns
   * indexing on, so a missing or malformed value keeps the site private.
   */
  get isStaging(): boolean {
    return runtime().staging !== false
  },
}

/**
 * Getters rather than constants, because the values are read from `window` and
 * a constant would freeze whatever was there when this module first imported.
 */
export const isConfigured = {
  get leadWebhook() {
    return integrations.leadWebhook.length > 0
  },
  get booking() {
    return integrations.bookingCalendarUrl.length > 0
  },
  get analytics() {
    return integrations.ga4Id.length > 0 || integrations.metaPixelId.length > 0
  },
}
