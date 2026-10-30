# Quote Hub: workflows for everything the API cannot do (SprayIT Solutions - Dev)

Plan only, written 30 Oct 2026. Nothing is built. Sources: api/TEST-REPORT.md (tests on the Dev account), HUB-DESIGN.md, HUB-WORKFLOW-CHANGES.md, WF-A/B/C, message-index.md. Dev account only (location 5M1zrDbimF17cM16mtmR). Build by hand or with the platform's Ask AI, one workflow at a time, in draft.

Words: "signal" = what the Hub writes through the API so a workflow starts. Write order for every signal: fields first, then tag, then stage move (as in HUB-WORKFLOW-CHANGES.md).
Marked NEW = does not exist yet. GUESS = a platform feature not confirmed; each has a fallback.

## 0. The one assumption everything rests on (read first)

Every route below assumes that a tag or stage change made through the API starts a workflow, the same as one made on screen. The tests proved the API can make those changes (TEST-REPORT sections A and C). They did not prove a workflow fires. Section 4 is the test. Build and run it before anything else.

## 1. What the Hub needs that the API cannot do

Names already in Dev: fields quote_revision, quote_valid_until, quote_accepted_at; tags hub-addon-accepted, hub-quote-revised, hub-quote-expired, in-quote-queue.

| # | Need | Why the API cannot (finding) | Workflow | Signal from the Hub | What the workflow does | Existing or new |
|---|---|---|---|---|---|---|
| 1 | Send the quote to the customer (email R-QUOTE-01, text R-QUOTE-02, follow-up) | Conversation sends were not tested on purpose (E: "POST /conversations/messages NOT TESTED, would send a real SMS or email") | WF-10 residential, WF-11 commercial | Fields quote_number, quote_link, quote_sent_at, quote_revision, quote_valid_until, value, then stage Quote Sent | Ends at once if quote_revision is above 1; sends email and text; follow-up on days 2, 5, 10, 21; stops on reply or when the card leaves Quote Sent | Existing, changed |
| 2 | Revised quote (Rev 2 and later) | Same as row 1 | WF-41 | Fields, then tag hub-quote-revised | Stops WF-10/11/42, sends R-QUOTE-03 and R-QUOTE-04, restarts follow-up, removes the tag | Existing, new in plan |
| 3 | Quote accepted online | Sends not tested (welcome email and text); no webhooks (H, answer 5) | WF-14 | Fields accepted_quote_option and quote_accepted_at, then stage Quote Accepted | Add-on guard, welcome email and text, tags, tasks, alert 8 | Existing, changed |
| 4 | Phone or PO acceptance (stamp button) | Same as row 3 | WF-14 | Hub stamp sets accepted_quote_option, quote_accepted_at (and Po Number if given), then moves to Quote Accepted | Same as row 3; commercial waits for PO as built | Existing (no change) |
| 5 | Add-on accepted on a live job | No task on a job itself (C: notes and tasks 404 on opportunities) | WF-12 | Value updated, then tag hub-addon-accepted | Task for Rachael, remove tag, no message | Existing, changed |
| 6 | Decline | Same as row 3 | WF-15 | Status Lost with lost reason | LOG task, stop list, LOST-01 goodbye next morning | Existing |
| 7 | Quote expiring and expired | No timers or scheduling in the API; Hub has its own expired state only inside its page | WF-42 | Stage Quote Sent plus quote_valid_until | Task 7 days before; at expiry tag hub-quote-expired and a task; nothing to the customer | Existing, new in plan |
| 8 | Task assignment text to the owner | A task or owner change through the API does not message anyone as far as we know (untested) | WF-38 (alert 14) | Owner changed on the job | Texts and emails the new owner | Existing; add to the section 4 test |
| 9 | Cards waiting on the owner (To do list filter) | No saved filter on stage plus owner plus age beyond what the Hub computes; the tag keeps it cheap | WF-44 | Stage or status change | Adds or removes in-quote-queue | Existing, new in plan |
| 10 | NEW: Stamp "invoice paid" (deposit or final) | Record-payment and send-invoice were NOT TESTED (G); paid state belongs to the platform invoice | WF-45 NEW | NEW tags hub-deposit-paid and hub-final-paid, set on the contact | Runs the same steps as WF-26 (deposit) or WF-29 (final) so reminders stop and the card closes. See 1a | NEW |
| 11 | NEW: Stamp "job report sent" | None. The API can write a field. A workflow is not needed | none | Hub sets job_report_sent_at and completes the contact task titled SEND (task complete works, A) | none | Not a gap |
| 12 | NEW: Log a call | None. Note on the contact works (A) | none | Hub writes a note starting with the job name | none | Not a gap |
| 13 | NEW: Quote opened by the customer | No webhooks (H, answer 5); the Hub sees the open on its own customer page, the platform does not | WF-46 NEW | NEW tag hub-quote-viewed | Notifies the owner once, creates a call task for the office, removes the tag. See 1b | NEW |
| 14 | NEW: Quote to an extra contact on the job | Sends untested; message by ID returns 401 (E) | WF-47 NEW | On the extra contact: field hub_quote_link (NEW, contact text field), then NEW tag hub-send-quote-extra | Sends R-QUOTE-01 style email to that contact, removes the tag. No follow-up (question 2) | NEW |
| 15 | NEW: Site visit booked from the Hub | Appointments can be created with toNotify false (F), so no confirmation or reminder goes out | WF-17 and WF-20 if they fire on an API appointment; else WF-48 NEW | Appointment created, plus NEW tag hub-visit-booked as the backup signal | Sends X-INSP-01 text, reminder 24 hours and 2 hours before (X-APPT-03/04 style), removes the tag | Existing, else NEW |
| 16 | NEW: Follow-up date and the reminder on the day | The API can set a date and make a task (A) but cannot schedule a text or an alert for that day | WF-49 NEW | NEW opportunity date field hub_follow_up_on, then NEW tag hub-followup-set | Waits until the date at 8am; if the card is still open, makes a task and texts the owner; removes the tag. See 1c | NEW |
| 17 | Deposit and final invoice | Draft create works, send untested (G) | WF-24, WF-25, WF-27, WF-28 | Hub never sends an invoice. It opens the invoice in the platform app. Optional field deposit_amount, job_date | WF-24 and WF-27 already make the drafts and tasks; WF-25 and WF-28 start when the owner sends | Existing, no change |
| 18 | Time in each stage, history | No history list; only lastStageChangeAt, lastStatusChangeAt, createdAt, updatedAt (answer 1) | WF-50 NEW | Any stage change | Adds one line to a log field. See 3 | NEW |

