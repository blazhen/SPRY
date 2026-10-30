# Quote Hub: workflow changes and new workflows (SprayIT Solutions - Dev)

What this is: the Quote Hub is a web page inside the CRM. It reads and writes the CRM through the API. It does not send any email or text to the main contact. It only writes data and moves the card, and workflows send the messages. This file lists every workflow that is new or changed because of that, with a paste-ready Ask AI prompt for each.

How to use (same as the other prompt files):
- Dev sub-account only: SprayIT Solutions - Dev (location 5M1zrDbimF17cM16mtmR). Never the live account.
- Create the fields and tags in section 2 first, then the two new message templates in section 5, then paste prompts.
- One workflow at a time: Automation, Workflows, Ask AI, paste the whole fenced block, let it build, run the check in section 6. Keep everything in draft. Do not publish.
- For a CHANGED workflow, either rebuild it from the prompt (delete or rename the old draft first) or open the old one and compare. Each prompt is a full rebuild, so it can be pasted alone.
- Roles as in the other files: OWNER = Glenn Angus. OFFICE = Rachael Angus. ESTIMATOR = Glenn Angus.
- Conventions as before: timezone Australia/Brisbane; customer send window 8am to 8pm Monday to Saturday; error alert 11 to Glenn Angus; stop on reply as stated.
- Anything marked GUESS is a platform feature I could not confirm. Each prompt says what to use instead if it is missing.
- What the Hub does, so the prompts make sense. When the owner presses Send, the Hub sets quote_number, quote_link, quote_sent_at, quote_revision, quote_valid_until, the value, and moves the stage to Quote Sent. When the customer accepts, the Hub sets accepted_quote_option and quote_accepted_at and moves the stage to Quote Accepted. For an add-on to a live job it instead adds the tag hub-addon-accepted, updates the value and does not move the stage. When the customer declines, the Hub sets status Lost with the lost reason. A revised quote (Rev 2 and later) adds the tag hub-quote-revised on top. One job is one opportunity with many contacts and companies attached by associations; each company's quote lives in the Hub. When one quote is accepted, the job moves to Quote Accepted and the Hub marks the other quotes Superseded in its own database (no workflow, so WF-43 is not used).
- Ordering rule for the Hub (tell the Hub builder): write all the fields first, then add the tag, then move the stage, so a workflow never starts before its data is there.

---

## 1. Summary table

| ID | New or changed | Why | Trigger | Depends on |
| --- | --- | --- | --- | --- |
| WF-09 | Changed | Task text names the job and points at the Hub | Stage changed to Quoting (no change) | none |
| WF-10 | Changed | Hub fills the fields; workflow only messages and follows up | Stage changed to Quote Sent, Residential | quote_revision, quote_sent_at, quote_valid_until |
| WF-11 | Changed | Same, for commercial | Stage changed to Quote Sent, Commercial & Industrial | quote_revision, quote_sent_at |
| WF-12 | Changed (rewritten) | Hub moves cards on accept and decline; this now handles add-on acceptance only | Tag added: hub-addon-accepted | tag hub-addon-accepted |
| WF-14 | Changed | No welcome for an add-on; make sure quote_accepted_at is set | Stage changed to Quote Accepted (and Po Number, as before) | quote_accepted_at, tag hub-addon-accepted |
| WF-15 | Changed (small) | LOG task title shows the job name; WF-41 and WF-42 added to the stop list | Status changed to Lost (no change) | none |
| All with tasks or alerts | Changed (title rule) | Task and alert titles show the job name | none (text only) | merge field for the opportunity name |
| WF-41 | New | Revised quote: new email and text, follow-up restarts at day 0 | Tag added: hub-quote-revised | quote_revision, tag hub-quote-revised, R-QUOTE-03, R-QUOTE-04 |
| WF-42 | New | Warn the office 7 days before a quote expires, tag it at expiry | Stage changed to Quote Sent, or tag hub-quote-revised added | quote_valid_until, tag hub-quote-expired |
| WF-43 | Not used | Gap in the numbering: when another company's quote wins, the Hub marks the others Superseded itself, so no workflow is needed | none | none |
| WF-44 | New | Tag cards waiting on the owner so the Hub To do list can filter | Stage changed (any), and Status changed | tag in-quote-queue |

Existing alert 14 (Assigned to you, sent by WF-38) already covers texting the owner. WF-44 does not send anything.

---

## 2. New fields and tags to create first (by hand)

Opportunity custom fields (Settings, Custom Fields, folder for the opportunity). Existing ones the Hub also uses already exist: quote_number, quote_link, quote_sent_at, accepted_quote_option.

| Name (label) | Key | Type | Where | Example |
| --- | --- | --- | --- | --- |
| Quote Revision | quote_revision | Number | Opportunity | 1 (first quote), 2 (first revision) |
| Quote Valid Until | quote_valid_until | Date | Opportunity | 29 December 2026 |
| Quote Accepted At | quote_accepted_at | Date | Opportunity | 3 November 2026 |

Not needed by any workflow below, so do not create them for this: quote_recipient_name, quote_response. (If the Hub wants them for its own use, the Hub builder can ask for them separately.)

Tags (Settings, Tags):

| Tag | Added by | Removed by | Used by |
| --- | --- | --- | --- |
| hub-addon-accepted | the Hub | WF-12 | WF-12, WF-14 |
| hub-quote-revised | the Hub | WF-41 | WF-41 |
| hub-quote-expired | WF-42 | the person who extends or closes the quote (by hand) | office list only, nothing triggers on it |
| in-quote-queue | WF-44 | WF-44 | the Hub To do list |

