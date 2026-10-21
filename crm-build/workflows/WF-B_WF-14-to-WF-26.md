# Hand-build sheets, WF-14 to WF-26

SprayIT Solutions (SPRY) sub-account, Systemations. Built by hand in the platform screens.
Source of truth: client-journey-onepage/journey-data.js (workflows array). Template names and senders: crm-build/messages/message-index.md.

## Conventions for every sheet

- Timezone: Australia/Brisbane (as set on the account).
- Send window: 8am to 8pm, Monday to Saturday (CRM-MESSAGING.md and CRM-WORKFLOWS.md). A message marked "waits" sits behind a "Wait until a time window" step set to that window. A message marked "immediate" has no window step. The window conflict with the tasks document is under Open items of WF-14.
- Sender: "contact" = {{custom_values.from_name_contact}}, "brand" = {{custom_values.from_name_brand}}. Reply-to is {{custom_values.business_email}}. SMS goes from the account business number.
- Alerts: OWNER gets SMS and email. OFFICE gets email and in-app, never SMS. One event never sends the owner two texts.
- Error branch: every workflow ends with an error branch that fires alert 11 (Automation failure) to OWNER, with the workflow name and the contact. This is a house convention, not a numbered step below.
- Re-entry and stop on response: the sources do not set these per workflow except through the "Stops when" text. The values below are taken from that text. Where it is silent the sheet says "Not stated in sources" and gives the safe default.
- Role names in tasks: OWNER (Glenn), OFFICE, ESTIMATOR, CREW_LEAD, "Assigned user" (whoever the card is assigned to).
- Board: "both" means build the workflow once with a board filter that allows both Residential and Commercial & Industrial, using the If/Else "residential" check where shown.

---

## WF-14 · Quote accepted   (folder "05. Accepted, lost and nurture")
- Trigger: Opportunity stage changed to Quote Accepted (by WF-12 or by hand), and also a second trigger: field po_number entered on a commercial card waiting in Quote Accepted.
- Settings: re-entry NOT allowed ("a job is welcomed once"). Stop on response: no. Send window: X-ACC-01, X-ACC-02 and C-PO-01 are marked immediate for the customer in CRM-MESSAGING.md (C-PO-01 also says waits, see Open items). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: the card has come back to Quote Accepted from a later stage.
     - Then: end the workflow here.
  2. Remove from Workflow: WF-06, WF-07 reminders, WF-09, WF-10, WF-11, WF-13, WF-16 (stop every sales sequence on the card, before anything else).
  3. If/Else: residential.
     - Then:
       1. Update Field: status = Won.
       2. Send Email: X-ACC-01 · Enters Quote Accepted, from contact. Immediate.
       3. Send SMS: X-ACC-02 · Enters Quote Accepted. Immediate.
     - Else (commercial):
       1. Send Email: C-PO-01 · Enters Quote Accepted on the Commercial board (Immediately), from contact.
       2. If/Else: accepted online, signed, or po_number is set.
          - Then: Update Field: status = Won.
          - Else: Create Task, text "CHASE {{contact.first_name}}: purchase order", description "A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.", due weekly until it lands, owner OFFICE.
  4. Internal Notification: alert 8 (Quote accepted) to OWNER by SMS and email, and to OFFICE by email and in-app.
  5. Update Field: deposit_amount and foam_order_type, from the accepted quote, where a deposit applies. Nothing is invoiced yet.
  6. Create Task, text "NEXT {{contact.first_name}}: inspection or booking", description "The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked.", due same day, owner OWNER.
- Tags and fields it sets: add been-accepted, is-active-job; remove is-nurturing, is-stalled, is-unresponsive. Fields: status (opportunity status), deposit_amount, foam_order_type. (status is the opportunity status, not a custom field.)
- Stops when: sends once per job. Add-on quotes never reach it, because WF-12 stops them first.
- Test:
  1. Residential card with a two-step follow-up running (WF-10): move to Quote Accepted. Expect WF-10 and WF-06 stopped, status Won, X-ACC-01 and X-ACC-02 received, alert 8 to OWNER (one text, one email) and OFFICE (email, in-app), NEXT task for OWNER due same day.
  2. Commercial card, no po_number, not signed: expect C-PO-01 only, status stays Open, weekly purchase order task for OFFICE, alert 8.
  3. Enter po_number on that commercial card: expect status Won, and no second C-PO-01 or second alert (re-entry blocked).
  4. Move a card back from a later stage into Quote Accepted: expect nothing sent.
  5. Check tags: been-accepted and is-active-job on, is-nurturing off.
