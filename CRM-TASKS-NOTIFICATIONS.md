# CRM Tasks and Notifications

What the team gets told, when, and what they are expected to do about it.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md) and
[CRM-MESSAGING.md](CRM-MESSAGING.md). Messaging covers what the *customer*
receives. This covers what *you* receive.

**Generated.** The alerts and tasks below are produced from
`client-journey-onepage/journey-data.js`, the same file that renders the
customer journey page, where each of them is shown under the stage it belongs
to. Edit the data file and run the generator. Editing this file by hand will be
overwritten.

Written as a template. Roles are tokenised, so a new client is a reassignment
rather than a rebuild.

---

## 1. The governing principle

> **A notification is a request to do something. If nothing needs doing, it is
> not a notification, it is a report.**

Reports go in a digest. Only actions interrupt.

This is the rule that decides everything below, and it is the one most CRM
builds get wrong. A system that pings on every stage change trains everyone to
ignore it inside a fortnight, and then the one alert that actually mattered gets
ignored too. There are 12 real-time alerts in this document. That is
deliberate. Eleven were there from the start; the twelfth had to argue its way in,
which is the standard the next one is held to.

---

## 2. Roles

Set up as users on the platform, then referenced by role throughout so another
client is a reassignment rather than a rewrite.

| Role | Who at Spray It | Owns |
| --- | --- | --- |
| `OWNER` | Glenn | Commercial deals, pricing, anything escalated |
| `OFFICE` | To confirm | First response, booking, chasing, invoicing |
| `ESTIMATOR` | To confirm, may be Glenn | Assessments and quotes |
| `CREW_LEAD` | Per job | Delivery stages, site photos |

> **Needs Glenn:** who fills OFFICE and ESTIMATOR, and whether they are separate
> people or both him. If they are both him, the escalation ladder in §5 needs a
> second name or it escalates to itself.

**Round robin.** If more than one person can take a new lead, use the platform's
round robin assignment on the New Enquiry trigger. Unassigned leads are the
single most common way a lead dies: everybody assumes somebody.

---

## 3. Real-time alerts

12. These interrupt. Everything else waits for a digest.

| # | Alert | Trigger | To | Channel | Why it interrupts |
| --- | --- | --- | --- | --- | --- |
| 1 | **New enquiry** | Opportunity created | Assigned user | SMS and in-app | Speed to lead is the whole game. |
| 2 | **Missed call** | Inbound call not answered | OFFICE | SMS | The auto-reply already went. A human still has to ring back. |
| 3 | **Inbound reply** | Contact replies by SMS | Assigned user | In-app and SMS | A reply is a live conversation. Every sequence on the card pauses. |
| 4 | **Booking made** | Appointment booked | Assigned user | In-app | The diary changed. |
| 5 | **Booking cancelled** | Appointment cancelled | Assigned user | SMS | A hole in the day, recoverable if caught early. |
| 6 | **Commercial enquiry** | Opportunity created on the Commercial board | OWNER | SMS | Different sale, different person, immediately. |
| 7 | **Lead unattended for an hour** | Still in New Enquiry after 60 minutes | Assigned user and OWNER | SMS | The escalation ladder. Business hours only, and it pauses overnight. |
| 8 | **Quote accepted** | Status set to Won | OWNER and OFFICE | SMS | Triggers deposit, scheduling and crew. |
| 9 | **Deposit received** | deposit_received_at is set | OFFICE | In-app | Unblocks scheduling on the jobs that take one. |
| 10 | **Negative review or complaint** | Review under 4 stars, or a complaint tag | OWNER | SMS | Reputation decays fast. A same-day call fixes most of them. |
| 11 | **Automation failure** | Workflow error, or the lead webhook returns 4xx or 5xx | OWNER | Email | A silent failure means leads are vanishing. The platform will not tell you loudly, so this is built deliberately. |
| 12 | **Missed appointment** | Appointment marked no-show | Assigned user and OWNER | SMS | A missed phone call costs a slot. A missed site visit costs a half day and a truck roll, and the rebooking works far better when a human rings the same day than when only the automatic text goes. |

### What each one says

Written so the person can act without opening the CRM. Someone standing on a
roof can read the first one and decide whether to climb down.

### 1. New enquiry

**Priority:** Act now · **To:** Assigned user · **By:** SMS and in-app
**Fires when:** Opportunity created

