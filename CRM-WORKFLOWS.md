# CRM Workflows

Every workflow to build in Systemations for the Spray It Solutions journey,
written in the platform's own building blocks: a trigger, the steps in order,
the branches, and what stops it.

**Generated.** This file is produced from
`client-journey-onepage/journey-data.js`, which also renders the agency
workflows page (`client-journey-onepage/workflows.html`). Edit the data
file and run `npm run docs:crm`. Editing this file by hand will be
overwritten.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md), [CRM-MESSAGING.md](CRM-MESSAGING.md)
and [CRM-TASKS-NOTIFICATIONS.md](CRM-TASKS-NOTIFICATIONS.md). Message ids,
alert numbers and task names below refer to those documents.

30 workflows in 9 folders. 62 of the 64 messages are sent by them; the other
2 (JOB-06, C-PROG-01) are saved templates sent by hand.

## Step types

| Type | Meaning |
| --- | --- |
| DO | An action in the platform that is not one of the others: create a contact, map fields, assign, tag, reassign |
| SEND | Send a message from the kit, by id |
| TASK | Create a task, with owner and due date |
| ALERT | Fire one of the 12 real-time alerts |
| WAIT | Pause for a duration, or until a time relative to an appointment or date |
| IF | Branch. Nested steps run when the condition holds; *otherwise* steps when it does not |
| MOVE | Change the opportunity stage |
| SET | Set a field or the status |
| STOP | End the workflow |

## Conventions that apply to every workflow

- **Stop on reply.** Every sequence checks for an inbound reply before each send and stops if one has arrived. WF-24 handles the pause; each sequence still needs its own exit condition.
- **Send window.** Anything the messaging kit marks "waits for the send window" sits behind a Wait until a time window step: 8am to 8pm, Monday to Saturday. Confirmations are exempt.
- **Won kills sales.** WF-14 removes the contact from every sales sequence before it does anything else. Test it specifically: set a card to Won mid-chase and confirm nothing further sends.
- **Error branches.** Every workflow gets an error branch that fires alert 11 with the workflow name and the contact.
- **Human labels.** Dropdown fields store the label, not the form value, or the echo emails read "new-build".
- **Required fields on entry.** Stages that need a field to send correctly require it on the stage change rather than reminding afterwards: assessment date, proposal due date, job dates, invoice number, PO number, photos captured.

---

## 01 Intake

The first few minutes, before anybody has read the lead.

4 workflows: WF-01, WF-02, WF-22, WF-23

### WF-01 · Website lead intake

**Board:** Both boards
**Trigger:** Inbound webhook from the website quote form

Everything downstream depends on this one being right: the contact, the consent record, the attribution, and which board the card lands on.

- **DO** Find or create the contact on phone (E.164), then email. Never create a duplicate for a repeat enquirer.
- **DO** Map the fields. Store human labels in the dropdowns (Home, not home). Map the webhook field stage to building_stage.
- **DO** Append the consent record: consent_marketing, consent_text, consent_at, consent_page. Never overwrite an earlier one.
- **DO** Write attribution. First-touch fields only if empty. Last-touch fields always.
- **IF** property_type is Factory or warehouse, or Farm or agricultural, or the message mentions a tender, a builder, a head contractor, or an area over 500 sqm
  - **DO** Create the opportunity on Commercial & Industrial at New Enquiry, assigned to OWNER.
  - **ALERT** 6, Commercial enquiry, to OWNER by SMS
  - **SEND** `X-ACK-01` (SMS)
  - **SEND** `C-ACK-01` (Email: Your enquiry, {{contact.first_name}})
  - *otherwise*
    - **DO** Create the opportunity on Residential at New Enquiry. Round robin assignment. property_type Something else adds a review task.
    - **ALERT** 1, New enquiry, to Assigned user by SMS and in-app
    - **SEND** `X-ACK-01` (SMS)
    - **SEND** `X-ACK-02` (Email: We have your enquiry, {{contact.first_name}})
- **TASK** `CALL {{contact.first_name}}: new enquiry` to Assigned user, due 1 hour  
  *Ring the new enquiry. The acknowledgement text and email have already gone, so this is the first human contact. If it is a job worth having, move the card to Qualified. If you cannot reach them, log the attempt and the chase takes over.*
- **DO** Start WF-02, the unattended lead ladder.