- Open items:
  - CONFLICT: WF-14 stops "WF-07 reminders" but WF-34 says WF-07 reminders (about an agreed date) keep running. Data file version used: WF-14 removes them. WF-07 is the phone-call reminder, and the call is moot once accepted. Zen to confirm.
  - CONFLICT: C-PO-01 is titled "Immediately" in the index but CRM-MESSAGING.md line 1513 says it waits for the send window. Built as immediate to match the title; confirm.
  - CONFLICT: send window. CRM-MESSAGING.md says 8am to 8pm Mon-Sat; the tasks document is reported in CRM-BUILD-PLAN.md as Mon-Fri 7am-6pm, Sat 8am-2pm. Used 8am to 8pm Mon-Sat. Undecided (CRM-BUILD-PLAN.md question 1).
  - Trading hours and Saturday work are placeholders (CRM-PIPELINES.md).

## WF-15 · Lost   (folder "05. Accepted, lost and nurture")
- Trigger: Opportunity status changed to Lost.
- Settings: re-entry allowed (a card can be lost again after reopening; not stated in sources). Stop on response: no. Send window: LOST-01 waits for the send window and for the next business morning. Timezone Australia/Brisbane. Board: both.
- Steps:
  1. Update Field: require lost_reason on the status change (the status change form does not close without one).
  2. Remove from Workflow: WF-06, WF-07, WF-09, WF-10, WF-11, WF-16, WF-21, WF-24, WF-25.
  3. Create Task, text "LOG {{contact.first_name}}: lost reason", description "Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.", due same day, owner OFFICE.
  4. If/Else: residential, and the reason is not Unreachable, Duplicate or Spam.
     - Then:
       1. Wait: until the next business morning.
       2. Send Email: LOST-01 · Declined online, or marked Lost with any reason except... (Next business morning), from contact. Waits for window.
- Tags and fields it sets: add been-lost; remove is-active-job, is-deposit-owing. Field: lost_reason (required, set by the person).
- Stops when: sends once. A "not now" is Nurture, not Lost.
- Test:
  1. Mark a residential test card Lost with no reason: expect the form refuses to close.
  2. Mark it Lost, reason Price: expect LOG task for OFFICE, sequences removed, been-lost on, and LOST-01 the next business morning inside the window.
  3. Mark another Lost, reason Unreachable: expect no LOST-01.
  4. Mark a commercial card Lost: expect the task but no LOST-01.
  5. Check is-active-job and is-deposit-owing are removed.
- Open items:
  - LOST-01 also follows an online decline (WF-12 sets status Lost, then this runs). Same path, no separate step.
  - WF-15 stop list names WF-21, WF-24, WF-25, which are in the later range (07, 08 folders); build them first or add the stop list after they exist.
  - Re-entry value is not stated in sources.

## WF-16 · Nurture drip and the year check-in   (folder "05. Accepted, lost and nurture")
- Trigger: Opportunity stage changed to Nurture.
- Settings: re-entry allowed (a card can return to Nurture; sources say the 12 month step is scheduled on entry). Stop on response: yes. Send window: all five emails wait for the send window (marketing, only with consent_marketing = yes). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. Remove from Workflow: WF-06, WF-10, WF-11.
  2. If/Else: residential.
     - Then: Create Task, text "CHECK-IN {{contact.first_name}}: a year since the quote", description "A year since this job went to Nurture. Ring and ask whether it is back on. Quotes often come back after one or two years. If it is, move the card to Quoting so the quote is refreshed against current prices.", due 12 months, owner OFFICE.
     - Else: Create Task, text "CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}", description "Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.", due quarterly, recurring, owner OWNER.
  3. If/Else: consent_marketing is not yes.
     - Then: end the workflow here for email (no marketing without the tick; the call task above still stands).
  4. If/Else: residential.
     - Then:
       1. Wait: until the next business morning.
       2. Send Email: NUR-01 · Enters Nurture (Next business morning), from contact. Waits for window.
       3. Wait: 30 days.
       4. Send Email: NUR-02 · In Nurture (+30 days), from contact. Waits for window.
       5. Wait: 60 days.
       6. Send Email: NUR-03 · In Nurture (+90 days), from contact. Waits for window.
       7. Create Task, text "REVIEW {{contact.first_name}}: still a fit?", description "Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Quoting. A clean list keeps the emails landing in inboxes rather than in spam.", due quarterly, recurring, owner OWNER.
       8. Wait: until 12 months after entering Nurture.
       9. Send Email: NUR-04 · In Nurture (12 months after entering Nurtu), from contact. Waits for window.
     - Else (commercial):
       1. Wait: 90 days, repeating.
       2. Send Email: C-FUT-01 · In Nurture on the Commercial board (Every 90 days), from contact. Waits for window.
