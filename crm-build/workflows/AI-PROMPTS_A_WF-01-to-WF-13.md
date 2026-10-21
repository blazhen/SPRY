# Ask AI prompts: WF-01 to WF-13 (SprayIT Solutions, Dev sub-account)

How to paste:
- Dev sub-account only (location 5M1zrDbimF17cM16mtmR). Never the live account.
- Create the folders from AI-PROMPT-00_FOLDERS.md first ("01. Intake", "02. Dial 1 and Dial 2", "03. Phone calls", "04. Quote"). The prompts name the folder.
- One workflow at a time: Automation, Workflows, create with Ask AI, paste the whole fenced block, let it build, then run the "Check after it builds" list. Keep every workflow in draft. Do not publish.
- All email templates must already exist in Dev with the names from message-index.md. SMS templates do not exist yet, so the SMS text is written into each prompt.
- Roles: OWNER = Glenn Angus. OFFICE = Rachael Angus. ESTIMATOR = Glenn Angus.
- Field names below are the Dev labels (the key written as words).
- Decisions applied from CRM-BUILD-00-DECISIONS.md: customer send window 8am to 8pm Monday to Saturday (1); staff "business hours" timers use office hours Monday to Friday 7am to 5pm from the Office Hours custom value (2); WF-07 keeps running after acceptance or a reply (4); pause means Remove from Workflow, resume is a person re-adding the contact (8); confirmations send immediately (6); the platform's own Lost Reason list is used (10); re-entry off unless the sheet says otherwise, stop on reply on chasing sequences (7).
- Alerts also follow quiet hours (Mon-Fri 7am-6pm all alerts; Sat 8am-2pm only alerts 1, 2, 6, 10, 11, 12; otherwise none). Set on the alert settings, not in each workflow.

---

## WF-01

