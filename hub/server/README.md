# Quote Hub server proxy

Framework-neutral handlers (Web standard Request/Response) between the Hub (static React app) and the Systemations CRM API.
The CRM token never reaches the browser. Hub shapes only (Contact, Job, Pipeline, Invoice, field definitions), never raw CRM objects.
Exact copy steps for the AI Studio repo: `COPY-INSTRUCTIONS.md`. Routes and shapes: `API.md`.

## Layout
- `lib/` env, auth, http helpers, CRM mappers and cache (`crm.ts`, `crm-extended.ts`), customer link (`public-link.ts`, `public-quote.ts`), money rules (`quote-calc.ts`).
- `handlers/` one file per route: auth, contacts, contact (GET), contact-write (POST, PUT), jobs, job, pipelines, opportunity-fields, participants, notes, tasks, tags, users,
  invoices, invoices-send, invoices-payment, invoices-void, store, quote-link, public-quote, public-quote-respond.
- `store/` storage interface, `file.ts` (dev), `supabase.ts` (production), `schema.sql`, `store-test.mjs`.
- `tanstack/` thin TanStack Start route files, one per path (20 files; cannot be typechecked here). `contact-write.tsx` is saved as `contact.tsx`, `public-quote.tsx` as `public.quote.tsx`, `public-quote-respond.tsx` as `public.quote.respond.tsx`.
- `dev-server.mjs` local runner (serves `/api` only), `test-run.mjs` test runner, `load-env.mjs` .env parser, `issue-token.mjs` token minting.

## Routes
`/api/auth`, `/api/contacts`, `/api/contact`, `/api/jobs`, `/api/job`, `/api/pipelines`, `/api/opportunity-fields`, `/api/participants`, `/api/notes`, `/api/tasks`, `/api/tags`,
`/api/users`, `/api/invoices`, `/api/invoices/send`, `/api/invoices/payment`, `/api/invoices/void`, `/api/store`, `/api/quote-link` (staff),
`/api/public/quote`, `/api/public/quote/respond` (customer). Methods and bodies are in `API.md`.

## Env vars (process.env, read inside functions)
| Name | Required | Meaning |
|---|---|---|
| `SPRY_CRM_TOKEN` | yes | CRM integration token |
| `SPRY_CRM_API_BASE` | yes | `<API base>`, with version path, no trailing slash |
| `SPRY_CRM_LOCATION_ID` | yes | sub-account id, also checked in staff tokens |
| `SPRY_IFRAME_SECRET` | yes | HMAC secret for staff tokens |
| `SPRY_PUBLIC_LINK_SECRET` | for the customer page | secret for per-quote keys |
| `SPRY_BUSINESS_NAME` | no | customer page business name, default `Spray It Solutions` |
| `SPRY_ACCEPTED_STAGE` | no | stage on acceptance, default `Quote Accepted` |
| `SPRY_TIMEZONE` | no | default `Australia/Melbourne`, decides when `validUntil` has passed |
| `SPRY_NEW_JOB_STAGE` | no | default `New lead` (falls back to the first stage, response header `X-Stage-Fallback: 1`) |
| `SPRY_INVOICE_BUSINESS_NAME` | no | business name printed on invoices, default `Spray It Solutions` |
| `SPRY_ALLOWED_ORIGINS` | no | comma list of extra allowed origins |
| `SPRY_ALLOW_OPEN` | NEVER IN PRODUCTION | dev only: `1` skips the staff lock when no secret is set; ignored when `NODE_ENV` is production |
| `SPRY_STORE` | NEVER IN PRODUCTION | dev only: `file` for the local JSON store |
| `SPRY_STORE_FILE` | NEVER IN PRODUCTION | dev only: path of that file (default `hub/server/.data/store.json`) |

## Access link and tokens
Mint a token with `node server/issue-token.mjs [--hours 8]` (max 720). It reads `SPRY_IFRAME_SECRET` and `SPRY_CRM_LOCATION_ID` (the `.env` is loaded by `load-env.mjs`)
and prints only the signed token. The menu link is `https://<app>/?t=<token>#/todo`. The front end moves the token into header `X-Quote-Token` and strips it from the address.
- Fixed menu link with a long-lived token (for example `--hours 720`, re-issued monthly). Works today.
- Stronger option: the platform's signed user-data message to the iframe, one short-lived token per user. Untested.
Being inside the iframe does not unlock anything; only a valid token does.

