# CRM Tasks and Notifications

What the team gets told, when, and what they are expected to do about it.
Revised after the client call on Friday 2 October 2026.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md) and
[CRM-MESSAGING.md](CRM-MESSAGING.md). Messaging covers what the *customer*
receives. This covers what *you* receive.

**Generated.** The alerts and tasks below are produced from
`client-journey-onepage/journey-data.js`, the same file that renders the
customer journey page, where each of them is shown under the stage it belongs
to. Edit the data file and run the generator. Editing this file by hand will be
overwritten.

Written as a template. Roles are tokenised, and every alert and task names a
role or "the team", never a person, so a new hire is a reassignment rather
than a rebuild.

---

## 1. The governing principle

> **A notification is a request to do something. If nothing needs doing, it is
> not a notification, it is a report.**

Reports go in the daily summary. Only actions interrupt.

This is the rule that decides everything below, and it is the one most CRM
builds get wrong. A system that pings on every stage change trains everyone to
ignore it inside a fortnight, and then the one alert that actually mattered gets
ignored too. There are 13 real-time alerts in this document. After the
October call the list was reworked: the hour-long unattended lead alert became a
fifteen minute email to the office, the missed site visit alert went because
our own people attend every visit, and two were added that each protect a crew
day: a customer saying the booked date no longer works, and a deposit unpaid at
its due date. Anything that goes to the owner arrives by text and by email.

---

## 2. Roles

Set up as users on the platform, then referenced by role throughout so a change
of staff is a reassignment rather than a rewrite.

| Role | Who at SprayIT | Owns |
| --- | --- | --- |
| `OWNER` | Glenn Angus | Commercial work, pricing, booking install dates, anything escalated |
| `OFFICE` | Rachael Angus | First response, calls, chasing, invoicing. About 99% of customer contact. |
| `ESTIMATOR` | Glenn Angus | Quotes and site inspections |
| `CREW_LEAD` | Per job | The job day: running late text, photos, variations, marking the job complete |

OWNER and ESTIMATOR are the same person, so the escalation ladder in §5 runs from
the office to the owner, which is a genuine second person.

**Assignment.** New Lead is assigned to the office on both boards. If more
people take first calls later, switch that assignment to round robin.
Unassigned leads are the single most common way a lead dies: everybody assumes
somebody.

---

## 3. Real-time alerts

13. These interrupt. Everything else waits for the daily summary.

| # | Alert | Trigger | To | Channel | Why it interrupts |
| --- | --- | --- | --- | --- | --- |
| 1 | **New enquiry** | Opportunity created | Assigned user | SMS and in-app | Speed to lead is the whole game. |
| 2 | **Missed call** | Inbound call not answered | OFFICE | SMS | The auto-reply already went. A person still has to ring back. |
| 3 | **Inbound reply** | Contact replies by SMS | Assigned user | In-app and SMS | A reply is a live conversation. Every sequence on the card pauses. |
| 4 | **Phone call booked** | Appointment booked in the phone call calendar | Assigned user | In-app | The diary changed. |
| 5 | **Phone call cancelled** | Appointment cancelled in the phone call calendar | Assigned user | SMS | A hole in the day, recoverable if caught early. |
| 6 | **Commercial enquiry** | Opportunity created on the Commercial board | OWNER | SMS and email | Different sale, and the owner wants to know immediately. |
| 7 | **New lead not called after 15 minutes** | No call logged 15 business minutes after the lead arrives | OFFICE | Email | Time to first contact is the one number that moves everything else. Business hours only, so it pauses overnight. |
| 8 | **Quote accepted** | Card enters Quote Accepted | OWNER and OFFICE | SMS and email | Triggers the next step: an inspection, or the install date. |
| 9 | **Deposit received** | Deposit invoice marked paid | OFFICE | In-app | The date is secure. |
| 10 | **Negative review or complaint** | Review under 4 stars, or a complaint tag | OWNER | SMS and email | Reputation decays fast. A same-day call fixes most of them. |
| 11 | **Automation failure** | Workflow error, or the lead webhook returns 4xx or 5xx | OWNER | SMS and email | A silent failure means leads are vanishing. The platform will not tell you loudly, so this is built deliberately. |
| 12 | **Customer cannot make the booked date** | A No on the 7 day or 48 hour reminder | OWNER and OFFICE | SMS and email | A crew and a rig are booked around this job. The sooner a person knows, the sooner both can go to other work. |
| 13 | **Deposit unpaid at its due date** | deposit_due_date reached and the deposit invoice is unpaid | OWNER and OFFICE | SMS and email | Special-order foam and a crew day are committed against this job. The due date is set early enough to reassign both. |

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

