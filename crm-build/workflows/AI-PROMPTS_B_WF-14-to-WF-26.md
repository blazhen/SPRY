# Ask AI prompts, batch B: WF-14 to WF-26

How to use: in the Dev sub-account (SprayIT Solutions - Dev), open Automation, Workflows, and use the AI workflow builder (Ask AI). Paste ONE prompt at a time, exactly as it is, from the fenced block only. Keep each result in draft. Do not publish. Compare the result with that prompt's "Check after it builds" list and fix by hand what differs.

Before you start:
- The folders from AI-PROMPT-00_FOLDERS.md must already exist (05. Accepted, lost and nurture; 06. Site inspection; 07. Booking and reminders; 08. Deposit).
- The email templates named in the prompts must exist in Dev (names as in message-index.md). The SMS templates do not exist yet, so the SMS text is written inline in each prompt.
- Build in this order where possible. WF-15 and WF-16 mention workflows from later folders (WF-21, WF-24, WF-25): if the builder cannot find one, leave that name out and add it by hand once it exists.
- Field names are the Dev labels (the key written as words). Roles: OWNER is Glenn, OFFICE is the office user, ESTIMATOR and CREW_LEAD are the users holding those roles. If a role has no user yet, the builder may ask or leave the assignee blank: assign by hand.
- Conventions used in every prompt: timezone Australia/Brisbane; send window 8am to 8pm Monday to Saturday (decision 1); "immediate" means no window step; the platform sends the messages (nothing to Xero).
- Decisions applied (CRM-BUILD-00-DECISIONS.md): 1 send window, 3 WF-22 handles Yes/No links, 4 WF-07 keeps running, 6 five "Immediately" messages send at once, 9 the platform sends DEP-03, 10 the platform's own Lost Reason list, 14 WF-20 second trigger, 15 WF-22 once-per-booking guard, 16 repeating tasks are a Wait then loop back, 17 draft invoice action.

---

## WF-14

```
Build a workflow called "WF-14 · Quote accepted" in the folder "05. Accepted, lost and nurture". Keep it in draft.

Trigger: Pipeline Stage Changed, to the stage "Quote Accepted", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Add a second trigger: the opportunity custom field "Po Number" is updated (has a value) on an opportunity on the pipeline "Commercial & Industrial" that is in the stage "Quote Accepted". Re-entry: do NOT allow a contact to enter again (a job is welcomed once). Timezone Australia/Brisbane.

Steps, in this order:
1. If/Else: the opportunity has come back to "Quote Accepted" from a later stage. If yes, end the workflow here.
2. Remove the contact from these workflows, before anything else: "WF-06", "WF-10", "WF-11", "WF-13", "WF-16" (stop every sales sequence on the card). Do NOT remove them from "WF-07".
3. Add tags "been-accepted" and "is-active-job". Remove tags "is-nurturing", "is-stalled" and "is-unresponsive".
4. If/Else: the opportunity is on the pipeline "Residential".
   If yes:
   a. Update the opportunity status to Won.
   b. Send email using the template "X-ACC-01 · Quote accepted email". Subject, preview and from name are already set on the template. Send immediately, no time window.
   c. Send an SMS to the contact immediately, no time window, with this exact text: "Thanks {{contact.first_name}}, quote accepted. We will be in touch shortly to book your install date. {{custom_values.sms_signoff}}"
   Else (Commercial & Industrial):
   a. Send email using the template "C-PO-01 · Commercial awaiting PO". Subject, preview and from name are already set on the template. Send immediately, no time window.
   b. If/Else: the quote was accepted online, or signed, or the field "Po Number" is set.
      If yes: update the opportunity status to Won.
      Else: create a task. Title: "CHASE {{contact.first_name}}: purchase order". Description: "A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work." Assign to the user with the role OFFICE. Due in 7 days, and repeat weekly until the purchase order lands (Wait 7 days, then loop back to this task step while "Po Number" is empty).
5. Send an internal notification, alert 8 (Quote accepted): to OWNER (Glenn) by SMS and email, and to OFFICE by email and in-app notification. Message: "Quote accepted: {{contact.first_name}} {{contact.last_name}}."
6. Update the opportunity custom fields "Deposit Amount" and "Foam Order Type" from the accepted quote, where a deposit applies. Do not create an invoice.
7. Create a task. Title: "NEXT {{contact.first_name}}: inspection or booking". Description: "The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked." Assign to OWNER (Glenn). Due the same day.

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Two triggers: stage change to Quote Accepted (both pipelines) and Po Number entered (Commercial & Industrial, in Quote Accepted); re-entry off.
2. The remove-from-workflow list is exactly WF-06, WF-10, WF-11, WF-13, WF-16, and WF-07 and WF-09 are not in it.
3. Residential branch has status Won, X-ACC-01 email and the inline X-ACC-02 text, all with no wait.
4. Commercial branch has C-PO-01, the Won-or-chase check, and the weekly CHASE task for OFFICE.
5. Alert 8 recipients and channels are right; the NEXT task is OWNER, due same day.
6. Draft, no extra steps.

Open items: Decision 4 settles WF-07: it keeps running. Decision 4 lists the stop set as WF-06, 10, 11, 13, 16, so WF-09 is also left out (the sheet had it; Zen to confirm WF-09 should keep running). Tags are not numbered steps in the sheet; placed as step 3. C-PO-01 is immediate (decision 6). The weekly chase is a Wait then loop (decision 16); "Po Number" label is the key written as words. Status Won is the opportunity status, not a custom field. Send window is 8am to 8pm Mon-Sat (decision 1). Trading hours are placeholders.

---

## WF-15

```
Build a workflow called "WF-15 · Lost" in the folder "05. Accepted, lost and nurture". Keep it in draft.

