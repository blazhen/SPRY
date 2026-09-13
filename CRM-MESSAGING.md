# CRM Messaging Kit

Every SMS and email the pipelines send, with the sender, subject and preheader
for each, plus the fields and custom values they depend on. Built for
Systemations.

**Generated.** This file is produced from
`client-journey-onepage/journey-data.js`, which is also what renders the
customer journey page. Edit the data file, run the generator, and both stay in
step. Editing this file by hand will be overwritten.

**This is written as a template.** Nothing client-specific is hardcoded in a
message body. A new client is a Custom Values swap (§2) plus rewriting the
7 messages marked `TRADE`, not a rewrite of the kit.

The visual companion is the customer journey page in `client-journey-onepage/`.
Open its `index.html` to see every message below as the customer would receive
it, stage by stage, with the alerts and tasks that sit behind each one. Its
Fields mode shows the raw merge fields and its Copy button hands over the
template text ready to paste into the builder.

---

## 1. How to reuse this for another client

1. Create the custom values on the new sub-account and fill them in. That table is the whole template mechanism.
2. Create the custom fields below. The website webhook keys are fixed; map them on the way in.
3. Import the messages. Anything tagged Core works unchanged for any trade or service business.
4. Rewrite only the messages tagged Trade specific. They name the product or the physical work, so they cannot be tokenised without turning into mush.
5. Replace the sample customers in the data file so previews read right for the new trade.
6. Run npm run docs:crm. The checker fails on any missing sample value, any email without a preheader, and any agency wording in text the client reads.

Of the 58 messages, 7 are trade-specific: R-FU-02, NUR-01, NUR-02, JOB-02, JOB-05, C-MOB-01, C-DONE-01.
Everything else moves between clients untouched.

### A warning about tokens

The platform has changed token names between releases, particularly the
appointment ones. Treat the token names below as **what to look for in the
dropdown**, not as guaranteed strings. Confirm each one against your platform
version and send a test to yourself before go-live. A token that does not
resolve sends the raw `{{...}}` text to the customer.

### Sender identity

Every email carries a From name, a From address and a Reply-to, so the reader
knows who wrote it and a reply lands with a person. Two From names are used:

- **`from_name_owner`**, "Glenn at Spray It Solutions", on anything personal:
  the chase, the quote, the follow-up, the thank-you, the nurture drip.
- **`from_name_brand`**, "Spray It Solutions", on confirmations, invoices and
  paperwork, where a person's name would look odd on a receipt.

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
mechanism: change these 21 values and every message below
works for a different client.

| Custom value | Spray It Solutions | Notes |
| --- | --- | --- |
| `business_name` | Spray It Solutions | Used in email |
| `business_short_name` | Spray It | Used in SMS, where characters cost money |
| `business_phone` | 0428 26 36 26 | Human readable |
| `business_phone_e164` | +61428263626 | For tel: links |
| `business_email` | info@sprayitsolutions.com.au | From address and reply-to. The sending domain needs SPF and DKIM before go-live. |
| `from_name_owner` | Glenn at Spray It Solutions | From name on the personal emails |
| `from_name_brand` | Spray It Solutions | From name on confirmations and invoices |
| `website_url` | sprayitsolutions.com.au | Staging address until sign-off |
| `booking_url` | sprayitsolutions.com.au/book | The phone consult calendar, embedded on the site |
| `quote_form_url` | sprayitsolutions.com.au/contact |  |
| `privacy_url` | sprayitsolutions.com.au/privacy | Required in marketing email |
| `review_url` | Google review link | The Reviews tab of the Google listing. Use a trigger link so it is shortened in SMS. |
| `owner_first_name` | Glenn | Signs the personal messages |
| `service_area` | Australia-wide |  |
| `trade_noun` | spray foam insulation | How the work is named in a message: "your spray foam insulation enquiry" |
| `trade_verb` | insulation | The short form: "your insulation job" |
| `assessment_noun` | site assessment | What the measure-up visit is called |
| `consult_length` | 15 minute |  |
| `office_hours` | Mon to Fri, 7am to 5pm | To confirm with Glenn |
| `quote_turnaround` | 2 business days | The promise made at the assessment |
| `sms_signoff` | Spray It | Sender identification on every SMS |

> **Needs Glenn:** trading hours. That is the only outstanding value.
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
| `postcode` | Postcode | Text |  |
| `street`, `suburb` | Street, suburb | Text | Optional on the form |
| `enquiry_message` | Enquiry message | Multi-line |  |
| `phone_raw` | Phone as typed | Text | Phone itself arrives in E.164, which is what the CRM matches a person on |
| `company` | Company | Text | Commercial contacts. Asked on the scoping call. |

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
| `contact_attempts` | Contact attempts | Number | The chase, incremented per attempt |
| `last_attempt_at` | Last attempt | Date | The chase |
| `preferred_contact` | Preferred contact | Dropdown: call, sms, email | Asked on the consult |
| `do_not_sms` | Do not SMS | Checkbox | Manual, on request, and by STOP |

Not from the website. Set by workflows.

### 3.5 Opportunity fields

| Key | Label | Type | Stage it is set |
| --- | --- | --- | --- |
| `site_address` | Site address | Text | Qualified |
| `access_notes` | Access notes | Multi-line | Assessment |
| `sqm_estimate` | Area, sqm | Number | Assessment |
| `product_type` | Product | Dropdown: open cell, closed cell, both | Assessment |
| `assessment_date` | Assessment date | Date | Assessment Booked |
| `proposal_due_date` | Proposal due | Date | Specifying (commercial) |
| `quote_number` | Quote number | Text | Quoting |
| `quote_sent_at` | Quote sent | Date | Quote Sent |
| `deposit_amount` | Deposit amount | Monetary | Won, where a deposit applies |
| `deposit_received_at` | Deposit received | Date | Scheduled |
| `job_start_date`, `job_end_date` | Job dates | Date | Scheduled |
| `crew_assigned` | Crew | Text | Scheduled |
| `variation_amount` | Variations | Monetary | In Progress |
| `photos_captured` | Photos captured | Checkbox | In Progress. Required before Invoiced. |
| `invoice_number`, `invoice_sent_at` | Invoice | Text, Date | Invoiced |
| `po_number` | Purchase order | Text | Commercial, on Won |
| `lost_reason` | Lost reason | Dropdown | On Lost |