An inbound call to the business number went unanswered. The caller has already had an automatic text back, so this is the reminder that someone still owes them a call.

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

### 4. Phone call booked

**Priority:** Good to know · **To:** Assigned user · **By:** In-app
**Fires when:** Appointment booked in the phone call calendar

Somebody has booked a phone call from the day 4 email or the website. It is in the diary and the confirmation has gone, so the point of the alert is to read their enquiry before ringing.

```
BOOKED: {{contact.first_name}}, {{appointment.start_time}}. Read the enquiry before the call.
```

### 5. Phone call cancelled

**Priority:** Heads up · **To:** Assigned user · **By:** SMS
**Fires when:** Appointment cancelled in the phone call calendar

A booked phone call has been cancelled, leaving a hole in the day. Caught early, a short call usually rebooks it.

```
CANCELLED: {{contact.first_name}}, {{appointment.start_time}}. Slot is open. A short call often rebooks it.
```

### 6. Commercial enquiry

**Priority:** Act now · **To:** OWNER · **By:** SMS and email
**Fires when:** Opportunity created on the Commercial board

An enquiry has landed on the Commercial board. It carries the company as well as the contact. The owner is told straight away; the office still makes the first call.

```
COMMERCIAL LEAD: {{contact.first_name}} {{contact.last_name}}, {{contact.company}}
{{contact.property_type}} / {{contact.postcode}}
{{contact.phone}}
```

### 7. New lead not called after 15 minutes

**Priority:** Act now · **To:** OFFICE · **By:** Email
**Fires when:** No call logged 15 business minutes after the lead arrives

A new lead has been on the board for fifteen business minutes and no call has been logged against it. It names the lead and the time it arrived, so whoever picks it up can ring straight away.

```
NOT CALLED YET: {{contact.first_name}} {{contact.last_name}}, {{contact.phone}}
Arrived {{time}}. Fifteen minutes and no call logged. Ring them now.
```

### 8. Quote accepted

**Priority:** Win · **To:** OWNER and OFFICE · **By:** SMS and email
**Fires when:** Card enters Quote Accepted

A card has reached Quote Accepted, from the accept button or moved by hand. It names the job, the value and the option chosen, and it is the signal to book the install date. Add-on quotes on a job already under way do not fire it.

```
QUOTE ACCEPTED: {{opportunity.name}}, {{opportunity.value}}
Option: {{opportunity.accepted_quote_option}}
Next: book the install date.
```

### 9. Deposit received

**Priority:** Win · **To:** OFFICE · **By:** In-app
**Fires when:** Deposit invoice marked paid

A deposit invoice has been marked paid. The customer has had a one-line confirmation, so this is for the record and for whoever is watching the crew diary.

```
DEPOSIT IN: {{contact.first_name}}, {{opportunity.deposit_amount}}. Job on {{opportunity.job_date}} is secure.
```

### 10. Negative review or complaint

**Priority:** Act now · **To:** OWNER · **By:** SMS and email
**Fires when:** Review under 4 stars, or a complaint tag

A review under four stars, or a contact tagged as a complaint. It carries the rating and the reviewer, so the call can be made the same day.

```
REVIEW {{review.rating}} stars from {{review.author}}. Call them today.
```

### 11. Automation failure

**Priority:** Act now · **To:** OWNER · **By:** SMS and email
**Fires when:** Workflow error, or the lead webhook returns 4xx or 5xx

A workflow errored, or the website lead webhook returned a failure. It names the workflow and the contact. This is the only alert that means leads may be vanishing silently.

```
WORKFLOW FAILED: {{workflow.name}} on {{contact.first_name}} {{contact.last_name}}. {{error.message}}
```

### 12. Customer cannot make the booked date

**Priority:** Act now · **To:** OWNER and OFFICE · **By:** SMS and email
**Fires when:** A No on the 7 day or 48 hour reminder

A customer tapped No on the 7 day or the 48 hour reminder. It names the job, the date and the address. Nothing is rescheduled automatically: the team rings the customer, agrees a new date, and moves the crew and the rig by hand.