### 1a. WF-45 · Hub stamp: invoice paid (NEW, folder "08. Deposit" or "09. Completion and payment")
- Trigger: contact tag added hub-deposit-paid, second trigger hub-final-paid. Re-entry allowed.
- Steps in order: (1) If tag hub-deposit-paid: set deposit_received_at to now, remove is-deposit-owing, send DEP-01 text, alert 9, remove the contact from WF-25. (2) If tag hub-final-paid: set final_invoice_paid_at to now, remove the contact from WF-28, then the same steps as WF-29 from step 2 (SEND job report task, C-CLOSE-01 for commercial, retention branch, been-customer). (3) Remove both tags.
- Stops: ends if the contact has neither tag. Does not touch the platform invoice itself (that stays a manual mark in the platform app, see open question 1).
- Cleaner design: build WF-26 and WF-29 with a second trigger (these tags) instead of a copy. Recommended. Then WF-45 is not needed and only the two tags are new.

### 1b. WF-46 · Hub: quote opened (NEW, folder "04. Quote")
- Trigger: contact tag added hub-quote-viewed. Re-entry allowed.
- Steps: (1) If the stage is not Quote Sent, remove tag and end. (2) If the tag opp-viewed-alerted is on the contact, remove hub-quote-viewed and end (once per quote). (3) Internal notification to Glenn by in-app only: "{{opportunity.name}}: customer opened the quote". (4) Create task for Rachael: "CALL {{opportunity.name}} ({{contact.first_name}}): opened your quote", due in 1 hour. (5) Add tag opp-viewed-alerted (NEW), remove hub-quote-viewed. WF-41 removes opp-viewed-alerted for a new revision (add one step).
- Sends nothing to the customer.

