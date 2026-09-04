# CRM Tasks and Notifications

What the team gets told, when, and what they are expected to do about it.

Companion to [CRM-PIPELINES.md](CRM-PIPELINES.md) and
[CRM-MESSAGING.md](CRM-MESSAGING.md). Messaging covers what the *customer*
receives. This covers what *you* receive.

Written as a template. Roles are tokenised, so a new client is a reassignment
rather than a rebuild.

---

## 1. The governing principle

> **A notification is a request to do something. If nothing needs doing, it is
> not a notification, it is a report.**

Reports go in a digest. Only actions interrupt.

This is the rule that decides everything below, and it is the one most GHL
builds get wrong. A system that pings on every stage change trains everyone to
ignore it inside a fortnight, and then the one alert that actually mattered gets
ignored too. There are eleven real-time alerts in this document. That is
deliberate, and adding a twelfth should require an argument.

---

## 2. Roles

Set up as GHL users, then referenced by role throughout so another client is a
reassignment rather than a rewrite.

| Role | Who at Spray It | Owns |
| --- | --- | --- |
| `OWNER` | Glenn | Commercial deals, pricing, anything escalated |
| `OFFICE` | *(to confirm)* | First response, booking, chasing, invoicing |
| `ESTIMATOR` | *(to confirm, may be OWNER)* | Assessments and quotes |
| `CREW_LEAD` | *(per job)* | Delivery stages, site photos |

> **Needs Glenn:** who fills OFFICE and ESTIMATOR, and whether they are separate
> people or both him. If they are both him, the escalation ladder in §5 needs a
> second name or it escalates to itself.

**Round robin.** If more than one person can take a new lead, use GHL's round
robin assignment on the New Enquiry trigger. Unassigned leads are the single
most common way a lead dies: everybody assumes somebody.

---

## 3. Real-time alerts

Eleven. These interrupt. Everything else waits for a digest.

| # | Alert | Trigger | To | Channel | Why it interrupts |
| --- | --- | --- | --- | --- | --- |
| 1 | **New enquiry** | Opportunity created | Assigned user | SMS + in-app | Speed to lead is the whole game |
| 2 | **Missed call** | Inbound call not answered | OFFICE | SMS | The auto-reply already went; a human still has to ring back |
| 3 | **Inbound SMS reply** | Contact replies | Assigned user | In-app + SMS | A reply is a live conversation |
| 4 | **Booking made** | Appointment booked | Assigned user | In-app | Diary changed |
| 5 | **Booking cancelled** | Appointment cancelled | Assigned user | SMS | A hole in the day, recoverable if caught early |
| 6 | **Commercial enquiry** | Opportunity created on Commercial | OWNER | SMS | Different sale, different person, immediately |
| 7 | **Lead unattended 1 hour** | Still in New Enquiry | Assigned + OWNER | SMS | The escalation in §5 |
| 8 | **Quote accepted** | Status set to Won | OWNER + OFFICE | SMS | Triggers deposit, scheduling, crew |
| 9 | **Deposit received** | `deposit_received_at` set | OFFICE | In-app | Unblocks scheduling |
| 10 | **Negative review or complaint** | Review under 4 stars, or complaint tag | OWNER | SMS | Reputation, and it decays fast |
| 11 | **Automation failure** | Workflow error, webhook 4xx/5xx | OWNER | Email | A silent failure means leads are vanishing |

### Notes on a few of these

**1. New enquiry.** Include enough to act without opening the CRM:

```
NEW LEAD: {{contact.first_name}} {{contact.last_name}}
{{contact.phone}}
{{contact.property_type}} / {{contact.areas}}
{{contact.timeframe}} / {{contact.postcode}}
Source: {{contact.utm_source}}
```

Someone standing on a roof can read that and decide whether to climb down.

**11. Automation failure.** GHL will not tell you loudly when a workflow breaks.
Build this deliberately: an error branch on the lead webhook, and a weekly check
that the count of website submissions matches the count of opportunities
created. The website reports a failed submission to the visitor rather than
swallowing it, so the front end is covered. This alert covers the back end.

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
until closed. Anything with a deadline is a task, not an alert.

### Naming convention

```
[VERB] [WHO] — [WHAT]
```

