# Test tasks B2: WF-14 to WF-26

SprayIT Solutions CRM, Dev sub-account only ("SprayIT Solutions - Dev", location ID 5M1zrDbimF17cM16mtmR). Each task below becomes one ClickUp task. Source sheets: crm-build/workflows/WF-B_WF-14-to-WF-26.md and AI-PROMPT_B_WF-14-to-WF-26.md, with CRM-BUILD-00-DECISIONS.md applied.

## Rules for every task (read once, they apply to all 13)

- Work only in the Dev sub-account. Never open or touch the live SprayIT Solutions account. Real contacts, real customers and real phone numbers must never be used.
- Test contact: first name starts with TEST (for example "TEST Quote Accepted"), last name "Dev". Phone and email are the tester's own. Create an opportunity for it on the board the task names ("Residential" or "Commercial & Industrial").
- Account settings used by every workflow: timezone Australia/Brisbane. Send window 8am to 8pm, Monday to Saturday. "Immediate" means no window step. A message marked "waits" sits behind a "Wait until a time window" step.
- Senders: "contact" = {{custom_values.from_name_contact}}, "brand" = {{custom_values.from_name_brand}}. Reply-to is {{custom_values.business_email}}. SMS goes from the account business number.
- Alerts: OWNER (Glenn) gets SMS and email. OFFICE gets email and in-app, never SMS. One event never sends the owner two texts.
- Error handling: every workflow ends with an error branch that sends internal notification alert 11 (Automation failure) to OWNER by SMS and email, with the workflow name and the contact. Confirm it is there in Part 1. It is a house rule, not a numbered step.
- All workflows are built in DRAFT. Part 1 is done while the workflow is still a draft. Only activate (Publish) in Part 2.
- Role names: OWNER (Glenn), OFFICE (office user), ESTIMATOR, CREW_LEAD (users holding those roles). If a role has no user yet, the assignee on the task is blank: note it and assign by hand.
- Field names are the Dev labels (the key written as words), for example po_number shows as "Po Number".
- Small fixes (a wrong name, a wrong wait) may be made and noted in a comment. Do not redesign anything.
- If it fails: write in a ClickUp comment the workflow, the step number, what happened, and attach a screenshot. Then set the task to Blocked.
- Time-based waits: do not wait days. Clone the workflow (name the clone "TEST COPY WF-NN"), set a short test wait (2 to 5 minutes) in the clone, test the clone, then DELETE the clone. Never edit the real wait. Also open the real workflow and confirm the real wait value in Part 1.
- Note for testers: the sheet and the builder prompt differ on two small points (WF-14 stop list, see T-WF-14). Where they differ, the check lists below follow the builder prompt with the decisions applied (CRM-BUILD-00-DECISIONS.md), and say so.

---

### T-WF-14 · Check, activate and test WF-14 · Quote accepted
- Wave: B
- Depends on: Workflows it removes the card from: WF-06, WF-10, WF-11, WF-13, WF-16 (see note on WF-07 and WF-09). Triggered by WF-12 (quote accepted online) or by hand. Templates: "X-ACC-01 · Quote accepted email", "X-ACC-02 · Quote accepted text" (the SMS is written inline), "C-PO-01 · Commercial awaiting PO". Fields: Po Number, Deposit Amount, Foam Order Type. Tags: been-accepted, is-active-job, is-nurturing, is-stalled, is-unresponsive. Folder "05. Accepted, lost and nurture". Users: OWNER, OFFICE.
- Time: 45 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open Automation, Workflows, folder "05. Accepted, lost and nurture", workflow "WF-14 · Quote accepted". Status must be Draft.
2. Trigger 1: "Pipeline Stage Changed" to stage "Quote Accepted", on the pipeline "Residential" and also on "Commercial & Industrial".
3. Trigger 2: opportunity custom field "Po Number" is updated (has a value), on pipeline "Commercial & Industrial", in stage "Quote Accepted".
4. Settings: re-entry NOT allowed ("a job is welcomed once"). Stop on response: no (do not stop on reply). Timezone Australia/Brisbane.
5. Step 1, If/Else: the opportunity has come back to "Quote Accepted" from a later stage. If yes: end the workflow.
6. Step 2, Remove from Workflow, before anything else: the list must be exactly WF-06, WF-10, WF-11, WF-13, WF-16. Note: the build sheet also lists "WF-07 reminders" and WF-09, but decision 4 says WF-07 keeps running and the builder prompt omits WF-09. Correct as built: WF-07 and WF-09 are NOT in the list. If either is in the list, write a comment (Zen to confirm WF-09) and leave as found.
7. Step 3, tags: add "been-accepted" and "is-active-job". Remove "is-nurturing", "is-stalled", "is-unresponsive".
8. Step 4, If/Else: opportunity is on pipeline "Residential".
   - Yes: (a) update opportunity status to Won. (b) Send email, template "X-ACC-01 · Quote accepted email" (subject "Thanks for going ahead, {{contact.first_name}}", from contact), immediate, no window step. (c) Send SMS, immediate, no window step, exact text: "Thanks {{contact.first_name}}, quote accepted. We will be in touch shortly to book your install date. {{custom_values.sms_signoff}}"
   - Else (Commercial & Industrial): (a) Send email, template "C-PO-01 · Commercial awaiting PO" (subject "Thanks for the go-ahead, {{opportunity.site_address}}", from contact), immediate (decision 6: titled "Immediately"; the messaging document says it waits, built as immediate). (b) If/Else: accepted online, or signed, or "Po Number" is set. Yes: update status to Won. Else: Create Task, title "CHASE {{contact.first_name}}: purchase order", description "A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.", assigned to OFFICE, due in 7 days, repeating weekly until the purchase order lands (Wait 7 days, then loop back to the task step while "Po Number" is empty).
9. Step 5, Internal Notification, alert 8 (Quote accepted): OWNER by SMS and email; OFFICE by email and in-app. Message "Quote accepted: {{contact.first_name}} {{contact.last_name}}."
10. Step 6, update opportunity fields "Deposit Amount" and "Foam Order Type" from the accepted quote where a deposit applies. No invoice is created here.
11. Step 7, Create Task, title "NEXT {{contact.first_name}}: inspection or booking", description "The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked.", assigned to OWNER, due same day.
12. Confirm the error branch (alert 11 to OWNER, SMS and email) and that there are no extra steps.

**Part 2, activate and test**
1. Create residential test contact "TEST Accepted Res Dev" with your own phone and email, and consent_marketing = yes. Create an opportunity on "Residential" in stage "Quote Sent". Put the contact into WF-10 (two-step follow-up) and WF-06 by hand so there is something to stop. Publish WF-14.
2. Test A (residential): move the card to "Quote Accepted". Watch the contact timeline, Conversations, Tasks, the opportunity and Tags. Within about 1 minute expect: contact removed from WF-10 and WF-06 (workflow history), status Won, X-ACC-01 email and the X-ACC-02 text received on your own phone/email at once, alert 8 (one text and one email to OWNER, email and in-app to OFFICE), NEXT task for OWNER due today, tags been-accepted and is-active-job on, is-nurturing off.
3. Test B (commercial, no PO): create "TEST Accepted Com Dev", opportunity on "Commercial & Industrial", not signed, no Po Number. Move to "Quote Accepted". Expect C-PO-01 only (no SMS), status stays Open, a CHASE task for OFFICE due in 7 days, alert 8, NEXT task. To test the weekly loop without waiting: clone WF-14, set the 7 day wait to 2 minutes, run on a fresh test card, confirm a second CHASE task appears, then delete the clone.
4. Test C: on the Test B card enter a value in "Po Number". Expect status Won and no second C-PO-01 and no second alert (re-entry is blocked; if the second trigger is blocked by re-entry, note what happened).
5. Test D: move a test card back from a later stage (for example Booking Required) into "Quote Accepted". Expect nothing sent.
6. Check tags on the Test A card: been-accepted and is-active-job on, is-nurturing off.
7. Switch off afterwards: unpublish WF-14 only if the task list for the wave says so; otherwise leave it on. Delete any TEST COPY clone.

