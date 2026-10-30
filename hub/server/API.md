# Hub proxy API contract (fixed: builders must follow it exactly)

All routes are under /api, JSON in and out, same-origin, signed token required in header `X-Quote-Token` only (a `?t=` query on an /api route is 401; see README.md). Errors are `{ "error": "message" }` with 400, 401, 403, 404, 502 or 503. Never raw CRM objects.

## Core (built)
- GET /api/auth -> `{ ok: true }`
- GET /api/contacts?q=&page= -> `{ contacts: Contact[], total?: number }`
- GET /api/contact?id= -> `{ contact: Contact }`
- GET /api/jobs?contactId= or ?all=1&status=open|won|lost|all&page=&pageSize= -> `{ jobs: Job[], page, pageSize, total, hasMore }`. status defaults to open (ignored with contactId, which returns every status); pageSize 1 to 100, default 20; a bad status is 400. `stage` is not filtered on the server.
- POST /api/jobs { contactId, title, monetaryValue?, pipelineId?, stage? } -> 201 `{ job }`
- GET /api/pipelines -> `{ pipelines }`
- GET /api/opportunity-fields -> `{ fields, categories }`

## Extended (built)
- POST /api/contact { name, email?, phone?, companyName? } -> 201 `{ contact }` (upsert, no duplicates)
- PUT /api/contact?id= { name?, email?, phone? } -> `{ contact }`
- PUT /api/job?id= { stage?, monetaryValue?, name?, assignedTo?, status?: open|won|lost|abandoned, customFields?: [{ key|id, value }] } -> `{ job }` (stage is a Hub stage NAME, server maps to the pipeline stage id)
- GET /api/participants?jobId= -> `{ participants: [{ kind: 'contact'|'company', id, role: 'main'|'extra'|'company', name }] }`
- POST /api/participants { jobId, kind, id } -> `{ participants }` (link by association)
- DELETE /api/participants?jobId=&kind=&id= -> `{ participants }`
- GET /api/notes?contactId= -> `{ notes: [{ id, body, createdAt, createdBy? }] }`
- POST /api/notes { contactId, body } -> 201 `{ note }`
- DELETE /api/notes?contactId=&id= -> `{ ok: true }`
- GET /api/tasks?contactId= -> `{ tasks: [{ id, title, dueDate?, completed }] }`
- POST /api/tasks { contactId, title, dueDate?, assignedTo? } -> 201 `{ task }`
- PUT /api/tasks?contactId=&id= { completed?, title?, dueDate? } -> `{ task }`
- POST /api/tags { contactId, tags: string[] } -> `{ tags }`; DELETE /api/tags?contactId=&tag= -> `{ tags }`
- GET /api/invoices?contactId= or ?all=1&page= -> `{ invoices: Invoice[] }` (Hub Invoice shape, see src/types.ts)
- POST /api/invoices { Invoice draft } -> 201 `{ invoice }` (creates a draft invoice in the CRM)
- POST /api/invoices/send?id= -> `{ invoice }` (DRAFT only: any other status is 409 "Only drafts can be sent"; Dev test contacts must have no phone and no real email)
- POST /api/invoices/payment?id= { amount, method, at?, note? } -> `{ invoice }` (records a payment; 400 bad amount, method or more than due; 409 void or already paid, or refused by the platform). Body shape read from the handler; method values are in `lib/crm-extended.ts` (unverified here).
- POST /api/invoices/void?id= { reason? } -> `{ invoice }` (sent unpaid invoices only; 409 for drafts, paid or part paid; the platform does not store the reason)
- GET /api/users -> `{ users: [{ id, name }] }` (owners for dropdowns)

## Storage (shared Hub data: quotes, invoices extras, terms, templates, price list, settings, follow-ups)
- GET /api/store?collection= -> `{ records: [{ id, data, updatedAt }] }`
- GET /api/store?collection=&id= -> `{ record }` or 404
- PUT /api/store?collection=&id= body `{ data, ifUpdatedAt? }` -> `{ record }` (409 if ifUpdatedAt is older than stored: lost-update guard). For collection `quotes`, `ifUpdatedAt` is REQUIRED on an existing record (409 "Reload and try again"), and a status change away from a stored Accepted or Declined is 409 "This quote was already answered". Body at most 1 MB, counted while streaming.
- DELETE /api/store?collection=&id= -> `{ ok: true }`
Collections allowed: quotes, invoices, terms, templates, priceItems, settings, followups, events, messages, jobmeta, companies. Anything else is 400.
- `jobmeta`: one record per job id (record id = job id), Hub-only job details: productType, businessName, notes, jobReportSentAt, reviewAskedAt.
- `companies`: Hub companies `{ id, name, attnContactId }`.

