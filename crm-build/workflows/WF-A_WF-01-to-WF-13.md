# Hand-build sheets: WF-01 to WF-13 (SprayIT Solutions)

Source of truth: client-journey-onepage/journey-data.js. Build each workflow in the Systemations screens, SPRY sub-account only.

Account-wide, true for every sheet below:
- Timezone: Australia/Brisbane (as set on the account).
- Send window: messages marked "business hours" sit behind a Wait until a time window step, 8am to 8pm, Monday to Saturday. Messages marked "immediate" skip it. Alerts also follow quiet hours (Mon-Fri 7am-6pm all alerts; Sat 8am-2pm only alerts 1, 2, 6, 10, 11, 12; otherwise none).
- Stop on response: every sales sequence checks for an inbound reply before each send and stops if one arrived (WF-34 does the pause). Reminders about an agreed date keep running.
- Error branch on every workflow: on any failed step, Internal Notification alert 11 to OWNER (SMS and email) with workflow name and contact.
- Roles: OWNER = Glenn Angus; OFFICE = Rachael Angus; ESTIMATOR = Glenn Angus.
- Alert delivery: alert 1 OFFICE email + in-app; alert 2 OFFICE email + in-app; alert 4 and 5 assigned user (OFFICE email + in-app, or OWNER SMS + email; alert 5 goes to OWNER for an inspection); alert 6 OWNER SMS + email; alert 7 OFFICE email + in-app; alert 8 OWNER SMS + email and OFFICE email + in-app; alert 11 OWNER SMS + email.
- Re-entry is not stated in the sources for any workflow. Each sheet gives the rule implied by its "Stops" text; confirm on build.

---

## WF-01 · Website lead intake   (folder "01. Intake")
- Trigger: Inbound webhook from the website quote form. No filter.
- Settings: allow re-entry yes (one run per submission; a repeat enquirer enters again but must never create a duplicate contact). Stop on response: no. Send window: none, both acknowledgements are immediate. Timezone Australia/Brisbane.
- Steps:
  1. Create/Update Contact: find or create on phone (E.164), then email. Never create a duplicate.
  2. Update Field: map the fields; store human labels in dropdowns (Home, not home); map webhook field `stage` to `building_stage`.
  3. Update Field: append the consent record `consent_marketing`, `consent_text`, `consent_at`, `consent_page`. Never overwrite an earlier one.
  4. Update Field: attribution. First-touch fields only if empty (`first_touch_at`, `first_touch_referrer`, `first_touch_landing`, the utm_* and click-id fields); last-touch fields (`last_touch_referrer`, `last_touch_landing`) always.
  5. Update Field: `ask_for_google_review` = Yes, only if it is empty.
  6. Add Tag: `from-website`, `been-enquired`, plus the New Lead stage tag for the board it lands on.
  7. If/Else: property_type is Factory or warehouse, or Farm or agricultural, or the message mentions a tender, a builder, a head contractor, or an area over 500 sqm
     - Yes (commercial):
       1. Create Opportunity: Commercial & Industrial board, stage New Lead, assigned OFFICE.
       2. Internal Notification: alert 6 (Commercial enquiry) to OWNER.
       3. Internal Notification: alert 1 (New enquiry) to OFFICE.
       4. Send SMS: X-ACK-01 · Enters New Lead (sms, signed with sms_signoff), immediate.
       5. Send Email: C-ACK-01 · Enters New Lead on the Commercial board, from contact name, immediate.
     - No (residential):
       1. Create Opportunity: Residential board, stage New Lead, assigned OFFICE. If property_type is Something else, also add a review task.
       2. Internal Notification: alert 1 (New enquiry) to OFFICE.
       3. Send SMS: X-ACK-01 · Enters New Lead, immediate.
       4. Send Email: X-ACK-02 · Enters New Lead, from contact name, immediate.
  8. Create Task: title "CALL {{contact.first_name}}: new lead, {{contact.areas}}", owner OFFICE, due 15 minutes. Text: "Ring the new lead within 15 minutes. The acknowledgement text and email have already gone. Ring twice, back to back. No answer to either: move the card to Dial 1. If they answer and want a quote, move the card to Quoting, which hands it to the owner to write the quote. Ring back later: Follow-Up. Not now: Nurture."
  9. Add to Workflow: WF-02 (the 15 minute timer).