```
Build a workflow called "WF-01 · Website lead intake" in the folder "01. Intake". Keep it in draft.

Trigger: Inbound Webhook, from the website quote form. No filter.
Re-entry: allow re-entry (one run per submission; a repeat enquirer enters again but must never create a duplicate contact).
Timezone: Australia/Brisbane.

Steps, in this order:
1. Create/Update Contact: find or create the contact on phone (E.164 format) first, then email. Never create a duplicate.
2. Update the contact fields from the webhook data. Store the human label in dropdown fields (for example "Home", not "home"). Map the webhook field "stage" to the contact field "Building Stage". Fields mapped: Source, Form Name, Submitted At, Page Title, UTM Source, UTM Medium, UTM Campaign, UTM Term, UTM Content, UTM Id.
3. Update the consent record fields "Consent Marketing", "Consent Text", "Consent At", "Consent Page" from the webhook. Append the new record, never overwrite an earlier one.
4. Update attribution fields. First-touch fields only if they are empty: "First Touch At", "First Touch Referrer", "First Touch Landing", the UTM fields and the click id fields. Last-touch fields always: "Last Touch Referrer", "Last Touch Landing".
5. Update the field "Ask For Google Review" to Yes, only if it is empty.
6. Add tags: from-website, been-enquired, plus the New Lead stage tag for the board the lead lands on (stage-res-new-lead for Residential, stage-com-new-lead for Commercial & Industrial).
7. If/Else: the contact's Property Type is "Factory or warehouse" or "Farm or agricultural", or the message mentions a tender, a builder, a head contractor, or an area over 500 sqm.
   Yes branch (commercial):
   7a. Create an opportunity on the pipeline "Commercial & Industrial", stage "New Lead", assigned to Rachael Angus.
   7b. Internal notification, alert 6 (Commercial enquiry), to Glenn Angus. Message: "Commercial enquiry: {{contact.name}}, {{contact.phone}}".
   7c. Internal notification, alert 1 (New enquiry), to Rachael Angus by email and in-app. Message: "New enquiry: {{contact.name}}, {{contact.phone}}".
   7d. Send SMS to the contact, immediately, with this exact text: "Hi {{contact.first_name}}, thanks for your enquiry. We will ring you shortly to talk it through. Need us sooner? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
   7e. Send email using the template "C-ACK-01 · Commercial new enquiry", immediately. Subject, preview and from name (the contact name) are already set on the template.
   No branch (residential):
   7a. Create an opportunity on the pipeline "Residential", stage "New Lead", assigned to Rachael Angus. If Property Type is "Something else", also create a review task for Rachael Angus.
   7b. Internal notification, alert 1 (New enquiry), to Rachael Angus by email and in-app. Message: "New enquiry: {{contact.name}}, {{contact.phone}}".
   7c. Send SMS to the contact, immediately, with this exact text: "Hi {{contact.first_name}}, thanks for your enquiry. We will ring you shortly to talk it through. Need us sooner? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
   7d. Send email using the template "X-ACK-02 · New lead email", immediately. Subject, preview and from name (the contact name) are already set on the template.
8. Create a task (after the If/Else, both branches). Title: "CALL {{contact.first_name}}: new lead, {{contact.areas}}". Description: "Ring the new lead within 15 minutes. The acknowledgement text and email have already gone. Ring twice, back to back. No answer to either: move the card to Dial 1. If they answer and want a quote, move the card to Quoting, which hands it to the owner to write the quote. Ring back later: Follow-Up. Not now: Nurture." Owner: Rachael Angus. Due: 15 minutes from now.
9. Add the contact to the workflow "WF-02 · Lead not called: the 15 minute timer".

Settings: stop on reply is off. No send window; both acknowledgements are immediate.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is an inbound webhook with no filter and re-entry is allowed.
2. Step 1 finds or creates on phone then email; no duplicate possible.
3. The If/Else has the Factory or warehouse, Farm or agricultural, tender, builder, head contractor and over 500 sqm conditions, and the two branches have the right pipelines and different emails (C-ACK-01 vs X-ACK-02).
4. Both SMS texts match word for word with merge tags intact; the task is due in 15 minutes and sits after the If/Else.
5. Last step adds to WF-02 (draft is fine, it can be linked later); error alert 11 is set; saved as draft.

Open items: the stage tag key is not listed in the sheet (pattern is stage- plus res or com plus the stage key), so stage-res-new-lead and stage-com-new-lead are assumed; confirm against the tag list. The "append, never overwrite" consent rule needs a decision on storing several records in one field set. The sheet lists X-ACK-01 as the SMS on both branches; the SMS text is pasted inline.

---

## WF-02

```
Build a workflow called "WF-02 · Lead not called: the 15 minute timer" in the folder "01. Intake". Keep it in draft.

Trigger: Opportunity Created, in the stage "New Lead", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Also allow it to be started by "Add to Workflow" from WF-01.
Re-entry: do not allow re-entry.
Timezone: Australia/Brisbane. All waits count office hours only (Monday to Friday 7am to 5pm); the clock pauses outside them, so an 11pm enquiry starts at 7am.

Steps, in this order:
1. Wait 15 minutes, office hours only.
2. If/Else: no call has been logged on the card.
   Yes branch:
   2a. Internal notification, alert 7 (New lead not called after 15 minutes), to Rachael Angus by email and in-app. Message: "New lead not called after 15 minutes: {{contact.name}}, {{contact.phone}}".
3. Wait until 60 minutes after the start, office hours only.
4. If/Else: still no call has been logged.
   Yes branch:
   4a. Internal notification by SMS and email to Glenn Angus. Message: "This lead has been waiting since {{workflow.start_time}} with no call: {{contact.name}}, {{contact.phone}}." (no alert number)
5. Update the contact so it is listed under "Leads not called" in the daily summary from the next morning, until a call is logged. Use a contact field or flag named "Leads Not Called" (WF-39 reads it).