Trigger: Opportunity Status Changed, to Lost, on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (a card can be lost again after reopening). Timezone Australia/Brisbane.

Steps, in this order:
1. Require a lost reason on the status change, using the platform's own Lost Reason list (the status change must not close without one). If the builder cannot enforce this inside a workflow, leave a note on the workflow and do not invent a step.
2. Remove the contact from these workflows: "WF-06", "WF-07", "WF-09", "WF-10", "WF-11", "WF-16", "WF-21", "WF-24", "WF-25". Skip any that do not exist yet.
3. Add the tag "been-lost". Remove the tags "is-active-job" and "is-deposit-owing".
4. Create a task. Title: "LOG {{contact.first_name}}: lost reason". Description: "Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes." Assign to the user with the role OFFICE. Due the same day.
5. If/Else: the opportunity is on the pipeline "Residential", and the lost reason is not "Unreachable", not "Duplicate" and not "Spam".
   If yes:
   a. Wait until the next business morning.
   b. Wait until the time window 8am to 8pm, Monday to Saturday.
   c. Send email using the template "LOST-01 · Thanks for considering us". Subject, preview and from name are already set on the template.

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER (Glenn) by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is status Lost on both pipelines; re-entry allowed.
2. The remove list has all nine workflows (or the existing ones).
3. Tags: been-lost added; is-active-job and is-deposit-owing removed.
4. LOG task is for OFFICE, due same day.
5. LOST-01 is behind the next-morning wait and the window, and only on Residential with a reason other than Unreachable, Duplicate or Spam.
6. Draft, no extra steps.

Open items: Decision 10 settles the lost reason: use the platform's own Lost Reason list, not a custom field (the sheet says field "lost_reason"; label would be "Lost Reason"). Step 1 may not be buildable as a workflow action: check by hand. WF-21, WF-24, WF-25 are in later folders, so build them first or add them to the stop list afterwards. Re-entry value is not stated in sources (sheet default: allowed). Tags are placed as step 3 (not numbered in the sheet). An online decline (WF-12 sets Lost) uses this same path.

---

## WF-16