### 1c. WF-49 · Hub follow-up date reminder (NEW, folder "11. Always on")
- Trigger: contact tag added hub-followup-set. Re-entry allowed, restart on re-entry (GUESS; fallback: the date check in step 3 makes old runs harmless).
- Steps: (1) Wait until the date in hub_follow_up_on at 8am (GUESS; fallback: Hub also writes hub_follow_up_days as a number, wait that many days). (2) Remove hub-followup-set. (3) If the date in hub_follow_up_on is still today or earlier and the job status is Open: create task "FOLLOW UP {{opportunity.name}} ({{contact.first_name}})" for the card owner, due today; internal notification to the owner by text. Otherwise end.
- Stops: card Lost or Won, or the date moved later.

## 2. Sending: every send the Hub wants, and its route

Texts, emails, invoices and estimates were not tested on purpose. The Hub does not send. A workflow does, or the owner does it in the platform app.

| Send | Route | Notes |
|---|---|---|
| Quote email R-QUOTE-01 and text R-QUOTE-02 (main contact) | WF-10 / WF-11 on stage Quote Sent | Template exists |
| Revised quote email R-QUOTE-03 and text R-QUOTE-04 | WF-41 on tag hub-quote-revised | Templates to create first |
| Quote follow-ups (R-FU-02, R-FU-04, C-PROP-02/03, texts) | Inside WF-10, WF-11, WF-41 | Stop on reply is on |
| Quote accepted email X-ACC-01 and text; commercial C-PO-01 | WF-14 | |
| Add-on accepted | Task only, no customer message | WF-12 |
| Decline goodbye LOST-01 | WF-15 | |
| Quote to extra contacts on the job | WF-47 NEW | No follow-up for them unless Zen says so |
| Quote opened | No customer message. Owner alert only | WF-46 NEW |
| Expiry nudge to the customer | None built. WF-42 tells the office only | Open question 5 |
| Visit confirmation and reminders | WF-17, WF-20, WF-21 or WF-48 NEW | Appointment made with toNotify false, so nothing double-sends |
| Deposit invoice and final invoice | Owner presses Send in the platform app; WF-25 and WF-28 follow | Hub links to the invoice. The API could create a draft (works) but a send was not tested |
| Estimate | Not used by the Hub (the quote lives in the Hub) | Stay unused |
| Follow-up date reminder | WF-49 NEW, to the owner only | |
| Task assigned text to the owner | WF-38 alert 14 | Must be tested for an API change |

## 3. Things only a workflow or the platform app can do

- Webhooks (events into the Hub): no subscription endpoint for our token (4 probes 404). Set them up in the platform app, or have the Hub poll. Event names in api/README.md (for example OpportunityStageUpdate, InvoicePaid) are from the docs and unchecked. If a webhook can be added in the app, the Hub could learn of staff stage moves and paid invoices without polling. Zen to check in the Dev app: Settings, then Integrations or webhooks (GUESS where).
- Webhook out of a workflow (a "send to a web address" step, GUESS name): would let a workflow tell the Hub "invoice paid" or "customer replied". Test in section 4 as the second check.
- Quote opened tracking: only the Hub's customer page knows. Signal in = tag hub-quote-viewed (row 13).
- Time in current stage: computed from lastStageChangeAt by the Hub, no workflow needed. Time in past stages: not in the API. WF-50 NEW writes a line to a log each time the stage changes.
  - WF-50 · Stage log (NEW, folder "12. Reporting"). Trigger: stage changed, any stage, both pipelines (same GUESS and fallback as WF-44). Steps: update the NEW opportunity text field stage_log by appending "date time: stage name" (GUESS that append exists; fallback: set NEW fields prev_stage and prev_stage_at to the value being left, which keeps one step of history). Sends nothing.
- Reminders (visit, deposit due, follow-up date, expiry): all need a workflow wait step. The API has no scheduler.
- Invoice paid mark: record-payment is untested (it takes money). Marking paid stays in the platform app, or the stamp tags in row 10.
- Workflow editing: create and edit are still off (403 not enabled). All of the above is built by hand or with the platform's AI builder.

## 4. First workflow to build and test: a throwaway signal test

