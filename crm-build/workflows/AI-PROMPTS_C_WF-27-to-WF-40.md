# Prompts for the platform's AI workflow builder: WF-27 to WF-40 (folders 09 to 12)

How to use: in the Dev sub-account (SprayIT Solutions - Dev) only, open Automation, Workflows, create a new workflow with the AI builder, and paste ONE prompt below at a time, exactly as it is. Keep every workflow in draft and do not publish. The folders "09. Completion and payment", "10. Retention", "11. Always on" and "12. Reporting" from AI-PROMPT-00_FOLDERS.md must exist first. Open each result and tick its "Check after it builds" list before pasting the next prompt. The SMS templates do not exist in Dev yet, so the SMS texts are inline. Email templates must already exist in Dev under the exact names given.

Settings applied from CRM-BUILD-00-DECISIONS.md: send window 8am to 8pm Monday to Saturday, Australia/Brisbane (decision 1); re-entry off unless stated, stop on reply only on sequences that chase (7); "pause" means Remove from Workflow, "resume" is a person re-adding the contact (8); the platform sends PAY-02 and PAY-03, Xero reminders are turned off (9); alert 3 fires on any inbound SMS or email (5); draft invoices use the platform's invoice action with a draft option (17). Error handling in every prompt: on any failed step, send alert 11 (Automation failure) to Glenn Angus with the workflow name and the contact (the sheet's house convention, "notify the owner").

---

## WF-27

```
Build a workflow called "WF-27 · Job completed: the draft final invoice and the review question" in the folder "09. Completion and payment". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Job Completed", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Re-entry: off (once per job).

Steps, in this order:
1. If/Else: the opportunity custom field "Photos Captured" is ticked. (A guard only; the stage already requires it.) Continue on Yes.
2. If/Else: the pipeline is "Residential".
   - Yes: Send email using the template "JOB-05 · Job complete email". Subject, preview and from name are already set on the template. Send inside the send window (8am to 8pm Monday to Saturday, Australia/Brisbane).
   - No (Commercial & Industrial): Send email using the template "C-DONE-01 · Commercial works complete". Subject, preview and from name are already set on the template. Send inside the send window.
3. Create a draft invoice from the accepted quote: the balance after any deposit, with its payment schedule (one amount, or stages by percentage or fixed amount, each with a due date), the accepted quote and any purchase order attached. Do not send it. This step is not held by the send window.
4. Create a task for Glenn Angus (owner), due in 2 business days. Title: "INVOICE {{contact.first_name}}: check and send the final invoice". Description: "The job is marked complete and a draft final invoice is ready: the balance after any deposit, with the payment schedule and the accepted quote and any purchase order attached. Adjust it for the area actually sprayed, with a variation invoice or a credit, then send it. Sending it starts the payment reminders."
5. Create a task for Glenn Angus (owner), due in 7 days. Title: "REVIEW {{contact.first_name}}: ask for a Google review?". Description: "The job is marked complete. Leave Ask for Google review on Yes, or set it to No on the contact for a job that had problems or a repeat commercial client such as Bondor or Australian Housing. Yes sends one text four weeks after the job. No sends no review request and no referral email."
6. Wait 2 business days (Monday to Friday).
7. If/Else: the draft invoice has not been sent. On Yes, add no action (the card stays listed under "Invoices to send" in the daily summary WF-39). Build the branch with nothing inside it.

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger covers "Job Completed" on both pipelines, re-entry off.
2. Step order: guard, board split (JOB-05 or C-DONE-01 by exact name), draft invoice, two tasks, 2 business day wait, empty Yes branch.
3. The invoice step creates a draft and does not send it.
4. Both task titles and descriptions match word for word, with merge tags intact; the due times are 2 business days and 7 days.
5. Saved as draft, no extra steps.

Open items: Invoice action must be checked by hand (decision 17: confirm a draft option exists in Dev). Step 7 is a description only; no action is built. "Business day" counts Monday to Friday; confirm with Glenn if Saturday counts. Sheet puts the send window as already in the sheet's own table; decision 1 (8am to 8pm Mon-Sat) applied. Final-invoice send automation is deferred. Hands over to WF-28 when the owner sends the invoice.

---

## WF-28

```
Build a workflow called "WF-28 · Final invoice sent and the chase" in the folder "09. Completion and payment". Keep it in draft.

