# CRM Messaging Kit

Every SMS and email the pipelines send, plus the fields and custom values they
depend on. Built for GoHighLevel.

**This is written as a template.** Nothing client-specific is hardcoded in the
message bodies. A new client is a Custom Values swap (§2) plus rewriting the
handful of messages marked `TRADE`, not a rewrite of the kit.

---

## 1. How to reuse this for another client

1. Create the Custom Values in §2 on the new sub-account and fill them in.
2. Create the custom fields in §3.
3. Import the messages. Anything marked **`CORE`** works unchanged for any
   trade or service business.
4. Rewrite only the messages marked **`TRADE`**. These name the product or the
   physical work, so they cannot be tokenised without turning into mush.
5. Check §4 for the assets each message needs (booking link, review link,
   quote template).

Of the messages here, most are `CORE`. The `TRADE` ones are the nurture drip,
the job preparation notes and two objection-handling follow-ups.

### A warning about tokens

GoHighLevel has changed token names between releases, particularly the
appointment ones. Treat the token names below as **what to look for in the
dropdown**, not as guaranteed strings. Confirm each one against your GHL version
and send a test to yourself before go-live. A token that does not resolve sends
the raw `{{...}}` text to the customer.

---

## 2. Custom Values: the swap layer

Create these under **Settings → Custom Values**. This is the whole template
mechanism: change these eighteen values and every message below works for a
different client.

| Custom value | Spray It Solutions | Notes |
| --- | --- | --- |
| `business_name` | Spray It Solutions | Legal or trading name, used in email |
| `business_short_name` | Spray It | Used in SMS, where characters cost money |
| `business_phone` | 0428 26 36 26 | Human-readable |
| `business_phone_e164` | +61428263626 | For `tel:` links |
| `business_email` | info@sprayitsolutions.com.au | Reply-to. Taken from their live site footer. |
| `website_url` | *(staging until sign-off)* | |
| `booking_url` | *(GHL calendar link)* | The phone consult calendar |
| `quote_form_url` | `/contact` | |
| `privacy_url` | `/privacy` | Required in marketing email |
| `review_url` | *(held by the agency)* | Google review short link, set in GHL |
| `owner_first_name` | Glenn | Signs the personal messages |
| `service_area` | Australia-wide | |
| `trade_noun` | spray foam insulation | "your `{{trade_noun}}` enquiry" |
| `trade_verb` | sealing | "what needs `{{trade_verb}}`" |
| `assessment_noun` | site assessment | Some trades say inspection, survey, measure |
| `consult_length` | 15 minute | |
| `office_hours` | Mon to Fri, 7am to 5pm | *(to confirm)* |
| `deposit_percent` | *(varies, not always taken)* | Deposits apply to some jobs only, see the deposit note in CRM-PIPELINES |
| `sms_signoff` | Spray It | Sender identification, see §5 |

> **Needs Glenn:** trading hours. That is the only outstanding value.
>
> The business email came from their own site. The review link is held by the
> agency. There is deliberately no ABN field: quotes and invoices are documents
> the client issues himself and they carry it, so repeating it in a covering
> email would create a value with no owner.

---

## 3. Custom fields

### 3.1 Contact fields, from the website webhook

These arrive already populated. Field key is what you reference as
`{{contact.<key>}}`.

| Key | Label | Type | Options |
| --- | --- | --- | --- |
| `property_type` | Property type | Dropdown | home, new-build, shed, factory, farm, other |
| `building_stage` | Building stage | Dropdown | existing, construction, planning |
| `areas` | Areas to insulate | Text | roof, walls, underfloor, whole, unsure |
| `timeframe` | Timeframe | Dropdown | asap, 1-3-months, 3-plus-months, researching |
| `postcode` | Postcode | Text | |
| `enquiry_message` | Enquiry message | Multi-line | |
| `phone_raw` | Phone as typed | Text | |

The webhook sends the third field as `stage`. **Map it to `building_stage`.** It
is the building's stage, not the pipeline stage, and on a twelve column board
those two get confused fast.

### 3.2 Contact fields, consent evidence

| Key | Label | Type |
| --- | --- | --- |
| `consent_marketing` | Marketing consent | Dropdown: yes, no |
| `consent_text` | Consent wording shown | Multi-line |
| `consent_at` | Consent timestamp | Date |
| `consent_page` | Consent page URL | Text |

