# CRM Messaging Kit

Every SMS and email the pipelines send, with the sender, subject and preheader
for each, plus the fields and custom values they depend on. Built for
Systemations. Revised after the client call on Friday 2 October 2026.

**Generated.** This file is produced from
`client-journey-onepage/journey-data.js`, which is also what renders the
customer journey page. Edit the data file, run the generator, and both stay in
step. Editing this file by hand will be overwritten.

**This is written as a template.** Nothing client-specific is hardcoded in a
message body. A new client is a Custom Values swap (§2) plus rewriting the
8 messages marked `TRADE`, not a rewrite of the kit.

The visual companion is the customer journey page in `client-journey-onepage/`.
Open its `index.html` to see every message below as the customer would receive
it, stage by stage, with the alerts and tasks that sit behind each one. Its
Fields mode shows the raw merge fields and its Copy button hands over the
template text ready to paste into the builder.

---

## 1. How to reuse this for another client

1. Create the custom values on the new sub-account and fill them in. That table is the whole template mechanism, including the person who signs the messages and their mobile.
2. Create the custom fields below. The website webhook keys are fixed; map them on the way in.
3. Build both boards with the same fourteen stages, keys and order. The whole-pipeline view depends on it.
4. Import the messages. Anything tagged Core works unchanged for any trade or service business.
5. Rewrite only the messages tagged Trade specific. They name the product or the physical work, so they cannot be tokenised without turning into mush.
6. Replace the sample customers in the data file so previews read right for the new trade.
7. Run npm run docs:crm. The checker fails on any missing sample value, any email without a preheader, any agency wording in text the client reads, any alert channel that breaks the role rule, and any drift between the two boards.

Of the 63 messages, 8 are trade-specific: R-FU-02, NUR-01, NUR-02, JOB-02, JOB-05, RPT-01, C-MOB-01, C-DONE-01.
Everything else moves between clients untouched.

### A warning about tokens

The platform has changed token names between releases, particularly the
appointment ones. Treat the token names below as **what to look for in the
dropdown**, not as guaranteed strings. Confirm each one against your platform
version and send a test to yourself before go-live. A token that does not
resolve sends the raw `{{...}}` text to the customer. The Yes and No links in
the reminders are trigger links: `{{trigger_link.confirm_yes}}` and
`{{trigger_link.confirm_no}}` stand for whatever token the platform inserts.

### Sender identity

Every email carries a From name, a From address and a Reply-to, so the reader
knows who wrote it and a reply lands with a person. Two From names are used:

- **`from_name_contact`**, "Rachael at SprayIT Solutions", on anything personal:
  the acknowledgement, the Dial 2 emails, the quote, the follow-up, the
  thank-you, the job report, the nurture drip. Signed
  Rachael Angus, SprayIT Solutions, 0428 26 36 26.
- **`from_name_brand`**, "SprayIT Solutions", on confirmations,
  reminders, invoices and paperwork, where a person's name would look odd on a
  receipt. Signed with the business name and the business line.

Messages are written as the business, "we", and signed off with Rachael's name
and mobile, because she handles about 99% of customer contact. "Ring us" lines
use her mobile. The business line, 1300 177 729, is the number on the
Google listing and the website, and appears on the business signature.

Both send from `business_email`. The sending domain needs SPF and DKIM set up
in Systemations before go-live, or the first thing the customer sees is a
spam warning.

### Preheaders

Every email has one. It is the grey line the inbox shows under the subject, and
on a phone it is most of what the reader sees before deciding whether to open.
They are written to complete the subject rather than repeat it, and kept under
110 characters so nothing is cut off.

---

## 2. Custom Values: the swap layer

Create these under **Settings → Custom Values**. This is the whole template
mechanism: change these 24 values and every message below
works for a different client.

| Custom value | SprayIT Solutions | Notes |
| --- | --- | --- |
| `business_name` | SprayIT Solutions | Used in email |
| `business_short_name` | SprayIT | Used in SMS, where characters cost money |
| `business_phone` | 1300 177 729 | The business line. The number on the Google listing and the website, and on invoices and confirmations. |
| `business_phone_e164` | +611300177729 | For tel: links |
| `contact_name` | Rachael Angus | Signs the customer messages. Handles about 99% of customer contact. |
| `contact_first_name` | Rachael | The short form, where a full name reads stiffly |
| `contact_mobile` | 0428 26 36 26 | Rachael's mobile, confirmed by Glenn on the 2 Oct call. The number customers are asked to ring in messages. |
| `contact_mobile_e164` | +61428263626 | Rachael's mobile, confirmed by Glenn on the 2 Oct call. For tel: links. |
| `business_email` | info@sprayitsolutions.com.au | From address and reply-to. The sending domain needs SPF and DKIM before go-live. |
| `from_name_contact` | Rachael at SprayIT Solutions | From name on the personal emails |
| `from_name_brand` | SprayIT Solutions | From name on confirmations, reminders and invoices |
| `website_url` | sprayitsolutions.com.au | The live site |
| `booking_url` | sprayitsolutions.com.au/book/ | The phone call calendar, embedded on the site. The day 4 email offers it. |
| `quote_form_url` | sprayitsolutions.com.au/contact-us/ |  |
| `privacy_url` | sprayitsolutions.com.au/privacy-policy/ | Required in marketing email |
| `review_url` | Google review link | The Reviews tab of the Google listing. Use a trigger link so it is shortened in SMS. |
| `service_area` | Australia-wide |  |
| `trade_noun` | spray foam insulation | How the work is named in a message: "your spray foam insulation enquiry" |
| `trade_verb` | insulation | The short form: "your insulation job" |
| `inspection_noun` | site inspection | What the measure-up visit is called. About one job in ten or twenty needs one, after the quote is accepted. |
| `consult_length` | 15 minute | The phone call offered in the day 4 email and on the site |
| `office_hours` | Mon to Fri, 7am to 5pm | To confirm with Glenn |
| `quote_turnaround` | 2 business days | How soon after the call the written quote usually goes out |
| `sms_signoff` | Rachael, SprayIT Solutions | Sender identification on every SMS |

> **Needs Glenn:** trading hours. Rachael's mobile, 0428 26 36 26, was
> confirmed by Glenn on the 2 October call.
>
> There is deliberately no ABN field: quotes and invoices are documents the
> client issues himself and they carry it, so repeating it in a covering email
> would create a value with no owner.

---

## 3. Custom fields

### 3.1 Contact fields, from the website webhook

| Key | Label | Type | Options |
| --- | --- | --- | --- |
| `first_name`, `last_name` | Name | Text | The form asks for both separately |
| `property_type` | Property type | Dropdown | Home, New build, Shed or garage, Factory or warehouse, Farm or agricultural, Something else |
| `building_stage` | Building stage | Dropdown | Existing building (retrofit), Under construction, Still planning |
| `areas` | Areas to insulate | Text | Roof or ceiling, Walls, Underfloor, Whole property, Not sure yet |
| `timeframe` | Timeframe | Dropdown | As soon as possible, Next 1 to 3 months, 3 months or more, Just researching |
| `heard_from` | How did you hear about us | Dropdown | Google search, Google ad, Referral from a friend, builder or tradie, Facebook, Instagram or LinkedIn, Somewhere else |
| `postcode` | Postcode | Text |  |
| `street`, `suburb` | Street, suburb | Text | Optional on the form |
| `enquiry_message` | Enquiry message | Multi-line |  |
| `phone_raw` | Phone as typed | Text | Phone itself arrives in E.164, which is what the CRM matches a person on |
| `company` | Company | Text | Commercial contacts. Asked on the first call. |

These arrive already populated. Reference them as {{contact.<key>}}. Store the human label in each dropdown, not the form value: the webhook sends home, new-build and 1-3-months, and several emails echo these fields back to the customer. The building stage arrives as stage; map it to building_stage, because it is the building's stage, not the pipeline stage.

### 3.2 Contact fields, consent evidence

| Key | Label | Type |
| --- | --- | --- |
| `consent_marketing` | Marketing consent | Dropdown: yes, no |
| `consent_text` | Consent wording shown | Multi-line |
| `consent_at` | Consent timestamp | Date |
| `consent_page` | Consent page URL | Text |

Never overwrite these on a later form fill. Under the Spam Act what matters is the wording someone actually saw, so a second submission appends a new record rather than replacing the original evidence.

### 3.3 Contact fields, attribution