Trigger: the owner sends the final invoice or final claim (invoice sent). Allow each contact to re-enter (a variation invoice sent later starts its own chase).

Before every send below, check that the invoice is not marked paid; if it is paid, stop the workflow.

Steps, in this order:
1. Send email using the template "PAY-01 · Final invoice email", as the invoice email itself with the invoice attached. Subject, preview and from name are already set on the template.
2. Update the opportunity custom fields "Invoice Number" and "Invoice Sent At" from the invoice (number and sent date).
3. If/Else: the pipeline is "Residential".
   - Yes:
     1. Wait until day 7 after the invoice is sent.
     2. Send an SMS to the contact with this exact text: "Hi {{contact.first_name}}, a reminder that invoice {{opportunity.invoice_number}} is due. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}" (This is "PAY-02 · Invoice day 7 text"). Send inside the send window.
     3. Wait until day 14 after the invoice is sent.
     4. Send email using the template "PAY-03 · Invoice day 14 overdue". Subject, preview and from name are already set on the template. Send inside the send window.
     5. Create a task for Rachael Angus (office), due day 14 after the invoice is sent. Title: "CHASE {{contact.first_name}}: payment overdue". Description: "Fourteen days since the final invoice was sent, and it is unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead."
   - No (Commercial & Industrial):
     1. Wait until day 30 after the invoice is sent.
     2. If/Else: the invoice is unpaid.
        - Yes: Create a task for Rachael Angus (office), due day 30. Title: "CHASE {{contact.first_name}}: claim overdue". Description: "Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact."

Workflow settings: stop the workflow for a contact when they reply to a message. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is invoice sent, re-entry on, and a paid check sits before every send.
2. PAY-01 is the first step, then the two fields are set.
3. Residential branch: day 7 SMS text matches exactly, day 14 PAY-03, then the OFFICE task due day 14.
4. Commercial branch: only a day 30 wait, an unpaid check and the OFFICE task; no messages.
5. Stop on reply is on; saved as draft with no extra steps.

Open items: Invoice trigger and the paid check must be checked by hand against the platform's invoice events. Conflict: the sheet says stop on response "no" (WF-34 removes the contact on a reply); decision 7 says stop on reply on chasing sequences, so it is on here. Decision 9: the platform sends PAY-02 and PAY-03; turn off Xero reminders (GLENN to confirm). PAY-01 is marked business-hours but also "as the invoice email itself": decision 6 style applied, sent immediately as the invoice; confirm. Commercial claim terms to confirm with Glenn.

---

## WF-29