```
Build a workflow called "WF-16 · Nurture drip and the year check-in" in the folder "05. Accepted, lost and nurture". Keep it in draft.

Trigger: Pipeline Stage Changed, to the stage "Nurture", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (a card can return to Nurture). Timezone Australia/Brisbane.

Steps, in this order:
1. Remove the contact from these workflows: "WF-06", "WF-10", "WF-11".
2. Add the tags "been-contacted" and "is-nurturing".
3. If/Else: the opportunity is on the pipeline "Residential".
   If yes: create a task. Title: "CHECK-IN {{contact.first_name}}: a year since the quote". Description: "A year since this job went to Nurture. Ring and ask whether it is back on. Quotes often come back after one or two years. If it is, move the card to Quoting so the quote is refreshed against current prices." Assign to the user with the role OFFICE. Due in 12 months.
   Else (Commercial & Industrial): create a task. Title: "CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}". Description: "Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved." Assign to OWNER (Glenn). Due in 90 days, and repeat quarterly (Wait 90 days, then loop back to this task step).
4. If/Else: the contact custom field "Consent Marketing" is not "yes". If yes, end the workflow here (no marketing email without consent; the task above still stands).
5. If/Else: the opportunity is on the pipeline "Residential".
   If yes:
   a. Wait until the next business morning, then until the time window 8am to 8pm Monday to Saturday.
   b. Send email using the template "NUR-01 · Nurture start R-value education". Subject, preview and from name are already set on the template.
   c. Wait 30 days. Then wait for the time window 8am to 8pm Monday to Saturday.
   d. Send email using the template "NUR-02 · Nurture +30 days heat loss". Subject, preview and from name are already set on the template.
   e. Wait 60 days. Then wait for the time window 8am to 8pm Monday to Saturday.
   f. Send email using the template "NUR-03 · Nurture +90 days still on the list". Subject, preview and from name are already set on the template.
   g. Create a task. Title: "REVIEW {{contact.first_name}}: still a fit?". Description: "Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Quoting. A clean list keeps the emails landing in inboxes rather than in spam." Assign to OWNER (Glenn). Due in 90 days, and repeat quarterly (Wait 90 days, then loop back to this task step).
   h. Wait until 12 months after the contact entered Nurture. Then wait for the time window 8am to 8pm Monday to Saturday.
   i. Send email using the template "NUR-04 · Nurture 12 months quote refresh". Subject, preview and from name are already set on the template.
   Else (Commercial & Industrial):
   a. Wait 90 days, repeating (loop back to the next step every 90 days). Then wait for the time window 8am to 8pm Monday to Saturday.
   b. Send email using the template "C-FUT-01 · Commercial future project". Subject, preview and from name are already set on the template.

Workflow settings: stop the workflow for a contact when they reply to a message, book, or fill in a new form; also stop it when the opportunity moves to "Quoting" (and for the Commercial loop, also when it moves to "Quote Sent"). Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a stage change to Nurture on both pipelines; re-entry allowed.
2. Step 1 removes only WF-06, WF-10 and WF-11; tags been-contacted and is-nurturing are added.
3. The consent check sits after the task step and before the emails.
4. Residential has NUR-01, 30 days, NUR-02, 60 days, NUR-03, REVIEW task, 12 months, NUR-04, each email behind the window.
5. Commercial has the 90 day repeating wait and C-FUT-01 behind the window; stop on reply is on.
6. Draft, no extra steps.

Open items: The REVIEW task sits after the consent check, so a non-consenting contact never gets it (copied from the sheet). Quarterly and 12 month tasks and the 90 day C-FUT-01 are Wait then loop (decision 16). Unsubscribe sets do-not-market and the card stays put: handled by the platform, not a step. Tags placed as step 2 (not numbered in the sheet). The stop-on-booking and form-fill conditions may need setting by hand.

---

## WF-17

```
Build a workflow called "WF-17 · Site inspection booked" in the folder "06. Site inspection". Keep it in draft.

Trigger: Customer Booked Appointment, in the calendar "Site Inspection" (the inspection calendar), for contacts on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (each booking runs it). Timezone Australia/Brisbane.

Steps, in this order:
1. Update the opportunity custom field "Inspection Date" from the appointment start date.
2. If/Else: the opportunity is in the stage "Quote Accepted".
   If yes: move the opportunity to the stage "Inspection Required".
   Else: leave the opportunity where it is.
3. If/Else: the opportunity is on the pipeline "Residential".
   If yes: send an SMS to the contact immediately, no time window, with this exact text: "Hi {{contact.first_name}}, your {{custom_values.inspection_noun}} is booked for {{opportunity.inspection_date}} at {{opportunity.site_address}}. {{custom_values.sms_signoff}}"
   Else: send email using the template "C-INSP-01 · Commercial inspection booked". Subject, preview and from name are already set on the template. Send immediately, no time window.
4. Create a task. Title: "ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}". Description: "Attend the inspection. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Then move the card to Booking Required, or close it as Lost if the job cannot be done." Assign to the user with the role ESTIMATOR. Due on the inspection date.
5. Wait until 7:00am on the day of the inspection.
6. Send an SMS to the contact immediately (no time window; it goes before 8am by design) with this exact text: "Morning {{contact.first_name}}, we are coming to you today for the {{custom_values.inspection_noun}}. Any change, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
7. Wait until the day after the inspection.
8. If/Else: the appointment was not cancelled. If yes, add the tag "been-inspected".

Workflow settings: do not stop on reply. If the appointment is moved or cancelled, the contact leaves this workflow (WF-18 takes over). Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER (Glenn) by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a booking in the inspection calendar; re-entry allowed.
2. Inspection Date is set first; the stage only moves when it is Quote Accepted.
3. Residential gets the inline SMS (X-INSP-01); commercial gets C-INSP-01.
4. ATTEND task is for ESTIMATOR, due on the date.
5. The 7:00am wait, then the inline SMS (X-INSP-02) with no window step.
6. been-inspected is added the day after, only if not cancelled.

Open items: X-INSP-02 sends at 7:00am, before the 8am window, on purpose. The ESTIMATOR role must exist as a user. Calendar name "Site Inspection" is assumed: pick the real inspection calendar by hand. Stopping when moved or cancelled may need setting by hand.

---

## WF-18

