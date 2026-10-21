# SPRY CRM build plan (15 Oct 2026)

Source of truth for what to build: `client-journey-onepage/journey-data.js` (6 Oct 2026 version, after the 2 Oct call) and the four generated documents CRM-PIPELINES, CRM-WORKFLOWS, CRM-TASKS-NOTIFICATIONS, CRM-MESSAGING.
Account: SprayIT Solutions sub-account only. Nothing in this plan has been built yet. Every write waits for Zen's yes.

## Files (all in this folder, all uncommitted)

| File | What it is | Phase |
| --- | --- | --- |
| CRM-BUILD-00-DECISIONS.md | Defaults chosen for every conflict in the documents | 0 |
| CRM-BUILD-01-FIELDS.md | Custom values, fields, lost reasons, tags | 1 |
| CRM-BUILD-04-PIPELINES.md | Stage renames for both boards | 2 |
| CRM-BUILD-05-CALENDARS-PEOPLE.md | Calendars, people, sending domain, links | 3 |
| CRM-BUILD-02-TEMPLATES.md | Email template cleanup, rename, create | 4 |
| CRM-BUILD-03-SMS.md | The 24 SMS templates | 5 |
| crm-build/workflows/WF-A, WF-B, WF-C | Build sheets for all 40 workflows | 6 |
| crm-build/messages/ | Paste-ready HTML for 39 emails, text for 24 SMS, and message-index.md | 4 and 5 |
| crm-build/tools/export-messages.mjs | Regenerates crm-build/messages from journey-data.js | any |

Do them in the phase order (1, 2, 3, 4, 5, 6). Sheet numbers do not match phase order: 04 and 05 come before 02 and 03.

Correction to section 3 and 4 below: the email template tool can only create imports, so it cannot make template shells. All template work is by hand, from the sheets.

## 1. What the tools can and cannot do

| Job | Tool route |
|---|---|
| Read pipelines, fields, templates, contacts, opportunities, conversations | Yes (verified 15 Oct 2026) |
| Create test contacts, add and remove tags | Yes |
| Move an existing opportunity between stages, change its value or status | Yes (cannot create one) |
| Create an empty email template or folder | Yes (the tool has no body field, so the body is pasted by hand; an import-by-URL option is untested) |
| Send a message to a contact | Yes, but only to the test contact and only with Zen's yes |
| Create or edit workflows | No |
| Create or edit pipelines and stages | No |
| Create or edit custom fields, custom values, tags list | No (tags appear when first added to a contact) |
| SMS templates, calendars, trigger links, users, invoices templates | No |
| Read workflows | No (so the old workflows cannot be read; Zen lists them) |

So Dobby cannot build workflows. They are built by hand in the platform screens from the workflow sheets, or later by a Dobby browser helper (planned, not built). What Dobby can do: write exact build sheets, check each finished piece by reading it back, and run the tests.

## 2. Naming (keeping Zen's existing style)

Existing style, read from the templates:
- Template: `ID · Title` (for example `R-QUOTE-01 · Quote sent`).
- Folder: `NN. Group` (for example `03. Quote & Follow-up`).

Kept, with three changes:
1. IDs match the journey exactly, so a template, an SMS, a workflow step and the document all share one ID.
2. Titles say what the customer sees, not the stage mechanics. Use a plain hyphen or a colon, no dashes of any other kind.
3. Workflows use the same pattern: `WF-01 · Website lead intake`, in folders `NN. Group`. SMS templates use the same `ID · Title` as email.

Old design items are moved to a folder `99. Archive (old design)`, not deleted, until Zen says delete.

## 3. What exists against the journey

### Pipelines
Both boards exist, built on the old design.
- Residential, 17 stages: New Enquiry, Dialled, Qualified, Deposit Sent, Assessment Booked, Assessment No Show, Assessment Cancelled, Quoting, Quote Sent, Follow-up, Nurture, Scheduled, In Progress, Invoiced, Paid & Closed, Job Completed, Job Report.
- Commercial & Industrial, 15 stages: New Enquiry, Contacting, Qualified / Scoping, Inspection Booked, Inspection No Show, Inspection Cancelled, Specifying, Proposal Submitted, Commercial Review, Awaiting PO, Future Project, Mobilising, In Progress, Invoicing, Paid & Closed.
- Journey wants 14 identical stages on both: New Lead, Dial 1, Dial 2, Quoting, Quote Sent, Follow-Up, Nurture, Quote Accepted, Inspection Required, Booking Required, Job Booked, Deposit Requested, Job Completed, Retention Claim.
- Only 2 test opportunities exist, so the boards can be edited in place (keeps their IDs) with no real data at risk.

