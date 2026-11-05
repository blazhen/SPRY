# Copy instructions for a developer agent (AI Studio repo, TanStack Start)

NOTE (3 Nov): the Hub is going to Vercel as its own project instead (see `hub/DEPLOY-VERCEL.md`). The sections below are the AI Studio route and stay valid for it only. Vercel does not use the `tanstack/` route files: it uses `hub/api/` and `hub/vercel.json`.

Source: `hub/` of the Hub project (`hub/server/` for the back end, the rest of `hub/` for the front end). Target: the AI Studio repo.
Do NOT copy: `server/.build/`, `server/.data/`, `server/dev-server.mjs`, `server/test-run.mjs`, `server/load-env.mjs`, `server/store/store-test.mjs`, `hub/scripts/`, `hub/dist*`, `hub/node_modules`, `hub/shots`.
Keep `server/issue-token.mjs` on a trusted machine (it mints menu-link tokens); it is not deployed.

## A. Route files (hub/server/tanstack to src/routes/api)
One file per path. Copy each file below to the target name. The header comment of each source file also states its target.

| Source (hub/server/tanstack) | Target (src/routes/api) | Path served |
|---|---|---|
| auth.tsx | auth.tsx | /api/auth |
| contact-write.tsx | contact.tsx (RENAME) | /api/contact (GET, POST, PUT) |
| contacts.tsx | contacts.tsx | /api/contacts |
| invoices.tsx | invoices.tsx | /api/invoices |
| invoices.send.tsx | invoices.send.tsx | /api/invoices/send |
| invoices.payment.tsx | invoices.payment.tsx | /api/invoices/payment |
| invoices.void.tsx | invoices.void.tsx | /api/invoices/void |
| job.tsx | job.tsx | /api/job |
| jobs.tsx | jobs.tsx | /api/jobs |
| notes.tsx | notes.tsx | /api/notes |
| opportunity-fields.tsx | opportunity-fields.tsx | /api/opportunity-fields |
| participants.tsx | participants.tsx | /api/participants |
| pipelines.tsx | pipelines.tsx | /api/pipelines |
| public-quote.tsx | public.quote.tsx (RENAME) | /api/public/quote (customer, no staff token) |
| public-quote-respond.tsx | public.quote.respond.tsx (RENAME) | /api/public/quote/respond (customer) |
| quote-link.tsx | quote-link.tsx | /api/quote-link (staff) |
| store.tsx | store.tsx | /api/store |
| tags.tsx | tags.tsx | /api/tags |
| tasks.tsx | tasks.tsx | /api/tasks |
| users.tsx | users.tsx | /api/users |

That is 20 source files and 20 paths (verified: every createFileRoute path appears exactly once). There is no `contact.tsx` in the source folder on purpose: `contact-write.tsx` is the only route for `/api/contact`. Do not also create a second file for that path.
After copying, regenerate the route tree if the repo needs it (`routeTree.gen.ts`).

## A2. Install flow route files (optional, only when the marketplace app is used; NOT in src/routes/api)
Three more files, copied to `src/routes` itself because their paths are not under /api. They do not change the 20 above.

| Source (hub/server/tanstack) | Target (src/routes) | Path served |
|---|---|---|
| oauth-callback.tsx | oauth.callback.tsx (RENAME) | GET /oauth/callback (install redirect, no staff token) |
| webhooks-platform.tsx | webhooks.platform.tsx (RENAME) | POST /webhooks/platform (install and uninstall events) |
| auth-user-context.tsx | auth.user-context.tsx (RENAME) | POST /auth/user-context (encrypted user data to a Hub session) |

Needs `lib/app-config.ts`, `lib/oauth.ts`, `lib/accounts.ts`, `lib/cryptojs.ts`, `lib/session.ts` (already inside `server/lib/`). Accounts are stored in the collection `accounts` of the same `hub_records` table (no schema change). That collection is not in the `/api/store` allow list, so tokens never reach a browser. Environment variables are in section E (HUB_APP_*). Not wired to any existing route yet.