- Tags and fields it sets: add been-contacted, is-nurturing. No fields. Reads consent_marketing.
- Stops when: any reply, booking or new form fill, or the card moves to Quoting. Unsubscribe sets do-not-market and the card stays put. C-FUT-01 also stops when the card moves back to Quote Sent.
- Test:
  1. Residential contact with consent_marketing = yes: move to Nurture. Expect tags added, CHECK-IN task (OFFICE, due 12 months), NUR-01 next business morning inside the window.
  2. Same flow with consent_marketing = no: expect the task only and no emails.
  3. Reply to NUR-01 from the test contact: expect the sequence stops (WF-34 also fires).
  4. Commercial card: expect the OWNER quarterly check-in task and C-FUT-01 after the first 90 days (shorten the wait to test, then restore).
  5. Click unsubscribe: expect do-not-market set, card unchanged.
- Open items:
  - The residential REVIEW task and the C-FUT-01 loop depend on consent in different places: the task is created after the consent check, so a non-consenting contact gets the CHECK-IN task but never the REVIEW task. Copied as in the data file.
  - NUR-03 is "+90 days" in the index; the data file reaches it after 30 plus 60 days. Consistent.
  - "Quarterly, recurring" tasks need a repeating task or a looping workflow; the sources do not say which. Decide at build.

## WF-17 · Site inspection booked   (folder "06. Site inspection")
- Trigger: Appointment booked in the inspection calendar.
- Settings: re-entry allowed (each booking runs it; a moved or cancelled booking hands over to WF-18). Stop on response: no. Send window: X-INSP-01 and C-INSP-01 are immediate; X-INSP-02 is 7:00am on the day, immediate (no window step, it is before 8am). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. Update Field: inspection_date = from the appointment.
  2. If/Else: the card is in Quote Accepted.
     - Then: Update Opportunity: move stage to Inspection Required.
     - Else: leave the card where it is (a visit booked before the quote is rare; the card only moves to Inspection Required from Quote Accepted).
  3. If/Else: residential.
     - Then: Send SMS: X-INSP-01 · Site inspection booked in the inspection calendar. Immediate.
     - Else: Send Email: C-INSP-01 · Site inspection booked on the Commercial board, from brand. Immediate.
  4. Create Task, text "ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}", description "Attend the inspection. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Then move the card to Booking Required, or close it as Lost if the job cannot be done.", due on the date, owner ESTIMATOR.
  5. Wait: until 7:00am on the day.
  6. Send SMS: X-INSP-02 · Site inspection day. Immediate.
  7. Wait: until the day after the visit.
  8. If/Else: the visit was not cancelled.
     - Then: Add Tag: been-inspected.
- Tags and fields it sets: add been-inspected (day after the visit, unless cancelled). Field: inspection_date.
- Stops when: the appointment is moved or cancelled, which hands over to WF-18.
- Test:
  1. Card in Quote Accepted: book an inspection. Expect stage Inspection Required, inspection_date set, X-INSP-01 (or C-INSP-01 on a commercial card), ATTEND task for ESTIMATOR on the date.
  2. Card in Quoting: book an inspection. Expect the card does not move.
  3. Book for tomorrow: expect X-INSP-02 at 7:00am on the day.
  4. Leave it uncancelled past the visit date: expect been-inspected the next day.
  5. Cancel before the visit: expect no been-inspected tag, and WF-18 fires.
- Open items:
  - X-INSP-02 is "immediate" with no window; it sends at 7:00am, which is before the 8am window. Intended, matches CRM-MESSAGING.md.
  - The estimator role must exist as a user.