### Custom fields
20 exist. About 70 are needed. Names differ, so most are renamed or added.
- Opportunity fields that match or nearly match: site_address, sqm_estimate, quote_number, po_number, invoice_number, deposit_amount, job_end_date, crew_assigned.
- Live but named differently: Assessment Date (journey: inspection_date), Job Start Date (job_date), Quote URL (quote_link), Invoice URL, Claim Stage, Payment Terms.
- Contact fields that match: building_stage, areas (live: Areas to insulate), property_type, timeframe, contact_message, plus the AI separator field.
- Missing: all consent fields, all attribution fields, lost_reason, vehicles_booked, job_confirmed, retention fields, most date fields, contact_attempts, ask_for_google_review, and the rest of the list in CRM-PIPELINES section 10 and CRM-MESSAGING section 3.

### Email templates (45 exist, 39 needed)
- 27 share an ID with the journey. They were last edited 14 Sep, before the 2 Oct call, so every body must be re-checked against the 6 Oct text. Matching ID does not mean current.
- 12 journey emails are missing: DIAL-02, DIAL-03, DIAL-04, X-APPT-01, NUR-04, X-ACC-01, REM-01, REM-03, REM-06, DEP-02, RPT-01, RET-01.
- 18 old-design templates are not in the journey: X-CHASE-02, X-CHASE-04, X-BOOK-02, X-WON-01, the nine AR/AC appointment ones (booked, cancelled, no-show, three each), C-INSP-02, C-INSP-03, C-SPEC-01, R-ASSESS-04, R-ASSESS-06.
- Folders now: 01 Enquiry & Chase, 02 Appointments (3 subfolders), 03 Quote & Follow-up, 04 Won & Delivery, 05 After Job & Nurture, 06 Commercial, plus 11 loose templates outside any folder.
- SMS templates: cannot be read with the tools. Zen to confirm what exists.

### Contacts, opportunities, conversations
4 contacts (two website-chat visitors, two test contacts) and 2 test opportunities. No real customers.

### Workflows
Cannot be read. One is live: on 2 Oct a new enquiry triggered an automated SMS that started "Hi Brangjolica,  here." The business name is blank, so a custom value is empty or wrong. Zen to list the existing workflows and folders.

## 4. Build order

Each phase ends with a read-back check by Dobby and a Zen sign-off. No phase turns on sending.

**Phase 0: decisions (before building)**. Fix the document conflicts and settle the open questions in section 6. About 1 hour of Zen's time.

**Phase 1: foundations (by hand)**
1. Custom values: the 24 in CRM-MESSAGING section 2. Fix the blank business name first.
2. Contact custom fields, then opportunity custom fields, with exact keys from the documents. Rename the near matches instead of deleting them, so nothing is lost.
3. Tags: they appear when first used. The full list is in CRM-WORKFLOWS (stage tags, been-, is-, do-not-).
4. Check: Dobby reads fields back and compares to the data file.

**Phase 2: pipelines (by hand)**
1. Edit Residential in place. Rename New Enquiry to New Lead, Dialled to Dial 1, Quoting stays, Quote Sent stays, Follow-up to Follow-Up, Nurture stays, Scheduled to Job Booked, Invoiced to Deposit Requested only if Zen agrees, otherwise add new. Add Dial 2, Quote Accepted, Inspection Required, Booking Required, Retention Claim. Delete the stages the journey drops after moving the 2 test opportunities.
2. Do the same for Commercial so both match.
3. Set win probability on each stage from the journey if given, otherwise leave blank.
4. Check: Dobby reads both boards and compares names, order and count (14 each).

**Phase 3: calendars and people (by hand)**. Phone call calendar, inspection calendar, four install calendars (InjectaCore rig, van, Fuso truck, Mercedes rig), Apple calendar sync, users Glenn (OWNER, ESTIMATOR) and Rachael (OFFICE), numbers and sender emails. SPF and DKIM for the sending domain. Needs Glenn.