Settings: stop on reply is off. The workflow ends when a call is logged on the card or the stage changes. No messages are sent to the customer.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Both waits are 15 minutes and until 60 minutes, office hours only (Mon-Fri 7am to 5pm).
2. Alert 7 goes to Rachael Angus (email and in-app), after the first If/Else only.
3. The 60 minute step goes to Glenn Angus by SMS and email, with no alert number.
4. The workflow ends on a logged call or a stage change.
5. Saved as draft; alert 11 error branch set.

Open items: the 60 minute notification to Glenn has no alert number or template in the sheet; built as plain SMS and email. The "Leads not called" field or flag is not named in the sheet; the name "Leads Not Called" is a placeholder to map to WF-39. Business hours: the sheet says 7am to 6pm quiet hours and 8am send window; decision 2 sets staff timers to Mon-Fri 7am to 5pm, applied here (Glenn to confirm).

---

## WF-03

```
Build a workflow called "WF-03 · Missed call text-back" in the folder "01. Intake". Keep it in draft.

Trigger: Call Status, an inbound call to the business number that was not answered.
Re-entry: allow re-entry, but only once per caller per day.
Timezone: Australia/Brisbane.

Steps, in this order:
1. If/Else: this number has already received the text-back today.
   Yes branch:
   1a. Remove from Workflow: end here (once per caller per day).
2. Create/Update Contact: find or create the contact on the caller number.
3. Add tags: from-phone, been-enquired.
4. Send SMS to the contact, immediately (within 60 seconds), with this exact text: "Sorry we missed your call. Reply here and we will get straight back to you, or we will ring you shortly. {{custom_values.sms_signoff}}"
5. Internal notification, alert 2 (Missed call), to Rachael Angus by email and in-app. Message: "Missed call from {{contact.name}}, {{contact.phone}}".
6. Create a task. Title: "RING BACK {{contact.first_name}}: missed call". Description: "A call came in and nobody answered. The caller already has a text saying someone will ring back, so this is a promise the team has made." Owner: Rachael Angus. Due: 30 minutes from now.

Settings: stop on reply is off. No send window; the text is immediate.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is an unanswered inbound call and the once-per-caller-per-day rule exists as the first If/Else.
2. The contact is found or created on the caller number (no duplicate).
3. Tags are exactly from-phone and been-enquired.
4. SMS text matches word for word; task due in 30 minutes for Rachael Angus.
5. Saved as draft; alert 11 error branch set.

Open items: none.

---

## WF-04

```
Build a workflow called "WF-04 · Out of hours reply" in the folder "01. Intake". Keep it in draft.

Trigger: Customer Replied, an inbound SMS received outside office hours (Monday to Friday 7am to 6pm and Saturday 8am to 2pm count as office hours; anything else is outside).
Re-entry: allow re-entry, but only once per contact per day (not once per message).
Timezone: Australia/Brisbane.

Steps, in this order:
1. If/Else: this contact has already received this reply today.
   Yes branch:
   1a. Remove from Workflow: end here (once per contact per day).
2. Send SMS to the contact, immediately, with this exact text: "Thanks for your message. We are back {{custom_values.office_hours}} and will reply first thing. Urgent? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"

Settings: stop on reply is off. No send window; the reply is immediate.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is an inbound SMS with an outside-hours condition.
2. First step is the once-per-contact-per-day check that ends the run.
3. SMS text matches word for word with merge tags intact.
4. No tags or fields are set.
5. Saved as draft; alert 11 error branch set.

Open items: the office hours that define "outside" are not given in the sheet; the quiet-hours figures (Mon-Fri 7am to 6pm, Sat 8am to 2pm) are used, to confirm. Decision 2 gives staff office hours as Mon-Fri 7am to 5pm; the two sets differ, so confirm which applies.

---

## WF-05

