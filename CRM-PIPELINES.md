# CRM Pipelines: SprayIT Solutions

Pipeline and stage design for the Systemations build. Revised after the client
call on Friday 2 October 2026, which replaced "Contacting" with Dial 1 and
Dial 2, dropped the stages that did not fit the way the business works, and put
both boards on the same 13 stages.

This is the reference for three audiences: whoever configures Systemations, whoever runs
the board day to day, and the AI agent that will be allowed to move cards on it.

**Generated.** This file is produced from
`client-journey-onepage/journey-data.js`, the same file that renders the
customer journey page and the other three documents, so they cannot disagree.
Edit the data file and run `npm run docs:crm`. Editing this file by hand will
be overwritten.

---

## 1. Two boards, one shape

| Board | Covers | Stages |
| --- | --- | --- |
| **Residential** | Homes, new builds, sheds and garages. A phone call, a written quote, an install date, and a job that is usually done in a day. | 13 |
| **Commercial & Industrial** | Factories, warehouses, cold storage, agricultural facilities, data centres and mine sites. The same thirteen stages as residential, with company records, purchase orders, SWMS, inductions, site contacts and longer lead times. | 13 |

Each one runs a job from first enquiry to final payment, and a job keeps the
same card for its whole life. Both boards carry the same 13 stages, with
the same names, in the same order, so a new hire learns one board and can read
the other, and the whole business can be read in one view (§5).

**Why two boards at all.** The stages are the same, but the detail is not. A
commercial job carries a company, a purchase order, SWMS, inductions, a site
contact, progress claims and often a retention, and it runs for months. Keeping
the boards apart keeps those cards from cluttering the residential work, and it
lets every figure be read by sector as well as in total.

---

## 2. The 13 stages

New Lead > Dial 1 > Dial 2 > Inspection Required > Quote Sent > Follow-Up >
Nurture > Quote Accepted > Booking Required > Job Booked > Deposit Requested >
Job Completed > Retention Claim.

| # | Stage | Status | Residential: it means | Commercial: it means |
| --- | --- | --- | --- | --- |
| 1 | **New Lead** | Open, still winning the job | A lead has landed. Nobody has rung them yet. | A lead has landed on the commercial board. Nobody has rung them yet. |
| 2 | **Dial 1** | Open, still winning the job | Rung twice back to back with no answer. A text has gone. | Rung twice back to back with no answer. A text has gone. |
| 3 | **Dial 2** | Open, still winning the job | Two rounds of calls with no answer. The emails are running. | Two rounds of calls with no answer. The emails are running. |
| 4 | **Inspection Required** | Open or Won: before the quote, or after the yes | The job needs a site visit before it can be quoted or booked. | The works need a site visit before they can be priced or booked. |
| 5 | **Quote Sent** | Open, still winning the job | A written quote is with them, with accept and decline buttons. | A priced proposal is with them, with an online accept button. |
| 6 | **Follow-Up** | Open, still winning the job | A conversation is live and the customer has asked for a call at a later time. | A conversation is live and the client has asked for a call at a later time. |
| 7 | **Nurture** | Open, still winning the job | A real job that is not happening now: not now, or not affordable yet. | A real project in a future budget cycle. |
| 8 | **Quote Accepted** | Set to Won here | They have accepted a quote, online, by phone or with a purchase order. | The client has accepted, online, in writing or verbally. |
| 9 | **Booking Required** | Won, job underway | Accepted, and ready for an install date in the calendar. | Accepted. The works dates need booking in the calendar. |
| 10 | **Job Booked** | Won, job underway | An install date is booked in the calendar. | The works dates are booked. |
| 11 | **Deposit Requested** | Won, job underway | The deposit invoice is out. The job is booked and waiting for its date. | The deposit invoice is out. The works are booked and waiting for their start. |
| 12 | **Job Completed** | Won, job underway | The crew has marked the job complete. The final invoice is out. | The works are complete. The final claim is out. |
| 13 | **Retention Claim** | Won, job underway | Part of the payment is being held back until a defects period ends. | A retention is being held, usually for six to twelve months after completion. |