```
Build a workflow called "WF-18 · Site inspection moved or cancelled" in the folder "06. Site inspection". Keep it in draft.

Trigger: Appointment Status changed, in the inspection calendar ("Site Inspection"), to rescheduled or to cancelled, for contacts on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (one run per change). Timezone Australia/Brisbane.

Steps, in this order:
1. If/Else: the appointment was rescheduled.
   If yes:
   a. Send email using the template "X-APPT-06 · Booking moved". Subject, preview and from name are already set on the template. Send immediately, no time window.
   b. Add the contact to the workflow "WF-17 · Site inspection booked" so it re-queues the morning text against the new date.
2. If/Else: the appointment was cancelled.
   If yes:
   a. Send internal notification, alert 5 (Phone call or inspection cancelled): to OWNER (Glenn) by SMS and email. Message: "Inspection cancelled: {{contact.first_name}} {{contact.last_name}}."
   b. Clear the opportunity custom field "Inspection Date".
   c. Create a task. Title: "REBOOK {{contact.first_name}}: inspection cancelled". Description: "The customer cancelled the site inspection. Ring them and book a new time in the inspection calendar. Nothing is rebooked automatically, because a free slot is not always one the crew can make." Assign to OWNER (Glenn). Due in 1 business day.

Workflow settings: do not stop on reply. Do not move the opportunity (it stays in Inspection Required). Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger covers rescheduled and cancelled in the inspection calendar; re-entry allowed.
2. Rescheduled: X-APPT-06 immediately, then add to WF-17.
3. Cancelled: alert 5 to OWNER only (SMS and email).
4. Inspection Date is cleared on cancel.
5. REBOOK task is OWNER, due 1 business day.
6. No stage move and no automatic rebooking.

Open items: Alert 5 goes to OWNER only for an inspection (the Assigned user route is for phone calls in WF-08). X-APPT-06 is reused from the phone call flow. Adding to WF-17 may restart it from step 1: check by hand that the old queue is replaced, not duplicated. Calendar name is assumed.

---

## WF-19

```
Build a workflow called "WF-19 · Booking Required" in the folder "07. Booking and reminders". Keep it in draft.

Trigger: Pipeline Stage Changed, to the stage "Booking Required", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again. Timezone Australia/Brisbane. No messages are sent to the customer in this workflow.

Steps, in this order:
1. If/Else: the opportunity is on the pipeline "Residential".
   If yes: create a task. Title: "BOOK {{contact.first_name}}: install date". Description: "Book the install in the calendar for the vehicle doing the job: the InjectaCore rig, the van, the Fuso truck or the Mercedes rig. A job over several days or using two rigs gets a booking for each block. Book it here first, not in the Apple calendar, because the booking is what sends the confirmation and sets up the reminders and the deposit." Assign to OWNER (Glenn). Due in 2 business days.
   Else (Commercial & Industrial): create a task. Title: "BOOK {{contact.first_name}}: works dates". Description: "Agree the start and finish dates with the client, then book each block in the calendar for the vehicle doing it, with the crew. Book it in the platform first, because the booking sends the mobilisation email and sets up the reminders. It then shows in the Apple calendar too." Assign to OWNER (Glenn). Due in 2 business days.
2. Wait 2 business days.
3. If/Else: the opportunity is still in the stage "Booking Required". If yes, do nothing (no action; the card stays on the "Installs to book" list in the daily summary).

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a stage change to Booking Required on both pipelines.
2. Residential task title and description are the install date wording; commercial is the works dates wording.
3. Both tasks are OWNER, due 2 business days.
4. There is a 2 business day wait, then an If/Else with an empty "yes" branch.
5. No message step anywhere.

Open items: Step 3 has no action by design; if the builder cannot make an empty branch, end the workflow after the wait. The "Installs to book" list is a saved filter in the daily summary, not built here. Re-entry is not stated in the sheet (sheet default: allowed). Alert 14 is not part of this workflow.

---

## WF-20

