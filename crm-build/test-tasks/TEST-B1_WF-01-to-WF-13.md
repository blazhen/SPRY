# Test tasks B1: WF-01 to WF-13 (SprayIT Solutions, Dev sub-account)

Source: crm-build/workflows/WF-A_WF-01-to-WF-13.md (build sheets), AI-PROMPTS_A_WF-01-to-WF-13.md, CRM-BUILD-00-DECISIONS.md, messages/message-index.md and messages/sms/. Where the sheet and the build prompt differ, the sheet is followed and the difference is noted in the task.

## Rules for every task below
- Dev sub-account only: "SprayIT Solutions - Dev" (location ID 5M1zrDbimF17cM16mtmR). Never open or touch the live account "SprayIT Solutions". REAL CONTACTS MUST NEVER BE USED. Test contacts only.
- Test contact: name starts with TEST (for example "TEST Alex Sample"), made-up address, but the phone number and email are the tester's own. Never a customer's.
- The platform is called "the platform" in anything written down. Do not name any vendor.
- Roles: OWNER = Glenn Angus. OFFICE = Rachael Angus. ESTIMATOR = Glenn Angus.
- Account-wide: timezone Australia/Brisbane. Customer send window = 8am to 8pm, Monday to Saturday. Staff office hours (for "business hours" waits) = Monday to Friday 7am to 5pm (decision 2, Glenn to confirm). Alerts follow quiet hours set on the alert settings (Mon-Fri 7am-6pm all alerts; Sat 8am-2pm only alerts 1, 2, 6, 10, 11, 12; otherwise none), so an alert may be held if you test at night or on a Sunday: test inside those hours.
- Error branch on every workflow: on any failed step, Internal Notification alert 11 to OWNER (Glenn Angus) by SMS and email, with workflow name and contact name.
- All workflows are built in draft. Part 1 is done with the workflow in draft. Part 2 starts by publishing it.
- Where a test needs to jump ahead by days, use the workflow's contact list or execution log to move the test contact past the wait if the platform offers it. If it does not, check by reading the scheduled time of the next step and note "not run live" in the evidence.
- If it fails (every task): report the workflow, the step number, what happened and a screenshot in a comment, then set the task to Blocked. Do not redesign anything. Small fixes (a wrong name, a wrong wait) may be fixed and noted in a comment.
- Messages sent to the tester's own phone and email are real sends. Do this only after Part 1 passes.

---

### T-WF-01 · Check, activate and test WF-01 · Website lead intake
- Wave: A
- Depends on: T-WF-02 (WF-01 adds the contact to WF-02 as its last step; WF-02 must exist, draft is fine for Part 1, published for Part 2). Templates: "X-ACK-01 · New lead text" (SMS, text is written into the step), "X-ACK-02 · New lead email", "C-ACK-01 · Commercial new enquiry". Fields: consent_marketing, consent_text, consent_at, consent_page, building_stage, ask_for_google_review, first_touch_at, first_touch_referrer, first_touch_landing, last_touch_referrer, last_touch_landing, utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id, source, form_name, submitted_at, page_title. Tags: from-website, been-enquired, stage-res-new-lead, stage-com-new-lead. Alerts 1, 6, 11. Pipelines: Residential, Commercial & Industrial.
- Time: 40 min

**Part 1, check the build (do not activate yet)**
1. Open Automation, Workflows, folder "01. Intake". Open "WF-01 · Website lead intake". Status must be Draft. Timezone must be Australia/Brisbane.
2. Trigger: must be Inbound Webhook (from the website quote form), with no filter.
3. Settings: re-entry allowed (one run per submission; a repeat enquirer enters again but must never create a duplicate contact). Stop on reply is off. No send window (both acknowledgements are immediate).
4. Step 1: Create/Update Contact, finds or creates on phone (E.164 format) first, then email. No duplicate possible.
5. Step 2: Update Field mapping: Source, Form Name, Submitted At, Page Title, UTM Source, UTM Medium, UTM Campaign, UTM Term, UTM Content, UTM Id. Dropdown fields store the label ("Home", not "home"). Webhook field "stage" maps to "Building Stage".
6. Step 3: Update Field for the consent record: Consent Marketing, Consent Text, Consent At, Consent Page. Rule: append, never overwrite an earlier one. (Open item in the sheet: how several records are stored in one field set is undecided. Note what the build does.)
7. Step 4: attribution. First-touch fields only if empty: First Touch At, First Touch Referrer, First Touch Landing, the UTM fields and the click id fields. Last-touch fields always: Last Touch Referrer, Last Touch Landing.
8. Step 5: "Ask For Google Review" = Yes, only if it is empty.
9. Step 6: Add Tag: from-website, been-enquired, plus the New Lead stage tag for the board. The sheet does not list the tag text; the build assumes stage-res-new-lead (Residential) and stage-com-new-lead (Commercial & Industrial). Check against the tag list and note if different.
10. Step 7: If/Else conditions: Property Type is "Factory or warehouse", or "Farm or agricultural", or the message mentions a tender, a builder, a head contractor, or an area over 500 sqm.
11. Yes branch (commercial), in order: (a) Create Opportunity, pipeline "Commercial & Industrial", stage "New Lead", assigned to Rachael Angus. (b) Internal Notification alert 6 (Commercial enquiry) to Glenn Angus, message "Commercial enquiry: {{contact.name}}, {{contact.phone}}". (c) Internal Notification alert 1 (New enquiry) to Rachael Angus, email and in-app, message "New enquiry: {{contact.name}}, {{contact.phone}}". (d) Send SMS, immediate, exact text: "Hi {{contact.first_name}}, thanks for your enquiry. We will ring you shortly to talk it through. Need us sooner? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}" (this is X-ACK-01). (e) Send Email template "C-ACK-01 · Commercial new enquiry", immediate, from name = the contact name, subject "Your enquiry, {{contact.first_name}}".
12. No branch (residential), in order: (a) Create Opportunity, pipeline "Residential", stage "New Lead", assigned to Rachael Angus. If Property Type is "Something else", also create a review task for Rachael Angus. (b) Internal Notification alert 1 (New enquiry) to Rachael Angus, email and in-app, same message as above. (c) Send SMS, immediate, same exact text as step 11d. (d) Send Email template "X-ACK-02 · New lead email", immediate, from name = the contact name, subject "We have your enquiry, {{contact.first_name}}".
13. Step 8 (after the If/Else, both branches): Create Task, title "CALL {{contact.first_name}}: new lead, {{contact.areas}}", owner Rachael Angus, due 15 minutes from now. Description must read exactly: "Ring the new lead within 15 minutes. The acknowledgement text and email have already gone. Ring twice, back to back. No answer to either: move the card to Dial 1. If they answer and want a quote, move the card to Quoting, which hands it to the owner to write the quote. Ring back later: Follow-Up. Not now: Nurture."
14. Step 9: Add to Workflow "WF-02 · Lead not called: the 15 minute timer".
15. Error branch: alert 11 to Glenn Angus, SMS and email, with workflow name and contact name. No other steps exist.
16. Fix small errors (wrong name, wrong wait) and note them. Anything bigger: Blocked.