```
Build a workflow called "WF-05 · Dial 1: the tried-to-call text" in the folder "02. Dial 1 and Dial 2". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Dial 1", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow each contact to enter only once.
Timezone: Australia/Brisbane.

Steps, in this order:
1. Wait 10 seconds.
2. Send SMS to the contact, immediately after the wait, with this exact text: "Hi {{contact.first_name}}, we just tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.contact_mobile}} when it suits. {{custom_values.sms_signoff}}"
3. Update the contact custom field "Contact Attempts": add 2 to its current value (if it is empty, set it to 2).
4. Update the contact custom field "Last Attempt At" to now.
5. Create a task. Title: "CALL {{contact.first_name}}: second round of calls". Description: "Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails." Owner: Rachael Angus. Due: later the same day (end of today).

Settings: stop the workflow for a contact when they reply to a message; a reply or an answered call before the second round also closes the task. No send window; the text is immediate.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger covers both pipelines and one entry per contact.
2. The 10 second wait sits before the SMS; SMS text matches word for word.
3. Contact Attempts adds 2 and Last Attempt At is set.
4. Task has the exact title and description, owner Rachael Angus, due today.
5. Stop on reply is on; saved as draft; no extra steps.

Open items: none beyond the 10 second wait, built as written.

---

## WF-06

```
Build a workflow called "WF-06 · Dial 2: the email sequence" in the folder "02. Dial 1 and Dial 2". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Dial 2", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial".
Re-entry: do not allow re-entry.
Timezone: Australia/Brisbane. Days count from the moment the contact entered Dial 2. Every email below waits for the send window: 8am to 8pm, Monday to Saturday.

Steps, in this order:
1. Wait 2 days.
2. Wait until the send window, then send email using the template "DIAL-02 · Dial 2 day 2 follow-up". Subject, preview and from name (the contact name) are already set on the template.
3. Wait until day 4 (from entering Dial 2).
4. Wait until the send window, then send email using the template "DIAL-03 · Dial 2 day 4 pick a time". Subject, preview and from name (the contact name) are already set on the template.
5. Create a task. Title: "CALL {{contact.first_name}}: one more try". Description: "One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way." Owner: Rachael Angus. Due: day 4.
6. Wait until day 7 (from entering Dial 2).
7. Wait until the send window, then send email using the template "DIAL-04 · Dial 2 day 7 closing off". Subject, preview and from name (the contact name) are already set on the template.
8. Wait 1 day.
9. If/Else: the contact is still in Dial 2 with no reply.
   Yes branch:
   9a. Update the opportunity: status Lost, with the Lost Reason "Unreachable".
   9b. Add tag: is-unresponsive.

Settings: stop on reply is on, for a reply on any channel. The workflow also ends if the customer books a phone call or the stage changes.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a stage change to Dial 2 on both pipelines; no re-entry.
2. Waits are 2 days, until day 4, until day 7, then 1 day; each email has the 8am to 8pm Mon-Sat window before it.
3. The three template names match exactly (DIAL-02, DIAL-03, DIAL-04).
4. The CALL task sits between DIAL-03 and the day 7 wait, due day 4.
5. The final branch sets Lost, reason Unreachable, and tag is-unresponsive; stop on reply is on; saved as draft.

Open items: the Lost step triggers WF-15; WF-15 excludes LOST-01 for Unreachable, so no extra email goes. "Until day 4" and "until day 7" count from entering Dial 2. Lost reason uses the platform's own Lost Reason list (decision 10); the sheet names the key as lost_reason.

---

## WF-07

