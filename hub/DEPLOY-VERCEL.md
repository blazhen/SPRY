# Deploy the Hub on Vercel (hub.systemations.ai)

Status: PREPARED, never deployed. Nothing here has run on Vercel yet. Section 9 lists what is untested.
This file holds no secrets. Every secret is typed into Vercel by Zen, never into git.

## 1. What gets deployed
One Vercel project, root directory `hub`:
- Static front end: the Vite build (`dist/`, hash routes, so every screen lives on one address).
- Functions in `api/` that call the existing handlers in `server/` (compiled to `server/.build` during the install step):
  - `/api/*` (all the existing routes) is one function, `api/[...path].js`.
  - `/oauth/callback`, `/webhooks/platform`, `/auth/user-context` are three small functions in `api/hub-install/`, reached through `vercel.json` rewrites.
  - `api/page.js` serves the page for `/` and any path that is not a file, so client side routes fall back to it and the framing header can come from a setting.
- Data: the Hub store is a Supabase table (`hub_records`), called over plain HTTP by `server/store/supabase-rest.ts`. No new packages.
- The signed menu link (SPRY today) and the fixed account in the CRM settings keep working as before. The install flow routes are there but the page does not use them yet.

## 2. Before you start
You need: access to the GitHub repo, a Supabase project, the marketplace app (Client ID, Client Secret, Shared Secret), and DNS access for `systemations.ai`.
Vercel deploys what is pushed to GitHub. Zen commits and pushes; nothing here does.
Plan note: Vercel's free Hobby plan is for non-commercial use. A client system needs Pro. Check before the first deploy.

## 3. Database (once)
1. Supabase, SQL editor: paste and run `hub/server/store/schema.sql`. It creates `hub_records` with row level security on and no policies, on purpose.
2. Supabase, Project Settings, API: copy the Project URL and the `service_role` key (not the anon key). You need both in section 5.
3. Check: table `hub_records` exists, RLS enabled, zero policies.

## 4. Create the project
1. Vercel, Add New, Project, import the GitHub repo (the SPRY repo).
2. Root Directory: `hub`. (The repo root is the parent folder; the Hub is the `hub` folder.)
3. Framework Preset: Other. The rest comes from `hub/vercel.json`, check the screen shows the same values:
   - Install Command: `npm install --no-audit --no-fund && npm run server:build` (this compiles the handlers that the functions import; keep it in the install step, not the build step).
   - Build Command: `npm run build:vercel` (type check, Vite build, then renames `index.html` to `app.html`).
   - Output Directory: `dist`.
4. Node.js Version: 22.x (Project Settings, General). `package.json` says 20 or newer.
5. Region: `syd1` (Sydney) is set in `vercel.json`. Put the Supabase project in a nearby region if you can.
6. Do NOT press Deploy yet. Add the environment variables first (section 5), otherwise the first build has no settings.

## 5. Environment variables
Vercel, Project, Settings, Environment Variables. Add each to Production (add Preview only on purpose: a preview has another web address, so the install and framing parts will not match there). After any change, redeploy: values are read at build or start.

