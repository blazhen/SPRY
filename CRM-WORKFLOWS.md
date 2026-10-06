# CRM Workflows

Every workflow to build in Systemations for the SprayIT Solutions journey,
written in the platform's own building blocks: a trigger, the steps in order,
the branches, and what stops it. Revised after the client call on Friday
2 October 2026.

**Generated.** This file is produced from
`client-journey-onepage/journey-data.js`, which also renders the agency
workflows page (`client-journey-onepage/workflows.html`). Edit the data
file and run `npm run docs:crm`. Editing this file by hand will be
overwritten.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md), [CRM-MESSAGING.md](CRM-MESSAGING.md)
and [CRM-TASKS-NOTIFICATIONS.md](CRM-TASKS-NOTIFICATIONS.md). Message ids,
alert numbers and task names below refer to those documents.

35 workflows in 11 folders. 58 of the 62 messages are sent by them; the other
4 (JOB-06, RPT-01, RET-01, C-PROG-01) are saved templates sent by hand.

The whole-pipeline view across both boards is a saved view, not a workflow.
How to build it is in [CRM-PIPELINES.md](CRM-PIPELINES.md) §5.

## Step types

| Type | Meaning |
| --- | --- |
| DO | An action in the platform that is not one of the others: create a contact, map fields, assign, tag, reassign |
| SEND | Send a message from the kit, by id |
| TASK | Create a task, with owner and due date |
| ALERT | Fire one of the 13 real-time alerts |
| WAIT | Pause for a duration, or until a time relative to an appointment or date |
| IF | Branch. Nested steps run when the condition holds; *otherwise* steps when it does not |
| MOVE | Change the opportunity stage |
| SET | Set a field or the status |
| STOP | End the workflow |

## Conventions that apply to every workflow

- **Stop on reply.** Every sales sequence checks for an inbound reply before each send and stops if one has arrived. WF-30 handles the pause; each sequence still needs its own exit condition. Reminders about an agreed date keep running.
- **Send window.** Anything the messaging kit marks "waits for the send window" sits behind a Wait until a time window step: 8am to 8pm, Monday to Saturday. Confirmations are exempt.
- **Acceptance kills sales.** WF-14 stops every sales sequence before it does anything else. Test it specifically: accept a quote mid-follow-up and confirm nothing further sends.
- **Add-on quotes.** WF-12 checks `is-active-job` before it moves anything. An accepted add-on or variation quote on a live job updates the value and tasks the office; it never resends the thank-you or moves the card.
- **Book in the platform first.** Install dates go in the install calendar, never a phone calendar first, because WF-18 is what moves the card and starts the reminders and the deposit timing.
- **No automatic rescheduling.** A No on a reminder alerts the team. Crews and rigs are moved by a person.
- **Error branches.** Every workflow gets an error branch that fires alert 11 with the workflow name and the contact.
- **Human labels.** Dropdown fields store the label, not the form value, or the echo emails read "new-build".
- **Required fields on entry.** Stages that need a field to send correctly require it on the stage change rather than reminding afterwards: callback time, inspection date, install date, deposit amount and foam order type, photos captured, invoice number, retention amount and release date.

---

## 01 Intake

The first few minutes, before anybody has read the lead, and the timer that makes sure somebody rings.

4 workflows: WF-01, WF-02, WF-03, WF-04

### WF-01 · Website lead intake

**Board:** Both boards
**Trigger:** Inbound webhook from the website quote form

Everything downstream depends on this one being right: the contact, the consent record, the attribution, and which board the card lands on.

- **DO** Find or create the contact on phone (E.164), then email. Never create a duplicate for a repeat enquirer.
- **DO** Map the fields. Store human labels in the dropdowns (Home, not home). Map the webhook field stage to building_stage.
- **DO** Append the consent record: consent_marketing, consent_text, consent_at, consent_page. Never overwrite an earlier one.
- **DO** Write attribution. First-touch fields only if empty. Last-touch fields always.
- **SET** `ask_for_google_review` = Yes, only if it is empty
- **IF** property_type is Factory or warehouse, or Farm or agricultural, or the message mentions a tender, a builder, a head contractor, or an area over 500 sqm
  - **DO** Create the opportunity on Commercial & Industrial at New Lead, assigned to OFFICE.
  - **ALERT** 6, Commercial enquiry, to OWNER by SMS and email
  - **ALERT** 1, New enquiry, to Assigned user by SMS and in-app
  - **SEND** `X-ACK-01` (SMS)
  - **SEND** `C-ACK-01` (Email: Your enquiry, {{contact.first_name}})
  - *otherwise*
    - **DO** Create the opportunity on Residential at New Lead, assigned to OFFICE. property_type Something else adds a review task.
    - **ALERT** 1, New enquiry, to Assigned user by SMS and in-app
    - **SEND** `X-ACK-01` (SMS)
    - **SEND** `X-ACK-02` (Email: We have your enquiry, {{contact.first_name}})
- **TASK** `CALL {{contact.first_name}}: new lead, {{contact.areas}}` to OFFICE, due 15 minutes  
  *Ring the new lead within 15 minutes. The acknowledgement text and email have already gone. Ring twice, back to back. No answer to either: move the card to Dial 1. If they answer and it is a job, send the quote within two business days, or move the card to Inspection Required if it needs a site visit first.*