**Stops:** Sends once per submission.  
**On error:** Any failed step: alert 11 to OWNER with the payload, and the submission logged for replay. The website already tells the visitor if the post fails, so this covers everything after the post succeeded.

### WF-02 · Unattended lead ladder

**Board:** Both boards
**Trigger:** Opportunity created in New Enquiry

Time to first contact is the one number that moves everything else. This is what makes an untouched lead impossible to ignore.

- **WAIT** 15 minutes, business hours only
- **IF** still in New Enquiry
  - **DO** In-app reminder to the assigned user.
- **WAIT** until 60 minutes
- **IF** still in New Enquiry
  - **ALERT** 7, Lead unattended for an hour, to Assigned user and OWNER by SMS
  - **DO** Reassign to OFFICE (to OWNER on the commercial board).
- **WAIT** until 4 hours
- **IF** still in New Enquiry
  - **DO** SMS to OWNER: this lead has been sitting since {{time}}.
- **DO** From the next morning, listed under Leads unattended in the daily digest until it moves.

**Stops:** The moment the stage changes. The clock pauses outside business hours, so an 11pm enquiry starts at 7am.

### WF-22 · Missed call text-back

**Board:** Both boards
**Trigger:** Inbound call to the business number not answered

For a trade business where the phone rings while someone is up a ladder, the single highest-value automation on the list.

- **IF** this number already got the text-back today
  - **STOP** once per caller per day
- **DO** Find or create the contact on the caller number.
- **SEND** `SYS-01` (SMS)
- **ALERT** 2, Missed call, to OFFICE by SMS
- **TASK** `RING BACK {{contact.first_name}}: missed call` to OFFICE, due 30 minutes  
  *A call came in and nobody answered. The caller already has a text saying you will ring back, so this is a promise with your name on it.*

**Stops:** Once per caller per day.

### WF-23 · Out of hours reply

**Board:** Both boards
**Trigger:** Inbound SMS outside office hours

Sets an expectation instead of leaving a text unanswered until morning.

- **IF** this contact already got the reply today
  - **STOP** once per contact per day
- **SEND** `SYS-02` (SMS)

**Stops:** Once per contact per day, not once per message.

---

## 02 Contact and qualify

Getting hold of them, and working out whether it is a job.

4 workflows: WF-03, WF-04, WF-05, WF-06

### WF-03 · The chase

**Board:** Both boards
**Trigger:** Stage changed to Contacting

Five attempts over seven days, then an honest close. Capped, so a card never rots here.

- **SEND** `X-CHASE-01` (SMS)
- **TASK** `CALL {{contact.first_name}}: attempt 2` to Assigned user, due Day 1  
  *Second call attempt. Try a different time of day from the first. Log it on the card either way, so the chase knows where it is up to.*
- **WAIT** 2 days
- **SEND** `X-CHASE-02` (Email: Still keen to help with your {{custom_values.trade_noun}})
- **TASK** `CALL {{contact.first_name}}: attempt 3` to Assigned user, due Day 2  
  *Third call attempt. If the phone is not working, reply to their enquiry email instead and note it on the card.*
- **WAIT** until day 4
- **SEND** `X-CHASE-03` (SMS)
- **TASK** `CALL {{contact.first_name}}: attempt 4` to Assigned user, due Day 4  
  *Fourth call attempt. They have had two texts and an email by now, so keep it short: you are ringing about their enquiry and can talk whenever suits.*
- **WAIT** until day 7
- **SEND** `X-CHASE-04` (Email: Closing this one off)
- **TASK** `CALL {{contact.first_name}}: final attempt` to Assigned user, due Day 7  
  *Last call before the card is closed as Unreachable. The honest close email goes the same day and it is the one people answer, so check for a reply before closing.*
- **WAIT** 1 day
- **IF** still in Contacting
  - **SET** `status` = Lost, reason Unreachable

**Stops:** Customer replies on any channel, an appointment is booked, or the stage changes. Each call attempt increments contact_attempts and stamps last_attempt_at.

### WF-04 · Phone consult booked

**Board:** Both boards
**Trigger:** Appointment booked in the phone consult calendar

Confirm, remind twice, and make sure the person who calls has read the enquiry.