**Part 2, activate and test**
1. Real contacts must never be used. Create the test contact by posting the form, not by hand. Publish WF-01 and WF-02 first. Check the Dev account has a webhook sample or use the website quote form pointed at Dev only if that is set up; otherwise post a sample webhook payload with name "TEST Resi Sample", the tester's own phone and email, property_type Home, stage filled (for example "Planning"), consent fields, and utm_source "test".
2. Test A, residential. Post the form. Watch: Contacts (one contact only), Opportunities (Residential board, New Lead, assigned Rachael Angus), Tasks, internal notifications, the contact timeline, the tester's phone and inbox.
3. Test B, commercial. Post a second form with a new TEST name, own phone and a different email you control, property_type "Factory or warehouse". Watch the same places.
4. Test C, repeat. Post test A again with the same phone. Watch Contacts.
5. Test D, field values. Open the test A contact and read the custom fields.
6. Test E, failure. Force a step to fail (for example point one step at a deleted template in a copy, or follow the platform's way to test the error branch). Do not leave the break in the real workflow.
7. Expected timings: contact and card within a minute; both acknowledgements immediate (seconds); task due 15 minutes after the post; WF-02 shows the contact enrolled.

**Expected result**
- Test A: one contact; tags from-website, been-enquired and the stage tag; Residential card at New Lead assigned to Rachael Angus; alert 1 reaches Rachael (email and in-app); tester receives the X-ACK-01 text and the "X-ACK-02 · New lead email"; task "CALL TEST, new lead, ..." owned by Rachael due in 15 minutes; WF-02 started.
- Test B: Commercial & Industrial card at New Lead; alerts 6 (Glenn) and 1 (Rachael); X-ACK-01 text and "C-ACK-01 · Commercial new enquiry" received; no X-ACK-02 sent.
- Test C: no duplicate contact; consent fields hold a new record; first-touch fields unchanged.
- Test D: dropdown values read "Home", not "home"; Building Stage filled from the webhook "stage".
- Test E: alert 11 reaches Glenn Angus by SMS and email.

**Evidence:** screenshots of the workflow trigger and each branch, the contact timeline for tests A and B, the two cards on their boards, the task, alert 1 and 6 notifications, the received text and emails, the contact field list before and after test C, the alert 11 message.

**If it fails:** as in the rules above.

**Switch off afterwards:** leave WF-01 published only if Zen wants intake live for later waves; otherwise set it back to Draft. Delete or tag the TEST contacts "test-data" as Zen directs. Note: the sheet marks the stage tag key and the consent append method as open items.

---

### T-WF-02 · Check, activate and test WF-02 · Lead not called: the 15 minute timer
- Wave: A
- Depends on: T-WF-01 (WF-01 adds the contact to this workflow); T-WF-39 (the daily summary reads the "Leads Not Called" flag). Alert 7; alert 11. Field/flag: "Leads Not Called". No templates.
- Time: 40 min (waits are real time; run during Mon-Fri 7am-5pm)

**Part 1, check the build (do not activate yet)**
1. Open folder "01. Intake", workflow "WF-02 · Lead not called: the 15 minute timer". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Opportunity Created, stage "New Lead", on pipeline "Residential" and also "Commercial & Industrial". It can also be started by Add to Workflow from WF-01.
3. Settings: re-entry NOT allowed. Stop on reply off. The workflow ends when a call is logged on the card or the stage changes. No messages go to the customer.
4. All waits count office hours only (Mon-Fri 7am-5pm per decision 2); the clock pauses outside them, so an 11pm enquiry starts at 7am. The sheet says business hours of 7am (stop text) versus the 8am send window; the build uses 7am-5pm. Record which hours the Wait step shows.
5. Step 1: Wait 15 minutes, office hours only.
6. Step 2: If/Else "no call logged on the card". Yes branch: Internal Notification alert 7 (New lead not called after 15 minutes) to Rachael Angus, email and in-app. Message: "New lead not called after 15 minutes: {{contact.name}}, {{contact.phone}}".
7. Step 3: Wait until 60 minutes after the start, office hours only.
8. Step 4: If/Else "still no call logged". Yes branch: Internal Notification by SMS and email to Glenn Angus (no alert number). Message: "This lead has been waiting since {{workflow.start_time}} with no call: {{contact.name}}, {{contact.phone}}." (Sheet text: "this lead has been waiting since {{time}} with no call.")
9. Step 5: Update Field "Leads Not Called" (name is a placeholder) so the contact is listed under "Leads not called" in the daily summary from the next morning until a call is logged. WF-39 reads this.
10. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-02. Create three TEST contacts (names "TEST Timer One", "TEST Timer Two", "TEST Timer Three"), phone and email the tester's own (or leave the phone blank where the platform allows). Do it Mon-Fri between 7am and 4pm.
2. Test 1: create an opportunity in stage New Lead on Residential for "TEST Timer One" (by hand, or via WF-01 if T-WF-01 passed). Log nothing. Watch for 15 minutes.
3. Test 2: for the same contact keep logging nothing to 60 minutes after creation.
4. Test 3: create an opportunity for "TEST Timer Two"; at about 10 minutes log a call on the card. Wait past 15 minutes.
5. Test 4: create an opportunity for "TEST Timer Three" at about 11pm (or move the test off hours if you can; otherwise read the scheduled time of Wait 1 in the execution log and note "not run live").
6. Watch: execution log, internal notifications, contact timeline, the "Leads Not Called" field.

**Expected result**
- Test 1: alert 7 reaches Rachael Angus (email and in-app) at 15 minutes.
- Test 2: at 60 minutes Glenn Angus gets a text and email with the waiting-since time. "Leads Not Called" set for the next morning's summary.
- Test 3: no alert 7, and the workflow ends on the logged call.
- Test 4: the 15 minute clock starts at 7am next office day (or the log shows the 7am schedule).

**Evidence:** workflow screenshots, execution log for each contact, alert 7 and the 60 minute message, the field value, the test 4 schedule.

**If it fails:** as in the rules above.

**Switch off afterwards:** leave published only if testing the rest of Wave A; otherwise Draft. Remove test opportunities.

---

### T-WF-03 · Check, activate and test WF-03 · Missed call text-back
- Wave: A
- Depends on: none by workflow. Template "SYS-01 · Missed call text back" (SMS; text written into the step). Tags: from-phone, been-enquired. Alerts 2 and 11. Needs the Dev business phone number and a test phone.
- Time: 25 min

**Part 1, check the build (do not activate yet)**
1. Open folder "01. Intake", workflow "WF-03 · Missed call text-back". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Call Status, inbound call to the business number not answered.
3. Settings: re-entry allowed, but only once per caller per day. Stop on reply off. No send window (immediate, within 60 seconds).
4. Step 1: If/Else "this number has already received the text-back today". Yes branch: Remove from Workflow (end here).
5. Step 2: Create/Update Contact, find or create on the caller number (no duplicate).
6. Step 3: Add Tag: from-phone, been-enquired (exactly these two).
7. Step 4: Send SMS (SYS-01), exact text: "Sorry we missed your call. Reply here and we will get straight back to you, or we will ring you shortly. {{custom_values.sms_signoff}}"
8. Step 5: Internal Notification alert 2 (Missed call) to Rachael Angus, email and in-app. Message: "Missed call from {{contact.name}}, {{contact.phone}}".
9. Step 6: Create Task, title "RING BACK {{contact.first_name}}: missed call", owner Rachael Angus, due 30 minutes from now. Description exactly: "A call came in and nobody answered. The caller already has a text saying someone will ring back, so this is a promise the team has made."
10. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-03. Do not answer calls on the Dev business number during the test. Use the tester's own phone (not saved as a contact in Dev yet) for test 1.
2. Test 1: call the Dev business number from the tester's phone and let it ring out. Watch Contacts, the tester's phone, notifications, Tasks.
3. Test 2: call again the same day from the same phone.
4. Test 3: create a contact "TEST Known Caller" with the tester's second phone number (or the same phone on a contact that already exists), then call from it and let it ring out.

**Expected result**
- Test 1: a new contact is created on the caller number with tags from-phone and been-enquired; the SYS-01 text arrives within 60 seconds; alert 2 reaches Rachael Angus; task "RING BACK ...: missed call" owned by Rachael is due in 30 minutes.
- Test 2: no second text (the run ends at step 1).
- Test 3: no duplicate contact is created.

**Evidence:** trigger and step screenshots, the new contact with tags, the received text with the time, alert 2, the task, the execution log of test 2 showing the Remove from Workflow end.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft after testing (a live missed-call text must not go to anyone but test callers).

---

### T-WF-04 · Check, activate and test WF-04 · Out of hours reply
- Wave: A
- Depends on: none by workflow. Template "SYS-02 · Out of hours reply" (SMS; text in the step). Custom values office_hours, contact_mobile, sms_signoff. Alert 11.
- Time: 25 min (needs a time outside office hours)

**Part 1, check the build (do not activate yet)**
1. Open folder "01. Intake", workflow "WF-04 · Out of hours reply". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Customer Replied, inbound SMS received outside office hours. The build treats Mon-Fri 7am-6pm and Sat 8am-2pm as office hours, anything else outside. The sheet does not define "outside" (decision 2 says staff office hours are Mon-Fri 7am-5pm). Note which hours are in the filter and flag if they differ.
3. Settings: re-entry allowed, once per contact per day (not once per message). Stop on reply off. No send window (immediate).
4. Step 1: If/Else "this contact already got the reply today". Yes branch: Remove from Workflow (end here).
5. Step 2: Send SMS (SYS-02), exact text: "Thanks for your message. We are back {{custom_values.office_hours}} and will reply first thing. Urgent? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
6. No tags or fields are set. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-04. Create contact "TEST Hours Check" with the tester's own phone number.
2. Test 1: from that phone, text the Dev number at 9pm (any time outside the hours above).
3. Test 2: text again 30 minutes later (for example 9:30pm).
4. Test 3: text at 10am on a Tuesday. If you cannot wait, say so and note "not run live"; check instead that the filter excludes that time.
5. Watch the tester's phone and the contact's conversation.

**Expected result**
- Test 1: the SYS-02 text arrives at once.
- Test 2: no second reply.
- Test 3: no reply.
- No tags or fields change on the contact.

**Evidence:** trigger filter screenshot, the received text with timestamp, the conversation showing no second reply, the execution log.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft.

---

### T-WF-05 · Check, activate and test WF-05 · Dial 1: the tried-to-call text
- Wave: A
- Depends on: T-WF-01 (cards normally reach Dial 1 from New Lead); T-WF-06 (next stage is Dial 2). Template "DIAL-01 · Missed call text after two calls" (SMS; text in the step). Fields: contact_attempts ("Contact Attempts"), last_attempt_at ("Last Attempt At"). Alert 11.
- Time: 25 min

**Part 1, check the build (do not activate yet)**
1. Open folder "02. Dial 1 and Dial 2", workflow "WF-05 · Dial 1: the tried-to-call text". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Pipeline Stage Changed to "Dial 1", on "Residential" and also "Commercial & Industrial".
3. Settings: re-entry NOT allowed (once per lead). Stop on reply on: a reply or an answered call before the second round closes the task. No send window (immediate).
4. Step 1: Wait 10 seconds.
5. Step 2: Send SMS (DIAL-01), exact text: "Hi {{contact.first_name}}, we just tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.contact_mobile}} when it suits. {{custom_values.sms_signoff}}"
6. Step 3: Update Field "Contact Attempts" plus 2 (if empty, set to 2).
7. Step 4: Update Field "Last Attempt At" = now.
8. Step 5: Create Task, title "CALL {{contact.first_name}}: second round of calls", owner Rachael Angus, due later the same day (end of today). Description exactly: "Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails."
9. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-05. Create contact "TEST Dial One" with the tester's own phone and email, and a Residential opportunity in New Lead. Note the current "Contact Attempts" value.
2. Test 1: move the card from New Lead to Dial 1. Start a stopwatch.
3. Test 2: after the text, read the contact's custom fields.
4. Test 3: check Tasks for Rachael Angus.
5. Test 4: reply to the text from the tester's phone.

**Expected result**
- DIAL-01 text arrives about 10 seconds after the move.
- Contact Attempts has risen by 2 (or is 2 if it was empty); Last Attempt At is stamped.
- Task "CALL TEST Dial One: second round of calls" exists for Rachael Angus, due later today.
- After the reply the task closes (the sheet says a reply closes the task; if it does not, report it).
- Moving the card out of Dial 1 and back does not send a second text (no re-entry).

**Evidence:** timeline with the text timestamp and the stage-move time, the field values before and after, the task, the task after the reply.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; remove the test opportunity.

---

### T-WF-06 · Check, activate and test WF-06 · Dial 2: the email sequence
- Wave: A
- Depends on: T-WF-05 (cards come from Dial 1), T-WF-07 (a phone call booking removes the contact from this workflow), T-WF-08 (the cancel task says the emails resume), T-WF-15 (Lost step triggers it; LOST-01 is excluded for Unreachable). Templates: "DIAL-02 · Dial 2 day 2 follow-up", "DIAL-03 · Dial 2 day 4 pick a time", "DIAL-04 · Dial 2 day 7 closing off". Tag: is-unresponsive. Lost reason "Unreachable" (field lost_reason, the platform's Lost Reason list). Alert 11.
- Time: 45 min (long waits: fast-forward)

**Part 1, check the build (do not activate yet)**
1. Open folder "02. Dial 1 and Dial 2", workflow "WF-06 · Dial 2: the email sequence". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Pipeline Stage Changed to "Dial 2", on "Residential" and also "Commercial & Industrial".
3. Settings: re-entry NOT allowed. Stop on reply on (a reply on any channel). The workflow also ends if the customer books a phone call or the stage changes. Days count from entering Dial 2. Each email sits behind the send window 8am-8pm Mon-Sat.
4. Step 1: Wait 2 days.
5. Step 2: send window, then Send Email template "DIAL-02 · Dial 2 day 2 follow-up", from name = contact name, subject "Following up on your {{custom_values.trade_noun}} enquiry".
6. Step 3: Wait until day 4 (from entering Dial 2).
7. Step 4: send window, then Send Email "DIAL-03 · Dial 2 day 4 pick a time", subject "Pick a time to talk about your {{custom_values.trade_verb}} job".
8. Step 5: Create Task, title "CALL {{contact.first_name}}: one more try", owner Rachael Angus, due day 4. Description exactly: "One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way." The task sits between DIAL-03 and the day 7 wait.
9. Step 6: Wait until day 7 (from entering Dial 2).
10. Step 7: send window, then Send Email "DIAL-04 · Dial 2 day 7 closing off", subject "Closing this one off".
11. Step 8: Wait 1 day.
12. Step 9: If/Else "still in Dial 2 with no reply". Yes branch: (a) set the opportunity status Lost with reason "Unreachable" (lost_reason); (b) Add Tag is-unresponsive.
13. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-06 (and WF-15 if you want to see its effect; otherwise skip the LOST-01 check). Create three contacts with the tester's own phone and email: "TEST Dial Two A", "TEST Dial Two B", "TEST Dial Two C", each with a Residential opportunity in Dial 1.
2. Test A (full path): move to Dial 2. Fast-forward 2 days: DIAL-02. Fast-forward to day 4: DIAL-03 and the CALL task. Fast-forward to day 7: DIAL-04. Fast-forward 1 day with no reply and no stage change.
3. Test B (reply): move to Dial 2, let DIAL-02 send, then reply to it from the tester's inbox. Fast-forward past day 4.
4. Test C (booking): move to Dial 2, then book a phone call in the phone call calendar as this contact (see T-WF-07). Fast-forward past day 4.
5. Test timing outside the send window: move a card at, for example, 9pm Sunday, or read the held send time in the log.

**Expected result**
- Test A: DIAL-02 inside the window at day 2; DIAL-03 at day 4 plus task "CALL TEST Dial Two A: one more try" for Rachael Angus due day 4; DIAL-04 at day 7; at day 8 the opportunity is Lost, reason Unreachable, and the contact has tag is-unresponsive. WF-15 runs but sends no LOST-01 for Unreachable.
- Test B: nothing further sends after the reply.
- Test C: the contact is removed from WF-06 and nothing further sends.
- Messages due outside 8am-8pm Mon-Sat are held to the next window.

**Evidence:** workflow screenshots, execution log per contact, each received email, the task, the Lost status and reason, the tag, the WF-15 log.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; remove test opportunities.

---

### T-WF-07 · Check, activate and test WF-07 · Phone call booked
- Wave: A
- Depends on: T-WF-06 (WF-07 removes the contact from it), T-WF-08 (reschedule re-adds to WF-07). Templates: "X-APPT-01 · Phone call booked email", "X-APPT-02 · Phone call booked text", "X-APPT-03 · Phone call 24 hours before", "X-APPT-04 · Phone call 2 hours before" (all SMS texts are written into the steps). Alerts 4 and 11. The phone call calendar.
- Time: 40 min (set the booking at least 3 days ahead, or fast-forward)

**Part 1, check the build (do not activate yet)**
1. Open folder "03. Phone calls", workflow "WF-07 · Phone call booked". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Customer Booked Appointment in the phone call calendar only.
3. Settings: re-entry allowed (once per booking). Stop on reply off. It keeps running after a reply or a quote acceptance (decision 4). It ends if the appointment is moved or cancelled (WF-08 takes over).
4. Step 1: Remove from Workflow "WF-06 · Dial 2: the email sequence" (this is the pause; a person re-adds the contact to resume).
5. Step 2: Send Email "X-APPT-01 · Phone call booked email", immediate, from name = brand name, subject "Confirmed: {{appointment.start_time}}".
6. Step 3: Send SMS (X-APPT-02), immediate, exact text: "Booked in for {{appointment.start_time}}. We will call you on {{contact.phone}}. Change it here: {{appointment.reschedule_link}} {{custom_values.sms_signoff}}"
7. Step 4: Internal Notification alert 4 (Phone call booked) to the assigned user (not a fixed person), email and in-app. Message: "Phone call booked: {{contact.name}}, {{appointment.start_time}}".
8. Step 5: Wait until 24 hours before the appointment.
9. Step 6: send window (8am-8pm Mon-Sat), then Send SMS (X-APPT-03), exact text: "Reminder: your call with {{custom_values.business_short_name}} is tomorrow, {{appointment.start_time}}. Need to move it? {{appointment.reschedule_link}} {{custom_values.sms_signoff}}"
10. Step 7: Wait until 2 hours before.
11. Step 8: Send SMS (X-APPT-04), immediate, no send window, exact text: "Your call with {{custom_values.business_short_name}} is at {{appointment.start_time}}, about 2 hours away. Talk soon. {{custom_values.sms_signoff}}"
12. Error branch alert 11 to Glenn Angus, SMS and email. No other steps. Note from the sheet: if 24 hours before falls outside the window, X-APPT-03 is held.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-07 (and WF-06 for test 2). Create "TEST Call Book" with the tester's own phone and email and an assigned user.
2. Test 1: book a phone call in the phone call calendar for 3 days ahead, as this contact.
3. Test 2: repeat with a second contact "TEST Call Book Dial2" whose card is in Dial 2 with WF-06 running.
4. Test 3: wait until (or fast-forward to) 24 hours before the booking.
5. Test 4: wait until (or fast-forward to) 2 hours before.
6. Test 5: book another call and cancel it before the reminders.

**Expected result**
- Test 1: X-APPT-01 email and X-APPT-02 text arrive at once; alert 4 reaches the assigned user.
- Test 2: WF-06 stops sending for that contact (removed from the workflow).
- Test 3: X-APPT-03 text arrives within the window (held to 8am if 24 hours before is outside it).
- Test 4: X-APPT-04 text arrives about 2 hours before.
- Test 5: no reminders send after the cancellation (WF-08 takes over).

**Evidence:** booking screenshot, received email and texts with times, alert 4, WF-06 contact list showing removal, execution log.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; cancel test bookings.

---

### T-WF-08 · Check, activate and test WF-08 · Phone call moved or cancelled
- Wave: A
- Depends on: T-WF-07 (rescheduling re-adds to WF-07; test needs bookings made by it), T-WF-06 (task text mentions Dial 2 emails resuming). Template "X-APPT-06 · Booking moved". Alerts 5 and 11.
- Time: 30 min

**Part 1, check the build (do not activate yet)**
1. Open folder "03. Phone calls", workflow "WF-08 · Phone call moved or cancelled". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Appointment Status in the phone call calendar, when an appointment is rescheduled or cancelled.
3. Settings: re-entry allowed (once per change). Stop on reply off. No send window (the email is immediate). The opportunity does not move.
4. Step 1: If/Else "rescheduled". Yes branch: (a) Send Email "X-APPT-06 · Booking moved", immediate, from name = brand name, subject "Your booking has moved"; (b) Add to Workflow "WF-07 · Phone call booked" (re-queues the reminders against the new time).
5. Step 2: If/Else "cancelled". Yes branch: (a) Internal Notification alert 5 (Phone call or inspection cancelled) to the assigned user, email and in-app, message "Phone call cancelled: {{contact.name}}"; (b) Create Task, title "CALL {{contact.first_name}}: phone call cancelled", owner the assigned user, due the same day, description exactly: "They cancelled the phone call they booked. Ring them: a cancelled call is usually a diary clash, and a short call often rebooks it. If the card is in Dial 2, the emails resume from where they paused."
6. Error branch alert 11 to Glenn Angus, SMS and email. No other steps. Note: alert 5 is shared with inspections (WF-18); here it goes to the assigned user, not OWNER.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-08 and WF-07. Create "TEST Call Move" with the tester's own phone and email; book a phone call for tomorrow or later, and note the card's stage.
2. Test 1: reschedule the booking to a new time.
3. Test 2: cancel the booking (use a second booked test contact, or re-book first).
4. Watch: tester's inbox, WF-07 contact list, notifications, Tasks, the opportunity stage.

**Expected result**
- Test 1: "X-APPT-06 · Booking moved" arrives; the contact is re-added to WF-07 and new reminders queue for the new time.
- Test 2: alert 5 goes to the assigned user; task "CALL TEST Call Move: phone call cancelled" for the assigned user, due the same day.
- In both tests the card stage stays unchanged.

**Evidence:** booking before and after, received email, WF-07 log showing re-entry, alert 5, the task, the stage before and after.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; cancel any test bookings.

---

### T-WF-09 · Check, activate and test WF-09 · Quoting: hand-over to the owner
- Wave: B
- Depends on: T-WF-06 and T-WF-16 (removed on entry; WF-16 may not exist yet in Dev, link it later and note that), T-WF-38 (sends alert 14 "Assigned to you" by text and email when assigned), T-WF-39 (daily summary reads "Quotes To Write"). Tags: been-contacted, is-nurturing. Field/flag "Quotes To Write". Alert 11. No templates.
- Time: 35 min plus 2 business days for the residential wait (fast-forward)

**Part 1, check the build (do not activate yet)**
1. Open folder "04. Quote", workflow "WF-09 · Quoting: hand-over to the owner". Status Draft. Timezone Australia/Brisbane. Business days = Monday to Friday.
2. Trigger: Pipeline Stage Changed to "Quoting", on "Residential" and also "Commercial & Industrial".
3. Settings: re-entry allowed (the stage can be re-entered). Stop on reply off. No messages are sent. It ends when the quote is sent or the card moves to Follow-Up, Nurture or Lost.
4. Step 1: Add Tag been-contacted. Remove Tag is-nurturing.
5. Step 2: Remove from Workflow "WF-06 · Dial 2: the email sequence" and "WF-16" (if either is running).
6. Step 3: assign the contact and the opportunity to Glenn Angus. WF-38 then sends alert 14 "Assigned to you" by text and email.
7. Step 4: If/Else "opportunity is on the pipeline Residential". Yes branch: (a) Create Task, title "QUOTE {{contact.first_name}}: write and send the quote", owner Glenn Angus, due 2 business days, description exactly: "The office has spoken to them and they want a quote. Ring them first if you need more detail, plans or an energy report. Write the quote in the quote tool, with each option as its own line if there is more than one, and send it. Sending it moves the card to Quote Sent and starts the follow-up."; (b) Wait 2 business days. No branch (commercial): (a) Create Task, title "QUOTE {{contact.first_name}}: scope and send the proposal", owner Glenn Angus, due 5 business days, description exactly: "Ring them for the detail: who decides, roughly how big, what the space is used for, whether it is operating during the works, and the programme. Work out product, thickness, access, plant, staging and WHS, then send the proposal from the quote tool, which moves the card to Quote Sent."; (b) Wait 5 business days.
8. Step 5: If/Else "still in Quoting". Yes branch: update "Quotes To Write" (name is a placeholder) so the contact is listed under "Quotes to write" in the daily summary until it moves.
9. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-09 (and WF-38 if you want to see alert 14). Create two contacts with the tester's own phone and email: "TEST Quote Resi" (Residential opportunity in Dial 2 or New Lead, tag is-nurturing added by hand) and "TEST Quote Comm" (Commercial & Industrial opportunity, same).
2. Test 1: move "TEST Quote Resi" to Quoting.
3. Test 2: move "TEST Quote Comm" to Quoting.
4. Test 3: check the tags on both contacts.
5. Test 4: leave the residential card in Quoting and fast-forward 2 business days (5 for the commercial one).
6. Test 5: put one contact into WF-06 first (move to Dial 2, then to Quoting).

**Expected result**
- Test 1: card and contact assigned to Glenn Angus; alert 14 by text and email (via WF-38); task "QUOTE TEST Quote Resi: write and send the quote" due in 2 business days.
- Test 2: task "QUOTE ...: scope and send the proposal" due in 5 business days.
- Test 3: been-contacted on, is-nurturing off.
- Test 4: contact appears under "Quotes to write" (field set) if still in Quoting.
- Test 5: the contact is removed from WF-06 and it stops.
- No customer message is sent.

**Evidence:** both cards and assignments, both tasks with due dates, tags before and after, the field value, WF-06 contact list, alert 14.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; remove test opportunities.

---

### T-WF-10 · Check, activate and test WF-10 · Quote sent and the follow-up
- Wave: B
- Depends on: T-WF-14 (acceptance stops it), T-WF-12 (accept or decline), T-WF-09 (Quoting hands over to it), T-WF-06 and T-WF-16 (removed on entry). Templates: "R-QUOTE-01 · Quote sent email", "R-QUOTE-02 · Quote sent text", "R-FU-01 · Quote day 2 text", "R-FU-02 · Quote day 5 why quotes differ", "R-FU-03 · Quote day 10 text", "R-FU-04 · Quote day 21 final close". Tags: been-contacted, been-quoted, is-nurturing. Fields: quote_sent_at, quote_number, quote_link. Alert 11.
- Time: 50 min (waits: fast-forward)

**Part 1, check the build (do not activate yet)**
1. Open folder "04. Quote", workflow "WF-10 · Quote sent and the follow-up". Status Draft. Timezone Australia/Brisbane.
2. Trigger: the quote is sent from the quote tool, or the card is moved by hand to "Quote Sent", on pipeline "Residential" only.
3. Settings: re-entry NOT allowed. Stop on reply on (also ends on accept, decline, or the card leaving Quote Sent). Days count from the quote being sent. R-QUOTE-01 and R-QUOTE-02 immediate; R-FU-01 to R-FU-04 behind the 8am-8pm Mon-Sat window.
4. Step 1: Update Opportunity, move to Quote Sent if not already there.
5. Step 2: Remove from Workflow "WF-06 · Dial 2: the email sequence" and "WF-16" (if running).
6. Step 3: Update Field "Quote Sent At" = now. "Quote Number", "Quote Link" and the value come from the quote.
7. Step 4: Add Tag been-contacted, been-quoted. Remove Tag is-nurturing.
8. Step 5: Send Email "R-QUOTE-01 · Quote sent email", immediate, from name = contact name, subject "Your quote from {{custom_values.business_name}}" (sent as the quote tool email with the view and accept button).
9. Step 6: Send SMS (R-QUOTE-02), immediate, exact text: "Hi {{contact.first_name}}, your quote is in your inbox. You can accept it online from the email. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}"
10. Step 7: Create Task, title "CALL {{contact.first_name}}: quote follow up", owner Rachael Angus, due day 2, description exactly: "Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence."
11. Step 8: Wait until day 2. Step 9: send window, then SMS (R-FU-01), exact text: "Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}" (The CALL task and R-FU-01 both fall on day 2, as in the sheet.)
12. Step 10: Wait until day 5. Step 11: send window, then Email "R-FU-02 · Quote day 5 why quotes differ", from name = contact name, subject "Why our number might look different".
13. Step 12: Wait until day 10. Step 13: send window, then SMS (R-FU-03), exact text: "Hi {{contact.first_name}}, still thinking it over, or has something changed? Either is fine, we just want to know whether to keep it open. {{custom_values.sms_signoff}}"
14. Step 14: Wait until day 21. Step 15: send window, then Email "R-FU-04 · Quote day 21 final close", from name = contact name, subject "Should we close this off?"
15. Step 16: Create Task, title "DECIDE {{contact.first_name}}: accepted, nurture or lost", owner Rachael Angus, due day 21, description exactly: "Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting."
16. Error branch alert 11 to Glenn Angus, SMS and email. No other steps. (The card moves to Nurture, Lost or Follow-Up by a person via the DECIDE task, not by this workflow.)

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-10. Create three contacts with the tester's own phone and email: "TEST Quote Sent A", "B", "C", each with a Residential opportunity in Quoting, tag is-nurturing added to A.
2. Test A (full path): send a test quote from the quote tool (or move the card to Quote Sent). Fast-forward to day 2, 5, 10, 21.
3. Test B (reply): send the quote, then reply to a message on day 3 and fast-forward.
4. Test C (accept): send the quote, accept it on day 6 (see T-WF-12 and T-WF-14), fast-forward.
5. Test D (window): note any message whose due time falls outside 8am-8pm Mon-Sat.

**Expected result**
- Test A: stage Quote Sent; Quote Sent At stamped; tags been-contacted and been-quoted on, is-nurturing off; R-QUOTE-01 email and R-QUOTE-02 text immediately; day 2 task "CALL ...: quote follow up" for Rachael plus R-FU-01 text; day 5 R-FU-02 email; day 10 R-FU-03 text; day 21 R-FU-04 email and the DECIDE task for Rachael.
- Test B: later messages do not send.
- Test C: nothing further sends.
- Test D: messages are held to the next window.

**Evidence:** step screenshots, each received message with timestamps, the tasks, field and tag screenshots, execution logs.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; remove test opportunities.

---

### T-WF-11 · Check, activate and test WF-11 · Proposal sent and the follow-up
- Wave: B
- Depends on: T-WF-12 (accept), T-WF-14 (acceptance stops it). Templates: "C-PROP-01 · Commercial proposal sent", "C-PROP-02 · Commercial proposal day 7", "C-PROP-03 · Commercial proposal day 21". Tags: been-contacted, been-quoted, is-nurturing. Fields: quote_sent_at, quote_number, quote_link. Alert 11.
- Time: 40 min (waits: fast-forward)

**Part 1, check the build (do not activate yet)**
1. Open folder "04. Quote", workflow "WF-11 · Proposal sent and the follow-up". Status Draft. Timezone Australia/Brisbane.
2. Trigger: the proposal is sent from the quote tool, or the card is moved by hand to "Quote Sent", on pipeline "Commercial & Industrial" only.
3. Settings: re-entry NOT allowed. Stop on reply on (also ends on accept, or the card moving to Follow-Up, Nurture or Lost). All three emails sit behind the send window 8am-8pm Mon-Sat, including C-PROP-01.
4. Step 1: Update Opportunity, move to Quote Sent if not already there.
5. Step 2: Update Field "Quote Sent At" = now. "Quote Number", "Quote Link" and the value come from the proposal.
6. Step 3: Add Tag been-contacted, been-quoted. Remove Tag is-nurturing.
7. Step 4: send window, then Email "C-PROP-01 · Commercial proposal sent", from name = contact name, subject "Proposal, {{opportunity.site_address}}". (Sheet open item: the message record says "Immediately" but the window is business hours; the sheet's business hours is built. Note what you see.)
8. Step 5: Create Task, title "CALL {{contact.first_name}}: confirm receipt", owner Glenn Angus (ESTIMATOR), due 2 days, description exactly: "Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it."
9. Step 6: Wait until day 7. Step 7: send window, then Email "C-PROP-02 · Commercial proposal day 7", subject "Anything you need on {{opportunity.quote_number}}?"
10. Step 8: Create Task, title "CHASE {{contact.first_name}}: decision date", owner Glenn Angus (OWNER), due day 7, description exactly: "Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity." Sheet open item: the data says "due day 7, then day 21" but only one Create Task step is built, at day 7. Do not add a second one; note it.
11. Step 9: Wait until day 21. Step 10: send window, then Email "C-PROP-03 · Commercial proposal day 21", subject "{{opportunity.quote_number}}, where does this sit?"
12. Sheet open item: there is no step removing WF-06 and WF-16 here (unlike WF-10); built as written. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-11. Create "TEST Prop Sent" and "TEST Prop Reply" with the tester's own phone and email, each with a Commercial & Industrial opportunity in Quoting.
2. Test 1: send a test proposal from the quote tool (or move the card to Quote Sent) for "TEST Prop Sent".
3. Test 2: fast-forward to day 7, then to day 21.
4. Test 3: for "TEST Prop Reply", send the proposal, reply on day 5 from the tester's inbox, fast-forward past day 7.

**Expected result**
- Test 1: stage Quote Sent; Quote Sent At stamped; tags been-contacted and been-quoted on, is-nurturing off; "C-PROP-01 · Commercial proposal sent" received (inside the window); task "CALL ...: confirm receipt" for Glenn Angus due in 2 days.
- Test 2: day 7 "C-PROP-02 · Commercial proposal day 7" and the CHASE task for Glenn Angus; day 21 "C-PROP-03 · Commercial proposal day 21" (the CHASE task is not created again, per the build).
- Test 3: no further sends after the reply.

**Evidence:** step screenshots, received emails with times, the tasks, field and tags, execution logs.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; remove test opportunities.

---

### T-WF-12 · Check, activate and test WF-12 · Accept or decline button on a quote
- Wave: B
- Depends on: T-WF-14 (accepted quotes fire it), T-WF-15 (declined quotes fire it; LOST-01 is sent there, not here), T-WF-10 and T-WF-11 (accept and decline buttons come from their quotes). Tag: is-active-job. Fields: accepted_quote_option ("Accepted Quote Option"), lost_reason (platform Lost Reason list). Alert 11. No templates.
- Time: 40 min

**Part 1, check the build (do not activate yet)**
1. Open folder "04. Quote", workflow "WF-12 · Accept or decline button on a quote". Status Draft. Timezone Australia/Brisbane.
2. Trigger: a quote is accepted or declined online, on "Residential" and also "Commercial & Industrial".
3. Settings: re-entry allowed (once per button press). Stop on reply off. No messages are sent in this workflow.
4. Step 1: If/Else "accepted". Yes branch has a nested If/Else "contact has tag is-active-job" (an add-on or variation quote on a job already under way).
5. Nested Yes (add-on): (i) Update Opportunity, value plus the accepted add-on; (ii) Create Task, title "ADD-ON {{contact.first_name}}: accepted, update the job", owner Rachael Angus, due the same day, description exactly: "An add-on or variation quote on a job already under way has been accepted. Check the value on the card, add it to the invoice schedule, and tell the crew if it changes the work on the day. No thank-you has gone and the card has not moved."; (iii) Remove from Workflow, end here (no thank-you, no alert, no stage move).
6. Nested No (normal): (i) Update Field "Accepted Quote Option" = the option accepted; (ii) Update Opportunity, mark the other options on the job as not chosen, so only one can be accepted; (iii) Update Opportunity, move to stage "Quote Accepted".
7. Step 2: If/Else "declined". Yes branch: (a) Update Opportunity, status Lost, with the reason asked for (lost_reason); (b) nothing else. LOST-01 follows from WF-15; nothing is sent here. (Sheet open item: "opportunity value" and "status" are platform fields; the decline reason prompt is not specified, the platform's Lost Reason list is used. Note what the decline page asks.)
8. No SMS or email step may exist anywhere. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-12 (and WF-14, WF-15 to see hand-offs). Create "TEST Accept Two Options" (a quote with two options on a Residential opportunity), "TEST Addon" (same, with tag is-active-job added by hand and an existing value on the card) and "TEST Decline", all with the tester's own phone and email.
2. Test 1: from the quote email click Accept on one option for "TEST Accept Two Options".
3. Test 2: accept the add-on quote for "TEST Addon".
4. Test 3: click Decline on a quote for "TEST Decline" and give a reason.
5. Test 4: click Accept twice on a test quote in quick succession.

**Expected result**
- Test 1: "Accepted Quote Option" set; the other option marked not chosen; card at Quote Accepted; WF-14 fires.
- Test 2: the card value rises by the add-on; task "ADD-ON TEST Addon: accepted, update the job" for Rachael Angus due today; no thank-you message, no stage move, no alert 8.
- Test 3: opportunity status Lost, reason recorded; WF-15 runs.
- Test 4: only one run.
- No message is sent by WF-12 itself.

**Evidence:** option field before and after, card stage, value before and after, task, the lost status and reason, WF-12 execution logs, WF-14 and WF-15 logs.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; remove test opportunities.

---

### T-WF-13 · Check, activate and test WF-13 · Follow-Up: callback requested
- Wave: B
- Depends on: T-WF-06, T-WF-10, T-WF-11 (this workflow removes the contact from all three). Tag: been-contacted. Field: callback_at ("Callback At", required). Field/flag "Callbacks Overdue". Alert 11. No templates.
- Time: 35 min (plus 1 day past callback: fast-forward)

**Part 1, check the build (do not activate yet)**
1. Open folder "04. Quote", workflow "WF-13 · Follow-Up: callback requested". Status Draft. Timezone Australia/Brisbane.
2. Trigger: Pipeline Stage Changed to "Follow-Up", on "Residential" and also "Commercial & Industrial".
3. Settings: re-entry allowed; a new "Callback At" restarts it. Stop on reply off. No messages are sent. It ends when the stage changes.
4. Step 1: Add Tag been-contacted.
5. Step 2: require "Callback At" on this stage change (the stage form must not close without it). This may sit on the pipeline stage form rather than inside the workflow: check both and note where it is.
6. Step 3: Remove from Workflow "WF-06 · Dial 2: the email sequence", "WF-10 · Quote sent and the follow-up" and "WF-11 · Proposal sent and the follow-up" (the pause; a person re-adds the contact to resume; the sheet states no resume rule).
7. Step 4: Create Task, title "CALL {{contact.first_name}}: callback as asked", owner Rachael Angus, due at the time in Callback At, description exactly: "The customer asked to be rung at this time. Ring them, then move the card on: Quoting if they now want a quote, Quote Accepted if they say yes to a quote already sent, Nurture if it is not now, or Lost with a reason. Want more time on a quote? Set a new callback time."
8. Step 5: Wait until 1 day after Callback At.
9. Step 6: If/Else "still in Follow-Up". Yes branch: update "Callbacks Overdue" (name is a placeholder) so the contact is listed under "Callbacks overdue" in the daily summary.
10. Error branch alert 11 to Glenn Angus, SMS and email. No other steps.

**Part 2, activate and test**
1. Real contacts must never be used. Publish WF-13 (and WF-10 for test 3). Create "TEST Callback" with the tester's own phone and email and an opportunity on Residential in Quoting or Quote Sent.
2. Test 1: move the card to Follow-Up without a Callback At time.
3. Test 2: move it to Follow-Up with Callback At = tomorrow 10am.
4. Test 3: first start WF-10 on a contact (send a test quote), then move that card to Follow-Up.
5. Test 4: leave it a day past Callback At (fast-forward) with the card still in Follow-Up.
6. Test 5: change Callback At to a new time.

**Expected result**
- Test 1: the move is refused.
- Test 2: tag been-contacted added; task "CALL TEST Callback: callback as asked" for Rachael Angus due tomorrow 10am.
- Test 3: the contact is removed from WF-10 (and WF-06, WF-11 if in them).
- Test 4: the contact appears under "Callbacks overdue".
- Test 5: the workflow restarts and a new task is created for the new time.
- No customer message is sent.

**Evidence:** the refusal screenshot, the task with due time, WF-10 contact list, the overdue field, the restart log.

**If it fails:** as in the rules above.

**Switch off afterwards:** set back to Draft; remove test opportunities.