```
Build a workflow called "WF-29 · Final invoice paid: report and close" in the folder "09. Completion and payment". Keep it in draft.

Trigger: the final invoice is marked fully paid. Re-entry: off (once per job).

Steps, in this order:
1. Update the opportunity custom field "Final Invoice Paid At" to now.
2. Create a task for Glenn Angus (owner), due the same day as the payment. Title: "SEND {{contact.first_name}}: job report and certificates". Description: "The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid."
3. If/Else: the pipeline is "Commercial & Industrial".
   - Yes:
     1. Wait 1 day.
     2. Send email using the template "C-CLOSE-01 · Commercial paid and closed". Subject, preview and from name are already set on the template. Send inside the send window.
     3. Create a task for Glenn Angus (owner), due in 7 days. Title: "REFERENCE {{contact.first_name}}: ask, and record the answer". Description: "Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager's word is worth more on a tender than any number of homeowner reviews."
4. If/Else: the opportunity custom field "Retention Amount" is set.
   - Yes:
     1. Update the opportunity: move to the stage "Retention Claim".
     2. Add the tag "is-retention-held". The status stays Won and the card stays open until the retention is paid.
   - No:
     1. Update the opportunity: close the card as Won.
     2. Remove the tag "is-active-job".
5. Add the tag "been-customer".

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is the final invoice paid, re-entry off.
2. Field "Final Invoice Paid At" set first, then the SEND task due the same day.
3. Commercial branch has the 1 day wait, C-CLOSE-01 by exact name, and the REFERENCE task due in 7 days.
4. Retention branch: Yes moves to Retention Claim and adds is-retention-held (is-active-job stays on); No closes Won and removes is-active-job.
5. been-customer is added last; draft, no extra steps.

Open items: Invoice-paid trigger must be checked by hand. The sheet places been-customer last (the data file lists it only in the tag block); kept as the sheet. The job report is sent by hand (JOB-06 is not in this workflow; note JOB-06 in the index is the crew running late text, the job report template is RPT-01 · Job report email). Hands over nothing; WF-33 removes is-active-job when a held retention is paid.

---

## WF-30

```
Build a workflow called "WF-30 · Google review request" in the folder "09. Completion and payment". Keep it in draft.

Trigger: the opportunity custom field "Job Date" passes on a job that is marked complete. Re-entry: off.

Steps, in this order:
1. Wait 4 weeks after "Job Date".
2. If/Else: the contact custom field "Ask For Google Review" is Yes AND the contact does not have the tag "is-complaint" AND the contact does not have the tag "been-review-asked".
   - Yes:
     1. Send an SMS to the contact with this exact text: "Hi {{contact.first_name}}, how is it going since the job? If you are happy with it, a Google review really helps: {{custom_values.review_url}} {{custom_values.sms_signoff}}" (This is "REV-01 · Google review text"). Send inside the send window.
     2. Add the tag "been-review-asked".
   - No: stop here, send no request.

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is the job date passing on a completed job; re-entry off.
2. The wait is 4 weeks after Job Date, before the condition.
3. The condition has all three parts joined with AND.
4. The SMS matches word for word with merge tags intact, then been-review-asked is added.
5. The No branch stops with no action; draft, no extra steps.

Open items: Trigger wording ("job_date passes" versus a 4 week wait after it) is ambiguous; built as the sheet says: Wait 4 weeks after Job Date. The range agreed was 4 to 6 weeks. Add Tag follows the tag block and is not a listed step. The review link (review_url) is a placeholder to confirm with Glenn (decision 18).

---

## WF-31

```
Build a workflow called "WF-31 · After the job: referral and the year check-in" in the folder "09. Completion and payment". Keep it in draft.

Trigger: the final invoice is marked fully paid, on the pipeline "Residential" only (not "Commercial & Industrial"). Re-entry: off. The 12 month step is scheduled on entry so it survives everything else changing.

Steps, in this order:
1. Wait 7 days.
2. If/Else: the contact custom field "Consent Marketing" is Yes AND the contact custom field "Ask For Google Review" is Yes.
   - Yes: Send email using the template "REV-02 · After job referral ask". Subject, preview and from name are already set on the template. Send inside the send window.
3. Wait until 12 months after the opportunity custom field "Job Date".
4. If/Else: the contact custom field "Consent Marketing" is Yes.
   - Yes: Send email using the template "REV-03 · After job 12 month check-in". Subject, preview and from name are already set on the template. Send inside the send window.

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is invoice paid and limited to the Residential pipeline; re-entry off.
2. 7 day wait, then the two-part condition (both must be Yes) before REV-02.
3. The second wait is until 12 months after Job Date, then a single Consent Marketing check before REV-03.
4. Both template names match exactly.
5. Draft, no extra steps.

Open items: Invoice-paid trigger must be checked by hand. REV-03 is marked trigger "Job completed" in the message kit; built as the sheet shows (invoice paid). WF-35 removes the contact from this workflow on STOP or unsubscribe. Consent Marketing value format (yes or Yes) to confirm in Dev.

---

## WF-32

```
Build a workflow called "WF-32 · Progress claims" in the folder "09. Completion and payment". Keep it in draft.