**Expected result**
- Residential: status Won, X-ACC-01 and X-ACC-02 both received once, WF-10 and WF-06 stopped, alert 8 delivered to the right people and channels, NEXT task for OWNER due today, tags correct.
- Commercial without PO: only C-PO-01, status Open, weekly CHASE task for OFFICE, alert 8.
- PO entered: status Won, nothing resent.
- Back-from-later-stage move: nothing sent.

**Evidence**: screenshots of the trigger panel, the remove-from-workflow list, the timeline of Test A, the received email and text, the task list, the tag list, and the Test B and Test C results.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: it is not meant to stay on until all wave workflows are tested. Unpublish WF-14 when finished unless the wave lead says to keep it on. Delete test cards and the TEST contacts only if the wave lead says so.

---

### T-WF-15 · Check, activate and test WF-15 · Lost
- Wave: B
- Depends on: Stops workflows WF-06, WF-07, WF-09, WF-10, WF-11, WF-16, WF-21, WF-24, WF-25 (WF-21, WF-24, WF-25 are built in later folders: T-WF-21, T-WF-24, T-WF-25; add them to the list by hand if they did not exist at build time). Also triggered after WF-12 (online decline). Template: "LOST-01 · Thanks for considering us". Field: the platform's own Lost Reason list (decision 10; the sheet calls it lost_reason). Tags: been-lost, is-active-job, is-deposit-owing. Folder "05. Accepted, lost and nurture". Users: OFFICE.
- Time: 40 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-15 · Lost" in folder "05. Accepted, lost and nurture". Status Draft.
2. Trigger: "Opportunity Status Changed" to Lost, on pipelines "Residential" and "Commercial & Industrial".
3. Settings: re-entry allowed (a card can be lost again after reopening; the sources do not state this, sheet default). Stop on response: no. Timezone Australia/Brisbane.
4. Step 1: lost reason required on the status change (the status change must not close without one). This may not be buildable as a workflow action: check how it is enforced (a note on the workflow is acceptable). Write down what you found.
5. Step 2, Remove from Workflow: WF-06, WF-07, WF-09, WF-10, WF-11, WF-16, WF-21, WF-24, WF-25. If WF-21, WF-24 or WF-25 are missing from the list because they did not exist yet, add them now.
6. Step 3, tags: add "been-lost". Remove "is-active-job" and "is-deposit-owing".
7. Step 4, Create Task, title "LOG {{contact.first_name}}: lost reason", description "Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.", assigned to OFFICE, due same day.
8. Step 5, If/Else: pipeline is "Residential" AND lost reason is not "Unreachable", not "Duplicate" and not "Spam". Yes: (a) Wait until the next business morning. (b) Wait until the time window 8am to 8pm, Monday to Saturday. (c) Send email, template "LOST-01 · Thanks for considering us" (subject "Thanks for considering us, {{contact.first_name}}", from contact). Nothing on the Else side.
9. Confirm the error branch (alert 11 to OWNER, SMS and email) and no extra steps.

**Part 2, activate and test**
1. Create "TEST Lost A Dev" (your own phone and email) with a Residential opportunity in stage "Quote Sent". Put the contact into WF-10 by hand. Publish WF-15.
2. Test A: mark the card Lost with NO reason. Expect the platform refuses to close. If it closes, write down that the reason is not enforced.
3. Test B: mark it Lost, reason "Price". Expect within 1 minute: LOG task for OFFICE due today, contact removed from WF-10 (check workflow history), tag been-lost on, is-active-job and is-deposit-owing off (add is-active-job and is-deposit-owing first by hand so you can see them removed). LOST-01 is NOT sent yet: read the scheduled step on the contact (Workflow history shows it waiting for the next business morning).
4. Time test for LOST-01: clone WF-15, replace the "next business morning" wait with a 2 minute wait, run the clone on a fresh card (reason Price) during 8am to 8pm Mon to Sat. Expect LOST-01 in your inbox after about 2 minutes. Run it once outside the window if you can (Sunday or after 8pm) and expect it to be held until the window opens. Delete the clone afterwards.
5. Test C: new Residential card, mark Lost with reason "Unreachable". Expect LOG task and tags but no LOST-01 (also try "Duplicate" and "Spam" if time allows).
6. Test D: Commercial card, mark Lost (any reason). Expect the LOG task, no LOST-01.
7. Confirm is-active-job and is-deposit-owing are removed on every test card.

**Expected result**
- Cannot close without a reason (or the gap is written down).
- Lost with Price: LOG task (OFFICE, due today), sequences removed, been-lost on, the two tags off, LOST-01 queued for the next business morning inside the window.
- Unreachable, Duplicate, Spam and Commercial cards: task and tags, no LOST-01.

**Evidence**: screenshots of the remove list (nine workflows), the refused status change, the LOG task, the tag list before and after, the workflow history showing the LOST-01 wait, the received LOST-01 from the clone test.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-15 when finished unless the wave lead says to keep it on. Delete the clone.

---

### T-WF-16 · Check, activate and test WF-16 · Nurture drip and the year check-in
- Wave: B
- Depends on: stops WF-06, WF-10, WF-11. Also stopped by WF-34 on a reply (T-WF-34 if tested in wave A). Templates: "NUR-01 · Nurture start R-value education", "NUR-02 · Nurture +30 days heat loss", "NUR-03 · Nurture +90 days still on the list", "NUR-04 · Nurture 12 months quote refresh", "C-FUT-01 · Commercial future project". Fields: Consent Marketing (contact field). Tags: been-contacted, is-nurturing, do-not-market. Folder "05. Accepted, lost and nurture". Users: OFFICE, OWNER.
- Time: 60 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-16 · Nurture drip and the year check-in". Status Draft.
2. Trigger: "Pipeline Stage Changed" to "Nurture", on "Residential" and "Commercial & Industrial".
3. Settings: re-entry allowed (a card can return to Nurture). Stop on response: YES. Stop when the contact replies, books, or fills in a new form; also when the opportunity moves to "Quoting" (and for the Commercial loop also when it moves to "Quote Sent"). The booking and form-fill conditions may need setting by hand: check them. Timezone Australia/Brisbane.
4. Step 1, Remove from Workflow: WF-06, WF-10, WF-11 only.
5. Step 2, tags: add "been-contacted" and "is-nurturing".
6. Step 3, If/Else: Residential. Yes: Create Task, title "CHECK-IN {{contact.first_name}}: a year since the quote", description "A year since this job went to Nurture. Ring and ask whether it is back on. Quotes often come back after one or two years. If it is, move the card to Quoting so the quote is refreshed against current prices.", assigned to OFFICE, due 12 months. Else (Commercial & Industrial): Create Task, title "CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}", description "Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.", assigned to OWNER, due 90 days, repeating quarterly (Wait 90 days, then loop back to the task step).
7. Step 4, If/Else: contact field "Consent Marketing" is not "yes". Yes: end the workflow (no marketing email without consent; the task above still stands). This check sits AFTER the task step and BEFORE the emails.
8. Step 5, If/Else: Residential.
   - Yes: (a) Wait until the next business morning, then until the window 8am to 8pm Mon to Sat. (b) Send email "NUR-01 · Nurture start R-value education" (subject "The bit about R-value nobody explains", from contact). (c) Wait 30 days, then the window. (d) Send "NUR-02 · Nurture +30 days heat loss" (subject "Where the heat actually goes"). (e) Wait 60 days, then the window. (f) Send "NUR-03 · Nurture +90 days still on the list" (subject "Still on the list?"). (g) Create Task, title "REVIEW {{contact.first_name}}: still a fit?", description "Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Quoting. A clean list keeps the emails landing in inboxes rather than in spam.", assigned to OWNER, due 90 days, repeating quarterly (Wait 90 days, loop back). (h) Wait until 12 months after the contact entered Nurture, then the window. (i) Send "NUR-04 · Nurture 12 months quote refresh" (subject "A year on from your quote").
   - Else (Commercial & Industrial): (a) Wait 90 days, repeating (loop every 90 days), then the window. (b) Send "C-FUT-01 · Commercial future project" (subject "Still on the plan for {{opportunity.site_address}}?").
   - All five emails are from contact and sit behind the window.