For example `CALL Sarah Mitchell — new enquiry, roof + underfloor`. Verb first,
so a list of twenty tasks is scannable without opening any of them.

### Task schedule

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| New Enquiry | `CALL {{contact.first_name}} — new enquiry` | Assigned user | 1 hour |
| Contacting | `CALL {{contact.first_name}} — attempt 2` | Assigned user | Day 1 |
| Contacting | `CALL {{contact.first_name}} — attempt 3` | Assigned user | Day 2 |
| Contacting | `CALL {{contact.first_name}} — attempt 4` | Assigned user | Day 4 |
| Contacting | `CALL {{contact.first_name}} — final attempt` | Assigned user | Day 7 |
| Qualified | `BOOK {{contact.first_name}} — assessment` | OFFICE | 3 days |
| Assessment Booked | `ATTEND {{contact.first_name}} — assessment` | ESTIMATOR | On the date |
| Quoting | `QUOTE {{contact.first_name}} — {{opportunity.site_address}}` | ESTIMATOR | **2 days** |
| Quote Sent | `CALL {{contact.first_name}} — quote follow up` | Assigned user | Day 2 |
| Follow-up | `DECIDE {{contact.first_name}} — close or nurture` | Assigned user | Day 21 |
| Won | `INVOICE {{contact.first_name}} — deposit` | OFFICE | 1 day |
| Won | `SCHEDULE {{contact.first_name}} — allocate crew and date` | OFFICE | 3 days |
| Scheduled | `CONFIRM {{contact.first_name}} — day before` | OFFICE | Day before start |
| In Progress | `PHOTOS {{opportunity.site_address}}` | CREW_LEAD | On completion |
| In Progress | `VARIATIONS {{contact.first_name}} — record any extras` | CREW_LEAD | On completion |
| Invoiced | `INVOICE {{contact.first_name}} — final` | OFFICE | 1 day |
| Invoiced | `CHASE {{contact.first_name}} — payment overdue` | OFFICE | Day 14 |
| Paid & Closed | `REVIEW {{contact.first_name}} — did they leave one?` | OFFICE | Day 7 |

### Commercial additions

| Stage | Task | Assigned | Due |
| --- | --- | --- | --- |
| Qualified / Scoping | `SCOPE {{contact.first_name}} — confirm decision maker and programme` | OWNER | 5 days |
| Specifying | `SPEC {{opportunity.site_address}} — product, access, staging, WHS` | OWNER | 5 days |
| Proposal Submitted | `CALL {{contact.first_name}} — confirm receipt` | OWNER | 2 days |
| Commercial Review | `CHASE {{contact.first_name}} — decision date` | OWNER | Day 7, day 21 |
| Awaiting PO | `CHASE {{contact.first_name}} — PO` | OWNER | Weekly |
| Mobilising | `INDUCT crew — {{opportunity.site_address}}` | CREW_LEAD | Before start |
| Mobilising | `SWMS {{opportunity.site_address}} — issue and confirm receipt` | OWNER | Before start |

### Two rules

1. **Every task has an owner and a due date.** GHL will let you create a task
   with neither. A task with no due date is a note.
2. **Completing the task does not move the card.** Moving the card is a separate,
   deliberate act. Otherwise the board reflects who is tidy about tasks rather
   than where jobs actually are.

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
starts ignoring the escalation.

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
| Mon to Fri, 7am to 6pm | All | Normal | Normal |
| Sat, 8am to 2pm | Critical only (1, 2, 6, 10, 11) | Held | Held |
| Outside those | None | Held | Held to next window |
| Sunday, public holidays | None | Held | Held |

Held customer messages queue and release at the next window. Use GHL's **Wait
until a time window** step; do not rely on nobody enquiring at midnight.

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
| **Alerts** (§3) | Nothing. All eleven are trade-agnostic. |
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
- [ ] Round robin set on New Enquiry, no path leaves a lead unassigned
- [ ] Escalation resolves to a **second person**, not back to the same one
- [ ] Quiet hours applied to outbound customer messaging, not just internal
- [ ] Every sequence has a stop condition on reply
- [ ] Setting status Won kills every sales sequence on the card
- [ ] Alert volume measured after week one. More than about fifteen a day to one
      person means something on the list above is wrong.
- [ ] A test lead pushed end to end, watching what arrives and when
