import { integrations } from '@/config/integrations'

/**
 * Measurement loading and conversion events.
 *
 * Every vendor is optional and loads only when its ID is configured, so a
 * developer running the site with an empty `.env.local` ships no third-party
 * script at all. Nothing here throws: a blocked or failed tag must never take
 * a form submission down with it.
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string }
    _fbq?: unknown
  }
}

let started = false

function injectScript(src: string): void {
  const tag = document.createElement('script')
  tag.async = true
  tag.src = src
  document.head.appendChild(tag)
}

function startGoogle(): void {
  const ids = [integrations.ga4Id, integrations.googleAdsId].filter(Boolean)
  if (ids.length === 0) return

  window.dataLayer = window.dataLayer || []
  // Must be a real `function` using `arguments`: gtag relies on the raw
  // arguments object, so an arrow with rest params serialises differently.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }
  window.gtag('js', new Date())
  // One loader is enough; every configured ID registers against it.
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`)
  for (const id of ids) window.gtag('config', id)
}

function startMeta(): void {
  const id = integrations.metaPixelId
  if (!id) return

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fbq: any = function (...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args)
  }
  fbq.queue = []
  fbq.loaded = true
  fbq.version = '2.0'
  window.fbq = fbq
  window._fbq = fbq
  /* eslint-enable @typescript-eslint/no-explicit-any */

  injectScript('https://connect.facebook.net/en_US/fbevents.js')
  window.fbq?.('init', id)
  window.fbq?.('track', 'PageView')
}

/** Load whatever is configured. Idempotent. */
export function startAnalytics(): void {
  if (started || typeof window === 'undefined') return
  started = true
  try {
    startGoogle()
    startMeta()
  } catch {
    /* a blocked tag must never break the page */
  }
}

/** SPA route change. GA4's automatic page_view only fires on first load. */
export function trackPageView(path: string): void {
  try {
    if (integrations.ga4Id) {
      window.gtag?.('event', 'page_view', {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      })
    }
    window.fbq?.('track', 'PageView')
  } catch {
    /* ignore */
  }
}

type Conversion = 'quote_submitted' | 'call_booked'

/**
 * A completed lead. Fired from the thank-you pages rather than the submit
 * handler, so a conversion is only ever counted once the visitor actually
 * landed on the confirmation.
 */
export function trackConversion(kind: Conversion): void {
  try {
    window.gtag?.('event', kind)

    const label =
      kind === 'quote_submitted'
        ? integrations.googleAdsQuoteLabel
        : integrations.googleAdsBookingLabel
    if (label) window.gtag?.('event', 'conversion', { send_to: label })

    window.fbq?.('track', kind === 'quote_submitted' ? 'Lead' : 'Schedule')
  } catch {
    /* ignore */
  }
}
