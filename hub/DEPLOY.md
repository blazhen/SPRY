# Deploy

## Mock demo (static only)
1. `npm install` then `npm run build`.
2. Upload everything in `dist/` to a static host (relative paths, any folder). Quotes list: `.../index.html#/`.

## Live (the real Hub)
The live Hub needs the `/api` routes, so it is deployed inside the AI Studio app (TanStack Start with Cloud), not as a static upload.
1. Follow `server/COPY-INSTRUCTIONS.md` in order: route files, server folders, front end, Cloud and `schema.sql`, environment variables.
2. Build the front end with `VITE_DATA_SOURCE=live`. The static build and `/api` must be served from the same origin.
3. Create the menu link: `node server/issue-token.mjs --hours 720`, then set the platform custom menu link to `https://<app>/?t=<token>#/todo`. Re-issue before the token ends.
4. Run the smoke test in section G of the copy instructions.

## Checks on the host
- The response must not carry `X-Frame-Options: DENY or SAMEORIGIN`. If a `Content-Security-Policy` is set, `frame-ancestors` must allow the platform's address.
- No cookies are used. The token lives in sessionStorage. Mock mode keeps drafts in localStorage; some browsers block storage in third-party frames, the page shows a notice.
- The page asks search engines not to index it (`noindex`).
- Never set `SPRY_ALLOW_OPEN`, `SPRY_STORE` or `SPRY_STORE_FILE` in production.

## Settings that change per client
Edit `src/config.ts` (business name, contact name and mobile, email, ABN, GST rate, stage roles), then rebuild. Server-side names and stages are env vars (see `server/COPY-INSTRUCTIONS.md`, section E).
