/*
 * ==========================================================================
 * SITE CONFIGURATION  ·  edit this file on the server after deploying.
 * ==========================================================================
 *
 * No rebuild is needed. Every page loads this file, so one edit here reaches
 * the whole site. Replace each __PLACEHOLDER__ with the real value. Anything
 * still showing a placeholder is treated as not set: the quote form shows a
 * visible error with the phone number rather than posting leads into a dead
 * URL, and the booking page shows a call-us panel instead of an empty frame.
 *
 * Everything in this file ships to the browser and is public. That is fine
 * for measurement IDs and for a Systemations inbound webhook, which is an
 * unauthenticated write-only endpoint. Never put an API key or private token
 * here.
 *
 * leadWebhook          Systemations > Automation > Workflows > Add Trigger >
 *                      Inbound Webhook. Copy the URL it gives you.
 * bookingCalendarUrl   Systemations > Calendars > (phone consult) > Share >
 *                      Embed. Copy the src URL out of the embed code.
 * ga4Id                GA4 measurement ID, G-XXXXXXX.
 * googleAdsId          AW-XXXXXXXXX.
 * googleAdsQuoteLabel  Conversion label, as AW-XXXXXXXXX/AbC-labelhere.
 * googleAdsBookingLabel Same, for the booking conversion.
 * metaPixelId          Meta pixel ID.
 * router               "history" for clean URLs like /contact. If /contact
 *                      404s on the host, switch to "hash" and links become
 *                      /#/contact, which works anywhere.
 * staging              true keeps every page out of search results. Set to
 *                      false at go-live, together with `npm run build:live`.
 */
window.SPRAYIT_CONFIG = {
  leadWebhook: '__LEAD_WEBHOOK__',
  bookingCalendarUrl: '__BOOKING_CALENDAR_URL__',
  ga4Id: '__GA4_ID__',
  googleAdsId: '__GOOGLE_ADS_ID__',
  googleAdsQuoteLabel: '__GOOGLE_ADS_QUOTE_LABEL__',
  googleAdsBookingLabel: '__GOOGLE_ADS_BOOKING_LABEL__',
  metaPixelId: '__META_PIXEL_ID__',
  router: 'history',
  staging: true,
}
