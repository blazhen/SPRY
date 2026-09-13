# CRM Pipelines: Spray It Solutions

Pipeline and stage design for the Systemations build, written to match what the
website actually captures and sends.

This is the reference for three audiences: whoever configures Systemations, whoever runs
the board day to day, and the AI agent that will be allowed to move cards on it.

Three companions sit beside it. [CRM-MESSAGING.md](CRM-MESSAGING.md) holds
every message the stages send, [CRM-TASKS-NOTIFICATIONS.md](CRM-TASKS-NOTIFICATIONS.md)
holds what the team is told and asked to do, and the customer journey page in
`client-journey-onepage/` shows all of it stage by stage, the way the customer
and the team will actually see it. Those two documents and the page are
generated from the same data file, so they cannot disagree with each other.

---

## 1. Two pipelines, split by sector

| Pipeline | Covers | Stages |
| --- | --- | --- |
| **Residential** | Homes, new builds, sheds, garages | 12 |
| **Commercial & Industrial** | Factories, warehouses, cold storage, agricultural facilities, data centres, mine sites | 13 |

Each one runs a job from first enquiry to final payment. There is no separate
delivery board: a job keeps the same card for its whole life.

**Why the split is by sector and not by sales against delivery.** Residential and
commercial are genuinely different sales. A roof retrofit closes off one phone
call and one site visit. A 30,863 sqm industrial job runs through specification,
tender, procurement and a purchase order, and takes months. Forced onto one
board the stages stop meaning anything, because half the cards skip half the
stages and every conversion figure becomes an average of two unrelated
processes. That is the split worth having, so it is the one we spend on.

---

## 2. The Won line

Because delivery lives on the same board as sales, one rule holds the whole
design together.

> **Mark the opportunity Won when the customer accepts, not when the job is
> finished or paid.**

Systemations tracks **status** (Open, Won, Lost, Abandoned) separately from
**stage**. A card can be status `Won` and still sit in the "In Progress" stage.
That is what keeps two different questions separable on one board:

| Question | Answer |
| --- | --- |
| What might we win? | Open opportunities, stages 1 to 8 |
| What have we committed to deliver? | Won opportunities, stages 9 to 12 |
| What is the forecast worth? | **Open only.** Never the whole board. |

Residential marks Won on quote acceptance. Commercial marks Won on the purchase
order, never on a verbal.

### What this costs

Worth knowing up front rather than discovering in three months.

- **Every value report has to filter on status.** An unfiltered "pipeline value"
  now adds work already sold to work still being chased, and reads roughly
  double what is actually in play. Save the filtered views as the defaults so
  nobody has to remember.
- **The boards are long.** Twelve and thirteen columns is a lot of horizontal
  scrolling, particularly on a phone. Saved views per stage group are the fix.
- **Stage conversion rates get muddier.** "Quote Sent to Scheduled" is a real
  conversion; "Scheduled to In Progress" is just work happening. Only measure
  conversion across the sales stages.

### What it buys

- Two boards instead of three, which a family business will actually keep
  updated.
- One card per job, so no handover step, no duplicate record, and the full
  history from first click to final invoice in one place.
- Attribution survives to the end. You can ask what a Google Ads click was
  eventually worth in paid revenue, not just in quotes sent.

---

## 3. Residential

Stages 1 to 7 are the sale. Stage 8 is a siding. Stages 9 to 12 are the job.

| # | Stage | It means | Exits when | Stalls after |
| --- | --- | --- | --- | --- |
| 1 | **New Enquiry** | Lead has landed. Nobody has touched it. | First contact attempt is logged | **1 business hour** |
| 2 | **Contacting** | At least one attempt made, no two-way conversation yet | They reply, or attempts are exhausted | 2 days |
| 3 | **Qualified** | We have spoken to them and it is a job we want | Site assessment is booked | 3 days |
| 4 | **Assessment Booked** | Date and time in the diary | The assessment happens | On the date |
| 5 | **Quoting** | Measured up, preparing the number | Quote is sent | **2 days** |
| 6 | **Quote Sent** | Written quote delivered, value on the card | Accepted, declined, or gone quiet | 3 days |
| 7 | **Follow-up** | Chasing a decision | Won, Lost, or moved to Nurture | 30 days |
| 8 | **Nurture** | Real job, wrong time | They re-engage, back to Qualified | Review quarterly |
| | | **← Won is marked here →** | | |
| 9 | **Scheduled** | Accepted, date and crew locked | Crew starts | On the date |
| 10 | **In Progress** | On site | Work finished | 3 days over |
| 11 | **Invoiced** | Work complete, photos captured, invoice out | Payment received | 14 days |
| 12 | **Paid & Closed** | Done | Closes the card | |