A website enquiry has been created and assigned. The message carries their name, number, property type, what needs doing, timeframe, postcode and where they came from, so it can be acted on without opening the CRM.

```
NEW LEAD: {{contact.first_name}} {{contact.last_name}}
{{contact.phone}}
{{contact.property_type}} / {{contact.areas}}
{{contact.timeframe}} / {{contact.postcode}}
Source: {{contact.utm_source}}
```

Enough to act without opening the CRM. Someone standing on a roof can read that and decide whether to climb down.

### 2. Missed call

**Priority:** Act now · **To:** OFFICE · **By:** SMS
**Fires when:** Inbound call not answered

An inbound call to the business number went unanswered. The caller has already had an automatic text back, so this is the reminder that a human still owes them a call.

```
MISSED CALL: {{contact.phone}} ({{contact.first_name}}). Text-back sent. Ring them.
```

### 3. Inbound reply

**Priority:** Act now · **To:** Assigned user · **By:** In-app and SMS
**Fires when:** Contact replies by SMS

A customer has replied by text. Every outbound sequence on that contact pauses the moment it arrives, so nothing automatic talks over a live conversation.

```
REPLY from {{contact.first_name}}: "{{message.body}}"
```

### 4. Booking made

**Priority:** Good to know · **To:** Assigned user · **By:** In-app
**Fires when:** Appointment booked

Somebody has booked a phone consult. It is in the diary and the confirmation has gone, so the point of the alert is to read their enquiry before the call.

```
BOOKED: {{contact.first_name}}, {{appointment.start_time}}. Read the enquiry before the call.
```

### 5. Booking cancelled

**Priority:** Heads up · **To:** Assigned user · **By:** SMS
**Fires when:** Appointment cancelled

A booked call has been cancelled, leaving a hole in the day. Caught early, a short personal note usually saves the booking.

```
CANCELLED: {{contact.first_name}}, {{appointment.start_time}}. Slot is open. A two-line personal note often saves it.
```

### 6. Commercial enquiry

**Priority:** Act now · **To:** OWNER · **By:** SMS
**Fires when:** Opportunity created on the Commercial board

An enquiry has landed on the Commercial board. It carries the company as well as the contact, and it goes straight to the owner rather than through the round robin.

```
COMMERCIAL LEAD: {{contact.first_name}} {{contact.last_name}}, {{contact.company}}
{{contact.property_type}} / {{contact.postcode}}
{{contact.phone}}
```

### 7. Lead unattended for an hour

**Priority:** Act now · **To:** Assigned user and OWNER · **By:** SMS
**Fires when:** Still in New Enquiry after 60 minutes

A new enquiry has sat in the first stage for an hour of business time. The card is reassigned to the office at the same moment, so this is a handover as well as a warning.

```
UNATTENDED 60 MIN: {{contact.first_name}} {{contact.phone}}. Reassigned to office.
```

### 8. Quote accepted

**Priority:** Win · **To:** OWNER and OFFICE · **By:** SMS
**Fires when:** Status set to Won

A job has been marked Won. It names the job and the value, and it is the signal to raise the deposit invoice and pick a date and a crew.

```
WON: {{opportunity.name}}, {{opportunity.value}}. Deposit request sent. Schedule it.
```

### 9. Deposit received

**Priority:** Win · **To:** OFFICE · **By:** In-app
**Fires when:** deposit_received_at is set

A deposit has been recorded against the card. Scheduling is unblocked, and the customer has been told the date will be confirmed within three business days.

```
DEPOSIT IN: {{contact.first_name}}, {{opportunity.deposit_amount}}. Lock the date.
```

### 10. Negative review or complaint

**Priority:** Act now · **To:** OWNER · **By:** SMS
**Fires when:** Review under 4 stars, or a complaint tag

A review under four stars, or a contact tagged as a complaint. It carries the rating and the reviewer, so the call can be made the same day.

```
REVIEW {{review.rating}} stars from {{review.author}}. Call them today.
```

### 11. Automation failure

**Priority:** Act now · **To:** OWNER · **By:** Email
**Fires when:** Workflow error, or the lead webhook returns 4xx or 5xx

A workflow errored, or the website lead webhook returned a failure. It names the workflow and the contact. This is the only alert that means leads may be vanishing silently.

```
WORKFLOW FAILED: {{workflow.name}} on {{contact.first_name}} {{contact.last_name}}. {{error.message}}
```