Never overwrite these on a later form fill. Under the Spam Act what matters is
the wording someone actually saw, so a second submission should append a new
record rather than replace the original evidence.

### 3.3 Contact fields, attribution

| Key | Type |
| --- | --- |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id` | Text |
| `gclid`, `fbclid` | Text |
| `first_touch_at` | Date |
| `first_touch_referrer`, `first_touch_landing` | Text |
| `last_touch_referrer`, `last_touch_landing` | Text |
| `source`, `form_name`, `submitted_at`, `page_title` | Text |

Set first-touch fields **only if empty**. Overwriting them on every visit
destroys the thing they exist to measure.

### 3.4 Contact fields, CRM-managed

Not from the website. Set by workflows.

| Key | Label | Type | Set by |
| --- | --- | --- | --- |
| `contact_attempts` | Contact attempts | Number | The chase sequence, incremented per attempt |
| `last_attempt_at` | Last attempt | Date | The chase sequence |
| `preferred_contact` | Preferred contact | Dropdown: call, sms, email | Asked on the consult |
| `do_not_sms` | Do not SMS | Checkbox | Manual, on request |

### 3.5 Opportunity fields

| Key | Label | Type | Stage it is set |
| --- | --- | --- | --- |
| `site_address` | Site address | Text | Qualified |
| `access_notes` | Access notes | Multi-line | Assessment |
| `sqm_estimate` | Area, sqm | Number | Assessment |
| `product_type` | Product | Dropdown: open cell, closed cell, both | Assessment |
| `assessment_date` | Assessment date | Date | Assessment Booked |
| `quote_number` | Quote number | Text | Quoting |
| `quote_sent_at` | Quote sent | Date | Quote Sent |
| `deposit_amount` | Deposit amount | Monetary | Won |
| `deposit_received_at` | Deposit received | Date | Scheduled |
| `job_start_date` | Job start | Date | Scheduled |
| `job_end_date` | Job end | Date | Scheduled |
| `crew_assigned` | Crew | Text | Scheduled |
| `variation_amount` | Variations | Monetary | In Progress |
| `photos_captured` | Photos captured | Checkbox | In Progress |
| `invoice_number` | Invoice number | Text | Invoiced |
| `invoice_sent_at` | Invoice sent | Date | Invoiced |
| `po_number` | Purchase order | Text | Commercial, on Won |
| `lost_reason` | Lost reason | Dropdown | On Lost |

`product_type` is the one field on this list that is genuinely trade-specific.
For another client it becomes whatever their equivalent choice is.

---

## 4. Assets each message needs

| Asset | Used by | Status |
| --- | --- | --- |
| Booking calendar | BOOK, APPT | Needs the GHL calendar built |
| Quote template | QUOTE | Glenn's existing template, or built in GHL |
| Review short link | REV | Needs the Google review link |
| Job preparation PDF | JOB-02 | Needs writing, see note in that message |
| Completion certificate or warranty | JOB-05 | Needs Glenn's existing document |
| Unsubscribe link | All marketing email | GHL provides `{{unsubscribe_link}}` |

---

## 5. The compliance line: transactional against marketing

Every message below is tagged.

**`TRANS` (transactional).** About an enquiry, appointment or job the person
already has with us. No marketing consent required. No unsubscribe link
required. Still identifies the sender, which the Spam Act requires of commercial
electronic messages generally.

**`MKTG` (marketing).** Promotional. Sends **only** when
`{{contact.consent_marketing}}` is `yes`. Must carry a functional unsubscribe.
This is the entire reason the consent fields exist.

Three rules that apply to every message:

1. **Every SMS identifies the sender.** `{{custom_values.sms_signoff}}` appears
   in every one. An unidentified SMS is the most common Spam Act failure.
2. **Every marketing SMS carries an opt-out.** "Reply STOP to opt out." GHL
   handles STOP natively and sets DND, but the wording still has to be there.
3. **Outbound send window: 8am to 8pm, Monday to Saturday, local time.** The Do
   Not Call industry standard governs telemarketing *calls*, not SMS to someone
   who enquired. We apply the same window to outbound messaging as policy
   anyway, because a 6am quote chase costs more goodwill than it earns. Use
   GHL's workflow **Wait until a time window** step, not a hope that nobody
   submits at midnight.

---

## 6. Message inventory

| ID | Channel | Trigger | Type | Reuse |
| --- | --- | --- | --- | --- |
| X-ACK-01 | SMS | Enters New Enquiry, within 2 min | TRANS | CORE |
| X-ACK-02 | Email | Enters New Enquiry | TRANS | CORE |
| X-CHASE-01 | SMS | Attempt 1, call not answered | TRANS | CORE |
| X-CHASE-02 | Email | Day 2, no reply | TRANS | CORE |
| X-CHASE-03 | SMS | Day 4, no reply | TRANS | CORE |
| X-CHASE-04 | Email | Day 7, final | TRANS | CORE |
| X-BOOK-01 | SMS | Enters Qualified | TRANS | CORE |
| X-BOOK-02 | Email | Enters Qualified | TRANS | CORE |
| X-APPT-01 | Email | Booking made | TRANS | CORE |
| X-APPT-02 | SMS | Booking made | TRANS | CORE |
| X-APPT-03 | SMS | 24 hours before | TRANS | CORE |
| X-APPT-04 | SMS | 2 hours before | TRANS | CORE |
| X-APPT-05 | SMS | No-show | TRANS | CORE |
| X-APPT-06 | Email | Rescheduled or cancelled | TRANS | CORE |
| R-ASSESS-01 | SMS | Assessment booked | TRANS | CORE |
| R-ASSESS-02 | SMS | Morning of assessment | TRANS | CORE |
| R-QUOTE-01 | Email | Enters Quote Sent | TRANS | CORE |
| R-QUOTE-02 | SMS | Enters Quote Sent | TRANS | CORE |
| R-FU-01 | SMS | Quote day 2 | TRANS | CORE |
| R-FU-02 | Email | Quote day 5 | TRANS | **TRADE** |
| R-FU-03 | SMS | Quote day 10 | TRANS | CORE |
| R-FU-04 | Email | Quote day 21, final | TRANS | CORE |
| X-WON-01 | Email | Status set to Won | TRANS | CORE |
| X-WON-02 | SMS | Status set to Won | TRANS | CORE |
| JOB-01 | SMS | Enters Scheduled | TRANS | CORE |
| JOB-02 | Email | Enters Scheduled | TRANS | **TRADE** |
| JOB-03 | SMS | Day before start | TRANS | CORE |
| JOB-04 | SMS | Morning of start | TRANS | CORE |
| JOB-05 | Email | Enters Invoiced | TRANS | **TRADE** |
| PAY-01 | Email | Enters Invoiced | TRANS | CORE |
| PAY-02 | SMS | Invoice day 7 | TRANS | CORE |
| PAY-03 | Email | Invoice day 14 | TRANS | CORE |
| REV-01 | SMS | Enters Paid & Closed, +1 day | TRANS | CORE |
| REV-02 | Email | Paid & Closed, +7 days | MKTG | CORE |
| REV-03 | Email | Paid & Closed, +12 months | MKTG | CORE |
| NUR-01 | Email | Enters Nurture | MKTG | **TRADE** |
| NUR-02 | Email | Nurture, +30 days | MKTG | **TRADE** |
| NUR-03 | Email | Nurture, +90 days | MKTG | CORE |
| SYS-01 | SMS | Missed inbound call | TRANS | CORE |
| SYS-02 | SMS | Inbound SMS out of hours | TRANS | CORE |
| C-ACK-01 | Email | Commercial New Enquiry | TRANS | CORE |
| C-INSP-01 | Email | Inspection Booked | TRANS | CORE |
| C-PROP-01 | Email | Proposal Submitted | TRANS | CORE |
| C-PROP-02 | Email | Proposal day 7 | TRANS | CORE |
| C-PROP-03 | Email | Proposal day 21 | TRANS | CORE |
| C-PO-01 | Email | Enters Awaiting PO | TRANS | CORE |
| C-MOB-01 | Email | Enters Mobilising | TRANS | **TRADE** |
| C-PAY-01 | Email | Progress claim | TRANS | CORE |

48 messages. Build the `X-` and `R-` sets first; the commercial set can follow,
since that board runs at a pace where a human writing the email is still viable.

---

## 7. Shared messages

### X-ACK-01 · SMS · New Enquiry, within 2 minutes · TRANS · CORE

```
Hi {{contact.first_name}}, {{custom_values.business_short_name}} here. We have your enquiry and one of us will call you today. Need us sooner? {{custom_values.business_phone}}
```

Speed is the whole point. This fires before anyone has looked at the lead, so it
must promise only what automation can guarantee: that a human will call.

### X-ACK-02 · Email · New Enquiry · TRANS · CORE

**Subject:** We have your enquiry, {{contact.first_name}}

```
Hi {{contact.first_name}},