### The stages that carry weight

**1. New Enquiry exists to be measured.** Time to first contact is the single
biggest lever in the pipeline, and it cannot be measured if leads land straight
into Contacting.

**2. Contacting is capped.** Five attempts over seven days across call, SMS and
email. When the cap is hit the card goes to Lost with reason *Unreachable*,
rather than being left to rot.

**3. Qualified is where a deal becomes real.** Building type, areas, access,
timeframe, and confirmation we are talking to whoever decides. Everything before
it is administration. This is where a forecast value is first set.

**4. Assessment Booked follows the consult, not the form.** Spray foam cannot be
quoted without seeing the building, and a rig should not be sent across the state before
the job is qualified. The calendar sells a fifteen minute phone call; a human
books the site assessment afterwards.

**5. Quoting is time-boxed at two days.** A quote that takes a week loses jobs
that were already won on the day.

**7. Follow-up is structured, not improvised.** Day 2, day 5, day 10, day 21. If
day 21 passes with nothing, the card is Lost or Nurture. It is never left
sitting. If the board ever needs shortening, this is the first stage to fold
back into Quote Sent, since the sequence does the work either way.

**8. Nurture is a siding, not a step.** It sits beside the sales run rather than
after it, because cards arrive there from Follow-up and leave backwards to
Qualified. For "still planning", "three months or more", "just researching", and
anyone who deferred on budget.

**11. Invoiced is where the photos get captured.** Completed jobs are the source
of the site photography, which matters more than usual given competitors have
been lifting images off the old website. Make it a required task on entry or it
will not happen.

**12. Paid & Closed is the most valuable stage on either board.** It fires a
review request, a referral ask, and a check-in scheduled twelve months out.

---

## 4. Commercial & Industrial

| # | Stage | It means | Exits when | Stalls after |
| --- | --- | --- | --- | --- |
| 1 | **New Enquiry** | Untouched | First attempt logged | **1 business hour** |
| 2 | **Contacting** | Attempted, no conversation yet | They reply | 3 days |
| 3 | **Qualified / Scoping** | Decision maker identified, scale and programme understood | Inspection booked | 5 days |
| 4 | **Inspection Booked** | Site visit in the diary | The visit happens | On the date |
| 5 | **Specifying** | Product, thickness, access, plant, staging and WHS being worked out | Proposal issued | 5 days |
| 6 | **Proposal Submitted** | Priced proposal or tender lodged | Shortlisted, declined, or quiet | 7 days |
| 7 | **Commercial Review** | They are evaluating: clarifications, value engineering, references, insurances, SWMS | A decision | 14 days |
| 8 | **Awaiting PO** | Verbally won, paperwork pending | PO or signed contract received | 14 days |
| 9 | **Future Project** | Real project, future budget cycle | It comes back around | Review quarterly |
| | | **← Won is marked here, on the PO →** | | |
| 10 | **Mobilising** | PO in hand. Programme, access, inductions, SWMS, materials. | Crew starts | On the date |
| 11 | **In Progress** | On site, possibly in stages | Works complete | Per programme |
| 12 | **Invoicing** | Progress claims or final invoice out | Payment received | 30 days |
| 13 | **Paid & Closed** | Done | Closes the card | |

**Why stages 7 and 8 are separate.** "They are still deciding" and "they have
chosen us and procurement is slow" look identical on a board and are completely
different for forecasting. Splitting them is what makes a commercial forecast
worth reading.

**Why commercial gets Mobilising and residential does not.** A house job goes
from accepted to scheduled. An industrial job needs site inductions, SWMS sign
off, access arrangements and often a staged programme before anyone turns up.
That work is real, it takes weeks, and hiding it inside "Scheduled" makes the
board lie about where the job is.