```
Build a workflow called "WF-20 · Install booked" in the folder "07. Booking and reminders". Keep it in draft.

Trigger 1: Customer Booked Appointment, in any of the four install calendars (InjectaCore rig, van, Fuso truck, Mercedes rig), for contacts on the pipeline "Residential" and also on the pipeline "Commercial & Industrial".
Trigger 2: the opportunity custom field "Job Date" is changed (the install date moved). When this trigger starts the run, send the contact the SMS in step 7 only, with the new date, and re-queue WF-21 and WF-24 (step 8); do not resend the email.
Allow a contact to enter again (the first booking does the full run, later bookings only update dates). Timezone Australia/Brisbane.

Steps, in this order:
1. If/Else: the job already has an install booking (another vehicle, or more days).
   If yes:
   a. Update the opportunity custom fields "Job Date" and "Job End Date" to the first and last day across every booking for the job. Add the new vehicle to "Vehicles Booked".
   b. End the workflow here. Nothing is resent; the reminders follow the first day.
2. Update the opportunity custom fields "Job Date", "Job End Date", "Vehicles Booked" and "Crew Assigned" from the booking.
3. Update the opportunity custom field "Job Booked At" to now.
4. Move the opportunity to the stage "Job Booked".
5. Add the tag "been-booked".
6. If/Else: the opportunity is on the pipeline "Residential".
   If yes:
   a. Send an SMS to the contact immediately, no time window, with this exact text: "Hi {{contact.first_name}}, your {{custom_values.trade_verb}} job is booked for {{opportunity.job_date}}. Prep notes are in your email. {{custom_values.sms_signoff}}"
   b. Send email using the template "JOB-02 · Install booked prep instructions". Subject, preview and from name are already set on the template. Send immediately, no time window.
   Else (Commercial & Industrial):
   a. Send email using the template "C-MOB-01 · Commercial works booked". Subject, preview and from name are already set on the template. Send immediately, no time window.
   b. Create a task. Title: "INDUCT crew: {{opportunity.site_address}}". Description: "Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day." Assign to the user with the role CREW_LEAD. Due before the start date (Job Date).
   c. Create a task. Title: "SWMS {{opportunity.site_address}}: issue and confirm receipt". Description: "Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either." Assign to OWNER (Glenn). Due before the start date (Job Date).
7. (Moved-date path, Trigger 2 only) Send the same JOB-01 SMS as step 6 residential (a), with the new date. Do not send the email again.
8. Add the contact to the workflows "WF-21 · Job reminders: a month, 7 days and 48 hours" and "WF-24 · Deposit invoice: the draft for the owner".

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER (Glenn) by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Two triggers: install-calendar booking (four calendars) and Job Date changed.
2. A second booking only updates Job Date, Job End Date and Vehicles Booked, then ends.
3. First booking: fields, Job Booked At, stage Job Booked, been-booked, in that order.
4. Residential: inline JOB-01 SMS and JOB-02 email, both immediate. Commercial: C-MOB-01 plus INDUCT (CREW_LEAD) and SWMS (OWNER) tasks.
5. Ends by adding the contact to WF-21 and WF-24; the moved-date path does not resend JOB-02.
6. Draft, no extra steps.

Open items: Decision 14 adds the second trigger (install date changed); the sheet only describes the resend, so step 7 and the trigger-2 routing are my reading of it, and may need an If/Else on "which trigger started this run" added by hand. Decision 6 settles JOB-01, JOB-02 and C-MOB-01 as immediate. The been-booked tag is not numbered in the sheet; placed as step 5. WF-21 and WF-24 must exist first. The Apple calendar two-way sync is a separate task.

---

## WF-21

```
Build a workflow called "WF-21 · Job reminders: a month, 7 days and 48 hours" in the folder "07. Booking and reminders". Keep it in draft.

Trigger: the opportunity custom field "Job Date" is set or changed (also started by WF-20 adding the contact), on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (it restarts against the new date). Timezone Australia/Brisbane. Every message below waits for the time window 8am to 8pm, Monday to Saturday.

Steps, in this order:
1. If/Else: "Job Booked At" is more than 6 weeks before "Job Date", and "Job Date" is more than 30 days away.
   If yes:
   a. Wait until 30 days before "Job Date", then until the time window.
   b. Send email using the template "REM-06 · Job 30 days check email". Subject, preview and from name are already set on the template.
2. If/Else: "Job Date" is more than 7 days away.
   If yes:
   a. Wait until 7 days before "Job Date".
   b. Clear the opportunity custom field "Job Confirmed", so only an answer from here on counts.
   c. Wait until the time window.
   d. Send email using the template "REM-01 · Job 7 days email". Subject, preview and from name are already set on the template.
   e. Send an SMS to the contact with this exact text: "Hi {{contact.first_name}}, we are with you on {{opportunity.job_date}}. Still OK? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}"
3. If/Else: "Job Date" is more than 48 hours away.
   If yes:
   a. Wait until 48 hours before "Job Date", then until the time window.
   b. Send email using the template "REM-03 · Job 48 hours email". Subject, preview and from name are already set on the template.
   c. Send an SMS to the contact with this exact text: "Hi {{contact.first_name}}, see you in 2 days, {{opportunity.job_date}}. Still on? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}"
4. Wait until 9:00am the day before "Job Date".
5. If/Else: "Job Confirmed" is empty (neither the 7 day nor the 48 hour reminder was answered).
   If yes: create a task. Title: "CALL {{contact.first_name}}: date not confirmed". Description: "Neither the 7 day nor the 48 hour reminder got a Yes or a No. Ring to confirm the job is still on, that access is clear, and that someone over eighteen will be there to let the crew in." Assign to the user with the role OFFICE. Due the day before the job.

