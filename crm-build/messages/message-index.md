# Message export index

Generated from journey-data.js. 39 emails, 24 SMS.
Email from-name: contact = {{custom_values.from_name_contact}}, brand = {{custom_values.from_name_brand}}. Reply-to is {{custom_values.business_email}}.
SMS length is characters before merge tags are filled in.

| ID | Channel | Template name | From | Subject | Preheader | SMS length |
| --- | --- | --- | --- | --- | --- | --- |
| X-ACK-01 | sms | X-ACK-01 · New lead text |  |  |  | 181 |
| X-ACK-02 | email | X-ACK-02 · New lead email | contact | We have your enquiry, {{contact.first_name}} | We will ring you to talk it through, then send a written quote. Here is what you told us. |  |
| DIAL-01 | sms | DIAL-01 · Missed call text after two calls |  |  |  | 194 |
| DIAL-02 | email | DIAL-02 · Dial 2 day 2 follow-up | contact | Following up on your {{custom_values.trade_noun}} enquiry | We have tried to ring a couple of times. Reply with a time that suits and we will call then. |  |
| DIAL-03 | email | DIAL-03 · Dial 2 day 4 pick a time | contact | Pick a time to talk about your {{custom_values.trade_verb}} job | Choose a time that suits you and we will ring then. It takes two clicks. |  |
| DIAL-04 | email | DIAL-04 · Dial 2 day 7 closing off | contact | Closing this one off | We could not reach you, so we will stop ringing. Nothing is lost. |  |
| X-APPT-01 | email | X-APPT-01 · Phone call booked email | brand | Confirmed: {{appointment.start_time}} | We will call you on {{contact.phone}}. Reschedule or cancel with one click. |  |
| X-APPT-02 | sms | X-APPT-02 · Phone call booked text |  |  |  | 158 |
| X-APPT-03 | sms | X-APPT-03 · Phone call 24 hours before |  |  |  | 182 |
| X-APPT-04 | sms | X-APPT-04 · Phone call 2 hours before |  |  |  | 147 |
| X-APPT-06 | email | X-APPT-06 · Booking moved | brand | Your booking has moved | The new time is {{appointment.start_time}}. If that is not right, ring us. |  |
| X-INSP-01 | sms | X-INSP-01 · Site inspection booked text |  |  |  | 174 |
| X-INSP-02 | sms | X-INSP-02 · Site inspection day text |  |  |  | 182 |
| R-QUOTE-01 | email | R-QUOTE-01 · Quote sent email | contact | Your quote from {{custom_values.business_name}} | Quote {{opportunity.quote_number}}. View it online and accept it with one click. Questions welcome. |  |
| R-QUOTE-02 | sms | R-QUOTE-02 · Quote sent text |  |  |  | 180 |
| R-FU-01 | sms | R-FU-01 · Quote day 2 text |  |  |  | 120 |
| R-FU-02 | email | R-FU-02 · Quote day 5 why quotes differ | contact | Why our number might look different | Two numbers for the same job can look nothing alike. Here is why. |  |
| R-FU-03 | sms | R-FU-03 · Quote day 10 text |  |  |  | 168 |
| R-FU-04 | email | R-FU-04 · Quote day 21 final close | contact | Should we close this off? | No reply, so we will assume the timing is off. Tell us if we are wrong. |  |
| LOST-01 | email | LOST-01 · Thanks for considering us | contact | Thanks for considering us, {{contact.first_name}} | No hard feelings. The door stays open. |  |
| NUR-01 | email | NUR-01 · Nurture start R-value education | contact | The bit about R-value nobody explains | Worth knowing before you get anywhere near comparing quotes. |  |
| NUR-02 | email | NUR-02 · Nurture +30 days heat loss | contact | Where the heat actually goes | A third through the roof, more through the walls, and the floor nobody thinks about. |  |
| NUR-03 | email | NUR-03 · Nurture +90 days still on the list | contact | Still on the list? | If the project is still on the horizon, do nothing. If it is off the table, one click and we stop. |  |
| NUR-04 | email | NUR-04 · Nurture 12 months quote refresh | contact | A year on from your quote | Plans and budgets change. If the job is back on, we can refresh the quote quickly. |  |
| X-ACC-01 | email | X-ACC-01 · Quote accepted email | contact | Thanks for going ahead, {{contact.first_name}} | What happens from here: the install date, the reminders, and the deposit closer to the day. |  |
| X-ACC-02 | sms | X-ACC-02 · Quote accepted text |  |  |  | 131 |
| JOB-01 | sms | JOB-01 · Install booked text |  |  |  | 164 |
| JOB-02 | email | JOB-02 · Install booked prep instructions | brand | Your job is booked for {{opportunity.job_date}} | Booked for {{opportunity.job_date}}. Five things to do before we arrive. |  |
| REM-01 | email | REM-01 · Job 7 days email | brand | Your job is a week away. Does the date still work? | {{opportunity.job_date}} at {{opportunity.site_address}}. One tap to confirm, or to tell us it does not work. |  |
| REM-02 | sms | REM-02 · Job 7 days text |  |  |  | 177 |
| REM-03 | email | REM-03 · Job 48 hours email | brand | Your job is in 2 days. Please confirm. | {{opportunity.job_date}} at {{opportunity.site_address}}. One tap to confirm the job is still on. |  |
| REM-04 | sms | REM-04 · Job 48 hours text |  |  |  | 177 |
| REM-05 | sms | REM-05 · Cannot make the date text |  |  |  | 126 |
| REM-06 | email | REM-06 · Job 30 days check email | brand | A month to go: still on track for {{opportunity.job_date}}? | A quick check that the date still works. One tap either way. |  |
| JOB-04 | sms | JOB-04 · Job day morning text |  |  |  | 131 |
| JOB-06 | sms | JOB-06 · Crew running late text |  |  |  | 142 |
| DEP-02 | email | DEP-02 · Deposit invoice email | brand | Deposit for your job on {{opportunity.job_date}} | Deposit invoice attached, due {{opportunity.deposit_due_date}}. Your accepted quote is attached too. |  |
| DEP-03 | sms | DEP-03 · Deposit overdue text |  |  |  | 181 |
| DEP-01 | sms | DEP-01 · Deposit received text |  |  |  | 124 |
| JOB-05 | email | JOB-05 · Job complete email | contact | All done at {{opportunity.site_address}} | Thanks for having us. What we did, how to live with it, and what comes next. |  |
| PAY-01 | email | PAY-01 · Final invoice email | brand | Invoice {{opportunity.invoice_number}} | Invoice {{opportunity.invoice_number}} attached, with your accepted quote. Due dates are on it. |  |
| PAY-02 | sms | PAY-02 · Invoice day 7 text |  |  |  | 173 |
| PAY-03 | email | PAY-03 · Invoice day 14 overdue | brand | Invoice {{opportunity.invoice_number}} is now overdue | A copy is attached. If something is wrong with it, ring us and we will sort it. |  |
| RPT-01 | email | RPT-01 · Job report email | contact | Your job report for {{opportunity.site_address}} | Photos, what we installed, and the certificate of completion for your building surveyor. |  |
| REV-01 | sms | REV-01 · Google review text |  |  |  | 172 |
| REV-02 | email | REV-02 · After job referral ask | contact | Know anyone else with the same problem? | Most of our work is word of mouth. You would know who. |  |
| REV-03 | email | REV-03 · After job 12 month check-in | contact | A year on, how is it going? | It has been a year since {{opportunity.site_address}}. Tell us how it is holding up. |  |
| RET-01 | email | RET-01 · Retention claim email | contact | Retention release, {{opportunity.site_address}} | The retention period has ended. Our claim for {{opportunity.retention_amount}} is attached. |  |
| SYS-01 | sms | SYS-01 · Missed call text back |  |  |  | 134 |
| SYS-02 | sms | SYS-02 · Out of hours reply |  |  |  | 172 |
| C-ACK-01 | email | C-ACK-01 · Commercial new enquiry | contact | Your enquiry, {{contact.first_name}} | We will call to scope it. Five things that make that call useful. |  |
| C-INSP-01 | email | C-INSP-01 · Commercial inspection booked | brand | Site inspection confirmed, {{opportunity.inspection_date}} | Confirmed for {{opportunity.inspection_date}}. Inductions, PPE, access and a site contact, please. |  |
| C-PROP-01 | email | C-PROP-01 · Commercial proposal sent | contact | Proposal, {{opportunity.site_address}} | Specification, programme and compliance documents included. Accept online, or by purchase order. |  |
| C-PROP-02 | email | C-PROP-02 · Commercial proposal day 7 | contact | Anything you need on {{opportunity.quote_number}}? | References, insurances, a revised breakdown. And is there a decision date? |  |
| C-PROP-03 | email | C-PROP-03 · Commercial proposal day 21 | contact | {{opportunity.quote_number}}, where does this sit? | Live, deferred, or gone elsewhere. Any answer helps us hold capacity. |  |
| C-FUT-01 | email | C-FUT-01 · Commercial future project | contact | Still on the plan for {{opportunity.site_address}}? | A quarterly check-in, nothing more. Tell us when the budget cycle comes around. |  |
| C-PO-01 | email | C-PO-01 · Commercial awaiting PO | contact | Thanks for the go-ahead, {{opportunity.site_address}} | To book the works in we need four things. Programme confirmed within two working days. |  |
| C-MOB-01 | email | C-MOB-01 · Commercial works booked | brand | Works booked: {{opportunity.site_address}} | Start {{opportunity.job_date}}. SWMS, insurances and crew list attached. Four things we need from you. |  |
| C-SITE-01 | sms | C-SITE-01 · Commercial site day text |  |  |  | 208 |
| C-PROG-01 | email | C-PROG-01 · Commercial weekly progress | contact | Progress update: {{opportunity.site_address}} | Where the works are up to, what is next, and anything we need from you. |  |
| C-PAY-01 | email | C-PAY-01 · Commercial progress claim | brand | Progress claim {{opportunity.invoice_number}} | Claim {{opportunity.invoice_number}} attached with supporting photos, the accepted quote and your PO. |  |
| C-DONE-01 | email | C-DONE-01 · Commercial works complete | contact | Works complete: {{opportunity.site_address}} | The works are done. Final claim to follow, then the close-out pack once it is paid. |  |
| C-CLOSE-01 | email | C-CLOSE-01 · Commercial paid and closed | contact | Thanks, {{contact.first_name}} | Final payment received. One favour, and a promise about next time. |  |