9. Known sheet quirk, as written in the sheet: the REVIEW task is after the consent check, so a non-consenting contact never gets it. Do not change it.
10. Confirm the error branch (alert 11) and no extra steps.

**Part 2, activate and test**
1. Create "TEST Nurture Res Dev" (your own email) with Consent Marketing = yes, Residential opportunity in "Quote Sent". Publish WF-16.
2. Test A: move the card to "Nurture". Expect within 1 minute: tags been-contacted and is-nurturing, CHECK-IN task for OFFICE due in 12 months. NUR-01 is not sent yet: read the scheduled wait on the contact (next business morning, inside the window).
3. Time test for the Residential chain: clone WF-16, change every long wait (next morning, 30 days, 60 days, 90 days, 12 months) to 2 minutes, run on a fresh card, and expect NUR-01, NUR-02, NUR-03 and NUR-04 in order, about 2 minutes apart, plus the REVIEW task for OWNER after NUR-03. Check each subject and from name. Delete the clone.
4. Test B: contact with Consent Marketing = no (or blank). Move to Nurture. Expect the CHECK-IN task only and no emails.
5. Test C: reply to NUR-01 from the test email address. Expect the sequence stops (workflow history shows the contact left). WF-34 should also fire if it is already on.
6. Test D: Commercial card to Nurture. Expect the OWNER CHECK-IN task (due in 90 days) and, in a clone with the 90 day wait shortened to 2 minutes, C-FUT-01 after 2 minutes. Move the card to "Quote Sent" in the clone and expect the loop stops.
7. Test E: click unsubscribe in a received email. Expect the do-not-market tag set and the card stays where it is.

**Expected result**
- Tags added, task due dates and owners correct, consent gates the emails, emails in order behind the window, a reply or a move to Quoting stops it, unsubscribe sets do-not-market with the card unmoved.

**Evidence**: screenshots of the trigger and stop settings, each branch of the workflow, tasks, tags, the received NUR emails with subjects, workflow history after the reply.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-16 when finished unless the wave lead says to keep it on. Delete the clone and the TEST contacts only if told.

---

### T-WF-17 · Check, activate and test WF-17 · Site inspection booked
- Wave: C
- Depends on: T-WF-18 (WF-18 takes over when the appointment is moved or cancelled, and re-adds the contact here). Calendar: the inspection calendar ("Site Inspection"; the name is assumed, pick the real inspection calendar). SMS "X-INSP-01 · Site inspection booked text" and "X-INSP-02 · Site inspection day text" (written inline). Email "C-INSP-01 · Commercial inspection booked". Fields: Inspection Date. Tags: been-inspected. Users: ESTIMATOR (the role must exist as a user). Folder "06. Site inspection".
- Time: 45 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-17 · Site inspection booked" in folder "06. Site inspection". Status Draft.
2. Trigger: "Customer Booked Appointment" in the inspection calendar, for contacts on "Residential" and "Commercial & Industrial". Check the real inspection calendar is picked.
3. Settings: re-entry allowed (each booking runs it). Stop on response: no. If the appointment is moved or cancelled, the contact leaves this workflow (WF-18 takes over): check this setting, it may need setting by hand. Timezone Australia/Brisbane.
4. Step 1: update opportunity field "Inspection Date" from the appointment start date.
5. Step 2, If/Else: opportunity is in stage "Quote Accepted". Yes: move to "Inspection Required". Else: leave it where it is.
6. Step 3, If/Else: Residential. Yes: Send SMS, immediate, no window step, exact text: "Hi {{contact.first_name}}, your {{custom_values.inspection_noun}} is booked for {{opportunity.inspection_date}} at {{opportunity.site_address}}. {{custom_values.sms_signoff}}" Else: Send email "C-INSP-01 · Commercial inspection booked" (subject "Site inspection confirmed, {{opportunity.inspection_date}}", from brand), immediate.
7. Step 4, Create Task, title "ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}", description "Attend the inspection. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Then move the card to Booking Required, or close it as Lost if the job cannot be done.", assigned to ESTIMATOR, due on the inspection date.
8. Step 5: Wait until 7:00am on the day of the inspection.
9. Step 6: Send SMS, immediate, no window step (it goes before 8am by design), exact text: "Morning {{contact.first_name}}, we are coming to you today for the {{custom_values.inspection_noun}}. Any change, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
10. Step 7: Wait until the day after the inspection.
11. Step 8, If/Else: the appointment was not cancelled. Yes: add tag "been-inspected".
12. Confirm the error branch (alert 11) and no extra steps.

**Part 2, activate and test**
1. Create "TEST Inspect Res Dev" (your own phone and email) with a Residential opportunity in "Quote Accepted", and "TEST Inspect Com Dev" with a Commercial card in "Quote Accepted". Create a third "TEST Inspect Quoting Dev" Residential card in "Quoting". Publish WF-17. Also publish WF-18 for step 6 (see T-WF-18).
2. Test A: book an inspection for TEST Inspect Res Dev for tomorrow in the inspection calendar. Expect within 1 minute: Inspection Date set, stage moves to "Inspection Required", X-INSP-01 text received at once, ATTEND task for ESTIMATOR due on the date. The 7:00am step is scheduled: read it on the contact (workflow history shows "waiting until 7:00am on the day").
3. Test B (commercial): book for the Commercial card. Expect C-INSP-01 email (from brand, subject "Site inspection confirmed, <date>") and no SMS at booking, ATTEND task, stage Inspection Required.
4. Test C: book for the Quoting card. Expect the card does NOT move; Inspection Date is still set.
5. Morning text: book an inspection for today with a start time after the current time, in a clone of WF-17 where "Wait until 7:00am on the day" is replaced by "Wait 2 minutes". Expect X-INSP-02 after 2 minutes, with no window hold. Then in the same clone set "Wait until the day after the inspection" to 2 minutes and expect tag been-inspected. Delete the clone. In the real workflow, confirm the 7:00am wait is unchanged.
6. Test D: in the clone, cancel the appointment before the second wait finishes. Expect no been-inspected tag and WF-18 fires.