product_type is the one field here that is genuinely trade-specific. For another client it becomes whatever their equivalent choice is.

---

## 4. Assets each message needs

| Asset | Used by | Status |
| --- | --- | --- |
| Booking calendar | X-BOOK, X-APPT | Needs the Systemations calendar built |
| Quote template | R-QUOTE | Glenn's existing template, or built in Systemations |
| Review link | REV-01 | Done. The link opens the Reviews tab of the Google listing. Set it up as a trigger link so it is shortened in SMS. |
| Job preparation notes | JOB-02 | Written, in the message. Confirm the list with the crew. |
| Completion pack | JOB-05, C-DONE-01 | Needs Glenn's existing warranty or completion document |
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
This is the entire reason the consent fields exist. There are 6 of these:
NUR-01, NUR-02, NUR-03, REV-02, REV-03, C-FUT-01. None of them is an SMS.

Three rules that apply to every message:

1. **Every SMS identifies the sender.** `{{custom_values.sms_signoff}}` appears
   in every one. An unidentified SMS is the most common Spam Act failure.
2. **Every marketing message carries an opt-out.** The platform handles STOP
   natively and sets do-not-SMS, and `{{unsubscribe_link}}` handles email, but
   the wording still has to be there.
3. **Outbound send window: 8am to 8pm, Monday to Saturday, local time.**
   Confirmations send immediately because the person is waiting for them.
   Everything else waits. Use the platform's workflow **Wait until a time
   window** step, not a hope that nobody submits at midnight.

---

## 6. Message inventory

58 messages. Every SMS fits in one segment with the sample values, which
was checked on the journey page rather than assumed.

| ID | Channel | Trigger | Delay | Type | Reuse | Appears in |
| --- | --- | --- | --- | --- | --- | --- |
| X-ACK-01 | SMS | Enters New Enquiry | Within 2 minutes | TRANS | CORE | Residential · New Enquiry, Commercial · New Enquiry |
| X-ACK-02 | Email | Enters New Enquiry | Immediately | TRANS | CORE | Residential · New Enquiry |
| X-CHASE-01 | SMS | First call attempt not answered | Straight after the call | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-CHASE-02 | Email | No reply | Day 2 | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-CHASE-03 | SMS | No reply | Day 4 | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-CHASE-04 | Email | No reply | Day 7, final | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-APPT-01 | Email | Phone consult booked | Immediately | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-APPT-02 | SMS | Phone consult booked | Immediately | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-APPT-03 | SMS | Phone consult upcoming | 24 hours before | TRANS | CORE | Residential · Contacting, Commercial · Contacting, Commercial · Inspection Booked |
| X-APPT-04 | SMS | Phone consult upcoming | 2 hours before | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-APPT-05 | SMS | Marked no-show | Straight away | TRANS | CORE | Residential · Contacting, Commercial · Contacting |
| X-APPT-06 | Email | Appointment rescheduled or cancelled | Immediately | TRANS | CORE | Residential · Contacting, Residential · Assessment Booked, Commercial · Contacting, Commercial · Inspection Booked |
| X-BOOK-01 | SMS | Enters Qualified | Straight after the call | TRANS | CORE | Residential · Qualified |
| X-BOOK-02 | Email | Enters Qualified | Straight after the call | TRANS | CORE | Residential · Qualified |
| R-ASSESS-01 | SMS | Enters Assessment Booked | Immediately | TRANS | CORE | Residential · Assessment Booked |
| R-ASSESS-02 | SMS | Assessment day | 7:00am on the day | TRANS | CORE | Residential · Assessment Booked |
| R-QUOTING-01 | SMS | Enters Quoting | Straight after the assessment | TRANS | CORE | Residential · Quoting |
| R-QUOTE-01 | Email | Enters Quote Sent | Immediately, with the quote attached | TRANS | CORE | Residential · Quote Sent |
| R-QUOTE-02 | SMS | Enters Quote Sent | Immediately | TRANS | CORE | Residential · Quote Sent |
| R-FU-01 | SMS | Quote unanswered | Day 2 | TRANS | CORE | Residential · Quote Sent |
| R-FU-02 | Email | Quote unanswered | Day 5 | TRANS | **TRADE** | Residential · Follow-up |
| R-FU-03 | SMS | Quote unanswered | Day 10 | TRANS | CORE | Residential · Follow-up |
| R-FU-04 | Email | Quote unanswered | Day 21, final | TRANS | CORE | Residential · Follow-up |
| LOST-01 | Email | Marked Lost, any reason except Unreachable, Duplicate or Spam | Next business morning | TRANS | CORE | Residential · Follow-up |
| NUR-01 | Email | Enters Nurture | Next business morning | MKTG | **TRADE** | Residential · Nurture |
| NUR-02 | Email | In Nurture | +30 days | MKTG | **TRADE** | Residential · Nurture |
| NUR-03 | Email | In Nurture | +90 days | MKTG | CORE | Residential · Nurture |
| X-WON-01 | Email | Status set to Won | Immediately | TRANS | CORE | Residential · Won |
| X-WON-02 | SMS | Status set to Won | Immediately | TRANS | CORE | Residential · Won |
| DEP-01 | SMS | deposit_received_at is set | Immediately | TRANS | CORE | Residential · Won |
| JOB-01 | SMS | Enters Scheduled | Immediately | TRANS | CORE | Residential · Scheduled |
| JOB-02 | Email | Enters Scheduled | Immediately | TRANS | **TRADE** | Residential · Scheduled |
| JOB-03 | SMS | Job upcoming | Day before, 4:00pm | TRANS | CORE | Residential · Scheduled |
| JOB-04 | SMS | Enters In Progress | Morning of the start | TRANS | CORE | Residential · In Progress |
| JOB-06 | SMS | Crew running late | Sent by the crew, from a saved template | TRANS | CORE | Residential · In Progress |
| JOB-05 | Email | Enters Invoiced | Immediately, with photos attached | TRANS | **TRADE** | Residential · Invoiced |
| PAY-01 | Email | Enters Invoiced | Immediately, with the invoice attached | TRANS | CORE | Residential · Invoiced |
| PAY-02 | SMS | Invoice unpaid | Day 7 | TRANS | CORE | Residential · Invoiced |
| PAY-03 | Email | Invoice unpaid | Day 14 | TRANS | CORE | Residential · Invoiced |
| REV-01 | SMS | Enters Paid & Closed | +1 day | TRANS | CORE | Residential · Paid & Closed |
| REV-02 | Email | In Paid & Closed | +7 days | MKTG | CORE | Residential · Paid & Closed |
| REV-03 | Email | In Paid & Closed | +12 months | MKTG | CORE | Residential · Paid & Closed |
| SYS-01 | SMS | Inbound call missed | Within 60 seconds | TRANS | CORE | Always on |
| SYS-02 | SMS | Inbound SMS outside hours | Immediately | TRANS | CORE | Always on |
| C-ACK-01 | Email | Enters New Enquiry on the Commercial board | Immediately | TRANS | CORE | Commercial · New Enquiry |
| C-INSP-01 | Email | Enters Inspection Booked | Immediately | TRANS | CORE | Commercial · Inspection Booked |
| C-SPEC-01 | Email | Enters Specifying | Same day as the inspection | TRANS | CORE | Commercial · Specifying |
| C-PROP-01 | Email | Enters Proposal Submitted | Immediately, with the proposal attached | TRANS | CORE | Commercial · Proposal Submitted |
| C-PROP-02 | Email | Proposal unanswered | Day 7 | TRANS | CORE | Commercial · Proposal Submitted |
| C-PROP-03 | Email | Still in Commercial Review | Day 21 | TRANS | CORE | Commercial · Commercial Review |
| C-FUT-01 | Email | In Future Project | Every 90 days | MKTG | CORE | Commercial · Future Project |
| C-PO-01 | Email | Enters Awaiting PO | Immediately | TRANS | CORE | Commercial · Awaiting PO |
| C-MOB-01 | Email | Status set to Won (PO received), enters Mobilising | Immediately | TRANS | **TRADE** | Commercial · Won, Commercial · Mobilising |
| C-SITE-01 | SMS | Each site day in In Progress | 6:30am on the day | TRANS | CORE | Commercial · In Progress |
| C-PROG-01 | Email | In Progress, staged jobs | Weekly, Friday, from a saved template | TRANS | CORE | Commercial · In Progress |
| C-PAY-01 | Email | Progress claim issued | Per the programme | TRANS | CORE | Commercial · Invoicing |
| C-DONE-01 | Email | Works complete, enters Invoicing | Immediately, with the close-out pack attached | TRANS | **TRADE** | Commercial · Invoicing |
| C-CLOSE-01 | Email | Enters Paid & Closed | +1 day | TRANS | CORE | Commercial · Paid & Closed |

