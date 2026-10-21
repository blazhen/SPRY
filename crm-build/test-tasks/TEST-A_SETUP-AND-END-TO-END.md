# Setup, checks, activation and end-to-end tasks

Read TEST-00-README.md first. Account: "SprayIT Solutions - Dev" only. Customer messages in Dev go only to the tester's own phone and email. Test contacts are named "TEST ...".

Task shape: heading, Phase, Priority, Depends on, Time, Why, Steps (numbered), Expected result, Evidence, If it fails.

---

# PHASE 0: SAFETY AND ACCESS

### T-00 · Confirm you are in the Dev account and set up safely
- Phase: 0. Priority: Urgent. Depends on: nothing. Time: 15 min.
- Why: everything after this must happen in Dev only.
1. Log in to the platform. In the top left, open the account switcher. Confirm the account name is "SprayIT Solutions - Dev". If you see only "SprayIT Solutions" (without Dev), that is the live client account: do not open it.
2. Check the address in the browser. The account ID in it must be 5M1zrDbimF17cM16mtmR. Write the first 6 characters (5M1zrD) at the top of your notes as a reminder.
3. Open Settings, then Business Profile. Note the company name, phone and email shown. Do not change them.
4. Open Contacts. Confirm there are no real customers (Dev started blank). If you see real-looking names, stop and tell Zen.
5. Open Settings, then Phone Numbers and Email Services. Write down which sending number and sending email Dev uses. Do not buy or change anything. If there is no sending number, note it: SMS tests will then be blocked (see T-16).
- Expected result: you are in Dev, account ID matches, no real customers.
- Evidence: a screenshot of the account switcher and the address bar.
- If it fails: stop, comment, set to Blocked.

### T-01 · Create the two test contacts
- Phase: 0. Priority: High. Depends on: T-00. Time: 15 min.
- Why: every workflow test needs a contact that only you can receive messages as. The account blocks duplicate contacts with the same email or phone, so the two contacts need different details.
1. Open Contacts, then Add Contact.
2. Contact 1 (residential): First name TEST, Last name Residential, email your own address with a plus tag (for example yourname+res@yourdomain.com), phone your own mobile in the form +61... , Source "Test". Add the tag "from-website".
3. Contact 2 (commercial): First name TEST, Last name Commercial, email yourname+com@yourdomain.com. Leave the phone empty for now (the same phone cannot be used twice). For SMS tests on the commercial side, move your phone number from Contact 1 to Contact 2 for that test only, then move it back.
4. On both contacts, set Marketing Consent to "yes" where the test needs marketing emails, and "no" for the unsubscribe tests. Note the starting values.
5. Write the contact names and what each is used for in your notes.
- Expected result: two contacts exist, clearly marked TEST, with your own details only.
- Evidence: a screenshot of the two contacts in the list.

### T-02 · Users and roles
- Phase: 0. Priority: High. Depends on: T-00. Time: 20 min.
- Why: workflows assign tasks and send alerts to roles: OWNER (Glenn Angus), OFFICE (Rachael Angus), ESTIMATOR (Glenn), CREW_LEAD (set per job). Dev has no users yet. Real staff must not receive test alerts.
1. Do NOT create user accounts yourself or invite Glenn or Rachael. Creating users needs Zen's approval.
2. Ask Zen (comment on this task) to confirm which test users exist for Dev. The plan is: your own user stands in for OWNER, OFFICE, ESTIMATOR and CREW_LEAD, so every alert and task reaches only you.
3. Once Zen confirms, open Settings, then My Staff, and check the users listed. Write the user name for each role in your notes.
4. Check the user has your own mobile number and email in their profile, so SMS alerts reach you.
- Expected result: a written list "OWNER = ..., OFFICE = ..., ESTIMATOR = ..., CREW_LEAD = ..." that all point to you or test users Zen approved.
- Evidence: a screenshot of the staff list, with the role list in a comment.

---

# PHASE 1: CHECK THE FOUNDATIONS (built by script, read back OK on 17 Oct 2026)