| Key | Type |
| --- | --- |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id` | Text |
| `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ttclid` | Text |
| `first_touch_at` | Date |
| `first_touch_referrer`, `first_touch_landing` | Text |
| `last_touch_referrer`, `last_touch_landing` | Text |
| `source`, `form_name`, `submitted_at`, `page_title` | Text |

Set the first-touch fields only if empty. Overwriting them on every visit destroys the thing they exist to measure.

### 3.4 Contact fields, CRM-managed

| Key | Label | Type | Set by |
| --- | --- | --- | --- |
| `contact_attempts` | Contact attempts | Number | Each call logged in New Lead, Dial 1 and Dial 2 |
| `last_attempt_at` | Last attempt | Date | Each call logged |
| `preferred_contact` | Preferred contact | Dropdown: call, sms, email | Asked on the first call |
| `do_not_sms` | Do not SMS | Checkbox | Manual, on request, and by STOP |
| `ask_for_google_review` | Ask for Google review | Dropdown: Yes, No. Default Yes. | WF-01 sets Yes if empty. The owner sets No from the task at Job Completed for a job with problems, and for repeat commercial clients such as Bondor and Australian Housing. No also skips the referral email. |

Not from the website. Set by workflows or by hand. ask_for_google_review replaces a review stage: it is Yes unless the owner sets it to No from the task at Job Completed.

### 3.5 Opportunity fields

| Key | Label | Type | Stage it is set |
| --- | --- | --- | --- |
| `site_address` | Site address | Text | New Lead, on the first call |
| `access_notes` | Access notes | Multi-line | Quoting, or Inspection Required |
| `sqm_estimate` | Area, sqm | Number | Quoting, or Inspection Required |
| `product_type` | Product | Dropdown: open cell, closed cell, both | Quoting |
| `callback_at` | Callback time | Date and time | Follow-Up. Required on entry. |
| `quote_number` | Quote number | Text | Quote Sent |
| `quote_link` | Online quote | URL | Quote Sent, from the quote tool |
| `quote_sent_at` | Quote sent | Date | Quote Sent |
| `accepted_quote_option` | Accepted option | Text | Quote Accepted. Which quote the client accepted, when the job has more than one. |
| `po_number` | Purchase order | Text | Quote Accepted, where the client issues one. On commercial, entering it sets Won. |
| `foam_order_type` | Foam order | Dropdown: Stock open cell, Special order | Quote Accepted. Decides the deposit due date. |
| `deposit_amount` | Deposit amount | Monetary | Quote Accepted, where a deposit applies |
| `inspection_date` | Inspection date | Date | Inspection Required, from the inspection calendar |
| `job_date` | Install date | Date | Job Booked: the first day booked across the install calendars |
| `job_end_date` | Finish date | Date | Job Booked: the last day booked, for multi-day works |
| `vehicles_booked` | Vehicles | Multi-select: InjectaCore rig, Van, Fuso truck, Mercedes rig | Job Booked, from the install calendars. A job can use two. |
| `job_booked_at` | Install booked on | Date | Job Booked, stamped on the first booking. Decides whether the month-out check goes. |
| `crew_assigned` | Crew | Text | Job Booked, from the install calendar |
| `job_confirmed` | Date confirmed | Dropdown: Yes, No | Job Booked, by the Yes and No buttons on the reminders |
| `deposit_due_date` | Deposit due | Date | Job Booked: 1 business day before job_date for stock open cell, 7 days before for special order |
| `deposit_invoice_sent_at` | Deposit invoice sent | Date | Deposit Requested, when the owner sends the draft |
| `deposit_received_at` | Deposit received | Date | Deposit Requested, when paid |
| `variation_amount` | Variations | Monetary | Job Booked or Job Completed, as each variation is signed |
| `photos_captured` | Photos captured | Checkbox | Job Completed. Required before the job can be marked complete. |
| `invoice_number`, `invoice_sent_at` | Final invoice | Text, Date | Job Completed, when the owner sends the draft |
| `final_invoice_paid_at` | Final invoice paid | Date | Job Completed, when fully paid |
| `job_report_sent_at` | Job report sent | Date | Job Completed, when the report goes |
| `retention_amount` | Retention held | Monetary | Job Completed, before it is marked paid |
| `retention_release_date` | Retention release | Date | Job Completed, before it is marked paid |
| `lost_reason` | Lost reason | Dropdown | On Lost |

product_type, foam_order_type and vehicles_booked are the fields here that are genuinely trade-specific. For another client they become whatever their equivalent choices are.

---

## 4. Assets each message needs

| Asset | Used by | Status |
| --- | --- | --- |
| Phone call calendar | X-APPT, DIAL-03 | Needs the Systemations calendar built, embedded on the site at /book/ |
| Inspection calendar | X-INSP, C-INSP-01 | Needs building. Used after a quote is accepted. Staff attend, so no no-show handling; a cancellation alerts the owner to rebook. |
| Install calendars, one per vehicle | JOB-01, JOB-02, REM, C-MOB-01 | Four to build: the InjectaCore rig, the van, the Fuso truck and the Mercedes rig. Bookings run over several days, and one job can use two rigs on different days. Book in the platform first. Two-way sync with the owner's Apple (iCloud) calendar is the separate calendars task. |
| Quote tool with accept and decline buttons | R-QUOTE-01, C-PROP-01 | Several options per job, one accepted. Optional upgrades pending scope confirmation. |
| Trigger links, Yes and No | REM-01 to 04 | Two links, each firing WF-20 with its branch, landing on a short thank-you page |
| Invoice templates with payment schedules | DEP-02, PAY-01, C-PAY-01 | Created as drafts from the accepted quote, checked and sent by the owner. Percentage or fixed stages with due dates. Accepted quote attached, and the purchase order where there is one. |
| Contract and variation documents | Job Booked, Job Completed | Templates that fill in the client details for digital signature, including variations such as an extra 100 sqm |
| Job report template and certificate of completion | RPT-01, C-DONE-01 | Needs Glenn's existing report and certificate. Sent only after the final invoice is paid. |
| Retention claim template | RET-01 | Needs the claim format Glenn uses |
| Review link | REV-01 | Done. The link opens the Reviews tab of the Google listing. Set it up as a trigger link so it is shortened in SMS. |
| Job preparation notes | JOB-02, REM-03 | Written, in the message. Confirm the list with the crew. |
| Compliance pack | C-INSP-01, C-PROP-01, C-MOB-01 | SWMS and insurances, current copies |
| Unsubscribe link | All marketing email | The platform provides `{{unsubscribe_link}}` |
| Sending domain | All email | SPF and DKIM on the business domain |

---

## 5. The compliance line: transactional against marketing

Every message below is tagged.

**`TRANS` (transactional).** About an enquiry, appointment or job the person
already has with us. No marketing consent required. No unsubscribe link
required. Still identifies the sender, which the Spam Act requires of commercial
electronic messages generally.

**`MKTG` (marketing).** Promotional. Sends **only** when
`{{contact.consent_marketing}}` is `yes`. Must carry a functional unsubscribe.
This is the entire reason the consent fields exist. There are 7 of these:
NUR-01, NUR-02, NUR-03, NUR-04, REV-02, REV-03, C-FUT-01. None of them is an SMS.

Three rules that apply to every message:

1. **Every SMS identifies the sender.** `{{custom_values.sms_signoff}}`,
   "Rachael, SprayIT Solutions", ends every one. An unidentified SMS is the most common
   Spam Act failure.
2. **Every marketing message carries an opt-out.** The platform handles STOP
   natively and sets do-not-SMS, and `{{unsubscribe_link}}` handles email, but
   the wording still has to be there.
3. **Outbound send window: 8am to 8pm, Monday to Saturday, local time.**
   Confirmations send immediately because the person is waiting for them.
   Everything else waits. Use the platform's workflow **Wait until a time
   window** step, not a hope that nobody submits at midnight.

---

## 6. Message inventory

63 messages. Every SMS fits in one segment with the sample values and a
realistic shortened link, which was checked rather than assumed.

| ID | Channel | Trigger | Delay | Type | Reuse | Appears in |
| --- | --- | --- | --- | --- | --- | --- |
| X-ACK-01 | SMS | Enters New Lead | Within 2 minutes | TRANS | CORE | Residential · New Lead, Commercial · New Lead |
| X-ACK-02 | Email | Enters New Lead | Immediately | TRANS | CORE | Residential · New Lead |
| DIAL-01 | SMS | Enters Dial 1, after two calls back to back | About 10 seconds after the card moves | TRANS | CORE | Residential · Dial 1, Commercial · Dial 1 |
| DIAL-02 | Email | In Dial 2, no reply | Day 2 | TRANS | CORE | Residential · Dial 2, Commercial · Dial 2 |
| DIAL-03 | Email | In Dial 2, no reply | Day 4 | TRANS | CORE | Residential · Dial 2, Commercial · Dial 2 |
| DIAL-04 | Email | In Dial 2, no reply | Day 7, final | TRANS | CORE | Residential · Dial 2, Commercial · Dial 2 |
| X-APPT-01 | Email | Phone call booked | Immediately | TRANS | CORE | Residential · Dial 2, Commercial · Dial 2 |
| X-APPT-02 | SMS | Phone call booked | Immediately | TRANS | CORE | Residential · Dial 2, Commercial · Dial 2 |
| X-APPT-03 | SMS | Phone call upcoming | 24 hours before | TRANS | CORE | Residential · Dial 2, Commercial · Dial 2 |
| X-APPT-04 | SMS | Phone call upcoming | 2 hours before | TRANS | CORE | Residential · Dial 2, Commercial · Dial 2 |
| X-APPT-06 | Email | Phone call or site inspection moved | Immediately | TRANS | CORE | Residential · Dial 2, Residential · Inspection Required, Commercial · Dial 2, Commercial · Inspection Required |
| X-INSP-01 | SMS | Site inspection booked in the inspection calendar | Immediately | TRANS | CORE | Residential · Inspection Required |
| X-INSP-02 | SMS | Site inspection day | 7:00am on the day | TRANS | CORE | Residential · Inspection Required, Commercial · Inspection Required |
| R-QUOTE-01 | Email | Quote sent, enters Quote Sent | Immediately, with the online quote | TRANS | CORE | Residential · Quote Sent |
| R-QUOTE-02 | SMS | Quote sent, enters Quote Sent | Immediately | TRANS | CORE | Residential · Quote Sent |
| R-FU-01 | SMS | Quote unanswered | Day 2 | TRANS | CORE | Residential · Quote Sent |
| R-FU-02 | Email | Quote unanswered | Day 5 | TRANS | **TRADE** | Residential · Quote Sent |
| R-FU-03 | SMS | Quote unanswered | Day 10 | TRANS | CORE | Residential · Quote Sent |
| R-FU-04 | Email | Quote unanswered | Day 21, final | TRANS | CORE | Residential · Quote Sent |
| LOST-01 | Email | Declined online, or marked Lost with any reason except Unreachable, Duplicate or Spam | Next business morning | TRANS | CORE | Residential · Quote Sent |
| NUR-01 | Email | Enters Nurture | Next business morning | MKTG | **TRADE** | Residential · Nurture |
| NUR-02 | Email | In Nurture | +30 days | MKTG | **TRADE** | Residential · Nurture |
| NUR-03 | Email | In Nurture | +90 days | MKTG | CORE | Residential · Nurture |
| NUR-04 | Email | In Nurture | 12 months after entering Nurture | MKTG | CORE | Residential · Nurture |
| X-ACC-01 | Email | Enters Quote Accepted | Immediately | TRANS | CORE | Residential · Quote Accepted |
| X-ACC-02 | SMS | Enters Quote Accepted | Immediately | TRANS | CORE | Residential · Quote Accepted |
| JOB-01 | SMS | Install booked in the calendar, enters Job Booked | Immediately | TRANS | CORE | Residential · Job Booked |
| JOB-02 | Email | Install booked in the calendar, enters Job Booked | Immediately | TRANS | **TRADE** | Residential · Job Booked |
| REM-01 | Email | Job upcoming | 7 days before the job | TRANS | CORE | Residential · Job Booked, Commercial · Job Booked |
| REM-02 | SMS | Job upcoming | 7 days before the job | TRANS | CORE | Residential · Job Booked, Commercial · Job Booked |
| REM-03 | Email | Job upcoming | 48 hours before the job | TRANS | CORE | Residential · Job Booked, Commercial · Job Booked |
| REM-04 | SMS | Job upcoming | 48 hours before the job | TRANS | CORE | Residential · Job Booked, Commercial · Job Booked |
| REM-05 | SMS | They tap No on a reminder | Straight away | TRANS | CORE | Residential · Job Booked, Commercial · Job Booked |
| REM-06 | Email | Job booked more than 6 weeks ahead | 30 days before the job | TRANS | CORE | Residential · Job Booked, Commercial · Job Booked |
| JOB-04 | SMS | Job day | 6:30am on the job date | TRANS | CORE | Residential · Job Booked |
| JOB-06 | SMS | Crew running late | Sent by the crew, from a saved template | TRANS | CORE | Residential · Job Booked, Commercial · Job Booked |
| DEP-02 | Email | The owner sends the deposit invoice, enters Deposit Requested | When it is sent, from a draft prepared 14 days before the job | TRANS | CORE | Residential · Deposit Requested, Commercial · Deposit Requested |
| DEP-03 | SMS | Deposit unpaid at its due date | 4:00pm on the due date | TRANS | CORE | Residential · Deposit Requested, Commercial · Deposit Requested |
| DEP-01 | SMS | Deposit invoice marked paid | Immediately | TRANS | CORE | Residential · Deposit Requested, Commercial · Deposit Requested |
| JOB-05 | Email | Job marked complete, enters Job Completed | Immediately | TRANS | **TRADE** | Residential · Job Completed |
| PAY-01 | Email | The owner sends the final invoice | When it is sent, with the invoice attached | TRANS | CORE | Residential · Job Completed, Commercial · Job Completed |
| PAY-02 | SMS | Final invoice unpaid | Day 7 after it is sent | TRANS | CORE | Residential · Job Completed |
| PAY-03 | Email | Final invoice unpaid | Day 14 after it is sent | TRANS | CORE | Residential · Job Completed |
| RPT-01 | Email | Final invoice paid | Same day, sent by hand with the report attached | TRANS | **TRADE** | Residential · Job Completed, Commercial · Job Completed |
| REV-01 | SMS | Job completed, and Ask for Google review left on Yes | 4 weeks after the job date | TRANS | CORE | Residential · Job Completed, Commercial · Job Completed |
| REV-02 | Email | Final invoice paid | +7 days | MKTG | CORE | Residential · Job Completed |
| REV-03 | Email | Job completed | 12 months after the job | MKTG | CORE | Residential · Job Completed |
| RET-01 | Email | Retention release date reached | On the release date, sent by hand with the claim attached | TRANS | CORE | Residential · Retention Claim, Commercial · Retention Claim |
| SYS-01 | SMS | Inbound call missed | Within 60 seconds | TRANS | CORE | Always on |
| SYS-02 | SMS | Inbound SMS outside hours | Immediately | TRANS | CORE | Always on |
| C-ACK-01 | Email | Enters New Lead on the Commercial board | Immediately | TRANS | CORE | Commercial · New Lead |
| C-INSP-01 | Email | Site inspection booked on the Commercial board | Immediately | TRANS | CORE | Commercial · Inspection Required |
| C-PROP-01 | Email | Proposal sent, enters Quote Sent on the Commercial board | Immediately, with the online proposal | TRANS | CORE | Commercial · Quote Sent |
| C-PROP-02 | Email | Proposal unanswered | Day 7 | TRANS | CORE | Commercial · Quote Sent |
| C-PROP-03 | Email | Proposal unanswered | Day 21 | TRANS | CORE | Commercial · Quote Sent |
| C-FUT-01 | Email | In Nurture on the Commercial board | Every 90 days | MKTG | CORE | Commercial · Nurture |
| C-PO-01 | Email | Enters Quote Accepted on the Commercial board | Immediately | TRANS | CORE | Commercial · Quote Accepted |
| C-MOB-01 | Email | Works booked in the calendar, enters Job Booked on the Commercial board | Immediately | TRANS | **TRADE** | Commercial · Job Booked |
| C-SITE-01 | SMS | Each site day while the works run | 6:30am on the day | TRANS | CORE | Commercial · Job Booked |
| C-PROG-01 | Email | Works running, staged jobs | Weekly, Friday, from a saved template | TRANS | CORE | Commercial · Job Booked |
| C-PAY-01 | Email | Progress claim issued | Per the programme | TRANS | CORE | Commercial · Job Booked |
| C-DONE-01 | Email | Works marked complete, enters Job Completed on the Commercial board | Immediately | TRANS | **TRADE** | Commercial · Job Completed |
| C-CLOSE-01 | Email | Final claim paid on the Commercial board | +1 day | TRANS | CORE | Commercial · Job Completed |

Build the shared and residential sets first; the commercial set can follow,
since that board runs at a pace where a person writing the email is still
viable.

---

## 7. Shared: first contact, Dial 1 and Dial 2

Used by both boards. The acknowledgement, the tried-to-call text, the three Dial 2 emails, the phone call booking and the site inspection.

### X-ACK-01 · SMS · Enters New Lead, within 2 minutes · TRANS · CORE

```
Hi {{contact.first_name}}, thanks for your enquiry. We will ring you shortly to talk it through. Need us sooner? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}
```

*Stops:* Sends once. *Window:* sends immediately.

Fires before anyone has looked at the lead, so it promises only what automation can guarantee: that a person will ring.

### X-ACK-02 · Email · Enters New Lead, immediately · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** We have your enquiry, {{contact.first_name}}  
**Preheader:** We will ring you to talk it through, then send a written quote. Here is what you told us.

```
Hi {{contact.first_name}},