```
CANNOT MAKE IT: {{contact.first_name}} {{contact.last_name}}, {{contact.phone}}
Booked {{opportunity.job_date}}, {{opportunity.site_address}}
Ring them today. Crew and rig need moving by hand.
```

### 13. Deposit unpaid at its due date

**Priority:** Heads up · **To:** OWNER and OFFICE · **By:** SMS and email
**Fires when:** deposit_due_date reached and the deposit invoice is unpaid

A deposit has reached its due date without being paid. It names the job, the amount and the install date, so the team can ring the customer and decide in time whether the crew holds the date or is reassigned.

```
DEPOSIT UNPAID: {{opportunity.name}}, {{opportunity.deposit_amount}}
Due {{opportunity.deposit_due_date}}. Job booked {{opportunity.job_date}}.
Ring them today and decide whether the crew holds.
```

### What deliberately does not alert

Listed so nobody adds them back in later without a reason.

- Stage changes in general. Only a quote accepted, a deposit landing, a No on a reminder and an unpaid deposit do.
- A customer not turning up. Our own people attend site visits, so there is no no-show.
- Emails opened or links clicked. Interesting, not actionable.
- Form views, page views, chat opens.
- Every message in a sequence sending as designed.
- Nurture activity of any kind.
- A Yes on a reminder. It is noted on the card, and that is all it needs.

---

## 4. Tasks

Alerts say *something happened*. Tasks say *you owe something*, and they persist
until closed. Anything with a deadline is a task, not an alert. 46 in
total across both boards.

### Naming convention

```
[VERB] [WHO]: [WHAT]
```

For example `CALL Emma: new lead, Underfloor, Roof or ceiling`. Verb first,
so a list of twenty tasks is scannable without opening any of them.

### Residential

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| 1. New Lead | `CALL {{contact.first_name}}: new lead, {{contact.areas}}` | OFFICE | 15 minutes |
| 2. Dial 1 | `CALL {{contact.first_name}}: second round of calls` | OFFICE | Later the same day |
| 3. Dial 2 | `CALL {{contact.first_name}}: one more try` | OFFICE | Day 4 |
| 4. Inspection Required | `BOOK {{contact.first_name}}: site inspection` | OFFICE | 2 days |
| 4. Inspection Required | `ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}` | ESTIMATOR | On the date |
| 5. Quote Sent | `CALL {{contact.first_name}}: quote follow up` | OFFICE | Day 2 |
| 5. Quote Sent | `DECIDE {{contact.first_name}}: accepted, nurture or lost` | OFFICE | Day 21 |
| 6. Follow-Up | `CALL {{contact.first_name}}: callback as asked` | OFFICE | At the time they asked |
| 7. Nurture | `CHECK-IN {{contact.first_name}}: a year since the quote` | OFFICE | 12 months |
| 7. Nurture | `REVIEW {{contact.first_name}}: still a fit?` | OWNER | Quarterly |
| 8. Quote Accepted | `NEXT {{contact.first_name}}: inspection or booking` | OFFICE | Same day |
| 9. Booking Required | `BOOK {{contact.first_name}}: install date` | OWNER | 2 business days |
| 10. Job Booked | `RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}` | OWNER | Same day |
| 10. Job Booked | `CALL {{contact.first_name}}: date not confirmed` | OFFICE | Day before the job, if neither reminder was answered |
| 11. Deposit Requested | `CHASE {{contact.first_name}}: deposit unpaid` | OFFICE | On the due date, if unpaid |
| 12. Job Completed | `PHOTOS {{opportunity.site_address}}` | CREW_LEAD | Before marking it complete |
| 12. Job Completed | `VARIATIONS {{contact.first_name}}: record any extras` | CREW_LEAD | Before marking it complete |
| 12. Job Completed | `CHASE {{contact.first_name}}: payment overdue` | OFFICE | Day 14 |
| 12. Job Completed | `SEND {{contact.first_name}}: job report and certificates` | OFFICE | Same day as payment |
| 13. Retention Claim | `CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}` | OFFICE | On the release date |