### 12. Missed appointment

**Priority:** Act now · **To:** Assigned user and OWNER · **By:** SMS
**Fires when:** Appointment marked no-show

A booked appointment has been marked no-show on either calendar. It names the appointment and the address. A missed site visit costs half a day and a truck, which makes it the only event in this journey that spends money the moment it happens.

```
NO SHOW: {{contact.first_name}} {{contact.phone}}
{{appointment.title}}, {{appointment.start_time}}
{{opportunity.site_address}}
```

The twelfth alert, added deliberately against the rule in section 1. The argument for it is money: every other alert protects a lead, this one protects a day of crew time that has already been spent.

### What deliberately does not alert

Listed so nobody adds them back in later without a reason.

- Stage changes in general. Only Won and deposit do.
- Emails opened or links clicked. Interesting, not actionable.
- Form views, page views, chat opens.
- Every message in a sequence sending as designed.
- Nurture activity of any kind.
- Delivery stage progression. The crew know where they are.

---

## 4. Tasks

Alerts say *something happened*. Tasks say *you owe something*, and they persist
until closed. Anything with a deadline is a task, not an alert. 42 in
total across both boards.

### Naming convention

```
[VERB] [WHO]: [WHAT]
```

For example `CALL Emma: new enquiry, Underfloor, Roof or ceiling`. Verb first,
so a list of twenty tasks is scannable without opening any of them.

### Residential

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| New Enquiry | `CALL {{contact.first_name}}: new enquiry, {{contact.areas}}` | Assigned user | 1 hour |
| Contacting | `CALL {{contact.first_name}}: attempt 2` | Assigned user | Day 1 |
| Contacting | `CALL {{contact.first_name}}: attempt 3` | Assigned user | Day 2 |
| Contacting | `CALL {{contact.first_name}}: attempt 4` | Assigned user | Day 4 |
| Contacting | `CALL {{contact.first_name}}: final attempt` | Assigned user | Day 7 |
| Qualified | `BOOK {{contact.first_name}}: assessment` | OFFICE | 3 days |
| Assessment Booked | `ATTEND {{contact.first_name}}: assessment, {{opportunity.site_address}}` | ESTIMATOR | On the date |
| Quoting | `QUOTE {{contact.first_name}}: {{opportunity.site_address}}` | ESTIMATOR | 2 days |
| Quote Sent | `CALL {{contact.first_name}}: quote follow up` | Assigned user | Day 2 |
| Follow-up | `DECIDE {{contact.first_name}}: close or nurture` | Assigned user | Day 21 |
| Follow-up | `LOG {{contact.first_name}}: lost reason` | Assigned user | Same day, on Lost |
| Nurture | `REVIEW {{contact.first_name}}: still a fit?` | OWNER | Quarterly |
| Won | `INVOICE {{contact.first_name}}: deposit` | OFFICE | 1 day, where a deposit applies |
| Won | `SCHEDULE {{contact.first_name}}: allocate crew and date` | OFFICE | 3 days |
| Scheduled | `CONFIRM {{contact.first_name}}: day before` | OFFICE | Day before start |
| In Progress | `PHOTOS {{opportunity.site_address}}` | CREW_LEAD | On completion |
| In Progress | `VARIATIONS {{contact.first_name}}: record any extras` | CREW_LEAD | On completion |
| Invoiced | `INVOICE {{contact.first_name}}: final` | OFFICE | 1 day |
| Invoiced | `CHASE {{contact.first_name}}: payment overdue` | OFFICE | Day 14 |
| Paid & Closed | `REVIEW {{contact.first_name}}: did they leave one?` | OFFICE | Day 7 |