## WF-18 · Site inspection moved or cancelled   (folder "06. Site inspection")
- Trigger: Appointment in the inspection calendar rescheduled or cancelled.
- Settings: re-entry allowed (one run per change). Stop on response: no. Send window: X-APPT-06 is immediate. Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: rescheduled.
     - Then:
       1. Send Email: X-APPT-06 · Phone call or site inspection moved, from brand. Immediate.
       2. Add to Workflow: WF-17 re-queues the morning text (X-INSP-02) against the new date.
  2. If/Else: cancelled.
     - Then:
       1. Internal Notification: alert 5 (Phone call or inspection cancelled) to OWNER by SMS and email.
       2. Update Field: inspection_date = cleared (so the board never shows a visit that is not happening).
       3. Create Task, text "REBOOK {{contact.first_name}}: inspection cancelled", description "The customer cancelled the site inspection. Ring them and book a new time in the inspection calendar. Nothing is rebooked automatically, because a free slot is not always one the crew can make.", due 1 business day, owner OWNER.
- Tags and fields it sets: no tags. Field: inspection_date (cleared on cancel).
- Stops when: sends once per change. The card stays in Inspection Required.
- Test:
  1. Reschedule a booked test inspection: expect X-APPT-06 with the new time and the morning text moved to the new date.
  2. Cancel it: expect alert 5 to OWNER (one text, one email), inspection_date empty, REBOOK task for OWNER due in 1 business day.
  3. Confirm the card is still in Inspection Required.
  4. Confirm no automatic rebooking appears.
- Open items:
  - Alert 5 reaches OWNER only for an inspection (the "Assigned user" route applies to phone calls in WF-08).
  - X-APPT-06 is reused from the phone call flow (index name "Phone call or site inspection moved").

## WF-19 · Booking Required   (folder "07. Booking and reminders")
- Trigger: Opportunity stage changed to Booking Required.
- Settings: re-entry allowed (not stated in sources). Stop on response: no. Send window: no messages. Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: residential.
     - Then: Create Task, text "BOOK {{contact.first_name}}: install date", description "Book the install in the calendar for the vehicle doing the job: the InjectaCore rig, the van, the Fuso truck or the Mercedes rig. A job over several days or using two rigs gets a booking for each block. Book it here first, not in the Apple calendar, because the booking is what sends the confirmation and sets up the reminders and the deposit.", due 2 business days, owner OWNER.
     - Else: Create Task, text "BOOK {{contact.first_name}}: works dates", description "Agree the start and finish dates with the client, then book each block in the calendar for the vehicle doing it, with the crew. Book it in the platform first, because the booking sends the mobilisation email and sets up the reminders. It then shows in the Apple calendar too.", due 2 business days, owner OWNER.
  2. Wait: 2 business days.
  3. If/Else: still in Booking Required.
     - Then: nothing is created; the card is listed under "Installs to book" in the daily summary until it moves (a saved filter in the daily summary, not a step to build here).
- Tags and fields it sets: none.
- Stops when: the install is booked, which moves the card to Job Booked.
- Test:
  1. Move a residential card to Booking Required: expect the residential BOOK task for OWNER, due in 2 business days.
  2. Move a commercial card: expect the works-dates wording.
  3. Leave it 2 business days: expect it listed under Installs to book.
  4. Book the install in an install calendar: expect the card moves (WF-20) and this workflow ends.
- Open items:
  - Alert 14 (Assigned to you) is not part of this workflow; the task creation for OWNER is what WF-38 reacts to.
  - Daily summary lines are built in the daily summary workflow (not in this batch).

## WF-20 · Install booked   (folder "07. Booking and reminders")
- Trigger: Appointment booked in any of the four install calendars (InjectaCore rig, van, Fuso truck, Mercedes rig).
- Settings: re-entry allowed (each booking triggers; the first booking does the full run, later bookings only update dates). Stop on response: no. Send window: JOB-01, JOB-02 and C-MOB-01 are marked immediate in the title but CRM-MESSAGING.md says they wait (see Open items). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: the job already has an install booking (another vehicle, or more days).
     - Then:
       1. Update Field: job_date and job_end_date = first and last day across every booking for the job; add the vehicle to vehicles_booked.
       2. End the workflow here. Nothing is resent; the reminders follow the first day.
  2. Update Field: job_date, job_end_date, vehicles_booked, crew_assigned = from the booking.
  3. Update Field: job_booked_at = now.
  4. Update Opportunity: move stage to Job Booked.
  5. If/Else: residential.
     - Then:
       1. Send SMS: JOB-01 · Install booked in the calendar, enters Job Booked (Immediately).
       2. Send Email: JOB-02 · Install booked in the calendar, enters Job Booked (Immediately), from brand.
     - Else:
       1. Send Email: C-MOB-01 · Works booked in the calendar, enters Job Booked on the... (Immediately), from brand.
       2. Create Task, text "INDUCT crew: {{opportunity.site_address}}", description "Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.", due before start, owner CREW_LEAD.
       3. Create Task, text "SWMS {{opportunity.site_address}}: issue and confirm receipt", description "Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either.", due before start, owner OWNER.
  6. Add to Workflow: WF-21 (the reminders) and WF-24 (the deposit draft).