The names are written so somebody new can read the board without training. A
dial is a call attempt, not a conversation, which is why Contacting became
Dial 1 and Dial 2.

### How a card moves

- **New Lead.** The lead lands and the acknowledgement text and email go. Ring within 15 minutes, twice back to back. If they answer and it is a job, the quote is sent, which moves the card to Quote Sent. If it needs a site visit first, Inspection Required. A request to ring back later goes to Follow-Up; not now goes to Nurture. No answer to either call: Dial 1.
- **Dial 1.** Entering it sends the tried-to-call text about ten seconds later. A second round of calls the same day. Still nothing: Dial 2.
- **Dial 2.** Entering it starts three emails: a check-in on day 2, an offer of a time to talk on day 4, and an honest close on day 7. Any reply or booking stops them. Nothing by day 8: Lost, reason Unreachable.
- **Inspection Required.** About one job in ten or twenty. Either before the quote, or after acceptance and before Booking Required. Staff attend, so there is no no-show handling.
- **Quote Sent.** The quote carries accept and decline buttons, and can carry more than one option. Follow-ups on days 2, 5, 10 and 21. Accept moves the card to Quote Accepted by itself; decline closes it as Lost. A yes by phone or a purchase order is moved by hand.
- **Follow-Up.** The customer asked for a callback. A task at the time they asked; every sequence paused.
- **Nurture.** Not now, or not affordable yet. Quotes come back after one or two years, so the card is kept: a marketing drip for those who opted in, and a call for everyone at twelve months.
- **Quote Accepted.** The job is won. Thank-you and what happens next, with no deposit request. Then Inspection Required if something needs checking, otherwise Booking Required. An add-on quote on a live job never brings a card back here.
- **Booking Required.** The owner books the install date in the platform's install calendar.
- **Job Booked.** The booking moves the card here. Confirmation, preparation notes, and reminders 7 days and 48 hours before by email and text, each with Yes and No. A No alerts the team; rescheduling is done by a person.
- **Deposit Requested.** Entered when the deposit invoice goes, 14 days before the job, timed by foam type. Jobs with no deposit skip it.
- **Job Completed.** The crew marks the job complete, which sends the final invoice. The job report and certificates go only once it is paid. Paid with no retention: the card closes as Won.
- **Retention Claim.** Run by hand, with a task on the release date.

---

## 3. Residential

| # | Stage | It means | Exits when | Stalls after |
| --- | --- | --- | --- | --- |
| 1 | **New Lead** | A lead has landed. Nobody has rung them yet. | They are rung, and either answer or do not | 15 minutes to the first call |
| 2 | **Dial 1** | Rung twice back to back with no answer. A text has gone. | They answer or reply, or the second round of calls gets nothing | End of the same day |
| 3 | **Dial 2** | Two rounds of calls with no answer. The emails are running. | They reply or book a call, or day 7 passes with nothing | 7 days |
| 4 | **Inspection Required** | The job needs a site visit before it can be quoted or booked. | The visit is done, then the quote is sent or the install is ready to book | 5 days to book the visit |
| 5 | **Quote Sent** | A written quote is with them, with accept and decline buttons. | They accept, decline, ask to be rung later, or go quiet past day 21 | 21 days |
| 6 | **Follow-Up** | A conversation is live and the customer has asked for a call at a later time. | The callback happens and the card moves on | A day past the callback time |
| 7 | **Nurture** | A real job that is not happening now: not now, or not affordable yet. | They come back: to Quote Sent for a fresh quote, or New Lead | Review quarterly |
| 8 | **Quote Accepted** | They have accepted a quote, online, by phone or with a purchase order. | An inspection is needed, or the install date is ready to book | 1 day |
| 9 | **Booking Required** | Accepted, and ready for an install date in the calendar. | The install is booked in the calendar | 2 business days |
| 10 | **Job Booked** | An install date is booked in the calendar. | The deposit invoice is sent, or the crew marks the job complete | The job date |
| 11 | **Deposit Requested** | The deposit invoice is out. The job is booked and waiting for its date. | The crew marks the job complete | The deposit due date |
| 12 | **Job Completed** | The crew has marked the job complete. The final invoice is out. | The final invoice is paid | 14 days |
| 13 | **Retention Claim** | Part of the payment is being held back until a defects period ends. | The retention is paid | The release date |