Thanks for getting in touch with {{custom_values.business_name}}. We have your enquiry and we will ring you shortly. During business hours that is usually within the hour.

Here is what you told us:

  Property        {{contact.property_type}}
  Needs doing     {{contact.areas}}
  Building stage  {{contact.building_stage}}
  Timeframe       {{contact.timeframe}}
  Postcode        {{contact.postcode}}

If any of that is wrong, reply to this email and we will fix it.

What happens next:

  1. We ring you for a short chat about the building and what you want from it.
  2. We send you a written quote, usually within {{custom_values.quote_turnaround}} of the call. There is no obligation.
  3. Once you are happy with the quote, we book the install date.

We quote from the call. If a job needs a look in person, we quote it first so you know the price, and visit once you are happy with it, before the install is booked.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once. *Window:* sends immediately.

Echoing their answers back cuts "did that go through?" replies and catches a wrong postcode before it costs anyone a trip. It does not promise a site visit, because only about one job in ten or twenty needs one, and that visit comes after the quote is accepted.

**Agency note.** Store the human label in each dropdown field (Home, not home) or this email echoes the raw form value.

### DIAL-01 · SMS · Enters Dial 1, after two calls back to back, about 10 seconds after the card moves · TRANS · CORE

```
Hi {{contact.first_name}}, we just tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.contact_mobile}} when it suits. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per lead. *Window:* sends immediately.

Most people will not answer a number they do not know, and most of them will reply to a text. So it goes about ten seconds after the second call, while the missed calls are still on their screen.

### DIAL-02 · Email · In Dial 2, no reply, day 2 · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Following up on your {{custom_values.trade_noun}} enquiry  
**Preheader:** We have tried to ring a couple of times. Reply with a time that suits and we will call then.

```
Hi {{contact.first_name}},