Nothing to add to the platform's Lost Reason list for the Hub.

---

## 3. CHANGED workflows

### Merge field for the job name (GUESS)

The title rule uses {{opportunity.name}}. I could not confirm the platform offers this merge field in workflow text. Before pasting anything, create a test task by hand in a workflow and look in the merge field picker for the opportunity name. If it is called something else, replace {{opportunity.name}} in every prompt below with the right one. If there is no such field at all, tell Dobby: the fallback is a custom field "Job Name" that the Hub fills in.

### WF-09 · Quoting: hand-over to the owner (changed: task text)

What changes: the task title shows the job name, and the description points at the Quote Hub. Nothing else.

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
   4a. Create a task. Title: "QUOTE {{opportunity.name}} ({{contact.first_name}}): write and send the quote". Description: "The office has spoken to them and they want a quote. Ring them first if you need more detail, plans or an energy report. Open the job in the Quote Hub, write the quote with each option as its own line if there is more than one, and press Send. Sending it moves the card to Quote Sent and starts the follow-up." Owner: Glenn Angus. Due: 2 business days.
   4b. Wait 2 business days.
   No branch (commercial):
   4a. Create a task. Title: "QUOTE {{opportunity.name}} ({{contact.first_name}}): scope and send the proposal". Description: "Ring them for the detail: who decides, roughly how big, what the space is used for, whether it is operating during the works, and the programme. Work out product, thickness, access, plant, staging and WHS, then write the proposal in the Quote Hub and press Send, which moves the card to Quote Sent." Owner: Glenn Angus. Due: 5 business days.
   4b. Wait 5 business days.
5. If/Else: the opportunity is still in the stage "Quoting".
   Yes branch:
   5a. Update the contact so it is listed under "Quotes to write" in the daily summary until it moves. Use a contact field or flag named "Quotes To Write".

Settings: stop on reply is off. No messages are sent. The workflow ends when the quote is sent or the card moves to Follow-Up, Nurture or Lost.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

### WF-10 · Quote sent and the follow-up (changed: trigger and fields)

What changes:
- Trigger is only "stage changed to Quote Sent". The "quote tool sent it" trigger goes, because the Hub does that job by moving the stage.
- The workflow no longer sets quote_sent_at, number, link or value. The Hub sets them. One safety step sets quote_sent_at only if it is empty (a card moved by hand).
- New first check: if quote_revision is greater than 1, end. A revised quote is handled by WF-41, so a card moved back to Quote Sent never gets the first-quote email again.
- Sends R-QUOTE-01 email and R-QUOTE-02 text to the main contact. Follow-up is unchanged. Re-entry is now allowed, so a job that is quoted again later (for example after Nurture) is followed up again. The first-step check stops double runs on revisions.

```
Build a workflow called "WF-10 · Quote sent and the follow-up" in the folder "04. Quote". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Quote Sent", on the pipeline "Residential" only. This is the only trigger. (The Quote Hub writes the quote fields and then moves the card to Quote Sent.)
Re-entry: allow re-entry.
Timezone: Australia/Brisbane. Days count from the moment this workflow starts. Messages marked "send window" wait for 8am to 8pm, Monday to Saturday.

Steps, in this order:
1. If/Else: the opportunity custom field "Quote Revision" is greater than 1.
   Yes branch: Remove from Workflow, end here. (A revised quote is handled by a different workflow, WF-41.)
2. Remove the contact from the workflows "WF-06 · Dial 2: the email sequence" and "WF-16" (if either is running).
3. If/Else: the opportunity custom field "Quote Sent At" is empty.
   Yes branch: update "Quote Sent At" to now. (Safety step for a card moved by hand. When the Quote Hub sent the quote this field is already filled, so do not overwrite it.)
4. Add tags: been-contacted, been-quoted. Remove tag: is-nurturing.
5. Send email to the main contact using the template "R-QUOTE-01 · Quote sent email", immediately. Subject, preview and from name are already set on the template.
6. Send SMS to the contact, immediately, with this exact text: "Hi {{contact.first_name}}, your quote is in your inbox. You can accept it online from the email. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
7. Create a task. Title: "CALL {{opportunity.name}} ({{contact.first_name}}): quote follow up". Description: "Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence." Owner: Rachael Angus. Due: day 2.
8. Wait until day 2.
9. Wait until the send window, then send SMS to the contact with this exact text: "Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}"
10. Wait until day 5.
11. Wait until the send window, then send email using the template "R-FU-02 · Quote day 5 why quotes differ".
12. Wait until day 10.
13. Wait until the send window, then send SMS to the contact with this exact text: "Hi {{contact.first_name}}, still thinking it over, or has something changed? Either is fine, we just want to know whether to keep it open. {{custom_values.sms_signoff}}"
14. Wait until day 21.
15. Wait until the send window, then send email using the template "R-FU-04 · Quote day 21 final close".
16. Create a task. Title: "DECIDE {{opportunity.name}} ({{contact.first_name}}): accepted, nurture or lost". Description: "Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting." Owner: Rachael Angus. Due: day 21.

Settings: stop on reply is on. The workflow also ends if the customer accepts or declines, or the card leaves Quote Sent.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

### WF-11 · Proposal sent and the follow-up (changed: same for commercial)

What changes: same as WF-10 for the Commercial & Industrial board. Trigger only the stage change. The revision guard is added. The Hub fills the fields.

```
Build a workflow called "WF-11 · Proposal sent and the follow-up" in the folder "04. Quote". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Quote Sent", on the pipeline "Commercial & Industrial" only. This is the only trigger. (The Quote Hub writes the proposal fields and then moves the card to Quote Sent.)
Re-entry: allow re-entry.
Timezone: Australia/Brisbane. Days count from the moment this workflow starts. All three emails wait for the send window: 8am to 8pm, Monday to Saturday.

