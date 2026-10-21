# Hand-build sheets: WF-27 to WF-40 (folders 09 to 12)

Built from journey-data.js (workflows array), CRM-WORKFLOWS.md, CRM-TASKS-NOTIFICATIONS.md and message-index.md. Where they disagree, the data file wins and the conflict is listed under Open items.

Shared settings for every sheet below (not repeated):
- Timezone: Australia/Brisbane, as set on the account.
- Send window: messages marked business-hours wait for the window. Window per the data file (quietHours): Monday to Friday 7am to 6pm, Saturday 8am to 2pm, nothing Sunday or public holidays. Held messages release at the next window. Alerts and tasks are not messages: see the quiet hours table (alerts all Mon-Fri 7am-6pm; Saturday only alerts 1, 2, 6, 10, 11, 12; tasks held outside Mon-Fri 7am-6pm).
- Roles: OWNER = Glenn Angus, OFFICE = Rachael Angus, CREW_LEAD = per job.
- Error branch (house convention): on any step error, fire alert 11 to OWNER with the workflow name and the contact.
- Re-entry and stop-on-response are not stated per workflow in the sources. The value given in each sheet is the sheet's working choice, flagged in Open items.
- Email from-name: "contact" = {{custom_values.from_name_contact}}, "brand" = {{custom_values.from_name_brand}}. SMS comes from the business number.

---

## WF-27 · Job completed: the draft final invoice and the review question   (folder "09. Completion and payment")
- Trigger: Opportunity stage changed to Job Completed (either board).
- Settings: re-entry off (once per job). Stop on response: no. Window: JOB-05 and C-DONE-01 wait for the send window; the invoice draft and tasks do not.
- Steps:
  1. If/Else: photos_captured is ticked? (Guard. The stage requires it on entry, so this only confirms.)
  2. If/Else: board is Residential
     - Yes: Send Email JOB-05 · Job complete email, from contact.
     - No (Commercial): Send Email C-DONE-01 · Commercial works complete, from contact.
  3. Create the final invoice as a DRAFT from the accepted quote: balance after any deposit, with its payment schedule (one amount, or stages by percentage or fixed amount, each with a due date), the accepted quote and any purchase order attached. Do not send it.
  4. Create Task, role OWNER, due 2 business days. Title: "INVOICE {{contact.first_name}}: check and send the final invoice". Text: "The job is marked complete and a draft final invoice is ready: the balance after any deposit, with the payment schedule and the accepted quote and any purchase order attached. Adjust it for the area actually sprayed, with a variation invoice or a credit, then send it. Sending it starts the payment reminders."
  5. Create Task, role OWNER, due 7 days. Title: "REVIEW {{contact.first_name}}: ask for a Google review?". Text: "The job is marked complete. Leave Ask for Google review on Yes, or set it to No on the contact for a job that had problems or a repeat commercial client such as Bondor or Australian Housing. Yes sends one text four weeks after the job. No sends no review request and no referral email."
  6. Wait 2 business days.
  7. If/Else: the draft has not been sent
     - Yes: nothing to build as a step. The opportunity stays listed under "Invoices to send" in the daily summary (WF-39) until it goes.
  8. Agency note (no step): once Glenn has settled how he wants final invoices set out, the send can be automated.
- Tags and fields it sets: none. Reads photos_captured, ask_for_google_review.
- Stops when: the owner sends the final invoice, which hands over to WF-28.
- Test:
  1. Residential test card, photos_captured ticked, move to Job Completed: JOB-05 queued (sends if inside the window), draft invoice exists unsent, two OWNER tasks appear with the due times above.
  2. Same on a Commercial card: C-DONE-01 sends instead of JOB-05.
  3. Try to move to Job Completed with photos_captured empty: the stage should refuse.
  4. Leave the draft unsent for 2 business days: the card shows under Invoices to send in the next daily summary.
  5. Send the draft: WF-28 starts.
- Open items: the 2-day wait and the daily summary line (step 7) are listed only as a description, no separate action is built. "Business day" counts Mon-Fri; confirm with Glenn if Saturday counts. The final-invoice send automation is deferred to the agency.

---