## B. Server folders and the import fix
1. Create `src/server-hub/`. Copy `server/lib/` to `src/server-hub/lib/`, `server/handlers/` to `src/server-hub/handlers/`, and `server/store/` to `src/server-hub/store/` (skip `store-test.mjs`; `schema.sql` is only for the SQL editor, copying it is harmless). Keep the `.js` import suffixes inside these files.
2. One-time import path fix. Route files import `@/server-hub/...` and (store.tsx, public-quote*.tsx) `@/integrations/supabase/client.server`. If `@` points at `src` in the repo, nothing to do. Otherwise, from the repo root run once: `sed -i 's#@/server-hub/#<alias>/server-hub/#g' src/routes/api/*.tsx` (that folder only).
3. Server code reads `process.env` inside functions and uses Web standard Request/Response and Web Crypto, so it needs no Node-only setup.

## C. Front end
1. Copy `hub/src/`, `hub/public/`, `hub/index.html`, `hub/vite.config.ts`, `hub/tsconfig.json`, `hub/tailwind.config.js`, `hub/postcss.config.js`, `hub/package.json` (merge dependencies: react, react-dom, lucide-react, tailwindcss, postcss, autoprefixer) into the Hub front end of the repo. Build with `VITE_DATA_SOURCE=live` (default is `mock`, a browser-only demo). Leave `VITE_PROXY_URL` empty.
2. Same origin: the AI Studio app must serve the built static Hub (the Vite output, relative base `./`, hash routes) and the `/api/*` routes from the same address. The front end calls `/api/...` on its own origin. If the Hub is served from another address, set `VITE_PROXY_URL=<api origin>` at build time and add the Hub origin to `SPRY_ALLOWED_ORIGINS` (unverified: never run split-origin).
3. The front end sends the staff token in header `X-Quote-Token` on every call (`src/lib/api.ts`).

## D. Cloud and storage
1. Turn on Cloud so `src/integrations/supabase/client.server.ts` exports `supabaseAdmin`.
2. Run `server/store/schema.sql` once in the database SQL editor. It creates `hub_records`, an index, an updated_at trigger (milliseconds) and turns RLS on with no policies, on purpose. On an EXISTING database, run it again to replace the trigger.
3. Check: table `hub_records` exists, RLS is enabled with zero policies, a smoke-test store write (section G) returns 200 and the row shows in the table.
4. Registering the store: `tanstack/store.tsx` (and `public-quote.tsx`, `public-quote-respond.tsx`) already call `setStore(createSupabaseStore(supabaseAdmin))` on first use, with a dynamic server-only import. No extra code needed. With no store registered, `/api/store` answers 503 "Storage not configured".
5. Do NOT set `SPRY_STORE` in production. The Supabase adapter uses a conditional update for `ifUpdatedAt` but has run only against an in-memory fake, never a real database (unverified).