We have tried to ring you a couple of times about your enquiry, without luck. No rush at our end. We just do not want to keep ringing if now is a bad time.

The easiest thing is to reply to this email with a day and a time that suit you, and we will call then. Or ring us on {{custom_values.contact_mobile}} whenever is convenient.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* The whole sequence stops the moment they reply, book a call, or the card leaves Dial 2. *Window:* waits for the send window.

### DIAL-03 · Email · In Dial 2, no reply, day 4 · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Pick a time to talk about your {{custom_values.trade_verb}} job  
**Preheader:** Choose a time that suits you and we will ring then. It takes two clicks.

```
Hi {{contact.first_name}},

We still have not managed to catch you, so here is a simpler way. Pick a time that suits and we will ring you then:

{{custom_values.booking_url}}

It is a {{custom_values.consult_length}} call about the building and what you want from it, and it is all we need to write your quote.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Stops on reply, booking, or stage change. *Window:* waits for the send window.

The only message that offers the booking link outright. A time they chose is a call they answer.

### DIAL-04 · Email · In Dial 2, no reply, day 7, final · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Closing this one off  
**Preheader:** We could not reach you, so we will stop ringing. Nothing is lost.

```
Hi {{contact.first_name}},

We have not been able to reach you, so we will close this enquiry off rather than keep chasing.

Nothing is lost. If the job comes back around, reply to this email or ring {{custom_values.contact_mobile}} and we will pick it straight back up.

All the best with it either way.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Last in the sequence. With no reply by the next day, the card goes to Lost, reason Unreachable. *Window:* waits for the send window.

The honest close is the highest-replying message in the sequence. Do not soften it into another chase or it stops working.

### X-APPT-01 · Email · Phone call booked, immediately · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Confirmed: {{appointment.start_time}}  
**Preheader:** We will call you on {{contact.phone}}. Reschedule or cancel with one click.

```
Hi {{contact.first_name}},

You are booked in.

  When   {{appointment.start_time}}
  What   {{appointment.title}}
  Where  We call you on {{contact.phone}}

There is nothing to prepare. If it is handy, have a rough idea of what needs doing and when, but the call is mostly us listening.

Need to change it?

  Reschedule: {{appointment.reschedule_link}}
  Cancel: {{appointment.cancellation_link}}

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per booking. *Window:* sends immediately.

### X-APPT-02 · SMS · Phone call booked, immediately · TRANS · CORE

```
Booked in for {{appointment.start_time}}. We will call you on {{contact.phone}}. Change it here: {{appointment.reschedule_link}} {{custom_values.sms_signoff}}
```

*Stops:* Sends once per booking. *Window:* sends immediately.

### X-APPT-03 · SMS · Phone call upcoming, 24 hours before · TRANS · CORE

```
Reminder: your call with {{custom_values.business_short_name}} is tomorrow, {{appointment.start_time}}. Need to move it? {{appointment.reschedule_link}} {{custom_values.sms_signoff}}
```

*Stops:* Cancelled with the appointment. *Window:* waits for the send window.

### X-APPT-04 · SMS · Phone call upcoming, 2 hours before · TRANS · CORE

```
Your call with {{custom_values.business_short_name}} is at {{appointment.start_time}}, about 2 hours away. Talk soon. {{custom_values.sms_signoff}}
```

*Stops:* Cancelled with the appointment. *Window:* sends immediately.

### X-APPT-06 · Email · Phone call or site inspection moved, immediately · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your booking has moved  
**Preheader:** The new time is {{appointment.start_time}}. If that is not right, ring us.

```
Hi {{contact.first_name}},

Your booking with us has moved.

  New time   {{appointment.start_time}}
  What       {{appointment.title}}

If that is not right, ring us on {{custom_values.contact_mobile}} and we will sort it out.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per change. *Window:* sends immediately.

Used for the phone call and the site inspection. The appointment title says which.

### X-INSP-01 · SMS · Site inspection booked in the inspection calendar, immediately · TRANS · CORE

```
Hi {{contact.first_name}}, your {{custom_values.inspection_noun}} is booked for {{opportunity.inspection_date}} at {{opportunity.site_address}}. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per booking. *Window:* sends immediately.

### X-INSP-02 · SMS · Site inspection day, 7:00am on the day · TRANS · CORE

```
Morning {{contact.first_name}}, we are coming to you today for the {{custom_values.inspection_noun}}. Any change, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}
```

*Stops:* Cancelled or re-queued with the appointment. *Window:* sends immediately.
---

## 8. Residential: quote to decision

### R-QUOTE-01 · Email · Quote sent, enters Quote Sent, immediately, with the online quote · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your quote from {{custom_values.business_name}}  
**Preheader:** Quote {{opportunity.quote_number}}. View it online and accept it with one click. Questions welcome.

```
Hi {{contact.first_name}},

Your quote is ready. Quote number {{opportunity.quote_number}}.

View it, and accept or decline it online, here: {{opportunity.quote_link}}

It covers {{contact.areas}} at {{opportunity.site_address}}. If we have quoted more than one option, for example open cell or closed cell, or two different thicknesses, each option has its own accept button. Accept the one you want.

A few things worth saying plainly:

  The price includes everything. No separate charge for access, setup or clean-up.
  It is valid for 30 days, mostly because material costs move.
  Accepting online is all it takes. A yes on the phone works too.
  If anything in it does not make sense, ring us. We would rather explain it than have you accept something you are unsure about.

Any questions at all, {{custom_values.contact_mobile}}.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once per quote. *Window:* sends immediately.

**Agency note.** The quote tool sends its own email with the view and accept button. Paste this body into that email template so the button and this wording arrive together. Optional upgrades that change the total as the customer ticks them (for example R2.5 to R4) are pending scope confirmation: not built, and not mentioned to customers until confirmed.

### R-QUOTE-02 · SMS · Quote sent, enters Quote Sent, immediately · TRANS · CORE