Steps, in this order:
1. If/Else: the opportunity custom field "Quote Revision" is greater than 1.
   Yes branch: Remove from Workflow, end here. (A revised proposal is handled by a different workflow, WF-41.)
2. If/Else: the opportunity custom field "Quote Sent At" is empty.
   Yes branch: update "Quote Sent At" to now. (Safety step for a card moved by hand. Do not overwrite it when it is already filled.)
3. Add tags: been-contacted, been-quoted. Remove tag: is-nurturing.
4. Wait until the send window, then send email to the main contact using the template "C-PROP-01 · Commercial proposal sent".
5. Create a task. Title: "CALL {{opportunity.name}} ({{contact.first_name}}): confirm receipt". Description: "Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it." Owner: Glenn Angus. Due: 2 days.
6. Wait until day 7.
7. Wait until the send window, then send email using the template "C-PROP-02 · Commercial proposal day 7".
8. Create a task. Title: "CHASE {{opportunity.name}} ({{contact.first_name}}): decision date". Description: "Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity." Owner: Glenn Angus. Due: day 7.
9. Wait until day 21.
10. Wait until the send window, then send email using the template "C-PROP-03 · Commercial proposal day 21".

Settings: stop on reply is on. The workflow also ends if the customer accepts, or the card moves to Follow-Up, Nurture or Lost.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

### WF-12 · Add-on quote accepted (changed: rewritten)

What WF-12 still does, in plain words:
- Before: it listened for the accept and decline buttons and moved the card.
- Now: the Hub moves the card itself. Accept (normal job) sets the option and the stage, and WF-14 follows. Decline sets status Lost, and WF-15 follows. WF-12 does neither of those any more.
- WF-12 now does one job only: when the Hub adds the tag hub-addon-accepted (an add-on or variation accepted on a live job), it tasks the office to update the job, then removes the tag. No thank-you, no alert, no stage move. The Hub has already updated the value.
- New name: "WF-12 · Add-on quote accepted". Rename or delete the old draft.

```
Build a workflow called "WF-12 · Add-on quote accepted" in the folder "04. Quote". Keep it in draft.

Trigger: Contact Tag, tag added, the tag is "hub-addon-accepted". (If your builder only offers a tag trigger on contacts and not on opportunities, use that. If it offers neither, tell me and use instead: Opportunity Changed, where the opportunity custom field "Accepted Quote Option" or the opportunity value changes, and then stop and list what you used.)
Re-entry: allow re-entry (once per add-on accepted).
Timezone: Australia/Brisbane.

Steps, in this order:
1. If/Else: the contact has the tag "is-active-job".
   Yes branch:
   1a. Create a task. Title: "ADD-ON {{opportunity.name}} ({{contact.first_name}}): accepted, update the job". Description: "An add-on or variation quote on a job already under way has been accepted. The value on the card is already updated. Add it to the invoice schedule, and tell the crew if it changes the work on the day. No thank-you has gone and the card has not moved." Owner: Rachael Angus. Due: the same day.
   No branch:
   1a. Create a task. Title: "CHECK {{opportunity.name}} ({{contact.first_name}}): add-on accepted but no live job". Description: "The Quote Hub marked an add-on as accepted, but this contact is not marked as having a live job. Check the card, then update the job or move the card by hand." Owner: Rachael Angus. Due: the same day.
2. Remove tag: hub-addon-accepted.

Settings: stop on reply is off. No messages are sent to the customer. No stage move. No change to the value (the Quote Hub already did it).
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

### WF-14 · Quote accepted (changed: add-on guard and accepted date)

What changes: if the card carries the tag hub-addon-accepted, end at once (no second welcome). If quote_accepted_at is empty (a phone acceptance moved by hand), set it to now. Everything else is as before. The title rule is applied to the two tasks and the alert text.

```
Build a workflow called "WF-14 · Quote accepted" in the folder "05. Accepted, lost and nurture". Keep it in draft.

Trigger: Pipeline Stage Changed, to the stage "Quote Accepted", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Add a second trigger: the opportunity custom field "Po Number" is updated (has a value) on an opportunity on the pipeline "Commercial & Industrial" that is in the stage "Quote Accepted". Re-entry: do NOT allow a contact to enter again (a job is welcomed once). Timezone Australia/Brisbane.

