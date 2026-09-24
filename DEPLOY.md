# Deploying / transferring this site

The built site is static files: one HTML file per page, with the page's own
title, description and content already in it, plus the app that takes over
once it loads. Everything it needs to talk to Systemations is configured
**after** deployment, by editing one file, `config.js`. There is no build step
to re-run on the host and no environment variables to set there.

## 1. Build

```bash
npm install
npx playwright install chromium   # once per machine; see below
npm run build                     # staging build: every page carries noindex
npm run build:live                # the real thing: indexable
```

Upload the entire contents of `dist/` to the host.

The last step of the build opens every page in a headless browser and saves
what it rendered, so `dist/residential/index.html` contains the Residential
page rather than an empty shell. That step needs a browser: Playwright's own
(`npx playwright install chromium`, a one-off download), or an installed
Chrome or Edge, whichever it finds first. Without one the build stops and
says so rather than shipping empty pages.

What `dist/` contains:

| Path | What it is |
| --- | --- |
| `index.html`, `about/index.html`, … | One pre-rendered file per page, sixteen in all. |
| `404.html` | The untouched app shell. Unknown addresses fall back to it and the app shows its not-found page. |
| `config.js` | The runtime configuration, edited on the server (step 2). |
| `sitemap.xml` | Generated from the same page list, so it can never list a page that does not exist. |
| `robots.txt` | The staging build writes one that blocks everything. The live build does not. |
| `fonts/` | The two typefaces, self-hosted. |

## 2. Configure

Open `config.js` on the server. Replace each `__PLACEHOLDER__` with the real
value. Every page loads this one file, so one edit reaches the whole site.

| Key | Where it comes from |
| --- | --- |
| `leadWebhook` | Systemations → Automation → Workflows → Add Trigger → **Inbound Webhook**. Copy the URL. |
| `bookingCalendarUrl` | Systemations → Calendars → your phone-consult calendar → Share → **Embed**. Copy the `src` URL out of the embed code. |
| `ga4Id` | GA4 measurement ID, `G-XXXXXXX`. |
| `googleAdsId` | `AW-XXXXXXXXX`. |
| `googleAdsQuoteLabel` | Conversion, as `AW-XXXXXXXXX/AbC-labelhere`. |
| `googleAdsBookingLabel` | Same, for the booking conversion. |
| `metaPixelId` | Meta pixel ID. |
| `router` | Leave as `'history'` unless step 3 says otherwise. |
| `staging` | `true` on the staging domain. `false` at go-live, together with `npm run build:live`. |

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
through). It should load the contact page. Every real address has its own
file (`contact/index.html`), and every common host serves that file for
`/contact`: Netlify, Cloudflare Pages, Vercel, GitHub Pages, nginx with
`try_files $uri $uri/index.html /404.html` and Apache with `DirectoryIndex`
all do.

For addresses that have no file, the build ships two fallbacks that most hosts
pick up automatically: `404.html` (GitHub Pages, Cloudflare Pages and others)
and `_redirects` (Netlify, Cloudflare Pages), which also carries the redirects
from the old WordPress addresses.

If a real page still 404s, change one line in `config.js`:

```js
router: 'hash',
```

URLs become `/#/contact` instead of `/contact`. That works on any static host
with zero server configuration, at a real cost: hash URLs are not separate
pages to a search engine, which throws away the pre-rendering. Prefer fixing
the host.

## 4. Go-live checklist

1. `npm run build:live` (not `npm run build`).
2. In `config.js` on the server, set `staging: false`.
3. Confirm `robots.txt` no longer says `Disallow: /`.
4. View the source of the home page: the `<meta name="robots">` tag must be
   absent, and the title, description and body copy must all be there.

## Local development

For local work only, `.env.local` still works and is read when `config.js` is
left as placeholders. Copy `.env.example` to `.env.local`. That file is
gitignored and is never part of a deployment.

## What is safe to expose

Everything in `config.js` ships to the browser and is public. That is correct
for measurement IDs and for a Systemations inbound webhook, which is an
unauthenticated write-only endpoint. **Never put an API key or private token
there.**