**Invoicing, not Invoiced.** Large jobs bill in progress claims, so the stage
holds until the final payment lands rather than assuming one invoice.

---

## 5. Status, and Lost reasons

Do not build "Won" or "Lost" stages. Status already carries it, building it
twice double-counts, and it breaks the built-in conversion reporting.

- **Won** at acceptance (residential) or PO received (commercial), then the card
  keeps moving through the delivery stages.
- **Lost** with a reason, always. A Lost with no reason teaches nothing.
- **Abandoned** for duplicates, spam and wrong numbers, so they stay out of the
  conversion maths entirely.

### Lost reasons (fixed list, single select)

Price · Went with another contractor · Chose batts or another product ·
Timing, project deferred · Outside service area · Not suitable for spray foam ·
Unreachable · Not the decision maker · Budget withdrawn · Duplicate · Spam

The distinction between *Price* and *Chose batts* is the one worth having. They
point at completely different fixes, and the R-value explainer on the site
exists to answer the second one.

---

## 6. Opportunity value hygiene

### Deposits

Deposits are taken on some jobs and not others, so **a deposit is a field on the
card, not a gate between stages**. An earlier version of this design held a job
out of Scheduled until one was received, which would have stranded every job
that never needed one.

Where a deposit does apply, `deposit_amount` and `deposit_received_at` are
filled in and the deposit request fires. Where it does not, the card moves to
Scheduled on acceptance alone. The only automation that should ever wait on a
deposit is the one that asks for it.

---

## 6a. Opportunity value

| Stage | What value to carry |
| --- | --- |
| New Enquiry, Contacting | Zero |
| Qualified | A default estimate by property type and area, for forecasting only |
| Quote Sent onward | The actual quoted figure |
| Delivery stages | Unchanged from the accepted figure, plus variations |

Setting a real number before the site assessment produces a forecast made of
guesses. Leaving it at zero until Quote Sent produces a pipeline that appears
worthless. The estimate at Qualified is the compromise.

Variations agreed on site go on the card as they happen, not at invoicing.
Otherwise the delivery half of the board understates what is owed.

### Default forecast values

Client-supplied, for the estimate set at Qualified. These are what a job runs
to, not what any particular job will be.

| Job | Band |
| --- | --- |
| Residential floors, per day on site | $3,200 to $6,000 |
| Full house | $25,000 to $40,000 |
| Commercial | No useful band. Leave at zero until quoted. |

Residential floor work is priced per day rather than per job, so the estimate at
Qualified should be one day's rate until the assessment establishes how many
days it is. Commercial ranges from small to millions, which is too wide to
forecast from, so those cards carry nothing until a real number exists.

---

## 7. Routing: which pipeline a lead enters

Routed automatically on `propertyType` from the webhook payload.

| `propertyType` | Pipeline |
| --- | --- |
| `home`, `new-build` | Residential |
| `shed` | Residential |
| `factory` | Commercial & Industrial |
| `farm` | Commercial & Industrial |
| `other` | Residential, plus a review task to confirm |

Override rules worth adding once volume justifies it: any enquiry whose message
mentions a square metre figure above a threshold, a tender, or a builder or head
contractor, goes to Commercial regardless of `propertyType`.

Farm and agricultural work routes to Commercial on the client's own instruction:
his revision document lists agricultural facilities alongside factories,
warehouses and data centres on the commercial page. Settled, not assumed.

A card that turns out to be in the wrong pipeline gets moved, not recreated.
Moving preserves the attribution and the consent record.

---

## 8. Custom fields to create in Systemations

These map one to one onto what the site already posts, so no transformation is
needed. Field names are the JSON keys from the lead webhook.

**Job detail**

| Field | Type | Values |
| --- | --- | --- |
| `propertyType` | Single select | home, new-build, shed, factory, farm, other |
| `areas` | Text (comma separated) | roof, walls, underfloor, whole, unsure |
| `stage` | Single select | existing, construction, planning |
| `timeframe` | Single select | asap, 1-3-months, 3-plus-months, researching |
| `postcode` | Text | |
| `message` | Long text | |