### Commercial & Industrial

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| 1. New Lead | `CALL {{contact.first_name}}: commercial lead, {{contact.company}}` | OFFICE | 15 minutes |
| 2. Dial 1 | `CALL {{contact.first_name}}: second round of calls` | OFFICE | Later the same day |
| 3. Dial 2 | `CALL {{contact.first_name}}: one more try` | OFFICE | Day 4 |
| 4. Inspection Required | `BOOK {{contact.first_name}}: site inspection` | OFFICE | 2 days |
| 4. Inspection Required | `ATTEND {{opportunity.site_address}}: inspection` | ESTIMATOR | On the date |
| 5. Quote Sent | `CALL {{contact.first_name}}: confirm receipt` | ESTIMATOR | 2 days |
| 5. Quote Sent | `CHASE {{contact.first_name}}: decision date` | OWNER | Day 7, then day 21 |
| 6. Follow-Up | `CALL {{contact.first_name}}: callback as asked` | OFFICE | At the time they asked |
| 7. Nurture | `CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}` | OWNER | Quarterly |
| 8. Quote Accepted | `CHASE {{contact.first_name}}: purchase order` | OFFICE | Weekly, until it lands |
| 8. Quote Accepted | `NEXT {{contact.first_name}}: inspection or booking` | OFFICE | Same day |
| 9. Booking Required | `BOOK {{contact.first_name}}: works dates` | OWNER | 2 business days |
| 10. Job Booked | `INDUCT crew: {{opportunity.site_address}}` | CREW_LEAD | Before start |
| 10. Job Booked | `SWMS {{opportunity.site_address}}: issue and confirm receipt` | OWNER | Before start |
| 10. Job Booked | `RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}` | OWNER | Same day |
| 10. Job Booked | `UPDATE {{contact.first_name}}: weekly progress` | OWNER | Every Friday while live |
| 10. Job Booked | `CLAIM {{opportunity.site_address}}: progress claim` | OFFICE | Per milestone |
| 11. Deposit Requested | `CHASE {{contact.first_name}}: deposit unpaid` | OFFICE | On the due date, if unpaid |
| 12. Job Completed | `PHOTOS {{opportunity.site_address}}: this stage` | CREW_LEAD | End of each stage |
| 12. Job Completed | `VARIATIONS {{opportunity.site_address}}: record and get signed` | CREW_LEAD | As they happen |
| 12. Job Completed | `CHASE {{contact.first_name}}: claim overdue` | OFFICE | Day 30 |
| 12. Job Completed | `SEND {{contact.first_name}}: job report and certificates` | OFFICE | Same day as payment |
| 12. Job Completed | `REFERENCE {{contact.first_name}}: ask, and record the answer` | OWNER | Day 7 |
| 13. Retention Claim | `CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}` | OFFICE | On the release date |

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

### `CALL {{contact.first_name}}: new lead, {{contact.areas}}`

**Stage:** New Lead · **Assigned:** OFFICE · **Due:** 15 minutes

Ring the new lead within 15 minutes. The acknowledgement text and email have already gone. Ring twice, back to back. No answer to either: move the card to Dial 1. If they answer and it is a job, send the quote within two business days, or move the card to Inspection Required if it needs a site visit first.

### `CALL {{contact.first_name}}: second round of calls`

**Stage:** Dial 1 · **Assigned:** OFFICE · **Due:** Later the same day

Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails.

### `CALL {{contact.first_name}}: one more try`

**Stage:** Dial 2 · **Assigned:** OFFICE · **Due:** Day 4

One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way.

### `BOOK {{contact.first_name}}: site inspection`

**Stage:** Inspection Required · **Assigned:** OFFICE · **Due:** 2 days

Book the site inspection in the inspection calendar from the card, at a time that suits the customer. Confirm the address and access to the areas being sprayed. The confirmation and the morning text go by themselves.

### `ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}`

**Stage:** Inspection Required · **Assigned:** ESTIMATOR · **Due:** On the date

Attend the inspection. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.

### `CALL {{contact.first_name}}: quote follow up`

**Stage:** Quote Sent · **Assigned:** OFFICE · **Due:** Day 2

Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.

### `DECIDE {{contact.first_name}}: accepted, nurture or lost`

**Stage:** Quote Sent · **Assigned:** OFFICE · **Due:** Day 21

Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting.

### `CALL {{contact.first_name}}: callback as asked`

**Stage:** Follow-Up · **Assigned:** OFFICE · **Due:** At the time they asked

The customer asked to be rung at this time. Ring them, then move the card on: Quote Sent once a quote goes, Inspection Required if a visit is needed, Quote Accepted if they say yes, Nurture if it is not now, or Lost with a reason.