### Commercial & Industrial

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| New Enquiry | `CALL {{contact.first_name}}: commercial enquiry, {{contact.company}}` | OWNER | 1 hour |
| Contacting | `CALL {{contact.first_name}}: attempt 2` | OWNER | Day 1 |
| Contacting | `CALL {{contact.first_name}}: attempt 3` | OWNER | Day 3 |
| Contacting | `CALL {{contact.first_name}}: final attempt` | OWNER | Day 7 |
| Qualified / Scoping | `SCOPE {{contact.first_name}}: confirm decision maker and programme` | OWNER | 5 days |
| Inspection Booked | `ATTEND {{opportunity.site_address}}: inspection` | OWNER | On the date |
| Specifying | `SPEC {{opportunity.site_address}}: product, access, staging, WHS` | OWNER | 5 days |
| Proposal Submitted | `CALL {{contact.first_name}}: confirm receipt` | OWNER | 2 days |
| Commercial Review | `CHASE {{contact.first_name}}: decision date` | OWNER | Day 7, then day 21 |
| Awaiting PO | `CHASE {{contact.first_name}}: PO` | OWNER | Weekly |
| Future Project | `CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}` | OWNER | Quarterly |
| Won | `MOBILISE {{opportunity.site_address}}: programme, inductions, SWMS, materials` | OWNER | 2 working days |
| Mobilising | `INDUCT crew: {{opportunity.site_address}}` | CREW_LEAD | Before start |
| Mobilising | `SWMS {{opportunity.site_address}}: issue and confirm receipt` | OWNER | Before start |
| In Progress | `UPDATE {{contact.first_name}}: weekly progress` | OWNER | Every Friday while live |
| In Progress | `PHOTOS {{opportunity.site_address}}: this stage` | CREW_LEAD | End of each stage |
| In Progress | `VARIATIONS {{opportunity.site_address}}: record and get signed` | CREW_LEAD | As they happen |
| Invoicing | `CLAIM {{opportunity.site_address}}: issue per programme` | OFFICE | Per milestone |
| Invoicing | `CHASE {{contact.first_name}}: claim overdue` | OFFICE | Day 30 |
| Paid & Closed | `REFERENCE {{contact.first_name}}: ask, and record the answer` | OWNER | Day 7 |

### Always on

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| Any | `RING BACK {{contact.first_name}}: missed call` | OFFICE | 30 minutes |
| Any | `REPLY {{contact.first_name}}: they messaged` | Assigned user | 1 hour |

### What each task says

Every task carries a title and a description. The title is what shows in a
list, so it leads with the verb. The description is what the person reads when
they open it, and it is written to be enough on its own: what to do, what has
already happened automatically, and what moving the card will trigger next.

### `CALL {{contact.first_name}}: new enquiry, {{contact.areas}}`

**Stage:** New Enquiry · **Assigned:** Assigned user · **Due:** 1 hour

Ring the new enquiry. The acknowledgement text and email have already gone, so this is the first human contact. Have their answers on screen: property type, what needs doing, timeframe and postcode. If it is a job worth having, move the card to Qualified. If you cannot reach them, log the attempt and the chase takes over.

### `CALL {{contact.first_name}}: attempt 2`

**Stage:** Contacting · **Assigned:** Assigned user · **Due:** Day 1

Second call attempt. Try a different time of day from the first. Log it on the card either way, so the chase knows where it is up to.

### `CALL {{contact.first_name}}: attempt 3`

**Stage:** Contacting · **Assigned:** Assigned user · **Due:** Day 2

Third call attempt. If the phone is not working, reply to their enquiry email instead and note it on the card.

### `CALL {{contact.first_name}}: attempt 4`

**Stage:** Contacting · **Assigned:** Assigned user · **Due:** Day 4

Fourth call attempt. They have had two texts and an email by now, so keep it short: you are ringing about their enquiry and can talk whenever suits.

### `CALL {{contact.first_name}}: final attempt`

**Stage:** Contacting · **Assigned:** Assigned user · **Due:** Day 7

Last call before the card is closed as Unreachable. The honest close email goes the same day and it is the one people answer, so check for a reply before closing.

### `BOOK {{contact.first_name}}: assessment`

**Stage:** Qualified · **Assigned:** OFFICE · **Due:** 3 days

Get the site assessment in the diary. They have a booking link by text and email, so check whether they have used it before ringing. Confirm the address, who will be home, and access to the areas being sprayed.

### `ATTEND {{contact.first_name}}: assessment, {{opportunity.site_address}}`

**Stage:** Assessment Booked · **Assigned:** ESTIMATOR · **Due:** On the date

Attend the site assessment. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote. Mark it done and the card moves to Quoting.

### `QUOTE {{contact.first_name}}: {{opportunity.site_address}}`

**Stage:** Quoting · **Assigned:** ESTIMATOR · **Due:** 2 days

Write and send the quote within two business days. The customer has been told that, so it is a promise. Put the quote number and the figure on the card, attach the document, then move the card to Quote Sent.

### `CALL {{contact.first_name}}: quote follow up`