Thanks for getting in touch. We have your enquiry and one of the family will
call you, usually the same working day.

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

We cannot price {{custom_values.trade_noun}} properly without seeing the
building, so nobody is going to quote you a number over the phone. The call is
to work out whether it is the right answer for you at all.

{{custom_values.owner_first_name}} and the team
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

Echoing their answers back cuts "did that go through?" replies and catches a
wrong postcode before it wastes a site visit.

### X-CHASE-01 · SMS · Attempt 1, call not answered · TRANS · CORE

```
Hi {{contact.first_name}}, tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.business_phone}} when it suits. {{custom_values.sms_signoff}}
```

### X-CHASE-02 · Email · Day 2, no reply · TRANS · CORE

**Subject:** Still keen to help with your {{custom_values.trade_noun}}

```
Hi {{contact.first_name}},

We have tried you a couple of times without luck. No rush at our end, we just do
not want to keep ringing if now is a bad time.

Three ways to pick this back up:

  Reply to this email with a time that suits
  Book a call yourself: {{custom_values.booking_url}}
  Ring us on {{custom_values.business_phone}}

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

### X-CHASE-03 · SMS · Day 4 · TRANS · CORE

```
Hi {{contact.first_name}}, still happy to talk through your {{custom_values.trade_verb}} job whenever suits. Pick a time here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}
```

### X-CHASE-04 · Email · Day 7, final · TRANS · CORE

**Subject:** Closing this one off

```
Hi {{contact.first_name}},