**Expected result**
- Quote Accepted card moves to Inspection Required, others do not.
- Residential gets the X-INSP-01 text, Commercial gets C-INSP-01.
- ATTEND task correct. 7:00am text sends with no window. been-inspected added the day after unless cancelled.

**Evidence**: screenshots of the trigger, each step, the card stage before and after, the received text and email, the task, the scheduled 7:00am step, the tag.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-17 after the test unless the wave lead says to keep it on. Delete the clone and test appointments.

---

### T-WF-18 · Check, activate and test WF-18 · Site inspection moved or cancelled
- Wave: C
- Depends on: T-WF-17 (WF-18 adds the contact back to WF-17 on a reschedule). Calendar: inspection calendar. Email "X-APPT-06 · Booking moved". Internal alert 5. Field: Inspection Date. Users: OWNER. Folder "06. Site inspection".
- Time: 30 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-18 · Site inspection moved or cancelled" in folder "06. Site inspection". Status Draft.
2. Trigger: "Appointment Status" changed in the inspection calendar to rescheduled, or to cancelled, for contacts on "Residential" and "Commercial & Industrial". Calendar name assumed: pick the real one.
3. Settings: re-entry allowed (one run per change). Stop on response: no. The opportunity must not be moved (it stays in Inspection Required). Timezone Australia/Brisbane.
4. Step 1, If/Else: rescheduled. Yes: (a) Send email "X-APPT-06 · Booking moved" (subject "Your booking has moved", from brand), immediate, no window step. (b) Add to workflow "WF-17 · Site inspection booked" so the morning text (X-INSP-02) re-queues against the new date. Check by hand that the old queue is replaced, not duplicated.
5. Step 2, If/Else: cancelled. Yes: (a) Internal notification, alert 5 (Phone call or inspection cancelled), to OWNER by SMS and email only. Message "Inspection cancelled: {{contact.first_name}} {{contact.last_name}}." (b) Clear field "Inspection Date". (c) Create Task, title "REBOOK {{contact.first_name}}: inspection cancelled", description "The customer cancelled the site inspection. Ring them and book a new time in the inspection calendar. Nothing is rebooked automatically, because a free slot is not always one the crew can make.", assigned to OWNER, due in 1 business day.
6. Confirm no stage move and no rebooking step. Confirm the error branch (alert 11).

**Part 2, activate and test**
1. Create "TEST Moved Dev" (your own phone and email), Residential card in stage "Inspection Required". Publish WF-17 and WF-18. Book an inspection in the inspection calendar for a future day.
2. Test A: reschedule the appointment to a new time. Expect X-APPT-06 email at once with the new time (subject "Your booking has moved"), and the contact added to WF-17 again (workflow history). Check the morning text is queued against the new date and there is only one queue.
3. Test B: cancel the appointment. Expect within 1 minute: alert 5 to OWNER (one text, one email, no OFFICE alert), Inspection Date empty, REBOOK task for OWNER due in 1 business day.
4. Test C: confirm the card is still in "Inspection Required".
5. Test D: confirm no new appointment appears automatically.

**Expected result**
- Reschedule: X-APPT-06 sent, WF-17 re-queued once. Cancel: alert 5 to OWNER only, field cleared, REBOOK task, card unmoved, no auto rebooking.

**Evidence**: screenshots of both branches, the received email, the alert, the empty field, the REBOOK task, the card stage, workflow history of WF-17.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-18 (and WF-17 if you published it only for this test) unless the wave lead says to keep them on.

---

### T-WF-19 · Check, activate and test WF-19 · Booking Required
- Wave: C
- Depends on: T-WF-20 (booking the install moves the card to Job Booked via WF-20). Task owner OWNER. Folder "07. Booking and reminders". No templates. The "Installs to book" list is a saved filter in the daily summary and is not part of this workflow.
- Time: 30 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-19 · Booking Required" in folder "07. Booking and reminders". Status Draft.
2. Trigger: "Pipeline Stage Changed" to "Booking Required", on "Residential" and "Commercial & Industrial". Settings: re-entry allowed (not stated in the sources; sheet default). Stop on response: no. Timezone Australia/Brisbane. No messages are sent to the customer anywhere in this workflow.
3. Step 1, If/Else: Residential. Yes: Create Task, title "BOOK {{contact.first_name}}: install date", description "Book the install in the calendar for the vehicle doing the job: the InjectaCore rig, the van, the Fuso truck or the Mercedes rig. A job over several days or using two rigs gets a booking for each block. Book it here first, not in the Apple calendar, because the booking is what sends the confirmation and sets up the reminders and the deposit.", assigned to OWNER, due in 2 business days. Else (Commercial & Industrial): Create Task, title "BOOK {{contact.first_name}}: works dates", description "Agree the start and finish dates with the client, then book each block in the calendar for the vehicle doing it, with the crew. Book it in the platform first, because the booking sends the mobilisation email and sets up the reminders. It then shows in the Apple calendar too.", assigned to OWNER, due in 2 business days.
4. Step 2: Wait 2 business days.
5. Step 3, If/Else: still in stage "Booking Required". Yes: no action (empty branch by design, or the workflow ends after the wait). The card stays on the "Installs to book" daily summary list until it moves.
6. Confirm there is no message step, no tags, no fields, and the error branch (alert 11). Alert 14 is not part of this workflow.

**Part 2, activate and test**
1. Create "TEST Booking Res Dev" (Residential card) and "TEST Booking Com Dev" (Commercial card), both in "Quote Accepted", your own phone and email. Publish WF-19.
2. Test A: move the Residential card to "Booking Required". Expect within 1 minute a task "BOOK TEST: install date" for OWNER with the install wording, due in 2 business days. No email or text arrives.
3. Test B: move the Commercial card. Expect "BOOK TEST: works dates" with the works-dates wording, due in 2 business days.
4. Wait test: read the scheduled wait on the contact (workflow history shows a 2 business day wait). To see the end, clone the workflow, set the wait to 2 minutes, run on a fresh card and expect the workflow ends with nothing created. Delete the clone.
5. Test C: with WF-20 published (see T-WF-20), book the install in an install calendar for the Residential card. Expect the card moves to Job Booked and WF-19 ends for the contact.

**Expected result**
- Correct task wording by board, OWNER, due in 2 business days, no customer message, card stays listed under Installs to book until it moves, ends when the install is booked.

**Evidence**: screenshots of the trigger, both task wordings, the task due dates, the workflow history with the wait, the card after booking.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-19 after testing unless the wave lead says to keep it on.

---