Steps, in this order:
1. If/Else: the contact has the tag "hub-addon-accepted". If yes, end the workflow here. (An add-on on a live job is never welcomed again.)
2. If/Else: the opportunity has come back to "Quote Accepted" from a later stage. If yes, end the workflow here.
3. If/Else: the opportunity custom field "Quote Accepted At" is empty. If yes, update "Quote Accepted At" to now. (The Quote Hub fills it when the customer accepts online. A phone acceptance moved by hand does not, so fill it here. Do not overwrite a value that is already there.)
4. Remove the contact from these workflows, before anything else that follows: "WF-06", "WF-10", "WF-11", "WF-13", "WF-16", "WF-41", "WF-42" (stop every sales sequence on the card). Skip any that do not exist yet. Do NOT remove them from "WF-07".
5. Add tags "been-accepted" and "is-active-job". Remove tags "is-nurturing", "is-stalled" and "is-unresponsive".
6. If/Else: the opportunity is on the pipeline "Residential".
   If yes:
   a. Update the opportunity status to Won.
   b. Send email using the template "X-ACC-01 · Quote accepted email". Subject, preview and from name are already set on the template. Send immediately, no time window.
   c. Send an SMS to the contact immediately, no time window, with this exact text: "Thanks {{contact.first_name}}, quote accepted. We will be in touch shortly to book your install date. {{custom_values.sms_signoff}}"
   Else (Commercial & Industrial):
   a. Send email using the template "C-PO-01 · Commercial awaiting PO". Subject, preview and from name are already set on the template. Send immediately, no time window.
   b. If/Else: the quote was accepted online, or signed, or the field "Po Number" is set.
      If yes: update the opportunity status to Won.
      Else: create a task. Title: "CHASE {{opportunity.name}} ({{contact.first_name}}): purchase order". Description: "A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work." Assign to the user with the role OFFICE. Due in 7 days, and repeat weekly until the purchase order lands (Wait 7 days, then loop back to this task step while "Po Number" is empty).
7. Send an internal notification, alert 8 (Quote accepted): to OWNER (Glenn) by SMS and email, and to OFFICE by email and in-app notification. Message: "Quote accepted: {{opportunity.name}} ({{contact.first_name}} {{contact.last_name}})."
8. Update the opportunity custom fields "Deposit Amount" and "Foam Order Type" from the accepted quote, where a deposit applies. Do not create an invoice.
9. Create a task. Title: "NEXT {{opportunity.name}} ({{contact.first_name}}): inspection or booking". Description: "The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked." Assign to OWNER (Glenn). Due the same day.

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

### WF-15 · Lost (changed, small: title rule and the two new workflows in the stop list)

Only two small changes: the LOG task title gets the job name, and WF-41 and WF-42 are added to the stop list. Everything else is as before. A customer decline on the Hub customer page sets status Lost with the reason, and this workflow follows as it always did. There is no special case for other companies: the job is not lost when another company wins, see the note where WF-43 would have been.

```
Build a workflow called "WF-15 · Lost" in the folder "05. Accepted, lost and nurture". Keep it in draft.

Trigger: Opportunity Status Changed, to Lost, on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow a contact to enter again (a card can be lost again after reopening). Timezone Australia/Brisbane.

Steps, in this order:
1. Require a lost reason on the status change, using the platform's own Lost Reason list (the status change must not close without one). If the builder cannot enforce this inside a workflow, leave a note on the workflow and do not invent a step.
2. Remove the contact from these workflows: "WF-06", "WF-07", "WF-09", "WF-10", "WF-11", "WF-16", "WF-21", "WF-24", "WF-25", "WF-41", "WF-42". Skip any that do not exist yet.
3. Add the tag "been-lost". Remove the tags "is-active-job" and "is-deposit-owing".
4. Create a task. Title: "LOG {{opportunity.name}} ({{contact.first_name}}): lost reason". Description: "Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes." Assign to the user with the role OFFICE. Due the same day.
5. If/Else: the opportunity is on the pipeline "Residential", and the lost reason is not "Unreachable", not "Duplicate" and not "Spam".
   If yes:
   a. Wait until the next business morning.
   b. Wait until the time window 8am to 8pm, Monday to Saturday.
   c. Send email using the template "LOST-01 · Thanks for considering us". Subject, preview and from name are already set on the template.

Workflow settings: do not stop on reply. Error handling: on any failed step, send internal notification alert 11 (Automation failure) to OWNER (Glenn) by SMS and email with the workflow name and the contact. Do not add any other steps. Do not publish.
```

### The global task and alert title rule

Pattern: `VERB {{opportunity.name}} ({{contact.first_name}}): detail`. Example: "CALL Smith Roof Cavity (Sam): quote follow up". Why: one customer can have several jobs, and a task that only says "Sam" does not say which one.

Rules for the rule:
- Change only the title or message text. Never the description, due date, owner, trigger or steps.
- Alerts (internal notification messages) follow the same pattern when they name only the contact.
- Leave alone anything that runs before a job exists, or where the customer is not tied to one job: WF-01, WF-02, WF-03, WF-04 (alerts there say who rang or enquired, and the job may not exist yet). WF-01's CALL task may be updated only if the builder shows the opportunity name there after the opportunity is created; otherwise leave it.
- WF-09, WF-10, WF-11, WF-12, WF-14, WF-15 already have the rule in their prompts above. Do not run the reusable prompt on 04 and 05 as well, unless to check.

Reusable prompt (change the folder name and the workflow list each time, paste one folder at a time). Use it to edit the existing drafts, not to rebuild them.

```
Open the workflow folder "FOLDER NAME" in Automation, Workflows, in this sub-account. Only edit these workflows: LIST OF WORKFLOWS. Keep them in draft. Do not publish.

In each of those workflows, find every "Create task" step and every "Internal notification" step. Change only the title (for tasks) or the message text (for notifications), and only where it uses {{contact.first_name}} on its own, or {{contact.name}} on its own, to name the customer. Use this pattern:

VERB {{opportunity.name}} ({{contact.first_name}}): detail

Keep the same VERB in capitals and keep the same detail text as it is now. Example: "CALL {{contact.first_name}}: second round of calls" becomes "CALL {{opportunity.name}} ({{contact.first_name}}): second round of calls". Example: "CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}" becomes "CHECK-IN {{opportunity.name}} ({{contact.first_name}}): {{opportunity.site_address}}".

Do not change any task description, due date, assignee, wait, trigger, condition, SMS, email, tag or any other step. Do not add or remove steps. If a title already contains {{opportunity.name}}, leave it. If {{opportunity.name}} is not offered as a merge field, stop and tell me.

When you are done, list each workflow with the old and new title of every task and notification you changed.
```