### T-03 · Check the 30 custom values and the Calendar Links folder
- Phase: 1. Priority: High. Depends on: T-00. Time: 25 min.
1. Open Settings, then Custom Values. Confirm 30 values exist (24 business values, 6 calendar link values).
2. Confirm these 24 exist with these values: Business Name = SprayIT Solutions; Business Short Name = SprayIT; Business Phone = 1300 177 729; Business Phone E164 = +611300177729; Contact Name = Rachael Angus; Contact First Name = Rachael; Contact Mobile = 0428 26 36 26; Contact Mobile E164 = +61428263626; Business Email = info@sprayitsolutions.com.au; From Name Contact = Rachael at SprayIT Solutions; From Name Brand = SprayIT Solutions; Website Url = sprayitsolutions.com.au; Booking Url = sprayitsolutions.com.au/book/; Quote Form Url = sprayitsolutions.com.au/contact-us/; Privacy Url = sprayitsolutions.com.au/privacy-policy/; Review Url = placeholder; Service Area = Australia-wide; Trade Noun = spray foam insulation; Trade Verb = insulation; Inspection Noun = site inspection; Consult Length = 15 minute; Office Hours = Mon to Fri, 7am to 5pm; Quote Turnaround = 2 business days; Sms Signoff = Rachael, SprayIT Solutions.
3. Confirm a folder named "Calendar Links" exists with 6 values inside: Calendar Link Phone Call, Calendar Link Site Inspection, Calendar Link Install InjectaCore Rig, Calendar Link Install Van, Calendar Link Install Fuso Truck, Calendar Link Install Mercedes Rig. Open each link in a private browser window: each must open a booking page.
4. Check each value's merge tag by hovering or opening it: it should read like {{ custom_values.business_name }} (lower case, underscores).
- Expected result: all 30 present, values match, the folder exists, six links open.
- Evidence: screenshots of the list and the folder.
- If it fails: fix a wrong value by hand and note it. If the folder is missing, create "Calendar Links" and move the six values in.

### T-04 · Check the contact custom fields
- Phase: 1. Priority: High. Depends on: T-00. Time: 25 min.
1. Open Settings, then Custom Fields, and filter to Contact.
2. Confirm these exist, with the stated type. Dropdowns must show every option exactly: Property Type (dropdown: Home, New build, Shed or garage, Factory or warehouse, Farm or agricultural, Something else); Building Stage (dropdown: Existing building (retrofit), Under construction, Still planning); Areas (text); Timeframe (dropdown: As soon as possible, Next 1 to 3 months, 3 months or more, Just researching); Heard From (dropdown: Google search, Google ad, Referral from a friend, builder or tradie, Facebook, Instagram or LinkedIn, Somewhere else); Postcode, Street, Suburb (text); Enquiry Message (large text); Phone Raw, Company (text); Consent Marketing (dropdown: yes, no); Consent Text (large text); Consent At (date); Consent Page (text); Utm Source, Utm Medium, Utm Campaign, Utm Term, Utm Content, Utm Id, Gclid, Gbraid, Wbraid, Fbclid, Msclkid, Ttclid (text); First Touch At (date); First Touch Referrer, First Touch Landing, Last Touch Referrer, Last Touch Landing, Source, Form Name, Submitted At, Page Title (text); Contact Attempts (number); Last Attempt At (date); Preferred Contact (dropdown: call, sms, email); Do Not Sms (checkbox); Ask For Google Review (dropdown: Yes, No).
3. Gclid and Source are platform built-in fields, so they exist already. Confirm they show.
4. Check each field's merge tag is lower case with underscores, like {{contact.property_type}}.
5. Make a note of any field missing or with the wrong type or options.
- Expected result: all fields present as listed, 69 custom plus the built-in ones.
- Evidence: screenshots of the field list (scroll through all of it).
- If it fails: fix by hand (create the field with the exact name so its key matches) and note it.

### T-05 · Check the opportunity custom fields
- Phase: 1. Priority: High. Depends on: T-00. Time: 20 min.
1. Open Settings, then Custom Fields, and filter to Opportunity.
2. Confirm these exist: Site Address (text); Access Notes (large text); Sqm Estimate (number); Product Type (dropdown: Open cell, Closed cell, Both); Callback At (date); Quote Number (text); Quote Link (text); Quote Sent At (date); Accepted Quote Option (text); Po Number (text); Foam Order Type (dropdown: Stock open cell, Special order); Deposit Amount (monetary); Inspection Date (date); Job Date (date); Job End Date (date); Vehicles Booked (multi select: InjectaCore rig, Van, Fuso truck, Mercedes rig); Job Booked At (date); Crew Assigned (text); Job Confirmed (dropdown: Yes, No); Deposit Due Date, Deposit Invoice Sent At, Deposit Received At (date); Variation Amount (monetary); Photos Captured (checkbox); Invoice Number (text); Invoice Sent At, Final Invoice Paid At, Job Report Sent At (date); Retention Amount (monetary); Retention Release Date (date).
3. Lost Reason is a built-in platform field: open an opportunity, set it to Lost, and confirm the Lost Reason list offers these 12 reasons: Price, Went with another contractor, Chose batts or another product, Timing project deferred, Outside service area, Not suitable for spray foam, Unreachable, Not the decision maker, Budget withdrawn, Cancelled after acceptance, Duplicate, Spam. If the list is empty, add the 12 in Settings, Opportunities, Lost Reasons, then set the opportunity back to Open.
- Expected result: 30 custom opportunity fields plus a working Lost Reason list of 12.
- Evidence: screenshots.

