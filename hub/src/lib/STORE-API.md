# Hub data layer: API for screen builders

Import from `../lib/store`, `../lib/calc`, `../lib/format`, `../lib/due`, `../lib/router`, `../types`, `../config`.
Read functions take an optional last argument `s: State` (use `const s = useStore()` in a component and pass it so the screen re-renders). Write functions use the live state and notify subscribers. In mock mode (`DATA_SOURCE` mock, the default) everything persists in localStorage (keys `hub.*.v2`) with an in-memory fallback, and nothing is sent anywhere. In live mode (`DATA_SOURCE` live) jobs, contacts, notes, tasks and invoices go to the CRM and the Hub's own data goes to shared storage through the proxy (see the later sections and `hub/server/README.md`). Customer emailing of quotes is not built yet.

## Routes (lib/router.ts)
Default is `#/todo`. `useRoute()` returns a `Route`; `href.*` builds links; `go(href)` navigates.

| Hash | Route | href |
|---|---|---|
| #/todo | `{name:'todo'}` | `href.todo()` |
| #/jobs | `{name:'jobs'}` | `href.jobs()` |
| #/jobs/:id | `{name:'job', id}` | `href.job(id)` |
| #/quotes | `{name:'quotes'}` | `href.quotes()` |
| #/quote/:id | `{name:'edit', id}` | `href.edit(id)` |
| #/view/:id | `{name:'view', id}` | `href.view(id)` |
| #/contacts | `{name:'contacts'}` | `href.contacts()` |
| #/contacts/:id | `{name:'contact', id}` | `href.contact(id)` (extra: one contact page) |
| #/templates | `{name:'templates'}` | `href.templates()` |
| #/terms | `{name:'terms'}` | `href.terms()` |

There is no `#/new` any more: call `createQuote` (saves at once) then `go(href.edit(q.id))`.

## Types (types.ts)
- `STAGES` (const array), `Stage`: the 14 CRM stages (see "Stages, roles and status" at the end). Won and Lost are NOT stages: `Job.status` is `'open' | 'won' | 'lost'`.
- `QuoteStatus`: Draft | Sent | Accepted | Declined | Expired | Superseded. `QuoteKind`: primary | alternative | addon. `AcceptedVia`: online | phone | purchaseOrder.
- `ParticipantRef {kind:'contact'|'company', id}`; `Participant` adds `role: 'main'|'extra'|'company'`.
- `Contact {id,name,companyId?,email,phone}`, `Company {id,name,attnContactId?}` (attn = person a company quote is addressed to), `Owner {id,name}`.
- `Job` (the CRM opportunity): id, name, address, source, value (dollars ex GST), ownerId, stage, businessName, notes, createdAt, stageSince (ISO date), participants, tasks `JobTask[]`, appointments `JobAppointment[]` (read-only mock, `{id,title}`).
- `LineItem {id,section,name,description,qty,unit,unitPrice|null,priceItemId?}`. `Unit`: m² | each | hour | lot.
- `Upgrade {id,lineId,name,description,unitPrice|null,ticked}`: belongs to a line; total = unitPrice x that line's qty; `ticked` set by the customer.
- `PaymentRow {id,label,kind:'percent'|'fixed',value,dueRule}`; `DueRule`: onAcceptance | oneBusinessDayBeforeJob | sevenDaysBeforeJob | onCompletion | other; `PaymentPresetId`: deposit | threeStage | full | custom.
- `Quote`: id, jobId, recipient (ParticipantRef), number, title, revision, status, kind, previousId?, validDays, sentAt?, validUntil?, notes, lines, upgrades, payments, paymentPreset, termsId ('custom' means use `termsCustom`), termsCustom?, acceptedVia?, poNumber?, acceptedAt?, acceptedTotal?, declinedAt?, declineReason?, fromTemplate?, createdAt, updatedAt.
- `Terms {id,name,text}` (text only, no font fields). `Template` (no customer, no prices; upgrades point at `lineIndex`). `PriceItem` (with optional per-unit `upgrade`). `Settings {jobWord}`, `JobWord`: Job | Project | Deal.