### The stages that carry weight

- **New Lead exists to be measured.** Time to first call is the single biggest lever in the pipeline, and the 15 minute timer is what protects it.
- **Dial 1 and Dial 2 are capped.** Two rounds of calls and a text, then three emails over a week, then Lost with the reason Unreachable. Nothing rots.
- **Quote Sent carries the buttons.** The accept button moves the card and records the option chosen, so most acceptances need nobody to touch the board.
- **Booking Required is separate from Quote Accepted** because an inspection can sit between them, and because a job waiting for a date should be visible as exactly that.
- **Deposit Requested is timed to the job, not the booking.** A job booked months out gets no invoice until two weeks before.
- **Job Completed is where the money and the paperwork meet.** Final invoice on completion; job report and certificates only once it is paid.

---

## 4. Commercial & Industrial

| # | Stage | It means | Exits when | Stalls after |
| --- | --- | --- | --- | --- |
| 1 | **New Lead** | A lead has landed on the commercial board. Nobody has rung them yet. | They are rung, and either answer or do not | 15 minutes to the first call |
| 2 | **Dial 1** | Rung twice back to back with no answer. A text has gone. | They answer or reply, or the second round of calls gets nothing | End of the same day |
| 3 | **Dial 2** | Two rounds of calls with no answer. The emails are running. | They reply or book a call, or day 7 passes with nothing | 7 days |
| 4 | **Inspection Required** | The works need a site visit before they can be priced or booked. | The visit is done, then the proposal is sent or the works are ready to book | 5 days to book the visit |
| 5 | **Quote Sent** | A priced proposal is with them, with an online accept button. | Accepted, declined, deferred, or quiet past day 21 | 21 days |
| 6 | **Follow-Up** | A conversation is live and the client has asked for a call at a later time. | The callback happens and the card moves on | A day past the callback time |
| 7 | **Nurture** | A real project in a future budget cycle. | It comes back: to Quote Sent for a refreshed proposal | Review quarterly |
| 8 | **Quote Accepted** | The client has accepted, online, in writing or verbally. | An inspection is needed, or the works are ready to book | 1 day, or 14 days waiting on a purchase order |
| 9 | **Booking Required** | Accepted. The works dates need booking in the calendar. | The works are booked in the calendar | 2 business days |
| 10 | **Job Booked** | The works dates are booked. | The deposit invoice is sent, or the works are marked complete | The start date |
| 11 | **Deposit Requested** | The deposit invoice is out. The works are booked and waiting for their start. | The works are marked complete | The deposit due date |
| 12 | **Job Completed** | The works are complete. The final claim is out. | The final claim is paid | 30 days |
| 13 | **Retention Claim** | A retention is being held, usually for six to twelve months after completion. | The retention is paid | The release date |

**What is different on commercial.** The first email asks for the five things
that make the scoping call useful. Inspections need inductions, PPE and a site
contact. The proposal can be accepted online, by a signed acceptance or by a
purchase order, and a verbal yes is never counted as Won. Job Booked carries the
mobilisation email with SWMS and insurances, inductions, a 6:30am text to the
site contact each site day, weekly progress on staged jobs and progress claims.
A reference is asked for instead of relying on a Google review, and repeat
clients such as Bondor and Australian Housing are set to No for the review
request. Retentions of six to twelve months are common.

---

## 5. The whole pipeline in one view

Both boards use the same thirteen stages in the same order, so the whole business reads in one view: every open job, residential and commercial, stage by stage. The boards stay separate for the day-to-day work. The overview is for seeing all of it at once, and it is where the owner looks first on a Monday.

How to build it:

