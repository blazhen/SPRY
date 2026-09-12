# Deploying / transferring this site

The built site is static files. Everything it needs to talk to Systemations is
configured **after** deployment, by editing one block in `index.html`. There is
no build step to re-run and no environment variables to set on the host.

## 1. Build

```bash
npm install
npm run build
```

Upload the entire contents of `dist/` to the host.

## 2. Configure

Open `index.html` on the server and find the block near the top marked
`SITE CONFIGURATION`. Replace each `__PLACEHOLDER__` with the real value:

| Key | Where it comes from |
| --- | --- |
| `leadWebhook` | Systemations → Automation → Workflows → Add Trigger → **Inbound Webhook**. Copy the URL. |
| `bookingCalendarUrl` | Systemations → Calendars → your phone-consult calendar → Share → **Embed**. Copy the `src` URL out of the embed code. |
| `ga4Id` | GA4 measurement ID, `G-XXXXXXX`. |
| `googleAdsId` | `AW-XXXXXXXXX`. |
| `googleAdsQuoteLabel` | Conversion, as `AW-XXXXXXXXX/AbC-labelhere`. |
| `googleAdsBookingLabel` | Same, for the booking conversion. |
| `metaPixelId` | Meta pixel ID. |

Leave anything you are not using as its placeholder. Unset values are handled
deliberately rather than ignored:

- **No `leadWebhook`**: the quote form refuses to submit and shows a visible
  error with the phone number. It never reports a false success, so no lead is
  ever silently lost.
- **No `bookingCalendarUrl`**: `/book` shows a "give us a call" panel instead of
  an empty iframe, so the page still converts.
- **No measurement IDs**: that vendor's script is never loaded at all.

## 3. Check deep links

Open `https://yourdomain.com/contact` directly (type it in, do not click
through). One of two things happens:

- **It loads.** The host handles single page app routing. Nothing to do.
- **It 404s.** The host serves files literally and does not know that every
  route lives in `index.html`.

The build already ships two fixes that most hosts pick up automatically:
`404.html` (a copy of `index.html`, used by GitHub Pages, Cloudflare Pages and
others) and `_redirects` (Netlify, Cloudflare Pages).

If it still 404s, change one line in the config block:

```js
router: 'hash',
```

URLs become `/#/contact` instead of `/contact`. That works on any static host
with zero server configuration. The trade-off is real, so prefer a proper
rewrite where the host supports one: hash URLs are weaker for SEO, and the
clean `/book` link is nicer for the assistant to text or read aloud.

## Local development

For local work only, `.env.local` still works and is read when the runtime
block is left as placeholders. Copy `.env.example` to `.env.local`. That file is
gitignored and is never part of a deployment.

## What is safe to expose

Everything in the config block ships to the browser and is public. That is
correct for measurement IDs and for a Systemations inbound webhook, which is an
unauthenticated write-only endpoint. **Never put an API key or private token
there.**