Trigger: the owner sends a progress claim invoice while the works run, on the pipeline "Commercial & Industrial" only. Allow each contact to re-enter (one run per claim).

Steps, in this order:
1. Send email using the template "C-PAY-01 · Commercial progress claim". Subject, preview and from name are already set on the template. Send inside the send window.
2. Wait 30 days from the claim.
3. If/Else: that claim is unpaid.
   - Yes: Create a task for Rachael Angus (office), due day 30. Title: "CHASE {{contact.first_name}}: claim overdue". Description: "Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact."

Workflow settings: stop on reply is off. Stop the run when that claim is paid. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is a progress claim sent, Commercial & Industrial only, re-entry on.
2. Step 1 uses "C-PAY-01 · Commercial progress claim".
3. The wait is 30 days and the condition checks that claim unpaid.
4. The OFFICE task title and description match word for word.
5. Draft, no extra steps.

Open items: Invoice-sent trigger for a progress claim (as opposed to a final invoice) must be checked by hand. Payment terms and whether claims follow a percentage, milestone or monthly cycle are placeholders to confirm with Glenn (decision 18). The template uses invoice_number and po_number.

---

## WF-33

```
Build a workflow called "WF-33 · Retention claim reminder" in the folder "10. Retention". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Retention Claim", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Re-entry: off.

Steps, in this order:
1. Require the opportunity custom fields "Retention Amount" and "Retention Release Date" on entry to the stage (if either is empty, stop and notify Glenn Angus).
2. Wait until "Retention Release Date".
3. Create a task for Rachael Angus (office), due on the release date. Title: "CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}". Description: "The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card."
4. Wait 30 days.
5. If/Else: the opportunity is still in the stage "Retention Claim".
   - Yes: Create a task for Rachael Angus (office), due 30 days after the release date. Title: "CHASE {{contact.first_name}}: retention unpaid". Description: "A month since the retention claim went and it has not been paid. Ring the accounts contact and ask where it sits, and whether anything is needed from us before it is released."
6. When the retention is marked paid by hand: close the card as Won, remove the tag "is-retention-held", and remove the tag "is-active-job".

Workflow settings: stop on reply is off. No customer messages are sent. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger covers Retention Claim on both pipelines; re-entry off.
2. The entry requirement for the two fields exists, then the wait until the release date.
3. Both task titles and descriptions match; due dates are release date and release date plus 30 days.
4. The still-in-stage check uses the stage "Retention Claim".
5. The paid-by-hand path closes Won and removes both tags; no customer message anywhere.

Open items: Step 1 ("require") is a stage rule; the workflow cannot refuse a move, so check the pipeline's stage requirements by hand. Step 6 is a manual event, so it may need a separate trigger or be done by hand. The retention claim email (RET-01 · Retention claim email) is a saved template sent by hand, not by this workflow.

---

## WF-34

```
Build a workflow called "WF-34 · Customer replied" in the folder "11. Always on". Keep it in draft.

Trigger: Customer Replied (an inbound SMS or an inbound email) from a contact who has an open opportunity. Allow each contact to re-enter (it fires on every inbound message).