- **DO** Remove the contact from WF-03. A booking pauses the chase.
- **SEND** `X-APPT-01` (Email: Confirmed: {{appointment.start_time}})
- **SEND** `X-APPT-02` (SMS)
- **ALERT** 4, Booking made, to Assigned user by In-app
- **WAIT** until 24 hours before the appointment
- **SEND** `X-APPT-03` (SMS)
- **WAIT** until 2 hours before
- **SEND** `X-APPT-04` (SMS)

**Stops:** Appointment cancelled or rescheduled, which hands over to WF-05.

### WF-05 · Consult changed, cancelled or missed

**Board:** Both boards
**Trigger:** Appointment status changed: rescheduled, cancelled, or no-show

A hole in the diary is recoverable if it is caught early.

- **IF** rescheduled
  - **SEND** `X-APPT-06` (Email: Your booking has changed)
  - **DO** WF-04 restarts against the new time.
- **IF** cancelled
  - **SEND** `X-APPT-06` (Email: Your booking has changed)
  - **ALERT** 5, Booking cancelled, to Assigned user by SMS
  - **DO** Restart WF-03 from attempt 2.
- **IF** no-show
  - **SEND** `X-APPT-05` (SMS)
  - **DO** Restart WF-03 from attempt 2.

**Stops:** Sends once per change.

### WF-06 · Qualified

**Board:** Residential
**Trigger:** Stage changed to Qualified

The deal becomes real here. A forecast value is set and the customer is pointed at the assessment calendar.

- **DO** Remove from WF-03.
- **SET** `opportunity value` = the default estimate for the property type: one day of floor work for a house floor, the full-house band for a whole home
- **SEND** `X-BOOK-01` (SMS)
- **SEND** `X-BOOK-02` (Email: Booking your {{custom_values.assessment_noun}})
- **TASK** `BOOK {{contact.first_name}}: assessment` to OFFICE, due 3 days  
  *Get the site assessment in the diary. They have a booking link by text and email, so check whether they have used it before ringing. Confirm the address, who will be home, and access to the areas being sprayed.*

**Stops:** Assessment booked.

---

## 03 Site visits

Booking the assessment or inspection, and what happens when one does not go ahead.

2 workflows: WF-07, WF-30

### WF-07 · Assessment or inspection booked

**Board:** Both boards
**Trigger:** Appointment booked in the assessment calendar, or stage changed to Assessment Booked / Inspection Booked

One confirmation with the address, one text on the morning, and a task for whoever is going.

- **SET** `assessment_date` = from the appointment
- **IF** residential
  - **SEND** `R-ASSESS-01` (SMS)
  - **TASK** `ATTEND {{contact.first_name}}: assessment` to ESTIMATOR, due On the date  
    *Get the site assessment in the diary. They have a booking link by text and email, so check whether they have used it before ringing. Confirm the address, who will be home, and access to the areas being sprayed.*
  - **WAIT** until 7:00am on the day
  - **SEND** `R-ASSESS-02` (SMS)
  - *otherwise*
    - **SEND** `C-INSP-01` (Email: Site inspection confirmed, {{opportunity.assessment_date}})
    - **TASK** `ATTEND {{opportunity.site_address}}: inspection` to OWNER, due On the date  
      *Attend the visit. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.*
    - **WAIT** until 24 hours before
    - **SEND** `X-APPT-03` (SMS)

**Stops:** Cancelled or moved, which sends X-APPT-06 and re-queues the morning text against the new date.

### WF-30 · Site visit cancelled or missed

**Board:** Both boards
**Trigger:** Appointment in the assessment calendar cancelled or rescheduled, or marked no-show

A site visit that does not happen is the most expensive failure in the journey. Without this the card sits in Assessment Booked with nothing in the diary, and nobody is told.

- **IF** rescheduled
  - **SEND** `X-APPT-06` (Email: Your booking has changed)
  - **DO** WF-07 re-queues the morning text against the new date. The card stays where it is.
- **IF** cancelled
  - **ALERT** 5, Booking cancelled, to Assigned user by SMS
  - **IF** residential
    - **SEND** `R-ASSESS-03` (SMS)
    - **SEND** `R-ASSESS-04` (Email: Your {{custom_values.assessment_noun}} is cancelled)
    - *otherwise*
      - **SEND** `C-INSP-02` (Email: Site inspection cancelled, {{opportunity.site_address}})
  - **MOVE** stage to Qualified, or Qualified / Scoping on commercial
  - **TASK** `REBOOK {{contact.first_name}}: {{custom_values.assessment_noun}} cancelled` to OFFICE, due 1 day  
    *The visit came off the diary and the card has gone back to Qualified. A rebooking text and email have already gone. Ring if they have not picked a new time within a day: a cancelled site visit is usually a diary clash rather than a change of mind, and one call puts it straight back in.*
