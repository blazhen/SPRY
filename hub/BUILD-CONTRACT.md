# Hub polish: build contract (30 Oct 2026, temporary, delete before handover)

Shared by every builder. Mock data only. No CRM writes, no network, no commits. Dev only. No em dashes or en dashes anywhere (text, comments, code). Never name the CRM vendor. Folder: F:\Systemations Clients\SPRY\hub. `quote-builder` is not touched.

## Audience rule (read first)
Glenn is an older man, not technical. Every screen: very simple, very clean. Body text 18px or more, big headings, plain words (say "Jobs", "Send quote", "Mark as paid", never "opportunity", "pipeline", "CRM", "workflow", "revision" on screen where "version" or "Rev 2" will do). One obvious main button per screen (class `btn btn-primary`), few choices per screen, generous spacing, strong contrast, 44px minimum click targets (48px for main buttons). Colour never carries meaning alone: always a text label (and an icon where it helps). Confirm before anything that records something (stamps): a small dialog "Are you sure?" with the plain result.

## Tables
Every list or table has real column headers: `<table>` with `<thead><tr><th scope="col">`, row header cell `<th scope="row">` for the first column where it is the name. Use the shared `DataTable` classes from styles.css (`.tbl`). On narrow screens (under 640px) a table may turn into stacked cards, but the headers must still exist for screen readers (visually hidden `th` is fine, with `data-label` on cells for the stacked look). No horizontal page scroll at 360px.

## Whole-row links
Where a whole row opens something (To do, Jobs, Quotes, Contacts), use the shared `RowLink` pattern: the main cell holds a real `<a href>` whose `::after` is stretched over the row (class `.row-link`, row gets `position:relative` via `.tbl-click`), so the whole row is clickable, keyboard focus lands on the real link, focus ring is visible around the whole row (`:focus-within` ring). Inner links (a phone number, a contact name) sit above it with `position:relative; z-index:1`.

## Files and owners (never edit a file you do not own)
Foundation phase 1:
- F1 (data): src/types.ts (already edited, F1 may only ADD), src/lib/store.ts, src/lib/calc.ts, src/lib/format.ts, src/lib/family.ts (new), src/lib/insights.ts (new), src/data/mock.ts, src/config.ts, src/lib/STORE-API.md.
- F2 (look): src/styles.css, tailwind.config.js, src/components/ui.tsx, src/components/Shell.tsx, src/components/WordSwitch.tsx, src/lib/router.ts, src/App.tsx, index.html, plus STUB files (below).
Phase 2 (all at once, after F1 and F2 are done):
- C1: src/pages/Todo.tsx, src/pages/Week.tsx (new), src/pages/Jobs.tsx
- C2: src/pages/QuoteList.tsx, Contacts.tsx, Templates.tsx, Terms.tsx, src/pages/PriceBook.tsx (new), src/components/TemplateDialogs.tsx
- B1: src/pages/JobDetail.tsx, src/components/job/QuoteFamily.tsx, StampBar.tsx, TasksPanel.tsx, TimelinePanel.tsx, MoveToStage.tsx
- B2: src/pages/ContactDetail.tsx, src/components/ContactCard.tsx, src/components/job/ContactsPanel.tsx, ConversationsPanel.tsx, PaymentsPanel.tsx, AppointmentsPanel.tsx
- A1: src/pages/Editor.tsx, src/components/SplitPane.tsx (new), JobDetailsPanel.tsx, RevisionBar.tsx, ManualAcceptDialog.tsx
- A2: src/components/QuoteSheet.tsx, TermsBlock.tsx, LineItemsEditor.tsx, UpgradesEditor.tsx, PaymentsEditor.tsx, src/components/QuoteSettingsFields.tsx, src/lib/summary.ts (new), src/pages/CustomerView.tsx
Tests (phase 3): scripts/ and shots/ belong to the tester.

If you need something from a file you do not own (a missing helper, a class, a prop), do NOT edit it: build a local version inside your own file and say in your report what you wanted added.