1. Keep the stage names and order identical on both boards. The overview depends on it, and the checker fails if the two boards drift apart.
2. Opportunities, list view: filter on both pipelines and status Open, sort by stage, and save it as "Whole pipeline". Share it with the owner and the office. Confirm at build that the list view takes both pipelines in one filter.
3. If the list view cannot take both pipelines, build the same thing as a contact smart list filtered on the stage tags: stage-res-<key> or stage-com-<key> for the same key, one saved filter per stage.
4. Dashboard, "Whole pipeline": a stage funnel widget for each board side by side, both filtered to status Open, plus open value and won value, each filtered on status. Never an unfiltered value.
5. Weekly figures such as quotes sent and quotes accepted are reported once across both boards, because the stage keys match.

---

## 6. Status, the Won line, and Lost reasons

Do not build "Won" or "Lost" stages. Status already carries it, building it
twice double-counts, and it breaks the built-in conversion reporting. Quote
Accepted is a real stage where the status is set, not a marker.

- **Won** when the card enters Quote Accepted. On residential, any acceptance: the button, a phone call or a purchase order. On commercial, a written acceptance or a purchase order; a verbal yes waits in Quote Accepted, status Open, until the paperwork lands.
- **Lost** with a reason, always. A Lost with no reason teaches nothing.
- **Abandoned** for duplicates, spam and wrong numbers, so they stay out of the conversion maths entirely.

| Question | Where the answer lives |
| --- | --- |
| What might we win? | Open cards, stages 1 to 7 |
| What have we committed to deliver? | Won cards, stages 8 to 13, and Inspection Required cards that are Won |
| What is the forecast worth? | **Open only.** Never the whole board. |

### Lost reasons (fixed list, single select)

Price · Went with another contractor · Chose batts or another product ·
Timing, project deferred · Outside service area · Not suitable for spray foam ·
Unreachable · Not the decision maker · Budget withdrawn · Cancelled after
acceptance · Duplicate · Spam

The distinction between *Price* and *Chose batts* is the one worth having. They
point at completely different fixes, and the R-value explainer on the site
exists to answer the second one. A "not now" is Nurture, not Lost.

---

## 7. Opportunity value

| Stage | What value to carry |
| --- | --- |
| New Lead to Follow-Up, before a quote | Zero |
| Quote Sent onward | The quoted figure; on a job with options, the option most likely to be chosen |
| Quote Accepted onward | The accepted option, plus accepted add-ons and signed variations |
| Nurture | The last quoted figure, so the forecast of returning work is visible |

Commercial ranges from small to millions, which is too wide to forecast from,
so those cards carry nothing until a real number exists.

---

## 8. Deposits, invoices and payment

- **Deposits are never sent at booking.** The deposit invoice goes 14 days before the install date, or straight away if the job is less than 14 days out. It is due 1 business day before the job for stock open cell, and 7 days before for special-order foam, because that material is made and shipped for the job. To confirm with Glenn.
- **An unpaid deposit at its due date** alerts the owner and the office, so the crew can be reassigned. No card storage, no automatic charging.
- **Deposits are a liability in the accounts**, not sales income, until the job is done. Map the deposit item in Xero accordingly.
- **The final invoice goes when the crew marks the job complete.** One invoice can carry a payment schedule, by percentage or fixed amounts, each with a due date.
- **Every invoice carries the accepted quote**, which holds the terms and conditions, and the client's purchase order where there is one.
- **The job report and certificates of completion** go only once the final invoice is fully paid.
- **Retentions** on larger commercial jobs, held six to twelve months, sit in Retention Claim with a task on the release date.
- **Xero.** Sync is agreed, but only GST-free invoices have been seen reaching Xero so far and these carry GST: test a GST invoice before promising it. If marking an invoice paid in the platform before the bank transfer clears breaks the bookkeeper's reconciliation, switch off the payment receipt sync.
- **Contracts and variations.** Document templates fill in the client details for digital signature, including site variations such as an extra 100 sqm agreed mid-job.

---

## 9. Routing: which board a lead enters

Routed automatically on `propertyType` from the webhook payload.