Which workflows have tasks or alerts to update, by folder (from CRM-WORKFLOWS.md):

| Folder | Workflows to run it on | What changes |
| --- | --- | --- |
| 01. Intake | none (see rule above) | WF-01 CALL task only if the opportunity name shows there; WF-03 RING BACK has no job, leave |
| 02. Dial 1 and Dial 2 | WF-05, WF-06 | CALL second round of calls; CALL one more try |
| 03. Phone calls | WF-08 | CALL phone call cancelled (WF-07 has no task) |
| 04. Quote | WF-13 (WF-09 to WF-12 done above) | CALL callback as asked |
| 05. Accepted, lost and nurture | WF-16 (WF-14 and WF-15 done above) | CHECK-IN a year since the quote; CHECK-IN site address; REVIEW still a fit |
| 06. Site inspection | WF-17, WF-18 | ATTEND inspection; REBOOK inspection cancelled |
| 07. Booking and reminders | WF-19, WF-21, WF-22, WF-23 | BOOK install date; BOOK works dates; CALL date not confirmed; RESCHEDULE; VARIATIONS record any extras; UPDATE weekly progress (WF-20 has no task) |
| 08. Deposit | WF-24, WF-25 | INVOICE deposit invoice; CHASE deposit unpaid (WF-26 has no task) |
| 09. Completion and payment | WF-27, WF-28, WF-29, WF-32 | INVOICE final invoice; REVIEW Google review; CHASE payment overdue; CHASE claim overdue; SEND job report; REFERENCE ask; progress claim CHASE claim overdue (WF-30, WF-31 have no task) |
| 10. Retention | WF-33 | CLAIM retention; CHASE retention unpaid |
| 11. Always on | WF-34, WF-37, and check the alert text in WF-36 and WF-38 | REPLY they messaged; CALL review or complaint today; alert 14 text if it names only the contact |
| 12. Reporting | none | no tasks or alerts about one job |

Each prompt above for these folders is the same block with FOLDER NAME and LIST OF WORKFLOWS filled in. Example for folder 02: FOLDER NAME = "02. Dial 1 and Dial 2", LIST OF WORKFLOWS = WF-05, WF-06.

---

## 4. NEW workflows

### WF-41 · Revised quote sent

Folder: "04. Quote". The Hub adds the tag hub-quote-revised when it sends Rev 2 or later, after it has written the new quote_revision, quote_link, quote_sent_at, quote_valid_until and value. The stage is normally already Quote Sent, so no stage change happens.

What it does: stops the old follow-up on the card (WF-10 or WF-11), sends the new email R-QUOTE-03 and text R-QUOTE-04 to the main contact, and runs a fresh follow-up from day 0 without the first-quote email. It removes the tag at the end so Rev 3 can trigger it again.

Design choice (simplest): the follow-up steps are copied into WF-41, rather than jumping back into WF-10. This is because I cannot confirm the builder can start WF-10 part way. Open question at the end.

```
Build a workflow called "WF-41 · Revised quote sent" in the folder "04. Quote". Keep it in draft.

Trigger: Contact Tag, tag added, the tag is "hub-quote-revised". (If your builder only offers tag triggers on contacts, use that. If it offers neither a contact tag nor an opportunity tag trigger, tell me and use instead: Opportunity Changed, where the opportunity custom field "Quote Revision" changes, then stop and list what you used.)
Re-entry: allow re-entry (once per revision).
Timezone: Australia/Brisbane. Days count from the moment this workflow starts. Messages marked "send window" wait for 8am to 8pm, Monday to Saturday.

Steps, in this order:
1. Remove the contact from the workflows "WF-10 · Quote sent and the follow-up" and "WF-11 · Proposal sent and the follow-up" and "WF-42 · Quote expiring" (if any is running), so the old follow-up stops.
2. Add tags: been-contacted, been-quoted. Remove tag: is-nurturing.
3. Send email to the main contact using the template "R-QUOTE-03 · Revised quote email", immediately. Subject, preview and from name are already set on the template.
4. Send SMS to the contact, immediately, with this exact text: "Hi {{contact.first_name}}, we have sent you a revised quote. It replaces the last one, and the link in the new email is the one to use. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
5. Remove tag: hub-quote-revised.
6. Add the contact to the workflow "WF-42 · Quote expiring", so the expiry dates restart for the new quote.
7. If/Else: the opportunity is on the pipeline "Residential".
   Yes branch (residential follow-up, restarted from day 0):
   7a. Create a task. Title: "CALL {{opportunity.name}} ({{contact.first_name}}): revised quote follow up". Description: "Ring two days after the revised quote went out. Ask whether it arrived and whether the changes answer what they asked for." Owner: Rachael Angus. Due: day 2.
   7b. Wait until day 2. Then wait until the send window, then send SMS to the contact with this exact text: "Hi {{contact.first_name}}, did the revised quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}"
   7c. Wait until day 5. Then wait until the send window, then send email using the template "R-FU-02 · Quote day 5 why quotes differ".
   7d. Wait until day 10. Then wait until the send window, then send SMS to the contact with this exact text: "Hi {{contact.first_name}}, still thinking it over, or has something changed? Either is fine, we just want to know whether to keep it open. {{custom_values.sms_signoff}}"
   7e. Wait until day 21. Then wait until the send window, then send email using the template "R-FU-04 · Quote day 21 final close".
   7f. Create a task. Title: "DECIDE {{opportunity.name}} ({{contact.first_name}}): accepted, nurture or lost". Description: "Twenty-one days with no decision on the revised quote. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting." Owner: Rachael Angus. Due: day 21.
   No branch (commercial follow-up, restarted from day 0):
   7a. Create a task. Title: "CALL {{opportunity.name}} ({{contact.first_name}}): confirm receipt of revised proposal". Description: "Ring two days after the revised proposal to confirm it arrived and reached the right person." Owner: Glenn Angus. Due: 2 days.
   7b. Wait until day 7. Then wait until the send window, then send email using the template "C-PROP-02 · Commercial proposal day 7".
   7c. Create a task. Title: "CHASE {{opportunity.name}} ({{contact.first_name}}): decision date". Description: "Ask for a decision date, not for a decision." Owner: Glenn Angus. Due: day 7.
   7d. Wait until day 21. Then wait until the send window, then send email using the template "C-PROP-03 · Commercial proposal day 21".

Settings: stop on reply is on. The workflow also ends if the customer accepts or declines, or the card leaves Quote Sent. It must never send the template "R-QUOTE-01 · Quote sent email".
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

### WF-42 · Quote expiring

Folder: "04. Quote". Runs from the moment a quote is sent. One week before quote_valid_until, if the card is still in Quote Sent, the office gets a task to extend or close. At expiry it adds the tag hub-quote-expired. It sends nothing to the customer.

Safety design: after each wait the workflow checks the date again. A revised quote moves quote_valid_until, and WF-41 restarts this workflow, but an old copy that wakes early finds the date still in the future and does nothing.

GUESS: "Wait until a date held in a custom field, minus 7 days" may not exist. The prompt gives the fallback.

```
Build a workflow called "WF-42 · Quote expiring" in the folder "04. Quote". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Quote Sent", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Also allow it to be started by "Add to Workflow" from WF-41.
Re-entry: allow re-entry. If the builder offers "restart" or "replace the earlier run" for a contact who enters again, choose that. If it does not, leave it as plain re-entry.
Timezone: Australia/Brisbane.