## WF-28 · Final invoice sent and the chase   (folder "09. Completion and payment")
- Trigger: The owner sends the final invoice or final claim.
- Settings: re-entry on (a variation invoice sent later starts its own chase). Stop on response: no (invoice reminders pause via WF-34, see its step 1). Window: PAY-01, PAY-02, PAY-03 all marked business-hours.
- Steps:
  1. Send Email PAY-01 · Final invoice email, from brand, as the invoice email itself (invoice attached).
  2. Update Field: invoice_number, invoice_sent_at = from the invoice.
  3. If/Else: board is Residential
     - Yes:
       1. Wait until day 7 after it is sent.
       2. Send SMS PAY-02 · Invoice day 7 text.
       3. Wait until day 14 after it is sent.
       4. Send Email PAY-03 · Invoice day 14 overdue, from brand.
       5. Create Task, role OFFICE, due day 14 after it is sent. Title: "CHASE {{contact.first_name}}: payment overdue". Text: "Fourteen days since the final invoice was sent, and it is unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead."
     - No (Commercial):
       1. Wait until day 30 after it is sent.
       2. If/Else: unpaid
          - Yes: Create Task, role OFFICE, due day 30. Title: "CHASE {{contact.first_name}}: claim overdue". Text: "Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact."
- Tags and fields it sets: invoice_number, invoice_sent_at.
- Stops when: the invoice is marked paid (check "paid" before every send; stops dead).
- Test:
  1. Residential card, send a final invoice: PAY-01 goes with the invoice; invoice_number and invoice_sent_at are filled.
  2. Fast-forward to day 7 unpaid: PAY-02 text sends inside the window. Mark paid first and repeat: nothing sends.
  3. Day 14 unpaid: PAY-03 email and the OFFICE task appear.
  4. Commercial card: no day 7 or 14 messages; at day 30 unpaid only the OFFICE task appears.
  5. Customer replies after PAY-01: PAY-02 and PAY-03 pause (WF-34).
- Open items: Xero sends its own reminders too. Decide which system sends them and switch the other off so a customer never gets both. PAY-01 is marked business-hours but also "as the invoice email itself" on send: confirm it is exempt from the window or held. Commercial claim terms still to confirm with Glenn.

---

## WF-29 · Final invoice paid: report and close   (folder "09. Completion and payment")
- Trigger: Final invoice marked fully paid.
- Settings: re-entry off (once per job). Stop on response: no. Window: C-CLOSE-01 waits for the send window; tasks follow the task hours.
- Steps:
  1. Update Field: final_invoice_paid_at = now.
  2. Create Task, role OWNER, due same day as payment. Title: "SEND {{contact.first_name}}: job report and certificates". Text: "The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid."
  3. If/Else: board is Commercial
     - Yes:
       1. Wait 1 day.
       2. Send Email C-CLOSE-01 · Commercial paid and closed, from contact.
       3. Create Task, role OWNER, due day 7. Title: "REFERENCE {{contact.first_name}}: ask, and record the answer". Text: "Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager's word is worth more on a tender than any number of homeowner reviews."
  4. If/Else: retention_amount is set
     - Yes:
       1. Update Opportunity: move to stage Retention Claim.
       2. Add Tag is-retention-held. Status stays Won; the card stays open until the retention is paid.
     - No: Update Opportunity: close the card as Won. Remove Tag is-active-job.
  5. Add Tag been-customer. (Per the tag block: adds been-customer, is-retention-held; removes is-active-job. See Open items on order.)
- Tags and fields it sets: adds been-customer; adds is-retention-held only when a retention is held; removes is-active-job only when no retention is held (otherwise WF-33 removes it). Field final_invoice_paid_at. Reads retention_amount. The task text refers to job_report_sent_at, stamped by hand.
- Stops when: runs once per job.
- Test:
  1. Residential card, no retention, mark paid: final_invoice_paid_at set, SEND task for OWNER appears, card closes Won, is-active-job off, been-customer on.
  2. Commercial card: after 1 day C-CLOSE-01 sends in the window and the REFERENCE task is due day 7.
  3. Card with retention_amount set: card moves to Retention Claim, is-retention-held on, is-active-job stays on, card stays open.
  4. Mark paid twice: second run does nothing.
- Open items: the data file puts been-customer in the tag list, not as a numbered step; step 5 places it last, move it where convenient. Job report is sent by hand (JOB-06 is a saved template, not in this workflow).

---