- **DO** Start WF-02, the 15 minute timer.

**Tags:** adds `from-website`, `been-enquired` (and the New Lead stage tag for whichever board it lands on)  
**Stops:** Sends once per submission.  
**On error:** Any failed step: alert 11 to OWNER with the payload, and the submission logged for replay. The website already tells the visitor if the post fails, so this covers everything after the post succeeded.

### WF-02 · Lead not called: the 15 minute timer

**Board:** Both boards
**Trigger:** Opportunity created in New Lead

Time to first contact is the one number that moves everything else. This is what makes an unrung lead impossible to ignore, without waking anyone at midnight.

- **WAIT** 15 minutes, business hours only
- **IF** no call logged on the card
  - **ALERT** 7, New lead not called after 15 minutes, to OFFICE by Email
- **WAIT** until 60 minutes, business hours only
- **IF** still no call logged
  - **DO** Text and email to OWNER: this lead has been waiting since {{time}} with no call.
- **DO** From the next morning, listed under Leads not called in the daily summary until a call is logged.

**Stops:** A call is logged, or the stage changes. The clock pauses outside business hours, so an 11pm enquiry starts at 7am.

### WF-03 · Missed call text-back

**Board:** Both boards
**Trigger:** Inbound call to the business number not answered

For a trade business where the phone rings while someone is up a ladder, the single highest-value automation on the list.

- **IF** this number already got the text-back today
  - **STOP** once per caller per day
- **DO** Find or create the contact on the caller number.
- **SEND** `SYS-01` (SMS)
- **ALERT** 2, Missed call, to OFFICE by SMS
- **TASK** `RING BACK {{contact.first_name}}: missed call` to OFFICE, due 30 minutes  
  *A call came in and nobody answered. The caller already has a text saying someone will ring back, so this is a promise the team has made.*

**Tags:** adds `from-phone`, `been-enquired`  
**Stops:** Once per caller per day.

### WF-04 · Out of hours reply

**Board:** Both boards
**Trigger:** Inbound SMS outside office hours

Sets an expectation instead of leaving a text unanswered until morning.

- **IF** this contact already got the reply today
  - **STOP** once per contact per day
- **SEND** `SYS-02` (SMS)

**Stops:** Once per contact per day, not once per message.

---

## 02 Dial 1 and Dial 2

Two calls, the text ten seconds later, and the three emails when calls have not worked.

2 workflows: WF-05, WF-06

### WF-05 · Dial 1: the tried-to-call text

**Board:** Both boards
**Trigger:** Stage changed to Dial 1

Most people will not answer an unknown number and will reply to a text. Ten seconds after the second call, the missed calls are still on their screen.

- **WAIT** 10 seconds
- **SEND** `DIAL-01` (SMS)
- **SET** `contact_attempts` = plus 2 for the two calls, and last_attempt_at stamped
- **TASK** `CALL {{contact.first_name}}: second round of calls` to OFFICE, due Later the same day  
  *Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails.*

**Stops:** Sends once per lead. A reply or an answered call before the second round closes the task.

### WF-06 · Dial 2: the email sequence

**Board:** Both boards
**Trigger:** Stage changed to Dial 2

Calls have not worked, so three emails over a week, then an honest close. Capped, so a card never rots here.

- **WAIT** 2 days
- **SEND** `DIAL-02` (Email: Following up on your {{custom_values.trade_noun}} enquiry)
- **WAIT** until day 4
- **SEND** `DIAL-03` (Email: Pick a time to talk about your {{custom_values.trade_verb}} job)
- **TASK** `CALL {{contact.first_name}}: one more try` to OFFICE, due Day 4  
  *One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way.*
- **WAIT** until day 7
- **SEND** `DIAL-04` (Email: Closing this one off)
- **WAIT** 1 day
- **IF** still in Dial 2 with no reply
  - **SET** `status` = Lost, reason Unreachable

**Tags:** adds `is-unresponsive` (only if day 7 passes with no reply, as the card closes)  
**Stops:** Customer replies on any channel, books a phone call, or the stage changes. Days count from entering Dial 2.

---

## 03 Phone calls and site inspections

The two calendars a customer or the team books into before the quote.

3 workflows: WF-07, WF-08, WF-09

### WF-07 · Phone call booked

**Board:** Both boards
**Trigger:** Appointment booked in the phone call calendar

Confirm, remind twice, and make sure whoever rings has read the enquiry. The day 4 email and the website both book into this calendar.

- **DO** Pause WF-06. A booking stops the Dial 2 emails.
- **SEND** `X-APPT-01` (Email: Confirmed: {{appointment.start_time}})
- **SEND** `X-APPT-02` (SMS)
- **ALERT** 4, Phone call booked, to Assigned user by In-app
- **WAIT** until 24 hours before the appointment
- **SEND** `X-APPT-03` (SMS)
- **WAIT** until 2 hours before
- **SEND** `X-APPT-04` (SMS)

**Stops:** Appointment moved or cancelled, which hands over to WF-08.

### WF-08 · Phone call or inspection moved or cancelled