## Job shape
`Job` (GET /api/jobs rows, POST /api/jobs, PUT /api/job): id, contactId, title, address, stage, status, monetaryValue, pipelineName, customFields, plus
- `ownerId` string (the opportunity's assignedTo, may be ''), UNTESTED field name on read
- `source` string (may be ''), UNTESTED
- `createdAt` ISO string ('' if absent), read from createdAt or dateAdded
- `stageSince` ISO string, from lastStageChangeAt (proven present in Dev), else lastStatusChangeAt or dateUpdated (UNTESTED), else createdAt
- `companyName` optional, from the opportunity's embedded contact, where the platform returns it (UNTESTED)

## Extended: how the built routes differ from the list above (builder notes)
- PUT /api/job: `status` is applied by a second CRM call (PUT /opportunities/{id}/status); a failure between the two calls leaves the first applied. Unknown stage name is 400.
- POST /api/contact returns 201 even when the contact already existed (upsert). Name is split on the last space into first and last name.
- POST /api/participants on the job's main contact is 400; on an already linked record it is a no-op that returns the list. DELETE of a link that does not exist is 404.
- Notes and tasks live on the contact only (the platform has no job notes or tasks).
- POST /api/tasks: the platform requires a due date, so a missing `dueDate` defaults to tomorrow (UTC).
- GET /api/invoices also returns `page`, `pageSize`, `total`. POST /api/invoices needs `contactId`, `jobId` and `items` (400 otherwise); `number` is ignored (the platform numbers invoices) and payments are not written. GST is baked into line amounts on the platform side so that lines minus discount equal the Hub total inc GST to the cent; a "Rounding adjustment" line (qty 1, may be negative, hidden on read-back) is added when no line can take the cent difference (UNTESTED that the platform accepts a negative line); Hub extras (jobId, kind, quoteId, unit, gst) ride in a hidden marker in the invoice terms (UNTESTED that the platform keeps it). Details in lib/crm-extended.ts.
- POST /api/invoices/send sends by email only, as the first user of the location. Drafts only (409 "Only drafts can be sent"); contacts with no email are 400.
- Env: optional SPRY_INVOICE_BUSINESS_NAME (default "Spray It Solutions") is the business name printed on invoices.
- File names versus paths: handlers/contact-write.ts serves PUT and POST of /api/contact; handlers/invoices-send.ts, invoices-payment.ts, invoices-void.ts serve /api/invoices/send, /payment, /void; public-quote.ts and public-quote-respond.ts serve /api/public/quote and /api/public/quote/respond (aliases in dev-server.mjs, route file names in COPY-INSTRUCTIONS.md).
- The customer sees the notes put on quotes and the raw CRM job name as `jobName`.

## Customer routes (no staff token; the per-quote key is the access)
Same-origin only (a request from another origin is 403; with no Origin header GET is allowed and POST is 403). Env `SPRY_PUBLIC_LINK_SECRET` unset gives 503 `{"error":"Not configured"}`. Rate limit 30 requests a minute per quote id and client IP (429); the IP is the rightmost `X-Forwarded-For` entry, else `x-real-ip`; the in-memory map holds at most 10000 entries and is per server instance (serverless needs a shared limiter). Respond body at most 64 KB, counted while streaming.
- GET /api/quote-link?id= (STAFF, token as the other routes) -> `{ key }`. The Hub builds `#/view/<id>?k=<key>`.
- GET /api/public/quote?id=&k= -> `{ quote, businessName, recipientName, jobName, jobAddress }`. `quote` is the Hub Quote shape, whitelisted: no internal fields, no PO number, no decline reason;
  `jobId` is replaced by `"job"`, `recipient` by `{kind:'contact', id:'recipient'}`, terms are resolved to plain text in `termsCustom` with `termsId: 'custom'`. `recipientName` is a first name only.
  Viewable: Sent, Accepted, Declined, Expired (a Sent quote past `validUntil` shows as Expired). Unknown id, wrong or missing key, Draft, Superseded: always 404 `{"error":"Not found"}`.
- POST /api/public/quote/respond?id=&k= body `{ action: 'tick'|'accept'|'decline', upgradeId?, ticked?, reason? }` -> same shape as GET.
  - tick: sets one upgrade of a Sent quote (400 unknown upgrade or bad body, 409 not Sent, 410 expired).
  - accept: Sent only. Stores acceptedAt, acceptedVia `online`, acceptedTotal (recomputed on the server from stored lines and ticked upgrades, GST once on the subtotal half up; any client total is ignored), status Accepted, `acceptedPending: true`.
    Then the CRM job moves to the accepted stage only if it is earlier in its pipeline, and is set to won (add-on quotes never move the job; a lost or abandoned job is never set back to won). After a successful move the stored quote gets `crmMoved: true`. A CRM failure does not fail the accept.
    Second accept returns the same result (200). 410 when expired, 409 when Declined.
  - decline: Sent only. Stores declinedAt and the reason (500 characters max), status Declined, job unchanged. Repeat is 200, 409 after accept, 410 when expired.
  - Writes use the store with `ifUpdatedAt` and retry once on a conflict (409 "Please try again" if it still conflicts). Errors never carry internal text.