**Phase 4: email templates (about 39)**
1. Create the new folder structure (Dobby can do this through the tool) and the archive folder. Proposed: 01 Enquiry & Chase, 02 Appointments & Reminders, 03 Quote & Follow-up, 04 Won & Delivery, 05 Payments, 06 After Job & Nurture, 07 Commercial, 08 System, 99 Archive (old design).
2. Move old-design templates into the archive (by hand, since there is no move tool).
3. For each journey email: re-check the existing body against CRM-MESSAGING, rewrite or create. The body HTML is generated from the data file so it matches the document exactly, then pasted in by hand (or imported, if the import route tests well).
4. Check: Dobby lists templates and ticks off all 39 IDs.

**Phase 5: SMS templates (24)**. Same pattern, by hand. Each ends with the sign-off custom value. Includes the saved crew message JOB-06.

**Phase 6: workflows (40), in waves, all saved as draft**
- Wave A, lead handling: WF-01 intake, WF-02 timer, WF-03 missed call, WF-04 out of hours, WF-05 Dial 1, WF-06 Dial 2, WF-07 and WF-08 phone call booking, WF-34 customer replied, WF-35 STOP.
- Wave B, quoting: WF-09 to WF-16.
- Wave C, accepted and booked: WF-14, WF-17 to WF-19.
- Wave D, the job: WF-20 to WF-23.
- Wave E, money: WF-24 to WF-29, WF-32, WF-33.
- Wave F, after the job: WF-30, WF-31, WF-37.
- Wave G, monitors and reports: WF-36, WF-38 to WF-40.
- Each workflow gets a build sheet generated from the data file: trigger, steps in order, branches, exit conditions, the template IDs to use, the tasks and alerts. Build one wave, test it, then the next.
- Tasks and the 14 alerts are workflow actions, so they are built inside these waves.
- Check: Dobby cannot read workflows, so each is checked by a test run (section 5) and by Zen confirming it on screen.

**Phase 7: reports and go-live checks**. Dashboard and saved list view, the weekly submissions check, the double-text rule, the Xero GST test, quiet hours, final switch on.

## 5. Testing

- Use one test contact with Zen's own phone and email. No real customer, ever, until go-live.
- Each wave: turn on only that wave, create a test enquiry, move the test opportunity through the stages (Dobby can move it through the tool), and watch the tasks, alerts and messages that arrive.
- Specific checks: stop on reply, the send window, STOP handling, the Yes/No links, the draft invoice rule (nothing sent without Glenn), duplicate protection (the account blocks duplicate contacts by email and phone, so test contacts need unique details), the owner never gets two texts for one event.
- Dobby reads conversations after each run to confirm exactly what was sent and when.
- Not testable here: GST invoices reaching Xero, SPF and DKIM until the domain is set up.

## 6. Open questions for Zen
1. Which send window is right: tasks document (Mon-Fri 7am-6pm, Sat 8am-2pm) or messaging document (8am-8pm Mon-Sat)?
2. The Yes/No reminder links: WF-20 or WF-22? (Documents disagree.)
3. WF-14 versus WF-34: do the booking reminders (WF-07) keep running after acceptance or a customer reply?
4. Edit the existing pipelines in place (recommended) or create new ones?
5. What workflows and SMS templates already exist? Please list names and folders.
6. Who builds the screens: Zen by hand, a helper, or wait for the Dobby browser helper?
7. Open items from Glenn: trading hours and Saturday work, commercial payment terms, who sends invoice reminders (platform or Xero), the Google review link, whether to keep REM-06 and JOB-04.
8. OK to archive the 18 old-design templates instead of deleting?

## 7. Rough time

| Phase | Hands-on time |
|---|---|
| 0 Decisions | 1 h |
| 1 Fields, values, tags | 4 to 6 h |
| 2 Pipelines | 1 to 2 h |
| 3 Calendars and people | 2 to 3 h |
| 4 Email templates (39) | 8 to 10 h |
| 5 SMS templates (24) | 3 to 4 h |
| 6 Workflows (40) | 25 to 35 h |
| 7 Reports and go-live | 3 to 4 h |
| Testing across waves | 6 to 8 h |

About 55 to 70 hours in total, spread over several weeks. Most of it is workflow building, which only the platform screens can do today.