We have not been able to reach you, so we will close this enquiry off rather
than keep chasing.

Nothing is lost. If the job comes back around, reply to this email or ring
{{custom_values.business_phone}} and we will pick it straight back up.

All the best with it either way.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

The honest close is the highest-replying message in the sequence. Do not soften
it into another chase or it stops working.

### X-BOOK-01 · SMS · Enters Qualified · TRANS · CORE

```
Hi {{contact.first_name}}, good to talk. Grab a time for the {{custom_values.assessment_noun}} here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}
```

### X-BOOK-02 · Email · Enters Qualified · TRANS · CORE

**Subject:** Booking your {{custom_values.assessment_noun}}

```
Hi {{contact.first_name}},

Thanks for the chat. Next step is the {{custom_values.assessment_noun}}, where
we measure up and look at access so the quote is a real number rather than a
guess.

Pick a time that suits: {{custom_values.booking_url}}

It takes about an hour. Someone needs to be there to let us in, and we will need
to get at {{contact.areas}}.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

### X-APPT-01 · Email · Booking made · TRANS · CORE

**Subject:** Confirmed: {{appointment.start_time}}

```
Hi {{contact.first_name}},

You are booked in.

  When   {{appointment.start_time}}
  What   {{appointment.title}}
  Where  We call you on {{contact.phone}}

Need to change it?
  Reschedule: {{appointment.reschedule_link}}
  Cancel: {{appointment.cancellation_link}}

{{custom_values.business_name}}
{{custom_values.business_phone}}
```

### X-APPT-02 · SMS · Booking made · TRANS · CORE

```
Booked in for {{appointment.start_time}}. We will call you on {{contact.phone}}. Change it here: {{appointment.reschedule_link}} {{custom_values.sms_signoff}}
```

### X-APPT-03 · SMS · 24 hours before · TRANS · CORE

```
Reminder: your call with {{custom_values.business_short_name}} is tomorrow, {{appointment.start_time}}. Need to move it? {{appointment.reschedule_link}}
```

### X-APPT-04 · SMS · 2 hours before · TRANS · CORE

```
Your call with {{custom_values.business_short_name}} is at {{appointment.start_time}}, about 2 hours away. Talk soon.
```

### X-APPT-05 · SMS · No-show · TRANS · CORE

```
Hi {{contact.first_name}}, we missed you just now. No problem, grab another time here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}
```

### X-APPT-06 · Email · Rescheduled or cancelled · TRANS · CORE

**Subject:** Your booking has changed

```
Hi {{contact.first_name}},

