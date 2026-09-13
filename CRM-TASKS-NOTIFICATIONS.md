# CRM Tasks and Notifications

What the team gets told, when, and what they are expected to do about it.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md) and
[CRM-MESSAGING.md](CRM-MESSAGING.md). Messaging covers what the *customer*
receives. This covers what *you* receive.

**Generated.** The alerts and tasks below are produced from
`client-journey-onepage/journey-data.js`, the same file that renders the
customer journey page, where each of them is shown under the stage it belongs
to. Edit the data file and run the generator. Editing this file by hand will be
overwritten.

Written as a template. Roles are tokenised, so a new client is a reassignment
rather than a rebuild.

---

## 1. The governing principle

> **A notification is a request to do something. If nothing needs doing, it is
> not a notification, it is a report.**

Reports go in a digest. Only actions interrupt.

This is the rule that decides everything below, and it is the one most CRM
builds get wrong. A system that pings on every stage change trains everyone to
ignore it inside a fortnight, and then the one alert that actually mattered gets
ignored too. There are 11 real-time alerts in this document. That is
deliberate, and adding a twelfth should require an argument.

---

## 2. Roles

Set up as users on the platform, then referenced by role throughout so another
client is a reassignment rather than a rewrite.

| Role | Who at Spray It | Owns |
| --- | --- | --- |
| `OWNER` | Glenn | Commercial deals, pricing, anything escalated |
| `OFFICE` | To confirm | First response, booking, chasing, invoicing |
| `ESTIMATOR` | To confirm, may be Glenn | Assessments and quotes |
| `CREW_LEAD` | Per job | Delivery stages, site photos |

> **Needs Glenn:** who fills OFFICE and ESTIMATOR, and whether they are separate
> people or both him. If they are both him, the escalation ladder in §5 needs a
> second name or it escalates to itself.

**Round robin.** If more than one person can take a new lead, use the platform's
round robin assignment on the New Enquiry trigger. Unassigned leads are the
single most common way a lead dies: everybody assumes somebody.

---

## 3. Real-time alerts

11. These interrupt. Everything else waits for a digest.

| # | Alert | Trigger | To | Channel | Why it interrupts |
| --- | --- | --- | --- | --- | --- |
| 1 | **New enquiry** | Opportunity created | Assigned user | SMS and in-app | Speed to lead is the whole game. |
| 2 | **Missed call** | Inbound call not answered | OFFICE | SMS | The auto-reply already went. A human still has to ring back. |
| 3 | **Inbound reply** | Contact replies by SMS | Assigned user | In-app and SMS | A reply is a live conversation. Every sequence on the card pauses. |
| 4 | **Booking made** | Appointment booked | Assigned user | In-app | The diary changed. |
| 5 | **Booking cancelled** | Appointment cancelled | Assigned user | SMS | A hole in the day, recoverable if caught early. |
| 6 | **Commercial enquiry** | Opportunity created on the Commercial board | OWNER | SMS | Different sale, different person, immediately. |
| 7 | **Lead unattended for an hour** | Still in New Enquiry after 60 minutes | Assigned user and OWNER | SMS | The escalation ladder. Business hours only, and it pauses overnight. |
| 8 | **Quote accepted** | Status set to Won | OWNER and OFFICE | SMS | Triggers deposit, scheduling and crew. |
| 9 | **Deposit received** | deposit_received_at is set | OFFICE | In-app | Unblocks scheduling on the jobs that take one. |
| 10 | **Negative review or complaint** | Review under 4 stars, or a complaint tag | OWNER | SMS | Reputation decays fast. A same-day call fixes most of them. |
| 11 | **Automation failure** | Workflow error, or the lead webhook returns 4xx or 5xx | OWNER | Email | A silent failure means leads are vanishing. The platform will not tell you loudly, so this is built deliberately. |

### What each one says

Written so the person can act without opening the CRM. Someone standing on a
roof can read the first one and decide whether to climb down.

**1. New enquiry** · Act now

```
NEW LEAD: {{contact.first_name}} {{contact.last_name}}
{{contact.phone}}
{{contact.property_type}} / {{contact.areas}}
{{contact.timeframe}} / {{contact.postcode}}
Source: {{contact.utm_source}}
```

Enough to act without opening the CRM. Someone standing on a roof can read that and decide whether to climb down.