- **IF** marked no-show
  - **ALERT** 12, Missed appointment, to Assigned user and OWNER by SMS
  - **IF** residential
    - **SEND** `R-ASSESS-05` (SMS)
    - **SEND** `R-ASSESS-06` (Email: We came out today but could not get in)
    - *otherwise*
      - **SEND** `C-INSP-03` (Email: We attended {{opportunity.site_address}} but could not get access)
  - **MOVE** stage to Qualified, or Qualified / Scoping on commercial
  - **TASK** `CALL {{contact.first_name}}: we could not get in today` to Assigned user, due Same day  
    *The crew went out and could not get access, so the visit cost half a day and produced nothing. Ring the same day. People are usually embarrassed and quick to rebook, and the longer it is left the more quietly the job dies.*
- **SET** `assessment_date` = cleared on a cancel or a no-show, so the board never shows a visit that is not happening

**Stops:** Sends once per change. A reschedule does not move the card; a cancel or a no-show does.

---

## 04 Quote and proposal

From sending a number to getting an answer out of them.

4 workflows: WF-08, WF-09, WF-10, WF-11

### WF-08 · Quote clock

**Board:** Both boards
**Trigger:** Stage changed to Quoting (residential) or Specifying (commercial)

A quote that takes a week loses jobs that were won on the day. The customer is told the deadline and the estimator carries it.

- **IF** residential
  - **SEND** `R-QUOTING-01` (SMS)
  - **TASK** `QUOTE {{contact.first_name}}: {{opportunity.site_address}}` to ESTIMATOR, due 2 days  
    *Write and send the quote within two business days. The customer has been told that, so it is a promise. Put the quote number and the figure on the card, attach the document, then move the card to Quote Sent.*
  - **WAIT** 2 business days
  - **IF** still in Quoting
    - **DO** Listed under Quotes overdue in the daily digest until it moves.
  - *otherwise*
    - **SEND** `C-SPEC-01` (Email: Proposal for {{opportunity.site_address}} by {{opportunity.proposal_due_date}})
    - **TASK** `SPEC {{opportunity.site_address}}: product, access, staging, WHS` to OWNER, due 5 days  
      *Work out product, thickness, access, plant, staging and WHS, and build the proposal. Five days. The customer has been given that date by email, so it is a commitment.*
    - **WAIT** 5 business days
    - **IF** still in Specifying
      - **DO** Listed under Proposals overdue in the daily digest.

**Stops:** Stage changes. C-SPEC-01 needs proposal_due_date set on the card first; make the field required on entry.

### WF-09 · Quote sent and the follow-up

**Board:** Residential
**Trigger:** Stage changed to Quote Sent

The follow-up that converts quotes: day 2, 5, 10, 21, then a decision. Never left sitting.

- **SET** `quote_sent_at` = now. The opportunity value is entered by hand with the quote.
- **SEND** `R-QUOTE-01` (Email: Your quote from {{custom_values.business_name}})
- **SEND** `R-QUOTE-02` (SMS)
- **TASK** `CALL {{contact.first_name}}: quote follow up` to Assigned user, due Day 2  
  *Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.*
- **WAIT** until day 2
- **SEND** `R-FU-01` (SMS)
- **WAIT** until day 3
- **IF** still in Quote Sent
  - **MOVE** stage to Follow-up
- **WAIT** until day 5
- **SEND** `R-FU-02` (Email: Why our number might look different)
- **WAIT** until day 10
- **SEND** `R-FU-03` (SMS)
- **WAIT** until day 21
- **SEND** `R-FU-04` (Email: Should I close this off?)
- **TASK** `DECIDE {{contact.first_name}}: close or nurture` to Assigned user, due Day 21  
  *Twenty-one days with no decision. Close the card: Won if they accepted, Lost with a reason if they went elsewhere, or Nurture if it is a real job at the wrong time. Never leave it sitting.*