That booking has been updated.

  Now   {{appointment.start_time}}

If that is not right, ring us on {{custom_values.business_phone}}.

{{custom_values.business_name}}
```

---

## 8. Residential messages

### R-ASSESS-01 · SMS · Assessment booked · TRANS · CORE

```
Hi {{contact.first_name}}, {{custom_values.business_short_name}} booked for {{opportunity.assessment_date}} at {{opportunity.site_address}}. Takes about an hour. {{custom_values.sms_signoff}}
```

### R-ASSESS-02 · SMS · Morning of assessment · TRANS · CORE

```
Morning {{contact.first_name}}, we are coming to you today for the {{custom_values.assessment_noun}}. We will text when we are close. {{custom_values.sms_signoff}}
```

### R-QUOTE-01 · Email · Enters Quote Sent · TRANS · CORE

**Subject:** Your quote from {{custom_values.business_name}}

```
Hi {{contact.first_name}},

Your quote is attached. Quote number {{opportunity.quote_number}}.

It covers {{contact.areas}} at {{opportunity.site_address}}, using
{{opportunity.product_type}}.

A few things worth saying plainly:

  The price includes everything. No separate charge for access, setup or
  clean-up.
  It is valid for 30 days, mostly because material costs move.
  If anything in it does not make sense, ring us. We would rather explain it
  than have you sign something you are unsure about.

Any questions at all, {{custom_values.business_phone}}.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

### R-QUOTE-02 · SMS · Enters Quote Sent · TRANS · CORE

```
Hi {{contact.first_name}}, your quote is in your inbox. Any questions, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}
```

### R-FU-01 · SMS · Quote day 2 · TRANS · CORE

```
Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}
```

### R-FU-02 · Email · Quote day 5 · TRANS · **TRADE**

**Subject:** Why our number might look different

```
Hi {{contact.first_name}},

If you are comparing quotes, one thing is worth knowing, because it is the
reason two numbers for the "same" job can look nothing alike.

Insulation is sold on R-value, and R-value is measured on a flat, perfect,
uninterrupted sample. Nothing in that test involves a stud, a pipe, a
downlight, an untidy edge or wind.

A real wall has all of those. Cut products leave edges, edges leave gaps, and
air moves through gaps carrying heat with it. That path is not in the rating at
all, which is why two walls rated the same can feel completely different to
live in.

We wrote the whole thing up here, with a diagram:
{{custom_values.website_url}}/spray-foam#r-value

Not trying to talk you out of anything. Just make sure you are comparing the
finished wall, not the number on the bag.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

**`TRADE`.** This is the objection-handling message, and it is specific to
insulation. For another client, replace it with their equivalent: the thing
customers get wrong when comparing quotes in that trade. Keep the structure,
which is "here is the thing nobody tells you", not "here is why we are better".

### R-FU-03 · SMS · Quote day 10 · TRANS · CORE

```
Hi {{contact.first_name}}, still thinking it over or has something changed? Either is fine, just want to know whether to keep the slot free. {{custom_values.sms_signoff}}
```

Asking a real question outperforms "just checking in", because it is answerable
in one word.

### R-FU-04 · Email · Quote day 21, final · TRANS · CORE

**Subject:** Should I close this off?

```
Hi {{contact.first_name}},

I have not heard back on quote {{opportunity.quote_number}}, so I will assume
the timing is not right and close it off.

If that is wrong, just reply and we will pick it up. If you went with someone
else, that is completely fine, and if you can tell me why I would genuinely
find it useful.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

The "why" ask feeds the Lost reason field, which is what makes the Price against
Chose batts split on the board real rather than guessed.

---

## 9. Won and delivery

### X-WON-01 · Email · Status set to Won · TRANS · CORE

**Subject:** Locked in. Here is what happens next.