- Tags and fields it sets: add been-booked. Fields: job_date, job_end_date, vehicles_booked, crew_assigned, job_booked_at.
- Stops when: sends once per job. Moving a booking, in the platform or in the Apple calendar, changes job_date: that resends JOB-01 with the new date and re-queues WF-21 and WF-24. The preparation email (JOB-02) is not resent.
- Test:
  1. Book one day on one rig for a residential test card: expect stage Job Booked, been-booked, job_date, job_booked_at, JOB-01 and JOB-02 received, WF-21 and WF-24 started.
  2. Book a second block on another rig, same job: expect job_end_date and vehicles_booked updated, nothing resent.
  3. Move the booking to a new day: expect JOB-01 resent with the new date, WF-21 and WF-24 re-queued, JOB-02 not resent.
  4. Commercial card: expect C-MOB-01 and the INDUCT and SWMS tasks, no JOB-01.
  5. Book while outside 8am to 8pm and note whether messages wait (see conflict).
- Open items:
  - CONFLICT: JOB-01, JOB-02 and C-MOB-01 are titled "(Immediately)" but CRM-MESSAGING.md says "waits for the send window" (JOB-01 line 868, JOB-02 line 904, C-MOB-01 line 1551). Built as immediate; confirm.
  - "Resend JOB-01 with the new date" on a moved booking: the trigger for that is job_date changed (second trigger or a separate small workflow). Sources describe it here but the trigger above is booking only; add a second trigger "job_date changed" that goes to the resend path.
  - The Apple calendar two-way sync is a separate calendars task.

## WF-21 · Job reminders: a month, 7 days and 48 hours   (folder "07. Booking and reminders")
- Trigger: job_date set or changed, from WF-20.
- Settings: re-entry allowed (restarts against the new date). Stop on response: NO (reminders about an agreed date keep running; WF-34 does not pause it). Send window: all reminders wait for the send window (REM-05 is immediate, in WF-22). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: job_booked_at is more than 6 weeks before job_date, and job_date is more than 30 days away.
     - Then:
       1. Wait: until 30 days before job_date.
       2. Send Email: REM-06 · Job booked more than 6 weeks ahead (30 days before the job), from brand. Waits for window.
  2. If/Else: job_date is more than 7 days away.
     - Then:
       1. Wait: until 7 days before job_date.
       2. Update Field: job_confirmed = cleared (so only an answer from here on counts).
       3. Send Email: REM-01 · Job upcoming (7 days before the job), from brand. Waits for window.
       4. Send SMS: REM-02 · Job upcoming (7 days before the job). Waits for window.
  3. If/Else: job_date is more than 48 hours away.
     - Then:
       1. Wait: until 48 hours before job_date.
       2. Send Email: REM-03 · Job upcoming (48 hours before the job), from brand. Waits for window.
       3. Send SMS: REM-04 · Job upcoming (48 hours before the job). Waits for window.
  4. Wait: until 9:00am the day before job_date.
  5. If/Else: job_confirmed is empty (neither the 7 day nor the 48 hour reminder answered).
     - Then: Create Task, text "CALL {{contact.first_name}}: date not confirmed", description "Neither the 7 day nor the 48 hour reminder got a Yes or a No. Ring to confirm the job is still on, that access is clear, and that someone over eighteen will be there to let the crew in.", due day before the job if neither reminder was answered, owner OFFICE.
- Tags and fields it sets: no tags. Field: job_confirmed (cleared at day 7; set by WF-22).
- Stops when: the booking is cancelled, or the date moves, which restarts it against the new date. Also stopped by WF-15 (Lost).
- Test:
  1. Job 3 days away: expect REM-03 and REM-04 only (the 7 day and month steps skipped), then the 9:00am task if no answer.
  2. Job 10 days away booked a week ago: expect REM-01 and REM-02 at 7 days, then REM-03 and REM-04.
  3. Job 60 days away booked 8 weeks before: expect REM-06 at 30 days.
  4. Tap Yes on a reminder: expect no 9:00am task.
  5. Move the job_date: expect the queue restarts against the new date.