```
Hi {{contact.first_name}}, your quote is in your inbox. You can accept it online from the email. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per quote. *Window:* sends immediately.

### R-FU-01 · SMS · Quote unanswered, day 2 · TRANS · CORE

```
Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}
```

*Stops:* The whole follow-up stops on reply, acceptance, decline, or when the card leaves Quote Sent. *Window:* waits for the send window.

### R-FU-02 · Email · Quote unanswered, day 5 · TRANS · **TRADE**

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Why our number might look different  
**Preheader:** Two numbers for the same job can look nothing alike. Here is why.

```
Hi {{contact.first_name}},

If you are comparing quotes, one thing is worth knowing, because it is the reason two numbers for the "same" job can look nothing alike.

Insulation is sold on R-value, and R-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind.

A real wall has all of those. Cut products leave edges, edges leave gaps, and air moves through gaps carrying heat with it. That path is not in the rating at all, which is why two walls rated the same can feel completely different to live in.

We wrote the whole thing up here, with a diagram: {{custom_values.website_url}}/what-is-spray-foam/#r-value

Not trying to talk you out of anything. Just make sure you are comparing the finished wall, not the number on the bag.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Stops on reply, acceptance, decline, or stage change. *Window:* waits for the send window.

The one message in the journey that makes an argument. It works because it explains something the customer did not know, not because it sells.

**Agency note.** Trade specific. For another client, replace it with the thing customers get wrong when comparing quotes in that trade. Keep the shape: "here is the thing nobody tells you", not "here is why we are better".

### R-FU-03 · SMS · Quote unanswered, day 10 · TRANS · CORE

```
Hi {{contact.first_name}}, still thinking it over, or has something changed? Either is fine, we just want to know whether to keep it open. {{custom_values.sms_signoff}}
```

*Stops:* Stops on reply, acceptance, decline, or stage change. *Window:* waits for the send window.

A real question outperforms "just checking in", because it can be answered in one word.

### R-FU-04 · Email · Quote unanswered, day 21, final · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Should we close this off?  
**Preheader:** No reply, so we will assume the timing is off. Tell us if we are wrong.

```
Hi {{contact.first_name}},

We have not heard back on quote {{opportunity.quote_number}}, so we will assume the timing is not right and close it off.

If that is wrong, reply and we will pick it straight back up. If you went with someone else, that is completely fine, and if you can tell us why, it genuinely helps.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Last in the sequence. The card is then moved to Nurture, Lost or Follow-Up, never left sitting. *Window:* waits for the send window.

The "why" ask feeds the Lost reason field, which is what makes the Price against Chose batts split on the board real rather than guessed.

### LOST-01 · Email · Declined online, or marked Lost with any reason except Unreachable, Duplicate or Spam, next business morning · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Thanks for considering us, {{contact.first_name}}  
**Preheader:** No hard feelings. The door stays open.

```
Hi {{contact.first_name}},

Thanks for giving us the chance to quote on {{opportunity.site_address}}. If you went another way, we hope it goes well.

If the timing changes, or the job grows, reply to this and we will pick it up where we left off. We keep the details, so it will not start from scratch.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once. *Window:* waits for the send window.

A graceful goodbye is the cheapest marketing there is. A surprising number of "went with someone else" jobs come back after the other quote falls over.
---

## 9. Nurture

Marketing. Sends only when `{{contact.consent_marketing}}` is `yes`. Every one carries an unsubscribe.

### NUR-01 · Email · Enters Nurture, next business morning · MKTG · **TRADE**

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** The bit about R-value nobody explains  
**Preheader:** Worth knowing before you get anywhere near comparing quotes.

```
Hi {{contact.first_name}},

You mentioned the timing was not right, which is fair enough. Here is something worth knowing before you get to the point of comparing quotes.

R-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind. A real wall has all of those, and air moving through gaps carries heat with it.

Which is why two walls rated the same can feel completely different.

The full explanation, with a diagram of both walls: {{custom_values.website_url}}/what-is-spray-foam/#r-value

No rush from us. When it comes back around, we will be here.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops on unsubscribe or when they come back. *Window:* waits for the send window.

### NUR-02 · Email · In Nurture, +30 days · MKTG · **TRADE**

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Where the heat actually goes  
**Preheader:** A third through the roof, more through the walls, and the floor nobody thinks about.

```
Hi {{contact.first_name}},

A third of your heating leaves through the roof, more through the walls, and the rest through the floor. The floor is the one almost nobody insulates, and it is the one people notice most once it is done.

There is an interactive version of this on our site. Scroll and the house seals itself while the meter drops: {{custom_values.website_url}}

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops on unsubscribe or when they come back. *Window:* waits for the send window.

### NUR-03 · Email · In Nurture, +90 days · MKTG · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Still on the list?  
**Preheader:** If the project is still on the horizon, do nothing. If it is off the table, one click and we stop.

```
Hi {{contact.first_name}},

We have been sending you the occasional note since you enquired. If the project is still somewhere on the horizon, no action needed and we will keep in touch now and then.

If it is off the table, unsubscribe below and we will leave you alone. No hard feelings.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops on unsubscribe or when they come back. *Window:* waits for the send window.

A permission reset at 90 days keeps the list clean and the deliverability healthy. It is also the honest thing to do.

### NUR-04 · Email · In Nurture, 12 months after entering nurture · MKTG · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** A year on from your quote  
**Preheader:** Plans and budgets change. If the job is back on, we can refresh the quote quickly.

```
Hi {{contact.first_name}},

It is about a year since we quoted on {{opportunity.site_address}}, quote {{opportunity.quote_number}}. Plenty of jobs come back around after a year or two, once the budget or the timing changes.

If yours has, reply to this email and we will refresh the quote against current material prices. If nothing about the building has changed, that is usually quick.

If it is off the table for good, unsubscribe below and we will stop writing.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops on unsubscribe or when they come back. *Window:* waits for the send window.

Quotes from Nurture regularly come back after one or two years. Everyone in Nurture also gets a call at twelve months, whether or not they opted in to email.
---

## 10. Quote accepted, booking and reminders

### X-ACC-01 · Email · Enters Quote Accepted, immediately · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Thanks for going ahead, {{contact.first_name}}  
**Preheader:** What happens from here: the install date, the reminders, and the deposit closer to the day.

```
Hi {{contact.first_name}},

Thanks for accepting quote {{opportunity.quote_number}}. Here is how it runs from here.

  1. We book your install date and confirm it with you by text and email.
  2. We remind you before the job, a week out and two days out, and a month out if it is booked well ahead, and ask you to confirm the date still works.
  3. Where a deposit applies, the invoice comes about two weeks before the job, not now.
  4. The crew arrives on the day and does the work. The final invoice follows when the job is complete.

If anything needs checking on site before we book, we will ring you to arrange that first.

Anything at all in the meantime, ring {{custom_values.contact_mobile}}.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once per job. Not sent for an add-on quote on a job already under way. Every sales sequence on the card is stopped at the same moment. *Window:* sends immediately.

Deliberately no deposit request. A job accepted today might be installed in three months, and a deposit invoice that early sits unpaid and confuses everyone.

### X-ACC-02 · SMS · Enters Quote Accepted, immediately · TRANS · CORE

```
Thanks {{contact.first_name}}, quote accepted. We will be in touch shortly to book your install date. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per job. Not sent for an add-on quote. *Window:* sends immediately.

### JOB-01 · SMS · Install booked in the calendar, enters Job Booked, immediately · TRANS · CORE

```
Hi {{contact.first_name}}, your {{custom_values.trade_verb}} job is booked for {{opportunity.job_date}}. Prep notes are in your email. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per booking, and again if the date moves. *Window:* waits for the send window.

### JOB-02 · Email · Install booked in the calendar, enters Job Booked, immediately · TRANS · **TRADE**

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your job is booked for {{opportunity.job_date}}  
**Preheader:** Booked for {{opportunity.job_date}}. Five things to do before we arrive.

```
Hi {{contact.first_name}},

You are in the diary.

  Date    {{opportunity.job_date}}
  Where   {{opportunity.site_address}}
  Crew    {{opportunity.crew_assigned}}

We will check in before the job, and ask you to confirm the date still works.

To help us get in and out cleanly, before we arrive:

  Clear access to {{contact.areas}}. We need room to work and to get the hose through.
  Move anything you would rather not have dust near.
  Make sure we can park close. The rig runs off the truck.
  Pets somewhere else for the day, please.
  Somebody over 18 on site to let us in.