```
Hi {{contact.first_name}},

Thanks for going ahead. Here is how this runs from here.

  1. Deposit of {{opportunity.deposit_amount}} confirms the booking.
  2. We lock a start date and confirm it with you.
  3. We send you a short note on how to prepare the space.
  4. The crew arrives and does the work.

Deposit details are on the quote. Once it lands we will be in touch with dates.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

### X-WON-02 · SMS · Status set to Won · TRANS · CORE

```
Thanks {{contact.first_name}}. Deposit details are on your quote, and we will confirm dates as soon as it lands. {{custom_values.sms_signoff}}
```

### JOB-01 · SMS · Enters Scheduled · TRANS · CORE

```
Hi {{contact.first_name}}, you are booked for {{opportunity.job_start_date}}. Prep notes are in your email. {{custom_values.sms_signoff}}
```

### JOB-02 · Email · Enters Scheduled · TRANS · **TRADE**

**Subject:** Your job is booked for {{opportunity.job_start_date}}

```
Hi {{contact.first_name}},

You are in the diary.

  Start   {{opportunity.job_start_date}}
  Finish  {{opportunity.job_end_date}}
  Where   {{opportunity.site_address}}
  Crew    {{opportunity.crew_assigned}}

To help us get in and out cleanly, before we arrive:

  Clear access to {{contact.areas}}. We need room to work and to get the hose
  through.
  Move anything you would rather not have dust near.
  Make sure we can park close. The rig runs off the truck.
  Pets somewhere else for the day, please.
  Somebody over 18 on site to let us in.

While we are spraying, the area needs to be empty of people and pets.
Afterwards the space needs time before you use it again. That is anywhere from
about an hour to a full day depending on which foam the job calls for, and the
crew will tell you which applies to yours before they leave.

Anything you are unsure about, ring {{custom_values.business_phone}}.

{{custom_values.business_name}}
```

**`TRADE`.** The preparation list is the job. For another client this is their
own list, and it is worth getting from the crew rather than the office, because
the crew know what actually goes wrong on arrival.

Re-occupancy is product-dependent, confirmed by the client: as little as an
hour for some foams, up to 24 hours for others. The message gives the range and
leaves the specific figure to the crew on the day, which is the only accurate
way to state it without knowing the product before the job is specified.

### JOB-03 · SMS · Day before start · TRANS · CORE

```
Hi {{contact.first_name}}, we are with you tomorrow from {{opportunity.job_start_date}}. Access clear and pets sorted? {{custom_values.sms_signoff}}
```

### JOB-04 · SMS · Morning of start · TRANS · CORE

```
Morning {{contact.first_name}}, {{opportunity.crew_assigned}} is on the way to you now. {{custom_values.sms_signoff}}
```

### JOB-05 · Email · Enters Invoiced · TRANS · **TRADE**

**Subject:** All done at {{opportunity.site_address}}

```
Hi {{contact.first_name}},

The job is finished. Photos of the completed work are attached, along with your
paperwork.

What we did:
  {{contact.areas}}, using {{opportunity.product_type}}
  {{opportunity.sqm_estimate}} sqm

Living with it:
  There is nothing to maintain. It does not settle, sag or need topping up.
  If you ever cut into it for a new downlight or a pipe, seal it back up. An
  opening in a sealed layer costs more than the same opening in an unsealed
  one.
  You may notice the place holds temperature longer and is quieter. Both are
  the foam doing its job.

Your invoice is on its way separately.

Thanks for having us.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

### PAY-01 · Email · Enters Invoiced · TRANS · CORE

**Subject:** Invoice {{opportunity.invoice_number}}

```
Hi {{contact.first_name}},

Invoice {{opportunity.invoice_number}} is attached for the work at
{{opportunity.site_address}}.

Payment details are on the invoice. Any questions about it, ring
{{custom_values.business_phone}}.

{{custom_values.business_name}}
```

### PAY-02 · SMS · Invoice day 7 · TRANS · CORE

```
Hi {{contact.first_name}}, friendly reminder that invoice {{opportunity.invoice_number}} is due. Any issues, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}
```

### PAY-03 · Email · Invoice day 14 · TRANS · CORE

**Subject:** Invoice {{opportunity.invoice_number}} is now overdue