**2. Missed call** · Act now

```
MISSED CALL: {{contact.phone}} ({{contact.first_name}}). Text-back sent. Ring them.
```

**3. Inbound reply** · Act now

```
REPLY from {{contact.first_name}}: "{{message.body}}"
```

**4. Booking made** · Good to know

```
BOOKED: {{contact.first_name}}, {{appointment.start_time}}. Read the enquiry before the call.
```

**5. Booking cancelled** · Heads up

```
CANCELLED: {{contact.first_name}}, {{appointment.start_time}}. Slot is open. A two-line personal note often saves it.
```

**6. Commercial enquiry** · Act now

```
COMMERCIAL LEAD: {{contact.first_name}} {{contact.last_name}}, {{contact.company}}
{{contact.property_type}} / {{contact.postcode}}
{{contact.phone}}
```

**7. Lead unattended for an hour** · Act now

```
UNATTENDED 60 MIN: {{contact.first_name}} {{contact.phone}}. Reassigned to office.
```

**8. Quote accepted** · Win

```
WON: {{opportunity.name}}, {{opportunity.value}}. Deposit request sent. Schedule it.
```

**9. Deposit received** · Win

```
DEPOSIT IN: {{contact.first_name}}, {{opportunity.deposit_amount}}. Lock the date.
```

**10. Negative review or complaint** · Act now

```
REVIEW {{review.rating}} stars from {{review.author}}. Call them today.
```

**11. Automation failure** · Act now

```
WORKFLOW FAILED: {{workflow.name}} on {{contact.first_name}} {{contact.last_name}}. {{error.message}}
```

### What deliberately does not alert

Listed so nobody adds them back in later without a reason.

- Stage changes in general. Only Won and deposit do.
- Emails opened or links clicked. Interesting, not actionable.
- Form views, page views, chat opens.
- Every message in a sequence sending as designed.
- Nurture activity of any kind.
- Delivery stage progression. The crew know where they are.

---

## 4. Tasks

Alerts say *something happened*. Tasks say *you owe something*, and they persist
until closed. Anything with a deadline is a task, not an alert. 41 in
total across both boards.

### Naming convention

```
[VERB] [WHO]: [WHAT]
```

For example `CALL Emma: new enquiry, Underfloor, Roof or ceiling`. Verb first,
so a list of twenty tasks is scannable without opening any of them.

### Residential

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| New Enquiry | `CALL {{contact.first_name}}: new enquiry, {{contact.areas}}` | Assigned user | 1 hour |
| Contacting | `CALL {{contact.first_name}}: attempt 2` | Assigned user | Day 1 |
| Contacting | `CALL {{contact.first_name}}: attempt 3` | Assigned user | Day 2 |
| Contacting | `CALL {{contact.first_name}}: attempt 4` | Assigned user | Day 4 |
| Contacting | `CALL {{contact.first_name}}: final attempt` | Assigned user | Day 7 |
| Qualified | `BOOK {{contact.first_name}}: assessment` | OFFICE | 3 days |
| Assessment Booked | `ATTEND {{contact.first_name}}: assessment, {{opportunity.site_address}}` | ESTIMATOR | On the date |
| Quoting | `QUOTE {{contact.first_name}}: {{opportunity.site_address}}` | ESTIMATOR | 2 days |
| Quote Sent | `CALL {{contact.first_name}}: quote follow up` | Assigned user | Day 2 |
| Follow-up | `DECIDE {{contact.first_name}}: close or nurture` | Assigned user | Day 21 |
| Follow-up | `LOG {{contact.first_name}}: lost reason` | Assigned user | Same day, on Lost |
| Nurture | `REVIEW {{contact.first_name}}: still a fit?` | OWNER | Quarterly |
| Won | `INVOICE {{contact.first_name}}: deposit` | OFFICE | 1 day, where a deposit applies |
| Won | `SCHEDULE {{contact.first_name}}: allocate crew and date` | OFFICE | 3 days |
| Scheduled | `CONFIRM {{contact.first_name}}: day before` | OFFICE | Day before start |
| In Progress | `PHOTOS {{opportunity.site_address}}` | CREW_LEAD | On completion |
| In Progress | `VARIATIONS {{contact.first_name}}: record any extras` | CREW_LEAD | On completion |
| Invoiced | `INVOICE {{contact.first_name}}: final` | OFFICE | 1 day |
| Invoiced | `CHASE {{contact.first_name}}: payment overdue` | OFFICE | Day 14 |
| Paid & Closed | `REVIEW {{contact.first_name}}: did they leave one?` | OFFICE | Day 7 |