Workflow settings: do NOT stop on reply (reminders about an agreed date keep running). If the booking is cancelled the contact leaves; if the date moves it restarts against the new date. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER (Glenn) by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is Job Date set or changed; re-entry allowed; stop on reply is OFF.
2. Three If/Else blocks in order: month (REM-06), 7 days (REM-01 and inline REM-02 text), 48 hours (REM-03 and inline REM-04 text).
3. Job Confirmed is cleared in the 7 day block before the messages.
4. Both SMS texts keep the trigger link tags.
5. The 9:00am wait and the CALL task for OFFICE only when Job Confirmed is empty.
6. Every message is behind the window.

Open items: The sheet says WF-15 (Lost) also stops this workflow: that is done in WF-15. Job Date restart on a new date may need setting by hand. The trigger link names confirm_yes and confirm_no must exist. Alert 12 comes from WF-22.

---

## WF-22

```
Build a workflow called "WF-22 · Yes or No on a reminder" in the folder "07. Booking and reminders". Keep it in draft.

Trigger: Trigger Link Clicked, for the links "confirm_yes" and "confirm_no" (the Yes and No links in REM-01, REM-02, REM-03, REM-04 and REM-06), for contacts on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (once per click). Timezone Australia/Brisbane.

Steps, in this order:
1. If/Else: the link clicked was "confirm_yes".
   If yes: update the opportunity custom field "Job Confirmed" to Yes. The link opens a short thank-you page. Do nothing else.
2. If/Else: the link clicked was "confirm_no".
   If yes:
   a. If/Else guard: the contact already has the tag "alerted-no-<Job Date>" for this booking date (a once-per-booking guard). If yes, end the workflow here.
   b. Add the tag "alerted-no-<Job Date>" for this booking date.
   c. Update the opportunity custom field "Job Confirmed" to No.
   d. Send an SMS to the contact immediately, no time window, with this exact text: "Thanks for letting us know, {{contact.first_name}}. We will ring you shortly to find a new date. {{custom_values.sms_signoff}}"
   e. Send internal notification, alert 12 (Customer cannot make the booked date): to OWNER (Glenn) by SMS and email, and to OFFICE by email and in-app notification. Message: "{{contact.first_name}} {{contact.last_name}} cannot make {{opportunity.job_date}}."
   f. Create a task. Title: "RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}". Description: "The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date." Assign to OWNER (Glenn). Due the same day.
   g. Do not move the booking or the crew automatically.

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a click on either trigger link; re-entry allowed.
2. Yes sets Job Confirmed to Yes and does nothing else.
3. No path: guard, Job Confirmed No, inline REM-05 text (immediate), alert 12, RESCHEDULE task.
4. Alert 12 recipients: OWNER SMS and email, OFFICE email and in-app.
5. Nothing moves the booking or the crew.
6. A second No on the same booking date does not alert twice.

Open items: Decision 15 requires the once-per-booking guard; the sheet gives no mechanism, so I used a tag that holds the booking date. A tag with a date in its name may not be buildable: use a field check instead (for example a text field holding the last alerted Job Date). Decision 3 confirms WF-22 handles these links. The sheet says the 7 day and 48 hour SMS carry the same links; confirm both links are named confirm_yes and confirm_no.

---

## WF-23

```
Build a workflow called "WF-23 · Job day" in the folder "07. Booking and reminders". Keep it in draft.

Trigger: the opportunity custom date field "Job Date" arrives (scheduled from the install booking; run on the day), on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (once per site day on commercial). Timezone Australia/Brisbane. Messages below go at 6:30am with no time window (before 8am by design).