**Stops:** Customer replies, status set to Won or Lost, or the card leaves the Quote Sent and Follow-up stages.

### WF-10 · Proposal submitted and the review

**Board:** Commercial & Industrial
**Trigger:** Stage changed to Proposal Submitted

The commercial follow-up: slower, plainer, and it asks for a decision date.

- **SET** `quote_sent_at` = now. quote_number and the value entered by hand with the proposal.
- **SEND** `C-PROP-01` (Email: Proposal, {{opportunity.site_address}})
- **TASK** `CALL {{contact.first_name}}: confirm receipt` to OWNER, due 2 days  
  *Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.*
- **WAIT** until day 7
- **SEND** `C-PROP-02` (Email: Anything you need on {{opportunity.quote_number}}?)
- **IF** still in Proposal Submitted
  - **MOVE** stage to Commercial Review
- **TASK** `CHASE {{contact.first_name}}: decision date` to OWNER, due Day 7, then day 21  
  *Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.*
- **WAIT** until day 21
- **SEND** `C-PROP-03` (Email: {{opportunity.quote_number}}, where does this sit?)

**Stops:** Customer replies, or the card moves to Awaiting PO, Future Project, or Lost.

### WF-11 · Awaiting PO

**Board:** Commercial & Industrial
**Trigger:** Stage changed to Awaiting PO

A verbal award is visible and chased without being counted as committed work.

- **SEND** `C-PO-01` (Email: Ready to proceed, {{opportunity.site_address}})
- **TASK** `CHASE {{contact.first_name}}: PO` to OWNER, due Weekly, recurring  
  *Weekly chase for the purchase order. The job is verbally won but stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.*

**Stops:** PO received, which is when a human sets Won. Status stays Open until then.

---

## 05 Won and lost

The decision, whichever way it goes.

3 workflows: WF-12, WF-13, WF-14

### WF-12 · Lost

**Board:** Both boards
**Trigger:** Status changed to Lost

A Lost with no reason teaches nothing. A graceful goodbye brings a surprising number of jobs back.

- **DO** Require lost_reason. The status change form does not close without one.
- **DO** Stop every sequence on the card: WF-03, WF-04, WF-09, WF-10, WF-13.
- **TASK** `LOG {{contact.first_name}}: lost reason` to Assigned user, due Same day  
  *Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.*
- **IF** residential, and the reason is not Unreachable, Duplicate or Spam
  - **WAIT** until the next business morning
  - **SEND** `LOST-01` (Email: Thanks for considering us, {{contact.first_name}})
- **IF** reason is Timing and consent_marketing is yes
  - **DO** Add the tag nurture, which starts WF-13.

**Stops:** Sends once.

### WF-13 · Nurture drip

**Board:** Both boards
**Trigger:** Stage changed to Nurture or Future Project, or the tag nurture added

Right job, wrong time. Marketing, so consent-gated, with a permission reset at ninety days.

- **IF** consent_marketing is not yes
  - **STOP** immediately. No marketing without the tick.
- **IF** residential
  - **WAIT** until the next business morning
  - **SEND** `NUR-01` (Email: The bit about R-value nobody explains)
  - **WAIT** 30 days
  - **SEND** `NUR-02` (Email: Where the heat actually goes)
  - **WAIT** 60 days
  - **SEND** `NUR-03` (Email: Still on the list?)
  - **TASK** `REVIEW {{contact.first_name}}: still a fit?` to OWNER, due Quarterly, recurring  
    *Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Qualified. A clean list keeps the emails landing in inboxes rather than in spam.*
  - *otherwise*
    - **WAIT** 90 days, repeating
    - **SEND** `C-FUT-01` (Email: Still on the plan for {{opportunity.site_address}}?)
    - **TASK** `CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}` to OWNER, due Quarterly, recurring  
      *Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.*

**Stops:** Any reply, booking or new form fill, which moves the card back to Qualified. Unsubscribe sets do-not-market and the card stays put.

### WF-14 · Won

**Board:** Both boards
**Trigger:** Status changed to Won

Kills every sales sequence, thanks the customer, and hands the office its two tasks.