While we are spraying, the area needs to be empty of people and pets. Afterwards the space needs time before you use it again. That is anywhere from about an hour to a full day depending on which foam the job calls for, and the crew will tell you which applies to yours before they leave.

Anything you are unsure about, ring {{custom_values.contact_mobile}}.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per booking. *Window:* waits for the send window.

Worth checking this list with the crew rather than the office, because the crew know what actually goes wrong on arrival. Re-occupancy is product dependent: as little as an hour for some foams, up to 24 hours for others, so the crew give the figure on the day.

**Agency note.** Trade specific. The preparation list is the job, and for another client it is their own list.

### REM-01 · Email · Job upcoming, 7 days before the job · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your job is a week away. Does the date still work?  
**Preheader:** {{opportunity.job_date}} at {{opportunity.site_address}}. One tap to confirm, or to tell us it does not work.

```
Hi {{contact.first_name}},

A reminder that we are booked to do the work at {{opportunity.site_address}} on {{opportunity.job_date}}.

Does that date still work?

  Yes, see you then: {{trigger_link.confirm_yes}}
  No, I need to change it: {{trigger_link.confirm_no}}

If it no longer works, a week of notice means we can move the crew and the rig to another job and find you a new date. If you tap No, we will ring you to rearrange.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Cancelled if the booking is cancelled. Re-queued if the date moves. Skipped if the job was booked less than 7 days out. *Window:* waits for the send window.

Yes is recorded on the card and nothing else happens. No goes to the team straight away. Nothing is rescheduled automatically.

**Agency note.** Yes and No are trigger links. Each fires WF-22 with its own branch and lands on a short thank-you page. The same two links are used in all five reminders, REM-01 to REM-04 and REM-06.

### REM-02 · SMS · Job upcoming, 7 days before the job · TRANS · CORE

```
Hi {{contact.first_name}}, we are with you on {{opportunity.job_date}}. Still OK? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}
```

*Stops:* As REM-01. *Window:* waits for the send window.

### REM-03 · Email · Job upcoming, 48 hours before the job · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your job is in 2 days. Please confirm.  
**Preheader:** {{opportunity.job_date}} at {{opportunity.site_address}}. One tap to confirm the job is still on.

```
Hi {{contact.first_name}},

We are with you in two days, on {{opportunity.job_date}} at {{opportunity.site_address}}.

Is everything still on?

  Yes, see you then: {{trigger_link.confirm_yes}}
  No, I need to change it: {{trigger_link.confirm_no}}

A quick check of the preparation list before we arrive: clear access to {{contact.areas}}, parking close for the truck, pets somewhere else for the day, and somebody over 18 home to let us in.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Cancelled if the booking is cancelled. Re-queued if the date moves. *Window:* waits for the send window.

Replaces the old afternoon-before text. Two days of notice is enough to move a crew; the afternoon before was not.

### REM-04 · SMS · Job upcoming, 48 hours before the job · TRANS · CORE

```
Hi {{contact.first_name}}, see you in 2 days, {{opportunity.job_date}}. Still on? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}
```

*Stops:* As REM-03. *Window:* waits for the send window.

### REM-05 · SMS · They tap No on a reminder, straight away · TRANS · CORE

```
Thanks for letting us know, {{contact.first_name}}. We will ring you shortly to find a new date. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per booking. *Window:* sends immediately.

Nothing is moved automatically. A person rings, agrees the new date, and moves the crew and the rig.

### REM-06 · Email · Job booked more than 6 weeks ahead, 30 days before the job · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** A month to go: still on track for {{opportunity.job_date}}?  
**Preheader:** A quick check that the date still works. One tap either way.

```
Hi {{contact.first_name}},

We are booked to do the work at {{opportunity.site_address}} on {{opportunity.job_date}}, about a month from now.

Is that still on schedule at your end?

  Yes, still on track: {{trigger_link.confirm_yes}}
  No, things have moved: {{trigger_link.confirm_no}}

If it has moved, a month of notice lets us find you a better date and put the crew on other work. If you tap No, we will ring you to rearrange.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Only when the booking was made more than 6 weeks before the job. Cancelled if the booking is cancelled. Re-queued if the date moves. *Window:* waits for the send window.

Glenn raised this on the call, for jobs booked months out, where a builder's programme often slips. Easy to drop if it is not wanted.

### JOB-04 · SMS · Job day, 6:30am on the job date · TRANS · CORE

```
Morning {{contact.first_name}}, {{opportunity.crew_assigned}} and the crew are on the way to you now. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per job day. Cancelled if the booking moves. *Window:* sends immediately.

### JOB-06 · SMS · Crew running late, sent by the crew, from a saved template · TRANS · CORE · manual send

```
Hi {{contact.first_name}}, running about 30 minutes behind on the way to you. Sorry about that, see you shortly. {{custom_values.sms_signoff}}
```

*Stops:* Manual. One tap from the mobile app. *Window:* sends immediately.

Not automated. A saved snippet the crew can send from the app in one tap, because the alternative is a customer standing at the window at 7:30 wondering.
---

## 11. Deposit

Timed to the install date and the foam, never to the booking.

### DEP-02 · Email · The owner sends the deposit invoice, enters Deposit Requested, when it is sent, from a draft prepared 14 days before the job · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Deposit for your job on {{opportunity.job_date}}  
**Preheader:** Deposit invoice attached, due {{opportunity.deposit_due_date}}. Your accepted quote is attached too.

```
Hi {{contact.first_name}},

Your deposit invoice is attached for the work booked at {{opportunity.site_address}} on {{opportunity.job_date}}.

  Deposit   {{opportunity.deposit_amount}}
  Due       {{opportunity.deposit_due_date}}

Your accepted quote is attached as well. It carries the terms and conditions.

Most deposits are due the business day before the job. If your foam is a special order, the deposit is due a week before, because that material is made and shipped for your job.

Payment details are on the invoice. When it lands we send a one-line confirmation, so there is no need to ring and check.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per job. *Window:* waits for the send window.

Never at booking. A draft is prepared two weeks before the install date, which is when Glenn said on the call he generally sends deposit invoices, and the owner checks it and sends it. A job booked months ahead never sits on an unpaid invoice.

**Agency note.** Invoices are not sent automatically: the workflow creates a draft and the owner presses send, as Glenn asked on the call. Once he has settled how he wants them set out, the send can be automated. Deposits are a liability in the accounts until the job is done, not sales income: map the deposit item in Xero to the deposit liability account. No card storage and no automatic charging.

### DEP-03 · SMS · Deposit unpaid at its due date, 4:00pm on the due date · TRANS · CORE

```
Hi {{contact.first_name}}, we have not received your deposit of {{opportunity.deposit_amount}} yet. If you have paid, please reply with the remittance. {{custom_values.sms_signoff}}
```

*Stops:* Sends once. Not sent if the deposit is marked paid before 4pm. *Window:* waits for the send window.

No reminder before the due date: Xero already sends its own. This goes only when the deposit is actually late, at the same moment the team is told, so nobody has to type it.

**Agency note.** Decide which system sends invoice reminders, the platform or Xero, so a customer never gets both. If Xero keeps its reminders, switch off the platform's own invoice reminders for that invoice type.

### DEP-01 · SMS · Deposit invoice marked paid, immediately · TRANS · CORE

```
Deposit received, thanks {{contact.first_name}}. You are all set for {{opportunity.job_date}}. {{custom_values.sms_signoff}}
```

*Stops:* Sends once. Only on jobs where a deposit applies. *Window:* waits for the send window.

Silence after a payment is the thing customers hate most. This is one line and it stops the "did you get it?" call.
---

## 12. Job completed and payment

### JOB-05 · Email · Job marked complete, enters Job Completed, immediately · TRANS · **TRADE**

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** All done at {{opportunity.site_address}}  
**Preheader:** Thanks for having us. What we did, how to live with it, and what comes next.

```
Hi {{contact.first_name}},

The job is finished. Thanks for having us.

What we did:

  {{contact.areas}}, using {{opportunity.product_type}} foam
  {{opportunity.sqm_estimate}} sqm

Living with it:

  There is nothing to maintain. It does not settle, sag or need topping up.
  If you ever cut into it for a new downlight or a pipe, seal it back up. An opening in a sealed layer costs more than the same opening in an unsealed one.
  You may notice the place holds temperature longer and is quieter. Both are the foam doing its job.

The final invoice is on its way separately. Once it is paid, we send your job report, with photos of the work and the certificate of completion your building surveyor may ask for.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once. *Window:* waits for the send window.

The report and the certificates are deliberately not in this email. They go once the final invoice is paid.

### PAY-01 · Email · The owner sends the final invoice, when it is sent, with the invoice attached · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Invoice {{opportunity.invoice_number}}  
**Preheader:** Invoice {{opportunity.invoice_number}} attached, with your accepted quote. Due dates are on it.

```
Hi {{contact.first_name}},