| `propertyType` | Board |
| --- | --- |
| `home`, `new-build` | Residential |
| `shed` | Residential |
| `factory` | Commercial & Industrial |
| `farm` | Commercial & Industrial |
| `other` | Residential, plus a review task to confirm |

Override rule: any enquiry whose message mentions a tender, a builder or head
contractor, or an area over 500 sqm, goes to Commercial regardless of
`propertyType`. A card that turns out to be on the wrong board gets moved, not
recreated. Moving preserves the attribution and the consent record, and because
the stage keys match, it lands in the same stage on the other board.

---

## 10. Opportunity fields

The full field list, contact and opportunity, is in
[CRM-MESSAGING.md](CRM-MESSAGING.md) §3. These are the ones the stages set.

| Key | Label | Type | Stage it is set |
| --- | --- | --- | --- |
| `site_address` | Site address | Text | New Lead, on the first call |
| `access_notes` | Access notes | Multi-line | Inspection Required, or the first call |
| `sqm_estimate` | Area, sqm | Number | Inspection Required, or the first call |
| `product_type` | Product | Dropdown: open cell, closed cell, both | Quote Sent |
| `inspection_date` | Inspection date | Date | Inspection Required, from the inspection calendar |
| `callback_at` | Callback time | Date and time | Follow-Up. Required on entry. |
| `quote_number` | Quote number | Text | Quote Sent |
| `quote_link` | Online quote | URL | Quote Sent, from the quote tool |
| `quote_sent_at` | Quote sent | Date | Quote Sent |
| `accepted_quote_option` | Accepted option | Text | Quote Accepted. Which quote the client accepted, when the job has more than one. |
| `po_number` | Purchase order | Text | Quote Accepted, where the client issues one. On commercial, entering it sets Won. |
| `foam_order_type` | Foam order | Dropdown: Stock open cell, Special order | Quote Accepted. Decides the deposit due date. |
| `deposit_amount` | Deposit amount | Monetary | Quote Accepted, where a deposit applies |
| `job_date` | Install date | Date | Job Booked, from the install calendar booking |
| `job_end_date` | Finish date | Date | Job Booked, multi-day and commercial works |
| `crew_assigned` | Crew | Text | Job Booked, from the install calendar |
| `job_confirmed` | Date confirmed | Dropdown: Yes, No | Job Booked, by the Yes and No buttons on the reminders |
| `deposit_due_date` | Deposit due | Date | Job Booked: 1 business day before job_date for stock open cell, 7 days before for special order |
| `deposit_invoice_sent_at` | Deposit invoice sent | Date | Deposit Requested |
| `deposit_received_at` | Deposit received | Date | Deposit Requested, when paid |
| `variation_amount` | Variations | Monetary | Job Booked or Job Completed, as each variation is signed |
| `photos_captured` | Photos captured | Checkbox | Job Completed. Required before the job can be marked complete. |
| `invoice_number`, `invoice_sent_at` | Final invoice | Text, Date | Job Completed |
| `final_invoice_paid_at` | Final invoice paid | Date | Job Completed, when fully paid |
| `job_report_sent_at` | Job report sent | Date | Job Completed, when the report goes |
| `retention_amount` | Retention held | Monetary | Job Completed, before it is marked paid |
| `retention_release_date` | Retention release | Date | Job Completed, before it is marked paid |
| `lost_reason` | Lost reason | Dropdown | On Lost |

---

## 11. Automation per stage

Message ids refer to [CRM-MESSAGING.md](CRM-MESSAGING.md), alert numbers to
[CRM-TASKS-NOTIFICATIONS.md](CRM-TASKS-NOTIFICATIONS.md), and the workflows that
send them are in [CRM-WORKFLOWS.md](CRM-WORKFLOWS.md).