Steps, in this order:
1. If/Else: the opportunity is on the pipeline "Residential".
   If yes:
   a. Wait until 6:30am on "Job Date".
   b. Send an SMS to the contact immediately, no time window, with this exact text: "Morning {{contact.first_name}}, {{opportunity.crew_assigned}} and the crew are on the way to you now. {{custom_values.sms_signoff}}"
   c. Create a task. Title: "PHOTOS {{opportunity.site_address}}". Description: "Photograph the finished work from the app before leaving site, and tick Photos captured. The job cannot be marked complete without them. They go into the job report, and they are the only real proof-of-work images the business has." Assign to the user with the role CREW_LEAD. Due before the job is marked complete.
   d. Create a task. Title: "VARIATIONS {{contact.first_name}}: record any extras". Description: "Anything agreed on site that was not in the quote, such as an extra 100 sqm, goes out from the variation document for the customer to sign, and onto the card the same day. Left to invoicing, it surprises the customer." Assign to CREW_LEAD. Due before the job is marked complete.
   Else (Commercial & Industrial):
   a. Wait until 6:30am on each site day between "Job Date" and "Job End Date" (Wait until the next 6:30am, then loop back to this step until "Job End Date" has passed).
   b. Send an SMS to the contact immediately, no time window, with this exact text: "Morning {{contact.first_name}}, our crew is on site at {{opportunity.site_address}} today, led by {{opportunity.crew_assigned}}. Any issue, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
   c. Create a task. Title: "UPDATE {{contact.first_name}}: weekly progress". Description: "Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week's photos." Assign to OWNER (Glenn). Due every Friday while the job is live (Wait until Friday, then loop back to this task step).
   d. Create a task. Title: "PHOTOS {{opportunity.site_address}}: this stage". Description: "Photograph each completed stage before moving on. The photos are the evidence behind each claim and they go into the close-out pack, so they are needed at the end of every stage, not at the end of the job." Assign to CREW_LEAD. Due at the end of each stage.
   e. Create a task. Title: "VARIATIONS {{opportunity.site_address}}: record and get signed". Description: "Record every variation agreed on site and send it from the variation document for signature the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim." Assign to CREW_LEAD. Due as they happen.

Workflow settings: do not stop on reply. The contact leaves when the job is marked complete or the booking moves. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER (Glenn) by SMS and email with the workflow name and the contact. Do not add any other steps. Do not send JOB-06 from this workflow. Do not publish.
```

Check after it builds:
1. Trigger is Job Date arriving; re-entry allowed.
2. Residential: 6:30am wait, inline JOB-04 text, PHOTOS and VARIATIONS tasks for CREW_LEAD.
3. Commercial: 6:30am loop across the job dates, inline C-SITE-01 text, UPDATE (OWNER) and two CREW_LEAD tasks.
4. The SMS texts match, with merge tags intact, and have no window step.
5. No JOB-06 and no weekly email send step.
6. Draft, no extra steps.

Open items: The guard that blocks moving to Job Completed until "Photos Captured" is ticked is a stage-change requirement (CRM-WORKFLOWS.md "Required fields on entry"), not a step here: set it by hand. JOB-06 is a saved snippet in the mobile app, not a workflow. C-PROG-01 is sent by hand from the UPDATE task. Repeating Friday task and site-day loop are Wait then loop (decision 16). "Stops when the booking moves" may need setting by hand.

---

## WF-24

```
Build a workflow called "WF-24 · Deposit invoice: the draft for the owner" in the folder "08. Deposit". Keep it in draft.

Trigger: the opportunity custom field "Job Date" is set or changed, and the opportunity custom field "Deposit Amount" is set, on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (it re-runs against a new date; a draft already made is updated, not duplicated). Timezone Australia/Brisbane. No message is sent to the customer in this workflow.

Steps, in this order:
1. If/Else: "Deposit Amount" is empty (no deposit on this job). If yes, end the workflow here (jobs with no deposit skip Deposit Requested).
2. If/Else: "Foam Order Type" is "Special order".
   If yes: update the opportunity custom field "Deposit Due Date" to 7 days before "Job Date".
   Else: update "Deposit Due Date" to 1 business day before "Job Date".
3. If/Else: "Job Date" is more than 14 days away. If yes, wait until 14 days before "Job Date".
4. Create a draft invoice (a DRAFT only, not sent): the deposit invoice from the accepted quote, for the "Deposit Amount", due on "Deposit Due Date", with the accepted quote and any purchase order attached. No card storage and no automatic charge. If an earlier draft exists for this opportunity, update it instead of making a second one.
5. Create a task. Title: "INVOICE {{contact.first_name}}: check and send the deposit invoice". Description: "A draft deposit invoice is ready, made from the accepted quote with the quote and any purchase order attached. Check the amount, the due date and the payment terms, then send it. Sending it emails the customer and moves the card to Deposit Requested. Nothing is sent until you do." Assign to OWNER (Glenn). Due in 2 business days.
6. Wait 2 business days.
7. If/Else: the draft has not been sent. If yes, do nothing (no action; the card stays on the "Invoices to send" list in the daily summary).

Workflow settings: do not stop on reply. The contact leaves when the owner sends the invoice (WF-25 takes over), the job is cancelled, or "Job Date" moves before it is sent (which re-runs it). Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is Job Date set or changed with Deposit Amount set; re-entry allowed.
2. Early exit when Deposit Amount is empty.
3. Deposit Due Date is 7 days before for Special order, otherwise 1 business day before.
4. The 14 day wait is conditional, then a draft invoice, not a sent one.
5. INVOICE task is OWNER, due 2 business days.
6. No customer message anywhere.

