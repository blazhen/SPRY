# API test report (Dev sub-account only, 30 Oct 2026)

Script: `crm-build/tools/step21-api-matrix-test.mjs` (untracked, temporary). Raw rows: `test-results.json` (118 rows).
Catalogue updated: `platform-api-endpoints.json` (tested-ok 96, tested-blocked 1, tested-failed 1, untested 478).
Everything created was ZZ-TEST, deleted in reverse order and read back as gone. Nothing was sent to anyone.
Stage names and IDs for both pipelines are in the first C row of `test-results.json`.

## A Contacts
| Works (200/201) | Blocked or odd |
|---|---|
| create, get, update (name, tags), upsert (same id returned), search by name and by email, followers add/remove, tags add/remove, notes create/list/get/update/delete, tasks create/list/get/update/complete/delete, appointments list, delete | none blocked. Search by name returned 0 hits 1.5 s after create (index lag); email filter found it at once |

## B Companies
Works: create, get, update, delete. BLOCKED: linking by `PUT /contacts/{id}` with `companyId` gives 422 ("companyId should not exist"). `GET /businesses/location/{id}` does not exist (404). Link a company through associations (group D).

## C Opportunities (jobs)
Works: pipelines with stages (2 pipelines, 14 stages each: Residential and Commercial & Industrial), POST search, GET search, create, get, PUT (stage, value, custom field), upsert, status (lost then open), followers add/remove.
Missing: no notes and no tasks for an opportunity (404 on both). Job notes cannot be read through contact notes: a note has no job link field (fields: id, body, bodyText, userId, dateAdded, contactId, pinned, relations).
Quirk: POST /opportunities/search rejects `pipelineId` in the body (422); use `locationId`, `limit`, `page`.

## D Associations
Works: list definitions, link and unlink contact-job and company-job, read links back, create and delete a custom definition (ZZ-TEST key), custom objects schema list. Same as step19.

## E Conversations (no sending)
Works: search (all, and by contactId), get, update (starred, unread), add INBOUND record (201, sends nothing), messages for a conversation, messages of an existing conversation (read only).
Quirks: a conversation already exists once a contact exists, so `POST /conversations/` returns 400 "already exists": find it by `contactId` search. BLOCKED: `GET /conversations/messages/{id}` returns 401 "Token source/channel mismatch"; use the list endpoint, it carries everything.
Message fields: id, direction (inbound/outbound), status (e.g. delivered), type (TYPE_SMS, TYPE_ACTIVITY_OPPORTUNITY...), body, dateAdded, dateUpdated, contentType, conversationId, contactId, from, to, meta.
NOT TESTED: POST /conversations/messages (would send a real SMS or email).

## F Calendars and appointments
Works: calendars list (6 in Dev: Site inspection, Phone call, 4 install rigs), groups, get one, free slots, events by date range, create appointment with `toNotify:false`, get, update, delete, contact appointments list.
Quirk: after DELETE the appointment disappears from the events list but `GET /calendars/events/appointments/{id}` still returns it (state "active"). Rely on the events list.

## G Invoices and estimates
Works: list, draft invoice create, get, update, delete; estimate list, draft create, delete.
Invoice fields back: status (draft), amountDue, total, dueDate, invoiceItems, invoiceNumber, currency, contactDetails, issueDate, discount.
Quirks: invoice PUT needs `invoiceItems` (not `items`). Estimate create needs `title`, `discount`, `frequencySettings`, item `type`, and an issueDate not in the future; status field is `estimateStatus`; `GET /invoices/estimate/{id}` is 404 (read estimates through the list).
NOT TESTED (would notify or take money): send invoice, send estimate, text2pay, record-payment.

## H Others
All 200: users (names only: Glenn Angus, test 1, test 2), get user, tags list/create/delete, custom fields (contact 47, opportunity 40) with create/delete, custom values list/create/delete, products (0), forms, form submissions, surveys, survey submissions, links (3), media files (needs `type=file`), location get.
Workflows list is NOT blocked: 200 with 43 workflows (read only; create and edit remain unavailable per earlier probes).

## What the Quote Hub can do through the API, and what it cannot
Can: read both pipelines and move jobs between stages; set value and custom fields; search contacts and jobs; create or match contacts (upsert); write notes and tasks on the contact; add and remove tags and followers; link extra contacts and a company to a job; read the message history (SMS, activity) and add inbound records; read calendars, free slots and appointments and create or cancel appointments without notifying; create, read and edit draft invoices and draft estimates; manage tags, custom fields and values.
Cannot: attach notes or tasks to a job itself (only to the contact, with no job link, so put the job name in the note text); link a company by contact update; read one message by ID; read an estimate by ID; subscribe to webhooks. Sending (SMS, email, invoices, estimates) was deliberately not tested.

## Answers to the questions
1. Stage history or time in stage: no history list. A job carries `lastStageChangeAt`, `lastStatusChangeAt`, `createdAt`, `updatedAt` only, so time in the current stage is computable, past stages are not.
2. Call recordings and transcripts: not tested, Dev has no call messages. The recording and transcription endpoints exist in the catalogue; test on a live-like call later (read only).
3. Search speed: POST /contacts/search 250 to 320 ms, POST /opportunities/search 360 to 730 ms, GET /opportunities/search 250 to 280 ms. Fine with a short debounce. New records can take a moment to appear in name search.
4. Rate limits: headers `x-ratelimit-max` 100 per `x-ratelimit-interval-milliseconds` 10000, plus `x-ratelimit-limit-daily` 200000 with `x-ratelimit-daily-remaining`. No 429 was hit.
5. Webhooks: no subscription endpoint found for our token (4 probes returned 404). Events must be set up in the platform app, or the Hub polls.
6. Missing scope: no 403 scope message anywhere. The only 401 was the message-by-ID call (token source mismatch, not a scope).
