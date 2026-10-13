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
| `index.html`, `about-us/index.html`, … | One pre-rendered file per page, nineteen in all, at the addresses the old WordPress site used. |
| `404.html` | The not-found page. Hosts serve it with a 404 status for any address that has no file. |
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
| `staging` | `true` on the staging domain. `npm run build:live` ships it as `false`. Do not change it by hand: see "The go-live switch" below. |

Leave anything you are not using as its placeholder. Unset values are handled
deliberately rather than ignored:

- **No `leadWebhook`**: the quote form refuses to submit and shows a visible
  error with the phone number. It never reports a false success, so no lead is
  ever silently lost.
- **No `bookingCalendarUrl`**: `/book` shows a "give us a call" panel instead of
  an empty iframe, so the page still converts.
- **No measurement IDs**: that vendor's script is never loaded at all.

## 3. Check deep links

Open `https://yourdomain.com/contact-us/` directly (type it in, do not click
through). It should load the contact page. Every real address has its own
file (`contact-us/index.html`), and every common host serves that file for
`/contact-us/`: Netlify, Cloudflare Pages, Vercel, GitHub Pages, nginx with
`try_files $uri $uri/index.html /404.html` and Apache with `DirectoryIndex`
all do.

For addresses that have no file, most hosts pick up two files automatically:
`404.html` (Cloudflare Pages, Netlify, GitHub Pages and others), served with a
404 status, and `_redirects` (Netlify, Cloudflare Pages), which carries the
redirects for old and merged addresses. Check that
`https://yourdomain.com/no-such-page/` shows the not-found page and that the
browser's network tab reports a 404, not a 200.

If a real page still 404s, change one line in `config.js`:

```js
router: 'hash',
```

URLs become `/#/contact` instead of `/contact`. That works on any static host
with zero server configuration, at a real cost: hash URLs are not separate
pages to a search engine, which throws away the pre-rendering. Prefer fixing
the host.

## 4. The go-live switch (noindex, nofollow)

Staging is private on purpose: every page carries
`<meta name="robots" content="noindex, nofollow">` and `robots.txt` says
`Disallow: /`. **There is one switch to make the site indexable:
`npm run build:live`** (instead of `npm run build`). It does three things
together, so they cannot disagree:

1. Pre-renders every page **without** the noindex tag. The tag is never typed
   into a page by hand; it is only added when the build is a staging build.
   The only pages that keep it are the ones that should: the thank-you pages,
   the 404 page and the internal `/heroes` pages.
2. Leaves `robots.txt` open (the staging build overwrites it with a block).
3. Ships `config.js` with `staging: false`.

The build then checks its own output and **fails** if any page other than
those still has a noindex tag, if `robots.txt` still blocks everything, or if
`config.js` still says `staging: true`. A staging build is checked the other
way round (every page must be noindex).

Why `config.js` alone is not the switch: it is read in the browser, but the
pre-rendered HTML is what crawlers read first, and that is fixed at build time.
Flipping only `config.js` on a staging build would leave noindex in every
page's source.

### Go-live checklist

1. `npm run build:live` (not `npm run build`). It must finish with
   `Pre-rendered 20 of 20 routes (live)` and no `FAIL` lines.
2. Upload `dist/`, then fill in the placeholders in the server's `config.js`
   (step 2). Leave `staging: false`.
3. Open `https://yourdomain.com/robots.txt`: it must not say `Disallow: /`.
4. View the source of the home page: no `<meta name="robots">` tag, and the
   title, description and body copy are all there.

To take a copy back to private (a new staging site), build with
`npm run build` and upload that.

## Local development

For local work only, `.env.local` still works and is read when `config.js` is
left as placeholders. Copy `.env.example` to `.env.local`. That file is
gitignored and is never part of a deployment.

## What is safe to expose

Everything in `config.js` ships to the browser and is public. That is correct
for measurement IDs and for a Systemations inbound webhook, which is an
unauthenticated write-only endpoint. **Never put an API key or private token
there.**