## WF-30 · Google review request   (folder "09. Completion and payment")
- Trigger: job_date passes on a job marked complete.
- Settings: re-entry off. Stop on response: no. Window: REV-01 waits for the send window.
- Steps:
  1. Wait 4 weeks after job_date. (The range agreed was 4 to 6 weeks.)
  2. If/Else: ask_for_google_review is Yes AND the contact has no is-complaint tag AND been-review-asked is not on the contact
     - Yes: Send SMS REV-01 · Google review text. Then Add Tag been-review-asked.
     - No: stop here, no request.
- Tags and fields it sets: adds been-review-asked. Reads ask_for_google_review, job_date.
- Stops when: asked once per contact, never chased.
- Test:
  1. Complete job, ask_for_google_review Yes, no complaint: after 4 weeks REV-01 sends in the window and been-review-asked is added.
  2. Set ask_for_google_review to No: nothing sends.
  3. Add is-complaint before the wait ends: nothing sends.
  4. Contact already has been-review-asked (second job): nothing sends.
- Open items: the Add Tag follows from the tag block (adds been-review-asked) and is not a listed step. The data file gives the trigger as "job_date passes" plus a 4 week wait after job_date, which reads as a 4 week delay from the install date, not from the day it passes; build as the Wait 4 weeks after job_date.

---

## WF-31 · After the job: referral and the year check-in   (folder "09. Completion and payment")
- Trigger: Final invoice marked fully paid. Residential board only.
- Settings: re-entry off. Stop on response: no. Window: REV-02 and REV-03 wait for the send window. The 12 month step is scheduled on entry so it survives everything else changing.
- Steps:
  1. Wait 7 days.
  2. If/Else: consent_marketing is yes AND ask_for_google_review is Yes
     - Yes: Send Email REV-02 · After job referral ask, from contact.
  3. Wait until 12 months after job_date.
  4. If/Else: consent_marketing is yes
     - Yes: Send Email REV-03 · After job 12 month check-in, from contact.
- Tags and fields it sets: none. Reads consent_marketing, ask_for_google_review, job_date.
- Stops when: runs to the end. WF-35 removes the contact from it on STOP or unsubscribe.
- Test:
  1. Consent yes, review Yes, mark paid: REV-02 sends at +7 days inside the window.
  2. ask_for_google_review No: REV-02 does not send; REV-03 still sends at 12 months if consent yes.
  3. consent_marketing no: neither email sends.
  4. Unsubscribe mid-way (WF-35): contact leaves this workflow, REV-03 never sends.
  5. Commercial card marked paid: does not enter.
- Open items: REV-03 is marked trigger "Job completed" in the message kit but the workflow starts at invoice paid; build as the workflow shows.

---

## WF-32 · Progress claims   (folder "09. Completion and payment")
- Trigger: The owner sends a progress claim invoice while the works run. Commercial board only.
- Settings: re-entry on (one run per claim). Stop on response: no. Window: C-PAY-01 waits for the send window.
- Steps:
  1. Send Email C-PAY-01 · Commercial progress claim, from brand.
  2. Wait 30 days from the claim.
  3. If/Else: that claim is unpaid
     - Yes: Create Task, role OFFICE, due day 30. Title: "CHASE {{contact.first_name}}: claim overdue". Text: "Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact."
- Tags and fields it sets: none. Uses invoice_number and po_number inside C-PAY-01.
- Stops when: the claim is paid.
- Test:
  1. Commercial card, send a progress claim: C-PAY-01 sends with the claim number and po_number filled.
  2. Day 30 unpaid: OFFICE task appears.
  3. Mark paid before day 30: no task.
  4. Send a second claim: a separate run starts.
- Open items: payment terms and whether claims follow a percentage, a milestone or a monthly cycle are still to confirm with Glenn (C-PAY-01 has [stage or percentage] and [payment terms] placeholders in its body).

---

## WF-33 · Retention claim reminder   (folder "10. Retention")
- Trigger: Stage changed to Retention Claim.
- Settings: re-entry off. Stop on response: no. No customer messages, so no send window; tasks follow task hours.
- Steps:
  1. Require retention_amount and retention_release_date on entry to the stage.
  2. Wait until retention_release_date.
  3. Create Task, role OFFICE, due on the release date. Title: "CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}". Text: "The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card."
  4. Wait 30 days.
  5. If/Else: still in Retention Claim
     - Yes: Create Task, role OFFICE, due 30 days after the release date. Title: "CHASE {{contact.first_name}}: retention unpaid". Text: "A month since the retention claim went and it has not been paid. Ring the accounts contact and ask where it sits, and whether anything is needed from us before it is released."
  6. When the retention is marked paid by hand: close the card as Won, Remove Tag is-retention-held, Remove Tag is-active-job.