| Stage | Residential messages | Commercial messages | Alerts |
| --- | --- | --- | --- |
| 1. New Lead | X-ACK-01, X-ACK-02 | X-ACK-01, C-ACK-01 | 1, 6, 7 |
| 2. Dial 1 | DIAL-01 | DIAL-01 | 3 |
| 3. Dial 2 | DIAL-02, DIAL-03, DIAL-04, X-APPT-01, X-APPT-02, X-APPT-03, X-APPT-04, X-APPT-06 | DIAL-02, DIAL-03, DIAL-04, X-APPT-01, X-APPT-02, X-APPT-03, X-APPT-04, X-APPT-06 | 3, 4, 5 |
| 4. Inspection Required | X-INSP-01, X-INSP-02, X-APPT-06 | C-INSP-01, X-INSP-02, X-APPT-06 | none |
| 5. Quote Sent | R-QUOTE-01, R-QUOTE-02, R-FU-01, R-FU-02, R-FU-03, R-FU-04, LOST-01 | C-PROP-01, C-PROP-02, C-PROP-03 | 3 |
| 6. Follow-Up | none | none | 3 |
| 7. Nurture | NUR-01, NUR-02, NUR-03, NUR-04 | C-FUT-01 | 3 |
| 8. Quote Accepted | X-ACC-01, X-ACC-02 | C-PO-01 | 8 |
| 9. Booking Required | none | none | none |
| 10. Job Booked | JOB-01, JOB-02, REM-01, REM-02, REM-03, REM-04, REM-05, JOB-04, JOB-06 | C-MOB-01, REM-01, REM-02, REM-03, REM-04, REM-05, C-SITE-01, C-PROG-01, C-PAY-01, JOB-06 | 12 |
| 11. Deposit Requested | DEP-02, DEP-03, DEP-01 | DEP-02, DEP-03, DEP-01 | 9, 13 |
| 12. Job Completed | JOB-05, PAY-01, PAY-02, PAY-03, RPT-01, REV-01, REV-02, REV-03 | C-DONE-01, PAY-01, RPT-01, C-CLOSE-01, REV-01 | 10 |
| 13. Retention Claim | RET-01 | RET-01 | none |
| Any time | SYS-01, SYS-02 | same | 2, 3, 10, 11 |

Two rules that matter more than the table:

1. **Every sales sequence stops the moment the person replies.** A sequence that
   keeps firing after someone has answered is the fastest way to turn a won job
   into a complaint. Reminders about an agreed date keep running.
2. **Entering Quote Accepted kills every sales sequence on the card**, and an
   add-on quote on a live job never re-fires it.

---

## 12. What the AI agent may and may not do

The voice and chat agents share the boards with the team. That only works if
the boundary is explicit: the AI works the first conversation and never touches
a quote, a price, a booking date or money.

**The AI may**

- Create the opportunity at New Lead
- Answer questions the site already answers: what spray foam is, open cell against closed cell, what the process looks like, service area
- Book, reschedule and cancel in the phone call calendar
- Move a card to Follow-Up with a callback time when someone asks to be rung later
- Move a card to Nurture when someone says not now
- Send reminders and confirmations

**The AI may not**

- Send a quote, or state a price, a firm lead time, or a performance figure
- Set or change the opportunity value
- Set any status: not Won, not Lost, not Abandoned
- Move any card to Quote Accepted or beyond, on either board
- Book an install date, or touch a deposit, an invoice or a retention
- Promise compliance, suitability or warranty outcomes for a specific building

**Escalate to a person immediately**

- Any commercial enquiry, once identified as commercial
- Any request for a firm price
- Anything mentioning a complaint, insurance, legal, or an existing job
- Any contact about a booked job, including "where is the crew" or "I need to change the date"
- An unhappy customer, at any point
- Anything the agent has answered twice without the person accepting the answer

---

## 13. Compliance the pipeline has to respect

