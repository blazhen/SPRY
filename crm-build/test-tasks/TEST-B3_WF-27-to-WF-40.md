# Test tasks B3: WF-27 to WF-40 (SprayIT Solutions - Dev)

Source: the build sheets WF-C (WF-27 to WF-40), the builder prompts and checklists, CRM-BUILD-00-DECISIONS.md, and the message kit. One task per workflow, for ClickUp.

## Rules for every task below (read once, they apply to all 14)

- Work only in the Dev sub-account "SprayIT Solutions - Dev" (location ID 5M1zrDbimF17cM16mtmR). Never use the live account. Real contacts must never be used. A test contact is a made-up name starting "TEST" (for example "TEST Jordan Sample") with the tester's own mobile and email.
- Part 1 is read-only. Do not switch a workflow on until Part 1 passes. Workflows were built in draft.
- Timezone is Australia/Brisbane. Send window: the sheet says Monday to Friday 7am to 6pm, Saturday 8am to 2pm, nothing Sunday or public holidays; the build decisions (decision 1) and the builder prompts used 8am to 8pm Monday to Saturday. These two disagree. Both are accepted: note which one the platform shows and do not change it. Run send tests inside the window, or note that the message was held and released at the next window.
- Error handling on every workflow: on any failed step, alert 11 (Automation failure) goes to Glenn Angus with the workflow name and the contact. In Part 1, confirm each workflow has this.
- Roles: OWNER = Glenn Angus, OFFICE = Rachael Angus. For tests, if the notification or task goes to a real person, tell them first or set the tester as the user for the test only, and restore it.
- Email from-name: "contact" = {{custom_values.from_name_contact}}, "brand" = {{custom_values.from_name_brand}}. SMS comes from the business number.
- Where a sheet is ambiguous the task follows the sheet and says so.
- If it fails (every task): report the workflow, the step number, what happened and a screenshot in a comment on the ClickUp task, then set the task to Blocked. Do not redesign anything. Small fixes (a wrong name, a wrong wait) may be fixed and noted in a comment.
- Time-based waits: do not wait days. Either clone the workflow, name the clone "TEST-copy of WF-NN", set the long wait to 1 to 2 minutes, run the clone, then delete the clone; or confirm the wait value in Part 1 and read the scheduled step on the contact (open the contact, Workflows or Automation tab, or the workflow's Enrollment History / Execution Logs, and read the "next step" and its scheduled time). Never edit the real workflow's waits for a test unless you put the value back.
- Invoice steps (draft, sent, paid) must be checked by hand: open the invoice action in the workflow and the invoice itself, and look at the points listed in the task. Decision 17 says the draft option on the invoice action is still to be confirmed in Dev.

---

### T-WF-27 · Check, activate and test WF-27 · Job completed: the draft final invoice and the review question
- Wave: E
- Depends on: T-WF-28 (starts when the owner sends the final invoice); T-WF-39 (the unsent draft appears under "Invoices to send"); T-WF-30 (reads Ask for Google review). Templates: JOB-05 · Job complete email; C-DONE-01 · Commercial works complete. Fields: Photos Captured (photos_captured), Ask for Google review (ask_for_google_review). Folder "09. Completion and payment". Needs the invoice action with a draft option (decision 17).
- Time: 40 min (plus a 2 business day wait, see Part 2)

**Part 1, check the build (do not activate yet)**
Open Automation, Workflows, folder "09. Completion and payment", open "WF-27 · Job completed: the draft final invoice and the review question". Dev account only, no real contacts.
1. Status is Draft. Name is exactly "WF-27 · Job completed: the draft final invoice and the review question".
2. Trigger: Pipeline Stage Changed, stage "Job Completed", on both pipelines: "Residential" and "Commercial & Industrial". Correct as stated.
3. Settings: re-entry OFF (once per job). Stop on response / stop on reply: no (off). Timezone Australia/Brisbane.
4. Step 1, If/Else: opportunity field "Photos Captured" is ticked. This is a guard only (the stage already requires it); continue on Yes.
5. Step 2, If/Else: pipeline is "Residential".
   - Yes branch: Send Email, template "JOB-05 · Job complete email", from contact. Subject "All done at {{opportunity.site_address}}". Waits for the send window.
   - No branch (Commercial): Send Email, template "C-DONE-01 · Commercial works complete", from contact. Subject "Works complete: {{opportunity.site_address}}". Waits for the send window.
6. Step 3, invoice action: creates the final invoice as a DRAFT from the accepted quote: balance after any deposit, with its payment schedule (one amount, or stages by percentage or fixed amount, each with a due date), the accepted quote and any purchase order attached. It must NOT send. Not held by the send window. Check this by hand: open the action and confirm a draft/"do not send" option is chosen. If no draft option exists, write it in the comment and mark Blocked.
7. Step 4, Create Task, assigned to Glenn Angus (OWNER), due 2 business days. Title exactly: "INVOICE {{contact.first_name}}: check and send the final invoice". Description exactly: "The job is marked complete and a draft final invoice is ready: the balance after any deposit, with the payment schedule and the accepted quote and any purchase order attached. Adjust it for the area actually sprayed, with a variation invoice or a credit, then send it. Sending it starts the payment reminders."
8. Step 5, Create Task, Glenn Angus (OWNER), due 7 days. Title exactly: "REVIEW {{contact.first_name}}: ask for a Google review?". Description exactly: "The job is marked complete. Leave Ask for Google review on Yes, or set it to No on the contact for a job that had problems or a repeat commercial client such as Bondor or Australian Housing. Yes sends one text four weeks after the job. No sends no review request and no referral email."
9. Step 6, Wait 2 business days (Monday to Friday).
10. Step 7, If/Else: the draft invoice has not been sent. The Yes branch is intentionally EMPTY (nothing to build; the card stays under "Invoices to send" in the daily summary WF-39).
11. No tags set, no fields set. Error branch sends alert 11 to Glenn Angus. No other steps.
12. Note: the agency note (step 8: later automate the send) is not a step. Sheet ambiguity: "business day" counts Monday to Friday; whether Saturday counts is still to confirm with Glenn.

**Part 2, activate and test**
Set up: create a TEST contact "TEST Residential Job" (tester's own phone and email) and an opportunity on the Residential pipeline with an accepted quote and a deposit paid, Photos Captured ticked. Repeat with a second contact "TEST Commercial Job" on "Commercial & Industrial". Have the invoice action's draft option confirmed.
1. Publish WF-27 (switch on).
2. Residential: move the card to "Job Completed". Watch the contact timeline and Conversations: JOB-05 · Job complete email is sent from the contact name if inside the send window, otherwise it shows as queued/waiting and releases at the next window. Watch Invoices: a draft final invoice exists, unsent, with balance after deposit, the schedule, the accepted quote attached. Watch Tasks: two tasks for Glenn Angus: "INVOICE TEST: check and send the final invoice" due in 2 business days and "REVIEW TEST: ask for a Google review?" due in 7 days. Expected within 1 minute (except the held email).
3. Commercial: repeat on the Commercial card. C-DONE-01 · Commercial works complete is sent instead of JOB-05; JOB-05 is not sent.
4. Guard test: on a third card with Photos Captured empty, try to move to "Job Completed". The stage should refuse. (Stage rule, not the workflow.)
5. Wait test: do not wait 2 business days. Open the contact's workflow status and confirm the step is waiting at "Wait 2 business days" with a scheduled time 2 business days ahead. Or run a cloned "TEST-copy of WF-27" with a 2 minute wait. After the wait, leave the draft unsent and confirm the card is listed under "Invoices to send" in the next daily summary (T-WF-39).
6. Send the draft invoice by hand: WF-28 should start (T-WF-28).
7. Re-entry: move the same card out and back to Job Completed; the workflow must not run again.
Expected result
- Residential card: JOB-05 queued or sent, draft invoice unsent, two OWNER tasks with the correct due times.
- Commercial card: C-DONE-01 instead of JOB-05.
- Missing photos: stage refuses.
- No second run on the same card.
Evidence: screenshots of the workflow steps (Part 1), the contact timeline, the draft invoice (showing Draft, not Sent), the two tasks with due dates, the sent email.
Switch off afterwards: yes, switch WF-27 off, delete any "TEST-copy", and delete or void the test draft invoices.

---

### T-WF-28 · Check, activate and test WF-28 · Final invoice sent and the chase
- Wave: E
- Depends on: T-WF-27 (starts it indirectly), T-WF-34 (a customer reply removes the contact), T-WF-29 (paid), T-WF-32 (similar commercial chase). Templates: PAY-01 · Final invoice email; PAY-02 · Invoice day 7 text; PAY-03 · Invoice day 14 overdue. Fields: Invoice Number (invoice_number), Invoice Sent At (invoice_sent_at). Custom values: contact_mobile, sms_signoff, from_name_brand.
- Time: 45 min

**Part 1, check the build (do not activate yet)**
Open "WF-28 · Final invoice sent and the chase" in folder "09. Completion and payment". Dev only, no real contacts.
1. Status Draft. Trigger: the owner sends the final invoice or final claim (invoice sent). Check this trigger by hand against the platform's invoice events.
2. Re-entry ON (a variation invoice sent later starts its own chase). Sheet says stop on response: NO (WF-34 removes the contact on a reply). The builder prompt turned stop on reply ON (decision 7). These disagree; record which is set, do not change it.
3. A "paid" check sits before every send; if paid, the workflow stops dead.
4. Step 1: Send Email "PAY-01 · Final invoice email", from brand, as the invoice email itself with the invoice attached. Subject "Invoice {{opportunity.invoice_number}}". Sheet ambiguity: PAY-01 is marked business-hours but is also the invoice email; sheet says confirm whether it is exempt from the window. Note what the platform does.
5. Step 2: Update fields Invoice Number (invoice_number) and Invoice Sent At (invoice_sent_at) from the invoice.
6. Step 3 If/Else: pipeline is "Residential".
   - Yes: (1) Wait until day 7 after the invoice is sent. (2) Send SMS "PAY-02 · Invoice day 7 text", exact text: "Hi {{contact.first_name}}, a reminder that invoice {{opportunity.invoice_number}} is due. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}". (3) Wait until day 14 after it is sent. (4) Send Email "PAY-03 · Invoice day 14 overdue", from brand, subject "Invoice {{opportunity.invoice_number}} is now overdue". (5) Create Task for Rachael Angus (OFFICE), due day 14 after it is sent. Title: "CHASE {{contact.first_name}}: payment overdue". Description: "Fourteen days since the final invoice was sent, and it is unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead."
   - No (Commercial): (1) Wait until day 30 after it is sent. (2) If/Else: unpaid. Yes: Create Task for Rachael Angus (OFFICE), due day 30. Title: "CHASE {{contact.first_name}}: claim overdue". Description: "Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact." No messages in this branch.
7. Window: PAY-01, PAY-02, PAY-03 are business-hours messages.
8. Tags set: none. Fields set: invoice_number, invoice_sent_at.
9. Open point from the sheet: the platform sends PAY-02 and PAY-03 and Xero invoice reminders must be OFF (decision 9, Glenn to confirm). Ask the tester to look in Xero settings and write what is set; do not change it.
10. Error branch alert 11 to Glenn Angus. No other steps.

**Part 2, activate and test**
Set up: "TEST Pay Residential" (tester's own phone and email) with a Residential opportunity at Job Completed, and "TEST Pay Commercial" on Commercial & Industrial. Do not use a real customer.
1. Publish WF-28.
2. Residential: create the final invoice and send it by hand. Watch: PAY-01 is sent with the invoice attached; fields Invoice Number and Invoice Sent At are filled (open the contact/opportunity). Expected within 1 minute (or held to the window).
3. Day 7: do not wait 7 days. Clone to "TEST-copy of WF-28", set the day 7 wait to 2 minutes and the day 14 wait to 5 minutes, send a new test invoice, and watch. At day 7 PAY-02 text arrives on the tester's phone, text exactly as in step 6 above. Repeat once but mark the invoice paid before the wait ends: nothing must send.
4. Day 14 unpaid: PAY-03 arrives by email and the CHASE task "CHASE TEST: payment overdue" appears for Rachael Angus.
5. Commercial: send an invoice. PAY-01 goes. No day 7 or day 14 messages. At day 30 (short test wait in the clone) unpaid: only the task "CHASE TEST: claim overdue" for Rachael Angus appears.
6. Reply test: after PAY-01, reply to it from the tester's phone or email. PAY-02 and PAY-03 must pause (T-WF-34 removes the contact from WF-28).
7. Re-entry: send a second (variation) invoice on the same card; a new chase starts.
Expected result
- PAY-01 with invoice; two fields set; PAY-02 at day 7 only if unpaid and inside the window; PAY-03 and OFFICE task at day 14; commercial gets task only at day 30; paid stops everything; reply pauses.
Evidence: screenshots of the invoice, timeline with each message, fields, tasks, and the workflow execution log.
Switch off afterwards: yes. Switch WF-28 off, delete the clone and test invoices.

---

### T-WF-29 · Check, activate and test WF-29 · Final invoice paid: report and close
- Wave: E
- Depends on: T-WF-28; T-WF-33 (retention path); T-WF-31 (also starts on invoice paid); T-WF-39 (Job reports to send). Template: C-CLOSE-01 · Commercial paid and closed. Fields: Final Invoice Paid At (final_invoice_paid_at), Retention Amount (retention_amount), job_report_sent_at (stamped by hand). Tags: been-customer, is-retention-held, is-active-job. Stage: "Retention Claim".
- Time: 35 min

**Part 1, check the build (do not activate yet)**
Open "WF-29 · Final invoice paid: report and close" in folder "09. Completion and payment". Dev only, no real contacts.
1. Status Draft. Trigger: final invoice marked fully paid (check by hand against the invoice events). Re-entry OFF (once per job). Stop on response: no.
2. Step 1: Update Field Final Invoice Paid At (final_invoice_paid_at) = now.
3. Step 2: Create Task for Glenn Angus (OWNER), due the same day as payment. Title: "SEND {{contact.first_name}}: job report and certificates". Description: "The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid."
4. Step 3 If/Else: pipeline is Commercial & Industrial. Yes: (1) Wait 1 day. (2) Send Email "C-CLOSE-01 · Commercial paid and closed", from contact, subject "Thanks, {{contact.first_name}}", waits for the send window. (3) Create Task for Glenn Angus (OWNER), due day 7. Title: "REFERENCE {{contact.first_name}}: ask, and record the answer". Description: "Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager's word is worth more on a tender than any number of homeowner reviews."
5. Step 4 If/Else: Retention Amount (retention_amount) is set.
   - Yes: (1) Update Opportunity: move to stage "Retention Claim". (2) Add Tag "is-retention-held". Status stays Won; card stays open until the retention is paid.
   - No: Update Opportunity: close the card as Won. Remove Tag "is-active-job".
6. Step 5: Add Tag "been-customer". (The sheet's tag block places it as a tag rather than a numbered step, so its position last is a choice; move is fine.)
7. Tags: adds been-customer; adds is-retention-held only when retention is held; removes is-active-job only when no retention is held (otherwise WF-33 removes it).
8. The job report is sent by hand (saved template RPT-01 · Job report email, not in this workflow). Error branch alert 11 to Glenn Angus. No other steps.

**Part 2, activate and test**
Set up: three test contacts, all with the tester's own phone and email: "TEST Paid Residential" (Residential, no retention, tag is-active-job on), "TEST Paid Commercial" (Commercial, no retention), "TEST Paid Retention" (Residential, Retention Amount set, for example 1000, plus Retention Release Date).
1. Publish WF-29.
2. Residential, no retention: mark the final invoice paid. Check: Final Invoice Paid At is set; task "SEND TEST: job report and certificates" for Glenn Angus due today; card closed as Won; tag is-active-job removed; tag been-customer added. Within 1 minute.
3. Commercial: after paying, wait 1 day (or use a "TEST-copy of WF-29" with a 2 minute wait). C-CLOSE-01 · Commercial paid and closed arrives inside the send window. Task "REFERENCE TEST: ask, and record the answer" is due in 7 days.
4. Retention card: after paying, the card moves to stage "Retention Claim", tag is-retention-held is on, is-active-job stays on, card stays open, status Won.
5. Re-run: mark paid a second time (or re-trigger). The second run does nothing.
Expected result
- All fields, tags, tasks and stages as above; no email sent on the Residential card; no second run.
Evidence: screenshots of the opportunity (stage, status), tags on the contact, fields, tasks, the C-CLOSE-01 email, execution log.
Switch off afterwards: yes. Delete the clone and test records.

---

### T-WF-30 · Check, activate and test WF-30 · Google review request
- Wave: F
- Depends on: T-WF-27 (the REVIEW task sets Ask for Google review), T-WF-37 (adds is-complaint, which blocks it). Template: REV-01 · Google review text. Fields: Job Date (job_date), Ask For Google Review (ask_for_google_review). Tags: is-complaint, been-review-asked. Custom values: review_url (placeholder, to confirm with Glenn), sms_signoff.
- Time: 30 min

**Part 1, check the build (do not activate yet)**
Open "WF-30 · Google review request" in folder "09. Completion and payment". Dev only, no real contacts.
1. Status Draft. Trigger: Job Date passes on a job marked complete. Re-entry OFF. Stop on response: no. Sheet ambiguity: "job_date passes" plus a 4 week wait after job_date reads as a 4 week delay from the install date; the sheet says build as "Wait 4 weeks after job_date".
2. Step 1: Wait 4 weeks after Job Date (agreed range was 4 to 6 weeks).
3. Step 2 If/Else with three parts joined by AND: Ask For Google Review is Yes AND contact does not have tag "is-complaint" AND contact does not have tag "been-review-asked".
   - Yes: Send SMS "REV-01 · Google review text", exact text: "Hi {{contact.first_name}}, how is it going since the job? If you are happy with it, a Google review really helps: {{custom_values.review_url}} {{custom_values.sms_signoff}}". Then Add Tag "been-review-asked". Waits for the send window.
   - No: stop, no request, no action.
4. Tags added: been-review-asked. Fields read: ask_for_google_review, job_date. Error branch alert 11 to Glenn Angus. No other steps.
5. Check the custom value review_url has a value in Dev (a placeholder is expected; write down what it shows).

**Part 2, activate and test**
Set up: "TEST Review Yes" (own phone and email) with a completed opportunity, Job Date set, Ask For Google Review = Yes, no tag is-complaint, no tag been-review-asked. Three more copies: "TEST Review No" (Ask = No), "TEST Review Complaint" (tag is-complaint added during the wait), "TEST Review Repeat" (already has been-review-asked).
1. Publish WF-30. Use a clone "TEST-copy of WF-30" with the 4 week wait set to 2 minutes, or set Job Date so the 4 weeks have already passed if the trigger allows it.
2. Review Yes: after the wait, the REV-01 text arrives on the tester's phone inside the window with the review link; tag been-review-asked is added.
3. Review No: nothing sends, no tag.
4. Complaint: add is-complaint before the wait ends; nothing sends.
5. Repeat: nothing sends.
6. Confirm only one request ever goes to a contact (never chased).
Expected result: exactly one SMS only for the first contact, and the tag been-review-asked on that contact only.
Evidence: screenshots of the conditions, SMS received, tag, execution log for each contact.
Switch off afterwards: yes. Delete the clone and test contacts.

---

### T-WF-31 · Check, activate and test WF-31 · After the job: referral and the year check-in
- Wave: F
- Depends on: T-WF-29 (same trigger, invoice paid), T-WF-35 (removes the contact on STOP or unsubscribe), T-WF-37 (pauses it). Templates: REV-02 · After job referral ask; REV-03 · After job 12 month check-in. Fields: Consent Marketing (consent_marketing), Ask For Google Review, Job Date.
- Time: 35 min

**Part 1, check the build (do not activate yet)**
Open "WF-31 · After the job: referral and the year check-in" in folder "09. Completion and payment". Dev only, no real contacts.
1. Status Draft. Trigger: final invoice marked fully paid, Residential pipeline ONLY (not Commercial & Industrial). Re-entry OFF. Stop on response: no.
2. The 12 month step is scheduled on entry so it survives everything else changing.
3. Step 1: Wait 7 days.
4. Step 2 If/Else: Consent Marketing is yes AND Ask For Google Review is Yes. Yes: Send Email "REV-02 · After job referral ask", from contact, subject "Know anyone else with the same problem?", send window applies. No other branch action.
5. Step 3: Wait until 12 months after Job Date.
6. Step 4 If/Else: Consent Marketing is yes. Yes: Send Email "REV-03 · After job 12 month check-in", from contact, subject "A year on, how is it going?", send window applies.
7. Tags and fields set: none. Error branch alert 11 to Glenn Angus. No other steps.
8. Ambiguities: REV-03 is labelled trigger "Job completed" in the message kit but the sheet starts the workflow at invoice paid; follow the sheet. Check how Consent Marketing is stored (yes or Yes) and that the condition matches.

**Part 2, activate and test**
Set up: contacts with own phone/email: "TEST Referral A" (consent yes, Ask Yes), "TEST Referral B" (consent yes, Ask No), "TEST Referral C" (consent no), "TEST Referral D" (Commercial pipeline). Give each Job Date set so the 12 month point is known.
1. Publish WF-31. Use a clone "TEST-copy of WF-31" with the 7 day wait at 2 minutes and the 12 month wait at 5 minutes (or set Job Date to a date about 12 months ago).
2. A: mark the final invoice paid. REV-02 arrives after the short wait inside the window; REV-03 arrives later.
3. B: REV-02 does not send; REV-03 still sends.
4. C: neither email sends.
5. Unsubscribe mid-way: on A, click unsubscribe after REV-02 (T-WF-35). The contact leaves this workflow and REV-03 never sends.
6. D (Commercial): marking paid does not enter WF-31.
7. On the real workflow, read the contact's scheduled step to confirm "7 days" and "12 months after Job Date".
Expected result: A gets both emails, B only REV-03, C none, D does not enter.
Evidence: screenshots of both conditions, the emails received, enrollment history for each contact.
Switch off afterwards: yes. Delete the clone and test contacts.

---

### T-WF-32 · Check, activate and test WF-32 · Progress claims
- Wave: E
- Depends on: T-WF-28 (same chase pattern); T-WF-29 (separate). Template: C-PAY-01 · Commercial progress claim. Fields: Invoice Number (invoice_number), PO Number (po_number). Needs the invoice action by hand.
- Time: 30 min

**Part 1, check the build (do not activate yet)**
Open "WF-32 · Progress claims" in folder "09. Completion and payment". Dev only, no real contacts.
1. Status Draft. Trigger: the owner sends a progress claim invoice while the works run; Commercial & Industrial pipeline ONLY. Check by hand that this trigger separates a progress claim from a final invoice.
2. Re-entry ON (one run per claim). Stop on response: no. The run stops when that claim is paid.
3. Step 1: Send Email "C-PAY-01 · Commercial progress claim", from brand, subject "Progress claim {{opportunity.invoice_number}}". Send window applies.
4. Step 2: Wait 30 days from the claim.
5. Step 3 If/Else: that claim is unpaid. Yes: Create Task for Rachael Angus (OFFICE), due day 30. Title: "CHASE {{contact.first_name}}: claim overdue". Description: "Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact."
6. Tags and fields set: none. Uses invoice_number and po_number inside C-PAY-01. Open the template and look for the placeholders "[stage or percentage]" and "[payment terms]"; these are still to confirm with Glenn, note them.
7. Error branch alert 11 to Glenn Angus. No other steps.

**Part 2, activate and test**
Set up: "TEST Claim Commercial" (own phone and email) with an opportunity on Commercial & Industrial, in a works stage, with invoice number and po_number filled (made-up values).
1. Publish WF-32.
2. Send a progress claim invoice by hand. C-PAY-01 arrives in the window with the claim number and po_number filled in.
3. 30 day wait: use a clone "TEST-copy of WF-32" with the wait at 2 minutes, or read the scheduled step on the contact. Unpaid at the end: task "CHASE TEST: claim overdue" for Rachael Angus appears.
4. Mark a second test claim paid before the wait ends: no task.
5. Send a second claim on the same card: a separate run starts.
6. Residential card: a progress claim must not start it.
Expected result: one email per claim, one task only for unpaid claims.
Evidence: screenshots of the email received, task, execution log, the invoice.
Switch off afterwards: yes. Delete the clone and test invoices.

---

### T-WF-33 · Check, activate and test WF-33 · Retention claim reminder
- Wave: E
- Depends on: T-WF-29 (moves cards to Retention Claim), T-WF-39 (Retentions due). Fields: Retention Amount (retention_amount), Retention Release Date (retention_release_date). Tags: is-retention-held, is-active-job. Stage "Retention Claim". Saved template RET-01 · Retention claim email is sent by hand, not by this workflow.
- Time: 35 min

**Part 1, check the build (do not activate yet)**
Open "WF-33 · Retention claim reminder" in folder "10. Retention". Dev only, no real contacts.
1. Status Draft. Trigger: stage changed to "Retention Claim" on both Residential and Commercial & Industrial. Re-entry OFF. Stop on response: no. No customer messages anywhere in the workflow (no send window; tasks follow task hours).
2. Step 1: Require Retention Amount and Retention Release Date on entry. A workflow cannot refuse a stage move, so open the pipeline stage "Retention Claim" and check the two fields are required there. If either is empty the workflow stops and notifies Glenn Angus.
3. Step 2: Wait until Retention Release Date.
4. Step 3: Create Task for Rachael Angus (OFFICE), due on the release date. Title: "CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}". Description: "The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card."
5. Step 4: Wait 30 days.
6. Step 5 If/Else: still in stage "Retention Claim". Yes: Create Task for Rachael Angus (OFFICE), due 30 days after the release date. Title: "CHASE {{contact.first_name}}: retention unpaid". Description: "A month since the retention claim went and it has not been paid. Ring the accounts contact and ask where it sits, and whether anything is needed from us before it is released."
7. Step 6: when the retention is marked paid by hand: close the card as Won, Remove Tag "is-retention-held", Remove Tag "is-active-job". This is a manual event; it may be a separate trigger or done by hand. Note which one is built.
8. Tags removed on paid: is-retention-held, is-active-job. Error branch alert 11 to Glenn Angus. No other steps.

**Part 2, activate and test**
Set up: "TEST Retention" (own phone and email) with an open won opportunity, tags is-retention-held and is-active-job on.
1. Publish WF-33.
2. Try to move the card to "Retention Claim" with Retention Amount and Retention Release Date empty: the stage should refuse.
3. Fill both fields (amount 1000, release date tomorrow) and move the card. Watch the contact: workflow is waiting until the release date. On the release date the task "CLAIM TEST: retention of 1000" appears for Rachael Angus, due that day.
4. For 30 days: do not wait; use a clone "TEST-copy of WF-33" with a release date a few minutes ahead and the 30 day wait at 2 minutes. Card still in Retention Claim: task "CHASE TEST: retention unpaid" appears.
5. Mark the retention paid by hand: the card closes as Won, both tags come off, and no later task appears.
6. Confirm no email or text is sent at any point.
Expected result: stage refuses without fields; CLAIM task on the release date; CHASE task 30 days later; paid closes Won and removes both tags.
Evidence: screenshots of the stage refusal, tasks, tags before and after, opportunity status.
Switch off afterwards: yes. Delete the clone and test records.

---

### T-WF-34 · Check, activate and test WF-34 · Customer replied
- Wave: A
- Depends on: T-WF-06, T-WF-10, T-WF-11, T-WF-16 (paused by it), T-WF-28 (payment reminders, paused), T-WF-07, T-WF-21, T-WF-25 (must keep running). If the workflows WF-06, 10, 11, 16, 28 do not exist in Dev, the removal step cannot be built. Tags: is-unresponsive, is-stalled. Alert 3 (Inbound reply).
- Time: 35 min

**Part 1, check the build (do not activate yet)**
Open "WF-34 · Customer replied" in folder "11. Always on". Dev only, no real contacts.
1. Status Draft. Trigger: Customer Replied (inbound SMS OR inbound email) from a contact with an open opportunity. Re-entry ON (fires on every inbound message). Stop on response: not applicable. Alert follows quiet hours. Sheet note: alert 3's list entry says SMS only, but this workflow also fires on email; build is SMS or email (decision 5).
2. Step 1: Remove from Workflow (this is how we pause): "WF-06", "WF-10", "WF-11", "WF-16" and "WF-28" (payment reminders). It must NOT remove "WF-07", "WF-21" or "WF-25" (reminders about an agreed date keep running). Sheet ambiguity: decision 4 lists WF-13 instead of WF-28; follow the sheet and note it.
3. Remove Tag "is-unresponsive" and Tag "is-stalled".
4. Internal Notification: alert 3 (Inbound reply) to the assigned user. Body: REPLY from {{contact.first_name}}: "{{message.body}}". Channel: email and in-app if the assigned user is Rachael Angus (OFFICE); SMS and email if Glenn Angus (OWNER).
5. Create Task, role Assigned user, due 1 hour. Title: "REPLY {{contact.first_name}}: they messaged". Description: "A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds."
6. Nothing further: the sequences resume only when someone replies from the platform and chooses to resume (re-add the contact), never automatically.
7. Error branch alert 11 to Glenn Angus. No other steps. Assigned user's quiet hours for the task are not specified in the sheet.

**Part 2, activate and test**
Set up: "TEST Replier" (tester's own phone and email) with an open opportunity assigned to the tester (or Rachael/Glenn after telling them), tag is-unresponsive and is-stalled on. Enrol the contact in WF-10 (and separately a second contact "TEST Replier Date" in WF-21).
1. Publish WF-34 (and make sure WF-10 and WF-21 are published or in draft with the test contact enrolled as the platform allows).
2. From the tester's phone, reply by SMS to a message from the business number. Watch within 1 minute: the contact is removed from WF-10 (workflow history), tags is-unresponsive and is-stalled removed, alert 3 reaches the assigned user (check email, in-app, and SMS for OWNER), task "REPLY TEST: they messaged" due in 1 hour.
3. "TEST Replier Date" in WF-21 replies: WF-21 keeps running (contact still enrolled).
4. Repeat with a reply by email: same result.
5. Wait 10 minutes without resuming: no sequence restarts by itself.
6. Contact in WF-28 replies: WF-28 stops for the contact.
Expected result: pauses, tag removal, one alert, one task per reply; no automatic restart.
Evidence: screenshots of workflow history, tags, alert received, task and its due time.
Switch off afterwards: no, WF-34 is always on and should stay on once Part 2 passes. If any test contact remains enrolled elsewhere, remove it.

---

### T-WF-35 · Check, activate and test WF-35 · STOP and unsubscribe
- Wave: A
- Depends on: T-WF-16, T-WF-31 (contact is removed from them). Tags: is-no-marketing, is-nurturing. Field do_not_sms (set natively by STOP).
- Time: 25 min

**Part 1, check the build (do not activate yet)**
Open "WF-35 · STOP and unsubscribe" in folder "11. Always on". Dev only, no real contacts.
1. Status Draft. Trigger: inbound SMS that reads STOP, OR an email unsubscribe link is used. Re-entry ON. Runs immediately with no wait, outside any send window.
2. Exactly three steps, in order: (1) Add Tag "is-no-marketing". (2) Remove Tag "is-nurturing". (3) Remove from Workflow "WF-16" and "WF-31". The opportunity card is NOT moved or closed.
3. No step touches the do-not-SMS flag. Native platform behaviour (do not build): STOP sets do-not-SMS; unsubscribe sets do-not-email for marketing. Check by hand that the do-not-SMS flag does not block transactional messages about a live job (reminders, deposit, invoice).
4. Tags set: adds is-no-marketing; removes is-nurturing. Error branch alert 11 to Glenn Angus. No other steps. The sheet lists no open items; confirm the native handling on a test contact before relying on it.

**Part 2, activate and test**
Set up: "TEST Stop" (tester's own phone and email) with tag is-nurturing, enrolled in WF-16, and a booked job so a reminder is due. A second contact "TEST Unsub" enrolled in WF-31.
1. Publish WF-35.
2. From the tester's phone, text STOP to the business number. Within 1 minute: do-not-SMS is set on the contact, tag is-no-marketing added, is-nurturing removed, contact removed from WF-16. The card stays in its stage.
3. "TEST Unsub": click the unsubscribe link in a marketing email. Removed from WF-31, and REV-03 never sends later.
4. On "TEST Stop" trigger a transactional message about the live job (for example a reminder or deposit text). It must still send (do-not-SMS must not block it). If it is blocked, record it and set Blocked.
5. Confirm the card stays in its stage in the pipeline.
Expected result: three changes listed above, transactional messages still go, card unmoved.
Evidence: screenshots of tags, do-not-SMS flag, workflow history, the transactional message delivered.
Switch off afterwards: no, WF-35 stays on once passed. Clear the do-not-SMS flag on the test contact if it is to be reused (or delete it).

---

### T-WF-36 · Check, activate and test WF-36 · Stalled card monitor
- Wave: G
- Depends on: T-WF-34 (removes is-stalled on a reply), T-WF-39 (2x line item), T-WF-40 (3x list). Tag: is-stalled. Stall thresholds per stage are in CRM-PIPELINES.md (get them from Zen or Glenn; they are not repeated in the sheet).
- Time: 35 min

**Part 1, check the build (do not activate yet)**
Open "WF-36 · Stalled card monitor" in folder "11. Always on". Dev only, no real contacts.
1. Status Draft. Trigger: Scheduled, daily at 6:45am, timezone Australia/Brisbane. Runs over all open cards. Re-entry not applicable. Stop on response: no. No customer messages.
2. Step 1: for every open card, compare time in stage with that stage's stall threshold from the pipeline design. The platform may not loop over all cards in a scheduled workflow; it may be built with a smart list or per-stage versions. Note how it is built.
3. Step 2 If/Else: over the threshold. Yes: Add Tag "is-stalled". The stage task reappears at the top of the assigned user's list.
4. Step 3 If/Else: over 2x the threshold. Yes: line item in the daily summary (WF-39).
5. Step 4 If/Else: over 3x the threshold. Yes: named in the weekly review (WF-40), with the card.
6. is-stalled is the only tag added. How the 2x and 3x cards reach WF-39 and WF-40 (a tag or field they read) is not defined in the sheet; write down what the build uses.
7. Sheet ambiguity: the sources do not say who removes is-stalled when a card moves (WF-34 removes it on a reply only). Test it in step 6 below and note the result.
8. Error branch alert 11 to Glenn Angus. No other steps.

**Part 2, activate and test**
Set up: three test opportunities for contacts "TEST Stall 1x", "TEST Stall 2x", "TEST Stall 3x" (own phone and email), each in the same stage whose stall threshold you know. Make them old enough: set "time in stage" by creating them and, if the platform allows, editing the stage-change date; if not, use a stage with a short threshold or ask Zen how.
1. Publish WF-36, or run it once now: open the workflow and use Run / Test now (or temporarily change the schedule to a few minutes ahead, then restore 6:45am).
2. 1x card (just over the threshold): is-stalled is added and the stage task reappears at the top of the assigned user's list.
3. 2x card: appears in the next 7:00am daily summary (T-WF-39) as a line item.
4. 3x card: appears in the next Monday weekly report as "Cards stalled 3x" (T-WF-40).
5. Make sure no customer receives any message.
6. Move the 1x card to another stage: is-stalled should come off. If it does not, record it and carry on.
Expected result: tag on stalled cards, 2x in the daily summary, 3x in the weekly report, no messages.
Evidence: screenshots of the schedule, tags on the three cards, the summaries, the execution log.
Switch off afterwards: if you changed the schedule, restore 6:45am daily. Leave it on only once passed; otherwise switch off. Remove is-stalled from test contacts and delete them.

---

### T-WF-37 · Check, activate and test WF-37 · Negative review or complaint
- Wave: F
- Depends on: T-WF-38 (must suppress alert 14 for the CALL task), T-WF-16 and T-WF-31 (marketing it pauses), T-WF-30 (blocked by is-complaint). Tag: is-complaint. Field: Ask For Google Review. Alert 10 (critical, sends Saturday too). Needs the review integration.
- Time: 35 min

**Part 1, check the build (do not activate yet)**
Open "WF-37 · Negative review or complaint" in folder "11. Always on". Dev only, no real contacts.
1. Status Draft. Two triggers: (a) a review received under 4 stars; (b) tag "is-complaint" added to a contact. Re-entry ON (once per review or tag). Stop on response: no. The review trigger needs the platform's review integration; check by hand that it exists in Dev.
2. Step 1: Internal Notification, alert 10 (Negative review or complaint) to Glenn Angus (OWNER) by SMS and email. Body: REVIEW {{review.rating}} stars from {{review.author}}. Call them today. It is critical and sends Saturday too.
3. Step 2: Create Task for Glenn Angus, due the same day. Title: "CALL {{contact.first_name}}: review or complaint, today". Description: "Ring them today. Most unhappy customers are fixed by one call and almost none by silence, and a public reply written before you have spoken to them tends to make it worse. Any marketing to that contact is paused until the call has happened."
4. Step 3: Update Field Ask For Google Review = No.
5. Step 4: pause any marketing sequence on the contact until the call has happened (Remove from Workflow). Check which workflows are named (at least WF-16 and WF-31). Sheet ambiguity: no way to resume after the call is defined; a person re-adds the contact (decision 8). been-reviewed is not set by anything.
6. Tags and fields: adds is-complaint (this is the trigger tag); sets ask_for_google_review = No. Error branch alert 11 to Glenn Angus. No other steps.

**Part 2, activate and test**
Set up: "TEST Complaint" (own phone and email) enrolled in WF-16 and WF-31 with Ask For Google Review = Yes. Warn Glenn that a test alert 10 may reach him, or set the OWNER contact details to the tester's own for the test and restore them afterwards.
1. Publish WF-37.
2. Add tag is-complaint to the test contact. Watch within 1 minute: alert 10 arrives by SMS and email with "REVIEW ... stars from ... Call them today."; task "CALL TEST: review or complaint, today" is due today; Ask For Google Review changes to No; the contact is removed from WF-16 and WF-31.
3. Check that the task creation does not send a second text (WF-38 suppresses alert 14): only one SMS in total.
4. Review test: through the review integration, post a 3 star review for another test contact: same result. A 4 or 5 star review: nothing happens.
5. Re-add is-complaint after removing it: it runs again (once per tag).
Expected result: alert 10 once, CALL task, field No, marketing paused, no second text.
Evidence: screenshots of the alert received, the task, the field, workflow history, tag.
Switch off afterwards: no, leave on once passed. Restore any OWNER contact details changed for the test and remove is-complaint from the test contact.

---

### T-WF-38 · Check, activate and test WF-38 · Assigned to you
- Wave: A
- Depends on: T-WF-01 (alert 1 covers new lead assignment), T-WF-37 (must not cause alert 14), T-WF-34. Alert 14 (Assigned to you).
- Time: 30 min

**Part 1, check the build (do not activate yet)**
Open "WF-38 · Assigned to you" in folder "11. Always on". Dev only, no real contacts.
1. Status Draft. Two triggers: a card is assigned or reassigned to someone; OR a task is created for Glenn Angus (OWNER). Re-entry ON. Stop on response: no. Alert 14 follows quiet hours.
2. Step 1 If/Else: this is the automatic assignment of a new lead to the office. Yes: stop (alert 1 already covers it).
3. Step 2 If/Else: the workflow that made the task or assignment has just sent the owner another alert about the same card. Yes: stop (one event never sends the owner two texts). It is built as a short wait of 1 minute, then a check for a recent internal alert on the card (builder's choice, still to confirm). The two stop checks must come before the notification, in this order.
4. Step 3: Internal Notification alert 14 (Assigned to you) to whoever it is assigned to: OWNER (Glenn Angus) by SMS and email; OFFICE (Rachael Angus) by email. Body: ASSIGNED TO YOU: {{opportunity.name}}, {{contact.phone}} then {{task.title}}.
5. Tags and fields set: none. Error branch alert 11 to Glenn Angus. No other steps. Detection of "just sent another alert" is not defined in the sources; follow the sheet and note what is built.

**Part 2, activate and test**
Set up: "TEST Assign" (own phone and email) with an opportunity. For the test, tell Glenn and Rachael or set the tester as the assigned user and restore afterwards.
1. Publish WF-38.
2. A new lead auto-assigned to the office (create a new TEST enquiry): no alert 14; only alert 1.
3. Reassign the card to Glenn Angus by hand: alert 14 arrives by SMS and email, body "ASSIGNED TO YOU: <opportunity name>, <phone>" then the task title. Allow about 1 to 2 minutes (the 1 minute wait).
4. Reassign to Rachael Angus: email only.
5. Trigger the complaint flow (add is-complaint, T-WF-37) so a task is created for the owner: only alert 10 arrives, no alert 14.
6. Run one test outside quiet hours and one inside (if possible) to check alert 14 is held or sent as the quiet hours say.
Expected result: alert 14 only in steps 3 and 4, with the right channels; none in steps 2 and 5.
Evidence: screenshots of the alerts received, the workflow execution log showing the stop branches.
Switch off afterwards: no, leave on once passed. Restore assignments and remove test cards.

---

### T-WF-39 · Check, activate and test WF-39 · Daily summary
- Wave: G
- Depends on: T-WF-27 (Invoices to send), T-WF-29 (Job reports to send), T-WF-33 (Retentions due), T-WF-36 (2x stalled line item). Reads many fields and smart lists (see layout below).
- Time: 40 min

**Part 1, check the build (do not activate yet)**
Open "WF-39 · Daily summary" in folder "12. Reporting". Dev only, no real contacts.
1. Status Draft. Trigger: Scheduled, 7:00am Monday to Saturday (no Sunday), timezone Australia/Brisbane. Internal only; no customer messages. Stop on response: no.
2. One Send Email step, to Glenn Angus and Rachael Angus (both). Subject "Daily summary" (chosen by the builder, not in the sheet; note it).
3. The body has three sections in this order, NEEDS YOU last on purpose:
   - YESTERDAY: New enquiries {{count}}; Calls made {{count}}; Quotes sent {{count}}; Quotes accepted {{count}}, {{value}}
   - TODAY: Inspections {{list with time and address}}; Installs {{list with crew}}; Phone calls booked {{list with time}}; Deposits due {{list with amount}}
   - NEEDS YOU (10 lines): Leads not called {{list}}; Quotes to write {{list, waiting in Quoting}}; Callbacks due {{list}}; Installs to book {{list, over 2 days in Booking Required}}; Dates not confirmed {{list, no Yes or No on either reminder}}; Deposits unpaid {{list with amount and due date}}; Invoices to send {{list, drafts not yet sent}}; Invoices overdue {{list with amount and days}}; Job reports to send {{list, paid but report not sent}}; Retentions due {{list with release date}}
4. Leads not called stay at the top of NEEDS YOU until a call is logged. Cards over 2x their stall threshold (WF-36) get a line item; where it sits is not defined in the sheet.
5. Order note: Deposits unpaid is before Invoices to send (follows the notifications document; the data file order is not binding).
6. Every placeholder needs a data source (smart lists or a reporting action) because an email step cannot count by itself. For each line, write down which source it reads; mark any that are empty or unbuilt.
7. Tags and fields set: none. Error branch alert 11 to Glenn Angus. No other steps.

**Part 2, activate and test**
Redirect: during testing the email must go ONLY to the tester's own address. Open the Send Email step, note the current recipients (Glenn Angus and Rachael Angus) in the ClickUp comment, then replace them with the tester's own email (or tick "send to" only the tester). Do not send to Glenn or Rachael during the test.
1. Set up the data: "TEST Summary" (own phone and email): an enquiry created yesterday (so New enquiries = 1), a lead not called, a draft final invoice unsent (T-WF-27), and a paid invoice with no job_report_sent_at.
2. Run the workflow once now (Run / Test now, or set a manual enrol). If the platform needs a Tuesday 7:00am to test the schedule, set the schedule to a few minutes ahead, run, then set it back to 7:00am Monday to Saturday.
3. Check the email layout against the three sections above, and the counts: New enquiries shows 1; the uncalled lead appears under Leads not called at the top of NEEDS YOU; the draft invoice appears under Invoices to send; the paid invoice appears under Job reports to send.
4. Sunday: confirm the schedule skips Sunday (read the schedule; do not wait).
5. Restore the recipients to Glenn Angus and Rachael Angus. Open the step again and confirm both addresses are back.
Expected result: one email to the tester with the right layout and numbers, none on Sunday, recipients restored.
Evidence: screenshots of the schedule, the received email, the test data, and the restored recipients.
Switch off afterwards: Switch off until Glenn approves going live; then it should stay on. If the recipients were not restored, do not switch on.

---

### T-WF-40 · Check, activate and test WF-40 · Weekly and monthly reports
- Wave: G
- Depends on: T-WF-36 (Cards stalled 3x), T-WF-39, T-WF-29. Fields read: utm_source, gclid, fbclid, source, submitted_at. Alert 11 (Automation failure).
- Time: 45 min

**Part 1, check the build (do not activate yet)**
Open "WF-40 · Weekly and monthly reports" in folder "12. Reporting". It may be built as one workflow with three scheduled steps or two scheduled workflows; find both. Dev only, no real contacts.
1. Status Draft. Triggers: Scheduled, Monday 7:00am (weekly) and the 1st of the month 7:00am (monthly), timezone Australia/Brisbane. Internal only. Stop on response: no. If the 1st falls on a Monday, two emails go the same morning (known).
2. Weekly email to Glenn Angus only, subject "Weekly report" (builder's choice; note it), body: LAST WEEK, BOTH BOARDS: Enquiries {{count}}, by source; Median time to first call; Days in Quoting {{average}}; Closed as Unreachable {{count}}; Quotes sent {{count}}, {{value}}; Quotes accepted {{count}}, {{value}}; Lost {{count}}, by reason. PIPELINE NOW: Open value {{value}} (the forecast); Accepted, not done {{value}} (committed work); Cards stalled 3x {{list}}. DELIVERY: Jobs completed {{count}}; Average days accepted to paid; Invoices outstanding {{value}}; Retentions held {{value}}. "Open value" and "Accepted, not done" must be two separate lines, never one.
3. Monthly email to Glenn Angus, subject "Monthly report": cost per enquiry and cost per accepted job, by utm_source, gclid and fbclid, against paid revenue (not quotes sent). Layout: one table per source with columns Source, Spend, Enquiries, Cost per enquiry, Accepted jobs, Cost per accepted job, Paid revenue (seven columns). The table layout is the sheet's suggestion only; the ad spend source is not defined; note what is used.
4. Weekly reconciliation: count website submissions against opportunities created. If they do not match, Internal Notification alert 11 (Automation failure) to Glenn Angus only. If they match, no alert.
5. Tags and fields set: none. Error branch alert 11 to Glenn Angus. No other steps.
6. For each count and list, write which data source feeds it (smart lists or reporting) and flag any that are empty.

**Part 2, activate and test**
Redirect: both reports go to Glenn Angus. During testing change the recipient of each email step AND the alert 11 recipient in the reconciliation step to the tester's own address only. Note the original recipients in the ClickUp comment first; restore them afterwards and confirm.
1. Publish (or run once) WF-40. Use Run / Test now, or set each schedule to a few minutes ahead and then put it back (Monday 7:00am; the 1st at 7:00am).
2. Weekly: the email lands in the tester's inbox with the three sections and the two separate pipeline lines.
3. Monthly: the email lands with the seven table columns per source.
4. Create a card stalled over 3x (see T-WF-36): it appears under Cards stalled 3x.
5. Create a website submission (fill the website form with a TEST name) and delete the matching opportunity so there is no match: alert 11 fires to the tester. Then add the opportunity back so the counts match, run again: no alert.
6. Restore the recipients: Glenn Angus on both emails and the alert. Open each step and confirm.
Expected result: weekly and monthly emails correct; alert 11 only when counts differ; recipients restored.
Evidence: screenshots of schedules, both emails, the stalled card line, the alert, the restored recipients.
Switch off afterwards: Switch off until Glenn approves going live; leave recipients restored. Delete the test submission and contact.