Steps, in this order:
1. Remove the contact from these workflows: "WF-06", "WF-10", "WF-11", "WF-16" and "WF-28" (the payment reminders). Do not remove them from "WF-07", "WF-21" or "WF-25"; those reminders about an agreed date keep running. (Removing is how we pause.)
2. Remove the tags "is-unresponsive" and "is-stalled" from the contact.
3. Send an internal notification, alert 3 (Inbound reply), to the assigned user. If the assigned user is Rachael Angus (office), send it by email and in-app. If the assigned user is Glenn Angus (owner), send it by SMS and email. Message: REPLY from {{contact.first_name}}: "{{message.body}}"
4. Create a task for the assigned user, due in 1 hour. Title: "REPLY {{contact.first_name}}: they messaged". Description: "A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds."
5. Do nothing further. The paused sequences resume only when someone replies from the platform and chooses to add the contact back, never automatically.

Workflow settings: stop on reply does not apply. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is any inbound SMS or email on a contact with an open opportunity; re-entry on.
2. Remove-from-workflow lists exactly WF-06, WF-10, WF-11, WF-16, WF-28 and not WF-07, WF-21, WF-25.
3. Both tags are removed.
4. Alert 3 splits by assignee and channel; the message text matches.
5. The REPLY task is due in 1 hour; draft, no extra steps.

Open items: Decision 4 says the sales sequences to stop are WF-06, 10, 11, 13, 16 (written for WF-14); the sheet lists WF-06, 10, 11, 16 and WF-28; sheet kept, WF-13 resumes by hand per decision 8, confirm whether WF-13 belongs here. Decision 5 applied (alert 3 fires on SMS and email). The workflows to remove from must exist in Dev first or the step cannot be built. Assigned user's quiet hours for tasks not specified.

---

## WF-35

```
Build a workflow called "WF-35 · STOP and unsubscribe" in the folder "11. Always on". Keep it in draft.

Trigger: an inbound SMS that reads STOP, or an email unsubscribe link is used. Allow each contact to re-enter. Run immediately, outside any send window.

Steps, in this order:
1. Add the tag "is-no-marketing".
2. Remove the tag "is-nurturing".
3. Remove the contact from the workflows "WF-16" and "WF-31". Leave the opportunity card where it is so a later enquiry is still recognised.

Do not build anything for the platform's own behaviour: STOP sets do-not-SMS and unsubscribe sets do-not-email for marketing natively. Transactional messages about a live job (reminders, deposit, invoice) must still send, so do not wire the do-not-SMS flag to block them.

Workflow settings: stop on reply does not apply. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger covers both STOP by SMS and the email unsubscribe; re-entry on, no wait.
2. Exactly three steps in this order: add is-no-marketing, remove is-nurturing, remove from WF-16 and WF-31.
3. The opportunity is not moved or closed.
4. No step touches the do-not-SMS flag.
5. Draft, no extra steps.

Open items: Confirm the platform's native STOP and unsubscribe handling on a test contact before relying on it (sheet steps 1 and 5 are "confirm, do not build"). Check by hand that the do-not-SMS flag does not block transactional messages.

---

## WF-36

```
Build a workflow called "WF-36 · Stalled card monitor" in the folder "11. Always on". Keep it in draft.

Trigger: Scheduled, every day at 6:45am, timezone Australia/Brisbane. It runs over all open opportunities. No customer messages are sent.

Steps, in this order:
1. For every open opportunity, compare its time in its current stage with that stage's stall threshold from the pipeline design (CRM-PIPELINES.md).
2. If/Else: the time in stage is over the threshold.
   - Yes: Add the tag "is-stalled". The stage task reappears at the top of the assigned user's list.
3. If/Else: the time in stage is over 2 times the threshold.
   - Yes: Add the card as a line item in the daily summary (WF-39).
4. If/Else: the time in stage is over 3 times the threshold.
   - Yes: Name the card, with its details, in the weekly review (WF-40).

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is scheduled daily at 6:45am Australia/Brisbane.
2. The three if/else branches use 1x, 2x and 3x the stage threshold.
3. is-stalled is the only tag added; no messages sent.
4. The 2x and 3x branches mark the card for WF-39 and WF-40 (a tag or field the summaries can read).
5. Draft, no extra steps.