- **DO** Stop every sales sequence on the card: WF-03, WF-04, WF-09, WF-10, WF-11, WF-13. This is the rule that matters most on a merged board.
- **ALERT** 8, Quote accepted, to OWNER and OFFICE by SMS
- **IF** residential
  - **IF** deposit_amount is set
    - **SEND** `X-WON-01` (Email: Locked in. Here is what happens next.)
    - **SEND** `X-WON-02` (SMS)
    - **TASK** `INVOICE {{contact.first_name}}: deposit` to OFFICE, due 1 day  
      *Send the deposit invoice, on the jobs that take one. The amount is already on the card and the customer has been told to expect it. When the money lands, tick Deposit received, which confirms it to them and unblocks scheduling.*
    - *otherwise*
      - **SEND** `X-WON-01` (Email: Locked in. Here is what happens next.), the branch without line 1
      - **DO** SMS variant: "Thanks, we will confirm dates shortly."
  - **TASK** `SCHEDULE {{contact.first_name}}: allocate crew and date` to OFFICE, due 3 days  
    *Pick a start date, a finish date and a crew, put all three on the card, then move it to Scheduled. That sends the booking text and the preparation email by itself.*
  - *otherwise*
    - **DO** Require po_number on the status change form. Never Won on a verbal.
    - **MOVE** stage to Mobilising
    - **SEND** `C-MOB-01` (Email: Mobilising for {{opportunity.site_address}})
    - **TASK** `MOBILISE {{opportunity.site_address}}: programme, inductions, SWMS, materials` to OWNER, due 2 working days  
      *Purchase order received. Confirm the programme within two working days: start and finish dates, crew, site contact, induction dates and access windows, all on the card.*

**Stops:** Sends once.

---

## 06 Delivery

Deposit taken to job finished.

4 workflows: WF-15, WF-16, WF-17, WF-18

### WF-15 · Deposit received

**Board:** Residential
**Trigger:** deposit_received_at set on the card

Silence after a payment is the thing customers hate most.

- **SEND** `DEP-01` (SMS)
- **ALERT** 9, Deposit received, to OFFICE by In-app
- **DO** Bring the SCHEDULE task forward to due now.

**Stops:** Sends once.

### WF-16 · Scheduled

**Board:** Residential
**Trigger:** Stage changed to Scheduled

The booking, the preparation list, and the afternoon-before reminder.

- **DO** Require job_start_date, job_end_date and crew_assigned on entry.
- **SEND** `JOB-01` (SMS)
- **SEND** `JOB-02` (Email: Your job is booked for {{opportunity.job_start_date}})
- **TASK** `CONFIRM {{contact.first_name}}: day before` to OFFICE, due Day before start  
  *Quick check the afternoon before: access clear, pets sorted, somebody over eighteen home to let the crew in. The reminder text has gone; this is the call that catches what it does not.*
- **WAIT** until 4:00pm the day before job_start_date
- **SEND** `JOB-03` (SMS)

**Stops:** If job_start_date changes, cancel the pending JOB-03 and re-queue it against the new date.

### WF-17 · Mobilising

**Board:** Commercial & Industrial
**Trigger:** Stage changed to Mobilising

The email already went with Won. This stage is two tasks that must be closed before the crew turns up.

- **DO** Require job_start_date, job_end_date, crew_assigned and a site contact on entry.
- **TASK** `INDUCT crew: {{opportunity.site_address}}` to CREW_LEAD, due Before start  
  *Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.*
- **TASK** `SWMS {{opportunity.site_address}}: issue and confirm receipt` to OWNER, due Before start  
  *Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.*

**Stops:** Stage changes to In Progress.

### WF-18 · In Progress

**Board:** Both boards
**Trigger:** Stage changed to In Progress

The on-the-way text, and the two things that have to happen before the card can move on: photos and variations.

- **IF** residential
  - **SEND** `JOB-04` (SMS)
  - **TASK** `PHOTOS {{opportunity.site_address}}` to CREW_LEAD, due On completion  
    *Photograph the finished work from the app before leaving site, and tick Photos captured. The card cannot move to Invoiced without them. They go to the customer in the completion email, and they are the only real proof-of-work images the business has.*
  - **TASK** `VARIATIONS {{contact.first_name}}: record any extras` to CREW_LEAD, due On completion  
    *Write down anything agreed on site that was not in the quote, with the amount, and put it on the card the same day. Left to invoicing, it surprises the customer.*
  - *otherwise*
    - **WAIT** until 6:30am each site day between job_start_date and job_end_date
    - **SEND** `C-SITE-01` (SMS)
    - **TASK** `UPDATE {{contact.first_name}}: weekly progress` to OWNER, due Every Friday while live  
      *Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week’s photos.*
    - **TASK** `PHOTOS {{opportunity.site_address}}: this stage` to CREW_LEAD, due End of each stage  
      *Photograph each completed stage before moving on. On a staged job the photos are the evidence behind the progress claim, so they are needed at the end of every stage, not at the end of the job.*
    - **TASK** `VARIATIONS {{opportunity.site_address}}: record and get signed` to CREW_LEAD, due As they happen  
      *Record every variation agreed on site and get it signed the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.*