## E. Environment variables (host settings, never in git)
| Name | Required | What for | Example |
|---|---|---|---|
| SPRY_CRM_TOKEN | required | CRM integration token (server only) | `<token>` |
| SPRY_CRM_API_BASE | required | CRM API address with version path, no trailing slash | `<API base>` |
| SPRY_CRM_LOCATION_ID | required | Sub-account the Hub talks to; also checked inside staff tokens | `<location id>` |
| SPRY_IFRAME_SECRET | required | HMAC secret for staff tokens. Unset gives 503 on every staff route | long random string |
| SPRY_PUBLIC_LINK_SECRET | required for the customer page | Secret for per-quote keys (different from the staff one). Unset gives 503 on public routes and /api/quote-link | long random string |
| SPRY_BUSINESS_NAME | optional | Business name on the customer page. Default `Spray It Solutions` | `Spray It Solutions` |
| SPRY_ACCEPTED_STAGE | optional | Stage the job moves to on acceptance. Default `Quote Accepted` | `Quote Accepted` |
| SPRY_TIMEZONE | optional | Decides when `validUntil` has passed. Default `Australia/Melbourne` | `Australia/Melbourne` |
| SPRY_NEW_JOB_STAGE | optional | Stage for new jobs. Default `New lead`; if missing from the pipeline, the first stage is used | `New lead` |
| SPRY_NOTES_AGENT_ID | optional | ID of the Agent Studio agent that reads inspection notes (see `HUB-NOTES-AGENT-SETUP.md`). Not set: the smart reader is off and the built-in rules run. No API key needed: it uses the same integration token | `abc123...` |
| SPRY_INVOICE_BUSINESS_NAME | optional | Business name printed on invoices. Default `Spray It Solutions` | `Spray It Solutions` |
| SPRY_ALLOWED_ORIGINS | optional | Comma list of extra allowed origins (same-origin is always allowed) | `https://<other-origin>` |
| HUB_APP_CLIENT_ID | install flow only | The marketplace app's client id (its part before the first dash is the app id) | `<client id>` |
| HUB_APP_CLIENT_SECRET | install flow only | The app's client secret (server only, never logged) | `<client secret>` |
| HUB_APP_SHARED_SECRET | install flow only | The app's shared secret, decrypts the user data for /auth/user-context | `<shared secret>` |
| HUB_APP_TOKEN_URL | install flow only | Full address of the platform's token endpoint. Kept out of the repo on purpose; unset gives 503 on /oauth/callback | `<token endpoint>` |
| HUB_APP_REDIRECT_URI | optional | Redirect address sent with the code. Default `https://hub.systemations.ai/oauth/callback` | same as registered |
| HUB_APP_ID | optional | App id if it is not the first part of the client id | `<app id>` |
| HUB_APP_WEBHOOK_PUBLIC_KEY, HUB_APP_WEBHOOK_SIG_HEADER | optional, both or neither | PEM public key and the header name that carries the webhook signature (Ed25519, base64 over the raw body: a guess until checked on a real delivery) | |
| SPRY_ALLOW_OPEN | NEVER SET IN PRODUCTION | Dev only: skips the staff lock when no secret is set. Ignored when NODE_ENV is production (503 as if unset) | `1` |
| SPRY_STORE | NEVER SET IN PRODUCTION | Dev only: `file` uses a local JSON file instead of the database | `file` |
| SPRY_STORE_FILE | NEVER SET IN PRODUCTION | Dev only: path of that JSON file | `hub/server/.data/store.json` |

Also read: `NODE_ENV`. Build-time (front end): `VITE_DATA_SOURCE` (`live` for the deploy), `VITE_PROXY_URL` (empty for same origin), `VITE_SYNC_POLL_MS` (test only).

## F. The menu link
1. On a trusted machine with the same `SPRY_IFRAME_SECRET` and `SPRY_CRM_LOCATION_ID` in the environment or `.env`: `node server/issue-token.mjs --hours 720`. It prints only the token (max 720 hours, default 8).
2. Set the platform custom menu link to `https://<app>/?t=<token>#/todo`.
3. How it works: the front end reads `?t=`, keeps it in sessionStorage, sends it as header `X-Quote-Token` and removes it from the address bar. The server accepts the token ONLY in that header; a `?t=` on an `/api` route is refused (401).
4. Lifetime and rotation: the token lasts the hours chosen (720 = 30 days). Re-issue before it ends and update the menu link. To cut off all old tokens at once, change `SPRY_IFRAME_SECRET` and issue a new token.
5. Being inside the platform iframe does NOT unlock the app. Only a valid token does. Without one every staff route answers 401.

