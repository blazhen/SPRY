# Quote Hub (SprayIT Solutions)

A React app (Vite, TypeScript, Tailwind) for quotes, jobs, contacts and invoices, plus a server proxy in `server/` that talks to the Systemations CRM.
It runs in two modes, chosen at build time by `VITE_DATA_SOURCE`:
- `mock` (default): a browser-only demo with made-up data kept in localStorage. Nothing leaves the browser.
- `live`: the app calls `/api/*` on the same origin (or `VITE_PROXY_URL`). Contacts, jobs, invoices come from the CRM through the proxy; quotes and other shared data are stored in the database behind `/api/store`. A valid staff token is required.

## What it does
- To do queue, Jobs list and job page (stages, status, participants, notes, tasks), Contacts, Quotes list and editor with live preview, Invoices list and editor, templates, price list, Settings.
- Customer view (`#/view/<id>?k=<key>`): the private page a customer opens from a link. Tick upgrades, Accept (with a confirm step), Decline, expired state. In live mode it reads and answers through `/api/public/quote` with a per-quote key.
- Sending: in live mode the Hub marks a quote sent and offers a link to copy. It does NOT email the quote (not built). Invoice send goes through the CRM (drafts only).
- Alternative options vs add-ons, payment due rules, manual acceptance (phone or purchase order): see the editor.

## Run
```
npm install
npm run dev                 # mock demo, development
npm run build               # type check and static build into dist/
npm run preview             # serve dist/ locally
```
Live with the local file store (needs `.env` with the CRM settings, see `server/README.md`):
```
npm run server:build
SPRY_STORE=file node server/dev-server.mjs --port 8787      # /api only, localhost
VITE_DATA_SOURCE=live VITE_PROXY_URL=http://localhost:8787 npm run dev
```
The dev server needs a token: `node server/issue-token.mjs --hours 1`, open the app with `?t=<token>`. With `--allow-open` (dev only) and no `SPRY_IFRAME_SECRET` the lock is skipped.
The app and proxy are different origins here, so add the app address to `SPRY_ALLOWED_ORIGINS` (unverified: not re-run this way after the last server changes). Use the Dev account only, never the live one.

## Test
Back end: `npx tsc -p server/tsconfig.json --noEmit`, `node server/test-run.mjs lock|unit|public|live|invoices2`, `node server/store/store-test.mjs`.
Front end (all in `scripts/`; run `npm run build` first; most start and stop their own preview server). Descriptions come from each file's header; "unverified" means no header said what it covers.
- `smoke.mjs`: headless smoke test of the built app.
- `check.mjs`, `check2.mjs`: layout, console, tables, tabs, keyboard, flows, contrast, tap targets, badges, accept on Won, print and more.
- `check-final.mjs`, `check-hub.mjs`: broad final checks (unverified detail).
- `check-gate.mjs`: live mode access gate with faked `/api`.
- `check-sync.mjs`: live mode sync with `/api/auth` and `/api/store` faked in the browser.
- `check-live-jobs.mjs`: live mode jobs, contacts, participants with the proxy faked.
- `check-live-notes-invoices.mjs`, `check-live-invoices2.mjs`: live mode notes and invoices (unverified detail).
- `check-public-quote.mjs`: customer routes faked in the browser, live and mock builds.
- `check-stages.mjs`: stage names and loading data saved under old stage names (no browser).
- `check-settings.mjs`, `check-search.mjs`, `check-paging.mjs`, `check-panes.mjs`, `check-sticky.mjs`: Settings, search, paging with 1000 rows, two-pane layout, sticky pane.
- `check-invoices-list.mjs`, `check-invoice-detail.mjs`, `check-invoice-edit.mjs`, `check-status-notes.mjs`: invoices list, detail, editor, and status notes.
- `check-probe.mjs`, `tabprobe.mjs`, `mockprobe.mjs`: probes that print for a person to read, no pass or fail.
- `shots-stages.mjs`: screenshots of job status controls into `shots/` (needs `vite preview` on port 4173).
- `_server.mjs`: helper that starts `vite preview` for the other scripts.

## Settings
`src/config.ts`: business name, owner name and mobile, GST rate, stage roles, `DEMO` and `SHOW_DEMO_BAR` flags, `DATA_SOURCE`, `PROXY_URL`. Mobile, email and ABN are placeholders until confirmed.
`DEMO` and `SHOW_DEMO_BAR` still exist: the demo notices show only when not in live mode; set `SHOW_DEMO_BAR` to false for production (unverified which screens read it).

## Deploy and handover
`DEPLOY.md` for hosting. `server/COPY-INSTRUCTIONS.md` for the exact copy steps into the AI Studio repo. `server/API.md` for the routes.

## Placeholders
Prices and product names in `src/data/mock.ts`, all mock contacts, jobs and addresses, the owner mobile, email and ABN in `src/config.ts`, payment wording and default terms.

Round 5 extras (Advanced layout only; all flagged `placeholder: true` in code or labelled Placeholder on screen until Glenn gives real numbers):
- Foam types in `src/lib/extras.ts` `DEFAULT_FOAM`: Open cell (yield 14000 bd ft per set, price $350/m3, cost $150/m3, waste 10%) and Closed cell (4500, $1200, $520, 8%). Editable in Settings, Extras.
- Chase days 2, 5, 10 (`DEFAULT_CHASE_DAYS`), the lost reasons list and the lead sources list.
- Deposit percentages by foam type in `crm-build/workflows/HUB-EXTRAS-WORKFLOWS.md` (spec only, nothing built).

## Licences and credits
Clash Display and Satoshi (Fontshare), self-hosted, ITF Free Font License. lucide-react icons, ISC licence. The SprayIT logo files come from the client's brand assets.

## Not built or not proven
See section H of `server/COPY-INSTRUCTIONS.md`.