Steps, in this order:
1. Wait 2 minutes (so the Quote Hub has finished writing the quote fields).
2. If/Else: the opportunity custom field "Quote Valid Until" is empty. If yes, end here.
3. Wait until 7 days before the date in the opportunity custom field "Quote Valid Until", at 8am. (If the builder cannot wait until a date held in a custom field, do this instead: wait 53 days from the moment the workflow starts, and tell me you used that fallback. 53 is the default 60 day validity minus 7.)
4. If/Else, all of these true: the opportunity is still in the stage "Quote Sent"; the date in "Quote Valid Until" is 7 days or less from today. (If either is false, end here: the quote moved on, or it was revised and the date is now later.)
   Yes branch:
   4a. Create a task. Title: "EXTEND OR CLOSE {{opportunity.name}} ({{contact.first_name}}): quote expires in 7 days". Description: "The quote on this job runs out in a week and the customer has not answered. Ring them. If they still want it, send a revised quote in the Quote Hub with a new valid-until date. If not, move the card to Nurture or Lost with a reason. Nothing is sent to the customer by this workflow." Owner: Rachael Angus. Due: today.
5. Wait until the date in the opportunity custom field "Quote Valid Until", at 8am. (Same fallback: wait 7 more days.)
6. If/Else, all of these true: the opportunity is still in the stage "Quote Sent"; the date in "Quote Valid Until" is today or earlier.
   Yes branch:
   6a. Add tag: hub-quote-expired.
   6b. Create a task. Title: "EXPIRED {{opportunity.name}} ({{contact.first_name}}): quote has expired". Description: "The quote has passed its valid-until date with no answer. The card has not moved. Decide: send a revised quote from the Quote Hub, move it to Nurture, or close it as Lost with a reason. Nothing has been sent to the customer." Owner: Rachael Angus. Due: today.

Settings: stop on reply is off. No messages of any kind are sent to the customer in this workflow. No stage move and no status change. The workflow ends if the card leaves Quote Sent.
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

### WF-43: not used (number kept free)

No workflow. One job is one opportunity, with many contacts and companies attached by associations, and each company's quote lives in the Hub. When one quote is accepted, the job moves to Quote Accepted (WF-14 follows) and the Hub marks the other quotes Superseded in its own database. The job is not set to Lost, so nothing here needs a workflow. The numbering stays WF-41, WF-42, WF-44 so the gap is visible.

### WF-44 · Hub quote queue tag

Folder: "11. Always on". Texting the owner when a card lands on him is already done by alert 14 (WF-38). This workflow only adds a tag so the Hub's To do list can filter the cards waiting for a quote, and removes it when the card leaves Quoting or is closed.

GUESS: a trigger on "stage changed" with no stage chosen, and a second trigger on "status changed", should both exist. If the builder only allows a stage to be chosen, use the fallback in the prompt.