Invoice {{opportunity.invoice_number}} is attached for the work at {{opportunity.site_address}}.

Also attached:

  Your accepted quote, which carries the terms and conditions
  Your purchase order, where there is one

Payment details are on the invoice. If it is paid in stages, each amount is listed with its own due date.

Any questions about it, ring {{custom_values.contact_mobile}}.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per invoice. *Window:* waits for the send window.

**Agency note.** Created as a draft when the job is marked complete, checked and sent by the owner, as Glenn asked on the call; the send can be automated once he has settled the layout. Invoices sync to Xero. Only GST-free invoices have been seen reaching Xero so far and these carry GST, so test a GST invoice before promising the sync. If marking an invoice paid in the platform before the bank transfer clears upsets the bookkeeper's reconciliation, switch off the payment receipt sync and let Xero record the payment.

### PAY-02 · SMS · Final invoice unpaid, day 7 after it is sent · TRANS · CORE

```
Hi {{contact.first_name}}, a reminder that invoice {{opportunity.invoice_number}} is due. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}
```

*Stops:* Stops dead the moment payment is marked. *Window:* waits for the send window.

**Agency note.** Xero sends its own invoice reminders. Decide which system sends them so a customer never gets both, and switch the other off.

### PAY-03 · Email · Final invoice unpaid, day 14 after it is sent · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Invoice {{opportunity.invoice_number}} is now overdue  
**Preheader:** A copy is attached. If something is wrong with it, ring us and we will sort it.

```
Hi {{contact.first_name}},

Invoice {{opportunity.invoice_number}} is now overdue. A copy is attached.

If there is a problem with it, or you need a different arrangement, ring {{custom_values.contact_mobile}} and we will sort it out. We would much rather talk than chase.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Stops dead the moment payment is marked. A reminder sent after someone has paid does more damage than the reminder was worth. *Window:* waits for the send window.

### RPT-01 · Email · Final invoice paid, same day, sent by hand with the report attached · TRANS · **TRADE** · manual send

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your job report for {{opportunity.site_address}}  
**Preheader:** Photos, what we installed, and the certificate of completion for your building surveyor.

```
Hi {{contact.first_name}},

Thanks for settling the final invoice. Your job report is attached.

It includes:

  Photos of the finished work
  What we installed, where, and the product used
  The certificate of completion, which your building surveyor may ask for

Keep it with your building records. If the surveyor needs anything else from us, reply to this email.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Manual. Sent once, from a saved template, by whoever marks the invoice paid. *Window:* waits for the send window.

Only ever sent once the final invoice is fully paid. A task to send it is created the moment the invoice is marked paid.

### REV-01 · SMS · Job completed, and Ask for Google review left on Yes, 4 weeks after the job date · TRANS · CORE

```
Hi {{contact.first_name}}, how is it going since the job? If you are happy with it, a Google review really helps: {{custom_values.review_url}} {{custom_values.sms_signoff}}
```

*Stops:* Ask once. Do not chase reviews. Not sent if Ask for Google review is No. *Window:* waits for the send window.

Asks how it is going first, then for the review. Once, by text, four weeks after the job, inside the four to six weeks agreed. When the job is marked complete the owner gets a task to leave Ask for Google review on Yes or set it to No, for a job with problems or a repeat commercial client.

### REV-02 · Email · Final invoice paid, +7 days · MKTG · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Know anyone else with the same problem?  
**Preheader:** Most of our work is word of mouth. You would know who.

```
Hi {{contact.first_name}},

Hope the place is holding its temperature.

Most of our work comes from people passing our name on. If someone you know is fighting the same problem, send them our way or pass on {{custom_values.contact_mobile}}.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

You are getting this because you agreed to hear from us. {{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes, and Ask for Google review is Yes. A job the owner set to No gets no referral ask either. *Window:* waits for the send window.

### REV-03 · Email · Job completed, 12 months after the job · MKTG · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** A year on, how is it going?  
**Preheader:** It has been a year since {{opportunity.site_address}}. Tell us how it is holding up.

```
Hi {{contact.first_name}},

It has been about a year since we did the work at {{opportunity.site_address}}. No agenda here, we just like knowing how jobs hold up.

If anything is not as you expected, tell us and we will come and look.

And if you have taken on more of the building since, the rest of it is usually easier the second time, because we already know the place.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. *Window:* waits for the send window.
---

## 13. Retention

### RET-01 · Email · Retention release date reached, on the release date, sent by hand with the claim attached · TRANS · CORE · manual send

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Retention release, {{opportunity.site_address}}  
**Preheader:** The retention period has ended. Our claim for {{opportunity.retention_amount}} is attached.

```
Hi {{contact.first_name}},

The retention period on {{opportunity.site_address}} ended on {{opportunity.retention_release_date}}. Our claim for the retention of {{opportunity.retention_amount}} is attached, with the original invoice and your purchase order for reference.

If anything needs to happen before it is released, a defects inspection or a sign-off, tell us and we will arrange it.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Manual. Sent once per retention, from a saved template. *Window:* waits for the send window.

A retention can sit for six to twelve months, which is long enough to forget it. The task on the release date is what stops that.
---

## 14. Always on

### SYS-01 · SMS · Inbound call missed, within 60 seconds · TRANS · CORE

```
Sorry we missed your call. Reply here and we will get straight back to you, or we will ring you shortly. {{custom_values.sms_signoff}}
```

*Stops:* Once per caller per day. *Window:* sends immediately.

For a trade business where the phone rings while someone is up a ladder, this is the single highest-value automation on the list.

### SYS-02 · SMS · Inbound SMS outside hours, immediately · TRANS · CORE

```
Thanks for your message. We are back {{custom_values.office_hours}} and will reply first thing. Urgent? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}
```

*Stops:* Once per contact per day, not once per message. *Window:* sends immediately.
---

## 15. Commercial messages

Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.

### C-ACK-01 · Email · Enters New Lead on the Commercial board, immediately · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your enquiry, {{contact.first_name}}  
**Preheader:** We will call to scope it. Five things that make that call useful.

```
Hi {{contact.first_name}},

Thanks for the enquiry regarding {{contact.property_type}} at {{contact.postcode}}.

We will call you shortly to scope it. Before that call it helps to know:

  Approximate area, in square metres
  What the space is used for, and any temperature requirement
  Whether the building is occupied or operating during the works
  Programme dates, if they are set
  Who else needs to be involved in the decision

We work {{custom_values.service_area}} and hold current insurances and SWMS documentation, which we can supply on request.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once. The SMS acknowledgement X-ACK-01 goes too. *Window:* sends immediately.

Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.

### C-INSP-01 · Email · Site inspection booked on the Commercial board, immediately · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Site inspection confirmed, {{opportunity.inspection_date}}  
**Preheader:** Confirmed for {{opportunity.inspection_date}}. Inductions, PPE, access and a site contact, please.

```
Hi {{contact.first_name}},

Confirmed for {{opportunity.inspection_date}} at {{opportunity.site_address}}.

Please let us know before the visit:

  Site induction requirements, and how long they take
  PPE beyond standard
  Access arrangements, including any permits or escorts
  A site contact and mobile for the day

We will bring insurances and SWMS. If you need those in advance for your own records, reply and we will send them through.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per booking. X-INSP-02 sends the morning text. *Window:* sends immediately.

### C-PROP-01 · Email · Proposal sent, enters Quote Sent on the Commercial board, immediately, with the online proposal · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Proposal, {{opportunity.site_address}}  
**Preheader:** Specification, programme and compliance documents included. Accept online, or by purchase order.

```
Hi {{contact.first_name}},

Our proposal is ready.

  Scope       {{contact.areas}}
  Area        {{opportunity.sqm_estimate}} sqm
  Product     {{opportunity.product_type}}
  Reference   {{opportunity.quote_number}}

View and accept it online here: {{opportunity.quote_link}}

It includes the specification, programme, and the compliance documentation you will need for your own records. If it carries more than one option, each has its own accept button. A purchase order or a signed acceptance works just as well, whichever your procurement process needs.

If you need it broken down differently for internal approval, or split into stages, tell us what shape it needs to be in and we will reissue it.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once per proposal. *Window:* waits for the send window.

The offer to reformat is deliberate. Losing a commercial job because the numbers were not in the shape procurement needed is an avoidable loss.