```
Build a workflow called "WF-07 · Phone call booked" in the folder "03. Phone calls". Keep it in draft.

Trigger: Customer Booked Appointment, in the phone call calendar.
Re-entry: allow re-entry (once per booking).
Timezone: Australia/Brisbane.

Steps, in this order:
1. Remove the contact from the workflow "WF-06 · Dial 2: the email sequence" (a booking stops the Dial 2 emails; this is the pause, a person re-adds the contact to resume).
2. Send email using the template "X-APPT-01 · Phone call booked email", immediately. Subject, preview and from name (the brand name) are already set on the template.
3. Send SMS to the contact, immediately, with this exact text: "Booked in for {{appointment.start_time}}. We will call you on {{contact.phone}}. Change it here: {{appointment.reschedule_link}} {{custom_values.sms_signoff}}"
4. Internal notification, alert 4 (Phone call booked), to the assigned user by email and in-app. Message: "Phone call booked: {{contact.name}}, {{appointment.start_time}}".
5. Wait until 24 hours before the appointment.
6. Wait until the send window (8am to 8pm, Monday to Saturday), then send SMS to the contact with this exact text: "Reminder: your call with {{custom_values.business_short_name}} is tomorrow, {{appointment.start_time}}. Need to move it? {{appointment.reschedule_link}} {{custom_values.sms_signoff}}"
7. Wait until 2 hours before the appointment.
8. Send SMS to the contact, immediately, with this exact text: "Your call with {{custom_values.business_short_name}} is at {{appointment.start_time}}, about 2 hours away. Talk soon. {{custom_values.sms_signoff}}"

Settings: stop on reply is off. The workflow ends if the appointment is moved or cancelled (WF-08 takes over). It keeps running after a quote is accepted or a reply arrives.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a booking in the phone call calendar only.
2. Step 1 removes the contact from WF-06.
3. Email X-APPT-01 and SMS texts match exactly; the 24 hour reminder has the send window, the 2 hour reminder does not.
4. Alert 4 goes to the assigned user, not a fixed person.
5. Waits are relative to the appointment time; saved as draft.

Open items: if 24 hours before falls outside 8am to 8pm Mon-Sat, the reminder is held. The sheet says "pause WF-06" while WF-08 says the emails resume; built as Remove from Workflow with manual re-add (decision 8). Decision 4: this workflow keeps running after acceptance.

---

## WF-08

```
Build a workflow called "WF-08 · Phone call moved or cancelled" in the folder "03. Phone calls". Keep it in draft.

Trigger: Appointment Status, in the phone call calendar, when an appointment is rescheduled or cancelled.
Re-entry: allow re-entry (once per change).
Timezone: Australia/Brisbane.

Steps, in this order:
1. If/Else: the appointment was rescheduled.
   Yes branch:
   1a. Send email using the template "X-APPT-06 · Booking moved", immediately. Subject, preview and from name (the brand name) are already set on the template.
   1b. Add the contact to the workflow "WF-07 · Phone call booked", so its reminders are re-queued against the new time.
2. If/Else: the appointment was cancelled.
   Yes branch:
   2a. Internal notification, alert 5 (Phone call or inspection cancelled), to the assigned user by email and in-app. Message: "Phone call cancelled: {{contact.name}}".
   2b. Create a task. Title: "CALL {{contact.first_name}}: phone call cancelled". Description: "They cancelled the phone call they booked. Ring them: a cancelled call is usually a diary clash, and a short call often rebooks it. If the card is in Dial 2, the emails resume from where they paused." Owner: the assigned user. Due: the same day.

Settings: stop on reply is off. No send window; the email is immediate. The opportunity does not move.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger covers rescheduled and cancelled appointments in the phone call calendar.
2. Rescheduled branch sends X-APPT-06 then adds to WF-07.
3. Cancelled branch has alert 5 and the task, both for the assigned user.
4. Task title and description match exactly; due same day.
5. No stage change anywhere; saved as draft.

Open items: alert 5 is shared with inspections (WF-18); here it goes to the assigned user, not OWNER. The sheet does not say how to tell the two If/Elses apart if both fire; they are separate checks as written.

---

## WF-09