| Name | What it is | Where Zen finds it | Secret | Needed for |
|---|---|---|---|---|
| `VITE_DATA_SOURCE` | Set to `live`. Read at BUILD time, so change it only with a redeploy | Type `live` | no | The page (without it the code still defaults to live, but set it so it is explicit) |
| `SPRY_CRM_API_BASE` | Address of the platform API, no trailing slash | Zen's `.env` notes, or ask Dobby | no | The fixed account and per-account calls |
| `SPRY_CRM_LOCATION_ID` | The account the Hub talks to by default. Today the Dev account `5M1zrDbimF17cM16mtmR`. It is also checked inside signed links | Notes (SPRY CLAUDE.local.md) | no | The fixed account (SPRY) |
| `SPRY_CRM_TOKEN` | Integration token for that account (Dev for now, never the live account until Zen says) | Zen's PC, `SPRY\.env`, line `SPRY_CRM_TOKEN`; copy it from there, do not paste it in chat | YES | The fixed account (SPRY) |
| `SPRY_IFRAME_SECRET` | Long random text that signs staff links and sessions. The same value must be on the PC that runs `server/issue-token.mjs` | Make one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | YES | The staff lock, signed menu link, sessions |
| `SPRY_PUBLIC_LINK_SECRET` | Different random text for customer quote links. Changing it breaks every link already sent | Make one the same way | YES | Customer quote page, `/api/quote-link` |
| `SUPABASE_URL` | Project URL of the database | Supabase, Project Settings, API | no | The store (quotes, invoices extras, accounts) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key of the database. Server only | Supabase, Project Settings, API, `service_role` | YES | The store |
| `HUB_APP_CLIENT_ID` | The marketplace app's Client ID. Its first part (before the first dash) is the app id | The app's Client Keys section in the developer portal | no | Install |
| `HUB_APP_CLIENT_SECRET` | The app's Client Secret | The same section. It is shown ONLY ONCE, when it is created: copy it into Vercel at that moment. If it was lost, create a new client key and use the new pair | YES | Install |
| `HUB_APP_SHARED_SECRET` | Shared secret that decrypts the signed-in user's data | The app's settings in the portal. Where it is shown is unclear; if you cannot find it, ask Dobby before guessing | YES | `/auth/user-context` |
| `HUB_APP_ID` | The app id, only if it is NOT the first part of the Client ID | The app's page in the portal | no | Webhook app check (optional) |
| `HUB_APP_TOKEN_URL` | Full address of the platform's token endpoint | Ask Dobby: it is not written in the repo on purpose | no | Install, token refresh |
| `HUB_APP_REDIRECT_URI` | Redirect address sent with the code. Leave unset: the default is `https://hub.systemations.ai/oauth/callback`. It must match the app's registered redirect URL exactly | Leave unset | no | Install |
| `HUB_APP_WEBHOOK_PUBLIC_KEY` | The platform's public key for webhook signatures (PEM, including the BEGIN and END lines; Vercel accepts multi-line values) | The platform's webhook documentation | no (public) | Webhook signature check (optional but wanted) |
| `HUB_APP_WEBHOOK_SIG_HEADER` | Name of the header that carries the webhook signature (Ed25519 over the raw body). Empty means the check is off | Ask Dobby for the exact name: it is not written in the repo | no | Webhook signature check |
| `HUB_FRAME_ANCESTORS` | Who may show the page inside a frame. Sources separated by spaces or commas, e.g. `https://app.systemations.io` plus the platform's own app domains. Empty means only the Hub itself | Ask Dobby for the platform domain list | no | Opening the Hub inside the account |

Optional, keep the defaults unless you have a reason: `SPRY_ALLOWED_ORIGINS`, `SPRY_BUSINESS_NAME`, `SPRY_ACCEPTED_STAGE`, `SPRY_TIMEZONE`, `SPRY_NEW_JOB_STAGE`, `SPRY_INVOICE_BUSINESS_NAME` (meanings in `server/COPY-INSTRUCTIONS.md` section E).
NEVER set on Vercel: `SPRY_ALLOW_OPEN`, `SPRY_STORE`, `SPRY_STORE_FILE`, `NODE_ENV`.
Never put a secret in a variable whose name starts with `VITE_`: those go into the browser.

## 6. First deploy, then the domain
1. Deploy. Watch the build log: the install step must end with the server build, the build step with `dist ready: index.html is now app.html`.
2. Open the `*.vercel.app` address Vercel gives: you should see a locked screen, because the Hub needs a signed link (section 8 shows how to open it).
3. Add the domain: Settings, Domains, add `hub.systemations.ai`. At the DNS host for `systemations.ai` add what Vercel shows (for a subdomain this is a CNAME record named `hub`; use the value Vercel displays, do not guess it). Wait until Vercel shows the domain as valid and has made the certificate.
4. In the marketplace app change the settings to the new domain (Zen or Dobby):
   - Redirect URL: `https://hub.systemations.ai/oauth/callback`
   - Webhook URL for install and uninstall events: `https://hub.systemations.ai/webhooks/platform`
   - Page or menu link: `https://hub.systemations.ai/` (SPRY keeps its signed link, see 7).
   The old address `hub.systemations.io` is not used by the code any more.

## 7. Opening it inside the account
- SPRY today: the signed link, made on Zen's PC with `node server/issue-token.mjs --hours 8` (needs the same `SPRY_IFRAME_SECRET` and `SPRY_CRM_LOCATION_ID`), used as `https://hub.systemations.ai/?t=<token>`. The page keeps the token for the session and removes it from the address bar.
- Framing: the page answers with `Content-Security-Policy: frame-ancestors 'self' <your HUB_FRAME_ANCESTORS>` and no `X-Frame-Options`. If the page shows blank or "refused to connect" inside the account, the domain of the account is missing from `HUB_FRAME_ANCESTORS`: add it, redeploy, reload.
- Option, UNTESTED: the platform's custom page URL may fill in placeholders such as `{{location.id}}` before it opens the page. If it does, a link like `https://hub.systemations.ai/?location={{location.id}}` would tell the page which account it was opened from. The Hub does not read that value today, so do not rely on it. The install flow route `/auth/user-context` is the intended way to learn the account; the page does not call it yet (front end work, later).