**Board:** Both boards
**Trigger:** Appointment in the phone call or inspection calendar rescheduled or cancelled

A hole in the diary is recoverable if it is caught early. Staff attend inspections, so there is no no-show branch.

- **IF** rescheduled
  - **SEND** `X-APPT-06` (Email: Your booking has moved)
  - **DO** WF-07 or WF-09 re-queues its reminders against the new time.
- **IF** phone call cancelled
  - **ALERT** 5, Phone call cancelled, to Assigned user by SMS
  - **TASK** `CALL {{contact.first_name}}: phone call cancelled` to OFFICE, due Same day  
    *They cancelled the phone call they booked. Ring them: a cancelled call is usually a diary clash, and a short call often rebooks it. If the card is in Dial 2, the emails resume from where they paused.*
- **IF** inspection cancelled
  - **SET** `inspection_date` = cleared, so the board never shows a visit that is not happening
  - **TASK** `BOOK {{contact.first_name}}: site inspection` to OFFICE, due 2 days  
    *Book the site inspection in the inspection calendar from the card, at a time that suits the customer. Confirm the address and access to the areas being sprayed. The confirmation and the morning text go by themselves.*

**Stops:** Sends once per change. The card does not move.

### WF-09 · Site inspection booked

**Board:** Both boards
**Trigger:** Appointment booked in the inspection calendar

One confirmation with the address, one text on the morning, and a task for whoever is going. Used by a minority of jobs, before the quote or after acceptance.

- **SET** `inspection_date` = from the appointment
- **DO** If the card is not already in Inspection Required, move it there.
- **IF** residential
  - **SEND** `X-INSP-01` (SMS)
  - *otherwise*
    - **SEND** `C-INSP-01` (Email: Site inspection confirmed, {{opportunity.inspection_date}})
- **TASK** `ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}` to ESTIMATOR, due On the date  
  *Attend the inspection. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.*
- **WAIT** until 7:00am on the day
- **SEND** `X-INSP-02` (SMS)
- **WAIT** until the day after the visit
- **IF** the visit was not cancelled
  - **DO** Add been-inspected.

**Tags:** adds `been-contacted`, `been-inspected` (been-inspected goes on the day after the visit, unless it was cancelled)  
**Stops:** Cancelled or moved, which hands over to WF-08.

---

## 04 Quote

From sending the quote to an answer: the follow-up, the accept and decline buttons, and the callback.

4 workflows: WF-10, WF-11, WF-12, WF-13

### WF-10 · Quote sent and the follow-up

**Board:** Residential
**Trigger:** The quote is sent from the quote tool, or the card is moved to Quote Sent by hand

The follow-up that converts quotes: day 2, 5, 10, 21, then a decision. Never left sitting.

- **MOVE** stage to Quote Sent, if not already there
- **DO** Stop WF-06 and WF-16 if either is running.
- **SET** `quote_sent_at` = now. quote_number, quote_link and the value come from the quote.
- **SEND** `R-QUOTE-01` (Email: Your quote from {{custom_values.business_name}}), as the quote tool email, with the view and accept button
- **SEND** `R-QUOTE-02` (SMS)
- **TASK** `CALL {{contact.first_name}}: quote follow up` to OFFICE, due Day 2  
  *Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.*
- **WAIT** until day 2
- **SEND** `R-FU-01` (SMS)
- **WAIT** until day 5
- **SEND** `R-FU-02` (Email: Why our number might look different)
- **WAIT** until day 10
- **SEND** `R-FU-03` (SMS)
- **WAIT** until day 21
- **SEND** `R-FU-04` (Email: Should we close this off?)
- **TASK** `DECIDE {{contact.first_name}}: accepted, nurture or lost` to OFFICE, due Day 21  
  *Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting.*

**Tags:** adds `been-contacted`, `been-quoted`; removes `is-nurturing`  
**Stops:** Customer replies, accepts or declines, or the card leaves Quote Sent.

### WF-11 · Proposal sent and the follow-up

**Board:** Commercial & Industrial
**Trigger:** The proposal is sent from the quote tool, or the card is moved to Quote Sent by hand on the Commercial board

The commercial follow-up: slower, plainer, and it asks for a decision date.

- **MOVE** stage to Quote Sent, if not already there
- **SET** `quote_sent_at` = now. quote_number, quote_link and the value come from the proposal.
- **SEND** `C-PROP-01` (Email: Proposal, {{opportunity.site_address}})
- **TASK** `CALL {{contact.first_name}}: confirm receipt` to ESTIMATOR, due 2 days  
  *Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.*
- **WAIT** until day 7
- **SEND** `C-PROP-02` (Email: Anything you need on {{opportunity.quote_number}}?)
- **TASK** `CHASE {{contact.first_name}}: decision date` to OWNER, due Day 7, then day 21  
  *Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.*
- **WAIT** until day 21
- **SEND** `C-PROP-03` (Email: {{opportunity.quote_number}}, where does this sit?)

**Tags:** adds `been-contacted`, `been-quoted`; removes `is-nurturing`  
**Stops:** Customer replies, accepts, or the card moves to Follow-Up, Nurture or Lost.

### WF-12 · Accept or decline button on a quote