## New data (types are in src/types.ts, read them)
Job gets `productType`, `jobReportSentAt?`. Quote gets `productType`, `gstApplies?` (missing = true). Terms gets `productType`. PriceItem gets `productType?`. Contact gets `mobile?`, `address?`, `note?`. Company gets `phone?`, `email?`, `address?`. JobTask is `{id,title,dueDate?,done}`. JobAppointment is `{id,title,kind,date,time,reminderOn}`. New: `Message`, `Invoice`, `TimelineEvent`.

## New store API (F1 builds it exactly like this; State gains `messages`, `invoices`, `events`, `priceItems`)
Persisted in localStorage like the rest (keys `hub.messages.v1`, `hub.invoices.v1`, `hub.events.v1`, `hub.prices.v1`). Old saved data must not crash: if a saved job/quote lacks a new field, fill a default on load (productType 'Spray foam', tasks done:false, etc.) or bump the keys to `.v2` and reseed. Reads take optional last arg `s: State`.

Reads
- `messagesForJob(jobId, s?)` newest first. `messagesForContact(contactId, s?)`.
- `invoicesForJob(jobId, s?)` in order Deposit, Final. `invoiceState(inv, now?)` returns InvoiceState (Overdue = not paid and dueDate before today). `allInvoices(s?)`.
- `eventsForJob(jobId, s?)` newest first.
- `getPriceList(s?)` (now reads State.priceItems). `termsForProduct(p: ProductType, s?)`. `defaultTermsId(p, s?)`.
- `stall(job, now?)` returns `{days: number, level: 'ok'|'slow'|'stuck', label: string}` where label is like "5 days here". Thresholds per stage in a table in format.ts or insights.ts: Quoting slow at 3 days stuck at 7; Quote sent slow 5 stuck 10; New lead slow 2 stuck 5; Site visit slow 7 stuck 14; Quote accepted slow 3 stuck 7; Won/Lost always ok.
- `STAGE_HELP: Record<Stage,string>`: one plain line per stage ("Waiting for you to write the quote").
- src/lib/insights.ts: `todoSummary(s?, now?)` returns `{waitingToQuote: number, sentWaiting: number, sentWaitingValue: number, wonThisMonth: number, wonThisMonthValue: number}`; `expiryNudges(s?, now?)` returns `{quote: Quote, job: Job, daysLeft: number, kind: 'expiring'|'expired'|'quiet'}[]` (Sent quotes with 7 days or less left, quotes that expired in the last 14 days, and sent quotes with no reply for 10+ days, one entry per quote, sorted most urgent first); `weeklySummary(s?, now?)` returns `{from: string, to: string, quotesSent: number, quotesAccepted: number, acceptedValue: number, newJobs: number, waitingToQuote: number, sentWaiting: number, invoicesPaidTotal: number, overdueInvoices: Invoice[], overdueTotal: number, expiring: ..., stuckJobs: Job[], upcoming: {job, appt}[]}` for the last 7 days and the next 7.
- src/lib/family.ts: `quoteFamily(jobId, s?)` returns groups `{recipient: ParticipantRef, label: string, items: FamilyItem[]}[]` where `FamilyItem = {quote: Quote, tag: 'Rev 1'|'Rev 2'..., role: 'quote'|'alternative'|'addon', changed: string}` ; `whatChanged(q, s?)` returns a plain line vs its previous revision: "Total up $1,200 (10%). Added: Ceiling insulation. Removed: Wall batts." or "First version" for Rev 1, "Alternative to Q-1042" or "Add-on to the accepted job" for other kinds.
- `planGst(...)`: see calc below.