- Tags and fields it sets: removes is-retention-held and is-active-job when marked paid. Requires retention_amount, retention_release_date.
- Stops when: the retention is marked paid by hand.
- Test:
  1. Move a card to Retention Claim without the two fields: stage refuses.
  2. With both fields and a release date 1 day out: CLAIM task appears on that date for OFFICE.
  3. Leave it 30 days: CHASE task appears.
  4. Mark paid by hand: card closes Won, both tags come off, no later task.
- Open items: the retention claim itself (RET-01) is a saved template sent by hand, not by this workflow.

---

## WF-34 · Customer replied   (folder "11. Always on")
- Trigger: Inbound SMS or email from a contact with an open opportunity.
- Settings: re-entry on (fires on every inbound message). Stop on response: n/a. Alerts follow quiet hours.
- Steps:
  1. Remove from Workflow (pause) the sales sequences on the contact: WF-06, WF-10, WF-11, WF-16, and the payment reminders in WF-28. Reminders about an agreed date (WF-07, WF-21, WF-25) keep running.
  2. Internal Notification: alert 3 (Inbound reply) to the assigned user. Body: REPLY from {{contact.first_name}}: "{{message.body}}". Channel: email and in-app to OFFICE, or SMS and email to OWNER.
  3. Create Task, role Assigned user, due 1 hour. Title: "REPLY {{contact.first_name}}: they messaged". Text: "A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds."
  4. The sequences resume only when someone replies from the platform and chooses to resume, never automatically.
- Tags and fields it sets: removes is-unresponsive and is-stalled.
- Stops when: fires on every inbound message.
- Test:
  1. Contact in the WF-10 follow-up replies by SMS: WF-10 pauses, alert 3 goes to the assigned user, REPLY task due in 1 hour.
  2. Contact in WF-21 (date reminder) replies: WF-21 keeps running.
  3. Contact with is-unresponsive replies: tag comes off.
  4. Reply by email: same result.
  5. Wait without resuming: no sequence restarts by itself.
- Open items: alert 3's trigger in the alerts list is "Contact replies by SMS" only, but this workflow also fires on email; build as the workflow (SMS or email). Assigned user's quiet hours not specified for tasks.

---

## WF-35 · STOP and unsubscribe   (folder "11. Always on")
- Trigger: Inbound SMS reads STOP, or an email unsubscribe link is used.
- Settings: re-entry on. Stop on response: n/a. Runs immediately, outside any window.
- Steps:
  1. Native platform behaviour (confirm, do not build): STOP sets do-not-SMS on the contact; unsubscribe sets do-not-email for marketing.
  2. Add Tag is-no-marketing.
  3. Remove Tag is-nurturing.
  4. Remove from Workflow WF-16 and WF-31. Leave the card where it is so a later enquiry is still recognised.
  5. Check, do not build: transactional messages about a live job (reminders, deposit, invoice) still send. Make sure the do-not-SMS flag is not wired to block them.
- Tags and fields it sets: adds is-no-marketing; removes is-nurturing. Field do_not_sms (set natively by STOP).
- Stops when: immediate.
- Test:
  1. Contact in WF-16 texts STOP: do-not-SMS set, is-no-marketing on, is-nurturing off, removed from WF-16.
  2. Contact in WF-31 clicks unsubscribe: removed from WF-31, no REV-03 later.
  3. Same contact has a job booked: the reminders still send.
  4. Card stays in its stage.
- Open items: none in the sources. Confirm the platform's native handling on a test contact before relying on it.

---

## WF-36 · Stalled card monitor   (folder "11. Always on")
- Trigger: Scheduled, daily at 6:45am.
- Settings: re-entry n/a (scheduled, runs over all open cards). Stop on response: no. Timezone Australia/Brisbane. No customer messages.
- Steps:
  1. For every open card, compare time in stage with that stage's stall threshold from the pipeline design (CRM-PIPELINES.md).
  2. If/Else: over the threshold
     - Yes: Add Tag is-stalled. The stage task reappears at the top of the assigned user's list.
  3. If/Else: over 2x the threshold
     - Yes: Line item in the daily summary (WF-39).
  4. If/Else: over 3x the threshold
     - Yes: Named in the weekly review (WF-40), with the card.