```
Build a workflow called "WF-09 · Quoting: hand-over to the owner" in the folder "04. Quote". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Quoting", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial".
Re-entry: allow re-entry (the stage can be re-entered).
Timezone: Australia/Brisbane. "Business days" means Monday to Friday.

Steps, in this order:
1. Add tag: been-contacted. Remove tag: is-nurturing.
2. Remove the contact from the workflows "WF-06 · Dial 2: the email sequence" and "WF-16" (if either is running).
3. Assign the contact and the opportunity to Glenn Angus. (A separate workflow, WF-38, then sends alert 14 "Assigned to you" by text and email.)
4. If/Else: the opportunity is on the pipeline "Residential".
   Yes branch (residential):
   4a. Create a task. Title: "QUOTE {{contact.first_name}}: write and send the quote". Description: "The office has spoken to them and they want a quote. Ring them first if you need more detail, plans or an energy report. Write the quote in the quote tool, with each option as its own line if there is more than one, and send it. Sending it moves the card to Quote Sent and starts the follow-up." Owner: Glenn Angus. Due: 2 business days.
   4b. Wait 2 business days.
   No branch (commercial):
   4a. Create a task. Title: "QUOTE {{contact.first_name}}: scope and send the proposal". Description: "Ring them for the detail: who decides, roughly how big, what the space is used for, whether it is operating during the works, and the programme. Work out product, thickness, access, plant, staging and WHS, then send the proposal from the quote tool, which moves the card to Quote Sent." Owner: Glenn Angus. Due: 5 business days.
   4b. Wait 5 business days.
5. If/Else: the opportunity is still in the stage "Quoting".
   Yes branch:
   5a. Update the contact so it is listed under "Quotes to write" in the daily summary until it moves. Use a contact field or flag named "Quotes To Write".

Settings: stop on reply is off. No messages are sent. The workflow ends when the quote is sent or the card moves to Follow-Up, Nurture or Lost.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a stage change to Quoting on both pipelines; re-entry allowed.
2. Tags: been-contacted added, is-nurturing removed.
3. Removal from WF-06 and WF-16, and assignment to Glenn Angus.
4. The branch is on the pipeline; residential task due 2 business days, commercial due 5, titles and descriptions exact.
5. Final check lists "Quotes To Write" only if still in Quoting; saved as draft.

Open items: the "Quotes to write" field or flag is not named in the sheet; "Quotes To Write" is a placeholder. WF-16 may not exist yet in Dev; link it later if so.

---

## WF-10

```
Build a workflow called "WF-10 · Quote sent and the follow-up" in the folder "04. Quote". Keep it in draft.

Trigger: the quote is sent from the quote tool, or the opportunity is moved by hand to the stage "Quote Sent", on the pipeline "Residential" only.
Re-entry: do not allow re-entry.
Timezone: Australia/Brisbane. Days count from the quote being sent. Messages marked "send window" wait for 8am to 8pm, Monday to Saturday.

Steps, in this order:
1. Update the opportunity: move to the stage "Quote Sent", if not already there.
2. Remove the contact from the workflows "WF-06 · Dial 2: the email sequence" and "WF-16" (if either is running).
3. Update the field "Quote Sent At" to now. "Quote Number", "Quote Link" and the opportunity value come from the quote.
4. Add tags: been-contacted, been-quoted. Remove tag: is-nurturing.
5. Send email using the template "R-QUOTE-01 · Quote sent email", immediately (sent as the quote tool email with the view and accept button). Subject, preview and from name (the contact name) are already set on the template.
6. Send SMS to the contact, immediately, with this exact text: "Hi {{contact.first_name}}, your quote is in your inbox. You can accept it online from the email. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
7. Create a task. Title: "CALL {{contact.first_name}}: quote follow up". Description: "Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence." Owner: Rachael Angus. Due: day 2.
8. Wait until day 2.
9. Wait until the send window, then send SMS to the contact with this exact text: "Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}"
10. Wait until day 5.
11. Wait until the send window, then send email using the template "R-FU-02 · Quote day 5 why quotes differ". Subject, preview and from name (the contact name) are already set on the template.
12. Wait until day 10.
13. Wait until the send window, then send SMS to the contact with this exact text: "Hi {{contact.first_name}}, still thinking it over, or has something changed? Either is fine, we just want to know whether to keep it open. {{custom_values.sms_signoff}}"
14. Wait until day 21.
15. Wait until the send window, then send email using the template "R-FU-04 · Quote day 21 final close". Subject, preview and from name (the contact name) are already set on the template.
16. Create a task. Title: "DECIDE {{contact.first_name}}: accepted, nurture or lost". Description: "Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting." Owner: Rachael Angus. Due: day 21.