**Board:** Both boards
**Trigger:** A quote is accepted or declined online

One click from the customer moves the card, records which option they chose, and keeps an add-on quote on a live job from starting the welcome all over again.

- **IF** accepted
  - **IF** the contact has is-active-job: an add-on or variation quote on a job already under way
    - **SET** `opportunity value` = plus the accepted add-on
    - **TASK** `ADD-ON {{contact.first_name}}: accepted, update the job` to OFFICE, due Same day  
      *An add-on or variation quote on a job already under way has been accepted. Check the value on the card, add it to the invoice schedule, and tell the crew if it changes the work on the day. No thank-you has gone and the card has not moved.*
    - **STOP** here. No thank-you, no alert, no stage move.
    - *otherwise*
      - **SET** `accepted_quote_option` = the option accepted
      - **DO** Mark the other options on the job as not chosen, so only one can be accepted.
      - **MOVE** stage to Quote Accepted
- **IF** declined
  - **SET** `status` = Lost, with the reason asked for
  - **DO** LOST-01 follows from WF-15.

**Stops:** Once per button press. Phone acceptances and purchase orders are moved by hand and go straight to WF-14.

### WF-13 · Follow-Up: callback requested

**Board:** Both boards
**Trigger:** Stage changed to Follow-Up

A call at the time they chose beats another email. Everything automatic waits.

- **DO** Require callback_at on the stage change.
- **DO** Pause WF-06, WF-10 and WF-11 on the card.
- **TASK** `CALL {{contact.first_name}}: callback as asked` to OFFICE, due At the time they asked  
  *The customer asked to be rung at this time. Ring them, then move the card on: Quote Sent once a quote goes, Inspection Required if a visit is needed, Quote Accepted if they say yes, Nurture if it is not now, or Lost with a reason.*
- **WAIT** until 1 day after callback_at
- **IF** still in Follow-Up
  - **DO** Listed under Callbacks overdue in the daily summary.

**Tags:** adds `been-contacted`  
**Stops:** The stage changes.

---

## 05 Accepted, lost and nurture

The decision, whichever way it goes, and the long drip for not now.

3 workflows: WF-14, WF-15, WF-16

### WF-14 · Quote accepted

**Board:** Both boards
**Trigger:** Stage changed to Quote Accepted, by WF-12 or by hand; and po_number entered on a commercial card waiting in Quote Accepted

Kills every sales sequence, marks the job Won, thanks the customer, and tells the owner and the office.

- **IF** the card has come back to Quote Accepted from a later stage
  - **STOP** here. A job is welcomed once.
- **DO** Stop every sales sequence on the card: WF-06, WF-07 reminders, WF-10, WF-11, WF-13, WF-16. This is the rule that matters most on a board that runs sale and delivery together.
- **IF** residential
  - **SET** `status` = Won
  - **SEND** `X-ACC-01` (Email: Thanks for going ahead, {{contact.first_name}})
  - **SEND** `X-ACC-02` (SMS)
  - *otherwise*
    - **SEND** `C-PO-01` (Email: Thanks for the go-ahead, {{opportunity.site_address}})
    - **IF** accepted online, signed, or po_number is set
      - **SET** `status` = Won
      - *otherwise*
        - **TASK** `CHASE {{contact.first_name}}: purchase order` to OFFICE, due Weekly, until it lands  
          *A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.*
- **ALERT** 8, Quote accepted, to OWNER and OFFICE by SMS and email
- **SET** `deposit_amount and foam_order_type` = from the accepted quote, where a deposit applies. Nothing is invoiced yet.
- **TASK** `NEXT {{contact.first_name}}: inspection or booking` to OFFICE, due Same day  
  *The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked.*

**Tags:** adds `been-accepted`, `is-active-job`; removes `is-nurturing`, `is-stalled`, `is-unresponsive`  
**Stops:** Sends once per job. Add-on quotes never reach it; WF-12 stops them first.

### WF-15 · Lost

**Board:** Both boards
**Trigger:** Status changed to Lost

A Lost with no reason teaches nothing. A graceful goodbye brings a surprising number of jobs back.

- **DO** Require lost_reason. The status change form does not close without one.
- **DO** Stop every sequence on the card: WF-06, WF-07, WF-10, WF-11, WF-16, WF-19, WF-22.
- **TASK** `LOG {{contact.first_name}}: lost reason` to OFFICE, due Same day  
  *Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.*
- **IF** residential, and the reason is not Unreachable, Duplicate or Spam
  - **WAIT** until the next business morning
  - **SEND** `LOST-01` (Email: Thanks for considering us, {{contact.first_name}})

**Tags:** adds `been-lost`; removes `is-active-job`, `is-deposit-owing`  
**Stops:** Sends once. A not now is Nurture, not Lost.

### WF-16 · Nurture drip and the year check-in

**Board:** Both boards
**Trigger:** Stage changed to Nurture

Right job, wrong time. Quotes come back after one or two years, so everyone gets a call at twelve months, and the opted-in also get the emails.