## 8. First-deploy smoke test
Run these in PowerShell (`curl.exe`, not `curl`). Replace `<host>` with the `*.vercel.app` address first, then with `hub.systemations.ai`. Make a token first: on Zen's PC run `node server/issue-token.mjs --hours 1` in `hub` and keep the line it prints.

| # | Command | Expected |
|---|---|---|
| 1 | `curl.exe -i https://<host>/` | 200, `text/html`, header `content-security-policy: frame-ancestors 'self' ...` with your list, NO `x-frame-options`, `x-robots-tag: noindex, nofollow` |
| 2 | `curl.exe -i https://<host>/jobs/abc` | 200 and the same page (client side route fallback) |
| 3 | open the page's `/assets/...js` link from the HTML in a browser, or `curl.exe -I` it | 200, `cache-control: public, max-age=31536000, immutable` |
| 4 | `curl.exe -i https://<host>/assets/missing.js` | 404 (not the page) |
| 5 | `curl.exe -i https://<host>/api/auth` | 401 `{"error":"Unauthorized"}` |
| 6 | `curl.exe -i -H "X-Quote-Token: <token>" https://<host>/api/auth` | 200 `{"ok":true}` |
| 7 | `curl.exe -i -H "X-Quote-Token: <token>" https://<host>/api/pipelines` | 200 with the pipelines (proves the CRM token, address and account; Dev data) |
| 8 | `curl.exe -i -H "X-Quote-Token: <token>" "https://<host>/api/store?collection=quotes"` | 200 `{"records":[...]}` (proves the database settings and the table) |
| 9 | `curl.exe -i -H "X-Quote-Token: <token>" "https://<host>/api/store?collection=accounts"` | 400 (the tokens collection is never served) |
| 10 | `curl.exe -i "https://<host>/oauth/callback?error=x"` | 400, an HTML page "Not installed" |
| 11 | `curl.exe -i -X POST https://<host>/webhooks/platform -d "x"` | 400 (503 means the app settings are missing) |
| 12 | `curl.exe -i -X POST https://<host>/auth/user-context -H "Content-Type: application/json" -d "{}"` | 403 (no Origin header) |
| 13 | `curl.exe -i "https://<host>/api/public/quote?id=x&k=y"` | 404 (503 means `SPRY_PUBLIC_LINK_SECRET` is not set) |

Then in a browser: open `https://<host>/?t=<token>`, the job list shows the Dev jobs, open one, edit the job notes and reload (it must stay). Then open the same address from the account's menu link to check framing.
Real install check (only when Zen says, on a test account): start the install from the app, the redirect must end on an "Installed" page; in Supabase, table `hub_records`, rows with collection `accounts` must show one row for that account with status `active` (the row holds tokens: do not share a screenshot of it). Vercel, Logs: after a real page open, a line `[user-context] fields: ...` lists the field names the platform sent.

## 9. Not tested
Everything on Vercel itself. What was checked locally: the function files import and answer correctly when called with fake settings (`node server/test-run.mjs vercel`, 86 checks), the type checks, the Vite build, the old suites. Not checked: a real Vercel build, that the Web style `export const GET` functions run on the chosen Node version, that `includeFiles` ships `server/.build` and `dist/app.html` to the functions, the rewrites on the real platform, the `syd1` region, the database over HTTP against a real Supabase project (only a fake was used), the real install, the real webhook and its signature, and the framing header inside the real account. If the build fails, send Dobby the log.

## 10. Roll back
- A bad deploy: Vercel, Deployments, pick the last good one, the three dots, Promote to Production (instant, no rebuild). It keeps the settings that deployment was built with.
- A bad setting: fix it in Settings, Environment Variables, then Redeploy (a promote does not pick up new values).
- The database is not changed by a deploy or a rollback. The only schema is the one table from section 3.
- Marketplace app settings (redirect, webhook, page URL) live in the portal and do not roll back with Vercel: change them back by hand if you go back to another host.
- Emergency stop for installs only: remove `HUB_APP_CLIENT_SECRET` and redeploy; `/oauth/callback` then answers "Not ready" and nothing else changes.

## 11. Local commands (unchanged, plus two)
- `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck`, `npm run server:build`, `npm run server:dev`, and `node server/test-run.mjs lock|unit|public|install|live|invoices2` work as before. `node server/store/store-test.mjs` as before.
- New: `node server/test-run.mjs vercel` (function entries, database over HTTP with a fake, framing header, `vercel.json` checks).
- New: `npm run build:vercel` renames `dist/index.html`, so do not run it in a folder you also use for `vite preview`. To try the Vercel build locally: `$env:VERCEL='1'; npx vite build --outDir dist-vercel --emptyOutDir; node scripts/vercel-postbuild.mjs dist-vercel` (PowerShell).