Open items: Stall thresholds live in CRM-PIPELINES.md and are not repeated here, so they must be supplied by hand per stage. The platform may not loop over all cards in a scheduled workflow, so this may need a smart list or a per-stage version, check by hand. How cards reach the WF-39 and WF-40 lists is not defined in the sheet (a tag or field is needed). Nothing removes is-stalled when a card moves except WF-34 on a reply; sources do not say who does.

---

## WF-37

```
Build a workflow called "WF-37 · Negative review or complaint" in the folder "11. Always on". Keep it in draft.

Trigger: a review is received with fewer than 4 stars, OR the tag "is-complaint" is added to a contact. Allow each contact to re-enter (once per review or tag).

Steps, in this order:
1. Send an internal notification, alert 10 (Negative review or complaint), to Glenn Angus (owner) by SMS and email. Message: REVIEW {{review.rating}} stars from {{review.author}}. Call them today. This alert is critical and sends on Saturday too.
2. Create a task for Glenn Angus (owner), due the same day. Title: "CALL {{contact.first_name}}: review or complaint, today". Description: "Ring them today. Most unhappy customers are fixed by one call and almost none by silence, and a public reply written before you have spoken to them tends to make it worse. Any marketing to that contact is paused until the call has happened."
3. Update the contact custom field "Ask For Google Review" to No.
4. Pause any marketing sequence on the contact until the call has happened (remove the contact from the marketing workflows).

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Two triggers: review under 4 stars, and the tag is-complaint added; re-entry on.
2. Alert 10 goes to Glenn Angus by SMS and email with the exact message.
3. The CALL task is due the same day, title and description exact.
4. "Ask For Google Review" is set to No.
5. Step 4 removes the contact from marketing workflows; draft, no extra steps.

Open items: Step 4 gives no way to resume marketing after the call, and the sources do not say who resumes (decision 8: a person re-adds the contact). Which workflows count as "marketing" must be named by hand (WF-16 and WF-31 at least). been-reviewed is not set by anything. The review trigger needs the platform's review integration, check by hand. WF-38 must not send a second text for the CALL task.

---

## WF-38

```
Build a workflow called "WF-38 · Assigned to you" in the folder "11. Always on". Keep it in draft.

Trigger: an opportunity is assigned or reassigned to someone, OR a task is created for Glenn Angus (owner). Allow each contact to re-enter.

Steps, in this order:
1. If/Else: this is the automatic assignment of a new lead to the office.
   - Yes: stop here. Alert 1 already covers it.
2. If/Else: the workflow that made the task or the assignment has just sent the owner another alert about the same card.
   - Yes: stop here. One event never sends the owner two texts. (Build this as a short wait of 1 minute, then a check for a recent internal alert on the card.)
3. Send an internal notification, alert 14 (Assigned to you), to whoever it is assigned to. If assigned to Glenn Angus (owner), send by SMS and email. If assigned to Rachael Angus (office), send by email. Message: ASSIGNED TO YOU: {{opportunity.name}}, {{contact.phone}} then {{task.title}}.

Workflow settings: stop on reply is off. Alert 14 follows quiet hours. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Two triggers: assigned or reassigned, and a task created for the owner; re-entry on.
2. The two stop checks come before the notification, in this order.
3. Alert 14 splits by assignee: owner by SMS and email, office by email.
4. The message text matches word for word.
5. Draft, no extra steps.

Open items: How "has just sent the owner another alert" is detected is not defined in the sources; the sheet leaves it open (a short wait then a check for a recent alert on the card, or a shared flag). The 1 minute wait is a chosen value to confirm. Test that WF-37's task creates only alert 10, no alert 14.

---

## WF-39