- **DO** Stop WF-06, WF-10 and WF-11 on the card.
- **IF** residential
  - **TASK** `CHECK-IN {{contact.first_name}}: a year since the quote` to OFFICE, due 12 months  
    *A year since this job went to Nurture. Ring and ask whether it is back on. Quotes often come back after one or two years. If it is, refresh the quote against current prices and send it, which moves the card to Quote Sent.*
  - *otherwise*
    - **TASK** `CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}` to OWNER, due Quarterly, recurring  
      *Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.*
- **IF** consent_marketing is not yes
  - **STOP** here for email. No marketing without the tick; the call task above still stands.
- **IF** residential
  - **WAIT** until the next business morning
  - **SEND** `NUR-01` (Email: The bit about R-value nobody explains)
  - **WAIT** 30 days
  - **SEND** `NUR-02` (Email: Where the heat actually goes)
  - **WAIT** 60 days
  - **SEND** `NUR-03` (Email: Still on the list?)
  - **TASK** `REVIEW {{contact.first_name}}: still a fit?` to OWNER, due Quarterly, recurring  
    *Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Quote Sent or New Lead. A clean list keeps the emails landing in inboxes rather than in spam.*
  - **WAIT** until 12 months after entering Nurture
  - **SEND** `NUR-04` (Email: A year on from your quote)
  - *otherwise*
    - **WAIT** 90 days, repeating
    - **SEND** `C-FUT-01` (Email: Still on the plan for {{opportunity.site_address}}?)

**Tags:** adds `been-contacted`, `is-nurturing`  
**Stops:** Any reply, booking or new form fill, or the card moving to Quote Sent or New Lead. Unsubscribe sets do-not-market and the card stays put.

---

## 06 Booking and reminders

From booking the install date to the morning of the job.

5 workflows: WF-17, WF-18, WF-19, WF-20, WF-21

### WF-17 · Booking Required

**Board:** Both boards
**Trigger:** Stage changed to Booking Required

The owner books the install date in the platform first, because that booking is what fires everything after it.

- **IF** residential
  - **TASK** `BOOK {{contact.first_name}}: install date` to OWNER, due 2 business days  
    *Book the install date in the install calendar from the card, and put the crew on it. Book it here first, not in a phone calendar, because the booking is what sends the confirmation and sets up the reminders and the deposit timing.*
  - *otherwise*
    - **TASK** `BOOK {{contact.first_name}}: works dates` to OWNER, due 2 business days  
      *Agree the start and finish dates with the client, then book them in the install calendar from the card with the crew. Book it there first, because the booking sends the mobilisation email and sets up the reminders.*
- **WAIT** 2 business days
- **IF** still in Booking Required
  - **DO** Listed under Installs to book in the daily summary until it moves.

**Stops:** The install is booked, which moves the card to Job Booked.

### WF-18 · Install booked

**Board:** Both boards
**Trigger:** Appointment booked in the install calendar

Booking in the platform, not a phone calendar, is what moves the card and starts the confirmation, the reminders and the deposit timing.

- **SET** `job_date` = from the appointment, with job_end_date on multi-day works and crew_assigned from the calendar
- **MOVE** stage to Job Booked
- **IF** residential
  - **SEND** `JOB-01` (SMS)
  - **SEND** `JOB-02` (Email: Your job is booked for {{opportunity.job_date}})
  - *otherwise*
    - **SEND** `C-MOB-01` (Email: Works booked: {{opportunity.site_address}})
    - **TASK** `INDUCT crew: {{opportunity.site_address}}` to CREW_LEAD, due Before start  
      *Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.*
    - **TASK** `SWMS {{opportunity.site_address}}: issue and confirm receipt` to OWNER, due Before start  
      *Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either.*
- **DO** Start WF-19 (the reminders) and WF-22 (the deposit timing).

**Tags:** adds `been-booked`  
**Stops:** Sends once per booking. A moved booking resends JOB-01 with the new date and re-queues WF-19 and WF-22; it does not resend the preparation email.

### WF-19 · Job reminders, 7 days and 48 hours

**Board:** Both boards
**Trigger:** job_date set or changed, from WF-18

Two chances for the customer to say the date no longer works, early enough to move a crew and a rig. Replaces the old afternoon-before text.

- **IF** job_date is more than 7 days away
  - **WAIT** until 7 days before job_date
  - **SEND** `REM-01` (Email: Your job is a week away. Does the date still work?)
  - **SEND** `REM-02` (SMS)
- **IF** job_date is more than 48 hours away
  - **WAIT** until 48 hours before job_date
  - **SEND** `REM-03` (Email: Your job is in 2 days. Please confirm.)
  - **SEND** `REM-04` (SMS)
- **WAIT** until 9:00am the day before job_date
- **IF** job_confirmed is empty: neither reminder answered
  - **TASK** `CALL {{contact.first_name}}: date not confirmed` to OFFICE, due Day before the job, if neither reminder was answered  
    *Neither reminder got a Yes or a No. Ring to confirm the job is still on, that access is clear, and that someone over eighteen will be there to let the crew in.*

**Stops:** The booking is cancelled, or the date moves, which restarts it against the new date.

### WF-20 · Yes or No on a reminder

**Board:** Both boards
**Trigger:** The Yes or No trigger link in REM-01 to REM-04 is clicked

A No is told to a person straight away. The crew and the rig are only ever moved by a person.