- Tags and fields it sets: tags `from-website`, `been-enquired`, stage tag; fields `consent_marketing`, `consent_text`, `consent_at`, `consent_page`, `building_stage`, `ask_for_google_review`, `first_touch_at`, `first_touch_referrer`, `first_touch_landing`, `last_touch_referrer`, `last_touch_landing`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id`, `source`, `form_name`, `submitted_at`, `page_title`.
- Stops when: sends once per submission.
- Test:
  1. Post a residential test form (property_type Home): one contact, residential card at New Lead assigned OFFICE, alert 1 to OFFICE, X-ACK-01 and X-ACK-02 received, task due in 15 minutes, WF-02 started.
  2. Post a Factory or warehouse form: Commercial card, alerts 6 and 1, X-ACK-01 and C-ACK-01 received, no X-ACK-02.
  3. Post the same phone again: no duplicate contact; consent fields hold a new record, first-touch fields unchanged.
  4. Check dropdown values read "Home", not "home"; `building_stage` filled from the webhook `stage`.
  5. Force a step to fail: alert 11 reaches OWNER.
- Open items: stage tag key text is not listed (pattern is stage- plus res or com plus the stage key, see journey-data tags.stageRule). The "append, never overwrite" consent rule needs a decision on how to store several records in one field set.

## WF-02 · Lead not called: the 15 minute timer   (folder "01. Intake")
- Trigger: Opportunity created in New Lead.
- Settings: allow re-entry no. Stop on response: no (stops on a logged call or stage change). Send window: waits count business hours only; the clock pauses outside them, so an 11pm enquiry starts at 7am. Timezone Australia/Brisbane.
- Steps:
  1. Wait: 15 minutes, business hours only.
  2. If/Else: no call logged on the card
     - Yes:
       1. Internal Notification: alert 7 (New lead not called after 15 minutes) to OFFICE.
  3. Wait: until 60 minutes, business hours only.
  4. If/Else: still no call logged
     - Yes:
       1. Internal Notification: text and email to OWNER: "this lead has been waiting since {{time}} with no call." (no alert number given in the data file)
  5. Update Field: from the next morning, list under Leads not called in the daily summary until a call is logged (WF-39 reads this).
- Tags and fields it sets: none.
- Stops when: a call is logged, or the stage changes.
- Test:
  1. Create a test lead in New Lead in business hours and log nothing: alert 7 at 15 minutes.
  2. Same, still nothing at 60 minutes: OWNER gets text and email.
  3. Log a call at 10 minutes: no alert.
  4. Create a lead at 11pm: clock starts at 7am.
- Open items: the 60 minute OWNER text and email has no alert number or template. Business hours for the Wait are 7am per the stop text, but the send window elsewhere is 8am: confirm which the Wait uses.

## WF-03 · Missed call text-back   (folder "01. Intake")
- Trigger: Inbound call to the business number not answered.
- Settings: allow re-entry yes, but once per caller per day. Stop on response: no. Send window: none, SYS-01 is immediate (within 60 seconds). Timezone Australia/Brisbane.
- Steps:
  1. If/Else: this number already got the text-back today
     - Yes:
       1. Remove from Workflow: end here (once per caller per day).
  2. Create/Update Contact: find or create on the caller number.
  3. Add Tag: `from-phone`, `been-enquired`.
  4. Send SMS: SYS-01 · Inbound call missed (sms).
  5. Internal Notification: alert 2 (Missed call) to OFFICE.
  6. Create Task: title "RING BACK {{contact.first_name}}: missed call", owner OFFICE, due 30 minutes. Text: "A call came in and nobody answered. The caller already has a text saying someone will ring back, so this is a promise the team has made."
- Tags and fields it sets: tags `from-phone`, `been-enquired`.
- Stops when: once per caller per day.
- Test:
  1. Call the number from an unknown test phone and let it ring out: contact created, SYS-01 within 60 seconds, alert 2 to OFFICE, task due in 30 minutes.
  2. Call again the same day: no second text.
  3. Call from a known contact: no duplicate contact.
- Open items: none.

## WF-04 · Out of hours reply   (folder "01. Intake")
- Trigger: Inbound SMS outside office hours.
- Settings: allow re-entry yes, once per contact per day. Stop on response: no. Send window: none, SYS-02 is immediate. Timezone Australia/Brisbane.
- Steps:
  1. If/Else: this contact already got the reply today
     - Yes:
       1. Remove from Workflow: end here (once per contact per day).
  2. Send SMS: SYS-02 · Inbound SMS outside hours (sms).
- Tags and fields it sets: none.
- Stops when: once per contact per day, not once per message.
- Test:
  1. Text the number at 9pm: SYS-02 arrives.
  2. Text again at 9:30pm: no second reply.
  3. Text at 10am Tuesday: no reply.
- Open items: the office hours that define "outside" are not given in the data file (quiet hours say Mon-Fri 7am-6pm, Sat 8am-2pm); confirm they are the same.

## WF-05 · Dial 1: the tried-to-call text   (folder "02. Dial 1 and Dial 2")
- Trigger: Stage changed to Dial 1.
- Settings: allow re-entry no (once per lead). Stop on response: yes, a reply or an answered call before the second round closes the task. Send window: none, DIAL-01 is immediate. Timezone Australia/Brisbane.
- Steps:
  1. Wait: 10 seconds.
  2. Send SMS: DIAL-01 · Enters Dial 1, after two calls back to back (sms).
  3. Update Field: `contact_attempts` plus 2 for the two calls; stamp `last_attempt_at`.
  4. Create Task: title "CALL {{contact.first_name}}: second round of calls", owner OFFICE, due later the same day. Text: "Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails."
- Tags and fields it sets: `contact_attempts`, `last_attempt_at`.
- Stops when: sends once per lead; a reply or an answered call before the second round closes the task.
- Test:
  1. Move a test card to Dial 1: DIAL-01 arrives about 10 seconds later.
  2. `contact_attempts` rises by 2 and `last_attempt_at` is stamped.
  3. Task appears for OFFICE due later today.
  4. Reply to the text: task closes.
- Open items: none beyond the 10 second Wait, which is built as written.

## WF-06 · Dial 2: the email sequence   (folder "02. Dial 1 and Dial 2")
- Trigger: Stage changed to Dial 2.
- Settings: allow re-entry no. Stop on response: yes (reply on any channel). Send window: DIAL-02, DIAL-03, DIAL-04 are business hours, so each sits behind the 8am-8pm Mon-Sat window. Days count from entering Dial 2. Timezone Australia/Brisbane.
- Steps:
  1. Wait: 2 days.
  2. Send Email: DIAL-02 · In Dial 2, no reply (Day 2), from contact name, business hours.
  3. Wait: until day 4.
  4. Send Email: DIAL-03 · In Dial 2, no reply (Day 4), from contact name, business hours.
  5. Create Task: title "CALL {{contact.first_name}}: one more try", owner OFFICE, due day 4. Text: "One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way."
  6. Wait: until day 7.
  7. Send Email: DIAL-04 · In Dial 2, no reply (Day 7, final), from contact name, business hours.
  8. Wait: 1 day.
  9. If/Else: still in Dial 2 with no reply
     - Yes:
       1. Update Field: status = Lost, reason Unreachable (`lost_reason`).
       2. Add Tag: `is-unresponsive`.
- Tags and fields it sets: tag `is-unresponsive` (only if day 7 passes with no reply, as the card closes); `lost_reason` Unreachable.
- Stops when: customer replies on any channel, books a phone call, or the stage changes.
- Test:
  1. Move a card to Dial 2 and fast-forward 2 days: DIAL-02 sends inside the window.
  2. Day 4: DIAL-03 and the CALL task.
  3. Reply after DIAL-02: nothing further sends.
  4. Book a phone call: sequence pauses (WF-07 pauses it).
  5. Let day 7 and 8 pass untouched: DIAL-04, then Lost with Unreachable and `is-unresponsive`.
- Open items: the Lost step triggers WF-15; WF-15 excludes LOST-01 for Unreachable, so no extra email goes. The waits "until day 4" and "until day 7" count from entering Dial 2.

## WF-07 · Phone call booked   (folder "03. Phone calls")
- Trigger: Appointment booked in the phone call calendar.
- Settings: allow re-entry yes (once per booking). Stop on response: no. Send window: X-APPT-01, X-APPT-02 and X-APPT-04 immediate; X-APPT-03 waits for the window. Timezone Australia/Brisbane.
- Steps:
  1. Remove from Workflow: pause WF-06 (a booking stops the Dial 2 emails).
  2. Send Email: X-APPT-01 · Phone call booked, from brand name, immediate.
  3. Send SMS: X-APPT-02 · Phone call booked, immediate.
  4. Internal Notification: alert 4 (Phone call booked) to the assigned user.
  5. Wait: until 24 hours before the appointment.
  6. Send SMS: X-APPT-03 · Phone call upcoming (24 hours before), business hours.
  7. Wait: until 2 hours before.
  8. Send SMS: X-APPT-04 · Phone call upcoming, immediate.
- Tags and fields it sets: none.
- Stops when: appointment moved or cancelled, which hands over to WF-08.
- Test:
  1. Book a test phone call for 3 days ahead: X-APPT-01 and X-APPT-02 at once, alert 4.
  2. If the card is in Dial 2, WF-06 stops sending.
  3. 24 hours before: X-APPT-03 (within the window).
  4. 2 hours before: X-APPT-04.
  5. Cancel the appointment: no reminders send.
- Open items: X-APPT-03 is marked business hours, so if 24 hours before falls outside the window it is held. WF-07 says "pause WF-06" while WF-08 says the emails resume from where they paused: build a pause where the platform allows it.

## WF-08 · Phone call moved or cancelled   (folder "03. Phone calls")
- Trigger: Appointment in the phone call calendar rescheduled or cancelled.
- Settings: allow re-entry yes (once per change). Stop on response: no. Send window: X-APPT-06 immediate. Timezone Australia/Brisbane.
- Steps:
  1. If/Else: rescheduled
     - Yes:
       1. Send Email: X-APPT-06 · Phone call or site inspection moved, from brand name, immediate.
       2. Add to Workflow: WF-07 re-queues its reminders against the new time.
  2. If/Else: cancelled
     - Yes:
       1. Internal Notification: alert 5 (Phone call or inspection cancelled) to the assigned user.
       2. Create Task: title "CALL {{contact.first_name}}: phone call cancelled", owner Assigned user, due same day. Text: "They cancelled the phone call they booked. Ring them: a cancelled call is usually a diary clash, and a short call often rebooks it. If the card is in Dial 2, the emails resume from where they paused."
- Tags and fields it sets: none.
- Stops when: sends once per change. The card does not move.
- Test:
  1. Reschedule a booked test call: X-APPT-06 arrives, new reminders queue for the new time.
  2. Cancel a booked test call: alert 5, task due today for the assigned user.
  3. Card stage stays unchanged in both.
- Open items: alert 5 is shared with inspections (WF-18); here it goes to the assigned user, not OWNER.

## WF-09 · Quoting: hand-over to the owner   (folder "04. Quote")
- Trigger: Stage changed to Quoting. Both boards.
- Settings: allow re-entry yes (the stage can be re-entered). Stop on response: no. Send window: no messages sent. Timezone Australia/Brisbane.
- Steps:
  1. Add Tag: `been-contacted`. Remove Tag: `is-nurturing`.
  2. Remove from Workflow: WF-06 and WF-16, if either is running.
  3. Update Contact: assign the card to OWNER. WF-38 then sends alert 14 (Assigned to you) by text and email.
  4. If/Else: residential
     - Yes:
       1. Create Task: title "QUOTE {{contact.first_name}}: write and send the quote", owner OWNER, due 2 business days. Text: "The office has spoken to them and they want a quote. Ring them first if you need more detail, plans or an energy report. Write the quote in the quote tool, with each option as its own line if there is more than one, and send it. Sending it moves the card to Quote Sent and starts the follow-up."
       2. Wait: 2 business days.
     - No (commercial):
       1. Create Task: title "QUOTE {{contact.first_name}}: scope and send the proposal", owner OWNER, due 5 business days. Text: "Ring them for the detail: who decides, roughly how big, what the space is used for, whether it is operating during the works, and the programme. Work out product, thickness, access, plant, staging and WHS, then send the proposal from the quote tool, which moves the card to Quote Sent."
       2. Wait: 5 business days.
  5. If/Else: still in Quoting
     - Yes:
       1. Update Field: list under Quotes to write in the daily summary until it moves.
- Tags and fields it sets: tags `been-contacted` (add), `is-nurturing` (remove).
- Stops when: the quote is sent, or the card moves to Follow-Up, Nurture or Lost.
- Test:
  1. Move a residential test card to Quoting: assigned to OWNER, alert 14 by text and email (via WF-38), QUOTE task due in 2 business days.
  2. Move a commercial test card: proposal task due in 5 business days.
  3. Tags: `been-contacted` on, `is-nurturing` off.
  4. Leave it 2 business days: appears under Quotes to write.
  5. If WF-06 or WF-16 was running: it stops.
- Open items: none.

## WF-10 · Quote sent and the follow-up   (folder "04. Quote", residential board)
- Trigger: The quote is sent from the quote tool, or the card is moved to Quote Sent by hand (Residential board).
- Settings: allow re-entry no. Stop on response: yes (reply, accept or decline, or the card leaves Quote Sent). Send window: R-QUOTE-01 and R-QUOTE-02 immediate; R-FU-01 to R-FU-04 business hours. Days count from the quote being sent. Timezone Australia/Brisbane.
- Steps:
  1. Update Opportunity: move to Quote Sent, if not already there.
  2. Remove from Workflow: WF-06 and WF-16, if either is running.
  3. Update Field: `quote_sent_at` = now. `quote_number`, `quote_link` and the value come from the quote.
  4. Add Tag: `been-contacted`, `been-quoted`. Remove Tag: `is-nurturing`.
  5. Send Email: R-QUOTE-01 · Quote sent, enters Quote Sent, from contact name, immediate (sent as the quote tool email with the view and accept button).
  6. Send SMS: R-QUOTE-02 · Quote sent, enters Quote Sent, immediate.
  7. Create Task: title "CALL {{contact.first_name}}: quote follow up", owner OFFICE, due day 2. Text: "Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence."
  8. Wait: until day 2.
  9. Send SMS: R-FU-01 · Quote unanswered (Day 2), business hours.
  10. Wait: until day 5.
  11. Send Email: R-FU-02 · Quote unanswered (Day 5), from contact name, business hours.
  12. Wait: until day 10.
  13. Send SMS: R-FU-03 · Quote unanswered (Day 10), business hours.
  14. Wait: until day 21.
  15. Send Email: R-FU-04 · Quote unanswered (Day 21, final), from contact name, business hours.
  16. Create Task: title "DECIDE {{contact.first_name}}: accepted, nurture or lost", owner OFFICE, due day 21. Text: "Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting."
- Tags and fields it sets: tags `been-contacted`, `been-quoted`, remove `is-nurturing`; fields `quote_sent_at`, `quote_number`, `quote_link`.
- Stops when: customer replies, accepts or declines, or the card leaves Quote Sent.
- Test:
  1. Send a test quote: stage Quote Sent, R-QUOTE-01 and R-QUOTE-02 at once, `quote_sent_at` stamped.
  2. Day 2: R-FU-01 and the CALL task; day 5 R-FU-02; day 10 R-FU-03; day 21 R-FU-04 and the DECIDE task.
  3. Reply on day 3: later messages do not send.
  4. Accept on day 6: nothing further sends (WF-14 stops it).
  5. Messages due outside 8am-8pm Mon-Sat are held to the next window.
- Open items: the Day 2 CALL task and R-FU-01 both fall on day 2 (as in the data file). R-FU-04 says the card is then moved to Nurture, Lost or Follow-Up, which is done by a person via the DECIDE task.

## WF-11 · Proposal sent and the follow-up   (folder "04. Quote", commercial board)
- Trigger: The proposal is sent from the quote tool, or the card is moved to Quote Sent by hand on the Commercial board.
- Settings: allow re-entry no. Stop on response: yes (reply, accept, or card moves to Follow-Up, Nurture or Lost). Send window: all three emails are business hours (including C-PROP-01). Timezone Australia/Brisbane.
- Steps:
  1. Update Opportunity: move to Quote Sent, if not already there.
  2. Update Field: `quote_sent_at` = now. `quote_number`, `quote_link` and the value come from the proposal.
  3. Add Tag: `been-contacted`, `been-quoted`. Remove Tag: `is-nurturing`.
  4. Send Email: C-PROP-01 · Proposal sent, enters Quote Sent on the Commercial board, from contact name.
  5. Create Task: title "CALL {{contact.first_name}}: confirm receipt", owner ESTIMATOR, due 2 days. Text: "Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it."
  6. Wait: until day 7.
  7. Send Email: C-PROP-02 · Proposal unanswered (Day 7), from contact name.
  8. Create Task: title "CHASE {{contact.first_name}}: decision date", owner OWNER, due day 7, then day 21. Text: "Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity."
  9. Wait: until day 21.
  10. Send Email: C-PROP-03 · Proposal unanswered (Day 21), from contact name.
- Tags and fields it sets: tags `been-contacted`, `been-quoted`, remove `is-nurturing`; fields `quote_sent_at`, `quote_number`, `quote_link`.
- Stops when: customer replies, accepts, or the card moves to Follow-Up, Nurture or Lost.
- Test:
  1. Send a test proposal: Quote Sent, C-PROP-01 received, ESTIMATOR task due in 2 days.
  2. Day 7: C-PROP-02 and the CHASE task for OWNER.
  3. Day 21: C-PROP-03 (the CHASE task is due again).
  4. Reply on day 5: no further sends.
- Open items: (a) the data file has no step removing WF-06 and WF-16 here, unlike WF-10; built as written. (b) the CHASE task is listed once with due "Day 7, then day 21" but only one Create Task step sits at day 7: add a second Create Task at day 21 if the task should repeat. (c) C-PROP-01 has delay "Immediately" but window business-hours in the message record; confirm whether the proposal email should wait for the window.

## WF-12 · Accept or decline button on a quote   (folder "04. Quote")
- Trigger: A quote is accepted or declined online. Both boards.
- Settings: allow re-entry yes, once per button press. Stop on response: no. Send window: no messages sent here. Timezone Australia/Brisbane.
- Steps:
  1. If/Else: accepted
     - Yes:
       1. If/Else: the contact has `is-active-job` (an add-on or variation quote on a job already under way)
          - Yes:
            1. Update Opportunity: value plus the accepted add-on.
            2. Create Task: title "ADD-ON {{contact.first_name}}: accepted, update the job", owner OFFICE, due same day. Text: "An add-on or variation quote on a job already under way has been accepted. Check the value on the card, add it to the invoice schedule, and tell the crew if it changes the work on the day. No thank-you has gone and the card has not moved."
            3. Remove from Workflow: end here. No thank-you, no alert, no stage move.
          - No:
            1. Update Field: `accepted_quote_option` = the option accepted.
            2. Update Opportunity: mark the other options on the job as not chosen, so only one can be accepted.
            3. Update Opportunity: move to Quote Accepted.
  2. If/Else: declined
     - Yes:
       1. Update Opportunity: status = Lost, with the reason asked for (`lost_reason`).
       2. LOST-01 follows from WF-15 (no send here).
- Tags and fields it sets: `accepted_quote_option`, `lost_reason`, opportunity value and status.
- Stops when: once per button press. Phone acceptances and purchase orders are moved by hand and go straight to WF-14.
- Test:
  1. Accept a test quote with two options: `accepted_quote_option` set, other option marked not chosen, card at Quote Accepted, WF-14 fires.
  2. Accept an add-on on a contact with `is-active-job`: value rises, ADD-ON task for OFFICE, no thank-you, no stage move, no alert 8.
  3. Decline a test quote: status Lost, reason recorded, WF-15 runs.
  4. Press accept twice: only one run.
- Open items: "opportunity value" and "status" are platform fields, not custom fields. The decline reason prompt ("the reason asked for") is not specified in the data file.

## WF-13 · Follow-Up: callback requested   (folder "04. Quote")
- Trigger: Stage changed to Follow-Up. Both boards.
- Settings: allow re-entry yes; a new `callback_at` restarts it. Stop on response: no. Send window: no messages sent. Timezone Australia/Brisbane.
- Steps:
  1. Add Tag: `been-contacted`.
  2. Update Field: require `callback_at` on the stage change (the stage form will not close without it).
  3. Remove from Workflow: pause WF-06, WF-10 and WF-11 on the card.
  4. Create Task: title "CALL {{contact.first_name}}: callback as asked", owner OFFICE, due at the time they asked (`callback_at`). Text: "The customer asked to be rung at this time. Ring them, then move the card on: Quoting if they now want a quote, Quote Accepted if they say yes to a quote already sent, Nurture if it is not now, or Lost with a reason. Want more time on a quote? Set a new callback time."
  5. Wait: until 1 day after `callback_at`.
  6. If/Else: still in Follow-Up
     - Yes:
       1. Update Field: list under Callbacks overdue in the daily summary.
- Tags and fields it sets: tag `been-contacted`; field `callback_at` (required).
- Stops when: the stage changes. A new `callback_at` restarts it.
- Test:
  1. Move a test card to Follow-Up without a callback time: the move is refused.
  2. Move with `callback_at` tomorrow 10am: task due then for OFFICE.
  3. If WF-10 or WF-11 was running: it pauses.
  4. Leave it a day past `callback_at`: appears under Callbacks overdue.
  5. Change `callback_at`: workflow restarts with a new task.
- Open items: the pause on WF-06, WF-10 and WF-11 has no stated resume rule in the data file.

---

## Conflicts across the sheets
1. WF-02: wait counts business hours and the text says an 11pm lead starts at 7am; quiet hours say Mon-Fri 7am-6pm and the send window says 8am-8pm Mon-Sat. Confirm one set of hours.
2. WF-02: the 60 minute OWNER text and email has no alert number or template.
3. C-PROP-01 and C-PO-01: delay "Immediately" but window "business-hours" in the messages data (WF-11 uses the data file's value).
4. WF-11: no stop of WF-06 and WF-16, unlike WF-10; the CHASE task's "Day 7, then day 21" has one step only.
5. WF-01: stage tag key not given; the consent "append" mechanism needs a decision.
6. Re-entry settings are in no source; values above are inferred from each Stops line.