Build the `X-` and `R-` sets first; the commercial set can follow, since that
board runs at a pace where a human writing the email is still viable.

---

## 7. Shared messages

Used by both boards. The chase, the phone consult booking, and the step from the call to the assessment.

### X-ACK-01 · SMS · Enters New Enquiry, within 2 minutes · TRANS · CORE

```
Hi {{contact.first_name}}, {{custom_values.business_short_name}} here. We have your enquiry and one of us will call you today. Need us sooner? {{custom_values.business_phone}}
```

*Stops:* Sends once. *Window:* sends immediately.

Fires before anyone has looked at the lead, so it promises only what automation can guarantee: that a human will call.

### X-ACK-02 · Email · Enters New Enquiry, immediately · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** We have your enquiry, {{contact.first_name}}  
**Preheader:** One of the family will call you, usually today. Here is what you told us and what happens next.

```
Hi {{contact.first_name}},

Thanks for getting in touch. We have your enquiry and one of the family will call you, usually the same working day.

Here is what you told us:

  Property        {{contact.property_type}}
  Needs doing     {{contact.areas}}
  Building stage  {{contact.building_stage}}
  Timeframe       {{contact.timeframe}}
  Postcode        {{contact.postcode}}

If any of that is wrong, just reply to this email and we will fix it.

What happens next:

  1. We call you for a {{custom_values.consult_length}} chat about the building.
  2. If it looks like a fit, we book a {{custom_values.assessment_noun}}.
  3. You get a written quote with no obligation.

We cannot price {{custom_values.trade_noun}} properly without seeing the building, so nobody is going to quote you a number over the phone. The call is to work out whether it is the right answer for you at all.

{{custom_values.owner_first_name}} and the team
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once. *Window:* sends immediately.

Echoing their answers back cuts "did that go through?" replies and catches a wrong postcode before it wastes a site visit.

**Agency note.** Store the human label in each dropdown field (Home, not home) or this email echoes the raw form value.

### X-CHASE-01 · SMS · First call attempt not answered, straight after the call · TRANS · CORE

```
Hi {{contact.first_name}}, tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.business_phone}} when it suits. {{custom_values.sms_signoff}}
```

*Stops:* The whole chase stops the moment they reply, book, or the card leaves Contacting. *Window:* waits for the send window.

### X-CHASE-02 · Email · No reply, day 2 · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Still keen to help with your {{custom_values.trade_noun}}  
**Preheader:** Three easy ways to pick this back up, whenever suits.

```
Hi {{contact.first_name}},

We have tried you a couple of times without luck. No rush at our end, we just do not want to keep ringing if now is a bad time.

Three ways to pick this back up:

  Reply to this email with a time that suits
  Book a call yourself: {{custom_values.booking_url}}
  Ring us on {{custom_values.business_phone}}

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Stops on reply, booking, or stage change. *Window:* waits for the send window.