### `CHECK-IN {{contact.first_name}}: a year since the quote`

**Stage:** Nurture · **Assigned:** OFFICE · **Due:** 12 months

A year since this job went to Nurture. Ring and ask whether it is back on. Quotes often come back after one or two years. If it is, refresh the quote against current prices and send it, which moves the card to Quote Sent.

### `REVIEW {{contact.first_name}}: still a fit?`

**Stage:** Nurture · **Assigned:** OWNER · **Due:** Quarterly

Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Quote Sent or New Lead. A clean list keeps the emails landing in inboxes rather than in spam.

### `NEXT {{contact.first_name}}: inspection or booking`

**Stage:** Quote Accepted · **Assigned:** OFFICE · **Due:** Same day

The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked.

### `BOOK {{contact.first_name}}: install date`

**Stage:** Booking Required · **Assigned:** OWNER · **Due:** 2 business days

Book the install date in the install calendar from the card, and put the crew on it. Book it here first, not in a phone calendar, because the booking is what sends the confirmation and sets up the reminders and the deposit timing.

### `RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}`

**Stage:** Job Booked · **Assigned:** OWNER · **Due:** Same day

The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date.

### `CALL {{contact.first_name}}: date not confirmed`

**Stage:** Job Booked · **Assigned:** OFFICE · **Due:** Day before the job, if neither reminder was answered

Neither reminder got a Yes or a No. Ring to confirm the job is still on, that access is clear, and that someone over eighteen will be there to let the crew in.

### `CHASE {{contact.first_name}}: deposit unpaid`

**Stage:** Deposit Requested · **Assigned:** OFFICE · **Due:** On the due date, if unpaid

The deposit was due today and has not landed. Ring the customer today: most late deposits are a missed email, not a change of mind. If it will not be paid in time, tell the owner so the crew can be reassigned.

### `PHOTOS {{opportunity.site_address}}`

**Stage:** Job Completed · **Assigned:** CREW_LEAD · **Due:** Before marking it complete

Photograph the finished work from the app before leaving site, and tick Photos captured. The job cannot be marked complete without them. They go into the job report, and they are the only real proof-of-work images the business has.

### `VARIATIONS {{contact.first_name}}: record any extras`

**Stage:** Job Completed · **Assigned:** CREW_LEAD · **Due:** Before marking it complete

Anything agreed on site that was not in the quote, such as an extra 100 sqm, goes out from the variation document for the customer to sign, and onto the card the same day. Left to invoicing, it surprises the customer.

### `CHASE {{contact.first_name}}: payment overdue`

**Stage:** Job Completed · **Assigned:** OFFICE · **Due:** Day 14

Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.

### `SEND {{contact.first_name}}: job report and certificates`

**Stage:** Job Completed · **Assigned:** OFFICE · **Due:** Same day as payment

The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid.

### `CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}`

**Stage:** Retention Claim · **Assigned:** OFFICE · **Due:** On the release date

The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card.

### `CALL {{contact.first_name}}: commercial lead, {{contact.company}}`

**Stage:** New Lead · **Assigned:** OFFICE · **Due:** 15 minutes

Ring the commercial lead within 15 minutes, twice back to back if needed. Aim to come off the call knowing who decides, roughly how big it is, what the space is used for, whether it is operating during the works, and when they need it done. Put the company, site address and a site contact on the card.

### `ATTEND {{opportunity.site_address}}: inspection`

**Stage:** Inspection Required · **Assigned:** ESTIMATOR · **Due:** On the date

Attend the visit with insurances and SWMS. Before you leave, record on the card: the area in square metres, the foam type, access notes, induction needs, and anything that will slow the crew down. Photos of problem areas help the proposal.

### `CALL {{contact.first_name}}: confirm receipt`

**Stage:** Quote Sent · **Assigned:** ESTIMATOR · **Due:** 2 days

Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.

### `CHASE {{contact.first_name}}: decision date`

**Stage:** Quote Sent · **Assigned:** OWNER · **Due:** Day 7, then day 21

Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.

### `CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}`

**Stage:** Nurture · **Assigned:** OWNER · **Due:** Quarterly

Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.

### `CHASE {{contact.first_name}}: purchase order`

**Stage:** Quote Accepted · **Assigned:** OFFICE · **Due:** Weekly, until it lands

A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.

