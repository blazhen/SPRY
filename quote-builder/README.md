# Quote Builder (SprayIT Solutions)

The user interface of the quote builder, with mock data. No backend, no real API calls, nothing is sent anywhere.
It is a small separate project: its own `package.json`, a static build, drafts kept in the browser's localStorage.

## What it does

- **Quotes list** with status filters (Draft, Sent, Accepted, Declined, Expired), search, sort, and quotes grouped by job. A job can hold several quotes. Add-on quotes are flagged.
- **Editor** with a live preview beside the form (a tab switch on narrow widths): contact picker (searchable), job, line items, optional upgrades, payment schedule, notes, terms, validity date. Print / save as PDF.
- **Customer view** (`#/view/:id`): the private page the customer opens from the email. Tick upgrades, the total updates live, Accept (with a confirm step), accepted confirmation, Decline, expired state.
- **Statuses**: a quote stays Draft until Send is pressed and confirmed. In this version Send, Accept and Decline only change the status saved in this browser.
- **Manual acceptance**: staff can record an acceptance that did not come from the email click, by phone or by purchase order (with its number), from the editor of a sent or expired quote.
- **Alternative options vs add-ons**: a quote on a job that already has quotes is a separate quote, an alternative option (the customer accepts only one, and accepting one closes the other sent options) or an add-on (never restarts the welcome messages). Options and add-ons are flagged in the list.
- **Payment due rules**: each payment stage has a due rule (1 business day before the job for open-cell, 7 days before for special-order foam, on acceptance, on completion, other), shown on the quote.
- **Templates**: save a quote's structure (sections, products, upgrade options, wording, payment stages) without any customer or price; load one into a new quote.

## Run

```
npm install
npm run dev        # development
npm run build      # type check and static build into dist/
npm run preview    # serve dist/ locally
node scripts/shots.mjs   # screenshots at 360, 768 and 1280 (light and dark) into shots/, needs a build first
```

## Embedding in the platform (custom menu link)

The build uses a relative base and hash routes (`#/`, `#/quote/:id`, `#/view/:id`, `#/templates`), so it runs from any folder or address with no server rewrites. It sets no frame-blocking headers and uses no cookies. If the host blocks localStorage inside the frame, a notice says drafts last only for that visit.
Upload the contents of `dist/` to any static host and use that address as the menu link. Do not add `X-Frame-Options` or a `frame-ancestors` rule that excludes the platform's address. See `DEPLOY.md`.

## Settings

`src/config.ts`: business name, Rachael's name and mobile, GST rate, the `DEMO` flag, and the demo bar flag. Rachael's mobile, the email and the ABN are placeholders until confirmed.

## Placeholders (all flagged `placeholder: true` in the data)

- All prices and product names in `src/data/mock.ts` (real SPRY prices come from Glenn).
- All contacts, jobs, addresses, phone numbers and emails are made up.
- Rachael's mobile, the quote email address and the ABN in `src/config.ts`.
- The payment stage wording and default terms text.

## Licences and credits

- Clash Display and Satoshi (Fontshare), self-hosted, ITF Free Font License. No credit needed.
- lucide-react icons, ISC licence.
- The SprayIT logo files come from the client's brand assets.

## Not built yet (separate steps)

Real contacts, jobs and quotes from the platform, real Send (email), real Accept (webhook), a real private link or token on the customer page, and invoices. The data and status functions live in `src/lib/store.ts` so the swap is in one place.