- **IF** Yes
  - **SET** `job_confirmed` = Yes. The link opens a short thank-you page. Nothing else.
- **IF** No
  - **SET** `job_confirmed` = No
  - **SEND** `REM-05` (SMS)
  - **ALERT** 12, Customer cannot make the booked date, to OWNER and OFFICE by SMS and email
  - **TASK** `RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}` to OWNER, due Same day  
    *The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date.*
  - **DO** Nothing is moved automatically. Moving the booking by hand re-queues WF-19 and WF-22.

**Stops:** Once per click. A second No on the same booking does not alert twice.

### WF-21 · Job day

**Board:** Both boards
**Trigger:** job_date arrives, scheduled from the install booking

The on-the-way text, and the things that must be on the card before the job can be marked complete: photos and variations.

- **IF** residential
  - **WAIT** until 6:30am on job_date
  - **SEND** `JOB-04` (SMS)
  - **TASK** `PHOTOS {{opportunity.site_address}}` to CREW_LEAD, due Before marking it complete  
    *Photograph the finished work from the app before leaving site, and tick Photos captured. The job cannot be marked complete without them. They go into the job report, and they are the only real proof-of-work images the business has.*
  - **TASK** `VARIATIONS {{contact.first_name}}: record any extras` to CREW_LEAD, due Before marking it complete  
    *Anything agreed on site that was not in the quote, such as an extra 100 sqm, goes out from the variation document for the customer to sign, and onto the card the same day. Left to invoicing, it surprises the customer.*
  - *otherwise*
    - **WAIT** until 6:30am each site day between job_date and job_end_date
    - **SEND** `C-SITE-01` (SMS)
    - **TASK** `UPDATE {{contact.first_name}}: weekly progress` to OWNER, due Every Friday while live  
      *Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week’s photos.*
    - **TASK** `PHOTOS {{opportunity.site_address}}: this stage` to CREW_LEAD, due End of each stage  
      *Photograph each completed stage before moving on. The photos are the evidence behind each claim and they go into the close-out pack, so they are needed at the end of every stage, not at the end of the job.*
    - **TASK** `VARIATIONS {{opportunity.site_address}}: record and get signed` to CREW_LEAD, due As they happen  
      *Record every variation agreed on site and send it from the variation document for signature the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.*
- **DO** Guard: the job cannot be marked complete until photos_captured is ticked. Enforce it on the stage change, not with a reminder.
- **DO** JOB-06 is a saved snippet in the mobile app, sent by hand. Not a workflow.

**Stops:** The job is marked complete, or the booking moves.

---

## 07 Deposit

Timed to the install date and the foam, never to the booking.

2 workflows: WF-22, WF-23

### WF-22 · Deposit timing by foam type

**Board:** Both boards
**Trigger:** job_date set or changed, and deposit_amount is set

Never at booking. Sent two weeks before the job, due one business day before for stock open cell and seven days before for special order, so the crew can be reassigned in time if it does not land.

- **IF** deposit_amount is empty: no deposit on this job
  - **STOP** here. Jobs with no deposit skip Deposit Requested.
- **IF** foam_order_type is Special order
  - **SET** `deposit_due_date` = 7 days before job_date
  - *otherwise*
    - **SET** `deposit_due_date` = 1 business day before job_date
- **IF** job_date is more than 14 days away
  - **WAIT** until 14 days before job_date
- **DO** Create the deposit invoice from the accepted quote: the deposit amount, due on deposit_due_date, with the accepted quote and any purchase order attached. No card storage and no automatic charge.
- **SEND** `DEP-02` (Email: Deposit for your job on {{opportunity.job_date}})
- **SET** `deposit_invoice_sent_at` = now
- **MOVE** stage to Deposit Requested
- **WAIT** until 2 days before deposit_due_date
- **IF** deposit unpaid
  - **SEND** `DEP-03` (SMS)
- **WAIT** until 4:00pm on deposit_due_date
- **IF** deposit unpaid
  - **ALERT** 13, Deposit unpaid at its due date, to OWNER and OFFICE by SMS and email
  - **TASK** `CHASE {{contact.first_name}}: deposit unpaid` to OFFICE, due On the due date, if unpaid  
    *The deposit was due today and has not landed. Ring the customer today: most late deposits are a missed email, not a change of mind. If it will not be paid in time, tell the owner so the crew can be reassigned.*

**Tags:** adds `is-deposit-owing` (when the deposit invoice goes)  
**Stops:** The deposit is paid (WF-23), the job is cancelled, or job_date moves, which re-runs it from the top against the new date. The 14 day send point is to confirm with Glenn.

### WF-23 · Deposit received

**Board:** Both boards
**Trigger:** Deposit invoice marked paid

Silence after a payment is the thing customers hate most.

- **SET** `deposit_received_at` = now
- **SEND** `DEP-01` (SMS)
- **ALERT** 9, Deposit received, to OFFICE by In-app
- **DO** Cancel the pending DEP-03 and the unpaid check in WF-22. The card stays in Deposit Requested until the job is marked complete.

**Tags:** removes `is-deposit-owing`  
**Stops:** Sends once.

---

## 08 Completion and payment

