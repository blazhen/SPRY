# Build sheet 02: email templates

Read of the live account: 15 Oct 2026, 45 email templates in 6 folders (plus 3 subfolders) and 11 loose. The journey needs 39. The tools can read templates but cannot create a usable one, and cannot delete, rename or move one (the create tool only works for imports). So all of this is by hand. The paste-ready bodies are already written: `crm-build/messages/emails/<ID>.html`, one file per email, and `crm-build/messages/message-index.md` lists each template name, sender, subject and preheader.

Naming rule: template name `ID · Title` (the exact name is in message-index.md). Folders keep your six, numbered, and the three appointment subfolders go.

## Step 1. Delete the old design (18 templates, 3 folders)

Before deleting, open Automation, Workflows and look for old workflows that send these. Delete or stop those workflows first, or they will point at nothing.

Delete these templates:
- In 01. Enquiry & Chase: X-CHASE-02 (Day 2 no reply), X-CHASE-04 (Day 7 final close), X-BOOK-02 (Enters Qualified, book assessment)
- In 04. Won & Delivery: X-WON-01 (Status set to Won, next steps)
- In 02. Appointments, the three subfolders and everything in them: 01. Booked (AR-E1, AR-E2, AR-E3), 02. Cancelled (AC-E1, AC-E2, AC-E3), 03. No-Show (AC-E1, AC-E2, AC-E3). Then delete the three empty subfolders.
- Loose, outside any folder: C-INSP-02 (Commercial Inspection Cancelled), C-INSP-03 (Commercial Inspection No Show), C-SPEC-01 (Specifying), R-ASSESS-04 (Assessment Cancelled), R-ASSESS-06 (Assessment No Show)

That is 4 + 9 + 5 = 18 templates.

## Step 2. Move the strays into your six folders

| Template | Now | Move to |
| --- | --- | --- |
| X-APPT-06 | loose | 02. Appointments |
| LOST-01 | loose | 03. Quote & Follow-up |
| PAY-01 | 06. Commercial | 05. After Job & Nurture |
| PAY-03 | 06. Commercial | 05. After Job & Nurture |
| C-FUT-01 | loose | 06. Commercial |
| C-DONE-01 | loose | 06. Commercial |
| C-PROG-01 | loose | 06. Commercial |
| C-CLOSE-01 | loose | 06. Commercial |

Folders to keep as they are: 01. Enquiry & Chase, 02. Appointments, 03. Quote & Follow-up, 04. Won & Delivery, 05. After Job & Nurture, 06. Commercial.

## Step 3. Rename and refresh the 27 that already exist

Their IDs match the journey, but they were last edited on 14 Sep, before the 2 Oct call. For each one: rename to the name in message-index.md, set the subject and preheader from the index, and replace the body with the matching file in `crm-build/messages/emails/`. The existing ones are drag-and-drop templates. The simplest way is to create a new "Code your own" (HTML) template from the file and delete the old one, keeping the new name and folder.

| Folder | Templates (ID) |
| --- | --- |
| 01. Enquiry & Chase | X-ACK-02 |
| 02. Appointments | X-APPT-06 |
| 03. Quote & Follow-up | R-QUOTE-01, R-FU-02, R-FU-04, LOST-01 |
| 04. Won & Delivery | JOB-02, JOB-05 |
| 05. After Job & Nurture | NUR-01, NUR-02, NUR-03, REV-02, REV-03, PAY-01, PAY-03 |
| 06. Commercial | C-ACK-01, C-INSP-01, C-PROP-01, C-PROP-02, C-PROP-03, C-PO-01, C-MOB-01, C-PAY-01, C-FUT-01, C-DONE-01, C-PROG-01, C-CLOSE-01 |

That is 1 + 1 + 4 + 2 + 7 + 12 = 27.

## Step 4. Create the 12 that are missing

Create each as a "Code your own" (HTML) template in the folder shown, name from message-index.md, subject and preheader from the index, body from the file.

| ID | Folder |
| --- | --- |
| DIAL-02, DIAL-03, DIAL-04 | 01. Enquiry & Chase |
| X-APPT-01 | 02. Appointments |
| X-ACC-01, REM-01, REM-03, REM-06, DEP-02 | 04. Won & Delivery |
| NUR-04, RPT-01, RET-01 | 05. After Job & Nurture |

## Step 5. Sender and tokens

- From name: contact emails use `{{custom_values.from_name_contact}}`, brand emails use `{{custom_values.from_name_brand}}` (the index lists which). Reply-to and from address: `{{custom_values.business_email}}`.
- Every merge tag in the HTML uses the platform's own format, so the custom values (sheet 01 step 1) and fields (sheet 01 steps 2 and 3) must exist first, or the tags show blank.
- Send a test of each to your own address before it is linked to a workflow.

## Step 6. Check

Tell Dobby when a folder is done. It reads the folder back and ticks off the IDs. Target: 39 emails, no old IDs, 6 folders, no loose templates, no subfolders.