Build "ZZ-TEST signal" (not WF-numbered, delete afterwards) in Dev, in draft, then publish only this one test workflow in Dev. Two copies so you can see which trigger fired:
- ZZ-TEST A. Trigger: contact tag added zz-signal. Actions: add tag zz-fired-a; create a task "ZZ fired A" for test 1.
- ZZ-TEST B. Trigger: pipeline stage changed (any stage), Residential. Actions: add tag zz-fired-b; create a task "ZZ fired B" for test 1.
- ZZ-TEST C (only if the app offers it). Trigger: opportunity custom field updated, field quote_revision. Action: add tag zz-fired-c.
No message step in any of them.

Test, using a made-up contact "ZZ Signal" and job "ZZ test job" (made-up details, email at example.com):
1. By hand in the app: add tag zz-signal; move the card one stage. Expect: tags zz-fired-a and zz-fired-b and the tasks appear within about a minute; the workflow execution log shows both. This proves the workflows themselves work. If this fails, fix the build first.
2. By the API script (the same calls the Hub makes: POST /contacts/{id}/tags with zz-signal, then PUT /opportunities/{id} with a new stageId, then PUT with quote_revision changed): remove the zz-fired tags and tasks first, then run. Wait 2 minutes.
3. Read back the tags with the API and look at the execution logs.
4. Also check three more API changes (rows 8 and 15 of section 1): owner change through the API (does alert 14 / WF-38 fire), appointment created through the API with toNotify false (does WF-17 fire), and a task created through the API (does any task notification fire).
Expected if all is well: A, B (and C) fire for API changes exactly as for by-hand changes, one run each, not two.
Record per signal: fired yes/no, delay in seconds, any double run.

If a signal does NOT fire:
- Tag does not fire: the Hub cannot start workflows by tag. Fallbacks, best first: (a) a workflow trigger that listens for an inbound web request (GUESS: "Inbound Webhook" trigger; the Hub posts to the address the app gives); (b) a form submission through the API (forms exist, H) feeding a "form submitted" trigger (GUESS that API-made submissions trigger); (c) a custom field change if C fires; (d) the Hub shows a "Press to start" button the owner presses on screen (a manual action), and every tag-based row above becomes a task for the office.
- Stage change does not fire: WF-09, WF-10, WF-11, WF-14, WF-44 would not run from the Hub's Send and Accept either. Use a tag as the start signal for those too (add tags hub-quote-sent and hub-quote-accepted, NEW) and change their triggers.
- Nothing fires: the Hub can only write data. Every message becomes a task for a person, or the Hub sends via the conversation API, which then needs its own careful test on a made-up contact with the Dev account not sending real messages.

## 5. Open questions for Zen (recommended answers)

1. Who marks an invoice paid: the owner in the platform app, or the Hub's stamp? Recommended: the app stays the truth for the invoice; the Hub stamp only sets the tag so cards and reminders catch up. Check first whether record-payment can be tested safely on a draft in Dev.
2. Do extra contacts on a job get only the first quote email (WF-47), or follow-ups too? Recommended: first email only, as in HUB-WORKFLOW-CHANGES question 2.
3. Webhooks: can you add one in the Dev app and point it at a test address? Recommended: yes, try once. If it works, the Hub stops polling and learns of staff stage moves and payments.
4. Should "quote opened" alert the owner by text or in-app only? Recommended: in-app plus a task for Rachael, no text (it will fire often).
5. Should the customer get an expiry nudge 3 days before the quote ends? Recommended: no for now; the office phones (WF-42 task).
6. Is the follow-up date reminder wanted as a text to Glenn, or is the task in the Hub To do list enough? Recommended: task plus one text at 8am on the day.
7. Stage log (WF-50): worth building now? Recommended: build it after the signal test, because stage history cannot be rebuilt later.
8. Fold the invoice stamps into WF-26 and WF-29 as extra triggers (recommended) or build a separate WF-45? Recommended: extra triggers, fewer workflows to keep the same.

## Summary

New workflows proposed: 6 (WF-45 invoice stamp, WF-46 quote opened, WF-47 extra contact quote, WF-48 Hub visit booked, WF-49 follow-up reminder, WF-50 stage log), plus one throwaway test set. WF-45 can be folded into WF-26 and WF-29. WF-43 stays unused. Existing workflows to extend with a new trigger or step: WF-26, WF-29 (stamp tags), WF-41 (clear opp-viewed-alerted). Build order: the section 4 test, then WF-12 (tag trigger), WF-44, WF-09, WF-10, WF-14, WF-41, WF-42, then the NEW ones.