- **DO** Guard: the card cannot enter Invoiced or Invoicing unless photos_captured is ticked. Enforce it on the stage change, not with a reminder.
- **DO** JOB-06 is a saved snippet in the mobile app, sent by hand. Not a workflow.

**Stops:** Stage changes.

---

## 07 Invoice and close

Getting paid, and asking for the review while the job is fresh.

3 workflows: WF-19, WF-20, WF-21

### WF-19 · Invoiced and the payment chase

**Board:** Residential
**Trigger:** Stage changed to Invoiced

Completion note and invoice go separately so the paperwork never dilutes the thank-you. Reminders stop dead on payment.

- **DO** Require invoice_number on entry. Stamp invoice_sent_at.
- **SEND** `JOB-05` (Email: All done at {{opportunity.site_address}}), photos from the card attached
- **SEND** `PAY-01` (Email: Invoice {{opportunity.invoice_number}}), invoice attached
- **TASK** `INVOICE {{contact.first_name}}: final` to OFFICE, due 1 day  
  *Raise the final invoice, put the number on the card, and move it to Invoiced. The completion email with the photos and the invoice email go out separately by themselves.*
- **WAIT** until day 7
- **SEND** `PAY-02` (SMS)
- **WAIT** until day 14
- **SEND** `PAY-03` (Email: Invoice {{opportunity.invoice_number}} is now overdue)
- **TASK** `CHASE {{contact.first_name}}: payment overdue` to OFFICE, due Day 14  
  *Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.*

**Stops:** Invoice marked paid, or the card moves to Paid & Closed. A reminder sent after someone has paid does more damage than the reminder was worth.

### WF-20 · Invoicing, claims and close-out

**Board:** Commercial & Industrial
**Trigger:** Stage changed to Invoicing, and each time a claim is issued

Large jobs bill in progress claims, so the stage holds until the last one is paid.

- **SEND** `C-DONE-01` (Email: Works complete: {{opportunity.site_address}}), on entry, close-out pack attached
- **DO** Each claim: set invoice_number on the card, tag claim-issued. That tag fires the next two steps.
- **SEND** `C-PAY-01` (Email: Progress claim {{opportunity.invoice_number}})
- **TASK** `CLAIM {{opportunity.site_address}}: issue per programme` to OFFICE, due Per milestone  
  *Issue the progress claim for the completed stage, put its invoice number on the card, and attach the photos and any sign-offs.*
- **WAIT** 30 days from each claim
- **IF** that claim is unpaid
  - **TASK** `CHASE {{contact.first_name}}: claim overdue` to OFFICE, due Day 30  
    *Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.*

**Stops:** The card moves to Paid & Closed when the final claim is paid. Payment terms still to confirm with Glenn.

### WF-21 · Paid & Closed

**Board:** Both boards
**Trigger:** Stage changed to Paid & Closed

The most valuable stage on the board: review, referral, and a check-in a year out.

- **IF** residential
  - **WAIT** 1 day
  - **SEND** `REV-01` (SMS)
  - **TASK** `REVIEW {{contact.first_name}}: did they leave one?` to OFFICE, due Day 7  
    *Check whether the Google review arrived. If it did, nothing to do. If it did not, leave it. The ask goes once, by text, and chasing reviews costs more goodwill than it earns.*
  - **WAIT** until day 7
  - **IF** consent_marketing is yes
    - **SEND** `REV-02` (Email: Know anyone else with the same problem?)
  - **WAIT** until 12 months
  - **IF** consent_marketing is yes
    - **SEND** `REV-03` (Email: A year on, how is it going?)
  - *otherwise*
    - **WAIT** 1 day
    - **SEND** `C-CLOSE-01` (Email: Thanks, {{contact.first_name}})
    - **TASK** `REFERENCE {{contact.first_name}}: ask, and record the answer` to OWNER, due Day 7  
      *Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager’s word is worth more on a tender than any number of homeowner reviews.*