- **Transactional against marketing.** Every message is tagged. TRANS is about an enquiry, appointment or job the person already has with us: no marketing consent needed and no unsubscribe required, though the sender is always identified. MKTG is promotional: it sends only when the person ticked the box on the form, and it always carries a working unsubscribe.
- **What the person actually agreed to.** The form stores the exact consent wording, its version, the time and the page, and the CRM keeps that on the contact. Under the Spam Act 2003 the evidence is what someone was shown, not what the current form says, so it is never overwritten by a later submission.
- **Every SMS identifies the sender.** Every text ends with the sign-off: Rachael, SprayIT Solutions. An unidentified SMS is the most common Spam Act failure and the easiest to avoid.
- **Send window.** Outbound customer messages send between 8am and 8pm, Monday to Saturday, local time. Confirmations send immediately because the person is waiting for them. Chases and reminders wait for the window. The Do Not Call standard governs telemarketing calls rather than SMS to someone who enquired, so this is policy rather than law, and it exists because a 6am quote chase costs more goodwill than it earns.
- **Call recording.** If assistant calls are recorded, callers are told at the start of the call. Victoria's rules on recording private conversations are strict, so this is a script requirement rather than a nice to have.
- **Prices come from a person, in writing.** Nothing in the journey states a price, a lead time or a performance figure that has not been substantiated. The assistant is barred from quoting: a price comes from the team, in a written quote, after the job has been talked through, so it is never a guess that turns into a commitment.
- **Do Not Call Register.** Applies to cold outbound, not to someone who enquired. Any purchased or scraped list needs washing first.
- **Australian Consumer Law.** Any performance claim the agent makes has to be substantiated. This is the same reason the R-value figure on the site is gated behind sign-off rather than published.

---

## 14. Reports worth watching

Every value report below filters on **status**. On a board that runs the sale
and the job together, an unfiltered figure is meaningless.

1. **Time to first call** on New Lead. The one number that moves everything else.
2. **Dial 1 and Dial 2 outcomes.** How many leads answer the text, the day 4 booking link, or the close-off, and how many close as Unreachable.
3. **Open pipeline value**, status Open only. This is the forecast.
4. **Committed work**, status Won and not yet closed. This is the schedule, and the cash coming.
5. **Quote Sent to Quote Accepted**, by board and by source. Measure conversion across the sales stages only.
6. **Online acceptance rate.** How many acceptances come from the button rather than a phone call.
7. **Days in Booking Required.** Should be under two.
8. **Reminder answers.** Yes, No and no answer, and how many Nos turn into a new date.
9. **Days from acceptance to final payment**, and deposits paid late.
10. **Lost reason mix.** Watch the ratio of *Price* to *Chose batts*.
11. **Nurture returns.** Cards that come back to Quote Sent after six, twelve and twenty-four months.
12. **Paid revenue by `utm_source` / `gclid` / `fbclid`.** The attribution fields survive all the way to payment, so ad spend can be judged on money received rather than on form fills.

---

## 15. Open items to confirm with Glenn

- Rachael's mobile, 0428 26 36 26, is the number in every customer message and the SMS sign-off. Glenn confirmed the number in the templates is hers; confirm it before go-live.
- Deposit timing. The deposit invoice goes 14 days before the install date, or straight away if the job is closer than that. It is due 1 business day before for stock open cell and 7 days before for special-order foam. The call notes also said "2 weeks before install"; this reading reconciles the two.
- Inspection Required is stage 4, used by about one job in ten or twenty: before the quote when a job cannot be priced from the call, or after acceptance and before Booking Required.
- The Google review request goes 4 weeks after the job date, inside the 4 to 6 weeks discussed, and only when Ask for Google review is Yes.
- Optional upgrades on a quote that update the total live (for example R2.5 to R4) are pending scope confirmation. Nothing is built for them.
- Xero sync for invoices carrying GST is untested. Only GST-free invoices have been seen reaching Xero so far.
- Commercial jobs are marked Won on a written acceptance (the accept button or a signed acceptance) or a purchase order. A verbal yes sits in Quote Accepted, status Open, until the paperwork lands.
- The out-of-hours text gives the mobile for anything urgent. Confirm that is wanted, or point it at the business line.
- Commercial payment terms, and whether progress claims follow a percentage, a milestone or a monthly cycle.
- Trading hours, and whether Saturday work happens. The send windows and quiet hours are placeholders shaped like a normal trades week.
- Service area boundary, so Outside service area can be automated.
- Whether AI voice calls are recorded, which decides the script opening.