## Config (config.ts)
`BUSINESS`, `OWNER {id:'glenn', name:'Glenn'}`, `GST_RATE`, `VALID_DAYS_DEFAULT` (60), `VALID_DAYS_TO_CONFIRM` (true: show a "to confirm" chip), `MAX_COMPANIES` (10), `DEMO`, `SHOW_DEMO_BAR`.

## Store (lib/store.ts)
Hook and state
- `useStore(): State` re-renders on any change. `getState()`. `State` has jobs, contacts, companies, quotes, terms, userTemplates, settings, persistent (false when storage is blocked: show a notice).
- `resetDemoData()` back to seed data.

Lookups (all take optional `s`)
- `getJob(id)`, `getQuote(id)`, `getContact(id)`, `getCompany(id)`, `getTerms(id)`, `getTemplate(id)`, `getOwner(ownerId)` name, `getPriceList()`.
- `owners` array is exported from `data/mock.ts` for owner dropdowns.
- `quotesForJob(jobId)`, `quotesForRecipient(jobId, ref)`, `quotesForContact(contactId)`, `jobsForContact(contactId)`, `allTemplates()`.
- `participantName(ref)` short, `participantLabel(ref)` long ("Name, Company" or "Company (attn Name)"), `participantEmail(ref)`, `recipientContactId(ref)` (for clickable names), `sameRef(a,b)`.

Jobs
- `listJobs({search?, stage?, ownerId?})` search matches name, address, business, source, and names and emails of everyone on the job. `addressMatches(job, search)` for an "address match" chip.
- `todoQueue(ownerId = OWNER.id)` returns `QueueItem[] {job, daysWaiting}`: Quoting stage, that owner, oldest first.
- `updateJob(id, patch)`, `setJobStage(id, stage)` (a stage change resets `stageSince`).
- `createContact({name,email,phone,companyId?})`, `createCompany({name,attnContactId?})`.
- `addParticipant(jobId, ref, role?)` returns `AddResult {ok:true} | {ok:false,error}`; rejects duplicates and a 10th+ company. `companyCount(job)`.

Quotes
- `createQuote(jobId, recipient, {kind?, templateId?})` saves at once with no lines; title = job name, notes copied from the job, 60 days, deposit preset, first terms. Revision is next for that recipient.
- `saveQuote(q)` insert or update. `deleteQuote(id)`.
- `duplicateAsRevision(quoteId)` next revision for the same recipient (`previousId` set, never "(copy)"). The old one becomes Superseded only when the new one is sent.
- `duplicateForRecipient(quoteId, recipient)` new quote for another contact or company, revision 1; undefined when 10 recipients are already quoted. `canQuoteRecipient(jobId, ref)`, `recipientCount(jobId)`.
- `sendQuote(id)` Draft -> Sent: sets sentAt, validUntil = sentAt + validDays, unticks upgrades, supersedes `previousId`, moves job to Quote sent (not for add-ons, never backwards from Quote accepted/Won/Lost). Returns `SendResult {quote, next?: QueueItem}` or undefined if not a Draft. `next` is the next job to offer.
- `acceptQuote(id, via, poNumber?)` Draft or Sent -> Accepted using the currently ticked upgrades; stores `acceptedTotal` (inc GST). Add-on: job value += subtotal, stage unchanged. Otherwise: job to Quote accepted and every other open non-add-on quote on the job Superseded. Never sets Lost.
- `declineQuote(id, reason?)` Sent -> Declined (job unchanged).
- `expireDueQuotes(now?)` returns count; also runs once when the store loads.
- `otherOpenOptions(jobId)` and `closeOtherOptions(jobId)` (returns count) for the "Close other options" button (enabled when the first is non-empty).
- `setUpgradeTicked(quoteId, upgradeId, ticked)` customer view; only works on Sent quotes (returns false otherwise).
- `reopenAsSent(id)` demo helper for the customer view.
- Editor helpers: `newLineFromPrice(item, qty?)` returns `{line, upgrade?}`, `newCustomLine()`, `newUpgradeFor(lineId)`, `applyTemplate(quote, template)` (pure).