### `BOOK {{contact.first_name}}: works dates`

**Stage:** Booking Required · **Assigned:** OWNER · **Due:** 2 business days

Agree the start and finish dates with the client, then book them in the install calendar from the card with the crew. Book it there first, because the booking sends the mobilisation email and sets up the reminders.

### `INDUCT crew: {{opportunity.site_address}}`

**Stage:** Job Booked · **Assigned:** CREW_LEAD · **Due:** Before start

Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.

### `SWMS {{opportunity.site_address}}: issue and confirm receipt`

**Stage:** Job Booked · **Assigned:** OWNER · **Due:** Before start

Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either.

### `UPDATE {{contact.first_name}}: weekly progress`

**Stage:** Job Booked · **Assigned:** OWNER · **Due:** Every Friday while live

Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week’s photos.

### `CLAIM {{opportunity.site_address}}: progress claim`

**Stage:** Job Booked · **Assigned:** OFFICE · **Due:** Per milestone

Issue the progress claim for the completed stage, put its invoice number on the card, and attach the photos, any signed variations, the accepted quote and the purchase order.

### `PHOTOS {{opportunity.site_address}}: this stage`

**Stage:** Job Completed · **Assigned:** CREW_LEAD · **Due:** End of each stage

Photograph each completed stage before moving on. The photos are the evidence behind each claim and they go into the close-out pack, so they are needed at the end of every stage, not at the end of the job.

### `VARIATIONS {{opportunity.site_address}}: record and get signed`

**Stage:** Job Completed · **Assigned:** CREW_LEAD · **Due:** As they happen

Record every variation agreed on site and send it from the variation document for signature the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.

### `CHASE {{contact.first_name}}: claim overdue`

**Stage:** Job Completed · **Assigned:** OFFICE · **Due:** Day 30

Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.

### `REFERENCE {{contact.first_name}}: ask, and record the answer`

**Stage:** Job Completed · **Assigned:** OWNER · **Due:** Day 7

Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager’s word is worth more on a tender than any number of homeowner reviews.

### `RING BACK {{contact.first_name}}: missed call`

**Stage:** Any stage · **Assigned:** OFFICE · **Due:** 30 minutes

A call came in and nobody answered. The caller already has a text saying someone will ring back, so this is a promise the team has made.

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

Two ladders. One for a lead nobody has rung, one for a card that has stopped
moving.

### Lead not called

| Elapsed | Action |
| --- | --- |
| 0 min | Assign to the office, alert, create the call task. Customer gets X-ACK-01. On commercial the owner is told at once (alert 6). |
| **15 min** | **No call logged: email to the office (alert 7)** |
| 60 min | Still no call: text and email to the owner, *this lead has been waiting since {{time}}* |
| Next morning | Listed at the top of the daily summary until a call is logged |

Business hours only, and it pauses overnight. A lead that arrives at 11pm starts
its clock when the office opens, otherwise everyone wakes to a false alarm and
starts ignoring the escalation.

### Stalled card

Uses the stall times from the pipeline document. On breach:

| Breach | Action |
| --- | --- |
| First | Task reappears at the top of the assigned user's list |
| 2× the stall time | Line item in the daily summary |
| 3× the stall time | Named in the weekly review, with the card |

Note the escalation is toward **visibility**, not more alarms. A card sitting in
Nurture for 40 days is not an emergency. It is a conversation to have on
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
  Quotes accepted        {{count}}, {{value}}

TODAY
  Inspections            {{list with time and address}}
  Installs               {{list with crew}}
  Phone calls booked     {{list with time}}
  Deposits due           {{list with amount}}

NEEDS YOU
  Leads not called       {{list}}
  Callbacks due          {{list}}
  Installs to book       {{list, over 2 days in Booking Required}}
  Dates not confirmed    {{list, no Yes or No on either reminder}}
  Deposits unpaid        {{list with amount and due date}}
  Invoices overdue       {{list with amount and days}}
  Job reports to send    {{list, paid but report not sent}}
  Retentions due         {{list with release date}}
```

`NEEDS YOU` goes last on purpose. It is the section people act on, so it should
be the thing their eye lands on when they stop scrolling.

### Weekly, Monday 7:00am, to OWNER

```
LAST WEEK, BOTH BOARDS
  Enquiries              {{count}}, by source
  Median time to first call
  Closed as Unreachable  {{count}}
  Quotes sent            {{count}}, {{value}}
  Quotes accepted        {{count}}, {{value}}
  Lost                   {{count}}, by reason

