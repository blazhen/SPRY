# Deploy

1. `npm install` then `npm run build`.
2. Upload everything inside `dist/` to a static host (any folder or sub-folder works, the build uses relative paths).
3. Open the address. The quotes list is at `.../index.html#/`.
4. Platform menu link: add a custom menu link that opens the address in an iframe.

## Checks on the host

- The response must not carry `X-Frame-Options: DENY or SAMEORIGIN`. If a `Content-Security-Policy` is set, `frame-ancestors` must allow the platform's address.
- No cookies are needed. Drafts use localStorage. Some browsers block storage in third-party frames: the page shows a notice and keeps working for that visit.
- The page asks search engines not to index it (`noindex`).

## Settings that change per client

Edit `src/config.ts` (business name, contact name and mobile, email, ABN, GST rate), then rebuild. Real prices and products replace `src/data/mock.ts` when they are confirmed.