### T-WF-20 · Check, activate and test WF-20 · Install booked
- Wave: D
- Depends on: T-WF-21 (reminders) and T-WF-24 (deposit draft), both added to the contact at the end of WF-20, so both must exist first. Triggered after T-WF-19 (Booking Required). Templates: "JOB-02 · Install booked prep instructions", "C-MOB-01 · Commercial works booked". SMS JOB-01 (written inline, template name "JOB-01 · Install booked text"). Calendars: the four install calendars (InjectaCore rig, van, Fuso truck, Mercedes rig). Fields: Job Date, Job End Date, Vehicles Booked, Crew Assigned, Job Booked At. Tag: been-booked. Users: CREW_LEAD, OWNER. Folder "07. Booking and reminders".
- Time: 60 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-20 · Install booked" in folder "07. Booking and reminders". Status Draft.
2. Trigger 1: "Customer Booked Appointment" in any of the four install calendars (InjectaCore rig, van, Fuso truck, Mercedes rig), for contacts on "Residential" and "Commercial & Industrial".
3. Trigger 2 (decision 14): opportunity field "Job Date" is changed (the install date moved). This path sends the JOB-01 SMS only, with the new date, and re-queues WF-21 and WF-24; it does not resend the email. The sheet describes the resend but its trigger line lists the booking only, so the second trigger is a built addition. It may need an If/Else on "which trigger started this run" added by hand: check how it was done and write it down.
4. Settings: re-entry allowed (first booking does the full run, later bookings only update dates). Stop on response: no. Timezone Australia/Brisbane.
5. Step 1, If/Else: the job already has an install booking (another vehicle, or more days). Yes: (a) update "Job Date" and "Job End Date" to the first and last day across every booking for the job, and add the vehicle to "Vehicles Booked". (b) End the workflow. Nothing is resent.
6. Step 2: update "Job Date", "Job End Date", "Vehicles Booked", "Crew Assigned" from the booking.
7. Step 3: update "Job Booked At" to now.
8. Step 4: move the opportunity to stage "Job Booked".
9. Step 5: add tag "been-booked".
10. Step 6, If/Else: Residential. Yes: (a) Send SMS, immediate, no window step, exact text: "Hi {{contact.first_name}}, your {{custom_values.trade_verb}} job is booked for {{opportunity.job_date}}. Prep notes are in your email. {{custom_values.sms_signoff}}" (b) Send email "JOB-02 · Install booked prep instructions" (subject "Your job is booked for {{opportunity.job_date}}", from brand), immediate. Else (Commercial & Industrial): (a) Send email "C-MOB-01 · Commercial works booked" (subject "Works booked: {{opportunity.site_address}}", from brand), immediate. (b) Create Task, title "INDUCT crew: {{opportunity.site_address}}", description "Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.", assigned to CREW_LEAD, due before the start date (Job Date). (c) Create Task, title "SWMS {{opportunity.site_address}}: issue and confirm receipt", description "Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either.", assigned to OWNER, due before the start date (Job Date).
11. Step 7 (moved-date path, Trigger 2 only): send the same JOB-01 SMS as 6 residential (a) with the new date. Do not send the email again.
12. Step 8: add the contact to "WF-21 · Job reminders: a month, 7 days and 48 hours" and "WF-24 · Deposit invoice: the draft for the owner".
13. Open conflict, note only: JOB-01, JOB-02 and C-MOB-01 are titled "(Immediately)" but the messaging document says they wait for the window. Built as immediate (decision 6). Do not change it.
14. Confirm the error branch (alert 11) and no extra steps.

**Part 2, activate and test**
1. Create "TEST Install Res Dev" (Residential card in "Booking Required", your own phone and email) and "TEST Install Com Dev" (Commercial card). Publish WF-20, WF-21 and WF-24 (WF-21 and WF-24 will start for the contact; see their tasks).
2. Test A: book one day on one rig, for the Residential card, 20 days from today. Expect within 1 minute: Job Date, Job End Date, Vehicles Booked, Crew Assigned set; Job Booked At set to now; stage Job Booked; tag been-booked; JOB-01 text and JOB-02 email received at once; contact added to WF-21 and WF-24 (workflow history).
3. Test B: book a second block on another rig for the same job. Expect Job End Date and Vehicles Booked updated and nothing resent.
4. Test C: move the booking to a new day. Expect JOB-01 resent with the new date, WF-21 and WF-24 re-queued, JOB-02 not resent.
5. Test D: Commercial card: book. Expect C-MOB-01, INDUCT task (CREW_LEAD) and SWMS task (OWNER) due before the start date, and no JOB-01.
6. Test E: make one booking outside 8am to 8pm (or on Sunday) and note whether the messages are held. Expected per decision 6: they send at once.

**Expected result**
- Fields, stage and tag set in order on the first booking. Second block only updates dates. Moved date resends JOB-01 only. Commercial sends C-MOB-01 plus the two tasks. WF-21 and WF-24 started each time.

**Evidence**: screenshots of both triggers, the fields on the card before and after each booking, the received SMS and emails, tasks, workflow history showing WF-21 and WF-24 added, the outside-hours note.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-20, WF-21 and WF-24 after testing unless the wave lead says to keep them on. Delete test bookings.

---

### T-WF-21 · Check, activate and test WF-21 · Job reminders: a month, 7 days and 48 hours
- Wave: D
- Depends on: T-WF-20 (adds the contact), T-WF-22 (handles the Yes and No links), T-WF-15 (Lost stops it). Templates: "REM-06 · Job 30 days check email", "REM-01 · Job 7 days email", "REM-03 · Job 48 hours email"; SMS REM-02 and REM-04 (written inline). Trigger links: confirm_yes and confirm_no must exist. Fields: Job Booked At, Job Date, Job Confirmed. Users: OFFICE. Folder "07. Booking and reminders".
- Time: 60 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-21 · Job reminders: a month, 7 days and 48 hours". Status Draft.
2. Trigger: opportunity field "Job Date" is set or changed (also started by WF-20 adding the contact), on "Residential" and "Commercial & Industrial".
3. Settings: re-entry allowed (restarts against the new date). Stop on response: NO (reminders about an agreed date keep running; WF-34 does not pause it). If the booking is cancelled the contact leaves; if the date moves it restarts (may need setting by hand: check). Timezone Australia/Brisbane. Every message waits for the window 8am to 8pm Mon to Sat.
4. Block 1, If/Else: "Job Booked At" is more than 6 weeks before "Job Date" AND "Job Date" is more than 30 days away. Yes: (a) Wait until 30 days before "Job Date", then until the window. (b) Send email "REM-06 · Job 30 days check email" (subject "A month to go: still on track for {{opportunity.job_date}}?", from brand).
5. Block 2, If/Else: "Job Date" is more than 7 days away. Yes: (a) Wait until 7 days before "Job Date". (b) Clear field "Job Confirmed" (so only an answer from here on counts). This must come BEFORE the messages. (c) Wait until the window. (d) Send email "REM-01 · Job 7 days email" (subject "Your job is a week away. Does the date still work?", from brand). (e) Send SMS, exact text: "Hi {{contact.first_name}}, we are with you on {{opportunity.job_date}}. Still OK? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}"
6. Block 3, If/Else: "Job Date" is more than 48 hours away. Yes: (a) Wait until 48 hours before "Job Date", then the window. (b) Send email "REM-03 · Job 48 hours email" (subject "Your job is in 2 days. Please confirm.", from brand). (c) Send SMS, exact text: "Hi {{contact.first_name}}, see you in 2 days, {{opportunity.job_date}}. Still on? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}"
7. Step 4: Wait until 9:00am the day before "Job Date".
8. Step 5, If/Else: "Job Confirmed" is empty. Yes: Create Task, title "CALL {{contact.first_name}}: date not confirmed", description "Neither the 7 day nor the 48 hour reminder got a Yes or a No. Ring to confirm the job is still on, that access is clear, and that someone over eighteen will be there to let the crew in.", assigned to OFFICE, due the day before the job.
9. Check both SMS texts keep the merge tags {{trigger_link.confirm_yes}} and {{trigger_link.confirm_no}}, and that the two trigger links exist under Marketing, Trigger Links with those names.
10. Confirm the error branch (alert 11) and no extra steps. Note: alert 12 comes from WF-22, not from here.

