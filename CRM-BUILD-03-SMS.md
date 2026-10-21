# Build sheet 03: SMS templates (24)

The tools cannot read or create SMS templates. All 24 are pasted by hand. Each is a text file in `crm-build/messages/sms/<ID>.txt`, and `crm-build/messages/message-index.md` has the template name and length.

Where: Marketing, Snippets (or Templates, SMS). Create a folder for each group below, then one template per ID. Name each `ID · Title` exactly as in message-index.md.

Every SMS already ends with `{{custom_values.sms_signoff}}`, which is the sender identification ("Rachael, SprayIT Solutions"). Check it is there after pasting. STOP handling is a workflow job (WF-35), not part of the text.

Merge tags in these texts need the custom values and fields from sheet 01 first. Send each to your own phone to check length and links.

| Folder | SMS IDs |
| --- | --- |
| 01. Enquiry & Chase | X-ACK-01, DIAL-01 |
| 02. Appointments | X-APPT-02, X-APPT-03, X-APPT-04, X-INSP-01, X-INSP-02 |
| 03. Quote & Follow-up | R-QUOTE-02, R-FU-01, R-FU-03 |
| 04. Won & Delivery | X-ACC-02, JOB-01, REM-02, REM-04, REM-05, JOB-04, JOB-06, DEP-01, DEP-03 |
| 05. After Job & Payment | PAY-02, REV-01 |
| 06. Commercial | C-SITE-01 |
| 07. System | SYS-01, SYS-02 |

That is 2 + 5 + 3 + 9 + 2 + 1 + 2 = 24.

Notes:
- JOB-06 (crew running late) is sent by hand by the crew from a saved template, not by a workflow. Make it a snippet the crew can reach.
- REV-01 uses `{{custom_values.review_url}}`. That value is still a placeholder: make a trigger link for the Google review page and put its short link in the custom value.
- X-APPT-03 and X-APPT-04 use `{{appointment.start_time}}`-style tags: send a test from a real calendar booking.
- Old SMS templates already in the account (unknown to Dobby): delete any that do not match an ID above.

Check: when done, tell Dobby. It cannot read SMS templates, so the check is a test send to your phone for each group.