```
Build a workflow called "WF-44 · Hub quote queue tag" in the folder "11. Always on". Keep it in draft.

Trigger 1: Pipeline Stage Changed, to any stage, on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". (If the builder requires a stage to be chosen, make one trigger for "Quoting" and a second trigger for every other stage, and tell me.)
Trigger 2: Opportunity Status Changed, to any status (Won, Lost, Abandoned), on both pipelines.
Re-entry: allow re-entry. Timezone Australia/Brisbane.

Steps, in this order:
1. If/Else: the opportunity is in the stage "Quoting" and its status is Open and it is assigned to Glenn Angus.
   Yes branch:
   1a. Add tag: in-quote-queue.
   No branch:
   1a. Remove tag: in-quote-queue.

Settings: stop on reply is off. Send nothing: no SMS, no email, no internal notification, no task. (Alert 14 is sent by a different workflow.)
Error handling: on any failed step, send Internal Notification alert 11 to Glenn Angus by SMS and email with the workflow name and the contact name.
Do not add any other steps. Do not publish.
```

---

## 5. New message templates

Create these two in Dev before WF-41. Style as in CRM-MESSAGING.md: plain, friendly, Australian, short. Email body is plain text with the sign-off block. SMS ends with the custom value sign-off.

### R-QUOTE-03 · Email · Revised quote sent, tag hub-quote-revised added · TRANS · CORE

Template name in the platform: "R-QUOTE-03 · Revised quote email"

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>
**Reply-to:** {{custom_values.business_email}}
**Subject:** Your revised quote from {{custom_values.business_name}}
**Preheader:** Quote {{opportunity.quote_number}}, revision {{opportunity.quote_revision}}. It replaces the last one. Have a look and accept online.