### T-06 · Check the 52 tags
- Phase: 1. Priority: Medium. Depends on: T-00. Time: 15 min.
1. Open Settings, then Tags. Confirm 52 tags exist: from-website, from-phone, from-chat; stage-res-<key> and stage-com-<key> for the 14 stage keys (new-lead, dial-1, dial-2, quoting, quote-sent, follow-up, nurture, quote-accepted, inspection-required, booking-required, job-booked, deposit-requested, job-completed, retention-claim); been-enquired, been-contacted, been-quoted, been-accepted, been-inspected, been-booked, been-lost, been-customer, been-review-asked, been-reviewed; is-active-job, is-deposit-owing, is-retention-held, is-stalled, is-unresponsive, is-nurturing, is-no-marketing, is-complaint; do-not-sms, do-not-email, do-not-market.
2. Note any missing or misspelt tag. Fix by hand.
- Expected result: 52 tags, spelled exactly.
- Evidence: a screenshot of the tag list.

### T-07 · Check both pipelines
- Phase: 1. Priority: High. Depends on: T-00. Time: 15 min.
1. Open Opportunities, then Pipelines. Confirm two pipelines: "Residential" and "Commercial & Industrial".
2. Each must have exactly these 14 stages, in this order: New Lead, Dial 1, Dial 2, Quoting, Quote Sent, Follow-Up, Nurture, Quote Accepted, Inspection Required, Booking Required, Job Booked, Deposit Requested, Job Completed, Retention Claim.
3. Confirm there is no Won or Lost stage (status carries that). Confirm "Show in funnel" is on for all stages.
- Expected result: two pipelines, 14 stages each, in order.
- Evidence: a screenshot of each pipeline.

### T-08 · Check the 6 calendars exist
- Phase: 1. Priority: Medium. Depends on: T-00. Time: 10 min.
1. Open Calendars, then Calendar Settings. Confirm these six exist and are active: Phone call; Site inspection; Install: InjectaCore rig; Install: Van; Install: Fuso truck; Install: Mercedes rig.
2. They are only shells. Their hours, team members and forms are done in T-12.
- Expected result: six calendars listed.
- Evidence: a screenshot.

### T-09 · Check the 39 email templates
- Phase: 1. Priority: High. Depends on: T-03, T-04. Time: 60 min.
1. Open Marketing, then Emails, then Templates. Confirm 6 folders: 01. Enquiry & Chase (4 emails), 02. Appointments (2), 03. Quote & Follow-up (4), 04. Won & Delivery (7), 05. After Job & Nurture (10), 06. Commercial (12). Total 39.
2. Confirm each template name is "ID · Title", for example "X-ACK-02 · New lead email".
3. Open five templates (X-ACK-02, DIAL-03, R-QUOTE-01, REM-01, C-PROP-01). For each, check: Subject line, Preview text, From name and From email are filled (From email is info@sprayitsolutions.com.au; From name is "Rachael at SprayIT Solutions" for personal emails and "SprayIT Solutions" for confirmations, reminders and invoices).
4. In each, send a test email to your own address. Check the merge tags are filled in, not shown as {{...}}, and the text reads right. Note anything that shows a blank where a value should be.
5. Check no email shows the vendor's name or a vendor web address (booking links should be the client's address or the calendar links).
- Expected result: 39 emails in 6 folders, with subjects, preview text and from details, and rendering correctly.
- Evidence: screenshots of the folders and the five test emails received.
- If it fails: report the template ID and what is wrong.

### T-10 · Placeholders to settle with Zen
- Phase: 1. Priority: Medium. Depends on: nothing. Time: 10 min.
1. Write a comment on this task listing these placeholders, so Zen can settle them: Review Url (the Google review link, still a placeholder); Office Hours (Mon to Fri 7am to 5pm, to confirm with Glenn); trading hours and Saturday work; commercial payment terms and progress claim basis; who sends invoice reminders (the platform or Xero).
2. Do not change any of these. Zen gets the answers from Glenn.
- Expected result: a clear list on the task.