Settings, templates, terms
- `setJobWord('Job'|'Project'|'Deal')`; read `useStore().settings.jobWord`.
- `saveTemplateFromQuote(q, name, description)`, `deleteTemplate(id)`; built-in templates come from `allTemplates()`. Use a template via `createQuote(..., {templateId})`.
- `createTerms(name, text)`, `updateTerms(id, {name?, text?})`, `deleteTerms(id)` (false if it is the last), `termsTextFor(quote)` (the text to print).
- `applyNewTermsToQuote(quoteId, text, saveAsTemplate, name?)`: true adds to the Terms library and points the quote at it; false keeps it on this quote only (`termsId:'custom'`).

## Format (lib/format.ts)
`fmtMoney`, `fmtMoneyWhole`, `fmtDate`, `fmtQty`, `todayISO`, `toISODate(Date)`, `addDaysISO`, `daysSince(iso)`, `uid(prefix)`, `termsFontPx(textLength)` (fixed shrink steps for the terms text). Job word: `word()` "Job", `word(true)` "Jobs", `word(false,true)` "job", `word(true,true)` "jobs"; `jobText('Back to %js')` replaces `%J %Js %j %js`.

## Due (lib/due.ts)
`DUE_OPTIONS` (id, label, short), `dueShort(rule)`, `VIA_LABEL`, `VIA_OPTIONS` (phone, purchase order, for the record-acceptance dialog), `PAYMENT_PRESETS`, `paymentRowsFor(presetId)` (fresh rows with new ids).

## Calc (lib/calc.ts)
Money is plain dollars, rounded to the cent at each step.
- `lineTotal(line)`, `upgradeTotal(upgrade, lines)`, `upgradesForLine(upgrades, lineId)`.
- `computeTotals(lines, upgrades)` and `quoteTotals(quote)` return `{itemsSubtotal, upgradesSubtotal, subtotal, gst, total}`; only ticked upgrades count; GST from config.
- `paymentAmounts(rows, total)` (percent of the total inc GST, fixed rows as dollars, rounding cent to the last row when all rows are percent adding to 100), `paymentPercentTotal(rows)`, `paymentsBalance(rows, total)`.
- `effectiveStatus(q)` shows a Sent quote past validUntil as Expired. `sendProblems(q)` returns a list of messages (empty = ready).
- Self-check: `calcSelfCheck()` returns `{ok: boolean, failures: string[]}`. Call it from a script or the browser console, for example `import { calcSelfCheck } from './lib/calc'; console.log(calcSelfCheck())`. It covers line totals, upgrade per unit x quantity, ticked and unticked totals with GST, 20/80 split, the rounding cent, fixed plus percent rows and the balance check.

## Seed data (data/mock.ts)
Jobs j1 to j6. j1 "Bupa aged care installation" (Quoting, 12 days): main contact c1, extra contacts c5 and c4, companies k1 and k2; quotes q1 Rev 1 (Superseded), q2 Rev 2 (Draft, previousId q1), q3 for k1, q4 for k2. Queue for Glenn: j1 (12 days), j2 (7), j3 (3); j4 is owned by Office. j5 has a Sent quote. j6 is Won with an accepted quote q7 and a Sent add-on q8. q5 is Expired. All flagged `placeholder: true`.

## Polish additions (30 Oct 2026)
Storage keys are now `hub.*.v2` (old v1 data is ignored and the seed is written). State gains `messages`, `invoices`, `events`, `priceItems`.

Types: `ProductType` ('Spray foam' | 'InjectaCore'), `PRODUCT_TYPES`; `Job.productType`, `Job.jobReportSentAt?`; `Quote.productType`, `Quote.gstApplies?` (missing = true); `Terms.productType`; `PriceItem.productType?`; `JobTask {id,title,dueDate?,done}`; `JobAppointment {id,title,kind,date,time,reminderOn}`; `Message`, `Invoice`, `InvoiceState`, `TimelineEvent`.