**Stops:** Runs to the end. The 12 month step is scheduled on entry so it survives everything else changing.

---

## 08 Always on

Watching every conversation, whatever stage the card is at.

4 workflows: WF-24, WF-25, WF-26, WF-29

### WF-24 · Customer replied

**Board:** Both boards
**Trigger:** Inbound SMS or email from a contact with an open opportunity

A reply is a live conversation. Nothing automatic should talk over it.

- **DO** Pause every outbound sequence on the contact: WF-03, WF-04 reminders, WF-09, WF-10, WF-13, WF-19.
- **ALERT** 3, Inbound reply, to Assigned user by In-app and SMS
- **TASK** `REPLY {{contact.first_name}}: they messaged` to Assigned user, due 1 hour  
  *A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds.*
- **DO** The sequences resume only when a human sends a reply from the platform and chooses to resume, never automatically.

**Stops:** Fires on every inbound message.

### WF-25 · STOP and unsubscribe

**Board:** Both boards
**Trigger:** Inbound SMS reads STOP, or an email unsubscribe link is used

The platform handles most of this natively. This confirms what it does and adds the bit it does not.

- **DO** Native: STOP sets do-not-SMS on the contact. Unsubscribe sets do-not-email for marketing.
- **DO** Add: remove the contact from WF-13, and leave the card where it is so a later enquiry is still recognised.
- **DO** Transactional messages about a live job still send. That is lawful and expected; make sure the do-not-SMS flag is not wired to block them.

**Stops:** Immediate.

### WF-26 · Stalled card monitor

**Board:** Both boards
**Trigger:** Scheduled, daily at 6:45am

Escalation toward visibility, not more alarms. A card stuck for forty days is a conversation to have on Monday, not an emergency.

- **DO** For every open card, compare time in stage with that stage's stall threshold from the pipeline design.
- **IF** over the threshold
  - **DO** The stage task reappears at the top of the assigned user's list.
- **IF** over 2x the threshold
  - **DO** Line item in the daily digest.
- **IF** over 3x the threshold
  - **DO** Named in the weekly review, with the card.

**Stops:** Runs daily.

### WF-29 · Negative review or complaint

**Board:** Both boards
**Trigger:** Review received under 4 stars, or is-complaint added to a contact

Reputation decays fast. A same-day call fixes most of them.

- **ALERT** 10, Negative review or complaint, to OWNER by SMS
- **TASK** `CALL {{contact.first_name}}: review or complaint, today` to OWNER, due Same day  
  *Ring them today. Most unhappy customers are fixed by one call and almost none by silence, and a public reply written before you have spoken to them tends to make it worse. Any marketing to that contact is paused until the call has happened.*
- **DO** Pause any marketing sequence on the contact until the call has happened.

**Stops:** Sends once per review or tag.

---

## 09 Reporting

Nothing a customer ever sees. Scheduled, not triggered.

2 workflows: WF-27, WF-28

### WF-27 · Daily digest

**Board:** Both boards
**Trigger:** Scheduled, 7:00am Monday to Saturday

Where everything that is not an emergency goes. NEEDS YOU last, because it is the section people act on.

- **DO** Email to OWNER and OFFICE: yesterday (enquiries, calls, quotes, won), today (assessments, jobs starting, calls booked), needs you (leads unattended, quotes and proposals overdue, follow-ups due, invoices overdue).

**Stops:** Runs daily.

### WF-28 · Weekly and monthly reports

**Board:** Both boards
**Trigger:** Scheduled, Monday 7:00am and the 1st of the month

The forecast and the committed work are shown as two lines, never one, because the boards merge sales and delivery.

- **DO** Weekly to OWNER: enquiries by source, median time to first contact, enquiry to qualified, quotes sent, won, lost by reason, open value, won not yet delivered, cards stalled 3x, jobs completed, days won to paid, invoices outstanding.
- **DO** Monthly to OWNER: cost per enquiry and per won job by utm_source, gclid and fbclid, against paid revenue.
- **DO** Weekly reconciliation: count of website submissions against opportunities created. A mismatch fires alert 11.

**Stops:** Runs on schedule.