Open items: Invoice action must be checked by hand: the draft invoice action (decision 17) may not exist as a workflow step, may not allow "draft", and may not update an existing draft. Confirm on the Dev sub-account. Xero GST invoice sync is untested (go-live item). Agency note: once Glenn settles invoice layout this can become an automatic send, not now. Step 7 has no action by design.

---

## WF-25

```
Build a workflow called "WF-25 · Deposit invoice sent, and the due-date check" in the folder "08. Deposit". Keep it in draft.

Trigger: the deposit invoice is sent by the owner (invoice sent, the draft made by WF-24), for contacts on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Re-entry: do NOT allow a contact to enter again (once per job). Timezone Australia/Brisbane.

Steps, in this order:
1. Send email using the template "DEP-02 · Deposit invoice email". Subject, preview and from name are already set on the template. Send immediately when the owner presses send, with no time window (it is the invoice email itself).
2. Update the opportunity custom field "Deposit Invoice Sent At" to now.
3. Move the opportunity to the stage "Deposit Requested".
4. Add the tag "is-deposit-owing".
5. Wait until 4:00pm on "Deposit Due Date".
6. If/Else: the deposit is unpaid.
   If yes:
   a. Wait until the time window 8am to 8pm, Monday to Saturday (hold if 4pm falls on a Sunday).
   b. Send an SMS to the contact with this exact text: "Hi {{contact.first_name}}, we have not received your deposit of {{opportunity.deposit_amount}} yet. If you have paid, please reply with the remittance. {{custom_values.sms_signoff}}"
   c. Send internal notification, alert 13 (Deposit unpaid at its due date): to OWNER (Glenn) by SMS and email, and to OFFICE by email and in-app notification. Message: "Deposit unpaid: {{contact.first_name}} {{contact.last_name}}, {{opportunity.deposit_amount}}."
   d. Create a task. Title: "CHASE {{contact.first_name}}: deposit unpaid". Description: "The deposit was due today and has not landed. The customer has had a text asking for the remittance. Check for a reply; if it will not arrive in time, move the crew to other work and tell the customer." Assign to OWNER (Glenn). Due on the deposit due date.

Workflow settings: do not stop on reply. The contact leaves when the deposit is paid (WF-26) or the job is cancelled. Do not send any reminder between sending and the due date. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is the invoice being sent; re-entry off.
2. Order: DEP-02, Deposit Invoice Sent At, stage Deposit Requested, tag is-deposit-owing, then the 4:00pm wait.
3. The unpaid check leads to the inline DEP-03 text, alert 13 and the CHASE task.
4. Alert 13 recipients: OWNER SMS and email, OFFICE email and in-app.
5. Nothing is sent between sending and the due date.
6. Draft, no extra steps.

Open items: Invoice trigger must be checked by hand: "invoice sent" may not exist as a trigger on this sub-account. DEP-02 is the invoice email itself, so the window cannot hold it: treated as immediate. Decision 9: the platform sends DEP-03, and Xero invoice reminders must be switched off (GLENN to confirm before go-live). DEP-03 Sunday behaviour is not stated in the sheet: I added a window wait (step 6a) from the sheet's "Waits for window" note. Tag placed as step 4 (not numbered in the sheet).

---

## WF-26

```
Build a workflow called "WF-26 · Deposit received" in the folder "08. Deposit". Keep it in draft.

Trigger: the deposit invoice is marked paid, for contacts on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Re-entry: do NOT allow a contact to enter again (sends once). Timezone Australia/Brisbane.

Steps, in this order:
1. Update the opportunity custom field "Deposit Received At" to now.
2. Send an SMS to the contact immediately, no time window, with this exact text: "Deposit received, thanks {{contact.first_name}}. You are all set for {{opportunity.job_date}}. {{custom_values.sms_signoff}}"
3. Send internal notification, alert 9 (Deposit received): to OWNER (Glenn) by SMS and email, and to OFFICE by email and in-app notification. Message: "Deposit received: {{contact.first_name}} {{contact.last_name}}."
4. Remove the contact from the workflow "WF-25 · Deposit invoice sent, and the due-date check" so the pending 4:00pm check is cancelled. Do not move the opportunity: it stays in "Deposit Requested" until the job is marked complete.
5. Remove the tag "is-deposit-owing".

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is invoice marked paid; re-entry off.
2. Deposit Received At is set, then the inline DEP-01 text with no wait.
3. Alert 9 recipients: OWNER SMS and email, OFFICE email and in-app.
4. WF-25 is removed and is-deposit-owing is removed.
5. No stage move.

Open items: Invoice paid trigger must be checked by hand (same as WF-25, and the Xero payment sync is a go-live item). Decision 6 settles DEP-01 as immediate. The tag removal is not a numbered step in the sheet; placed as step 5. The trigger already guarantees a deposit exists.