### Commercial & Industrial

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| New Enquiry | `CALL {{contact.first_name}}: commercial enquiry, {{contact.company}}` | OWNER | 1 hour |
| Contacting | `CALL {{contact.first_name}}: attempt 2` | OWNER | Day 1 |
| Contacting | `CALL {{contact.first_name}}: attempt 3` | OWNER | Day 3 |
| Contacting | `CALL {{contact.first_name}}: final attempt` | OWNER | Day 7 |
| Qualified / Scoping | `SCOPE {{contact.first_name}}: confirm decision maker and programme` | OWNER | 5 days |
| Inspection Booked | `ATTEND {{opportunity.site_address}}: inspection` | OWNER | On the date |
| Specifying | `SPEC {{opportunity.site_address}}: product, access, staging, WHS` | OWNER | 5 days |
| Proposal Submitted | `CALL {{contact.first_name}}: confirm receipt` | OWNER | 2 days |
| Commercial Review | `CHASE {{contact.first_name}}: decision date` | OWNER | Day 7, then day 21 |
| Awaiting PO | `CHASE {{contact.first_name}}: PO` | OWNER | Weekly |
| Future Project | `CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}` | OWNER | Quarterly |
| Won | `MOBILISE {{opportunity.site_address}}: programme, inductions, SWMS, materials` | OWNER | 2 working days |
| Mobilising | `INDUCT crew: {{opportunity.site_address}}` | CREW_LEAD | Before start |
| Mobilising | `SWMS {{opportunity.site_address}}: issue and confirm receipt` | OWNER | Before start |
| In Progress | `UPDATE {{contact.first_name}}: weekly progress` | OWNER | Every Friday while live |
| In Progress | `PHOTOS {{opportunity.site_address}}: this stage` | CREW_LEAD | End of each stage |
| In Progress | `VARIATIONS {{opportunity.site_address}}: record and get signed` | CREW_LEAD | As they happen |
| Invoicing | `CLAIM {{opportunity.site_address}}: issue per programme` | OFFICE | Per milestone |
| Invoicing | `CHASE {{contact.first_name}}: claim overdue` | OFFICE | Day 30 |
| Paid & Closed | `REFERENCE {{contact.first_name}}: ask, and record the answer` | OWNER | Day 7 |

### Always on

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| Any | `RING BACK {{contact.first_name}}: missed call` | OFFICE | 30 minutes |

### Two rules

1. **Every task has an owner and a due date.** The platform will let you create
   a task with neither. A task with no due date is a note.
2. **Completing the task does not move the card.** Moving the card is a
   separate, deliberate act. Otherwise the board reflects who is tidy about
   tasks rather than where jobs actually are.

---

## 5. Escalation

Two ladders. One for a lead nobody has touched, one for a card that has stopped
moving.

### Unattended lead

| Elapsed | Action |
| --- | --- |
| 0 min | Assign, notify, create the call task. Customer gets X-ACK-01. |
| 15 min | Reminder to the assigned user |
| **60 min** | **Escalate: SMS to assigned user and OWNER, reassign to OFFICE** |
| 4 hours | SMS to OWNER: *this lead has been sitting since {{time}}* |
| Next morning | Appears at the top of the daily digest until it moves |

Business hours only, and it pauses overnight. A lead that arrives at 11pm starts
its clock when the office opens, otherwise everyone wakes to a false alarm and
starts ignoring the escalation. On the commercial board the escalation goes to
Glenn rather than away from him, because commercial is his.

### Stalled card

Uses the stall times from the pipeline document. On breach:

| Breach | Action |
| --- | --- |
| First | Task reappears at the top of the assigned user's list |
| 2× the stall time | Line item in the daily digest |
| 3× the stall time | Named in the weekly review, with the card |

Note the escalation is toward **visibility**, not more alarms. A card stuck in
Follow-up for 40 days is not an emergency. It is a conversation to have on
Monday.

---

## 6. Digests

Where everything that is not an emergency goes.

### Daily, 7:00am, to OWNER and OFFICE