```
Hi {{contact.first_name}},

Invoice {{opportunity.invoice_number}} is now overdue. A copy is attached.

If there is a problem with it, or you need a different arrangement, ring
{{custom_values.business_phone}} and we will sort it out. We would much rather
talk than chase.

{{custom_values.business_name}}
```

Stop this sequence dead when payment is marked. A reminder sent after someone
has paid does more damage than the reminder was worth.

---

## 10. After the job

### REV-01 · SMS · Paid & Closed, +1 day · TRANS · CORE

```
Hi {{contact.first_name}}, thanks again. If you were happy with the job, a quick Google review really helps a family business: {{custom_values.review_url}} {{custom_values.sms_signoff}}
```

Ask once, by SMS, the day after payment. Do not chase reviews.

### REV-02 · Email · Paid & Closed, +7 days · MKTG · CORE

**Subject:** Know anyone else with the same problem?

```
Hi {{contact.first_name}},

Hope the place is holding its temperature.

Most of our work comes from people passing our name on. If someone you know is
fighting the same problem, send them our way or pass on
{{custom_values.business_phone}}.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

You are getting this because you agreed to hear from us. {{unsubscribe_link}}
```

### REV-03 · Email · Paid & Closed, +12 months · MKTG · CORE

**Subject:** A year on, how is it going?

```
Hi {{contact.first_name}},

It has been about a year since we did the work at {{opportunity.site_address}}.
No agenda here, we just like knowing how jobs hold up.

If anything is not as you expected, tell us and we will come and look.

And if you have taken on more of the building since, the rest of it is usually
easier the second time, because we already know the place.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

---

## 11. Nurture

Marketing. Sends only when `{{contact.consent_marketing}}` is `yes`. Every one
carries an unsubscribe.

### NUR-01 · Email · Enters Nurture · MKTG · **TRADE**

**Subject:** The bit about R-value nobody explains

```
Hi {{contact.first_name}},

You mentioned the timing was not right, which is fair enough. Here is something
worth knowing before you get to the point of comparing quotes.

R-value is measured on a flat, perfect, uninterrupted sample. Nothing in that
test involves a stud, a pipe, a downlight, an untidy edge or wind. A real wall
has all of those, and air moving through gaps carries heat with it.

Which is why two walls rated the same can feel completely different.

The full explanation, with a diagram of both walls:
{{custom_values.website_url}}/spray-foam#r-value

No rush from us. When it comes back around, we will be here.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

### NUR-02 · Email · Nurture, +30 days · MKTG · **TRADE**

**Subject:** Where the heat actually goes

```
Hi {{contact.first_name}},

A third of your heating leaves through the roof, more through the walls, and
the rest through the floor. The floor is the one almost nobody insulates, and
it is the one people notice most once it is done.

There is an interactive version of this on our site. Scroll and the house seals
itself while the meter drops:
{{custom_values.website_url}}

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

### NUR-03 · Email · Nurture, +90 days · MKTG · CORE

**Subject:** Still on the list?

```
Hi {{contact.first_name}},

We have been sending you the occasional note since you enquired. If the project
is still somewhere on the horizon, no action needed and we will keep in touch
now and then.

If it is off the table, unsubscribe below and we will leave you alone. No hard
feelings.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}

{{unsubscribe_link}}
```

A permission reset every 90 days keeps the list clean and the deliverability
healthy. It is also the honest thing to do.

---

## 12. System messages

### SYS-01 · SMS · Missed inbound call · TRANS · CORE

```
Sorry we missed your call. This is {{custom_values.business_short_name}}. Reply here and we will get straight back to you, or we will ring you shortly.
```

Fires within 60 seconds of a missed call. For a trade business where the phone
rings while someone is up a ladder, this is the single highest-value automation
on the list.

### SYS-02 · SMS · Inbound SMS outside hours · TRANS · CORE

```
Thanks for your message. We are back {{custom_values.office_hours}} and will reply first thing. Urgent? {{custom_values.business_phone}}.
```

Send once per contact per day, not once per message.

---

## 13. Commercial messages

Commercial buys differently. These are longer, plainer and carry no urgency
devices, because the reader is a facility manager or a builder with a file open,
not a homeowner.

### C-ACK-01 · Email · Commercial New Enquiry · TRANS · CORE

**Subject:** Your enquiry, {{contact.first_name}}

```
Hi {{contact.first_name}},