Writes (every write also adds a TimelineEvent through an internal `logEvent(jobId, kind, text)`; sendQuote, acceptQuote, declineQuote, setJobStage, createQuote, duplicate* and all below log automatically; text is plain words, past tense)
- `markInvoiceSent(invoiceId)`, `markInvoicePaid(invoiceId)`, `markInvoiceUnpaid(invoiceId)` (undo a mistake).
- `markJobReportSent(jobId)`; `markReviewAsked(jobId)` (logs only).
- `logCall(jobId, {contactId?, direction, minutes?, note})` adds a call Message and an event.
- `addNote(jobId, text)` adds a note event.
- `toggleTask(jobId, taskId)`, `addTask(jobId, title, dueDate?)`.
- `setReminder(jobId, apptId, on)`, `addAppointment(jobId, {title, kind, date, time})`.
- `acceptQuote` now also creates the invoices from the quote's payment rows when none exist yet for that quote (label from the row, amount from `paymentAmounts`, kind Deposit for the first row and Final for the last, dueDate from the install appointment date when there is one, using the row's dueRule: 1 business day before, 7 days before, on acceptance = today, on completion = left empty).
- Price list: `updatePriceItem(id, patch)`, `addPriceItem(item)`, `deletePriceItem(id)`, `resetPriceList()`. Changing a price never changes existing quotes.
- Quote product type: `setQuoteProduct(quoteId, p)` sets productType and, if the current terms are for another product, switches termsId to `defaultTermsId(p)` and clears termsCustom.
- Job: `updateJob` may now patch `productType`. `createQuote` uses `job.productType`, and `defaultTermsId(job.productType)`. `applyTemplate` keeps the quote's product type's terms (a template for the other product may not change the terms to the wrong product).
- `resetDemoData()` reseeds everything.

Calc (calc.ts, F1)
- `computeTotals(lines, upgrades, gstApplies = true)` and `quoteTotals(q)` honour `q.gstApplies !== false`. GST = round half up to the cent of subtotal x GST_RATE, worked out once on the subtotal. Add `GST_ROUNDING_NOTE` string exported from config.ts for the UI ("GST is worked out once on the subtotal and rounded to the nearest cent. To be confirmed.") and set `GST_ROUNDING_TO_CONFIRM = true`.
- `calcSelfCheck()` extended with a no-GST case and the rounding case.

## Seed data (F1)
Keep the existing jobs j1 to j6 and quotes. Add: productType on everything (j3 is an InjectaCore job with InjectaCore terms; add a second terms set for each product so a dropdown has choices: "Spray It standard terms", "Spray It open-cell terms", "InjectaCore standard terms" — placeholders); 3 more jobs (7 to 9) so lists look real, including one in Site visit, one Quote sent with a quote expiring in 5 days, one Won with a finished install, a Lost one; messages (sms, email, call; in and out; automated and manual) for at least 4 jobs; invoices: j6 deposit paid and final due in the future, one job with a deposit OVERDUE by 6 days, one with everything paid; events for each job (build them from the seed, newest first on read); tasks with due dates and some done; appointments (inspection past, install future, reminder on and off); contacts get mobile, address, note where sensible; companies get phone, email, address. Price list: 12 or more items across at least 3 sections for Spray foam and 3 or more for InjectaCore, all `placeholder`. All dates relative to today (compute from `new Date()` at seed time) so the demo never goes stale. Everything made up; no real people.