- Open items:
  - CRM-MESSAGING.md says REM-01 is "skipped if the job was booked less than 7 days out"; the data file uses "more than 7 days away" at the time of the wait. Same result.
  - Alert 12 comes from WF-22, not from here.

## WF-22 · Yes or No on a reminder   (folder "07. Booking and reminders")
- Trigger: the Yes or No trigger link in REM-01, REM-02, REM-03, REM-04 or REM-06 is clicked.
- Settings: re-entry allowed per click, but a second No on the same booking does not alert twice (add a "has already alerted" tag check or a once-per-booking guard). Stop on response: no. Send window: REM-05 is immediate. Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: Yes.
     - Then: Update Field: job_confirmed = Yes. The link opens a short thank-you page. Nothing else.
  2. If/Else: No.
     - Then:
       1. Update Field: job_confirmed = No.
       2. Send SMS: REM-05 · They tap No on a reminder. Immediate.
       3. Internal Notification: alert 12 (Customer cannot make the booked date) to OWNER by SMS and email, and to OFFICE by email and in-app.
       4. Create Task, text "RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}", description "The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date.", due same day, owner OWNER.
       5. Nothing is moved automatically. Moving the booking by hand re-queues WF-21 and WF-24.
- Tags and fields it sets: no tags. Field: job_confirmed (Yes or No).
- Stops when: once per click. A second No on the same booking does not alert twice.
- Test:
  1. Click Yes on REM-01 (email): expect job_confirmed Yes, thank-you page, no alert, no task.
  2. Click No on REM-02 (SMS link): expect job_confirmed No, REM-05, alert 12 (OWNER one text, one email; OFFICE email, in-app), RESCHEDULE task for OWNER.
  3. Click No again on the same booking: expect no second alert.
  4. Click Yes on REM-06 (month-out email): expect Yes recorded.
  5. Confirm the booking and crew did not move.
- Open items:
  - Alert 12 text in the tasks document says a No on "the one month, 7 day or 48 hour reminder". REM-02 and REM-04 (SMS) carry the same links, per the trigger line.
  - The once-per-booking guard is a requirement, but the sources give no mechanism; use a tag or a field check.

## WF-23 · Job day   (folder "07. Booking and reminders")
- Trigger: job_date arrives, scheduled from the install booking.
- Settings: re-entry allowed (once per site day on commercial). Stop on response: no. Send window: JOB-04 and C-SITE-01 are immediate at 6:30am (no window step; they go before 8am by design). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: residential.
     - Then:
       1. Wait: until 6:30am on job_date.
       2. Send SMS: JOB-04 · Job day. Immediate.
       3. Create Task, text "PHOTOS {{opportunity.site_address}}", description "Photograph the finished work from the app before leaving site, and tick Photos captured. The job cannot be marked complete without them. They go into the job report, and they are the only real proof-of-work images the business has.", due before marking it complete, owner CREW_LEAD.
       4. Create Task, text "VARIATIONS {{contact.first_name}}: record any extras", description "Anything agreed on site that was not in the quote, such as an extra 100 sqm, goes out from the variation document for the customer to sign, and onto the card the same day. Left to invoicing, it surprises the customer.", due before marking it complete, owner CREW_LEAD.
     - Else (commercial):
       1. Wait: until 6:30am each site day between job_date and job_end_date.
       2. Send SMS: C-SITE-01 · Each site day while the works run. Immediate.
       3. Create Task, text "UPDATE {{contact.first_name}}: weekly progress", description "Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week's photos.", due every Friday while live, owner OWNER.
       4. Create Task, text "PHOTOS {{opportunity.site_address}}: this stage", description "Photograph each completed stage before moving on. The photos are the evidence behind each claim and they go into the close-out pack, so they are needed at the end of every stage, not at the end of the job.", due end of each stage, owner CREW_LEAD.
       5. Create Task, text "VARIATIONS {{opportunity.site_address}}: record and get signed", description "Record every variation agreed on site and send it from the variation document for signature the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.", due as they happen, owner CREW_LEAD.
  2. Guard (stage-change rule, not a step): the job cannot be marked complete until photos_captured is ticked. Enforce it on the stage change, not with a reminder.
  3. Note, nothing to build: JOB-06 is a saved snippet in the mobile app, sent by hand. Not a workflow.