**Stage:** Quote Sent · **Assigned:** Assigned user · **Due:** Day 2

Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.

### `DECIDE {{contact.first_name}}: close or nurture`

**Stage:** Follow-up · **Assigned:** Assigned user · **Due:** Day 21

Twenty-one days with no decision. Close the card: Won if they accepted, Lost with a reason if they went elsewhere, or Nurture if it is a real job at the wrong time. Never leave it sitting.

### `LOG {{contact.first_name}}: lost reason`

**Stage:** Follow-up · **Assigned:** Assigned user · **Due:** Same day, on Lost

Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.

### `REVIEW {{contact.first_name}}: still a fit?`

**Stage:** Nurture · **Assigned:** OWNER · **Due:** Quarterly

Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Qualified. A clean list keeps the emails landing in inboxes rather than in spam.

### `INVOICE {{contact.first_name}}: deposit`

**Stage:** Won · **Assigned:** OFFICE · **Due:** 1 day, where a deposit applies

Send the deposit invoice, on the jobs that take one. The amount is already on the card and the customer has been told to expect it. When the money lands, tick Deposit received, which confirms it to them and unblocks scheduling.

### `SCHEDULE {{contact.first_name}}: allocate crew and date`

**Stage:** Won · **Assigned:** OFFICE · **Due:** 3 days

Pick a start date, a finish date and a crew, put all three on the card, then move it to Scheduled. That sends the booking text and the preparation email by itself.

### `CONFIRM {{contact.first_name}}: day before`

**Stage:** Scheduled · **Assigned:** OFFICE · **Due:** Day before start

Quick check the afternoon before: access clear, pets sorted, somebody over eighteen home to let the crew in. The reminder text has gone; this is the call that catches what it does not.

### `PHOTOS {{opportunity.site_address}}`

**Stage:** In Progress · **Assigned:** CREW_LEAD · **Due:** On completion

Photograph the finished work from the app before leaving site, and tick Photos captured. The card cannot move to Invoiced without them. They go to the customer in the completion email, and they are the only real proof-of-work images the business has.

### `VARIATIONS {{contact.first_name}}: record any extras`

**Stage:** In Progress · **Assigned:** CREW_LEAD · **Due:** On completion

Write down anything agreed on site that was not in the quote, with the amount, and put it on the card the same day. Left to invoicing, it surprises the customer.

### `INVOICE {{contact.first_name}}: final`

**Stage:** Invoiced · **Assigned:** OFFICE · **Due:** 1 day

Raise the final invoice, put the number on the card, and move it to Invoiced. The completion email with the photos and the invoice email go out separately by themselves.

### `CHASE {{contact.first_name}}: payment overdue`

**Stage:** Invoiced · **Assigned:** OFFICE · **Due:** Day 14

Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.

### `REVIEW {{contact.first_name}}: did they leave one?`

**Stage:** Paid & Closed · **Assigned:** OFFICE · **Due:** Day 7

Check whether the Google review arrived. If it did, nothing to do. If it did not, leave it. The ask goes once, by text, and chasing reviews costs more goodwill than it earns.

### `CALL {{contact.first_name}}: commercial enquiry, {{contact.company}}`

**Stage:** New Enquiry · **Assigned:** OWNER · **Due:** 1 hour

Ring the commercial enquiry within the hour. Aim to come off the call knowing who decides, roughly how big it is, what the space is used for, whether it is operating during the works, and when they need it done.

### `SCOPE {{contact.first_name}}: confirm decision maker and programme`

**Stage:** Qualified / Scoping · **Assigned:** OWNER · **Due:** 5 days

Confirm who decides, the scale and the programme, then put the site address and a site contact on the card. Leave the value at zero: commercial ranges from small to millions, and a guess here makes the forecast worthless.

### `ATTEND {{opportunity.site_address}}: inspection`

**Stage:** Inspection Booked · **Assigned:** OWNER · **Due:** On the date

Attend the visit. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.

### `SPEC {{opportunity.site_address}}: product, access, staging, WHS`

**Stage:** Specifying · **Assigned:** OWNER · **Due:** 5 days

Work out product, thickness, access, plant, staging and WHS, and build the proposal. Five days. The customer has been given that date by email, so it is a commitment.

### `CALL {{contact.first_name}}: confirm receipt`

**Stage:** Proposal Submitted · **Assigned:** OWNER · **Due:** 2 days

Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.

### `CHASE {{contact.first_name}}: decision date`

