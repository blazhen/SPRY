# Build decisions (15 Oct 2026)

Zen said to stop asking and keep going, so these are the defaults chosen for every conflict found in the documents and by the workflow sheet writers. Each can be changed later; the sheets say "default" where one is used. Items for Glenn are marked GLENN.

| # | Question | Default chosen | Why |
| --- | --- | --- | --- |
| 1 | Customer send window | 8am to 8pm Monday to Saturday, local time. Confirmations send immediately. | The compliance text in the data file says exactly this. The 7am-6pm table is marked placeholder. |
| 2 | Staff timers "business hours" (WF-02 and similar) | Office hours: Monday to Friday 7am to 5pm, from the `office_hours` custom value | It is the only office-hours figure. GLENN to confirm. |
| 3 | Which workflow handles the Yes/No reminder links | WF-22 | The workflow table in the data file names WF-22 for the Yes or No link. The WF-20 mention in the message notes is a typo to fix in the generator. |
| 4 | Does WF-07 (phone call reminders) keep running after acceptance or a reply | Yes, it keeps running | A phone call reminder is harmless after acceptance. WF-14 should stop only the sales sequences (WF-06, 10, 11, 13, 16). Fix the WF-14 wording in the data file. |
| 5 | Alert 3 (customer replied) | Fires on any inbound SMS or email reply, matching WF-34 | Otherwise an emailed reply is missed. |
| 6 | Messages marked "Immediately" in the table but "business hours" in the window column (C-PO-01, JOB-01, JOB-02, C-MOB-01, DEP-01) | Send immediately | The person is waiting for a confirmation. |
| 7 | Re-entry and stop-on-response per workflow | Re-entry off unless the sheet says otherwise. Stop on reply on every sequence that chases. | No source states it. |
| 8 | Pause and resume | The platform has no pause step, so "pause" is Remove from Workflow, and "resume" is a person re-adding the contact | WF-13 and WF-34 resume by hand, as the data file says. |
| 9 | Who sends invoice reminders (platform or Xero) | The platform sends PAY-02, PAY-03 and DEP-03. Turn off the invoice reminders inside Xero. | The journey is designed this way. GLENN to confirm before go-live so a customer never gets both. |
| 10 | Lost reason | Use the platform's own Lost Reason list. Add the custom dropdown only if a workflow cannot read it. | See CRM-BUILD-01-FIELDS.md step 4. |
| 11 | Pipelines | Edit the two existing boards in place | Only 2 test opportunities exist. Keeps the board IDs. |
| 12 | Old-design templates | Delete them (Zen, 15 Oct) | See CRM-BUILD-02-TEMPLATES.md. |
| 13 | Property Type (AI Separator) field | Delete (Zen, 15 Oct) | Not in the journey, purpose unknown. |
| 14 | WF-20 moved booking | Add a second trigger: install date changed | The sheet writer found the trigger covered only a new booking. |
| 15 | WF-22 double No | Add a guard: only alert once per booking date (tag or field check) | Stops two alerts for the same No. |
| 16 | Repeating tasks (Friday update, quarterly check-in) | Use a Wait then loop back to the same step | No recurring task action is assumed. |
| 17 | Draft invoices (WF-24, WF-27) | Use the platform's invoice action with a draft option | To confirm it exists on this sub-account before Phase 6. |
| 18 | Commercial payment terms, progress claim basis, trading hours, Saturday work, review link | Placeholders stay, flagged in each sheet | GLENN. |