### X-CHASE-03 · SMS · No reply, day 4 · TRANS · CORE

```
Hi {{contact.first_name}}, still happy to talk through your {{custom_values.trade_verb}} job whenever suits. Pick a time here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}
```

*Stops:* Stops on reply, booking, or stage change. *Window:* waits for the send window.

### X-CHASE-04 · Email · No reply, day 7, final · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Closing this one off  
**Preheader:** We could not reach you, so we will stop ringing. Nothing is lost.

```
Hi {{contact.first_name}},

We have not been able to reach you, so we will close this enquiry off rather than keep chasing.

Nothing is lost. If the job comes back around, reply to this email or ring {{custom_values.business_phone}} and we will pick it straight back up.

All the best with it either way.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Last in the sequence. The card goes to Lost, reason Unreachable. *Window:* waits for the send window.

The honest close is the highest-replying message in the sequence. Do not soften it into another chase or it stops working.

### X-APPT-01 · Email · Phone consult booked, immediately · TRANS · CORE

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

### X-APPT-02 · SMS · Phone consult booked, immediately · TRANS · CORE

```
Booked in for {{appointment.start_time}}. We will call you on {{contact.phone}}. Change it here: {{appointment.reschedule_link}} {{custom_values.sms_signoff}}
```

*Stops:* Sends once per booking. *Window:* sends immediately.

### X-APPT-03 · SMS · Phone consult upcoming, 24 hours before · TRANS · CORE

```
Reminder: your call with {{custom_values.business_short_name}} is tomorrow, {{appointment.start_time}}. Need to move it? {{appointment.reschedule_link}}
```

*Stops:* Cancelled with the appointment. *Window:* waits for the send window.

### X-APPT-04 · SMS · Phone consult upcoming, 2 hours before · TRANS · CORE

```
Your call with {{custom_values.business_short_name}} is at {{appointment.start_time}}, about 2 hours away. Talk soon.
```

*Stops:* Cancelled with the appointment. *Window:* sends immediately.

### X-APPT-05 · SMS · Marked no-show, straight away · TRANS · CORE

```
Hi {{contact.first_name}}, we missed you just now. No problem, grab another time here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}
```

*Stops:* Sends once. The chase sequence restarts from attempt 2. *Window:* waits for the send window.

### X-APPT-06 · Email · Appointment rescheduled or cancelled, immediately · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your booking has changed  
**Preheader:** Your new time is {{appointment.start_time}}. If that is not right, ring us.

```
Hi {{contact.first_name}},

That booking has been updated.

  Now   {{appointment.start_time}}

If that is not right, ring us on {{custom_values.business_phone}}.

{{custom_values.business_name}}
```

*Stops:* Sends once per change. *Window:* sends immediately.

Used for both the phone consult and the site assessment, so it never names which.

### X-BOOK-01 · SMS · Enters Qualified, straight after the call · TRANS · CORE

```
Hi {{contact.first_name}}, good to talk. Grab a time for the {{custom_values.assessment_noun}} here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}
```

*Stops:* Stops when the assessment is booked. *Window:* waits for the send window.

### X-BOOK-02 · Email · Enters Qualified, straight after the call · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Booking your {{custom_values.assessment_noun}}  
**Preheader:** Pick a time for us to measure up. About an hour, and someone to let us in.

```
Hi {{contact.first_name}},

Thanks for the chat. Next step is the {{custom_values.assessment_noun}}, where we measure up and look at access so the quote is a real number rather than a guess.

Pick a time that suits: {{custom_values.booking_url}}

It takes about an hour. Someone needs to be there to let us in, and we will need to get at {{contact.areas}}.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Stops when the assessment is booked. *Window:* waits for the send window.

---

## 8. Residential: assessment to decision

### R-ASSESS-01 · SMS · Enters Assessment Booked, immediately · TRANS · CORE

```
Hi {{contact.first_name}}, {{custom_values.business_short_name}} booked for {{opportunity.assessment_date}} at {{opportunity.site_address}}. Takes about an hour. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per booking. *Window:* sends immediately.

### R-ASSESS-02 · SMS · Assessment day, 7:00am on the day · TRANS · CORE

```
Morning {{contact.first_name}}, we are coming to you today for the {{custom_values.assessment_noun}}. We will text when we are close. {{custom_values.sms_signoff}}
```

*Stops:* Cancelled with the appointment. *Window:* sends immediately.

### R-QUOTING-01 · SMS · Enters Quoting, straight after the assessment · TRANS · CORE

```
Thanks for having us today {{contact.first_name}}. Your written quote will be with you within {{custom_values.quote_turnaround}}. {{custom_values.sms_signoff}}
```

*Stops:* Sends once. *Window:* waits for the send window.

The stage is time-boxed at two days. Saying so out loud is what stops the "when is the quote coming" call, and it holds the estimator to the promise.

### R-QUOTE-01 · Email · Enters Quote Sent, immediately, with the quote attached · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your quote from {{custom_values.business_name}}  
**Preheader:** Quote {{opportunity.quote_number}} attached. Everything included, valid 30 days, questions welcome.

```
Hi {{contact.first_name}},

Your quote is attached. Quote number {{opportunity.quote_number}}.

It covers {{contact.areas}} at {{opportunity.site_address}}, using {{opportunity.product_type}} foam.

A few things worth saying plainly:

  The price includes everything. No separate charge for access, setup or clean-up.
  It is valid for 30 days, mostly because material costs move.
  If anything in it does not make sense, ring us. We would rather explain it than have you sign something you are unsure about.

Any questions at all, {{custom_values.business_phone}}.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Sends once per quote. *Window:* sends immediately.

### R-QUOTE-02 · SMS · Enters Quote Sent, immediately · TRANS · CORE

```
Hi {{contact.first_name}}, your quote is in your inbox. Any questions, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per quote. *Window:* sends immediately.

### R-FU-01 · SMS · Quote unanswered, day 2 · TRANS · CORE

```
Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}
```

*Stops:* The whole follow-up stops on reply, acceptance, or when the card leaves the stage. *Window:* waits for the send window.

### R-FU-02 · Email · Quote unanswered, day 5 · TRANS · **TRADE**

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Why our number might look different  
**Preheader:** Two numbers for the same job can look nothing alike. Here is why.

```
Hi {{contact.first_name}},