- Tags and fields it sets: adds is-stalled (removed by WF-34 and the moment anything moves).
- Stops when: runs daily.
- Test:
  1. Card sitting just over its stall threshold: is-stalled added at the next 6:45am run, stage task reappears.
  2. Card over 2x: appears in the next 7:00am daily summary.
  3. Card over 3x: appears in the next Monday weekly report as "Cards stalled 3x".
  4. Move the card: is-stalled comes off.
- Open items: stall thresholds live in CRM-PIPELINES.md and are not repeated here. The sources do not say who removes is-stalled when a card moves; WF-34 removes it on a reply only.

---

## WF-37 · Negative review or complaint   (folder "11. Always on")
- Trigger: Review received under 4 stars, or is-complaint added to a contact.
- Settings: re-entry on (once per review or tag). Stop on response: no. Alert 10 is critical (sends Saturday too).
- Steps:
  1. Internal Notification: alert 10 (Negative review or complaint) to OWNER, by SMS and email. Body: REVIEW {{review.rating}} stars from {{review.author}}. Call them today.
  2. Create Task, role OWNER, due same day. Title: "CALL {{contact.first_name}}: review or complaint, today". Text: "Ring them today. Most unhappy customers are fixed by one call and almost none by silence, and a public reply written before you have spoken to them tends to make it worse. Any marketing to that contact is paused until the call has happened."
  3. Update Field: ask_for_google_review = No.
  4. Pause any marketing sequence on the contact until the call has happened.
- Tags and fields it sets: adds is-complaint; sets ask_for_google_review = No.
- Stops when: sends once per review or tag.
- Test:
  1. Add is-complaint to a test contact: alert 10 reaches OWNER by SMS and email, CALL task due today.
  2. ask_for_google_review changes to No.
  3. Contact in WF-16 or WF-31: marketing pauses.
  4. Review at 3 stars through the review integration: same result. 4 stars or more: nothing.
  5. The task creation does not send a second text (WF-38 suppresses).
- Open items: step 4 gives no way to resume marketing after the call; the sources do not say who resumes. been-reviewed is not set by anything (data file).

---

## WF-38 · Assigned to you   (folder "11. Always on")
- Trigger: A card is assigned or reassigned to someone, or a task is created for OWNER.
- Settings: re-entry on. Stop on response: no. Alert 14 follows quiet hours.
- Steps:
  1. If/Else: this is the automatic assignment of a new lead to the office
     - Yes: stop here. Alert 1 already covers it.
  2. If/Else: the workflow that made the task or the assignment has just sent the owner another alert about the same card
     - Yes: stop here. One event never sends the owner two texts.
  3. Internal Notification: alert 14 (Assigned to you) to whoever it is assigned to. OWNER by SMS and email; OFFICE by email. Body: ASSIGNED TO YOU: {{opportunity.name}}, {{contact.phone}} then {{task.title}}.
- Tags and fields it sets: none.
- Stops when: once per assignment or task.
- Test:
  1. New lead auto-assigned to OFFICE: no alert 14 (alert 1 only).
  2. Reassign a card to OWNER by hand: alert 14 arrives by SMS and email.
  3. Reassign to OFFICE: email only.
  4. Complaint flow (WF-37) creates a task for OWNER: only alert 10 arrives, no alert 14.
- Open items: how "has just sent the owner another alert" is detected is not defined in the sources (build as a short wait then a check for a recent alert on the card, or a shared flag, your choice).

---

## WF-39 · Daily summary   (folder "12. Reporting")
- Trigger: Scheduled, 7:00am Monday to Saturday.
- Settings: re-entry n/a (scheduled). Stop on response: no. Timezone Australia/Brisbane. Internal only, no customer messages.
- Steps:
  1. Send Email to OWNER and OFFICE (Glenn Angus and Rachael Angus), using the layout below.
- Tags and fields it sets: none. Reads many (see layout).
- Stops when: runs daily.
- Email body layout (NEEDS YOU goes last on purpose, it is the section people act on):

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
  Quotes to write        {{list, waiting in Quoting}}
  Callbacks due          {{list}}
  Installs to book       {{list, over 2 days in Booking Required}}
  Dates not confirmed    {{list, no Yes or No on either reminder}}
  Deposits unpaid        {{list with amount and due date}}
  Invoices to send       {{list, drafts not yet sent}}
  Invoices overdue       {{list with amount and days}}
  Job reports to send    {{list, paid but report not sent}}
  Retentions due         {{list with release date}}