**Stage:** Commercial Review · **Assigned:** OWNER · **Due:** Day 7, then day 21

Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.

### `CHASE {{contact.first_name}}: PO`

**Stage:** Awaiting PO · **Assigned:** OWNER · **Due:** Weekly

Weekly chase for the purchase order. The job is verbally won but stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.

### `CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}`

**Stage:** Future Project · **Assigned:** OWNER · **Due:** Quarterly

Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.

### `MOBILISE {{opportunity.site_address}}: programme, inductions, SWMS, materials`

**Stage:** Won · **Assigned:** OWNER · **Due:** 2 working days

Purchase order received. Confirm the programme within two working days: start and finish dates, crew, site contact, induction dates and access windows, all on the card.

### `INDUCT crew: {{opportunity.site_address}}`

**Stage:** Mobilising · **Assigned:** CREW_LEAD · **Due:** Before start

Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.

### `SWMS {{opportunity.site_address}}: issue and confirm receipt`

**Stage:** Mobilising · **Assigned:** OWNER · **Due:** Before start

Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either.

### `UPDATE {{contact.first_name}}: weekly progress`

**Stage:** In Progress · **Assigned:** OWNER · **Due:** Every Friday while live

Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week’s photos.

### `PHOTOS {{opportunity.site_address}}: this stage`

**Stage:** In Progress · **Assigned:** CREW_LEAD · **Due:** End of each stage

Photograph each completed stage before moving on. On a staged job the photos are the evidence behind the progress claim, so they are needed at the end of every stage, not at the end of the job.

### `VARIATIONS {{opportunity.site_address}}: record and get signed`

**Stage:** In Progress · **Assigned:** CREW_LEAD · **Due:** As they happen

Record every variation agreed on site and get it signed the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.

### `CLAIM {{opportunity.site_address}}: issue per programme`

**Stage:** Invoicing · **Assigned:** OFFICE · **Due:** Per milestone

Issue the progress claim for the completed stage, put its invoice number on the card, and attach the photos and any sign-offs.

### `CHASE {{contact.first_name}}: claim overdue`

**Stage:** Invoicing · **Assigned:** OFFICE · **Due:** Day 30

Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.

### `REFERENCE {{contact.first_name}}: ask, and record the answer`

**Stage:** Paid & Closed · **Assigned:** OWNER · **Due:** Day 7

Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager’s word is worth more on a tender than any number of homeowner reviews.

### `RING BACK {{contact.first_name}}: missed call`

**Stage:** Any stage · **Assigned:** OFFICE · **Due:** 30 minutes

A call came in and nobody answered. The caller already has a text saying you will ring back, so this is a promise with your name on it.

### `REPLY {{contact.first_name}}: they messaged`

**Stage:** Any stage · **Assigned:** Assigned user · **Due:** 1 hour

A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds.

### Two rules

1. **Every task has an owner and a due date.** The platform will let you create
   a task with neither. A task with no due date is a note.
2. **Completing the task does not move the card.** Moving the card is a
   separate, deliberate act. Otherwise the board reflects who is tidy about
   tasks rather than where jobs actually are.

---

## 5. Escalation

Two ladders. One for a lead nobody has touched, one for a card that has stopped
moving.

### Unattended lead

| Elapsed | Action |
| --- | --- |
| 0 min | Assign, notify, create the call task. Customer gets X-ACK-01. |
| 15 min | Reminder to the assigned user |
| **60 min** | **Escalate: SMS to assigned user and OWNER, reassign to OFFICE** |
| 4 hours | SMS to OWNER: *this lead has been sitting since {{time}}* |
| Next morning | Appears at the top of the daily digest until it moves |

Business hours only, and it pauses overnight. A lead that arrives at 11pm starts
its clock when the office opens, otherwise everyone wakes to a false alarm and
starts ignoring the escalation. On the commercial board the escalation goes to
Glenn rather than away from him, because commercial is his.

### Stalled card

Uses the stall times from the pipeline document. On breach:

| Breach | Action |
| --- | --- |
| First | Task reappears at the top of the assigned user's list |
| 2× the stall time | Line item in the daily digest |
| 3× the stall time | Named in the weekly review, with the card |

Note the escalation is toward **visibility**, not more alarms. A card stuck in
Follow-up for 40 days is not an emergency. It is a conversation to have on
Monday.

---

## 6. Digests

Where everything that is not an emergency goes.