---

# PHASE 2: BUILD THE MISSING PIECES

### T-11 · Create the 24 SMS templates
- Phase: 2. Priority: High. Depends on: T-03. Time: 90 min.
- Why: the SMS templates are not in Dev yet. The workflows have the SMS text typed in directly, but templates are needed for manual use and consistency.
1. Zen will share the folder crm-build\messages\sms (24 text files, one per ID, such as X-ACK-01.txt). Open Marketing, then Snippets (or Templates, SMS).
2. Create 7 folders: 01. Enquiry & Chase; 02. Appointments; 03. Quote & Follow-up; 04. Won & Delivery; 05. After Job & Payment; 06. Commercial; 07. System.
3. Create each SMS template, named "ID · Title", pasted exactly from its file. Folder contents: 01 X-ACK-01, DIAL-01; 02 X-APPT-02, X-APPT-03, X-APPT-04, X-INSP-01, X-INSP-02; 03 R-QUOTE-02, R-FU-01, R-FU-03; 04 X-ACC-02, JOB-01, REM-02, REM-04, REM-05, JOB-04, JOB-06, DEP-01, DEP-03; 05 PAY-02, REV-01; 06 C-SITE-01; 07 SYS-01, SYS-02.
4. Check each ends with the sign-off tag {{custom_values.sms_signoff}} and that no merge tag is broken.
5. Send three of them to your own phone and check the text.
- Expected result: 24 SMS templates in 7 folders.
- Evidence: screenshots of the folders and the three texts.

### T-12 · Set up the six calendars properly
- Phase: 2. Priority: High. Depends on: T-02, T-08. Time: 60 min.
1. For each calendar, open it and set: team member (your test user), meeting duration, availability, booking form (name, email, phone), reschedule and cancellation links on, confirmation messages off (the workflows send them), notifications to your own address only.
2. Phone call: 15 minutes, Monday to Friday 7am to 5pm (a placeholder until Glenn confirms). Site inspection: 60 minutes, Monday to Friday 7am to 5pm. The four Install calendars: full-day blocks, Monday to Friday 7am to 4pm.
3. Do not connect any real Apple or Google calendar yet.
4. Open each booking link from T-03 in a private browser window. Check it shows available times.
5. Make one test booking in the Phone call calendar as the TEST Residential contact, then cancel it. Check it appears on the contact and in the calendar.
- Expected result: all six calendars bookable, with the links working.
- Evidence: screenshots of each calendar's settings and one test booking.