If you are comparing quotes, one thing is worth knowing, because it is the reason two numbers for the "same" job can look nothing alike.

Insulation is sold on R-value, and R-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind.

A real wall has all of those. Cut products leave edges, edges leave gaps, and air moves through gaps carrying heat with it. That path is not in the rating at all, which is why two walls rated the same can feel completely different to live in.

We wrote the whole thing up here, with a diagram: {{custom_values.website_url}}/spray-foam#r-value

Not trying to talk you out of anything. Just make sure you are comparing the finished wall, not the number on the bag.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Stops on reply, acceptance, or stage change. *Window:* waits for the send window.

The one message in the journey that makes an argument. It works because it explains something the customer did not know, not because it sells.

**Agency note.** Trade specific. For another client, replace it with the thing customers get wrong when comparing quotes in that trade. Keep the shape: "here is the thing nobody tells you", not "here is why we are better".

### R-FU-03 · SMS · Quote unanswered, day 10 · TRANS · CORE

```
Hi {{contact.first_name}}, still thinking it over or has something changed? Either is fine, just want to know whether to keep the slot free. {{custom_values.sms_signoff}}
```

*Stops:* Stops on reply, acceptance, or stage change. *Window:* waits for the send window.

A real question outperforms "just checking in", because it can be answered in one word.

### R-FU-04 · Email · Quote unanswered, day 21, final · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Should I close this off?  
**Preheader:** No reply, so I will assume the timing is off. Tell me if I am wrong.

```
Hi {{contact.first_name}},

I have not heard back on quote {{opportunity.quote_number}}, so I will assume the timing is not right and close it off.

If that is wrong, just reply and we will pick it up. If you went with someone else, that is completely fine, and if you can tell me why I would genuinely find it useful.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Last in the sequence. The card is then Lost or moved to Nurture, never left sitting. *Window:* waits for the send window.

The "why" ask feeds the Lost reason field, which is what makes the Price against Chose batts split on the board real rather than guessed.

### LOST-01 · Email · Marked Lost, any reason except Unreachable, Duplicate or Spam, next business morning · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Thanks for considering us, {{contact.first_name}}  
**Preheader:** No hard feelings. The door stays open.

```
Hi {{contact.first_name}},

Thanks for giving us the chance to quote on {{opportunity.site_address}}. If you went another way, we hope it goes well.

If the timing changes, or the job grows, reply to this and we will pick it up where we left off. Same number, same people, and we still have the measurements.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once. *Window:* waits for the send window.

A graceful goodbye is the cheapest marketing there is. A surprising number of "went with someone else" jobs come back after the other quote falls over.

---

## 9. Won and delivery

### X-WON-01 · Email · Status set to Won, immediately · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Locked in. Here is what happens next.  
**Preheader:** Four steps from here. Deposit details are on your quote.

```
Hi {{contact.first_name}},

Thanks for going ahead. Here is how this runs from here.

  1. A deposit of {{opportunity.deposit_amount}} confirms the booking, where one applies. Details are on the quote.
  2. We lock a start date and confirm it with you.
  3. We send you a short note on how to prepare the space.
  4. The crew arrives and does the work.

Anything at all in the meantime, ring {{custom_values.business_phone}}.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once. Every sales sequence on the card is killed at the same moment. *Window:* sends immediately.

Deposits are taken on some jobs and not others. Where none applies, the workflow branch drops line 1 and the SMS below says "we will confirm dates shortly".

### X-WON-02 · SMS · Status set to Won, immediately · TRANS · CORE

```
Thanks {{contact.first_name}}. Deposit details are on your quote, and we will confirm dates as soon as it lands. {{custom_values.sms_signoff}}
```

*Stops:* Sends once. *Window:* sends immediately.

### DEP-01 · SMS · deposit_received_at is set, immediately · TRANS · CORE

```
Deposit received, thanks {{contact.first_name}}. You are locked in. We will confirm your start date within 3 business days. {{custom_values.sms_signoff}}
```

*Stops:* Sends once. Only on jobs where a deposit applies. *Window:* waits for the send window.

Silence after a payment is the thing customers hate most. This is one line and it stops the "did you get it?" call.

### JOB-01 · SMS · Enters Scheduled, immediately · TRANS · CORE

```
Hi {{contact.first_name}}, you are booked for {{opportunity.job_start_date}}. Prep notes are in your email. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per booking. *Window:* waits for the send window.

### JOB-02 · Email · Enters Scheduled, immediately · TRANS · **TRADE**

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your job is booked for {{opportunity.job_start_date}}  
**Preheader:** Booked for {{opportunity.job_start_date}}. Five things to do before we arrive.

```
Hi {{contact.first_name}},

You are in the diary.

  Start   {{opportunity.job_start_date}}
  Finish  {{opportunity.job_end_date}}
  Where   {{opportunity.site_address}}
  Crew    {{opportunity.crew_assigned}}

To help us get in and out cleanly, before we arrive:

  Clear access to {{contact.areas}}. We need room to work and to get the hose through.
  Move anything you would rather not have dust near.
  Make sure we can park close. The rig runs off the truck.
  Pets somewhere else for the day, please.
  Somebody over 18 on site to let us in.

While we are spraying, the area needs to be empty of people and pets. Afterwards the space needs time before you use it again. That is anywhere from about an hour to a full day depending on which foam the job calls for, and the crew will tell you which applies to yours before they leave.

Anything you are unsure about, ring {{custom_values.business_phone}}.

{{custom_values.business_name}}
```

*Stops:* Sends once per booking. *Window:* waits for the send window.

Worth checking this list with the crew rather than the office, because the crew know what actually goes wrong on arrival. Re-occupancy is product dependent: as little as an hour for some foams, up to 24 hours for others, so the crew give the figure on the day.