- Tags and fields it sets: no tags. Reads photos_captured (checkbox, ticked by the crew), job_date, job_end_date.
- Stops when: the job is marked complete, or the booking moves.
- Test:
  1. Residential job dated today: expect JOB-04 at 6:30am, PHOTOS and VARIATIONS tasks for CREW_LEAD.
  2. Try to move to Job Completed without ticking photos_captured: expect the move is refused.
  3. Commercial, 3-day job: expect C-SITE-01 at 6:30am on each site day, and the five tasks created (UPDATE weekly repeats on Fridays).
  4. Move the booking: expect the old schedule is cancelled and the new one queues.
  5. Confirm JOB-06 is not triggered by this workflow.
- Open items:
  - C-PROG-01 (weekly Friday email) is a saved template sent by hand via the UPDATE task; no send step here.
  - The weekly UPDATE task needs a repeating task or a Friday loop; the sources do not say which.
  - The guard for photos_captured is a stage-change requirement (see CRM-WORKFLOWS.md "Required fields on entry").

## WF-24 · Deposit invoice: the draft for the owner   (folder "08. Deposit")
- Trigger: job_date set or changed, and deposit_amount is set.
- Settings: re-entry allowed (re-runs against a new date; a draft already made is updated, not duplicated). Stop on response: no. Send window: none (no customer message; the invoice is only a draft). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. If/Else: deposit_amount is empty (no deposit on this job).
     - Then: end the workflow here. Jobs with no deposit skip Deposit Requested.
  2. If/Else: foam_order_type is Special order.
     - Then: Update Field: deposit_due_date = 7 days before job_date.
     - Else: Update Field: deposit_due_date = 1 business day before job_date.
  3. If/Else: job_date is more than 14 days away.
     - Then: Wait: until 14 days before job_date.
  4. Create invoice draft (invoices, not a workflow action name on the list; use the platform's invoice action): deposit invoice as a DRAFT from the accepted quote: the deposit amount, due on deposit_due_date, with the accepted quote and any purchase order attached. Not sent. No card storage and no automatic charge.
  5. Create Task, text "INVOICE {{contact.first_name}}: check and send the deposit invoice", description "A draft deposit invoice is ready, made from the accepted quote with the quote and any purchase order attached. Check the amount, the due date and the payment terms, then send it. Sending it emails the customer and moves the card to Deposit Requested. Nothing is sent until you do.", due 2 business days, owner OWNER.
  6. Wait: 2 business days.
  7. If/Else: the draft has not been sent.
     - Then: nothing to build here; the card is listed under "Invoices to send" in the daily summary until it goes.
- Tags and fields it sets: no tags. Field: deposit_due_date. Reads deposit_amount, foam_order_type, job_date.
- Stops when: the owner sends the invoice (WF-25 takes over), the job is cancelled, or job_date moves before it is sent, which re-runs it against the new date.
- Test:
  1. Job with no deposit_amount: expect nothing created.
  2. Stock open cell job 30 days out: expect deposit_due_date 1 business day before job_date, nothing for 16 days, then a draft invoice and the INVOICE task.
  3. Special order job: expect deposit_due_date 7 days before job_date.
  4. Job 5 days out: expect the draft and task immediately (no 14 day wait).
  5. Change job_date: expect the same draft updated, no duplicate, and no invoice reaches the customer.
- Open items:
  - "Create the deposit invoice as a DRAFT" is not in your action list; it is an invoice action in the platform. Confirm the draft option exists on the sub-account.
  - Agency note in data: once Glenn settles how he wants deposit invoices set out, this draft and task can become an automatic send. Not for now.
  - Draft invoices syncing to Xero: GST invoice sync not yet tested (go-live item).

## WF-25 · Deposit invoice sent, and the due-date check   (folder "08. Deposit")
- Trigger: the owner sends the deposit invoice.
- Settings: re-entry NOT allowed (once per job). Stop on response: no. Send window: DEP-02 waits for the send window per CRM-MESSAGING.md (it is the invoice email itself, sent when the owner presses send); DEP-03 waits for the send window. Timezone Australia/Brisbane. Board: both.
- Steps:
  1. Send Email: DEP-02 · The owner sends the deposit invoice, enters Deposit... (When it is sent, from a draft ), from brand. Sent as the invoice email itself, when the owner presses send.
  2. Update Field: deposit_invoice_sent_at = now.
  3. Update Opportunity: move stage to Deposit Requested.
  4. Wait: until 4:00pm on deposit_due_date.
  5. If/Else: the deposit is unpaid.
     - Then:
       1. Send SMS: DEP-03 · Deposit unpaid at its due date (4:00pm on the due date). Waits for window (so it may be held if 4pm falls on a Sunday).
       2. Internal Notification: alert 13 (Deposit unpaid at its due date) to OWNER by SMS and email, and to OFFICE by email and in-app.
       3. Create Task, text "CHASE {{contact.first_name}}: deposit unpaid", description "The deposit was due today and has not landed. The customer has had a text asking for the remittance. Check for a reply; if it will not arrive in time, move the crew to other work and tell the customer.", due on the due date if unpaid, owner OWNER.
- Tags and fields it sets: add is-deposit-owing. Field: deposit_invoice_sent_at.
- Stops when: the deposit is paid (WF-26), or the job is cancelled.
- Test:
  1. Send the draft deposit invoice from WF-24: expect DEP-02 once, deposit_invoice_sent_at set, stage Deposit Requested, is-deposit-owing on.
  2. Leave it unpaid to 4:00pm on the due date: expect DEP-03, alert 13 and the CHASE task together, one owner text only.
  3. Pay it before 4pm: expect none of those, and WF-26 fires instead.
  4. Confirm nothing was sent between sending and the due date (no reminder).
  5. Cancel the job: expect the 4pm check cancelled.
- Open items:
  - DEP-02 titled "when it is sent", with the window "waits": the invoice email itself is sent by the owner's action, so the window cannot hold it. Treated as immediate on send.
  - OPEN DECISION in the data: decide which system sends invoice reminders, the platform or Xero, and switch the other off so a customer never gets both.
  - DEP-03 titled "(4:00pm on the due date)" is inside the window on Mon-Sat; Sunday behaviour not stated.

## WF-26 · Deposit received   (folder "08. Deposit")
- Trigger: deposit invoice marked paid.
- Settings: re-entry NOT allowed (sends once). Stop on response: no. Send window: DEP-01 is titled "(Immediately)" but CRM-MESSAGING.md line 1091 says it waits for the send window (see Open items). Timezone Australia/Brisbane. Board: both.
- Steps:
  1. Update Field: deposit_received_at = now.
  2. Send SMS: DEP-01 · Deposit invoice marked paid (Immediately). Immediate.
  3. Internal Notification: alert 9 (Deposit received) to OWNER by SMS and email, and to OFFICE by email and in-app.
  4. Remove from Workflow: cancel the pending 4pm check in WF-25. The card stays in Deposit Requested until the job is marked complete.
- Tags and fields it sets: remove is-deposit-owing. Field: deposit_received_at.
- Stops when: sends once.
- Test:
  1. Mark a test deposit invoice paid: expect deposit_received_at, DEP-01, alert 9 (OWNER one text, one email; OFFICE email, in-app).
  2. Confirm is-deposit-owing is removed.
  3. Confirm the WF-25 4pm check does not fire later.
  4. Confirm the card is still in Deposit Requested.
  5. Mark paid again: expect nothing (once only).
- Open items:
  - CONFLICT: DEP-01 is titled "Immediately" but CRM-MESSAGING.md says it waits for the send window. Built as immediate; confirm.
  - DEP-01 applies only to jobs with a deposit, which is guaranteed by the trigger.
  - Deposit paid sync from Xero (payment receipt sync) is a go-live item agreed with the bookkeeper.

---

## Conflicts found (this batch)
1. WF-14 stops "WF-07 reminders" but WF-34 says WF-07 keeps running. Used WF-14 as in the data file.
2. Send window: 8am-8pm Mon-Sat (CRM-MESSAGING.md, CRM-WORKFLOWS.md) versus Mon-Fri 7am-6pm, Sat 8am-2pm (tasks document, per CRM-BUILD-PLAN.md). Used 8am-8pm Mon-Sat.
3. "Immediately" titles versus "waits for the send window": C-PO-01, JOB-01, JOB-02, C-MOB-01, DEP-01. Built as immediate.
4. WF-20 describes resending JOB-01 on a date move but its trigger is booking only; needs a second trigger.
5. Xero versus the platform sending invoice reminders is undecided (WF-25).