```
YESTERDAY
  New enquiries          {{count}}
  Calls made             {{count}}
  Quotes sent            {{count}}
  Jobs won               {{count}}, {{value}}

TODAY
  Assessments            {{list with time and address}}
  Jobs starting          {{list with crew}}
  Calls booked           {{list with time}}

NEEDS YOU
  Leads unattended       {{list}}
  Quotes overdue         {{list, over 2 days in Quoting}}
  Proposals overdue      {{list, over 5 days in Specifying}}
  Follow-ups due         {{count}}
  Invoices overdue       {{list with amount and days}}
```

`NEEDS YOU` goes last on purpose. It is the section people act on, so it should
be the thing their eye lands on when they stop scrolling.

### Weekly, Monday 7:00am, to OWNER

```
LAST WEEK
  Enquiries              {{count}}, by source
  Median time to first contact
  Enquiry to Qualified   {{percent}}
  Quotes sent            {{count}}, {{value}}
  Won                    {{count}}, {{value}}
  Lost                   {{count}}, by reason

PIPELINE NOW
  Open value             {{value}}      <- the forecast
  Won not yet delivered  {{value}}      <- committed work
  Cards stalled 3x       {{list}}

DELIVERY
  Jobs completed         {{count}}
  Average days Won to Paid
  Invoices outstanding   {{value}}
```

The two pipeline lines are separated because the boards merged sales and
delivery. An unfiltered pipeline figure on a merged board is roughly double what
is really in play, so the digest never shows one.

### Monthly, to OWNER

Cost per enquiry and cost per won job by `utm_source`, `gclid` and `fbclid`,
against **paid revenue**, not quotes sent. This is the number that decides ad
spend, and it only exists because attribution now survives all the way to
payment.

---

## 7. Quiet hours

| | Alerts | Tasks | Customer messages |
| --- | --- | --- | --- |
| Monday to Friday, 7am to 6pm | All | Normal | Normal |
| Saturday, 8am to 2pm | Critical only: 1, 2, 6, 10, 11 | Held | Held |
| Outside those hours | None | Held | Held to the next window |
| Sunday and public holidays | None | Held | Held |

Held customer messages queue and release at the next window. Use the platform's
**Wait until a time window** step; do not rely on nobody enquiring at midnight.

On the legal position: the Do Not Call industry standard sets permitted hours
for telemarketing *calls*. It does not govern SMS to someone who enquired, and
transactional messages are a different category again. The window above is
policy, not a legal minimum, and it exists because a 6am quote chase costs more
goodwill than it earns.

> **Needs Glenn:** confirm trading hours, and whether Saturday work happens. The
> table above is a placeholder shaped like a normal trades week.

---

## 8. Templating this for another client

| Layer | What changes |
| --- | --- |
| **Roles** (§2) | Reassign OWNER, OFFICE, ESTIMATOR, CREW_LEAD |
| **Alerts** (§3) | Nothing. All 11 are trade-agnostic. |
| **Tasks** (§4) | Verbs may change (`SPRAY` to `INSTALL`). Structure holds. |
| **Escalation** (§5) | The 1 hour threshold is worth tuning to their volume |
| **Digests** (§6) | Nothing, if the pipeline shape is reused |
| **Quiet hours** (§7) | Their trading hours |

The load-bearing part is §1. Carrying that rule across is worth more than
carrying any specific alert, because the failure mode is always the same: a
client asks for "notify me on everything", gets it, and stops reading any of it
by week three.

---

## 9. Before go-live

- [ ] Every workflow has an error branch that alerts, so failures are not silent
- [ ] Round robin set on New Enquiry, and no path leaves a lead unassigned
- [ ] Escalation resolves to a second person, not back to the same one
- [ ] Quiet hours applied to outbound customer messaging, not just internal
- [ ] Every sequence has a stop condition on reply
- [ ] Setting status Won kills every sales sequence on the card
- [ ] Human labels stored in the dropdown fields, so echoed emails do not read "new-build"
- [ ] SPF and DKIM on the sending domain, and a test email checked in Gmail and Outlook
- [ ] Every merge field confirmed against the platform version, with a test sent to yourself
- [ ] Alert volume measured after week one. More than about fifteen a day to one person means something is wrong
- [ ] A test lead pushed end to end through both boards, watching what arrives and when