```
  Also listed here: leads not called stay at the top of NEEDS YOU until a call is logged; cards over 2x their stall threshold (WF-36) get a line item.
- Test:
  1. Run on a Tuesday 7:00am with a test enquiry created yesterday: the count under New enquiries is 1.
  2. Test lead uncalled: appears under Leads not called.
  3. Draft final invoice unsent (WF-27): appears under Invoices to send.
  4. Paid invoice with no job_report_sent_at: appears under Job reports to send.
  5. Sunday: no email.
- Open items: the data file lists the NEEDS YOU items as "...installs to book, dates not confirmed, invoices to send, deposits unpaid, invoices overdue..." while CRM-TASKS-NOTIFICATIONS.md puts Deposits unpaid before Invoices to send; the layout above follows the notifications document order (the data file is a comma list, order not binding). Where the stall line item sits (step from WF-36) is not defined. Saturday 7:00am is before the Saturday window (8am), but this is an internal email, not a customer message.

---

## WF-40 · Weekly and monthly reports   (folder "12. Reporting")
- Trigger: Scheduled, Monday 7:00am (weekly) and the 1st of the month (monthly).
- Settings: re-entry n/a (scheduled). Stop on response: no. Timezone Australia/Brisbane. Internal only. Build as three scheduled steps or two scheduled workflows sharing this sheet.
- Steps:
  1. Send Email, weekly, to OWNER (Glenn Angus): enquiries by source, median time to first call, leads closed as Unreachable, days in Quoting, quotes sent, quotes accepted, lost by reason, open value, accepted but not yet completed, cards stalled 3x, jobs completed, days from acceptance to payment, invoices outstanding, retentions held. Layout below.
  2. Send Email, monthly, to OWNER: cost per enquiry and per accepted job by utm_source, gclid and fbclid, against paid revenue (not quotes sent).
  3. Weekly reconciliation: count website submissions against opportunities created. If they do not match, Internal Notification: alert 11 (Automation failure) to OWNER.
- Tags and fields it sets: none. Reads utm_source, gclid, fbclid, source, submitted_at.
- Stops when: runs on schedule.
- Email body layouts (the forecast and the committed work are two lines, never one; both boards share stage keys so every line is one number across the business):

Weekly, Monday 7:00am, to OWNER:
```
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
```

Monthly, the 1st, to OWNER: cost per enquiry and cost per accepted job, by utm_source, gclid and fbclid, against paid revenue. Layout: one table per source with columns Source, Spend, Enquiries, Cost per enquiry, Accepted jobs, Cost per accepted job, Paid revenue. (Only the measures are in the sources; the column layout is the sheet's suggestion.)
- Test:
  1. Monday 7:00am: weekly email lands with the three sections and the two separate pipeline lines.
  2. 1st of the month: monthly email lands.
  3. Create a card stalled over 3x: appears under Cards stalled 3x.
  4. Create a website submission with no matching opportunity: alert 11 fires to OWNER.
  5. Matching counts: no alert.
- Open items: the monthly email's table layout is not in the sources. Ad spend source (for cost per enquiry) is not defined in the sources. If the 1st falls on a Monday, two emails go the same morning.

---

## Conflicts found across the sources
1. Send window: CRM-WORKFLOWS.md says 8am to 8pm Monday to Saturday; the data file quietHours says Mon-Fri 7am-6pm, Sat 8am-2pm. Sheets use the data file.
2. Alert 3 trigger is SMS only; WF-34 fires on SMS or email. Sheets follow the workflow.
3. WF-39 NEEDS YOU order differs between the data file list and CRM-TASKS-NOTIFICATIONS.md (Invoices to send versus Deposits unpaid first). Layout follows the notifications document, order has no effect on the build.
4. WF-30 trigger "job_date passes" versus a 4 week wait after job_date.
5. REV-03 message trigger "Job completed" versus WF-31 trigger "Final invoice paid".
6. PAY-01 marked business-hours versus "as the invoice email itself" on send (WF-28).
7. WF-28 and Xero both send invoice reminders (open decision).
8. Re-entry and stop-on-response settings are absent from every source; values here are working choices.