**Part 2, activate and test**
1. Create "TEST Remind Dev" (Residential card, your own phone and email). Publish WF-21 and WF-22. Test the date logic by setting "Job Date" and "Job Booked At" by hand on the card (this triggers the workflow).
2. Test A: Job Date 3 days away. Expect REM-03 email and REM-04 text only (month and 7 day blocks skipped), then the CALL task at 9:00am the day before if there is no answer.
3. Test B: Job Date 10 days away, Job Booked At a week ago. Expect REM-01 email and REM-02 text at 7 days before, then REM-03 and REM-04 at 48 hours.
4. Test C: Job Date 60 days away, Job Booked At 8 weeks before. Expect REM-06 at 30 days before.
5. Test D: tap Yes in a reminder. Expect Job Confirmed = Yes and no 9:00am task.
6. Test E: change Job Date. Expect the queue restarts against the new date.
7. Time shortcut: the waits are days long, so for each test read the scheduled step on the contact (workflow history shows the wait target date and time: check it equals the date in the list above). To see the messages arrive, clone WF-21, replace each wait with a 2 minute wait, run the clone once, and check each template, subject and SMS text arrives. Delete the clone.
8. Messages must only arrive inside 8am to 8pm Mon to Sat. Note any held message.

**Expected result**
- Correct blocks run for each Job Date distance, Job Confirmed cleared at day 7, links work, CALL task only when unanswered, reminders do not stop on a reply, a date change restarts.

**Evidence**: screenshots of the three blocks, wait targets in the workflow history, received emails and texts, the CALL task, the field Job Confirmed before and after.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-21 after testing unless the wave lead says to keep it on. Delete the clone.

---

### T-WF-22 · Check, activate and test WF-22 · Yes or No on a reminder
- Wave: D
- Depends on: T-WF-21 (sends the links). SMS REM-05 "REM-05 · Cannot make the date text" (written inline). Trigger links confirm_yes and confirm_no. Fields: Job Confirmed, Job Date. Alert 12. Tag: a once-per-booking guard tag. Users: OWNER, OFFICE. Folder "07. Booking and reminders".
- Time: 40 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-22 · Yes or No on a reminder". Status Draft.
2. Trigger: "Trigger Link Clicked" for the links "confirm_yes" and "confirm_no" (the links in REM-01, REM-02, REM-03, REM-04 and REM-06), for contacts on "Residential" and "Commercial & Industrial".
3. Settings: re-entry allowed (once per click). Stop on response: no. Timezone Australia/Brisbane.
4. Step 1, If/Else: link clicked is "confirm_yes". Yes: update "Job Confirmed" to Yes. The link opens a short thank-you page. Nothing else.
5. Step 2, If/Else: link clicked is "confirm_no". Yes:
   - (a) Guard If/Else: the contact already has the tag "alerted-no-<Job Date>" for this booking date. If yes, end the workflow.
   - (b) Add the tag "alerted-no-<Job Date>" for this booking date.
   - (c) Update "Job Confirmed" to No.
   - (d) Send SMS, immediate, no window step, exact text: "Thanks for letting us know, {{contact.first_name}}. We will ring you shortly to find a new date. {{custom_values.sms_signoff}}"
   - (e) Internal notification, alert 12 (Customer cannot make the booked date): OWNER by SMS and email, OFFICE by email and in-app. Message "{{contact.first_name}} {{contact.last_name}} cannot make {{opportunity.job_date}}."
   - (f) Create Task, title "RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}", description "The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date.", assigned to OWNER, due same day.
   - (g) Nothing moves the booking or the crew.
6. Known open item: a tag with a date in its name may not be buildable. If the builder used a field check instead (for example a text field holding the last alerted Job Date), accept it and note which one.
7. Confirm the error branch (alert 11) and no extra steps.

**Part 2, activate and test**
1. Use "TEST Remind Dev" (Residential card with a Job Date set, your own phone and email). Publish WF-22. The Yes and No links are in REM-01, REM-02, REM-03, REM-04 and REM-06. Simplest way: run WF-21 as in T-WF-21, or open the trigger links in Marketing, Trigger Links and click them as the test contact (the link must be opened with the contact identified, so use the link received in the test email or text).
2. Test A: click Yes in REM-01 (email). Expect Job Confirmed = Yes, a thank-you page, no alert, no task.
3. Test B: click No in REM-02 (SMS link). Expect within 1 minute: Job Confirmed = No, REM-05 text received at once, alert 12 (OWNER one text and one email, OFFICE email and in-app), RESCHEDULE task for OWNER due today.
4. Test C: click No again on the same booking. Expect no second alert, no second task, no second text.
5. Test D: click Yes in REM-06 (month-out email). Expect Yes recorded.
6. Test E: confirm the booking, crew and Job Date did not move.

**Expected result**
- Yes sets the field and nothing else. First No sends REM-05, alert 12 and the task. A second No on the same booking date does nothing. Nothing moves automatically.

**Evidence**: screenshots of the workflow, the thank-you page, the field values, the received text, the alerts, the task, the workflow history showing the second click ending at the guard.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-22 after testing unless the wave lead says to keep it on.

---

### T-WF-23 · Check, activate and test WF-23 · Job day
- Wave: D
- Depends on: T-WF-20 (sets Job Date and Job End Date). SMS JOB-04 "JOB-04 · Job day morning text" and "C-SITE-01 · Commercial site day text" (written inline). JOB-06 and C-PROG-01 are not part of this workflow. Fields: Job Date, Job End Date, Crew Assigned, Photos Captured (checkbox). Users: CREW_LEAD, OWNER. Folder "07. Booking and reminders".
- Time: 50 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-23 · Job day". Status Draft.
2. Trigger: opportunity date field "Job Date" arrives (scheduled from the install booking; runs on the day), on "Residential" and "Commercial & Industrial".
3. Settings: re-entry allowed (once per site day on commercial). Stop on response: no. The contact leaves when the job is marked complete or the booking moves (may need setting by hand: check). Timezone Australia/Brisbane. Messages go at 6:30am with no window step (before 8am by design).
4. Step 1, If/Else: Residential. Yes:
   - (a) Wait until 6:30am on "Job Date".
   - (b) Send SMS, immediate, no window step, exact text: "Morning {{contact.first_name}}, {{opportunity.crew_assigned}} and the crew are on the way to you now. {{custom_values.sms_signoff}}"
   - (c) Create Task, title "PHOTOS {{opportunity.site_address}}", description "Photograph the finished work from the app before leaving site, and tick Photos captured. The job cannot be marked complete without them. They go into the job report, and they are the only real proof-of-work images the business has.", assigned to CREW_LEAD, due before the job is marked complete.
   - (d) Create Task, title "VARIATIONS {{contact.first_name}}: record any extras", description "Anything agreed on site that was not in the quote, such as an extra 100 sqm, goes out from the variation document for the customer to sign, and onto the card the same day. Left to invoicing, it surprises the customer.", assigned to CREW_LEAD, due before the job is marked complete.
7. Else (Commercial & Industrial):
   - (a) Wait until 6:30am on each site day between "Job Date" and "Job End Date" (wait until the next 6:30am, loop back until "Job End Date" has passed).
   - (b) Send SMS, immediate, no window step, exact text: "Morning {{contact.first_name}}, our crew is on site at {{opportunity.site_address}} today, led by {{opportunity.crew_assigned}}. Any issue, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
   - (c) Create Task, title "UPDATE {{contact.first_name}}: weekly progress", description "Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week's photos.", assigned to OWNER, due every Friday while the job is live (Wait until Friday, loop back to the task step).
   - (d) Create Task, title "PHOTOS {{opportunity.site_address}}: this stage", description "Photograph each completed stage before moving on. The photos are the evidence behind each claim and they go into the close-out pack, so they are needed at the end of every stage, not at the end of the job.", assigned to CREW_LEAD, due at the end of each stage.
   - (e) Create Task, title "VARIATIONS {{opportunity.site_address}}: record and get signed", description "Record every variation agreed on site and send it from the variation document for signature the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.", assigned to CREW_LEAD, due as they happen.