## G. Smoke test (placeholders; `<token>` from section F)
- No token refused: `curl -i https://<host>/api/auth` -> 401
- Token accepted: `curl -i -H "X-Quote-Token: <token>" https://<host>/api/auth` -> 200 `{"ok":true}`
- Token in the query is refused: `curl -i "https://<host>/api/auth?t=<token>"` -> 401
- Pipelines: `curl -s -H "X-Quote-Token: <token>" https://<host>/api/pipelines` -> JSON with `pipelines`
- Jobs: `curl -s -H "X-Quote-Token: <token>" "https://<host>/api/jobs?page=1"` -> `jobs` with ownerId, source, createdAt, stageSince
- Store write: `curl -i -X PUT -H "Origin: https://<host>" -H "X-Quote-Token: <token>" -H "Content-Type: application/json" -d '{"data":{"a":1}}' "https://<host>/api/store?collection=jobmeta&id=smoke1"` -> 200
- Store read: `curl -s -H "X-Quote-Token: <token>" "https://<host>/api/store?collection=jobmeta&id=smoke1"` -> the record
- Store delete: `curl -i -X DELETE -H "Origin: https://<host>" -H "X-Quote-Token: <token>" "https://<host>/api/store?collection=jobmeta&id=smoke1"` -> 200
- Bad collection: `curl -i -H "X-Quote-Token: <token>" "https://<host>/api/store?collection=nope"` -> 400
- Foreign origin: same store write with `-H "Origin: https://evil.example"` -> 403
- Public quote, bad key: `curl -i "https://<host>/api/public/quote?id=nope&k=nope"` -> 404 (503 if `SPRY_PUBLIC_LINK_SECRET` is not set)
- Quote link without token: `curl -i "https://<host>/api/quote-link?id=<quote id>"` -> 401
- Contact write (use a made-up contact, delete it afterwards): `curl -i -X POST -H "Origin: https://<host>" -H "X-Quote-Token: <token>" -H "Content-Type: application/json" -d '{"name":"ZZ-TEST Copy Check","email":"zz-copy@example.invalid"}' https://<host>/api/contact` -> 201

## G2. Job files (private bucket)
Real file upload for the job Documents. Files go straight from the browser to a private Supabase Storage bucket through short-lived signed links; the server only hands out the links and keeps the rows.
1. Copy the route file `studio-copy/src/routes/api/files.tsx` to `src/routes/api/files.tsx` (it also sets up the file storage next to the store).
2. Copy `handlers/files.ts`, `lib/files.ts` and the adapters `store/files-supabase.ts` (and `store/files-fake.ts` only if tests run in that repo) into the same `src/server-hub` folders as the rest, with the same import fix as section B.
3. Run the migration `supabase/migrations/20261104120000_create_private_job_files_bucket.sql` (creates bucket `job-files`, Private, 25 MB limit, allowed types only, no policies for anon or authenticated).
4. No new environment variable. The route uses the same server admin client as `/api/store`.

After AI Studio applies it, Zen must confirm:
- Bucket `job-files` exists in Storage and is marked Private.
- One real upload from a job's Documents works, then Open shows the file.
- Delete removes the object in the bucket (not only the row in the Hub).
- A second location's files are not reachable (a file id from another location answers 404).

Nothing here was tested against real Supabase. It is proven only against the in-memory fake and by reading the storage library's types.

## H. What is real and what is not yet
Proven against the Dev account or a fake, per the tests in `server/test-run.mjs` and `hub/scripts`. NOT yet built or NOT proven:
- Emailing the quote to the customer is not built. The Hub marks the quote sent and offers a link to copy.
- Signed user-data from the platform instead of a link token: untested.
- Payments read one summary row from the CRM.
- The CRM does not return the task assignee.
- Quote numbers can collide between two users at the same second.
- The accepted-by-customer invoice creation has a race (two staff screens can both create drafts).
- Two ZZ-TEST invoices are left in Dev.
- The CRM search index lags 4 to 14 seconds, so a new record may not show in search at once.
- Won is set automatically on acceptance (a lost or abandoned job is never set back to won). Stored flag `crmMoved: true` after a successful CRM job move.
- Stall limits are proposals, editable in Hub Settings.
- Invoice GST: line amounts are built so lines minus discount equal the Hub total inc GST to the cent. A "Rounding adjustment" line (qty 1, may be negative, hidden on read-back) is added when no line can take the cent. UNTESTED that the platform accepts a negative line.
- The customer sees the notes put on quotes (by design; staff should know) and the raw CRM job name as the job name on the customer page.
- Nothing has run against the real live account (read-only rule).
- The Supabase store adapter never ran against a real database; proven only against an in-memory fake.
- Rate limit on public routes is per server instance (see README); a shared limiter is needed on serverless.