Reads (store.ts, optional last arg `s`)
- `messagesForJob(jobId)` / `messagesForContact(contactId)` newest first. `eventsForJob(jobId)` newest first.
- `invoicesForJob(jobId)` Deposit then Final. `allInvoices()`. `getInvoice(id)`. `invoiceState(inv, now?)`: Paid, Overdue (not paid and due before today), Sent, Not sent.
- `getPriceList(s?)` reads State.priceItems. `termsForProduct(p)`, `defaultTermsId(p)`.
- `stall(job, now?)` returns `{days, level:'ok'|'slow'|'stuck', label}` ("5 days here"). Limits in `STALL_LIMITS` (format.ts, proposed, see the end of this file); won and lost jobs are never flagged. `STAGE_HELP[stage]` one plain line. All three are exported from both format.ts and store.ts.

lib/insights.ts (all take optional `s, now`)
- `todoSummary()` `{waitingToQuote, sentWaiting, sentWaitingValue, wonThisMonth, wonThisMonthValue}`. Sent = open Sent quotes (not past validUntil), value inc GST. "This month" = accepted in the last 30 days (rolling, so the demo never shows 0 early in a month).
- `expiryNudges()` array of `{quote, job, daysLeft, kind:'expiring'|'expired'|'quiet'}`. expiring = Sent, 7 days or less left. expired = ran out in the last 14 days. quiet = Sent 10+ days (and not expiring). Order: expiring (soonest), expired (latest first), quiet (longest first).
- `weeklySummary()` as in the contract; `from` = 7 days back, `to` = 7 ahead; `expiring` is the full expiryNudges array; `upcoming` = appointments today to +7, in order.
- `insightsSelfCheck()` returns `{ok, failures}` against the seed (never the saved data). `calcSelfCheck()` also covers no-GST and the GST rounding.

lib/family.ts: `quoteFamily(jobId)` returns `{recipient, label, items:{quote, tag:'Rev 1'.., role:'quote'|'alternative'|'addon', changed}[]}[]` (groups in job participant order). `whatChanged(q)` ("Total up $1,364 (14%). Added: X. Removed: Y.", "Total unchanged.", "First version", "Alternative to Q-1046", "Add-on to the accepted job").

Writes (each also adds a timeline event in plain past tense; sendQuote, acceptQuote, declineQuote, createQuote, duplicate*, stage changes and all below)
- `markInvoiceSent(id)`, `markInvoicePaid(id)`, `markInvoiceUnpaid(id)`, `markJobReportSent(jobId)`, `markReviewAsked(jobId)` (logs only).
- `logCall(jobId, {contactId?, direction, minutes?, note})` adds a call message and an event. `addNote(jobId, text)`.
- `toggleTask(jobId, taskId)`, `addTask(jobId, title, dueDate?)`, `setReminder(jobId, apptId, on)`, `addAppointment(jobId, {title, kind, date, time})`.
- `acceptQuote` now creates one invoice per payment row if the quote has none: last row Final, the others Deposit, amounts from `paymentAmounts`, number INV-2xxx. Due: onAcceptance = today; sevenDaysBeforeJob and oneBusinessDayBeforeJob (weekends skipped) = from the earliest Install appointment, empty when there is none; onCompletion and other = empty.
- `updatePriceItem(id, patch)`, `addPriceItem(item)` (no id), `deletePriceItem(id)`, `resetPriceList()`. Existing quotes keep their own prices.
- `setQuoteProduct(quoteId, p)`: sets productType; terms switch to `defaultTermsId(p)` only if the current terms are for the other product (custom terms are kept).
- `createQuote` uses `job.productType` and its default terms. `applyTemplate` keeps the quote's terms unless the template's terms are for the quote's own product. `createTerms(name, text, productType?)`. `createContact` and `createCompany` accept the new optional fields. `resetDemoData()` reseeds everything.