Settings: stop on reply is on. The workflow also ends if the customer accepts or declines, or the card leaves Quote Sent.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is Quote Sent on Residential only; no re-entry.
2. Steps 1 to 4 run before any message; R-QUOTE-01 and the R-QUOTE-02 text are immediate.
3. Waits are day 2, 5, 10, 21 in order, each message behind the send window.
4. Template names exact (R-QUOTE-01, R-FU-02, R-FU-04); all three SMS texts match word for word.
5. Both tasks (CALL day 2, DECIDE day 21) have exact titles and descriptions; stop on reply on; saved as draft.

Open items: the day 2 CALL task and R-FU-01 both fall on day 2, as in the sheet. R-FU-04 says the card is then moved to Nurture, Lost or Follow-Up, which a person does via the DECIDE task. The R-QUOTE-02 SMS is the sheet's second send; the sheet calls it R-QUOTE-02 and the text is pasted inline. WF-16 may not exist yet in Dev.

---

## WF-11

```
Build a workflow called "WF-11 · Proposal sent and the follow-up" in the folder "04. Quote". Keep it in draft.

Trigger: the proposal is sent from the quote tool, or the opportunity is moved by hand to the stage "Quote Sent", on the pipeline "Commercial & Industrial" only.
Re-entry: do not allow re-entry.
Timezone: Australia/Brisbane. Days count from the proposal being sent. All three emails wait for the send window: 8am to 8pm, Monday to Saturday.

Steps, in this order:
1. Update the opportunity: move to the stage "Quote Sent", if not already there.
2. Update the field "Quote Sent At" to now. "Quote Number", "Quote Link" and the opportunity value come from the proposal.
3. Add tags: been-contacted, been-quoted. Remove tag: is-nurturing.
4. Wait until the send window, then send email using the template "C-PROP-01 · Commercial proposal sent". Subject, preview and from name (the contact name) are already set on the template.
5. Create a task. Title: "CALL {{contact.first_name}}: confirm receipt". Description: "Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it." Owner: Glenn Angus. Due: 2 days.
6. Wait until day 7.
7. Wait until the send window, then send email using the template "C-PROP-02 · Commercial proposal day 7". Subject, preview and from name (the contact name) are already set on the template.
8. Create a task. Title: "CHASE {{contact.first_name}}: decision date". Description: "Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity." Owner: Glenn Angus. Due: day 7.
9. Wait until day 21.
10. Wait until the send window, then send email using the template "C-PROP-03 · Commercial proposal day 21". Subject, preview and from name (the contact name) are already set on the template.

Settings: stop on reply is on. The workflow also ends if the customer accepts, or the card moves to Follow-Up, Nurture or Lost.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is Quote Sent on Commercial & Industrial only.
2. Tags added and removed as listed; Quote Sent At set.
3. Template names exact (C-PROP-01, C-PROP-02, C-PROP-03), each behind the send window.
4. Tasks: CALL (Glenn, due 2 days) and CHASE (Glenn, due day 7) with exact titles and descriptions.
5. Waits are until day 7 and until day 21; stop on reply on; saved as draft.

Open items: (a) the sheet has no step removing WF-06 and WF-16 here, unlike WF-10; built as written. (b) The CHASE task is listed "due day 7, then day 21" but the sheet has one Create Task step at day 7; built once, add a second at day 21 if wanted (decision 16: a Wait then loop back to the same step). (c) C-PROP-01 has delay "Immediately" in the message record but window business hours; the sheet's business hours is used. Decision 6 lists other messages as immediate but not C-PROP-01; confirm.

---

## WF-12

```
Build a workflow called "WF-12 · Accept or decline button on a quote" in the folder "04. Quote". Keep it in draft.

Trigger: a quote is accepted or declined online, on the pipeline "Residential" and also on the pipeline "Commercial & Industrial".
Re-entry: allow re-entry (once per button press).
Timezone: Australia/Brisbane.