```
Build a workflow called "WF-39 · Daily summary" in the folder "12. Reporting". Keep it in draft.

Trigger: Scheduled, 7:00am Monday to Saturday (no Sunday), timezone Australia/Brisbane. Internal only, no customer messages.

Steps, in this order:
1. Send an email to Glenn Angus (owner) and Rachael Angus (office), with the subject "Daily summary" and this body layout. Replace each placeholder with the live count, value or list. NEEDS YOU goes last on purpose, it is the section people act on.

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
  Quotes to write        {{list, waiting in Quoting}}
  Callbacks due          {{list}}
  Installs to book       {{list, over 2 days in Booking Required}}
  Dates not confirmed    {{list, no Yes or No on either reminder}}
  Deposits unpaid        {{list with amount and due date}}
  Invoices to send       {{list, drafts not yet sent}}
  Invoices overdue       {{list with amount and days}}
  Job reports to send    {{list, paid but report not sent}}
  Retentions due         {{list with release date}}

Leads not called stay at the top of NEEDS YOU until a call is logged. Cards over 2x their stall threshold (from WF-36) also get a line item.

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Trigger is scheduled 7:00am Monday to Saturday in Australia/Brisbane; no Sunday.
2. One email step, to both Glenn Angus and Rachael Angus.
3. The body has the three sections in order, with NEEDS YOU last and all 10 NEEDS YOU lines present.
4. The line for cards over 2x the stall threshold is included.
5. Draft, no extra steps.

Open items: The platform email step cannot compute counts and lists by itself, so every placeholder needs a data source (smart lists, or a reporting action); check by hand. The subject "Daily summary" is not in the sheet; chosen to confirm. NEEDS YOU order follows the notifications document (Deposits unpaid before Invoices to send; the data file order is not binding). Where the stall line item sits is not defined. Saturday 7:00am is before the 8am Saturday window, but this is internal.

---

## WF-40

```
Build a workflow called "WF-40 · Weekly and monthly reports" in the folder "12. Reporting". Keep it in draft.

Trigger: Scheduled, two schedules, timezone Australia/Brisbane: Monday at 7:00am (weekly) and the 1st of the month at 7:00am (monthly). Internal only, no customer messages. If the platform needs it, build this as two scheduled workflows with the same steps split between them.

Steps, in this order:
1. Weekly branch (Monday 7:00am): send an email to Glenn Angus (owner) with the subject "Weekly report" and this body. The forecast and the committed work are two separate lines, never one. Both pipelines share stage keys, so every line is one number across the business.

LAST WEEK, BOTH BOARDS
  Enquiries              {{count}}, by source
  Median time to first call
  Days in Quoting        {{average}}
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

2. Monthly branch (the 1st): send an email to Glenn Angus (owner) with the subject "Monthly report": cost per enquiry and cost per accepted job, by utm_source, gclid and fbclid, against paid revenue (not quotes sent). Layout: one table per source with the columns Source, Spend, Enquiries, Cost per enquiry, Accepted jobs, Cost per accepted job, Paid revenue.
3. Weekly reconciliation: count website submissions against opportunities created. If they do not match, send an internal notification, alert 11 (Automation failure), to Glenn Angus.

Workflow settings: stop on reply is off. Error handling: on any failed step, send an internal notification (alert 11, Automation failure) to Glenn Angus with the workflow name and the contact. Do not add any other steps. Do not publish.
```

Check after it builds:
1. Two schedules: Monday 7:00am and the 1st of the month, Australia/Brisbane.
2. The weekly email goes to Glenn Angus only, with the three sections and "Open value" and "Accepted, not done" as two separate lines.
3. The monthly email has the seven table columns.
4. The reconciliation step sends alert 11 to Glenn Angus only if the two counts differ.
5. Draft, no extra steps.

Open items: Subjects "Weekly report" and "Monthly report", and the monthly 7:00am time, are not in the sheet; chosen to confirm. The monthly table layout is the sheet's suggestion only; the ad spend source is not defined. If the 1st falls on a Monday, two emails go the same morning. Counts and lists need data sources (check by hand). The sheet allows three steps or two workflows; split if the platform cannot run two schedules in one.