8. Check there is NO JOB-06 send and NO weekly email send step (C-PROG-01 is sent by hand from the UPDATE task).
9. Guard (not a workflow step): the job cannot be moved to "Job Completed" until "Photos Captured" is ticked. Find where this is set (stage-change required field, see CRM-WORKFLOWS.md "Required fields on entry") and confirm it exists. If it does not exist, set it by hand and note it.
10. Confirm the error branch (alert 11) and no extra steps.

**Part 2, activate and test**
1. Create "TEST Jobday Res Dev" (Residential, Job Date set to today, Crew Assigned filled with a test name, your own phone) and "TEST Jobday Com Dev" (Commercial, Job Date today, Job End Date 2 days later). Publish WF-23.
2. Waiting for 6:30am is impractical: read the scheduled step on the contact and check it points to 6:30am on the Job Date. Then clone WF-23, replace "Wait until 6:30am" with a 2 minute wait (and the commercial site-day loop with a 2 minute wait, and "until Friday" with 2 minutes), and run the clone on fresh cards.
3. Test A (residential): expect after 2 minutes the JOB-04 text with the crew name, then PHOTOS and VARIATIONS tasks for CREW_LEAD.
4. Test B: try moving a card to "Job Completed" with Photos Captured unticked. Expect the move is refused. Tick it and the move works.
5. Test C (commercial, 3 days): expect the C-SITE-01 text on each site day (in the clone, once per loop), the UPDATE task (repeats each loop), PHOTOS: this stage and VARIATIONS tasks.
6. Test D: move the booking. Expect the old schedule is cancelled and the new one queues.
7. Test E: confirm JOB-06 was not sent and no email was sent. Delete the clone.

**Expected result**
- JOB-04 or C-SITE-01 sent at 6:30am with no window hold, tasks correct and for the right owners, Job Completed blocked without photos, no JOB-06.

**Evidence**: screenshots of both branches, the scheduled 6:30am step, received texts, tasks, the refused stage move.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted.

**Switch off afterwards**: unpublish WF-23 after testing unless the wave lead says to keep it on. Delete the clone.

---

### T-WF-24 · Check, activate and test WF-24 · Deposit invoice: the draft for the owner
- Wave: E
- Depends on: T-WF-20 (adds the contact when a job is booked), T-WF-25 (takes over when the owner sends the invoice), T-WF-15 (Lost stops it). Fields: Job Date, Deposit Amount, Foam Order Type, Deposit Due Date. The platform's invoice action. Users: OWNER. Folder "08. Deposit". No customer message.
- Time: 50 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-24 · Deposit invoice: the draft for the owner" in folder "08. Deposit". Status Draft.
2. Trigger: "Job Date" is set or changed AND "Deposit Amount" is set, on "Residential" and "Commercial & Industrial".
3. Settings: re-entry allowed (re-runs against a new date; a draft already made is updated, not duplicated). Stop on response: no. The contact leaves when the owner sends the invoice (WF-25 takes over), the job is cancelled, or Job Date moves before it is sent (which re-runs it). Timezone Australia/Brisbane. No message goes to the customer in this workflow.
4. Step 1, If/Else: "Deposit Amount" is empty. Yes: end the workflow (jobs with no deposit skip Deposit Requested).
5. Step 2, If/Else: "Foam Order Type" is "Special order". Yes: update "Deposit Due Date" to 7 days before "Job Date". Else: update "Deposit Due Date" to 1 business day before "Job Date".
6. Step 3, If/Else: "Job Date" is more than 14 days away. Yes: wait until 14 days before "Job Date".
7. Step 4, invoice action (check by hand): create a DRAFT deposit invoice from the accepted quote, for the "Deposit Amount", due on "Deposit Due Date", with the accepted quote and any purchase order attached. NOT sent. No card storage and no automatic charge. If a draft already exists for this opportunity it is updated, not duplicated. Open the action and look for: a "draft" or "save as draft" option, the amount field mapped to Deposit Amount, the due date mapped to Deposit Due Date, the attachments, and whether it updates an existing draft. The action may not exist as a workflow step, may not allow draft, or may not update a draft (decision 17). Write exactly what you find.
8. Step 5, Create Task, title "INVOICE {{contact.first_name}}: check and send the deposit invoice", description "A draft deposit invoice is ready, made from the accepted quote with the quote and any purchase order attached. Check the amount, the due date and the payment terms, then send it. Sending it emails the customer and moves the card to Deposit Requested. Nothing is sent until you do.", assigned to OWNER, due in 2 business days.
9. Step 6: Wait 2 business days.
10. Step 7, If/Else: the draft has not been sent. Yes: no action (the card stays on the "Invoices to send" daily summary list).
11. Confirm no email or SMS step anywhere, and the error branch (alert 11). Note: Xero invoice sync is untested (go-live item), not part of this test.

**Part 2, activate and test**
1. Create "TEST Deposit Dev" (Residential card, your own email) in stage "Job Booked". Publish WF-24.
2. Test A: set Job Date but leave "Deposit Amount" empty. Expect the workflow ends at once and nothing is created.
3. Test B: Job Date 30 days out, Deposit Amount 500, Foam Order Type = the stock (non special) value. Expect "Deposit Due Date" = 1 business day before Job Date. Then the workflow waits until 14 days before Job Date (16 days): read the scheduled step on the contact to confirm that date. To see the draft and task, clone WF-24, set the 14 day wait to 2 minutes, run on a fresh card, and expect the draft invoice (not sent: check the invoice status is Draft, the amount is 500, the due date equals Deposit Due Date, and the quote is attached) and the INVOICE task for OWNER due in 2 business days.
4. Test C: Foam Order Type = "Special order". Expect Deposit Due Date = 7 days before Job Date.
5. Test D: Job Date 5 days out. Expect the draft and INVOICE task immediately (no 14 day wait).
6. Test E: change Job Date. Expect the same draft updated (one invoice only, check the invoice list for the contact) and no invoice or email reaches the customer.
7. Delete the clone and the draft test invoices.

**Expected result**
- No deposit: nothing created. Due date correct for stock and special order. Draft only, never sent, no duplicate. INVOICE task for OWNER due in 2 business days. No customer message.

**Evidence**: screenshots of the invoice action settings, Deposit Due Date for each case, the draft invoice (status Draft), the invoice list showing one draft, the INVOICE task, workflow history.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted. If the draft invoice action does not exist, report that clearly: it is a known open item.

**Switch off afterwards**: unpublish WF-24 after testing unless the wave lead says to keep it on.

---