The final invoice, the job report once it is paid, and what follows the job.

5 workflows: WF-24, WF-25, WF-26, WF-27, WF-28

### WF-24 · Job completed: the final invoice and the chase

**Board:** Both boards
**Trigger:** The crew marks the job complete (stage changed to Job Completed)

Marking the job complete is what bills it. The invoice carries its own payment schedule and the papers that back it.

- **DO** Guard: photos_captured must be ticked.
- **DO** Create the final invoice from the accepted quote: the balance after any deposit, with its payment schedule (one amount, or stages by percentage or fixed amount, each with a due date). Attach the accepted quote, and the purchase order where there is one.
- **SET** `invoice_number, invoice_sent_at` = from the invoice
- **IF** residential
  - **SEND** `JOB-05` (Email: All done at {{opportunity.site_address}})
  - **SEND** `PAY-01` (Email: Invoice {{opportunity.invoice_number}}), invoice attached
  - **WAIT** until day 7
  - **SEND** `PAY-02` (SMS)
  - **WAIT** until day 14
  - **SEND** `PAY-03` (Email: Invoice {{opportunity.invoice_number}} is now overdue)
  - **TASK** `CHASE {{contact.first_name}}: payment overdue` to OFFICE, due Day 14  
    *Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.*
  - *otherwise*
    - **SEND** `C-DONE-01` (Email: Works complete: {{opportunity.site_address}})
    - **SEND** `PAY-01` (Email: Invoice {{opportunity.invoice_number}}), final claim attached
    - **WAIT** until day 30
    - **IF** unpaid
      - **TASK** `CHASE {{contact.first_name}}: claim overdue` to OFFICE, due Day 30  
        *Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.*

**Stops:** The final invoice is marked paid. A reminder sent after someone has paid does more damage than the reminder was worth.

### WF-25 · Final invoice paid: report and close

**Board:** Both boards
**Trigger:** Final invoice marked fully paid

The job report and certificates go only once the invoice is paid. Then the card closes, unless a retention is held.

- **SET** `final_invoice_paid_at` = now
- **TASK** `SEND {{contact.first_name}}: job report and certificates` to OFFICE, due Same day as payment  
  *The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid.*
- **IF** commercial
  - **WAIT** 1 day
  - **SEND** `C-CLOSE-01` (Email: Thanks, {{contact.first_name}})
  - **TASK** `REFERENCE {{contact.first_name}}: ask, and record the answer` to OWNER, due Day 7  
    *Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager’s word is worth more on a tender than any number of homeowner reviews.*
- **IF** retention_amount is set
  - **MOVE** stage to Retention Claim
  - **DO** Add is-retention-held. Status stays Won; the card stays open until the retention is paid.
  - *otherwise*
    - **DO** Close the card as Won and take is-active-job off.

**Tags:** adds `been-customer`, `is-retention-held`; removes `is-active-job` (is-retention-held only when a retention is held; is-active-job comes off only when no retention is held, otherwise WF-29 takes it off)  
**Stops:** Runs once per job.

### WF-26 · Google review request

**Board:** Both boards
**Trigger:** job_date passes on a job marked complete

Controlled by one field on the contact instead of a stage. Asked once, four weeks after the job, and only where the team is happy to ask.

- **WAIT** 4 weeks after job_date. The range agreed was 4 to 6 weeks.
- **IF** ask_for_google_review is Yes, the contact has no is-complaint tag, and been-review-asked is not on the contact
  - **SEND** `REV-01` (SMS)
  - *otherwise*
    - **STOP** here. No request.

**Tags:** adds `been-review-asked`  
**Stops:** Asked once per contact. Never chased.

### WF-27 · After the job: referral and the year check-in

**Board:** Residential
**Trigger:** Final invoice marked fully paid

Most of the work comes from people passing the name on, and a year on is when the rest of the building comes up.

- **WAIT** 7 days
- **IF** consent_marketing is yes
  - **SEND** `REV-02` (Email: Know anyone else with the same problem?)
- **WAIT** until 12 months after job_date
- **IF** consent_marketing is yes
  - **SEND** `REV-03` (Email: A year on, how is it going?)

**Stops:** Runs to the end. The 12 month step is scheduled on entry so it survives everything else changing.

### WF-28 · Progress claims

**Board:** Commercial & Industrial
**Trigger:** A progress claim invoice is sent while the works run

Staged works bill per the programme. Each claim carries its photos and the papers that back it.

- **SEND** `C-PAY-01` (Email: Progress claim {{opportunity.invoice_number}})
- **WAIT** 30 days from the claim
- **IF** that claim is unpaid
  - **TASK** `CHASE {{contact.first_name}}: claim overdue` to OFFICE, due Day 30  
    *Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.*

**Stops:** The claim is paid. Payment terms still to confirm with Glenn.

---

## 09 Retention

The money held back for six to twelve months, run by hand with a reminder.

1 workflow: WF-29

### WF-29 · Retention claim reminder

**Board:** Both boards
**Trigger:** Stage changed to Retention Claim

A retention can sit for six to twelve months. A task on the release date is what stops it being forgotten.

- **DO** Require retention_amount and retention_release_date.
- **WAIT** until retention_release_date
- **TASK** `CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}` to OFFICE, due On the release date  
  *The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card.*