PIPELINE NOW
  Open value             {{value}}      <- the forecast
  Accepted, not done     {{value}}      <- committed work
  Cards stalled 3x       {{list}}

DELIVERY
  Jobs completed         {{count}}
  Average days accepted to paid
  Invoices outstanding   {{value}}
  Retentions held        {{value}}
```

The two pipeline lines are separated because each board runs the sale and the
job on the same card. An unfiltered pipeline figure adds work already sold to
work still being chased, so the digest never shows one. Both boards share stage
keys, so every line is one number across the business.

### Monthly, to OWNER

Cost per enquiry and cost per accepted job by `utm_source`, `gclid` and
`fbclid`, against **paid revenue**, not quotes sent. This is the number that
decides ad spend, and it only exists because attribution survives all the way
to payment.

---

## 7. Quiet hours

| | Alerts | Tasks | Customer messages |
| --- | --- | --- | --- |
| Monday to Friday, 7am to 6pm | All | Normal | Normal |
| Saturday, 8am to 2pm | Critical only: 1, 2, 6, 10, 11, 12 | Held | Held |
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
| **Alerts** (§3) | Nothing. All 13 are trade-agnostic. |
| **Tasks** (§4) | Verbs may change (`SPRAY` to `INSTALL`). Structure holds. |
| **Escalation** (§5) | The 15 minute threshold is worth tuning to their volume |
| **Digests** (§6) | Nothing, if the pipeline shape is reused |
| **Quiet hours** (§7) | Their trading hours |

The load-bearing part is §1. Carrying that rule across is worth more than
carrying any specific alert, because the failure mode is always the same: a
client asks for "notify me on everything", gets it, and stops reading any of it
by week three.

---

## 9. Before go-live

- [ ] Every workflow has an error branch that alerts, so failures are not silent
- [ ] New Lead is assigned to the office on both boards, and no path leaves a lead unassigned
- [ ] The 15 minute timer emails the office, and the 1 hour step reaches the owner by text and email: a second person, not the same one
- [ ] Quiet hours applied to outbound customer messaging, not just internal alerts
- [ ] Every sequence has a stop condition on reply
- [ ] Entering Quote Accepted kills every sales sequence on the card, tested mid-follow-up
- [ ] An add-on quote accepted on a job under way updates the value and creates the office task, and does not resend the thank-you or move the card
- [ ] The accept and decline buttons tested on a quote with two options: the card moves, and the option chosen is recorded
- [ ] The Yes and No links on both reminders tested by email and by text. No fires alert 12 and sends REM-05, and nothing reschedules itself
- [ ] Deposit timing tested three ways: stock open cell, special order, and a job booked less than 14 days out
- [ ] Deposit and final invoices carry the accepted quote, and the purchase order where there is one. Payment schedules tested with a percentage stage and a fixed stage
- [ ] A GST invoice tested syncing to Xero before the Xero sync is promised. Only GST-free invoices have been seen reaching Xero so far
- [ ] Payment receipt sync agreed with the bookkeeper. If marking an invoice paid before the transfer clears breaks reconciliation, switch it off
- [ ] Contract and variation templates fill in the client details and go for digital signature, tested with an extra 100 sqm variation
- [ ] The job report task fires only when the final invoice is fully paid
- [ ] ask_for_google_review is Yes by default, and a contact set to No gets no review request
- [ ] The Whole pipeline view built and checked: every open card on both boards, in stage order
- [ ] Nothing live was lost when stages were deleted during the 2 October call: every workflow trigger, filter and move step points at a stage that exists, and no open card was left without a stage
- [ ] Old stages removed only after their cards were moved to the new ones
- [ ] Rachael's mobile confirmed as 0428 26 36 26 before any message goes
- [ ] Human labels stored in the dropdown fields, so echoed emails do not read "new-build"
- [ ] SPF and DKIM on the sending domain, and a test email checked in Gmail and Outlook
- [ ] Every merge field and trigger link confirmed against the platform version, with a test sent to yourself
- [ ] Apple and Outlook calendar sync done under the separate calendars task, and a test install booking seen on both
- [ ] Alert volume measured after week one. More than about fifteen a day to one person means something is wrong
- [ ] A test lead pushed end to end through both boards, watching what arrives and when