### Daily, 7:00am, to OWNER and OFFICE

```
YESTERDAY
  New enquiries          {{count}}
  Calls made             {{count}}
  Quotes sent            {{count}}
  Jobs won               {{count}}, {{value}}

TODAY
  Assessments            {{list with time and address}}
  Jobs starting          {{list with crew}}
  Calls booked           {{list with time}}

NEEDS YOU
  Leads unattended       {{list}}
  Quotes overdue         {{list, over 2 days in Quoting}}
  Proposals overdue      {{list, over 5 days in Specifying}}
  Follow-ups due         {{count}}
  Invoices overdue       {{list with amount and days}}
```

`NEEDS YOU` goes last on purpose. It is the section people act on, so it should
be the thing their eye lands on when they stop scrolling.

### Weekly, Monday 7:00am, to OWNER

```
LAST WEEK
  Enquiries              {{count}}, by source
  Median time to first contact
  Enquiry to Qualified   {{percent}}
  Quotes sent            {{count}}, {{value}}
  Won                    {{count}}, {{value}}
  Lost                   {{count}}, by reason

PIPELINE NOW
  Open value             {{value}}      <- the forecast
  Won not yet delivered  {{value}}      <- committed work
  Cards stalled 3x       {{list}}

DELIVERY
  Jobs completed         {{count}}
  Average days Won to Paid
  Invoices outstanding   {{value}}
```

The two pipeline lines are separated because the boards merged sales and
delivery. An unfiltered pipeline figure on a merged board is roughly double what
is really in play, so the digest never shows one.

### Monthly, to OWNER

Cost per enquiry and cost per won job by `utm_source`, `gclid` and `fbclid`,
against **paid revenue**, not quotes sent. This is the number that decides ad
spend, and it only exists because attribution now survives all the way to
payment.

---

## 7. Quiet hours

| | Alerts | Tasks | Customer messages |
| --- | --- | --- | --- |
| Monday to Friday, 7am to 6pm | All | Normal | Normal |
| Saturday, 8am to 2pm | Critical only: 1, 2, 6, 10, 11 | Held | Held |
| Outside those hours | None | Held | Held to the next window |
| Sunday and public holidays | None | Held | Held |

Held customer messages queue and release at the next window. Use the platform's
**Wait until a time window** step; do not rely on nobody enquiring at midnight.

On the legal position: the Do Not Call industry standard sets permitted hours
for telemarketing *calls*. It does not govern SMS to someone who enquired, and
transactional messages are a different category again. The window above is
policy, not a legal minimum, and it exists because a 6am quote chase costs more
goodwill than it earns.

> **Needs Glenn:** confirm trading hours, and whether Saturday work happens. The
> table above is a placeholder shaped like a normal trades week.

---

## 8. Templating this for another client

| Layer | What changes |
| --- | --- |
| **Roles** (§2) | Reassign OWNER, OFFICE, ESTIMATOR, CREW_LEAD |
| **Alerts** (§3) | Nothing. All 12 are trade-agnostic. |
| **Tasks** (§4) | Verbs may change (`SPRAY` to `INSTALL`). Structure holds. |
| **Escalation** (§5) | The 1 hour threshold is worth tuning to their volume |
| **Digests** (§6) | Nothing, if the pipeline shape is reused |
| **Quiet hours** (§7) | Their trading hours |

The load-bearing part is §1. Carrying that rule across is worth more than
carrying any specific alert, because the failure mode is always the same: a
client asks for "notify me on everything", gets it, and stops reading any of it
by week three.

---

## 9. Before go-live

- [ ] Every workflow has an error branch that alerts, so failures are not silent
- [ ] Round robin set on New Enquiry, and no path leaves a lead unassigned
- [ ] Escalation resolves to a second person, not back to the same one
- [ ] Quiet hours applied to outbound customer messaging, not just internal
- [ ] Every sequence has a stop condition on reply
- [ ] Setting status Won kills every sales sequence on the card
- [ ] Human labels stored in the dropdown fields, so echoed emails do not read "new-build"
- [ ] SPF and DKIM on the sending domain, and a test email checked in Gmail and Outlook
- [ ] Every merge field confirmed against the platform version, with a test sent to yourself
- [ ] Alert volume measured after week one. More than about fifteen a day to one person means something is wrong
- [ ] A test lead pushed end to end through both boards, watching what arrives and when