```
Hi {{contact.first_name}},

Thanks for your feedback. We have updated your quote and the new version is ready. Quote number {{opportunity.quote_number}}, revision {{opportunity.quote_revision}}.

View it, and accept or decline it online, here: {{opportunity.quote_link}}

This one replaces the last quote, so please use this link and ignore the old one. If we have quoted more than one option, each option has its own accept button. Accept the one you want.

It is valid until {{opportunity.quote_valid_until}}. After that the price may change, mostly because material costs move.

If anything in it does not make sense, ring us. We would rather explain it than have you accept something you are unsure about.

Any questions at all, {{custom_values.contact_mobile}}.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

Placeholders to flag:
- {{opportunity.quote_number}}, {{opportunity.quote_revision}}, {{opportunity.quote_link}}, {{opportunity.quote_valid_until}}: custom field merge tags. Confirm the quote_revision and quote_valid_until tags show in the merge picker after you create the fields (section 2).
- {{opportunity.quote_valid_until}} prints as a date. GUESS: the platform's default date format may not be the Australian day, month, year order. Send yourself a Dev test and check how it reads. If it reads badly, change the field to Text and have the Hub write the date as words, for example "29 December 2026".
- "Thanks for your feedback" assumes the customer asked for a change. If the owner also revises for his own reasons (for example a price update), use this softer line instead: "We have updated your quote and the new version is ready." Open question 8.
- "mostly because material costs move" repeats the wording of R-QUOTE-01. Confirm with the owner once the validity period is settled (open question 1).

*Stops:* Sends once per revision. *Window:* sends immediately.

### R-QUOTE-04 · SMS · Revised quote sent, immediately · TRANS · CORE

Template name in the platform: "R-QUOTE-04 · Revised quote SMS"

```
Hi {{contact.first_name}}, we have sent you a revised quote. It replaces the last one, and the link in the new email is the one to use. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}
```

Placeholders to flag: {{custom_values.contact_mobile}} and {{custom_values.sms_signoff}} are existing custom values (already in use in R-QUOTE-02). Nothing new. The text is also written inline in the WF-41 prompt, so the workflow builds even if the template does not exist yet.

*Stops:* Sends once per revision. *Window:* sends immediately.

Related change, not done here: R-QUOTE-01 says "valid for 30 days". The Hub default is 60. Either change the sentence in R-QUOTE-01 to use {{opportunity.quote_valid_until}}, or set the Hub to 30. See open question 1.

---

## 6. After-build checks and one test each

Rules for every test: Dev sub-account (SprayIT Solutions - Dev) only. Use a made-up contact, for example "Test Quoteson", email test.quoteson@example.com, and a made-up job name such as "TEST roof cavity". The Dev account must not send real messages. For any step that sends an SMS or email, read the workflow's execution log instead of sending, or use your own phone number only after telling Dobby first (the same rule as the pilot prompt). Never use a real customer. Stage and tag changes done by the Hub's API may behave differently from changes done on screen: test once with the Hub (or its API script) and once by hand, and say which you used.

Common check on every built workflow: it is saved as draft, the error branch to alert 11 is set, no extra steps were added, and no live-account name or ID appears.

| Workflow | Look at in the builder | Test (made-up contact, Dev only) |
| --- | --- | --- |
| WF-09 | Trigger Quoting on both pipelines. Both task titles have {{opportunity.name}} and the Hub wording. Due dates 2 and 5 business days. | Move a test card to Quoting. See the task with the job name in the title, assigned to Glenn. No customer message. |
| WF-10 | Only one trigger (Quote Sent, Residential). First step is the Quote Revision greater than 1 check, which ends the workflow. Quote Sent At only set when empty. R-QUOTE-01 and the R-QUOTE-02 text are immediate. Waits are days 2, 5, 10, 21. | Fill quote_revision = 1, quote_sent_at, quote_valid_until by hand, then move the card to Quote Sent. Log shows R-QUOTE-01 and the text, and the CALL task with the job name. Then set quote_revision = 2 and move the card out and back to Quote Sent: the log shows the workflow ended at step 1 and nothing sent. |
| WF-11 | Same as WF-10 on Commercial & Industrial. Templates C-PROP-01, 02, 03. | Same test on a commercial test card. Log shows C-PROP-01 and the CALL confirm receipt task. |
| WF-12 | Trigger is the tag hub-addon-accepted. There is no stage move, no value change, no message, no SMS, no email. Tag is removed at the end. | Give a test card the tag is-active-job, then add the tag hub-addon-accepted. See the ADD-ON task for Rachael and the tag gone. Card stage unchanged. Repeat without is-active-job: the CHECK task appears instead. |
| WF-14 | Add-on guard is the first step, then the come-back check. Quote Accepted At is set only if empty. Stop list includes WF-41 and WF-42. | (a) Move a test card to Quote Accepted by hand with quote_accepted_at empty: field gets filled, welcome email and text show in the log, tasks have the job name. (b) Try again on another card that has the tag hub-addon-accepted: the log shows it ended at step 1. Also test that a stage change made by the Hub API starts the workflow. |
| WF-15 | LOG task title has the job name. Stop list includes WF-41 and WF-42. LOST-01 still behind the next-morning wait and window. | Set a test card to Lost with reason Price: LOG task and (after the wait) LOST-01 in the log. |
| Title rule (each folder) | Open each listed workflow. Every task title and notification message has the new pattern. Descriptions, dates, owners unchanged. The model's change list matches what you see. | Run one workflow of the folder with a test card (for example WF-05 for folder 02) and read the task title. |
| WF-41 | Tag trigger. First step removes WF-10, WF-11, WF-42. Email is R-QUOTE-03 and the text matches. Tag is removed after the messages. No R-QUOTE-01 anywhere. Follow-up delays are 2, 5, 10, 21 (residential) and 2, 7, 21 (commercial). | On a test card already in Quote Sent with WF-10 running, set quote_revision = 2 and a new quote_valid_until, then add the tag hub-quote-revised. Log shows WF-10 removed, R-QUOTE-03 and R-QUOTE-04 sent once, tag gone, a new CALL task with the job name. |
| WF-42 | Two waits use the date field (or the 53 day fallback if you accepted it). Both checks need "still in Quote Sent". No message step at all. | Set quote_valid_until to 7 days from today, move the card to Quote Sent. Task EXTEND OR CLOSE appears for Rachael. Then set the date to today and re-run: the tag hub-quote-expired appears and the card does not move. Check the customer's message history: nothing new. |
| WF-43 | Not built. | Test in the Hub instead: with two quotes on one test job, accept one. The job goes to Quote Accepted once, WF-14 runs once, the other quote shows Superseded in the Hub, and the job is not Lost. |
| WF-44 | Two triggers. Only tag steps. No messages, no tasks. | Move a test card (assigned to Glenn) to Quoting: tag in-quote-queue appears. Move it to Quote Sent: the tag goes. Move it back to Quoting and set status Lost: the tag goes. |

---

## 7. Open questions for the owner

1. Validity: is the Hub's 60 days a quote validity or the payment terms? R-QUOTE-01 says the quote is valid for 30 days. Which is right for SprayIT Solutions? Whichever is chosen, set the Hub default to it and change that one sentence in R-QUOTE-01 (best to use {{opportunity.quote_valid_until}} so the wording never drifts). WF-42's 53 day fallback also depends on it.
2. Several contacts and companies on one job: the follow-up (WF-10, WF-11, WF-41) goes to the main contact of the job only. Should the extra contacts get the follow-up too, or only the first quote email? Simplest chosen: main contact only.
3. Several companies quoting the same job: this is one opportunity with many quotes held in the Hub. Workflows run on the job, not per quote. If two quotes are sent on the same job, WF-10 and WF-42 run once per stage change, so a second company's quote sent while the job is already in Quote Sent triggers WF-41 or nothing, not a fresh WF-10. Confirm this is wanted, and how the Hub should flag a second quote (for example the same hub-quote-revised tag, or no tag).
   Follow-up messages for a quote go to the contact that quote was sent to: the main contact via these workflows, and extra contacts by the Hub itself through the API (not yet tested; test that a message sent by the Hub appears in that contact's history and obeys stop on reply and the send window).
4. Revised-quote follow-up: I copied the follow-up steps into WF-41, so there are two copies to keep the same. If the platform lets one workflow jump into another at a given step, we could remove the copy. Is the duplication acceptable?
5. Expiry: should an expired quote only get a tag and a task (as built), or should the card also move to Nurture automatically after a few days? Simplest chosen: tag and task only.
6. WF-43 is deliberately unused (the Hub marks other quotes Superseded; the job is not lost). Confirm the Hub, not a workflow, also stops any follow-up going to extra contacts of a superseded quote.
7. Declines from the customer page: the Hub sets Lost with the customer's reason. Should the customer still get the LOST-01 goodbye (as before)? Simplest chosen: yes, through WF-15.
8. R-QUOTE-03 wording "Thanks for your feedback": is every revision a response to feedback? If not, use the softer line noted in section 5.
9. The alert 8 and title rule use {{opportunity.name}}. What is the job naming standard (for example "Smith, 12 Oak St, roof cavity")? Short names make for better task lists.
10. Office versus owner: the tasks in WF-41 and WF-42 go to Rachael Angus (residential) and Glenn Angus (commercial), matching WF-10 and WF-11. Confirm.
11. Triggers I could not confirm on the platform (GUESS): a tag-added trigger on an opportunity (I wrote contact tag with a fallback), "wait until a date in a custom field", a stage-change trigger with no stage chosen, and {{opportunity.name}} as a merge field. If the builder lacks one, the prompt says what to use instead.
12. Hub ordering: the Hub must write fields first, then the tag, then the stage move. Please confirm with whoever builds the Hub.