Steps, in this order:
1. If/Else: the quote was accepted.
   Yes branch:
   1a. If/Else: the contact has the tag is-active-job (an add-on or variation quote on a job already under way).
       Yes branch:
       1a-i. Update the opportunity: value plus the accepted add-on.
       1a-ii. Create a task. Title: "ADD-ON {{contact.first_name}}: accepted, update the job". Description: "An add-on or variation quote on a job already under way has been accepted. Check the value on the card, add it to the invoice schedule, and tell the crew if it changes the work on the day. No thank-you has gone and the card has not moved." Owner: Rachael Angus. Due: the same day.
       1a-iii. Remove from Workflow: end here. No thank-you, no alert, no stage move.
       No branch:
       1a-i. Update the field "Accepted Quote Option" to the option accepted.
       1a-ii. Update the opportunity: mark the other options on the job as not chosen, so only one can be accepted.
       1a-iii. Update the opportunity: move to the stage "Quote Accepted".
2. If/Else: the quote was declined.
   Yes branch:
   2a. Update the opportunity: status Lost, with the Lost Reason asked for.
   2b. Do nothing else. The email LOST-01 follows from WF-15; nothing is sent here.

Settings: stop on reply is off. No messages are sent in this workflow.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger covers accept and decline on both pipelines; re-entry allowed.
2. The nested is-active-job check has the add-on branch (value, ADD-ON task, end) and the normal branch (option, other options not chosen, move to Quote Accepted).
3. Declined branch sets Lost with a reason and sends nothing.
4. The ADD-ON task text matches exactly and is for Rachael Angus due today.
5. No SMS or email step anywhere; saved as draft.

Open items: "opportunity value" and "status" are platform fields, not custom fields. The decline reason prompt ("the reason asked for") is not specified in the sheet; the platform's Lost Reason list is used (decision 10). Phone acceptances and purchase orders are moved by hand and go straight to WF-14.

---

## WF-13

```
Build a workflow called "WF-13 · Follow-Up: callback requested" in the folder "04. Quote". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Follow-Up", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial".
Re-entry: allow re-entry; a new "Callback At" value restarts it.
Timezone: Australia/Brisbane.

Steps, in this order:
1. Add tag: been-contacted.
2. Require the field "Callback At" on this stage change (the stage form must not close without it).
3. Remove the contact from the workflows "WF-06 · Dial 2: the email sequence", "WF-10 · Quote sent and the follow-up" and "WF-11 · Proposal sent and the follow-up" (this is the pause; a person re-adds the contact to resume).
4. Create a task. Title: "CALL {{contact.first_name}}: callback as asked". Description: "The customer asked to be rung at this time. Ring them, then move the card on: Quoting if they now want a quote, Quote Accepted if they say yes to a quote already sent, Nurture if it is not now, or Lost with a reason. Want more time on a quote? Set a new callback time." Owner: Rachael Angus. Due: at the time in "Callback At".
5. Wait until 1 day after "Callback At".
6. If/Else: the opportunity is still in the stage "Follow-Up".
   Yes branch:
   6a. Update the contact so it is listed under "Callbacks overdue" in the daily summary. Use a contact field or flag named "Callbacks Overdue".

Settings: stop on reply is off. No messages are sent. The workflow ends when the stage changes. A new "Callback At" restarts it.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a stage change to Follow-Up on both pipelines; re-entry allowed.
2. Callback At is required on the stage change (a move without it is refused).
3. Removal from WF-06, WF-10 and WF-11 is present.
4. Task title and description exact; due at Callback At for Rachael Angus.
5. Wait until 1 day after Callback At, then the overdue flag only if still in Follow-Up; saved as draft.

Open items: the pause on WF-06, WF-10 and WF-11 has no resume rule in the sheet; decision 8 says a person re-adds the contact by hand. "Require Callback At" may need to be set on the pipeline stage form rather than inside the workflow. The "Callbacks overdue" field or flag is not named in the sheet; "Callbacks Overdue" is a placeholder.