**Agency note.** Trade specific. The preparation list is the job, and for another client it is their own list.

### JOB-03 · SMS · Job upcoming, day before, 4:00pm · TRANS · CORE

```
Hi {{contact.first_name}}, we are with you tomorrow, {{opportunity.job_start_date}}. Access clear and pets sorted? {{custom_values.sms_signoff}}
```

*Stops:* Cancelled if the job moves. *Window:* waits for the send window.

### JOB-04 · SMS · Enters In Progress, morning of the start · TRANS · CORE

```
Morning {{contact.first_name}}, {{opportunity.crew_assigned}} is on the way to you now. {{custom_values.sms_signoff}}
```

*Stops:* Sends once per start day. *Window:* sends immediately.

### JOB-06 · SMS · Crew running late, sent by the crew, from a saved template · TRANS · CORE · manual send

```
Hi {{contact.first_name}}, running about 30 minutes behind on the way to you. Sorry about that, see you shortly. {{custom_values.sms_signoff}}
```

*Stops:* Manual. One tap from the mobile app. *Window:* sends immediately.

Not automated. A saved snippet the crew can send from the app in one tap, because the alternative is a customer standing at the window at 7:30 wondering.

### JOB-05 · Email · Enters Invoiced, immediately, with photos attached · TRANS · **TRADE**

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** All done at {{opportunity.site_address}}  
**Preheader:** Photos of the finished work, your paperwork, and how to live with it.

```
Hi {{contact.first_name}},

The job is finished. Photos of the completed work are attached, along with your paperwork.

What we did:

  {{contact.areas}}, using {{opportunity.product_type}} foam
  {{opportunity.sqm_estimate}} sqm

Living with it:

  There is nothing to maintain. It does not settle, sag or need topping up.
  If you ever cut into it for a new downlight or a pipe, seal it back up. An opening in a sealed layer costs more than the same opening in an unsealed one.
  You may notice the place holds temperature longer and is quieter. Both are the foam doing its job.

Your invoice is on its way separately.

Thanks for having us.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Sends once. *Window:* waits for the send window.

The photos are the point. They are the customer's record, and they are the source of the site photography, which matters given competitors have lifted images off the old website.

### PAY-01 · Email · Enters Invoiced, immediately, with the invoice attached · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Invoice {{opportunity.invoice_number}}  
**Preheader:** Invoice {{opportunity.invoice_number}} attached. Payment details are on it.

```
Hi {{contact.first_name}},

Invoice {{opportunity.invoice_number}} is attached for the work at {{opportunity.site_address}}.

Payment details are on the invoice. Any questions about it, ring {{custom_values.business_phone}}.

{{custom_values.business_name}}
```

*Stops:* Sends once per invoice. *Window:* waits for the send window.

### PAY-02 · SMS · Invoice unpaid, day 7 · TRANS · CORE

```
Hi {{contact.first_name}}, friendly reminder that invoice {{opportunity.invoice_number}} is due. Any issues, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}
```

*Stops:* Stops dead the moment payment is marked. *Window:* waits for the send window.

### PAY-03 · Email · Invoice unpaid, day 14 · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Invoice {{opportunity.invoice_number}} is now overdue  
**Preheader:** A copy is attached. If something is wrong with it, ring us and we will sort it.

```
Hi {{contact.first_name}},

Invoice {{opportunity.invoice_number}} is now overdue. A copy is attached.

If there is a problem with it, or you need a different arrangement, ring {{custom_values.business_phone}} and we will sort it out. We would much rather talk than chase.

{{custom_values.business_name}}
```

*Stops:* Stops dead the moment payment is marked. A reminder sent after someone has paid does more damage than the reminder was worth. *Window:* waits for the send window.

---

## 10. After the job

### REV-01 · SMS · Enters Paid & Closed, +1 day · TRANS · CORE

```
Hi {{contact.first_name}}, thanks again. If you were happy with the job, a quick Google review really helps a family business: {{custom_values.review_url}} {{custom_values.sms_signoff}}
```

*Stops:* Ask once. Do not chase reviews. *Window:* waits for the send window.

The link opens the Reviews tab of the Google listing directly. Ask once, by SMS, the day after payment.

### REV-02 · Email · In Paid & Closed, +7 days · MKTG · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Know anyone else with the same problem?  
**Preheader:** Most of our work is word of mouth. You would know who.

```
Hi {{contact.first_name}},

Hope the place is holding its temperature.

Most of our work comes from people passing our name on. If someone you know is fighting the same problem, send them our way or pass on {{custom_values.business_phone}}.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