### C-PROP-02 · Email · Proposal unanswered, day 7 · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Anything you need on {{opportunity.quote_number}}?  
**Preheader:** References, insurances, a revised breakdown. And is there a decision date?

```
Hi {{contact.first_name}},

Checking whether you need anything further on the proposal for {{opportunity.site_address}}. References, insurances, a site visit for your own team, or a revised breakdown, all easy.

Also useful for us: is there a decision date we should be working to?

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Stops on reply, acceptance, or stage change. *Window:* waits for the send window.

### C-PROP-03 · Email · Proposal unanswered, day 21 · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** {{opportunity.quote_number}}, where does this sit?  
**Preheader:** Live, deferred, or gone elsewhere. Any answer helps us hold capacity.

```
Hi {{contact.first_name}},

Following up on {{opportunity.quote_number}}. Happy either way, we just need to know whether to hold capacity.

  Still live, decision pending
  Deferred to a later budget
  Gone elsewhere

Any of those is a useful answer.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Stops on reply, acceptance, or stage change. *Window:* waits for the send window.

### C-FUT-01 · Email · In Nurture on the Commercial board, every 90 days · MKTG · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Still on the plan for {{opportunity.site_address}}?  
**Preheader:** A quarterly check-in, nothing more. Tell us when the budget cycle comes around.

```
Hi {{contact.first_name}},

You mentioned {{opportunity.site_address}} was a future-budget project, so this is the quarterly check-in as promised.

If the budget cycle has come around, we can refresh the proposal against current material pricing within a week. If it has moved further out, tell us the quarter and we will leave you alone until then.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops when the card moves back to Quote Sent. *Window:* waits for the send window.

### C-PO-01 · Email · Enters Quote Accepted on the Commercial board, immediately · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Thanks for the go-ahead, {{opportunity.site_address}}  
**Preheader:** To book the works in we need four things. Programme confirmed within two working days.

```
Hi {{contact.first_name}},

Thanks for accepting {{opportunity.quote_number}} for {{opportunity.site_address}}. To book the works in, we need:

  A purchase order, if your business issues one
  A site contact and their mobile
  Induction requirements for the crew
  Access windows, and any shutdown or quiet periods

Once those are with us we confirm the programme within two working days. If you accepted online and your business does not use purchase orders, the first line does not apply.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once per job. Not sent for an add-on quote. A weekly task chases the purchase order where one is needed. *Window:* waits for the send window.

The thank-you and the paperwork in one email, because a facilities manager wants the list, not a card.

### C-MOB-01 · Email · Works booked in the calendar, enters Job Booked on the Commercial board, immediately · TRANS · **TRADE**

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Works booked: {{opportunity.site_address}}  
**Preheader:** Start {{opportunity.job_date}}. SWMS, insurances and crew list attached. Four things we need from you.

```
Hi {{contact.first_name}},

The works at {{opportunity.site_address}} are booked.

  Start       {{opportunity.job_date}}
  Completion  {{opportunity.job_end_date}}
  Crew        {{opportunity.crew_assigned}}
  Reference   {{opportunity.po_number}}

Attached: SWMS, insurances, and the crew list for induction.

We need from you:

  Induction booked for the crew before the start date
  Confirmed access and any permits
  Power and water availability on site
  Confirmation the area will be clear of other trades while we spray

That last one matters more than it sounds. The area has to be free of other trades during application and cure.

You will get a reminder 7 days and 48 hours before the start, with a one-tap way to confirm the date still works.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per booking. *Window:* waits for the send window.

### C-SITE-01 · SMS · Each site day while the works run, 6:30am on the day · TRANS · CORE

```
Morning {{contact.first_name}}, our crew is on site at {{opportunity.site_address}} today, led by {{opportunity.crew_assigned}}. Any issue, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}
```

*Stops:* Once per site day. *Window:* sends immediately.

Goes to the site contact, who is often not the person who signed the purchase order. Set the site contact on the card when the works are booked.

### C-PROG-01 · Email · Works running, staged jobs, weekly, friday, from a saved template · TRANS · CORE · manual send

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Progress update: {{opportunity.site_address}}  
**Preheader:** Where the works are up to, what is next, and anything we need from you.

```
Hi {{contact.first_name}},

Weekly update on {{opportunity.site_address}}.

  Completed this week   [areas and sqm]
  Next week             [areas and staging]
  We need from you      [access, other trades, sign-off]

Photos attached. The claim for this stage follows per the programme.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Manual. Sent from the template each Friday the works are live. *Window:* waits for the send window.

Bracketed lines are filled in by hand. Automating a progress report produces a report nobody reads, so this is a template with a Friday task attached, not a workflow.

### C-PAY-01 · Email · Progress claim issued, per the programme · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Progress claim {{opportunity.invoice_number}}  
**Preheader:** Claim {{opportunity.invoice_number}} attached with supporting photos, the accepted quote and your PO.

```
Hi {{contact.first_name}},

Progress claim {{opportunity.invoice_number}} is attached for works at {{opportunity.site_address}}.

  Claim covers   [stage or percentage]
  Terms          [payment terms]

Supporting photos and any signed variations are included, with the accepted quote and purchase order {{opportunity.po_number}} for reference.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per claim. *Window:* waits for the send window.

Needs Glenn: payment terms for commercial work, and whether progress claims follow a percentage, a milestone, or a monthly cycle.

### C-DONE-01 · Email · Works marked complete, enters Job Completed on the Commercial board, immediately · TRANS · **TRADE**

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Works complete: {{opportunity.site_address}}  
**Preheader:** The works are done. Final claim to follow, then the close-out pack once it is paid.

```
Hi {{contact.first_name}},

Works at {{opportunity.site_address}} are complete.

The final claim follows separately, with the accepted quote and your purchase order attached. Once it is paid we send the close-out pack:

  Completion photos, by area
  Product data for the {{opportunity.product_type}} foam applied
  The certificate of completion for the building surveyor
  Any variations agreed on site, itemised

If your handover process needs a sign-off form or a walk-through, name a time and we will be there.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once. *Window:* waits for the send window.

### C-CLOSE-01 · Email · Final claim paid on the Commercial board, +1 day · TRANS · CORE

**From:** {{custom_values.from_name_contact}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Thanks, {{contact.first_name}}  
**Preheader:** Final payment received. One favour, and a promise about next time.

```
Hi {{contact.first_name}},

Final payment on {{opportunity.site_address}} is in, thank you. The close-out pack is on its way separately.

One favour. If the works went the way you needed, would you be willing to act as a reference for a future client of similar scale? A phone call, nothing written.

And for next time: we hold the specification and site notes, so a second stage or another site can be scoped without starting from scratch.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}
```

*Stops:* Sends once. *Window:* waits for the send window.

A reference from a facilities manager is worth more on a commercial tender than any number of homeowner reviews. Ask for it while the job is fresh.

> **Needs Glenn:** payment terms for commercial work, and whether progress
> claims follow a percentage, a milestone, or a monthly cycle.

---

## 16. Build order

Do not build all 63 at once. In order of what earns most:

1. **SYS-01**, missed call text-back. Highest return of anything here.
2. **X-ACK-01, X-ACK-02, alerts 1 and 7**, the two minute acknowledgement, the new lead email, and the 15 minute call timer.
3. **DIAL-01 to 04**, the tried-to-call text and the three Dial 2 emails, with the honest close.
4. **Quoting, alert 14**, the hand-over to the owner, by text and email, so no quote waits unseen.
5. **R-QUOTE, R-FU-01 to 04, LOST-01**, the quote with its accept button, the follow-up that converts quotes, and the goodbye.
6. **X-ACC-01, X-ACC-02, JOB-01, JOB-02, REM-01 to 05**, acceptance, the booking, and the confirm reminders.
7. **DEP-01 to 03, PAY-01 to 03**, the draft deposit and final invoices for the owner to send, the deposit timing by foam type, and the late-deposit text.
8. **JOB-04, JOB-05, RPT-01**, the job day, the completion note, and the job report once the invoice is paid.
9. **X-APPT, X-INSP**, the phone call booking and the site inspection, used by a minority of jobs.
10. **REV-01**, the review ask, gated on Ask for Google review.
11. **REM-06**, the month-out check for jobs booked far ahead. Easy to drop.
12. **NUR-01 to 04, REV-02, REV-03**, once there is a consented list worth mailing.
13. **RET-01 and the commercial set**, last. That board moves slowly enough that a person writing the email is still viable meanwhile.