Calc: `computeTotals(lines, upgrades, gstApplies = true)`; `quoteTotals(q)` honours `q.gstApplies !== false`. GST is worked out once on the subtotal, rounded half up to the cent. config.ts exports `GST_ROUNDING_NOTE` and `GST_ROUNDING_TO_CONFIRM`.

Seed (data/mock.ts): `seedAll()` returns jobs, quotes, messages, invoices, events, priceItems. 11 jobs (j7 Site visit, j8 Quote sent with q9 expiring in 5 days and q10 an alternative with no reply for 12 days, j9 Won with install done and everything paid, j10 Lost, j11 Quote accepted with the deposit invoice overdue by 6 days; j3 is InjectaCore). Contacts c1 to c11, companies k1 to k6. Terms: 2 Spray foam, 2 InjectaCore. Price list: 13 Spray foam items (Walls, Roof, Sub-floor, Ceiling, Preparation, Finishing) and 5 InjectaCore items. All dates are relative to today.

## Fixer 1 changes (review fixes)
- `acceptQuote` moves the job to Quote accepted only when its stage is earlier in `STAGES`; Won, Lost and Quote accepted keep their stage and `stageSince`.
- Dates: `localDay(iso)` in format.ts returns the local YYYY-MM-DD of a UTC timestamp (a 10 character date passes through). Use it for every timestamp-to-day step in screens. `daysSince` and `addDaysISO` use it.
- `deleteTerms(id)` returns false when it is the last terms for that product. `defaultTermsId(p)` returns '' when the product has none (never another product's terms).
- Loading: every record and array is defaulted; each storage key falls back on its own (a bad key reseeds only itself); bad JSON counts as a missing key; `State.persistent` is false only when storage throws.
- Add-on accept makes ONE invoice: kind Final, label "Add-on: Final payment", amount = whole add-on total inc GST. Every invoice stores `quoteId`.
- `nextUnpaidInvoice(jobId, kind, s?)` first unpaid invoice of that kind, the main (non add-on) quote's first.
- `customerName(job, s?)` main person's short name, else the first participant, else 'Unknown'.
- calc.ts: `roundHalfUp(n)` true half up to the cent (1.005 gives 1.01, 2.675 gives 2.68, negatives mirror); `round2` is the same function. GST uses it. `calcSelfCheck` covers 1.005 and 2.675.
- `expiryNudges()` results now also have `daysQuiet` (whole days since sent, 0 if no sent date).
- Seed: j12 "Iverson shopfront retrofit" (c3), accepted quote q14 yesterday, deposit INV-2007 not sent and due today (not overdue), Final INV-2008. j11 deposit still overdue by 6 days. Now 12 jobs, 8 invoices, 4 accepted in the last 30 days.

## Stages, roles and status (matches the CRM pipelines)
Stages, in order (both Dev pipelines): New Lead, Dial 1, Dial 2, Quoting, Quote Sent, Follow-Up, Nurture, Quote Accepted, Inspection Required, Booking Required, Job Booked, Deposit Requested, Job Completed, Retention Claim. Older docs above that say Quote sent, Quote accepted, Won, Lost, Site visit, New lead are out of date: read them as the names here.
- `Job.status`: `'open'` (default) | `'won'` | `'lost'`; `Job.lostReason?`. Closing a job never changes its stage.
- Roles (`STAGE_ROLE` in config.ts, matched by name, case-insensitive against the active list): queue = Quoting, sent = Quote Sent, accepted = Quote Accepted. Automation uses roles only. If the CRM list lacks a role's stage, that automation is off and the Shell shows a one-line warning (`stageWarnings()`).
- `todoQueue`: open jobs in the queue stage, owner matches, oldest first.
- `sendQuote` moves the job to the sent stage only if its stage is EARLIER in the list (never backwards: Follow-Up, Job Booked etc. stay). Not for add-ons.
- `acceptQuote` (not an add-on): moves to the accepted stage only if earlier, AND marks the job won (status), also when it was lost; logs one "Marked won" event. Add-on accept never changes stage or status. `declineQuote` and expiry leave stage and status alone and never set lost.
- Store: `markJobWon(jobId)`, `markJobLost(jobId, reason?)`, `reopenJob(jobId)` (status back to open), each logs a timeline event. `listJobs({status})`. `setJobStage` as before.
- Job page: "Mark won", "Mark lost" (optional reason dialog) or "Reopen" sit next to "Move to...", with a status chip next to the stage. Jobs list: Stage filter plus Status filter (Open default, Won, Lost, All; URL `?status=`).
- format.ts: `setStages(names)` replaces the active list (live mode); `stageList()`, `stageIndex(name)`, `roleIndex(role)`, `roleStage(role)`, `atOrAfterRole`, `beforeRole`, `stageWarnings()`. store.ts: `applyStages(names)` = setStages plus a re-render; Shell calls it with the first CRM pipeline's stages in live mode only (mock mode makes no /api call). `jobFromApi` keeps the CRM stage name and maps CRM status to `Job.status`.
- Stall limits, slow/stuck days (PROPOSED, no client sign-off): New Lead 2/5, Dial 1 2/4, Dial 2 2/4, Quoting 3/7, Quote Sent 5/10, Follow-Up 5/10, Nurture never, Quote Accepted 3/7, Inspection Required 5/10, Booking Required 3/7, Job Booked never, Deposit Requested 5/10, Job Completed never, Retention Claim never. `STAGE_HELP` has a line for each.
- Saved data: keys stay `hub.*.v2`; on load old stage names map: New lead to New Lead, Site visit to Inspection Required, Quote sent to Quote Sent, Quote accepted to Quote Accepted, Won to Job Booked + won, Lost to Quote Sent + lost; unknown names become New Lead.
- Seed: j1 to j4 Quoting; j5 Quote Sent; j6 Job Booked (won); j7 Inspection Required; j8 Quote Sent; j9 Job Completed (won); j10 Quote Sent (lost, "Went with another contractor"); j11 and j12 Quote Accepted (won, they have accepted quotes).
- Self-check: `node scripts/check-stages.mjs` runs `stageSelfCheck()` (lib/stageCheck.ts) and the old-save mapping in Node. It resets the demo data, so never call it inside a screen.

## Settings page and stall limits (`#/settings`, `href.settings()`, More menu "Settings")
- `Settings` is `{jobWord, stallLimits?}`. `stallLimits` is `Partial<Record<Stage, {slow: number | null; stuck: number | null}>>`; null means never flagged; a missing stage uses the built-in default (`STALL_LIMITS`, the table above). It is part of the one `settings` record: mock mode saves it in `hub.settings.v2`, live mode syncs it through the existing `settings` adapter (no new collection). `fixSettings(raw)` (store.ts) loads any record safely: an old record without stallLimits works, invalid saved pairs are dropped. Mock mode now reads the saved settings on load.
- format.ts: `stallLimitFor(stage, s?)` is the only way to read a limit (saved, else default, else null). Never read `STALL_LIMITS` directly. `stall(job)` uses it, so every caller (todo, job page, Jobs, insights) follows the saved limits. `stallLimitProblem({slow, stuck})` returns a plain message or ''. Rules: whole numbers 1 to 365, stuck greater than slow, or both null. `setCurrentStallLimits` is called by the store, like the job word.
- store.ts: `setStallLimit(stage, {slow, stuck})` returns `{ok:true}` or `{ok:false, error}` (nothing saved on error). `resetStallLimits()` removes all saved limits. `stallLimitFor` and `stallLimitProblem` are re-exported from store.ts.
- Page (pages/Settings.tsx): stages from `stageList()`, a switch per stage (off saves null/null), number inputs saving on blur or Enter, inline error, "Changed" marker, live preview line, "Saved" (aria-live), "Reset to defaults" with a confirm. The job word stays where it was (no menu setting exists yet).
- Checks: `node scripts/check-stages.mjs` also runs the stall-limit self-check (inside `stageSelfCheck`); `node scripts/check-settings.mjs` is the browser check (build first).

## Decisions
- Money stays in dollars (numbers, round2), as the old calc did, not cents.
- Quote number: each revision and each copy gets its own new Q- number.
- Phone and purchase-order acceptance may be recorded on a Draft or Sent quote.
- The add-on adds its subtotal ex GST to the job value (job value is ex GST).
- Accepting skips add-on quotes when superseding the others; sending an add-on does not move the stage.
- Declining leaves the job stage alone.
- Applying a template fills prices from the price list when a line points at a product, otherwise leaves them empty.
- Deleting terms is refused for the last one. Quotes pointing at a missing terms print nothing.
- Payment amounts are shares of the total inc GST.
- A company recipient is addressed to its `attnContactId` person; the email comes from that contact.
- Seed Rev 1 of Bupa is Superseded already (as in the mockup) even though Rev 2 is still a Draft.

## Invoices (rebuilt, all invoice work reads this)

Types (`types.ts`): `Invoice {id, number 'INV-xxxx', jobId, contactId?, kind 'deposit'|'final'|'other', status 'draft'|'sent'|'part'|'paid'|'void', items: InvoiceLine[], discount (dollars ex GST), issueDate, dueDate ('' = not set), notes, payments: InvoicePayment[], voidReason?, sentAt?, sentTo?, viewedAt?, quoteId?}`. `InvoiceLine {id, description, qty, unit 'each'|'m2'|'hour', unitPrice (ex GST), gst: boolean}`. `InvoicePayment {id, amount (inc GST), method 'card'|'bank'|'cash'|'cheque', at (ISO), note?}`. Overdue is never stored.
Older fields `label`, `amount` (total inc GST) and `paidAt` still exist on Invoice and are kept in step by the store (`syncInvoice`). Read them if you must, never set them. The old kinds 'Deposit'/'Final' are now lower case; old saves are migrated on load (one line, one payment if it was paid).

`lib/invoices.ts` (pure): `invoiceTotals(inv) => {subtotalEx, gst, total, paid, due}` (GST 10% on the gst lines after the discount is shared out, rounded once; due is 0 for void), `statusLabel(inv, todayISO)` (Draft, Sent, Part paid, Paid, Void, or Overdue), `isOverdue(inv, today)`, `daysOverdue(inv, today)`, `KIND_LABEL`, `METHOD_LABEL`, `UNIT_LABEL`, `lineExGst(line)`, `invoiceLabel`, `lineForAmount(description, amountIncGst, gst = true)` (one line that comes to exactly that amount), `syncInvoice`.

Store reads (last arg `s?: State`): `getInvoice(id)`, `listInvoices()` (newest number first), `invoicesForJob(jobId)` (deposit, final, other), `invoicesForContact(contactId)`, `allInvoices()`, `invoiceState(inv, now?)` (older four-way state), `nextUnpaidInvoice(jobId, kind)`.
Store writes (all log a timeline line):
- `createInvoice(jobId, init?: Partial<Invoice>): Invoice` saves a DRAFT, next INV number (real numbers will come from the platform's generate-invoice-number call). Defaults: contact = job's main contact, issued today, due in 14 days, one blank line. id, number, status and payments cannot be set by init.
- `updateInvoice(id, patch)` drafts only, returns the invoice or undefined. Cannot change id, number, status, payments.
- `sendInvoice(id)` draft becomes sent (part/paid keep their status), sets sentAt and sentTo (the contact's email), logs an event and a mock email Message on the job. Void: undefined.
- `recordInvoicePayment(id, {amount, method, at?, note?})` becomes `part`, or `paid` when nothing is left. Not for void or amount <= 0.
- `voidInvoice(id, reason)`, `deleteInvoice(id): boolean` (drafts only), `duplicateInvoice(id): Invoice | undefined` (new draft).
- `invoiceFromQuote(jobId, kind): Partial<Invoice>` prefill (does not save): accepted non-add-on quote, else the latest quote. deposit = first payment row, final = quote total minus the other live invoices on that quote, other = just `{kind}`. `notes` says which quote ("Made from accepted quote Q-1044."), `quoteId` and `contactId` set. Pass to `createInvoice`.
- Stamps `markInvoiceSent`, `markInvoicePaid` (records the full amount due as a bank payment), `markInvoiceUnpaid` (removes all payments) still work and route through the functions above.
- Accepting a quote still makes one draft invoice per payment row.

### Live invoices, round 2 (live mode only; mock mode is unchanged and makes no /api call)
- `updateInvoice` on a draft also PUTs `/api/invoices?id=` (`items`, `discount`, `issueDate`, `dueDate`, `notes`, `contactId`; a blank line goes as "Item") 500 ms after the last edit. The Hub extras write is kept. The CRM's returned lines and discount are adopted as truth (a line left blank stays blank on screen). One total: Hub total = CRM amount.
- `invoiceSyncState(id, s?)` returns `'saved' | 'saving' | 'failed'` (always `'saved'` in mock). `retryInvoiceSave(id)` is the Retry control. `sendInvoice` refuses (returns undefined) unless the state is `'saved'`. InvoiceEdit and InvoiceDetail disable Send with the reason "Saving changes to the CRM" or "Last change did not reach the CRM: try again" plus a Retry button.
- `recordInvoicePayment` POSTs `/api/invoices/payment` (`amount` inc GST, `method`, `at?`, `note?`): shown at once, rolled back with "Not saved" on failure, then the CRM's `status` and `payments` are adopted. `markInvoicePaid` records the amount due the same way. `markInvoiceUnpaid` does nothing live (the CRM cannot remove a payment).
- `voidInvoiceAsync(id, reason): Promise<{ok:true}|{ok:false,error}>` POSTs `/api/invoices/void` first and only then marks it void; the server's own text (409 for paid or part paid) comes back as `error` and the invoice is left alone. `voidInvoice` is the mock-mode function. InvoiceDetail uses the async one live.
- `deleteInvoice` (drafts) live: removed at once, `DELETE /api/invoices?id=`, put back with "Not saved" if the CRM refuses. No more `deleted` extras are written (old `deleted` records are still read, so earlier hidden drafts stay hidden).
- `invoicesApi.update / payment / void / remove` in api.ts.
- Quotes accepted online: `Quote.acceptedPending?: boolean`. `processAcceptedPending(invoicesLoaded)` runs after the first load, after every poll and after the invoice list loads (never in mock mode or on `#/view/`). For each Accepted quote with the flag: look at the server's copy (skip if the flag is gone), make the invoice drafts (skipped when invoices with that `quoteId` exist) and wait for the CRM, `closeOtherOptions` (not for add-ons), log "Accepted online by the customer" (once), then `saveQuote` without the flag (sync puts it with `ifUpdatedAt`; on 409 sync reloads and the next poll re-checks, nothing is made twice). The flag stays set until the CRM has every draft, so a closed tab only means it runs again.
- Customer link: components/CustomerLink.tsx `CustomerLinkButtons` ("Copy customer link", "Open as customer") on the quote editor and on each QuoteList row; disabled for a draft ("Send the quote first") or a superseded quote. Live: key from GET `/api/quote-link` (publicQuote.ts), link = origin + path + `#/view/<id>?k=<key>`. Mock: the plain `#/view/<id>`. After Send in live mode the editor shows "The quote is marked as sent. Copy the link to share it with the customer." and the link.
- `QuoteSheet` takes `businessName` (default `BUSINESS.name`); the live customer view passes the server's name. The business name is hard-coded only in config.ts.

Routes: `href.invoices()`, `href.invoice(id)`, `href.invoiceNew(jobId?)` (`#/invoices/new?job=ID`), `href.invoiceEdit(id)`. Route names: `invoices`, `invoice`, `invoiceNew {jobId?}`, `invoiceEdit`. In App.tsx both `invoiceNew` and `invoiceEdit` render `pages/InvoiceEdit`; the page reads the job from `parseHash(location.hash)` (route.jobId) when new.
`?bulk=N` also adds one invoice per bulk job, cycling every status.