You are getting this because you agreed to hear from us. {{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. *Window:* waits for the send window.

### REV-03 · Email · In Paid & Closed, +12 months · MKTG · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** A year on, how is it going?  
**Preheader:** It has been a year since {{opportunity.site_address}}. Tell us how it is holding up.

```
Hi {{contact.first_name}},

It has been about a year since we did the work at {{opportunity.site_address}}. No agenda here, we just like knowing how jobs hold up.

If anything is not as you expected, tell us and we will come and look.

And if you have taken on more of the building since, the rest of it is usually easier the second time, because we already know the place.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. *Window:* waits for the send window.

---

## 11. Nurture

Marketing. Sends only when `{{contact.consent_marketing}}` is `yes`. Every one carries an unsubscribe.

### NUR-01 · Email · Enters Nurture, next business morning · MKTG · **TRADE**

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** The bit about R-value nobody explains  
**Preheader:** Worth knowing before you get anywhere near comparing quotes.

```
Hi {{contact.first_name}},

You mentioned the timing was not right, which is fair enough. Here is something worth knowing before you get to the point of comparing quotes.

R-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind. A real wall has all of those, and air moving through gaps carries heat with it.

Which is why two walls rated the same can feel completely different.

The full explanation, with a diagram of both walls: {{custom_values.website_url}}/spray-foam#r-value

No rush from us. When it comes back around, we will be here.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops on unsubscribe or re-engagement. *Window:* waits for the send window.

### NUR-02 · Email · In Nurture, +30 days · MKTG · **TRADE**

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Where the heat actually goes  
**Preheader:** A third through the roof, more through the walls, and the floor nobody thinks about.

```
Hi {{contact.first_name}},

A third of your heating leaves through the roof, more through the walls, and the rest through the floor. The floor is the one almost nobody insulates, and it is the one people notice most once it is done.

There is an interactive version of this on our site. Scroll and the house seals itself while the meter drops: {{custom_values.website_url}}

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops on unsubscribe or re-engagement. *Window:* waits for the send window.

### NUR-03 · Email · In Nurture, +90 days · MKTG · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Still on the list?  
**Preheader:** If the project is still on the horizon, do nothing. If it is off the table, one click and we stop.

```
Hi {{contact.first_name}},

We have been sending you the occasional note since you enquired. If the project is still somewhere on the horizon, no action needed and we will keep in touch now and then.

If it is off the table, unsubscribe below and we will leave you alone. No hard feelings.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops on unsubscribe or re-engagement. *Window:* waits for the send window.

A permission reset every 90 days keeps the list clean and the deliverability healthy. It is also the honest thing to do.

---

## 12. Always on

### SYS-01 · SMS · Inbound call missed, within 60 seconds · TRANS · CORE

```
Sorry we missed your call. This is {{custom_values.business_short_name}}. Reply here and we will get straight back to you, or we will ring you shortly.
```

*Stops:* Once per caller per day. *Window:* sends immediately.

For a trade business where the phone rings while someone is up a ladder, this is the single highest-value automation on the list.

### SYS-02 · SMS · Inbound SMS outside hours, immediately · TRANS · CORE

```
Thanks for your message. We are back {{custom_values.office_hours}} and will reply first thing. Urgent? {{custom_values.business_phone}}.
```

*Stops:* Once per contact per day, not once per message. *Window:* sends immediately.

---

## 13. Commercial messages

Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.

### C-ACK-01 · Email · Enters New Enquiry on the Commercial board, immediately · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Your enquiry, {{contact.first_name}}  
**Preheader:** We will call to scope it. Five things that make that call useful.

```
Hi {{contact.first_name}},

Thanks for the enquiry regarding {{contact.property_type}} at {{contact.postcode}}.

We will call you to scope it. Before that call it helps to know:

  Approximate area, in square metres
  What the space is used for, and any temperature requirement
  Whether the building is occupied or operating during the works
  Programme dates, if they are set
  Who else needs to be involved in the decision

We work {{custom_values.service_area}} and hold current insurances and SWMS documentation, which we can supply on request.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once. The SMS acknowledgement X-ACK-01 goes too. *Window:* sends immediately.

Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.

### C-INSP-01 · Email · Enters Inspection Booked, immediately · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Site inspection confirmed, {{opportunity.assessment_date}}  
**Preheader:** Confirmed for {{opportunity.assessment_date}}. Inductions, PPE, access and a site contact, please.

```
Hi {{contact.first_name}},

Confirmed for {{opportunity.assessment_date}} at {{opportunity.site_address}}.

Please let us know before the visit:

  Site induction requirements, and how long they take
  PPE beyond standard
  Access arrangements, including any permits or escorts
  A site contact and mobile for the day

We will bring insurances and SWMS. If you need those in advance for your own records, reply and we will send them through.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once per booking. X-APPT-03 sends the day-before SMS reminder. *Window:* sends immediately.

### C-SPEC-01 · Email · Enters Specifying, same day as the inspection · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Proposal for {{opportunity.site_address}} by {{opportunity.proposal_due_date}}  
**Preheader:** Thanks for the site visit. Here is when the proposal lands and what it will include.

```
Hi {{contact.first_name}},

Thanks for the time on site today.

We are now working through product, thickness, access, plant and staging for {{contact.areas}}, roughly {{opportunity.sqm_estimate}} sqm. You will have the proposal by {{opportunity.proposal_due_date}}.

It will include the specification, programme, a SWMS summary and our insurances, so it can go straight into your approval process.

If there is a format your procurement needs it in, or it has to be split into stages for budget reasons, tell us now and we will issue it that way the first time.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once. *Window:* waits for the send window.

The date is set by the estimator when the card enters Specifying. Naming it is what keeps a five-day stage at five days.

### C-PROP-01 · Email · Enters Proposal Submitted, immediately, with the proposal attached · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Proposal, {{opportunity.site_address}}  
**Preheader:** Specification, programme and compliance documents attached. Say if procurement needs it reshaped.

```
Hi {{contact.first_name}},

Our proposal is attached.

  Scope       {{contact.areas}}
  Area        {{opportunity.sqm_estimate}} sqm
  Product     {{opportunity.product_type}}
  Reference   {{opportunity.quote_number}}

It includes the specification, programme, and the compliance documentation you will need for your own records.

If you need it broken down differently for internal approval, or split into stages, tell us what shape it needs to be in and we will reissue it.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Sends once per proposal. *Window:* waits for the send window.

The offer to reformat is deliberate. Losing a commercial job because the numbers were not in the shape procurement needed is an avoidable loss.

### C-PROP-02 · Email · Proposal unanswered, day 7 · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Anything you need on {{opportunity.quote_number}}?  
**Preheader:** References, insurances, a revised breakdown. And is there a decision date?

```
Hi {{contact.first_name}},

Checking whether you need anything further on the proposal for {{opportunity.site_address}}. References, insurances, a site visit for your own team, or a revised breakdown, all easy.

Also useful for us: is there a decision date we should be working to?

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Stops on reply or stage change. *Window:* waits for the send window.

### C-PROP-03 · Email · Still in Commercial Review, day 21 · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
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

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Stops on reply or stage change. *Window:* waits for the send window.

### C-FUT-01 · Email · In Future Project, every 90 days · MKTG · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Still on the plan for {{opportunity.site_address}}?  
**Preheader:** A quarterly check-in, nothing more. Tell us when the budget cycle comes around.

```
Hi {{contact.first_name}},

You mentioned {{opportunity.site_address}} was a future-budget project, so this is the quarterly check-in as promised.

If the budget cycle has come around, we can refresh the proposal against current material pricing within a week. If it has moved further out, tell us the quarter and we will leave you alone until then.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

*Stops:* Only if consent_marketing is yes. Stops when the card moves back to Qualified. *Window:* waits for the send window.

### C-PO-01 · Email · Enters Awaiting PO, immediately · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Ready to proceed, {{opportunity.site_address}}  
**Preheader:** To mobilise we need four things. Programme confirmed within two working days of the PO.

```
Hi {{contact.first_name}},

Good news about the award. To get this moving we need:

  Purchase order or signed contract
  Site contact for mobilisation
  Induction dates for the crew
  Confirmed access windows

Once the PO is with us we will confirm the programme within two working days.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Sends once. A weekly task chases the PO from here. *Window:* waits for the send window.

### C-MOB-01 · Email · Status set to Won (PO received), enters Mobilising, immediately · TRANS · **TRADE**

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Mobilising for {{opportunity.site_address}}  
**Preheader:** PO {{opportunity.po_number}} received. SWMS, insurances and crew list attached. Four things we need from you.

```
Hi {{contact.first_name}},

PO {{opportunity.po_number}} received, thank you. We are mobilising.

  Start       {{opportunity.job_start_date}}
  Completion  {{opportunity.job_end_date}}
  Crew        {{opportunity.crew_assigned}}

Attached: SWMS, insurances, and the crew list for induction.

We need from you:

  Induction booked for the crew before the start date
  Confirmed access and any permits
  Power and water availability on site
  Confirmation the area will be clear of other trades while we spray

That last one matters more than it sounds. The area has to be free of other trades during application and cure.

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once. Every sales sequence on the card is killed at the same moment. *Window:* waits for the send window.

### C-SITE-01 · SMS · Each site day in In Progress, 6:30am on the day · TRANS · CORE

```
Morning {{contact.first_name}}, {{custom_values.business_short_name}} crew is on site at {{opportunity.site_address}} today. Lead on the day is {{opportunity.crew_assigned}}. Anything on site, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}
```

*Stops:* Once per site day. *Window:* sends immediately.

Goes to the site contact, who is often not the person who signed the PO. Set the contact on the card when the job is mobilised.

### C-PROG-01 · Email · In Progress, staged jobs, weekly, friday, from a saved template · TRANS · CORE · manual send

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
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

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Manual. Sent by the owner from the template each Friday the job is live. *Window:* waits for the send window.

Bracketed lines are filled in by hand. Automating a progress report produces a report nobody reads, so this is a template with a Friday task attached, not a workflow.

### C-PAY-01 · Email · Progress claim issued, per the programme · TRANS · CORE

**From:** {{custom_values.from_name_brand}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Progress claim {{opportunity.invoice_number}}  
**Preheader:** Claim {{opportunity.invoice_number}} attached with supporting photos and sign-offs.

```
Hi {{contact.first_name}},

Progress claim {{opportunity.invoice_number}} is attached for works at {{opportunity.site_address}}.

  Claim covers   [stage or percentage]
  Terms          [payment terms]

Supporting photos and any sign-offs are included.

{{custom_values.business_name}}
```

*Stops:* Sends once per claim. *Window:* waits for the send window.

Needs Glenn: payment terms for commercial work, and whether progress claims follow a percentage, a milestone, or a monthly cycle.

### C-DONE-01 · Email · Works complete, enters Invoicing, immediately, with the close-out pack attached · TRANS · **TRADE**

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Works complete: {{opportunity.site_address}}  
**Preheader:** Close-out pack attached: photos, product data, SWMS, variations. Final claim to follow.

```
Hi {{contact.first_name}},

Works at {{opportunity.site_address}} are complete.

Attached is the close-out pack:

  Completion photos, by area
  Product data sheets for the {{opportunity.product_type}} foam applied
  SWMS and insurances as issued
  Any variations agreed on site, itemised

The final claim follows separately. If your handover process needs a sign-off form or a walk-through, name a time and we will be there.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

*Stops:* Sends once. *Window:* waits for the send window.

### C-CLOSE-01 · Email · Enters Paid & Closed, +1 day · TRANS · CORE

**From:** {{custom_values.from_name_owner}} <{{custom_values.business_email}}>  
**Reply-to:** {{custom_values.business_email}}  
**Subject:** Thanks, {{contact.first_name}}  
**Preheader:** Final payment received. One favour, and a promise about next time.

```
Hi {{contact.first_name}},

Final payment on {{opportunity.site_address}} is in, thank you.

One favour. If the works went the way you needed, would you be willing to act as a reference for a future client of similar scale? A phone call, nothing written.

And for next time: we hold the specification and site notes, so a second stage or another site can be scoped without starting from scratch.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

*Stops:* Sends once. *Window:* waits for the send window.

A reference from a facilities manager is worth more on a commercial tender than any number of homeowner reviews. Ask for it while the job is fresh.

> **Needs Glenn:** payment terms for commercial work, and whether progress
> claims follow a percentage, a milestone, or a monthly cycle.

---

## 14. Build order

Do not build all 58 at once. In order of what earns most:

1. **SYS-01**, missed call text-back. Highest return of anything here.
2. **X-ACK-01, X-ACK-02**, the two minute acknowledgement.
3. **X-CHASE-01 to 04**, the chase, with its honest close.
4. **X-APPT-01 to 06**, so phone calls stop being no-shows.
5. **X-BOOK, R-ASSESS, R-QUOTING-01**, from the call to the quote.
6. **R-QUOTE, R-FU-01 to 04, LOST-01**, the follow-up that converts quotes, and the goodbye.
7. **X-WON, DEP-01, JOB, PAY**, the delivery half.
8. **REV-01**, the review ask.
9. **NUR-01 to 03, REV-02, REV-03**, once there is a consented list worth mailing.
10. **The commercial set**, last. That board moves slowly enough that a human writing the email is still viable.