## Run locally
`npm run server:build` then `node server/dev-server.mjs [--port 8787] [--env <file>] [--allow-open]` (localhost only), or `npm run server:dev`.
Typecheck: `npx tsc -p server/tsconfig.json --noEmit`. Tests: `node server/test-run.mjs lock|unit|public|live|invoices2` and `node server/store/store-test.mjs`.
`live` and `invoices2` call the Dev account (unverified which steps write; read the script first). Never point tests at the live account.

## Storage
Quotes, invoice extras, terms, templates, price list, settings, follow-ups, events and messages are shared between staff, so they live in a database, not localStorage.
This data is NOT in the CRM. Route `/api/store`. Code: `handlers/store.ts`, `store/`, `tanstack/store.tsx`.
Setup: enable Cloud (exports `supabaseAdmin`), run `store/schema.sql` once in the SQL editor (re-run on an existing database to replace the updated_at trigger, in milliseconds).
It creates `hub_records`, turns RLS on with no policies on purpose: only the server admin client can touch it. The route wrapper registers the store on first use.
No registered store: 503 "Storage not configured". Local testing: `SPRY_STORE=file`.
Collections (allowlist): quotes, invoices, terms, templates, priceItems, settings, followups, events, messages, jobmeta, companies. Ids match `[A-Za-z0-9_-]{1,64}`.
Limits: JSON only, body at most 1 MB (counted while streaming). For collection `quotes`, a PUT over an existing record needs `ifUpdatedAt`, else 409 "Reload and try again";
an older `ifUpdatedAt` is 409; a status change away from a stored Accepted or Declined is 409 "This quote was already answered".
The Supabase adapter uses a conditional update and has run only against an in-memory fake (unverified on a real database).

## Security
- Order: same-origin check, then token.
- 403 for a foreign Origin. A request with no Origin header is rejected on POST/PUT/DELETE/PATCH (403) and allowed on GET. Extra origins via `SPRY_ALLOWED_ORIGINS`.
- No secret set gives 503 "Access not configured" on every staff route (`SPRY_ALLOW_OPEN=1` skips this in dev only, and is ignored in production).
- Secret set: a missing, invalid, expired or wrong-location token gives 401. The token is accepted ONLY in header `X-Quote-Token`; a `?t=` on an `/api` route gives 401.
  Format `header.payload.signature` (HMAC-SHA256, base64url), payload `{loc, exp}` with exp in seconds. Verified with Web Crypto.
- Errors never include the CRM response body or any secret.

## Customer quote page (public routes)
The page a customer opens (`#/view/<id>?k=<key>`, no login) has its own access, separate from the staff token.
- `SPRY_PUBLIC_LINK_SECRET` unset: public routes and `/api/quote-link` answer 503 "Not configured".
- Public key per quote: `base64url(HMAC-SHA256(secret, "quote:" + quoteId))` cut to 32 characters, constant-time compare. It opens that one quote only. Wrong key or unknown id: 404.
- Rate limit on public routes (429): 30 requests a minute per quote id and client IP. Client IP is the rightmost `X-Forwarded-For` entry, else `x-real-ip`.
  In-memory map capped at 10000 entries, so each server instance has its own count; on serverless a shared limiter (database or edge store) is needed.
- Origin: foreign Origin is 403. Without an Origin header, GET is allowed and POST is 403. Respond body at most 64 KB (counted while streaming).
- Files: `lib/public-link.ts` (key, rate limit, gate), `lib/public-quote.ts` (whitelisted view, writes, CRM move), `lib/quote-calc.ts` (money rules ported from `src/lib/calc.ts`).
- On online accept the stored quote gets `acceptedPending: true`. The staff Hub treats an Accepted quote with that flag as not yet handled: it creates the invoice drafts, closes other open options on the job, then saves without the flag.
  The server does NOT create invoices and does NOT supersede other quotes. After a successful CRM job move the stored quote gets `crmMoved: true`. Accept never sets a lost or abandoned job back to won.
- The customer sees quote notes and the raw CRM job name as the job name (by design, staff should know).
- Tests: `node server/test-run.mjs public` (fake CRM, file store). Browser check: `node scripts/check-public-quote.mjs`.