### T-WF-25 · Check, activate and test WF-25 · Deposit invoice sent, and the due-date check
- Wave: E
- Depends on: T-WF-24 (makes the draft that the owner sends), T-WF-26 (cancels the 4:00pm check when paid). Email "DEP-02 · Deposit invoice email". SMS DEP-03 "DEP-03 · Deposit overdue text" (written inline). Alert 13. Fields: Deposit Invoice Sent At, Deposit Due Date, Deposit Amount. Tag: is-deposit-owing. Stage: Deposit Requested. Users: OWNER, OFFICE. Folder "08. Deposit".
- Time: 50 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-25 · Deposit invoice sent, and the due-date check". Status Draft.
2. Trigger: the deposit invoice is sent by the owner (invoice sent, the draft made by WF-24), for "Residential" and "Commercial & Industrial". Check by hand that "invoice sent" exists as a trigger on this sub-account. If it does not, write that down.
3. Settings: re-entry NOT allowed (once per job). Stop on response: no. The contact leaves when the deposit is paid (WF-26) or the job is cancelled. Timezone Australia/Brisbane.
4. Step 1: Send email "DEP-02 · Deposit invoice email" (subject "Deposit for your job on {{opportunity.job_date}}", from brand), sent immediately when the owner presses send, no window (it is the invoice email itself; the sheet says "waits" but a window cannot hold it, treated as immediate).
5. Step 2: update "Deposit Invoice Sent At" to now.
6. Step 3: move the opportunity to stage "Deposit Requested".
7. Step 4: add tag "is-deposit-owing".
8. Step 5: Wait until 4:00pm on "Deposit Due Date".
9. Step 6, If/Else: the deposit is unpaid. Yes:
   - (a) Wait until the window 8am to 8pm Mon to Sat (hold if 4pm falls on a Sunday; Sunday behaviour is not stated in the sheet, the window wait was added by the builder).
   - (b) Send SMS, exact text: "Hi {{contact.first_name}}, we have not received your deposit of {{opportunity.deposit_amount}} yet. If you have paid, please reply with the remittance. {{custom_values.sms_signoff}}"
   - (c) Internal notification, alert 13 (Deposit unpaid at its due date): OWNER by SMS and email, OFFICE by email and in-app. Message "Deposit unpaid: {{contact.first_name}} {{contact.last_name}}, {{opportunity.deposit_amount}}."
   - (d) Create Task, title "CHASE {{contact.first_name}}: deposit unpaid", description "The deposit was due today and has not landed. The customer has had a text asking for the remittance. Check for a reply; if it will not arrive in time, move the crew to other work and tell the customer.", assigned to OWNER, due on the deposit due date.
10. Check there is no reminder step between sending and the due date.
11. Open decision, note only: which system sends invoice reminders, the platform or Xero (decision 9: the platform sends DEP-03, Xero reminders must be switched off, Glenn to confirm). Do not change anything.
12. Confirm the error branch (alert 11) and no extra steps.

**Part 2, activate and test**
1. Create "TEST Depsent Dev" (Residential card in "Job Booked", your own phone and email) with Job Date, Deposit Amount 500, and a draft deposit invoice from WF-24 (or create a test draft invoice by hand). Publish WF-25.
2. Test A: send the draft invoice (by hand, to your own email). Check the invoice action by hand: it should send the invoice to the contact. Expect DEP-02 once, "Deposit Invoice Sent At" set, stage "Deposit Requested", tag is-deposit-owing on.
3. Test B (unpaid at 4:00pm): the real wait is until 4:00pm on Deposit Due Date, so read the scheduled step on the contact and check it. Then clone WF-25, replace the 4:00pm wait with a 2 minute wait, run on a fresh card, leave it unpaid. Expect after 2 minutes, inside the window: DEP-03 text, alert 13 (OWNER one text and one email only, OFFICE email and in-app) and the CHASE task for OWNER together. Run once outside the window or on Sunday if you can, and expect the text to be held.
4. Test C: pay the invoice before the wait ends (in the clone). Expect none of DEP-03, alert 13 or CHASE, and WF-26 fires instead (see T-WF-26).
5. Test D: confirm nothing was sent between sending and the due date (no reminder).
6. Test E: cancel the job. Expect the 4:00pm check is cancelled.
7. Delete the clone and test invoices.

**Expected result**
- DEP-02 once, field, stage and tag set. At the due date, if unpaid: DEP-03, alert 13 and CHASE task, one owner text only. If paid, none of them. No reminders in between.

**Evidence**: screenshots of the trigger, each step, the sent invoice, stage and tag, the scheduled 4:00pm step, received text and email, alert, task, results of paid and cancelled tests.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted. If "invoice sent" is not a trigger, report it.

**Switch off afterwards**: unpublish WF-25 after testing unless the wave lead says to keep it on.

---

### T-WF-26 · Check, activate and test WF-26 · Deposit received
- Wave: E
- Depends on: T-WF-25 (this workflow cancels its 4:00pm check and clears its tag). SMS DEP-01 "DEP-01 · Deposit received text" (written inline). Alert 9. Fields: Deposit Received At, Job Date. Tag: is-deposit-owing. Users: OWNER, OFFICE. Folder "08. Deposit".
- Time: 35 min
- Dev account only. Real contacts must never be used.

**Part 1, check the build (do not activate yet)**
1. Open "WF-26 · Deposit received". Status Draft.
2. Trigger: the deposit invoice is marked paid, for "Residential" and "Commercial & Industrial". Check by hand that "invoice paid" exists as a trigger on this sub-account (the Xero payment sync is a go-live item, not part of this test).
3. Settings: re-entry NOT allowed (sends once). Stop on response: no. Timezone Australia/Brisbane.
4. Step 1: update "Deposit Received At" to now.
5. Step 2: Send SMS, immediate, no window step, exact text: "Deposit received, thanks {{contact.first_name}}. You are all set for {{opportunity.job_date}}. {{custom_values.sms_signoff}}" (Open conflict, note only: DEP-01 is titled "Immediately" but the messaging document says it waits for the window. Built as immediate, decision 6.)
6. Step 3: Internal notification, alert 9 (Deposit received): OWNER by SMS and email, OFFICE by email and in-app. Message "Deposit received: {{contact.first_name}} {{contact.last_name}}."
7. Step 4: Remove from workflow "WF-25 · Deposit invoice sent, and the due-date check" so the pending 4:00pm check is cancelled. The opportunity is NOT moved: it stays in "Deposit Requested" until the job is marked complete.
8. Step 5: remove tag "is-deposit-owing".
9. Confirm the error branch (alert 11) and no extra steps.

**Part 2, activate and test**
1. Use a card from T-WF-25 (stage "Deposit Requested", tag is-deposit-owing on, contact in WF-25), for "TEST Depsent Dev", your own phone and email. Publish WF-26.
2. Test A: mark the test deposit invoice as paid (check the invoice action by hand: record a manual payment on the test invoice). Expect within 1 minute: "Deposit Received At" set, DEP-01 text received at once, alert 9 (OWNER one text and one email, OFFICE email and in-app).
3. Test B: confirm tag is-deposit-owing is removed.
4. Test C: confirm the contact left WF-25 (workflow history) so the 4:00pm check will not fire later.
5. Test D: confirm the card is still in "Deposit Requested".
6. Test E: mark paid again or re-send the paid event. Expect nothing (once only).

**Expected result**
- Field set, DEP-01 once, alert 9 delivered to the right people, WF-25 removed, tag removed, stage unchanged, nothing on a second payment.

**Evidence**: screenshots of the trigger, each step, the received text, the alert, the tag list before and after, workflow history of WF-25, the card stage.

**If it fails**: report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes may be made and noted. If "invoice paid" is not a trigger, report it.

**Switch off afterwards**: unpublish WF-26 after testing unless the wave lead says to keep it on. Delete test invoices.