Thanks for the enquiry regarding {{contact.property_type}} at
{{contact.postcode}}.

We will call you to scope it. Before that call it helps to know:

  Approximate area, in square metres
  What the space is used for, and any temperature requirement
  Whether the building is occupied or operating during the works
  Programme dates, if they are set
  Who else needs to be involved in the decision

We work {{custom_values.service_area}} and hold current insurances and SWMS
documentation, which we can supply on request.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
{{custom_values.business_phone}}
```

### C-INSP-01 · Email · Inspection Booked · TRANS · CORE

**Subject:** Site inspection confirmed, {{opportunity.assessment_date}}

```
Hi {{contact.first_name}},

Confirmed for {{opportunity.assessment_date}} at {{opportunity.site_address}}.

Please let us know before the visit:

  Site induction requirements, and how long they take
  PPE beyond standard
  Access arrangements, including any permits or escorts
  A site contact and mobile for the day

We will bring insurances and SWMS. If you need those in advance for your own
records, reply and we will send them through.

{{custom_values.business_name}}
```

### C-PROP-01 · Email · Proposal Submitted · TRANS · CORE

**Subject:** Proposal, {{opportunity.site_address}}

```
Hi {{contact.first_name}},

Our proposal is attached.

  Scope       {{contact.areas}}
  Area        {{opportunity.sqm_estimate}} sqm
  Product     {{opportunity.product_type}}
  Reference   {{opportunity.quote_number}}

It includes the specification, programme, and the compliance documentation you
will need for your own records.

If you need it broken down differently for internal approval, or split into
stages, tell us what shape it needs to be in and we will reissue it.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

The offer to reformat is deliberate. Losing a commercial job because the numbers
were not in the shape procurement needed is an avoidable loss.

### C-PROP-02 · Email · Proposal day 7 · TRANS · CORE

**Subject:** Anything you need on {{opportunity.quote_number}}?

```
Hi {{contact.first_name}},

Checking whether you need anything further on the proposal for
{{opportunity.site_address}}. References, insurances, a site visit for your own
team, or a revised breakdown, all easy.

Also useful for us: is there a decision date we should be working to?

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

### C-PROP-03 · Email · Proposal day 21 · TRANS · CORE

**Subject:** {{opportunity.quote_number}}, where does this sit?

```
Hi {{contact.first_name}},

Following up on {{opportunity.quote_number}}. Happy either way, we just need to
know whether to hold capacity.

  Still live, decision pending
  Deferred to a later budget
  Gone elsewhere

Any of those is a useful answer.

{{custom_values.owner_first_name}}
{{custom_values.business_name}}
```

### C-PO-01 · Email · Enters Awaiting PO · TRANS · CORE

**Subject:** Ready to proceed, {{opportunity.site_address}}

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

### C-MOB-01 · Email · Enters Mobilising · TRANS · **TRADE**

**Subject:** Mobilising for {{opportunity.site_address}}

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

That last one matters more than it sounds. The area has to be free of other
trades during application and cure.

{{custom_values.business_name}}
```

### C-PAY-01 · Email · Progress claim · TRANS · CORE

**Subject:** Progress claim {{opportunity.invoice_number}}

```
Hi {{contact.first_name}},

Progress claim {{opportunity.invoice_number}} is attached for works at
{{opportunity.site_address}}.

  Claim covers   [stage or percentage]
  Terms          [payment terms]

Supporting photos and any sign-offs are included.

{{custom_values.business_name}}
```

> **Needs Glenn:** payment terms for commercial work, and whether progress
> claims follow a percentage, a milestone, or a monthly cycle.

---

## 14. Build order

Do not build all 48 at once. In order of what earns most:

1. **SYS-01**, missed call text back. Highest return of anything here.
2. **X-ACK-01 and 02**, the two minute acknowledgement.
3. **X-CHASE-01 to 04**, the chase sequence with its honest close.
4. **X-APPT-01 to 06**, so bookings stop being no-shows.
5. **R-QUOTE and R-FU-01 to 04**, the follow-up that converts quotes.
6. **JOB and PAY**, the delivery half.
7. **REV-01**, the review ask.
8. **NUR**, once there is a nurture list worth mailing.
9. **The commercial set**, last. That board moves slowly enough that a human
   writing the email is still perfectly viable.