`stage` here is the **building's** stage (retrofit, under construction, still
planning). It is not the pipeline stage. Rename it to `buildingStage` in Systemations, or
the two will be confused within a week. This matters more now that the boards
are long.

**Consent evidence**

| Field | Type |
| --- | --- |
| `consent_marketing` | yes / no |
| `consent_text` | Long text |
| `consent_at` | Date/time |
| `consent_page` | Text (URL) |

**Attribution**

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id`,
`gclid`, `fbclid`, plus first and last touch: `first_touch_at`,
`first_touch_referrer`, `first_touch_landing`, `last_touch_referrer`,
`last_touch_landing`.

**Housekeeping**

`source` (always `website`), `form` (always `quote_request`), `submitted_at`,
`page_title`, `phone_raw`.

Phone arrives already normalised to E.164 (`+61...`) because that is what the
CRM matches a person on across web, SMS, chat and voice. `phone_raw` keeps
whatever they actually typed.

---

## 9. Automation per stage

Message IDs refer to [CRM-MESSAGING.md](CRM-MESSAGING.md). The journey page
shows each of these under its stage.

| Trigger | Action | Messages |
| --- | --- | --- |
| Enters **New Enquiry** | SMS acknowledgement within 2 minutes, email echo of the enquiry. Call task assigned. Alert to the assigned user. | X-ACK-01, X-ACK-02 (C-ACK-01 on commercial) |
| 1 business hour in **New Enquiry** | Escalate to a second person | |
| Enters **Contacting** | Start the five-attempt sequence across call, SMS and email | X-CHASE-01 to 04 |
| Attempts exhausted | Lost, reason *Unreachable* | |
| Phone consult booked, at any point | Confirmation, reminders at 24 hours and 2 hours, no-show and change handling | X-APPT-01 to 06 |
| Enters **Qualified** | Set forecast value. Point them at the calendar for the assessment. | X-BOOK-01, X-BOOK-02 |
| Enters **Assessment Booked** / **Inspection Booked** | Confirmation with the address. Morning-of text. | R-ASSESS-01, R-ASSESS-02 (C-INSP-01 on commercial) |
| Assessment marked done, enters **Quoting** / **Specifying** | Tell them when the quote lands. Start the 2 day clock (5 on commercial). | R-QUOTING-01 (C-SPEC-01) |
| Enters **Quote Sent** / **Proposal Submitted** | Delivery confirmation. Schedule follow-ups at day 2, 5, 10, 21 (day 7, 21 on commercial). | R-QUOTE-01, R-QUOTE-02, R-FU-01 (C-PROP-01, C-PROP-02) |
| Enters **Follow-up** / **Commercial Review** | The rest of the sequence, ending in a decision | R-FU-02 to 04 (C-PROP-03) |
| Marked **Lost** | Reason required. Graceful goodbye on residential. Add to nurture if the reason was timing. | LOST-01 |
| Enters **Nurture** / **Future Project** | Consent-gated drip: 0, 30, 90 days (quarterly on commercial) | NUR-01 to 03 (C-FUT-01) |
| Enters **Awaiting PO** | List what mobilisation needs. Weekly PO chase task. | C-PO-01 |
| **Status set to Won** | Thank them and set out the steps. Deposit request where one applies. Handover tasks. **Stop every sales sequence.** | X-WON-01, X-WON-02 (C-MOB-01) |
| Deposit received | One-line confirmation, and scheduling unblocks | DEP-01 |
| Enters **Scheduled** / **Mobilising** | Booking with preparation notes. Reminder the afternoon before. | JOB-01, JOB-02, JOB-03 (C-MOB-01) |
| Enters **In Progress** | Crew on the way text. Photo and variation tasks on the crew lead. Weekly progress on staged commercial jobs. | JOB-04, JOB-06 (C-SITE-01, C-PROG-01) |
| Enters **Invoiced** / **Invoicing** | Completion note with photos, then the invoice separately. Reminders at day 7 and day 14, stopped on payment. | JOB-05, PAY-01 to 03 (C-DONE-01, C-PAY-01) |
| Enters **Paid & Closed** | Review request the next day, referral ask at a week, 12 month check-in. Reference request on commercial. | REV-01 to 03 (C-CLOSE-01) |
| Any time | Missed call text-back, out of hours reply | SYS-01, SYS-02 |

Two rules that matter more than the table:

1. **Every reminder and follow-up sequence stops the moment the person replies.**
   A sequence that keeps firing after someone has answered is the fastest way to
   turn a won job into a complaint.
2. **Setting Won must kill every sales sequence on the card.** On a merged board
   the sales automation and the delivery automation live on the same record, so
   a quote follow-up firing at a customer whose job is already booked is a real
   and easy failure.

---

## 10. What the AI agent may and may not do

The voice and chat agents share the boards with the family. That only works if
the boundary is explicit. On merged boards the boundary is simply the Won line:
the AI works the sales half and never crosses it.

**The AI may**

- Create the opportunity and move New Enquiry to Contacting
- Qualify: building type, areas, access, timeframe, decision maker
- Move a card to Qualified once those are captured
- Book, reschedule and cancel in the phone consult calendar, and move to
  Assessment Booked
- Send reminders and confirmations
- Answer questions the site already answers: what spray foam is, open cell
  against closed cell, what the process looks like, service area
- Move a card to Nurture when someone says not now

**The AI may not**

- Send a quote, or state a price, a firm lead time, or a performance figure
- Set or change the opportunity value
- Set any status: not Won, not Lost, not Abandoned
- Move any card past Qualified on the Commercial board
- **Move any card at or beyond the Won line on either board**
- Promise compliance, suitability or warranty outcomes for a specific building

**Escalate to a human immediately**

- Any commercial enquiry, once identified as commercial
- Any request for a firm price
- Anything mentioning a complaint, insurance, legal, or an existing job
- Any contact about a job already in delivery, including "where is the crew"
- An unhappy customer, at any point
- Anything the agent has answered twice without the person accepting the answer

The reason the AI is barred from quoting is not caution for its own sake. Spray
foam cannot be priced without seeing the building, so any number given on a call
is either wrong or becomes a commitment. The consult exists to qualify; the
assessment exists to price.

---

## 11. Compliance the pipeline has to respect

These already govern the website build and they carry into the CRM.

- **Spam Act 2003.** Marketing SMS and email need express consent, and the
  evidence is what the person was actually shown. That is why `consent_text`,
  `consent_at` and `consent_page` travel with the record and must be preserved
  on the contact, not discarded at import. Transactional messages about an
  enquiry someone made are a different thing and are fine.
- **Do Not Call Register.** Applies to cold outbound, not to someone who
  enquired. Any purchased or scraped list needs washing first.
- **Call recording.** If AI voice calls are recorded, callers must be told at
  the start of the call. Victoria's rules on recording private conversations are
  strict, so this is a script requirement, not a nice to have.
- **Australian Consumer Law.** Any performance claim the agent makes has to be
  substantiated. This is the same reason the R-value figure on the site is gated
  behind sign-off rather than published.

---

## 12. Reports worth watching

Every value report below filters on **status**. On a merged board an unfiltered
figure is meaningless.

1. **Time to first contact** on New Enquiry. The one number that moves
   everything else.
2. **Open pipeline value**, status Open only. This is the forecast.
3. **Committed work**, status Won and not yet Paid & Closed. This is the
   schedule, and the cash coming.
4. **Enquiry to Qualified**, by source. Separates traffic quality from sales
   execution.
5. **Qualified to Assessment Booked.** If this sags, the consult script is the
   problem.
6. **Days in Quoting.** Should be under two.
7. **Quote Sent to Won**, by sector. Measure conversion across the sales stages
   only; the delivery stages are not conversions.
8. **Days from Won to Paid & Closed.** Only visible because delivery is on the
   same board, and it is the number that tells you whether the business can take
   more work.
9. **Lost reason mix.** Watch the ratio of *Price* to *Chose batts*.
10. **Paid revenue by `utm_source` / `gclid` / `fbclid`.** The attribution
    fields now survive all the way to payment, so ad spend can be judged on
    money received rather than on form fills.

---

## 13. Open items for Glenn

- Service area boundary, so *Outside service area* can be automated
- Who is second in line when a New Enquiry escalates after an hour
- Whether AI voice calls are recorded, which decides the script opening
- Whether progress claims on commercial jobs need their own reporting, or the
  Invoicing stage is enough