### T-13 · Create the trigger links (Yes, No and review)
- Phase: 2. Priority: High. Depends on: T-03. Time: 20 min.
1. Open Marketing, then Trigger Links. Create "Confirm date Yes" with the key confirm_yes and "Confirm date No" with the key confirm_no. The reminder emails and texts use {{trigger_link.confirm_yes}} and {{trigger_link.confirm_no}}.
2. Point both links at a simple page (a thank-you page on the client's website, or any placeholder page). The workflows act on the click, not on the page.
3. Create "Google review" as a short link to the Google review page. Use a placeholder address until Zen supplies the real one, and update the Review Url custom value to match.
4. Click each link once from a test email to check the click is recorded on the contact.
- Expected result: three trigger links, clicks recorded.
- Evidence: screenshots.

### T-14 · Check how the stage rules can be enforced
- Phase: 2. Priority: Medium. Depends on: T-07. Time: 30 min.
- Why: four rules in the journey say a card cannot move on without a field: WF-13 Follow-Up needs Callback At; WF-15 Lost needs a reason; WF-23 a job cannot be completed until Photos Captured is ticked; WF-33 Retention Claim needs Retention Amount and Retention Release Date.
1. Look in the pipeline settings for a way to require fields when a card enters a stage. Note whether it exists.
2. If it does, set the four rules. If it does not, write a comment saying so, and describe the workaround the workflows use (a task to fix it, or sending the card back).
3. Test one: try to mark an opportunity Lost without a reason.
- Expected result: either the four rules set, or a written note that the platform cannot enforce them.
- Evidence: a screenshot or the note.

### T-15 · Check the invoice and quote tools
- Phase: 2. Priority: High. Depends on: T-00. Time: 45 min.
1. Open Payments, then Invoices. Check you can create a draft invoice without sending it. Note the name of the action.
2. Create an invoice template for the deposit and one for the final invoice: name "Deposit invoice" and "Final invoice", with the business name and phone from the custom values, GST shown, and a note that the accepted quote and terms apply. Do not send any invoice.
3. Open Payments, then Proposals and Estimates (or the quote tool). Check a quote can carry accept and decline buttons, and note how the accept and decline events can start a workflow (WF-12).
4. Do not connect Xero in Dev. Note whether Xero is already linked. The GST invoice sync test is for Zen later.
- Expected result: a draft invoice can be created and left unsent, two invoice templates exist, the quote tool has accept and decline.
- Evidence: screenshots and a note of the action names, as WF-24, WF-25, WF-26, WF-27 and WF-28 depend on them.

### T-16 · Sending number and email domain
- Phase: 2. Priority: High. Depends on: T-00. Time: 30 min, plus waiting for DNS.
1. Check whether Dev has an SMS sending number. If not, do not buy one: ask Zen. SMS tests are blocked without it.
2. Open Settings, then Email Services (or Domains). Look at the sending domain for info@sprayitsolutions.com.au. Note whether SPF and DKIM are set up.
3. If they are not, ask Zen or Dan to add the DNS records at the domain host. You will not have access. Do not change the client's DNS yourself.
4. Once done, send a test email from a template to your own address and read the email headers for SPF pass and DKIM pass.
- Expected result: a written status of the number and the domain, and a pass in the headers once done.
- Evidence: a screenshot of the status and the header check.

---

# PHASE 3: CHECK THE 40 DRAFTS

All 40 workflows exist in draft, named "WF-NN · Name", in 12 folders: 01. Intake, 02. Dial 1 and Dial 2, 03. Phone calls, 04. Quote, 05. Accepted, lost and nurture, 06. Site inspection, 07. Booking and reminders, 08. Deposit, 09. Completion and payment, 10. Retention, 11. Always on, 12. Reporting. They were built by the platform's AI assistant. Its step-by-step content has not been verified.

### T-20 · Check the folders and names
- Phase: 3. Priority: High. Depends on: T-00. Time: 20 min.
1. Open Automation, then Workflows. Confirm the 12 folders, with these workflows inside: 01 WF-01 to 04; 02 WF-05, 06; 03 WF-07, 08; 04 WF-09 to 13; 05 WF-14 to 16; 06 WF-17, 18; 07 WF-19 to 23; 08 WF-24 to 26; 09 WF-27 to 32; 10 WF-33; 11 WF-34 to 38; 12 WF-39, 40.
2. Confirm every workflow is in Draft and nothing is published.
3. The old workflow "FAQ Auto Reply" is outside the scope. Leave it alone.
- Expected result: 40 workflows in the right folders, all Draft.
- Evidence: screenshots of each folder.

### T-21 · Get a step-by-step export of every workflow from the AI assistant
- Phase: 3. Priority: High. Depends on: T-20. Time: 90 min.
1. Open Ask AI in the Dev account. Paste this, then send it in 8 batches of 5 workflows: "Audit what you built. For each of these workflows, in order, give me a plain text export in this exact format: WF-NN · name | folder | status. Trigger: ... Settings: re-entry, stop on reply, send window. Steps: numbered, every step with its wait, branch, template or SMS text, tag, field, task title and description, notification, and any workflow it adds or removes. Not built or assumed: ... Do not change anything. The workflows are WF-01 to WF-05." Then repeat for WF-06 to 10, 11 to 15, and so on up to WF-36 to 40.
2. Save each reply into a text file named audit-WF-01-05.txt and so on. Put them in a shared folder Zen names.
3. If the assistant cannot give step-by-step detail, open each workflow on the canvas and write the steps down yourself, in the same format.
- Expected result: 8 text files covering all 40 workflows.
- Evidence: the 8 files attached to the task.

### T-22 · Compare each workflow with the build sheets
- Phase: 3. Priority: High. Depends on: T-21. Time: 180 min.
1. The build sheets are in crm-build\workflows: WF-A (WF-01 to 13), WF-B (WF-14 to 26), WF-C (WF-27 to 40). Zen will share them.
2. For each workflow, put the export beside its sheet and tick off: trigger, filters, every step in the same order, wait times, branches, templates (names "ID · Title"), SMS text, tags, fields, task titles and descriptions, notifications and recipients.
3. Write a table with one row per difference: workflow, step number, the sheet says, the build says, size of the problem (small fix or rebuild).
4. Do not fix anything in this task. The per-workflow tasks fix as they go.
- Expected result: one difference table covering all 40 workflows.
- Evidence: the table.

### T-23 · Check the links between workflows
- Phase: 3. Priority: High. Depends on: T-21. Time: 45 min.
- Why: the AI assistant built the workflows in order, so steps like "Add to workflow WF-02" and "Remove from workflow WF-16" were written before the other workflows existed.
1. In the exports and on the canvas, list every Add to Workflow and Remove from Workflow step: which workflow, and what it points at.
2. Check each points at the right named workflow in the list, and that none is blank or points at "FAQ Auto Reply" or an unrelated workflow.
3. Fix broken links by hand, and note each.
- Expected result: every link points at the right workflow.
- Evidence: the list with a tick on each link.

### T-24 · Check one send window, stop on reply, and the error branch across all 40
- Phase: 3. Priority: High. Depends on: T-21. Time: 60 min.
1. Send window: customer messages marked business hours wait for the window Monday to Saturday, 8am to 8pm, Australia/Brisbane time. Confirmations and replies (marked immediate) do not wait. Check all 40 use the same window. The AI assistant reported that some used 7am to 6pm: find and fix any that do.
2. Staff alerts follow quiet hours: Monday to Friday 7am to 6pm; Saturday 8am to 2pm only for alerts 1, 2, 6, 10, 11 and 12; none on Sunday.
3. Stop on reply: every chasing sequence (WF-06, WF-10, WF-11, WF-16, WF-28, WF-31) stops when the contact replies. Reminders about an agreed date (WF-07, WF-21, WF-25) keep running.
4. Error branch: each workflow notifies the owner if a step fails (alert 11).
5. Re-entry: off unless the sheet says otherwise.
- Expected result: all 40 consistent. A table of fixes made.
- Evidence: the table.

### T-25 · Check users and roles in every task and notification step
- Phase: 3. Priority: Medium. Depends on: T-02, T-21. Time: 45 min.
1. Every Create Task and Internal Notification step names a user or role. Check each points to a real Dev user (your test user).
2. Fix any blank assignee. Note which workflows used OWNER, OFFICE, ESTIMATOR or CREW_LEAD.
3. Alerts: 1 new enquiry (OFFICE); 2 missed call (OFFICE); 3 inbound reply (assigned user); 4 phone call booked (assigned user); 5 phone call or inspection cancelled (assigned user, OWNER for an inspection); 6 commercial enquiry (OWNER); 7 new lead not called after 15 minutes (OFFICE); 8 quote accepted (OWNER and OFFICE); 9 deposit received (OWNER and OFFICE); 10 negative review or complaint (OWNER); 11 automation failure (OWNER); 12 customer cannot make the date (OWNER and OFFICE); 13 deposit unpaid (OWNER and OFFICE); 14 assigned to you (the assignee). OWNER receives SMS and email. OFFICE receives email and in-app only, never SMS.
- Expected result: every notification and task has an owner who is a test user.

---

# PHASE 4: TURN THEM ON, IN WAVES

Each workflow has its own task (T-WF-NN) with the check, the activation and the test. The wave tasks below are the gates between waves. Do not start a wave until the one before has passed.

Waves: A = WF-01 to 08, 34, 35, 38. B = WF-09 to 16. C = WF-17 to 19. D = WF-20 to 23. E = WF-24 to 29, 32, 33. F = WF-30, 31, 37. G = WF-36, 39, 40.

### T-30 · Pre-activation safety check (before wave A)
- Phase: 4. Priority: Urgent. Depends on: T-01, T-02, T-12, T-16, T-24. Time: 20 min.
1. Confirm you are in Dev (T-00).
2. Confirm there are only TEST contacts (T-01) and no real customers.
3. Confirm every alert and task points at your test user (T-25), and the daily and weekly reports (WF-39, WF-40) go only to your own address.
4. Confirm the sending number and email are the Dev ones.
5. Write "Safe to activate" in a comment, with the date and time.
- Expected result: a written all-clear.

### T-31 · Wave A gate: lead handling
- Phase: 4. Depends on: T-30 and T-WF-01 to T-WF-08, T-WF-34, T-WF-35, T-WF-38. Time: 30 min.
1. Confirm each of those workflow tasks is Done.
2. Smoke test: post one test enquiry (see T-E2E-01 step 1) for TEST Residential. Check it arrives, the card appears at New Lead on the Residential board, the acknowledgement SMS and email reach you, alert 1 and the call task appear.
3. Leave wave A active.
- Expected result: wave A active and working.

### T-32 · Wave B gate: quoting and the decision
- Phase: 4. Depends on: T-31 and T-WF-09 to T-WF-16. Time: 30 min.
1. Confirm those tasks are Done.
2. Smoke test: move the test card to Quoting, then Quote Sent, then mark it accepted. Check each stage's expected messages and tasks.
3. Leave wave B active.

### T-33 · Wave C gate: site inspection
- Phase: 4. Depends on: T-32 and T-WF-17 to T-WF-19. Time: 20 min.
1. Confirm those tasks are Done.
2. Smoke test: book an inspection in the Site inspection calendar, then move it, then cancel it.
3. Leave wave C active.

### T-34 · Wave D gate: booking, reminders and job day
- Phase: 4. Depends on: T-33 and T-WF-20 to T-WF-23. Time: 30 min.
1. Confirm those tasks are Done.
2. Smoke test: book an install in an Install calendar. Check the job fields and stage change, JOB-01 and JOB-02, and that the reminders are scheduled.
3. Leave wave D active.

### T-35 · Wave E gate: deposit, invoices and claims
- Phase: 4. Depends on: T-34, T-15 and T-WF-24 to T-WF-29, T-WF-32, T-WF-33. Time: 30 min.
1. Confirm those tasks are Done.
2. Smoke test: create a draft deposit invoice and check nothing is sent until you send it. Mark it paid and check the deposit received step.
3. Leave wave E active.

### T-36 · Wave F gate: reviews, referrals and complaints
- Phase: 4. Depends on: T-35 and T-WF-30, T-WF-31, T-WF-37. Time: 20 min.
1. Confirm those tasks are Done.
2. Leave wave F active.

### T-37 · Wave G gate: monitors and reports
- Phase: 4. Depends on: T-36 and T-WF-36, T-WF-39, T-WF-40. Time: 20 min.
1. Confirm those tasks are Done.
2. Confirm WF-39 and WF-40 send only to your own address, and note the times they will run.
3. Leave wave G active.

### T-38 · All 40 active and safe
- Phase: 4. Priority: High. Depends on: T-37. Time: 30 min.
1. Open Automation, then Workflows. Confirm all 40 show Published (active) and none is in draft or has an error.
2. Check the execution log for errors. Note any.
3. Confirm no real customer was contacted: Conversations shows only TEST contacts.
4. Write a comment: "All 40 active in Dev, no errors, only test contacts contacted", with the date.
- Expected result: 40 active, clean logs.
- Evidence: a screenshot of each folder with all published.

---

# PHASE 5: END-TO-END JOURNEYS

Compress time where a step waits days: clone the workflow, shorten the wait to a minute for the test, then delete the clone. Never shorten the real workflow. Use TEST contacts only.

### T-E2E-01 · Residential happy path
- Priority: High. Depends on: T-38. Time: 120 min.
1. Post a test website enquiry for TEST Residential: first name, last name, email, phone, property type Home, building stage Existing building (retrofit), areas Roof or ceiling, timeframe As soon as possible, postcode 3000, an enquiry message, marketing consent yes. The field names the form sends are in DEPLOY.md in the SPRY folder. Use the workflow's webhook address from WF-01.
2. Expect: the contact is created (no duplicate), fields filled, attribution and consent saved, tags from-website and been-enquired and the stage tag, an opportunity at New Lead on Residential, alert 1, the call task due in 15 minutes, SMS X-ACK-01 within about 2 minutes, email X-ACK-02.
3. Log a call, then move the card to Quoting. Expect the owner task QUOTE and alert 14.
4. Move to Quote Sent. Expect R-QUOTE-01 and R-QUOTE-02, the call task on day 2, and the follow-up schedule.
5. Accept the quote. Expect the card at Quote Accepted, status Won, X-ACC-01 and X-ACC-02, alert 8, and the NEXT task.
6. Move to Booking Required, book an install, expect Job Booked, JOB-01 and JOB-02, the reminders scheduled.
7. Move to Deposit Requested through a draft invoice you send to yourself, then mark it paid: DEP-02, DEP-01, alert 9.
8. Move to Job Completed with Photos Captured ticked: JOB-05, the final invoice draft, the review question task.
9. Send and pay the final invoice: PAY-01, then the report task, tag been-customer, and the card closes as Won.
- Expected result: each stage produced its messages, tasks and alerts, with nothing duplicated.
- Evidence: a timeline screenshot per stage, and the emails and texts received.

### T-E2E-02 · Commercial path
- Priority: High. Depends on: T-38. Time: 90 min.
1. Post a test enquiry for TEST Commercial with property type Factory or warehouse.
2. Expect: the opportunity on Commercial & Industrial, alert 6 to OWNER and alert 1 to OFFICE, C-ACK-01, X-ACK-01.
3. Move through Quoting (the proposal task due in 5 business days), Quote Sent (C-PROP-01, then day 7 and day 21 follow-ups), Quote Accepted (C-PO-01; a verbal yes stays Open until a signed acceptance or a PO number is entered), Job Booked (C-MOB-01), a progress claim (C-PAY-01), Job Completed (C-DONE-01), final claim paid (C-CLOSE-01), and a retention (WF-33).
- Expected result: commercial rules differ from residential as described.
- Evidence: timelines and emails.

### T-E2E-03 · Unreachable lead
- Priority: High. Depends on: T-38. Time: 60 min.
1. Create a new TEST contact and opportunity at New Lead and do not answer. Move to Dial 1: DIAL-01 text after about 10 seconds, the second-round task.
2. Move to Dial 2: DIAL-02, DIAL-03 and the call task, DIAL-04, then Lost with reason Unreachable. Shorten the waits in a clone.
3. Reply to one email as the contact: the sequence must stop and alert 3 must fire.

### T-E2E-04 · Declined or lost quote
- Priority: Medium. Depends on: T-38. Time: 30 min.
1. At Quote Sent, press Decline. Expect Lost, a reason required, LOST-01 the next business morning (not for Unreachable, Duplicate or Spam).

### T-E2E-05 · Nurture and marketing consent
- Priority: Medium. Depends on: T-38. Time: 45 min.
1. Move one contact with Marketing Consent yes to Nurture: NUR-01 next morning, NUR-02 after 30 days, NUR-03, NUR-04 (shorten waits in a clone).
2. Repeat with Marketing Consent no: no marketing email must go.
3. Send STOP by SMS from the test phone: tag is-no-marketing is added and the contact leaves the nurture and review sequences (WF-35). Transactional messages must still send.

### T-E2E-06 · Customer reply
- Priority: High. Depends on: T-38. Time: 30 min.
1. While a chasing sequence runs, reply by SMS as the contact. Expect alert 3, the REPLY task due in 1 hour, and the chasing workflows stopped. Reminders for an agreed date must keep running.

### T-E2E-07 · Missed call and out of hours
- Priority: Medium. Depends on: T-38, T-16. Time: 30 min.
1. Call the Dev number from the test phone and do not answer: SYS-01 text within 60 seconds, alert 2, the RING BACK task due in 30 minutes.
2. Send an SMS to the Dev number outside the office-hours window: SYS-02 once per contact per day.

### T-E2E-08 · Yes and No on the reminders
- Priority: High. Depends on: T-38, T-13. Time: 30 min.
1. On a booked job, click Yes in a reminder: Job Confirmed becomes Yes.
2. Click No: Job Confirmed No, REM-05 text, alert 12, the RESCHEDULE task. Click No again: no second alert.

### T-E2E-09 · Deposit due-date check
- Priority: High. Depends on: T-38. Time: 30 min.
1. Send a deposit invoice with a due date today and leave it unpaid. At 4pm: DEP-03 text, alert 13 and the CHASE task.
2. Mark it paid: the 4pm check is cancelled, DEP-01 is sent.

### T-E2E-10 · Reviews and complaints
- Priority: Medium. Depends on: T-38. Time: 30 min.
1. After a completed job with Ask For Google Review = Yes, REV-01 goes after 4 weeks (shorten in a clone). With No, no review text and no referral email.
2. Add the tag is-complaint (or a review under 4 stars): alert 10, a same-day call task, Ask For Google Review set to No, marketing paused.

### T-E2E-11 · Reports and the stalled monitor
- Priority: Medium. Depends on: T-38. Time: 30 min.
1. Run the daily summary (WF-39) once now. Expect an email to your own address with the sections in the sheet.
2. Run the weekly report (WF-40) once. Check the counts against what you did in testing.
3. Leave a card idle and check the stalled monitor (WF-36) adds is-stalled and surfaces the task.

---

# FINAL REPORT

### T-FINAL · Final test report
- Priority: High. Depends on: all the tasks above. Time: 60 min.
1. Write a table with one row per workflow (WF-01 to WF-40): built correctly, active, tested, result, anything fixed, anything still failing.
2. List every Blocked task and why.
3. List every placeholder still open (T-10).
4. List what is not tested: GST invoices reaching Xero, the real Apple calendar sync, the real website form on the live site, real sending domain headers if not done.
5. Confirm that no real customer was contacted and the live account was never opened.
6. Attach all evidence. Send the report to Zen.
- Expected result: a report Zen can read in 10 minutes and act on.