- **WAIT** 30 days
- **IF** still in Retention Claim
  - **TASK** `CHASE {{contact.first_name}}: retention unpaid` to OFFICE, due 30 days after the release date  
    *A month since the retention claim went and it has not been paid. Ring the accounts contact and ask where it sits, and whether anything is needed from us before it is released.*
- **DO** When the retention is marked paid by hand: the card closes as Won, and is-retention-held and is-active-job come off.

**Tags:** removes `is-retention-held`, `is-active-job` (both come off when the retention is marked paid)  
**Stops:** The retention is marked paid by hand.

---

## 10 Always on

Watching every conversation, whatever stage the card is at.

4 workflows: WF-30, WF-31, WF-32, WF-33

### WF-30 · Customer replied

**Board:** Both boards
**Trigger:** Inbound SMS or email from a contact with an open opportunity

A reply is a live conversation. Nothing automatic should talk over it.

- **DO** Pause the sales sequences on the contact: WF-06, WF-10, WF-11, WF-16, and the payment reminders in WF-24. Reminders about an agreed date (WF-07, WF-19, WF-22) keep running.
- **ALERT** 3, Inbound reply, to Assigned user by In-app and SMS
- **TASK** `REPLY {{contact.first_name}}: they messaged` to Assigned user, due 1 hour  
  *A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds.*
- **DO** The sequences resume only when someone replies from the platform and chooses to resume, never automatically.

**Tags:** removes `is-unresponsive`, `is-stalled`  
**Stops:** Fires on every inbound message.

### WF-31 · STOP and unsubscribe

**Board:** Both boards
**Trigger:** Inbound SMS reads STOP, or an email unsubscribe link is used

The platform handles most of this natively. This confirms what it does and adds the bit it does not.

- **DO** Native: STOP sets do-not-SMS on the contact. Unsubscribe sets do-not-email for marketing.
- **DO** Add: remove the contact from WF-16 and WF-27, and leave the card where it is so a later enquiry is still recognised.
- **DO** Transactional messages about a live job still send: reminders, deposit and invoice. That is lawful and expected; make sure the do-not-SMS flag is not wired to block them.

**Tags:** adds `is-no-marketing`; removes `is-nurturing`  
**Stops:** Immediate.

### WF-32 · Stalled card monitor

**Board:** Both boards
**Trigger:** Scheduled, daily at 6:45am

Escalation toward visibility, not more alarms. A card stuck for forty days is a conversation to have on Monday, not an emergency.

- **DO** For every open card, compare time in stage with that stage's stall threshold from the pipeline design.
- **IF** over the threshold
  - **DO** The stage task reappears at the top of the assigned user's list.
- **IF** over 2x the threshold
  - **DO** Line item in the daily summary.
- **IF** over 3x the threshold
  - **DO** Named in the weekly review, with the card.

**Tags:** adds `is-stalled`  
**Stops:** Runs daily.

### WF-33 · Negative review or complaint

**Board:** Both boards
**Trigger:** Review received under 4 stars, or is-complaint added to a contact

Reputation decays fast. A same-day call fixes most of them.

- **ALERT** 10, Negative review or complaint, to OWNER by SMS and email
- **TASK** `CALL {{contact.first_name}}: review or complaint, today` to OWNER, due Same day  
  *Ring them today. Most unhappy customers are fixed by one call and almost none by silence, and a public reply written before you have spoken to them tends to make it worse. Any marketing to that contact is paused until the call has happened.*
- **SET** `ask_for_google_review` = No
- **DO** Pause any marketing sequence on the contact until the call has happened.

**Tags:** adds `is-complaint`  
**Stops:** Sends once per review or tag.

---

## 11 Reporting

Nothing a customer ever sees. Scheduled, not triggered.

2 workflows: WF-34, WF-35

### WF-34 · Daily summary

**Board:** Both boards
**Trigger:** Scheduled, 7:00am Monday to Saturday

Where everything that is not an emergency goes. NEEDS YOU last, because it is the section people act on.

- **DO** Email to OWNER and OFFICE: yesterday (enquiries, calls, quotes sent, quotes accepted), today (inspections, installs, phone calls booked, deposits due), needs you (leads not called, callbacks due, installs to book, dates not confirmed, deposits unpaid, invoices overdue, job reports to send, retentions due).

**Stops:** Runs daily.

### WF-35 · Weekly and monthly reports

**Board:** Both boards
**Trigger:** Scheduled, Monday 7:00am and the 1st of the month

Read across both boards from the shared stage keys. The forecast and the committed work are shown as two lines, never one.

- **DO** Weekly to OWNER: enquiries by source, median time to first call, leads closed as Unreachable, quotes sent, quotes accepted, lost by reason, open value, accepted but not yet completed, cards stalled 3x, jobs completed, days from acceptance to payment, invoices outstanding, retentions held.
- **DO** Monthly to OWNER: cost per enquiry and per accepted job by utm_source, gclid and fbclid, against paid revenue.
- **DO** Weekly reconciliation: count of website submissions against opportunities created. A mismatch fires alert 11.

**Stops:** Runs on schedule.