## Shared look (F2 builds it exactly like this)
styles.css and ui.tsx must provide, for the page builders:
- Type scale tokens: `.t-page` (page title, clamp 1.9rem to 2.5rem), `.t-section` (1.4rem), `.t-body` (1.125rem), `.t-small` (1rem, never smaller than 0.9375rem in the app). Base body 1.125rem.
- Layout: `.page` (max-width 72rem, centred, padding), `.page-head` (title left, main action right, wraps), `.stack` / `.stack-lg` (vertical gaps 1rem / 2rem), `.card` (panel with 1.5rem padding), `.grid-cards`.
- Tables: `.tbl` (full width, th with navy-wash background and bold 0.9375rem text, 56px min row height, bottom hairlines, hover tint), `.tbl-click` rows and `.row-link` (see above), `.tbl-stack` for the narrow stacked form (uses `data-label`), `.num-col` (right aligned tabular numbers).
- Buttons: add `.btn-lg` (48px, 1.0625rem). Existing `.btn-*` kept.
- Components in ui.tsx (export all): `StageBadge({stage})` (muted colour per stage + icon + the text), `StallBadge({job})` (uses `stall()`, text like "12 days here", slow = amber, stuck = red, with a clock icon; renders nothing when ok), `StatTile({label, value, hint?, tone?})`, `PageHead({title, subtitle?, action?})`, `Tabs({tabs:{id,label,count?}[], value, onChange, label})` (real `role=tablist`, arrow keys, big targets, scrolls sideways inside itself on phones), `ConfirmDialog({open,title,children,confirmLabel,onConfirm,onClose,tone?})` (uses the existing Dialog; the confirm button is `btn-primary`; Cancel is a quiet button; shows after pressing a stamp button), `MoneyText`, `DaysChip`, `Section({title, action?, children})`, `Th` helper not needed. Existing `StatusBadge`, `RevTag`, `Dialog`, `toast`, `Notice`, `EmptyState` stay, restyled larger. Stage colours: muted, text labelled, 4.5:1 contrast in light and dark.
- `StageBadge` colours: New lead slate, Site visit teal, Quoting amber, Quote sent blue, Quote accepted green, Won deep green, Lost grey. Brand: SprayIT navy (existing `--c-navy` 0 35 150) and green; keep them, plus a brighter brand blue `--c-blue` for accents on the navy header strip.
- Shell: a clean top bar in brand navy with the name "Quote Hub", main nav with FIVE items only: To do, Jobs, Quotes, Contacts, This week; a "More" menu (a native `<details>`-free accessible button with a list) containing Templates, Terms, Price list, Settings (word switch, theme). Mobile (under 640px): the nav becomes a bottom bar with the same five items, large icons plus text, and More. The platform-menu mock on the left can stay as a thin faux sidebar only at 1280px and over, labelled mock. Max width of content 72rem centred; the page is shown inside a frame in the platform, so it never relies on viewport height, and sticky bits stay inside the frame.
- Routes: add `prices` (#/prices -> PriceBook) and `week` (#/week -> Week) to router.ts and `href.prices()`, `href.week()`; App.tsx imports `./pages/PriceBook` and `./pages/Week`. A 404 route falls back to To do.
- STUBS: F2 creates a minimal compiling default-export stub (just a heading) for each phase 2 file that does not exist yet: pages/Week.tsx, pages/PriceBook.tsx, components/SplitPane.tsx, components/ContactCard.tsx, components/QuoteSettingsFields.tsx, components/job/{QuoteFamily,StampBar,TasksPanel,TimelinePanel,MoveToStage,ContactsPanel,ConversationsPanel,PaymentsPanel,AppointmentsPanel}.tsx, lib/summary.ts. Prop contracts for the stubs (owners must keep them):
  - `QuoteFamily({jobId})`, `StampBar({jobId})`, `TasksPanel({jobId})`, `TimelinePanel({jobId})`, `MoveToStage({jobId})`, `ContactsPanel({jobId})`, `ConversationsPanel({jobId})`, `PaymentsPanel({jobId})`, `AppointmentsPanel({jobId})`, `ContactCard({contactId})`: all named AND default exports.
  - `SplitPane({left: ReactNode, right: ReactNode, storageKey: string, leftLabel: string, rightLabel: string})`.
  - `QuoteSettingsFields({quote, onChange})` with `onChange(patch: Partial<Quote>)` (product type select, terms picker filtered by product, GST toggle with the rounding note, valid days).
  - `lib/summary.ts`: `plainSummary(q: Quote, s?: State): string[]` returns 3 to 5 short plain sentences ("This quote is for the roof and walls at 12 Example St.", "The total is $x including GST.", "You pay 30% ($y) before we start and the rest ($z) when the job is finished.", "You can also choose these extras: ...", "This quote is open until 30 December 2026.").
  Each stub must typecheck against the final contract now so phase 2 can start with a green build.

## Done means
`npx tsc --noEmit` clean and `npx vite build` passes for your files; you report in 25 lines or fewer: what you built, what you could not, what you wanted from files you do not own.
