/* ============================================================================
   SprayIT Solutions: the customer journey, as data.

   This file is the single source of truth for the journey page. Every stage,
   every message, every task and every alert lives here and nowhere else in the
   page. script.js only renders it.

   Conventions
   - Tokens are written the way the platform writes them: {{contact.first_name}},
     {{custom_values.contact_mobile}}, {{opportunity.quote_number}} and so on.
     The page swaps them for sample values in Preview mode and shows them raw
     in Fields mode. The "Copy" button always copies the raw version.
   - Email bodies are plain text. A blank line separates paragraphs. A block
     whose lines all begin with two spaces renders as a list: numbered if the
     lines start "1.", key/value if each line has a label then a gap, otherwise
     a plain list.
   - Nothing client-specific is hardcoded in a message body. Swapping the
     custom values below is what makes this a template.
   - Both boards carry the same thirteen stages, with the same keys, in the
     same order. The whole-pipeline view depends on that, and the checker
     fails if the two boards drift apart.
   - `from` on an email is 'contact' (the person who handles customer
     contact, signed with their name and mobile) or 'brand' (confirmations,
     reminders and invoices, from the business).
   - `phase` on a stage is 'sale' (still winning the job), 'either' (before or
     after the yes), 'won' (the stage where the job is won) or 'job'.

   Adding a message: add it to `messages`, then reference its id from a stage
   group and send it from a workflow. Adding a stage: add it to both boards.
   ========================================================================== */

window.JOURNEY = {
  meta: {
    title: 'The SprayIT Solutions customer journey',
    preparedFor: 'Glenn and Rachael, SprayIT Solutions',
    preparedBy: 'Systemations',
    sourceOfTruth: 'client-journey-onepage/journey-data.js',
    revised: 'After the client call on Friday 2 October 2026',
  },

  brand: {
    name: 'SprayIT Solutions',
    shortName: 'SprayIT',
    smsSignoff: 'Rachael, SprayIT Solutions',
    phone: '1300 177 729',
    phoneE164: '+611300177729',
    email: 'info@sprayitsolutions.com.au',
    website: 'sprayitsolutions.com.au',
    owner: 'Glenn',
    ownerInitials: 'G',
    contact: 'Rachael Angus',
    contactInitials: 'RA',
    contactMobile: '0428 26 36 26',
    signature: 'Rachael Angus',
    hours: 'Monday to Friday, 7:00am to 5:00pm. Saturday by appointment.',
  },

  /* ---------------------------------------------------------------- roles */
  roles: [
    { key: 'OWNER', who: 'Glenn Angus', owns: 'Commercial work, pricing, booking install dates, anything escalated' },
    { key: 'OFFICE', who: 'Rachael Angus', owns: 'First response, calls, chasing, invoicing. About 99% of customer contact.' },
    { key: 'ESTIMATOR', who: 'Glenn Angus', owns: 'Quotes and site inspections' },
    { key: 'CREW_LEAD', who: 'Per job', owns: 'The job day: running late text, photos, variations, marking the job complete' },
  ],

  /* ---------------------------------------------------- the swap layer */
  customValues: [
    { key: 'business_name', value: 'SprayIT Solutions', note: 'Used in email' },
    { key: 'business_short_name', value: 'SprayIT', note: 'Used in SMS, where characters cost money' },
    { key: 'business_phone', value: '1300 177 729', note: 'The business line. The number on the Google listing and the website, and on invoices and confirmations.' },
    { key: 'business_phone_e164', value: '+611300177729', note: 'For tel: links' },
    { key: 'contact_name', value: 'Rachael Angus', note: 'Signs the customer messages. Handles about 99% of customer contact.' },
    { key: 'contact_first_name', value: 'Rachael', note: 'The short form, where a full name reads stiffly' },
    { key: 'contact_mobile', value: '0428 26 36 26', note: "Rachael's mobile, to confirm. The number customers are asked to ring in messages." },
    { key: 'contact_mobile_e164', value: '+61428263626', note: "Rachael's mobile, to confirm. For tel: links." },
    { key: 'business_email', value: 'info@sprayitsolutions.com.au', note: 'From address and reply-to. The sending domain needs SPF and DKIM before go-live.' },
    { key: 'from_name_contact', value: 'Rachael at SprayIT Solutions', note: 'From name on the personal emails' },
    { key: 'from_name_brand', value: 'SprayIT Solutions', note: 'From name on confirmations, reminders and invoices' },
    { key: 'website_url', value: 'sprayitsolutions.com.au', note: 'The live site' },
    { key: 'booking_url', value: 'sprayitsolutions.com.au/book/', note: 'The phone call calendar, embedded on the site. The day 4 email offers it.' },
    { key: 'quote_form_url', value: 'sprayitsolutions.com.au/contact-us/', note: '' },
    { key: 'privacy_url', value: 'sprayitsolutions.com.au/privacy-policy/', note: 'Required in marketing email' },
    { key: 'review_url', value: 'Google review link', note: 'The Reviews tab of the Google listing. Use a trigger link so it is shortened in SMS.' },
    { key: 'service_area', value: 'Australia-wide', note: '' },
    { key: 'trade_noun', value: 'spray foam insulation', note: 'How the work is named in a message: "your spray foam insulation enquiry"' },
    { key: 'trade_verb', value: 'insulation', note: 'The short form: "your insulation job"' },
    { key: 'inspection_noun', value: 'site inspection', note: 'What the measure-up visit is called. About one job in ten or twenty needs one.' },
    { key: 'consult_length', value: '15 minute', note: 'The phone call offered in the day 4 email and on the site' },
    { key: 'office_hours', value: 'Mon to Fri, 7am to 5pm', note: 'To confirm with Glenn' },
    { key: 'quote_turnaround', value: '2 business days', note: 'How soon after the call the written quote goes out' },
    { key: 'sms_signoff', value: 'Rachael, SprayIT Solutions', note: 'Sender identification on every SMS' },
  ],

  /* ---------------------------------------------- sample data for previews */
  samples: {
    common: {
      'custom_values.business_name': 'SprayIT Solutions',
      'custom_values.business_short_name': 'SprayIT',
      'custom_values.business_phone': '1300 177 729',
      'custom_values.business_phone_e164': '+611300177729',
      'custom_values.contact_name': 'Rachael Angus',
      'custom_values.contact_first_name': 'Rachael',
      'custom_values.contact_mobile': '0428 26 36 26',
      'custom_values.contact_mobile_e164': '+61428263626',
      'custom_values.business_email': 'info@sprayitsolutions.com.au',
      'custom_values.from_name_contact': 'Rachael at SprayIT Solutions',
      'custom_values.from_name_brand': 'SprayIT Solutions',
      'custom_values.website_url': 'sprayitsolutions.com.au',
      'custom_values.booking_url': 'sprayitsolutions.com.au/book/',
      'custom_values.quote_form_url': 'sprayitsolutions.com.au/contact-us/',
      'custom_values.privacy_url': 'sprayitsolutions.com.au/privacy-policy/',
      'custom_values.review_url': 'Google review link',
      'custom_values.service_area': 'Australia-wide',
      'custom_values.trade_noun': 'spray foam insulation',
      'custom_values.trade_verb': 'insulation',
      'custom_values.inspection_noun': 'site inspection',
      'custom_values.consult_length': '15 minute',
      'custom_values.office_hours': 'Mon to Fri, 7am to 5pm',
      'custom_values.quote_turnaround': '2 business days',
      'custom_values.sms_signoff': 'Rachael, SprayIT Solutions',
      'unsubscribe_link': 'Unsubscribe',
      'trigger_link.confirm_yes': 'yes link',
      'trigger_link.confirm_no': 'no link',
      'appointment.reschedule_link': 'reschedule link',
      'appointment.cancellation_link': 'cancel link',
      'appointment.title': 'Phone call with SprayIT Solutions',
      'message.body': 'Yes, Thursday works. Call after 10.',
      'workflow.name': 'Lead: Website intake',
      'error.message': 'Webhook returned 500',
      'review.rating': '2',
      'review.author': 'A. Customer',
      'time': '9:40am',
    },
    residential: {
      'contact.first_name': 'Emma',
      'contact.last_name': 'Walsh',
      'contact.full_name': 'Emma Walsh',
      'contact.phone': '0412 345 678',
      'contact.email': 'emma.walsh@example.com',
      'contact.postcode': '3930',
      'contact.suburb': 'Mount Eliza',
      'contact.property_type': 'Home',
      'contact.areas': 'Underfloor, Roof or ceiling',
      'contact.building_stage': 'Existing building (retrofit)',
      'contact.timeframe': 'Next 1 to 3 months',
      'contact.utm_source': 'google',
      'contact.enquiry_message': 'Weatherboard on stumps, freezing floors in winter. Roof has old batts.',
      'appointment.start_time': 'Thursday 25 September, 10:00am',
      'opportunity.name': 'Emma Walsh, Mount Eliza',
      'opportunity.value': '$6,400',
      'opportunity.site_address': '22 Ranelagh Drive, Mount Eliza VIC 3930',
      'opportunity.inspection_date': 'Tuesday 30 September, 9:00am',
      'opportunity.quote_number': 'Q-1042',
      'opportunity.quote_link': 'view and accept your quote',
      'opportunity.accepted_quote_option': 'Option A, open cell, underfloor and ceiling',
      'opportunity.deposit_amount': '$1,000',
      'opportunity.deposit_due_date': 'Friday 10 October',
      'opportunity.job_date': 'Monday 13 October',
      'opportunity.job_end_date': 'Monday 13 October',
      'opportunity.crew_assigned': 'DJ',
      'opportunity.product_type': 'open cell',
      'opportunity.sqm_estimate': '140',
      'opportunity.invoice_number': 'INV-2087',
      'opportunity.po_number': 'n/a',
      'opportunity.retention_amount': '$640',
      'opportunity.retention_release_date': 'Wednesday 13 October 2027',
      'opportunity.lost_reason': 'Timing, project deferred',
    },
    commercial: {
      'contact.first_name': 'Daniel',
      'contact.last_name': 'Kerr',
      'contact.full_name': 'Daniel Kerr',
      'contact.company': 'Nordic Cold Storage',
      'contact.phone': '0433 987 654',
      'contact.email': 'd.kerr@example.com',
      'contact.postcode': '3175',
      'contact.suburb': 'Dandenong South',
      'contact.property_type': 'Factory or warehouse',
      'contact.areas': 'Roof or ceiling, Walls',
      'contact.building_stage': 'Existing building (retrofit)',
      'contact.timeframe': '3 months or more',
      'contact.utm_source': 'linkedin',
      'contact.enquiry_message': '4,000 sqm cold store, condensation on the roof underside, needs a spec for our board.',
      'appointment.start_time': 'Wednesday 1 October, 8:00am',
      'opportunity.name': 'Nordic Cold Storage, Dandenong South',
      'opportunity.value': '$186,000',
      'opportunity.site_address': '8 Ordish Road, Dandenong South VIC 3175',
      'opportunity.inspection_date': 'Wednesday 8 October, 7:30am',
      'opportunity.quote_number': 'P-0318',
      'opportunity.quote_link': 'view and accept the proposal',
      'opportunity.accepted_quote_option': 'Option B, closed cell, roof underside',
      'opportunity.deposit_amount': '$18,600',
      'opportunity.deposit_due_date': 'Monday 27 October',
      'opportunity.po_number': 'PO-77812',
      'opportunity.job_date': 'Monday 3 November',
      'opportunity.job_end_date': 'Friday 21 November',
      'opportunity.crew_assigned': 'DJ',
      'opportunity.product_type': 'closed cell',
      'opportunity.sqm_estimate': '4,200',
      'opportunity.invoice_number': 'CL-0318-1',
      'opportunity.retention_amount': '$9,300',
      'opportunity.retention_release_date': 'Friday 21 May 2027',
      'opportunity.lost_reason': 'Budget withdrawn',
    },
  },

  /* ---------------------------------------------------------- the alerts */
  /* These interrupt. Everything else waits for the daily summary. Anything
     that goes to OWNER goes by text and email. The wording names a role or
     "the team", never a person, so it still works as the business hires. */
  alerts: [
    {
      n: 1, name: 'New enquiry', plain: 'A new enquiry has just come in',
      desc:
        'A website enquiry has been created and assigned. The message carries their name, number, property type, what needs doing, timeframe, postcode and where they came from, so it can be acted on without opening the CRM.', trigger: 'Opportunity created', to: 'Assigned user', channel: 'SMS and in-app', prio: 'now',
      why: 'Speed to lead is the whole game.',
      body: 'NEW LEAD: {{contact.first_name}} {{contact.last_name}}\n{{contact.phone}}\n{{contact.property_type}} / {{contact.areas}}\n{{contact.timeframe}} / {{contact.postcode}}\nSource: {{contact.utm_source}}',
      note: 'Enough to act without opening the CRM. Someone standing on a roof can read that and decide whether to climb down.',
    },
    {
      n: 2, name: 'Missed call', plain: 'Someone rang and nobody picked up',
      desc:
        'An inbound call to the business number went unanswered. The caller has already had an automatic text back, so this is the reminder that someone still owes them a call.', trigger: 'Inbound call not answered', to: 'OFFICE', channel: 'SMS', prio: 'now',
      why: 'The auto-reply already went. A person still has to ring back.',
      body: 'MISSED CALL: {{contact.phone}} ({{contact.first_name}}). Text-back sent. Ring them.',
    },
    {
      n: 3, name: 'Inbound reply', plain: 'A customer has replied to a message',
      desc:
        'A customer has replied by text. Every outbound sequence on that contact pauses the moment it arrives, so nothing automatic talks over a live conversation.', trigger: 'Contact replies by SMS', to: 'Assigned user', channel: 'In-app and SMS', prio: 'now',
      why: 'A reply is a live conversation. Every sequence on the card pauses.',
      body: 'REPLY from {{contact.first_name}}: "{{message.body}}"',
    },
    {
      n: 4, name: 'Phone call booked', plain: 'A customer has booked a phone call',
      desc:
        'Somebody has booked a phone call from the day 4 email or the website. It is in the diary and the confirmation has gone, so the point of the alert is to read their enquiry before ringing.', trigger: 'Appointment booked in the phone call calendar', to: 'Assigned user', channel: 'In-app', prio: 'fyi',
      why: 'The diary changed.',
      body: 'BOOKED: {{contact.first_name}}, {{appointment.start_time}}. Read the enquiry before the call.',
    },
    {
      n: 5, name: 'Phone call cancelled', plain: 'A customer has cancelled their call',
      desc:
        'A booked phone call has been cancelled, leaving a hole in the day. Caught early, a short call usually rebooks it.', trigger: 'Appointment cancelled in the phone call calendar', to: 'Assigned user', channel: 'SMS', prio: 'heads',
      why: 'A hole in the day, recoverable if caught early.',
      body: 'CANCELLED: {{contact.first_name}}, {{appointment.start_time}}. Slot is open. A short call often rebooks it.',
    },
    {
      n: 6, name: 'Commercial enquiry', plain: 'A commercial enquiry has come in',
      desc:
        'An enquiry has landed on the Commercial board. It carries the company as well as the contact. The owner is told straight away; the office still makes the first call.', trigger: 'Opportunity created on the Commercial board', to: 'OWNER', channel: 'SMS and email', prio: 'now',
      why: 'Different sale, and the owner wants to know immediately.',
      body: 'COMMERCIAL LEAD: {{contact.first_name}} {{contact.last_name}}, {{contact.company}}\n{{contact.property_type}} / {{contact.postcode}}\n{{contact.phone}}',
    },
    {
      n: 7, name: 'New lead not called after 15 minutes', plain: 'A new lead has waited 15 minutes without a call',
      desc:
        'A new lead has been on the board for fifteen business minutes and no call has been logged against it. It names the lead and the time it arrived, so whoever picks it up can ring straight away.', trigger: 'No call logged 15 business minutes after the lead arrives', to: 'OFFICE', channel: 'Email', prio: 'now',
      why: 'Time to first contact is the one number that moves everything else. Business hours only, so it pauses overnight.',
      body: 'NOT CALLED YET: {{contact.first_name}} {{contact.last_name}}, {{contact.phone}}\nArrived {{time}}. Fifteen minutes and no call logged. Ring them now.',
    },
    {
      n: 8, name: 'Quote accepted', plain: 'A customer has accepted a quote',
      desc:
        'A card has reached Quote Accepted, from the accept button or moved by hand. It names the job, the value and the option chosen, and it is the signal to book the install date. Add-on quotes on a job already under way do not fire it.', trigger: 'Card enters Quote Accepted', to: 'OWNER and OFFICE', channel: 'SMS and email', prio: 'win',
      why: 'Triggers the next step: an inspection, or the install date.',
      body: 'QUOTE ACCEPTED: {{opportunity.name}}, {{opportunity.value}}\nOption: {{opportunity.accepted_quote_option}}\nNext: book the install date.',
    },
    {
      n: 9, name: 'Deposit received', plain: 'A deposit has arrived',
      desc:
        'A deposit invoice has been marked paid. The customer has had a one-line confirmation, so this is for the record and for whoever is watching the crew diary.', trigger: 'Deposit invoice marked paid', to: 'OFFICE', channel: 'In-app', prio: 'win',
      why: 'The date is secure.',
      body: 'DEPOSIT IN: {{contact.first_name}}, {{opportunity.deposit_amount}}. Job on {{opportunity.job_date}} is secure.',
    },
    {
      n: 10, name: 'Negative review or complaint', plain: 'A review under four stars, or a complaint, has come in',
      desc:
        'A review under four stars, or a contact tagged as a complaint. It carries the rating and the reviewer, so the call can be made the same day.', trigger: 'Review under 4 stars, or a complaint tag', to: 'OWNER', channel: 'SMS and email', prio: 'now',
      why: 'Reputation decays fast. A same-day call fixes most of them.',
      body: 'REVIEW {{review.rating}} stars from {{review.author}}. Call them today.',
    },
    {
      n: 11, name: 'Automation failure', plain: 'Something behind the scenes has stopped working',
      desc:
        'A workflow errored, or the website lead webhook returned a failure. It names the workflow and the contact. This is the only alert that means leads may be vanishing silently.', trigger: 'Workflow error, or the lead webhook returns 4xx or 5xx', to: 'OWNER', channel: 'SMS and email', prio: 'now',
      why: 'A silent failure means leads are vanishing. The platform will not tell you loudly, so this is built deliberately.',
      body: 'WORKFLOW FAILED: {{workflow.name}} on {{contact.first_name}} {{contact.last_name}}. {{error.message}}',
    },
    {
      n: 12, name: 'Customer cannot make the booked date', plain: 'A customer has said the booked date no longer works',
      desc:
        'A customer tapped No on the 7 day or the 48 hour reminder. It names the job, the date and the address. Nothing is rescheduled automatically: the team rings the customer, agrees a new date, and moves the crew and the rig by hand.', trigger: 'A No on the 7 day or 48 hour reminder', to: 'OWNER and OFFICE', channel: 'SMS and email', prio: 'now',
      why: 'A crew and a rig are booked around this job. The sooner a person knows, the sooner both can go to other work.',
      body: 'CANNOT MAKE IT: {{contact.first_name}} {{contact.last_name}}, {{contact.phone}}\nBooked {{opportunity.job_date}}, {{opportunity.site_address}}\nRing them today. Crew and rig need moving by hand.',
    },
    {
      n: 13, name: 'Deposit unpaid at its due date', plain: 'A deposit is due today and has not arrived',
      desc:
        'A deposit has reached its due date without being paid. It names the job, the amount and the install date, so the team can ring the customer and decide in time whether the crew holds the date or is reassigned.', trigger: 'deposit_due_date reached and the deposit invoice is unpaid', to: 'OWNER and OFFICE', channel: 'SMS and email', prio: 'heads',
      why: 'Special-order foam and a crew day are committed against this job. The due date is set early enough to reassign both.',
      body: 'DEPOSIT UNPAID: {{opportunity.name}}, {{opportunity.deposit_amount}}\nDue {{opportunity.deposit_due_date}}. Job booked {{opportunity.job_date}}.\nRing them today and decide whether the crew holds.',
    },
  ],

  /* -------------------------------------------------------- the messages */
  messages: {

    /* ------------------------------------------------ shared: acknowledgement */
    'X-ACK-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters New Lead', delay: 'Within 2 minutes', window: 'immediate',
      stops: 'Sends once.',
      body: 'Hi {{contact.first_name}}, thanks for your enquiry. We will ring you shortly to talk it through. Need us sooner? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}',
      note: 'Fires before anyone has looked at the lead, so it promises only what automation can guarantee: that a person will ring.',
    },
    'X-ACK-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Enters New Lead', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once.',
      subject: 'We have your enquiry, {{contact.first_name}}',
      preheader: 'We will ring you to talk it through, then send a written quote. Here is what you told us.',
      body: 'Hi {{contact.first_name}},\n\nThanks for getting in touch with {{custom_values.business_name}}. We have your enquiry and we will ring you shortly. During business hours that is usually within the hour.\n\nHere is what you told us:\n\n  Property        {{contact.property_type}}\n  Needs doing     {{contact.areas}}\n  Building stage  {{contact.building_stage}}\n  Timeframe       {{contact.timeframe}}\n  Postcode        {{contact.postcode}}\n\nIf any of that is wrong, reply to this email and we will fix it.\n\nWhat happens next:\n\n  1. We ring you for a short chat about the building and what you want from it.\n  2. We send you a written quote, usually within {{custom_values.quote_turnaround}} of the call. There is no obligation.\n  3. If the job needs a look in person, we visit the site first and quote after that.\n\nMost jobs can be quoted from the call. Some need a site visit first, and we will tell you on the call if yours is one of them.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'Echoing their answers back cuts "did that go through?" replies and catches a wrong postcode before it costs anyone a trip. It no longer promises a site visit before every quote, because only about one job in ten or twenty needs one.',
      agencyNote: 'Store the human label in each dropdown field (Home, not home) or this email echoes the raw form value.',
    },

    /* ------------------------------------------------- shared: Dial 1 and 2 */
    'DIAL-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Dial 1, after two calls back to back', delay: 'About 10 seconds after the card moves', window: 'immediate',
      stops: 'Sends once per lead.',
      body: 'Hi {{contact.first_name}}, we just tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.contact_mobile}} when it suits. {{custom_values.sms_signoff}}',
      note: 'Most people will not answer a number they do not know, and most of them will reply to a text. So it goes about ten seconds after the second call, while the missed calls are still on their screen.',
    },
    'DIAL-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'In Dial 2, no reply', delay: 'Day 2', window: 'business-hours',
      stops: 'The whole sequence stops the moment they reply, book a call, or the card leaves Dial 2.',
      subject: 'Following up on your {{custom_values.trade_noun}} enquiry',
      preheader: 'We have tried to ring a couple of times. Reply with a time that suits and we will call then.',
      body: 'Hi {{contact.first_name}},\n\nWe have tried to ring you a couple of times about your enquiry, without luck. No rush at our end. We just do not want to keep ringing if now is a bad time.\n\nThe easiest thing is to reply to this email with a day and a time that suit you, and we will call then. Or ring us on {{custom_values.contact_mobile}} whenever is convenient.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
    },
    'DIAL-03': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'In Dial 2, no reply', delay: 'Day 4', window: 'business-hours',
      stops: 'Stops on reply, booking, or stage change.',
      subject: 'Pick a time to talk about your {{custom_values.trade_verb}} job',
      preheader: 'Choose a time that suits you and we will ring then. It takes two clicks.',
      body: 'Hi {{contact.first_name}},\n\nWe still have not managed to catch you, so here is a simpler way. Pick a time that suits and we will ring you then:\n\n{{custom_values.booking_url}}\n\nIt is a {{custom_values.consult_length}} call about the building and what you want from it. If we can quote from the call, we will. If the job needs a look in person, we will say so and book that instead.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'The only message that offers the booking link outright. A time they chose is a call they answer.',
    },
    'DIAL-04': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'In Dial 2, no reply', delay: 'Day 7, final', window: 'business-hours',
      stops: 'Last in the sequence. With no reply by the next day, the card goes to Lost, reason Unreachable.',
      subject: 'Closing this one off',
      preheader: 'We could not reach you, so we will stop ringing. Nothing is lost.',
      body: 'Hi {{contact.first_name}},\n\nWe have not been able to reach you, so we will close this enquiry off rather than keep chasing.\n\nNothing is lost. If the job comes back around, reply to this email or ring {{custom_values.contact_mobile}} and we will pick it straight back up.\n\nAll the best with it either way.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'The honest close is the highest-replying message in the sequence. Do not soften it into another chase or it stops working.',
    },

    /* --------------------------------------------- shared: the phone call booking */
    'X-APPT-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Phone call booked', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking.',
      subject: 'Confirmed: {{appointment.start_time}}',
      preheader: 'We will call you on {{contact.phone}}. Reschedule or cancel with one click.',
      body: 'Hi {{contact.first_name}},\n\nYou are booked in.\n\n  When   {{appointment.start_time}}\n  What   {{appointment.title}}\n  Where  We call you on {{contact.phone}}\n\nThere is nothing to prepare. If it is handy, have a rough idea of what needs doing and when, but the call is mostly us listening.\n\nNeed to change it?\n\n  Reschedule: {{appointment.reschedule_link}}\n  Cancel: {{appointment.cancellation_link}}',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'X-APPT-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Phone call booked', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking.',
      body: 'Booked in for {{appointment.start_time}}. We will call you on {{contact.phone}}. Change it here: {{appointment.reschedule_link}} {{custom_values.sms_signoff}}',
    },
    'X-APPT-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Phone call upcoming', delay: '24 hours before', window: 'business-hours',
      stops: 'Cancelled with the appointment.',
      body: 'Reminder: your call with {{custom_values.business_short_name}} is tomorrow, {{appointment.start_time}}. Need to move it? {{appointment.reschedule_link}} {{custom_values.sms_signoff}}',
    },
    'X-APPT-04': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Phone call upcoming', delay: '2 hours before', window: 'immediate',
      stops: 'Cancelled with the appointment.',
      body: 'Your call with {{custom_values.business_short_name}} is at {{appointment.start_time}}, about 2 hours away. Talk soon. {{custom_values.sms_signoff}}',
    },
    'X-APPT-06': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Phone call or site inspection moved', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per change.',
      subject: 'Your booking has moved',
      preheader: 'The new time is {{appointment.start_time}}. If that is not right, ring us.',
      body: 'Hi {{contact.first_name}},\n\nYour booking with us has moved.\n\n  New time   {{appointment.start_time}}\n  What       {{appointment.title}}\n\nIf that is not right, ring us on {{custom_values.contact_mobile}} and we will sort it out.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Used for the phone call and the site inspection. The appointment title says which.',
    },

    /* -------------------------------------------- shared: the site inspection */
    'X-INSP-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Site inspection booked in the inspection calendar', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking.',
      body: 'Hi {{contact.first_name}}, your {{custom_values.inspection_noun}} is booked for {{opportunity.inspection_date}} at {{opportunity.site_address}}. {{custom_values.sms_signoff}}',
    },
    'X-INSP-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Site inspection day', delay: '7:00am on the day', window: 'immediate',
      stops: 'Cancelled or re-queued with the appointment.',
      body: 'Morning {{contact.first_name}}, we are coming to you today for the {{custom_values.inspection_noun}}. Any change, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}',
    },

    /* ------------------------------------------------- residential: the quote */
    'R-QUOTE-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Quote sent, enters Quote Sent', delay: 'Immediately, with the online quote', window: 'immediate',
      stops: 'Sends once per quote.',
      subject: 'Your quote from {{custom_values.business_name}}',
      preheader: 'Quote {{opportunity.quote_number}}. View it online and accept it with one click. Questions welcome.',
      body: 'Hi {{contact.first_name}},\n\nYour quote is ready. Quote number {{opportunity.quote_number}}.\n\nView it, and accept or decline it online, here: {{opportunity.quote_link}}\n\nIt covers {{contact.areas}} at {{opportunity.site_address}}. If we have quoted more than one option, for example open cell or closed cell, or two different thicknesses, each option has its own accept button. Accept the one you want.\n\nA few things worth saying plainly:\n\n  The price includes everything. No separate charge for access, setup or clean-up.\n  It is valid for 30 days, mostly because material costs move.\n  Accepting online is all it takes. A yes on the phone works too.\n  If anything in it does not make sense, ring us. We would rather explain it than have you accept something you are unsure about.\n\nAny questions at all, {{custom_values.contact_mobile}}.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      agencyNote: 'The quote tool sends its own email with the view and accept button. Paste this body into that email template so the button and this wording arrive together. Optional upgrades that change the total as the customer ticks them (for example R2.5 to R4) are pending scope confirmation: not built, and not mentioned to customers until confirmed.',
    },
    'R-QUOTE-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Quote sent, enters Quote Sent', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per quote.',
      body: 'Hi {{contact.first_name}}, your quote is in your inbox. You can accept it online from the email. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}',
    },
    'R-FU-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Quote unanswered', delay: 'Day 2', window: 'business-hours',
      stops: 'The whole follow-up stops on reply, acceptance, decline, or when the card leaves Quote Sent.',
      body: 'Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}',
    },
    'R-FU-02': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'contact',
      trigger: 'Quote unanswered', delay: 'Day 5', window: 'business-hours',
      stops: 'Stops on reply, acceptance, decline, or stage change.',
      subject: 'Why our number might look different',
      preheader: 'Two numbers for the same job can look nothing alike. Here is why.',
      body: 'Hi {{contact.first_name}},\n\nIf you are comparing quotes, one thing is worth knowing, because it is the reason two numbers for the "same" job can look nothing alike.\n\nInsulation is sold on R-value, and R-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind.\n\nA real wall has all of those. Cut products leave edges, edges leave gaps, and air moves through gaps carrying heat with it. That path is not in the rating at all, which is why two walls rated the same can feel completely different to live in.\n\nWe wrote the whole thing up here, with a diagram: {{custom_values.website_url}}/what-is-spray-foam/#r-value\n\nNot trying to talk you out of anything. Just make sure you are comparing the finished wall, not the number on the bag.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'The one message in the journey that makes an argument. It works because it explains something the customer did not know, not because it sells.',
      agencyNote: 'Trade specific. For another client, replace it with the thing customers get wrong when comparing quotes in that trade. Keep the shape: "here is the thing nobody tells you", not "here is why we are better".',
    },
    'R-FU-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Quote unanswered', delay: 'Day 10', window: 'business-hours',
      stops: 'Stops on reply, acceptance, decline, or stage change.',
      body: 'Hi {{contact.first_name}}, still thinking it over, or has something changed? Either is fine, we just want to know whether to keep it open. {{custom_values.sms_signoff}}',
      note: 'A real question outperforms "just checking in", because it can be answered in one word.',
    },
    'R-FU-04': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Quote unanswered', delay: 'Day 21, final', window: 'business-hours',
      stops: 'Last in the sequence. The card is then moved to Nurture, Lost or Follow-Up, never left sitting.',
      subject: 'Should we close this off?',
      preheader: 'No reply, so we will assume the timing is off. Tell us if we are wrong.',
      body: 'Hi {{contact.first_name}},\n\nWe have not heard back on quote {{opportunity.quote_number}}, so we will assume the timing is not right and close it off.\n\nIf that is wrong, reply and we will pick it straight back up. If you went with someone else, that is completely fine, and if you can tell us why, it genuinely helps.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'The "why" ask feeds the Lost reason field, which is what makes the Price against Chose batts split on the board real rather than guessed.',
    },
    'LOST-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Declined online, or marked Lost with any reason except Unreachable, Duplicate or Spam', delay: 'Next business morning', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'Thanks for considering us, {{contact.first_name}}',
      preheader: 'No hard feelings. The door stays open.',
      body: 'Hi {{contact.first_name}},\n\nThanks for giving us the chance to quote on {{opportunity.site_address}}. If you went another way, we hope it goes well.\n\nIf the timing changes, or the job grows, reply to this and we will pick it up where we left off. We keep the details, so it will not start from scratch.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'A graceful goodbye is the cheapest marketing there is. A surprising number of "went with someone else" jobs come back after the other quote falls over.',
    },

    /* --------------------------------------------------------------- nurture */
    'NUR-01': {
      channel: 'email', type: 'MKTG', reuse: 'TRADE', from: 'contact',
      trigger: 'Enters Nurture', delay: 'Next business morning', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops on unsubscribe or when they come back.',
      subject: 'The bit about R-value nobody explains',
      preheader: 'Worth knowing before you get anywhere near comparing quotes.',
      body: 'Hi {{contact.first_name}},\n\nYou mentioned the timing was not right, which is fair enough. Here is something worth knowing before you get to the point of comparing quotes.\n\nR-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind. A real wall has all of those, and air moving through gaps carries heat with it.\n\nWhich is why two walls rated the same can feel completely different.\n\nThe full explanation, with a diagram of both walls: {{custom_values.website_url}}/what-is-spray-foam/#r-value\n\nNo rush from us. When it comes back around, we will be here.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      footer: '{{unsubscribe_link}}',
    },
    'NUR-02': {
      channel: 'email', type: 'MKTG', reuse: 'TRADE', from: 'contact',
      trigger: 'In Nurture', delay: '+30 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops on unsubscribe or when they come back.',
      subject: 'Where the heat actually goes',
      preheader: 'A third through the roof, more through the walls, and the floor nobody thinks about.',
      body: 'Hi {{contact.first_name}},\n\nA third of your heating leaves through the roof, more through the walls, and the rest through the floor. The floor is the one almost nobody insulates, and it is the one people notice most once it is done.\n\nThere is an interactive version of this on our site. Scroll and the house seals itself while the meter drops: {{custom_values.website_url}}',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      footer: '{{unsubscribe_link}}',
    },
    'NUR-03': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'contact',
      trigger: 'In Nurture', delay: '+90 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops on unsubscribe or when they come back.',
      subject: 'Still on the list?',
      preheader: 'If the project is still on the horizon, do nothing. If it is off the table, one click and we stop.',
      body: 'Hi {{contact.first_name}},\n\nWe have been sending you the occasional note since you enquired. If the project is still somewhere on the horizon, no action needed and we will keep in touch now and then.\n\nIf it is off the table, unsubscribe below and we will leave you alone. No hard feelings.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      footer: '{{unsubscribe_link}}',
      note: 'A permission reset at 90 days keeps the list clean and the deliverability healthy. It is also the honest thing to do.',
    },
    'NUR-04': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'contact',
      trigger: 'In Nurture', delay: '12 months after entering Nurture', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops on unsubscribe or when they come back.',
      subject: 'A year on from your quote',
      preheader: 'Plans and budgets change. If the job is back on, we can refresh the quote quickly.',
      body: 'Hi {{contact.first_name}},\n\nIt is about a year since we quoted on {{opportunity.site_address}}, quote {{opportunity.quote_number}}. Plenty of jobs come back around after a year or two, once the budget or the timing changes.\n\nIf yours has, reply to this email and we will refresh the quote against current material prices. If nothing about the building has changed, that is usually quick.\n\nIf it is off the table for good, unsubscribe below and we will stop writing.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      footer: '{{unsubscribe_link}}',
      note: 'Quotes from Nurture regularly come back after one or two years. Everyone in Nurture also gets a call at twelve months, whether or not they opted in to email.',
    },

    /* ------------------------------------------------------- quote accepted */
    'X-ACC-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Enters Quote Accepted', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per job. Not sent for an add-on quote on a job already under way. Every sales sequence on the card is stopped at the same moment.',
      subject: 'Thanks for going ahead, {{contact.first_name}}',
      preheader: 'What happens from here: the install date, two reminders, and the deposit closer to the day.',
      body: 'Hi {{contact.first_name}},\n\nThanks for accepting quote {{opportunity.quote_number}}. Here is how it runs from here.\n\n  1. We book your install date and confirm it with you by text and email.\n  2. We remind you 7 days and 48 hours before the job, and ask you to confirm the date still works.\n  3. Where a deposit applies, the invoice comes about two weeks before the job, not now.\n  4. The crew arrives on the day and does the work. The final invoice follows when the job is complete.\n\nIf anything needs checking on site before we book, we will ring you to arrange that first.\n\nAnything at all in the meantime, ring {{custom_values.contact_mobile}}.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'Deliberately no deposit request. A job accepted today might be installed in three months, and a deposit invoice that early sits unpaid and confuses everyone.',
    },
    'X-ACC-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Quote Accepted', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per job. Not sent for an add-on quote.',
      body: 'Thanks {{contact.first_name}}, quote accepted. We will be in touch shortly to book your install date. {{custom_values.sms_signoff}}',
    },

    /* -------------------------------------------------- booking and reminders */
    'JOB-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Install booked in the calendar, enters Job Booked', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per booking, and again if the date moves.',
      body: 'Hi {{contact.first_name}}, your {{custom_values.trade_verb}} job is booked for {{opportunity.job_date}}. Prep notes are in your email. {{custom_values.sms_signoff}}',
    },
    'JOB-02': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'brand',
      trigger: 'Install booked in the calendar, enters Job Booked', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per booking.',
      subject: 'Your job is booked for {{opportunity.job_date}}',
      preheader: 'Booked for {{opportunity.job_date}}. Five things to do before we arrive.',
      body: 'Hi {{contact.first_name}},\n\nYou are in the diary.\n\n  Date    {{opportunity.job_date}}\n  Where   {{opportunity.site_address}}\n  Crew    {{opportunity.crew_assigned}}\n\nWe will check in 7 days and 48 hours before, and ask you to confirm the date still works.\n\nTo help us get in and out cleanly, before we arrive:\n\n  Clear access to {{contact.areas}}. We need room to work and to get the hose through.\n  Move anything you would rather not have dust near.\n  Make sure we can park close. The rig runs off the truck.\n  Pets somewhere else for the day, please.\n  Somebody over 18 on site to let us in.\n\nWhile we are spraying, the area needs to be empty of people and pets. Afterwards the space needs time before you use it again. That is anywhere from about an hour to a full day depending on which foam the job calls for, and the crew will tell you which applies to yours before they leave.\n\nAnything you are unsure about, ring {{custom_values.contact_mobile}}.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Worth checking this list with the crew rather than the office, because the crew know what actually goes wrong on arrival. Re-occupancy is product dependent: as little as an hour for some foams, up to 24 hours for others, so the crew give the figure on the day.',
      agencyNote: 'Trade specific. The preparation list is the job, and for another client it is their own list.',
    },
    'REM-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Job upcoming', delay: '7 days before the job', window: 'business-hours',
      stops: 'Cancelled if the booking is cancelled. Re-queued if the date moves. Skipped if the job was booked less than 7 days out.',
      subject: 'Your job is a week away. Does the date still work?',
      preheader: '{{opportunity.job_date}} at {{opportunity.site_address}}. One tap to confirm, or to tell us it does not work.',
      body: 'Hi {{contact.first_name}},\n\nA reminder that we are booked to do the work at {{opportunity.site_address}} on {{opportunity.job_date}}.\n\nDoes that date still work?\n\n  Yes, see you then: {{trigger_link.confirm_yes}}\n  No, I need to change it: {{trigger_link.confirm_no}}\n\nIf it no longer works, a week of notice means we can move the crew and the rig to another job and find you a new date. If you tap No, we will ring you to rearrange.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Yes is recorded on the card and nothing else happens. No goes to the team straight away. Nothing is rescheduled automatically.',
      agencyNote: 'Yes and No are trigger links. Each fires WF-20 with its own branch and lands on a short thank-you page. The same two links are used in all four reminders.',
    },
    'REM-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Job upcoming', delay: '7 days before the job', window: 'business-hours',
      stops: 'As REM-01.',
      body: 'Hi {{contact.first_name}}, we are with you on {{opportunity.job_date}}. Still OK? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}',
    },
    'REM-03': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Job upcoming', delay: '48 hours before the job', window: 'business-hours',
      stops: 'Cancelled if the booking is cancelled. Re-queued if the date moves.',
      subject: 'Your job is in 2 days. Please confirm.',
      preheader: '{{opportunity.job_date}} at {{opportunity.site_address}}. One tap to confirm the job is still on.',
      body: 'Hi {{contact.first_name}},\n\nWe are with you in two days, on {{opportunity.job_date}} at {{opportunity.site_address}}.\n\nIs everything still on?\n\n  Yes, see you then: {{trigger_link.confirm_yes}}\n  No, I need to change it: {{trigger_link.confirm_no}}\n\nA quick check of the preparation list before we arrive: clear access to {{contact.areas}}, parking close for the truck, pets somewhere else for the day, and somebody over 18 home to let us in.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Replaces the old afternoon-before text. Two days of notice is enough to move a crew; the afternoon before was not.',
    },
    'REM-04': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Job upcoming', delay: '48 hours before the job', window: 'business-hours',
      stops: 'As REM-03.',
      body: 'Hi {{contact.first_name}}, see you in 2 days, {{opportunity.job_date}}. Still on? Yes: {{trigger_link.confirm_yes}} No: {{trigger_link.confirm_no}} {{custom_values.sms_signoff}}',
    },
    'REM-05': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'They tap No on a reminder', delay: 'Straight away', window: 'immediate',
      stops: 'Sends once per booking.',
      body: 'Thanks for letting us know, {{contact.first_name}}. We will ring you shortly to find a new date. {{custom_values.sms_signoff}}',
      note: 'Nothing is moved automatically. A person rings, agrees the new date, and moves the crew and the rig.',
    },
    'JOB-04': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Job day', delay: '6:30am on the job date', window: 'immediate',
      stops: 'Sends once per job day. Cancelled if the booking moves.',
      body: 'Morning {{contact.first_name}}, {{opportunity.crew_assigned}} and the crew are on the way to you now. {{custom_values.sms_signoff}}',
    },
    'JOB-06': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE', manual: true,
      trigger: 'Crew running late', delay: 'Sent by the crew, from a saved template', window: 'immediate',
      stops: 'Manual. One tap from the mobile app.',
      body: 'Hi {{contact.first_name}}, running about 30 minutes behind on the way to you. Sorry about that, see you shortly. {{custom_values.sms_signoff}}',
      note: 'Not automated. A saved snippet the crew can send from the app in one tap, because the alternative is a customer standing at the window at 7:30 wondering.',
    },

    /* ------------------------------------------------------------- deposit */
    'DEP-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Deposit invoice sent, enters Deposit Requested', delay: '14 days before the job, or at once if the job is closer', window: 'business-hours',
      stops: 'Sends once per job.',
      subject: 'Deposit for your job on {{opportunity.job_date}}',
      preheader: 'Deposit invoice attached, due {{opportunity.deposit_due_date}}. Your accepted quote is attached too.',
      body: 'Hi {{contact.first_name}},\n\nYour deposit invoice is attached for the work booked at {{opportunity.site_address}} on {{opportunity.job_date}}.\n\n  Deposit   {{opportunity.deposit_amount}}\n  Due       {{opportunity.deposit_due_date}}\n\nYour accepted quote is attached as well. It carries the terms and conditions.\n\nMost deposits are due the business day before the job. If your foam is a special order, the deposit is due a week before, because that material is made and shipped for your job.\n\nPayment details are on the invoice. When it lands we send a one-line confirmation, so there is no need to ring and check.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Sent two weeks before the install date, never at booking, so a job booked months ahead does not sit on an unpaid invoice. The 14 day send point is to confirm with Glenn.',
      agencyNote: 'Deposits are a liability in the accounts until the job is done, not sales income. Map the deposit item in Xero to the deposit liability account, not to sales. No card storage and no automatic charging.',
    },
    'DEP-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Deposit unpaid', delay: '2 days before it is due', window: 'business-hours',
      stops: 'Stops dead the moment the deposit is marked paid.',
      body: 'Hi {{contact.first_name}}, a reminder your deposit of {{opportunity.deposit_amount}} is due {{opportunity.deposit_due_date}}, ahead of your job. Details are on the invoice. {{custom_values.sms_signoff}}',
    },
    'DEP-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Deposit invoice marked paid', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once. Only on jobs where a deposit applies.',
      body: 'Deposit received, thanks {{contact.first_name}}. You are all set for {{opportunity.job_date}}. {{custom_values.sms_signoff}}',
      note: 'Silence after a payment is the thing customers hate most. This is one line and it stops the "did you get it?" call.',
    },

    /* --------------------------------------------- job completed and payment */
    'JOB-05': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'contact',
      trigger: 'Job marked complete, enters Job Completed', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'All done at {{opportunity.site_address}}',
      preheader: 'Thanks for having us. What we did, how to live with it, and what comes next.',
      body: 'Hi {{contact.first_name}},\n\nThe job is finished. Thanks for having us.\n\nWhat we did:\n\n  {{contact.areas}}, using {{opportunity.product_type}} foam\n  {{opportunity.sqm_estimate}} sqm\n\nLiving with it:\n\n  There is nothing to maintain. It does not settle, sag or need topping up.\n  If you ever cut into it for a new downlight or a pipe, seal it back up. An opening in a sealed layer costs more than the same opening in an unsealed one.\n  You may notice the place holds temperature longer and is quieter. Both are the foam doing its job.\n\nThe final invoice is on its way separately. Once it is paid, we send your job report, with photos of the work and the certificate of completion your building surveyor may ask for.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'The report and the certificates are deliberately not in this email. They go once the final invoice is paid.',
    },
    'PAY-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Job marked complete, final invoice sent', delay: 'Immediately, with the invoice attached', window: 'business-hours',
      stops: 'Sends once per invoice.',
      subject: 'Invoice {{opportunity.invoice_number}}',
      preheader: 'Invoice {{opportunity.invoice_number}} attached, with your accepted quote. Due dates are on it.',
      body: 'Hi {{contact.first_name}},\n\nInvoice {{opportunity.invoice_number}} is attached for the work at {{opportunity.site_address}}.\n\nAlso attached:\n\n  Your accepted quote, which carries the terms and conditions\n  Your purchase order, where there is one\n\nPayment details are on the invoice. If it is paid in stages, each amount is listed with its own due date.\n\nAny questions about it, ring {{custom_values.contact_mobile}}.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      agencyNote: 'Invoices sync to Xero. Only GST-free invoices have been seen reaching Xero so far and these carry GST, so test a GST invoice before promising the sync. If marking an invoice paid in the platform before the bank transfer clears upsets the bookkeeper\'s reconciliation, switch off the payment receipt sync and let Xero record the payment.',
    },
    'PAY-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Invoice unpaid', delay: 'Day 7', window: 'business-hours',
      stops: 'Stops dead the moment payment is marked.',
      body: 'Hi {{contact.first_name}}, a reminder that invoice {{opportunity.invoice_number}} is due. Any questions, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}',
    },
    'PAY-03': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Invoice unpaid', delay: 'Day 14', window: 'business-hours',
      stops: 'Stops dead the moment payment is marked. A reminder sent after someone has paid does more damage than the reminder was worth.',
      subject: 'Invoice {{opportunity.invoice_number}} is now overdue',
      preheader: 'A copy is attached. If something is wrong with it, ring us and we will sort it.',
      body: 'Hi {{contact.first_name}},\n\nInvoice {{opportunity.invoice_number}} is now overdue. A copy is attached.\n\nIf there is a problem with it, or you need a different arrangement, ring {{custom_values.contact_mobile}} and we will sort it out. We would much rather talk than chase.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'RPT-01': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'contact', manual: true,
      trigger: 'Final invoice paid', delay: 'Same day, sent by hand with the report attached', window: 'business-hours',
      stops: 'Manual. Sent once, from a saved template, by whoever marks the invoice paid.',
      subject: 'Your job report for {{opportunity.site_address}}',
      preheader: 'Photos, what we installed, and the certificate of completion for your building surveyor.',
      body: 'Hi {{contact.first_name}},\n\nThanks for settling the final invoice. Your job report is attached.\n\nIt includes:\n\n  Photos of the finished work\n  What we installed, where, and the product used\n  The certificate of completion, which your building surveyor may ask for\n\nKeep it with your building records. If the surveyor needs anything else from us, reply to this email.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'Only ever sent once the final invoice is fully paid. A task to send it is created the moment the invoice is marked paid.',
    },
    'REV-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Job completed, Ask for Google review is Yes', delay: '4 weeks after the job date', window: 'business-hours',
      stops: 'Ask once. Do not chase reviews. Not sent if Ask for Google review is No.',
      body: 'Hi {{contact.first_name}}, if you are happy with the job, a short Google review really helps: {{custom_values.review_url}} {{custom_values.sms_signoff}}',
      note: 'Asked once, by text, four weeks after the job, inside the four to six weeks agreed. Only contacts with Ask for Google review set to Yes get it. It is Yes unless someone sets it to No for a job with problems or a repeat commercial client.',
    },
    'REV-02': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'contact',
      trigger: 'Final invoice paid', delay: '+7 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes.',
      subject: 'Know anyone else with the same problem?',
      preheader: 'Most of our work is word of mouth. You would know who.',
      body: 'Hi {{contact.first_name}},\n\nHope the place is holding its temperature.\n\nMost of our work comes from people passing our name on. If someone you know is fighting the same problem, send them our way or pass on {{custom_values.contact_mobile}}.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      footer: 'You are getting this because you agreed to hear from us. {{unsubscribe_link}}',
    },
    'REV-03': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'contact',
      trigger: 'Job completed', delay: '12 months after the job', window: 'business-hours',
      stops: 'Only if consent_marketing is yes.',
      subject: 'A year on, how is it going?',
      preheader: 'It has been a year since {{opportunity.site_address}}. Tell us how it is holding up.',
      body: 'Hi {{contact.first_name}},\n\nIt has been about a year since we did the work at {{opportunity.site_address}}. No agenda here, we just like knowing how jobs hold up.\n\nIf anything is not as you expected, tell us and we will come and look.\n\nAnd if you have taken on more of the building since, the rest of it is usually easier the second time, because we already know the place.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      footer: '{{unsubscribe_link}}',
    },

    /* ------------------------------------------------------------ retention */
    'RET-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact', manual: true,
      trigger: 'Retention release date reached', delay: 'On the release date, sent by hand with the claim attached', window: 'business-hours',
      stops: 'Manual. Sent once per retention, from a saved template.',
      subject: 'Retention release, {{opportunity.site_address}}',
      preheader: 'The retention period has ended. Our claim for {{opportunity.retention_amount}} is attached.',
      body: 'Hi {{contact.first_name}},\n\nThe retention period on {{opportunity.site_address}} ended on {{opportunity.retention_release_date}}. Our claim for the retention of {{opportunity.retention_amount}} is attached, with the original invoice and your purchase order for reference.\n\nIf anything needs to happen before it is released, a defects inspection or a sign-off, tell us and we will arrange it.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'A retention can sit for six to twelve months, which is long enough to forget it. The task on the release date is what stops that.',
    },

    /* ------------------------------------------------------------ always on */
    'SYS-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Inbound call missed', delay: 'Within 60 seconds', window: 'immediate',
      stops: 'Once per caller per day.',
      body: 'Sorry we missed your call. Reply here and we will get straight back to you, or we will ring you shortly. {{custom_values.sms_signoff}}',
      note: 'For a trade business where the phone rings while someone is up a ladder, this is the single highest-value automation on the list.',
    },
    'SYS-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Inbound SMS outside hours', delay: 'Immediately', window: 'immediate',
      stops: 'Once per contact per day, not once per message.',
      body: 'Thanks for your message. We are back {{custom_values.office_hours}} and will reply first thing. Urgent? Ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}',
    },

    /* ----------------------------------------------------------- commercial */
    'C-ACK-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Enters New Lead on the Commercial board', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once. The SMS acknowledgement X-ACK-01 goes too.',
      subject: 'Your enquiry, {{contact.first_name}}',
      preheader: 'We will call to scope it. Five things that make that call useful.',
      body: 'Hi {{contact.first_name}},\n\nThanks for the enquiry regarding {{contact.property_type}} at {{contact.postcode}}.\n\nWe will call you shortly to scope it. Before that call it helps to know:\n\n  Approximate area, in square metres\n  What the space is used for, and any temperature requirement\n  Whether the building is occupied or operating during the works\n  Programme dates, if they are set\n  Who else needs to be involved in the decision\n\nWe work {{custom_values.service_area}} and hold current insurances and SWMS documentation, which we can supply on request.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.',
    },
    'C-INSP-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Site inspection booked on the Commercial board', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking. X-INSP-02 sends the morning text.',
      subject: 'Site inspection confirmed, {{opportunity.inspection_date}}',
      preheader: 'Confirmed for {{opportunity.inspection_date}}. Inductions, PPE, access and a site contact, please.',
      body: 'Hi {{contact.first_name}},\n\nConfirmed for {{opportunity.inspection_date}} at {{opportunity.site_address}}.\n\nPlease let us know before the visit:\n\n  Site induction requirements, and how long they take\n  PPE beyond standard\n  Access arrangements, including any permits or escorts\n  A site contact and mobile for the day\n\nWe will bring insurances and SWMS. If you need those in advance for your own records, reply and we will send them through.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'C-PROP-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Proposal sent, enters Quote Sent on the Commercial board', delay: 'Immediately, with the online proposal', window: 'business-hours',
      stops: 'Sends once per proposal.',
      subject: 'Proposal, {{opportunity.site_address}}',
      preheader: 'Specification, programme and compliance documents included. Accept online, or by purchase order.',
      body: 'Hi {{contact.first_name}},\n\nOur proposal is ready.\n\n  Scope       {{contact.areas}}\n  Area        {{opportunity.sqm_estimate}} sqm\n  Product     {{opportunity.product_type}}\n  Reference   {{opportunity.quote_number}}\n\nView and accept it online here: {{opportunity.quote_link}}\n\nIt includes the specification, programme, and the compliance documentation you will need for your own records. If it carries more than one option, each has its own accept button. A purchase order or a signed acceptance works just as well, whichever your procurement process needs.\n\nIf you need it broken down differently for internal approval, or split into stages, tell us what shape it needs to be in and we will reissue it.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'The offer to reformat is deliberate. Losing a commercial job because the numbers were not in the shape procurement needed is an avoidable loss.',
    },
    'C-PROP-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Proposal unanswered', delay: 'Day 7', window: 'business-hours',
      stops: 'Stops on reply, acceptance, or stage change.',
      subject: 'Anything you need on {{opportunity.quote_number}}?',
      preheader: 'References, insurances, a revised breakdown. And is there a decision date?',
      body: 'Hi {{contact.first_name}},\n\nChecking whether you need anything further on the proposal for {{opportunity.site_address}}. References, insurances, a site visit for your own team, or a revised breakdown, all easy.\n\nAlso useful for us: is there a decision date we should be working to?',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
    },
    'C-PROP-03': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Proposal unanswered', delay: 'Day 21', window: 'business-hours',
      stops: 'Stops on reply, acceptance, or stage change.',
      subject: '{{opportunity.quote_number}}, where does this sit?',
      preheader: 'Live, deferred, or gone elsewhere. Any answer helps us hold capacity.',
      body: 'Hi {{contact.first_name}},\n\nFollowing up on {{opportunity.quote_number}}. Happy either way, we just need to know whether to hold capacity.\n\n  Still live, decision pending\n  Deferred to a later budget\n  Gone elsewhere\n\nAny of those is a useful answer.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
    },
    'C-FUT-01': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'contact',
      trigger: 'In Nurture on the Commercial board', delay: 'Every 90 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops when the card moves back to Quote Sent.',
      subject: 'Still on the plan for {{opportunity.site_address}}?',
      preheader: 'A quarterly check-in, nothing more. Tell us when the budget cycle comes around.',
      body: 'Hi {{contact.first_name}},\n\nYou mentioned {{opportunity.site_address}} was a future-budget project, so this is the quarterly check-in as promised.\n\nIf the budget cycle has come around, we can refresh the proposal against current material pricing within a week. If it has moved further out, tell us the quarter and we will leave you alone until then.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      footer: '{{unsubscribe_link}}',
    },
    'C-PO-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Enters Quote Accepted on the Commercial board', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per job. Not sent for an add-on quote. A weekly task chases the purchase order where one is needed.',
      subject: 'Thanks for the go-ahead, {{opportunity.site_address}}',
      preheader: 'To book the works in we need four things. Programme confirmed within two working days.',
      body: 'Hi {{contact.first_name}},\n\nThanks for accepting {{opportunity.quote_number}} for {{opportunity.site_address}}. To book the works in, we need:\n\n  A purchase order, if your business issues one\n  A site contact and their mobile\n  Induction requirements for the crew\n  Access windows, and any shutdown or quiet periods\n\nOnce those are with us we confirm the programme within two working days. If you accepted online and your business does not use purchase orders, the first line does not apply.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'The thank-you and the paperwork in one email, because a facilities manager wants the list, not a card.',
    },
    'C-MOB-01': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'brand',
      trigger: 'Works booked in the calendar, enters Job Booked on the Commercial board', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per booking.',
      subject: 'Works booked: {{opportunity.site_address}}',
      preheader: 'Start {{opportunity.job_date}}. SWMS, insurances and crew list attached. Four things we need from you.',
      body: 'Hi {{contact.first_name}},\n\nThe works at {{opportunity.site_address}} are booked.\n\n  Start       {{opportunity.job_date}}\n  Completion  {{opportunity.job_end_date}}\n  Crew        {{opportunity.crew_assigned}}\n  Reference   {{opportunity.po_number}}\n\nAttached: SWMS, insurances, and the crew list for induction.\n\nWe need from you:\n\n  Induction booked for the crew before the start date\n  Confirmed access and any permits\n  Power and water availability on site\n  Confirmation the area will be clear of other trades while we spray\n\nThat last one matters more than it sounds. The area has to be free of other trades during application and cure.\n\nYou will get a reminder 7 days and 48 hours before the start, with a one-tap way to confirm the date still works.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'C-SITE-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Each site day while the works run', delay: '6:30am on the day', window: 'immediate',
      stops: 'Once per site day.',
      body: 'Morning {{contact.first_name}}, our crew is on site at {{opportunity.site_address}} today, led by {{opportunity.crew_assigned}}. Any issue, ring {{custom_values.contact_mobile}}. {{custom_values.sms_signoff}}',
      note: 'Goes to the site contact, who is often not the person who signed the purchase order. Set the site contact on the card when the works are booked.',
    },
    'C-PROG-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact', manual: true,
      trigger: 'Works running, staged jobs', delay: 'Weekly, Friday, from a saved template', window: 'business-hours',
      stops: 'Manual. Sent from the template each Friday the works are live.',
      subject: 'Progress update: {{opportunity.site_address}}',
      preheader: 'Where the works are up to, what is next, and anything we need from you.',
      body: 'Hi {{contact.first_name}},\n\nWeekly update on {{opportunity.site_address}}.\n\n  Completed this week   [areas and sqm]\n  Next week             [areas and staging]\n  We need from you      [access, other trades, sign-off]\n\nPhotos attached. The claim for this stage follows per the programme.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'Bracketed lines are filled in by hand. Automating a progress report produces a report nobody reads, so this is a template with a Friday task attached, not a workflow.',
    },
    'C-PAY-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Progress claim issued', delay: 'Per the programme', window: 'business-hours',
      stops: 'Sends once per claim.',
      subject: 'Progress claim {{opportunity.invoice_number}}',
      preheader: 'Claim {{opportunity.invoice_number}} attached with supporting photos, the accepted quote and your PO.',
      body: 'Hi {{contact.first_name}},\n\nProgress claim {{opportunity.invoice_number}} is attached for works at {{opportunity.site_address}}.\n\n  Claim covers   [stage or percentage]\n  Terms          [payment terms]\n\nSupporting photos and any signed variations are included, with the accepted quote and purchase order {{opportunity.po_number}} for reference.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Needs Glenn: payment terms for commercial work, and whether progress claims follow a percentage, a milestone, or a monthly cycle.',
    },
    'C-DONE-01': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'contact',
      trigger: 'Works marked complete, enters Job Completed on the Commercial board', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'Works complete: {{opportunity.site_address}}',
      preheader: 'The works are done. Final claim to follow, then the close-out pack once it is paid.',
      body: 'Hi {{contact.first_name}},\n\nWorks at {{opportunity.site_address}} are complete.\n\nThe final claim follows separately, with the accepted quote and your purchase order attached. Once it is paid we send the close-out pack:\n\n  Completion photos, by area\n  Product data for the {{opportunity.product_type}} foam applied\n  The certificate of completion for the building surveyor\n  Any variations agreed on site, itemised\n\nIf your handover process needs a sign-off form or a walk-through, name a time and we will be there.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
    },
    'C-CLOSE-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'contact',
      trigger: 'Final claim paid on the Commercial board', delay: '+1 day', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'Thanks, {{contact.first_name}}',
      preheader: 'Final payment received. One favour, and a promise about next time.',
      body: 'Hi {{contact.first_name}},\n\nFinal payment on {{opportunity.site_address}} is in, thank you. The close-out pack is on its way separately.\n\nOne favour. If the works went the way you needed, would you be willing to act as a reference for a future client of similar scale? A phone call, nothing written.\n\nAnd for next time: we hold the specification and site notes, so a second stage or another site can be scoped without starting from scratch.',
      sig: ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'],
      note: 'A reference from a facilities manager is worth more on a commercial tender than any number of homeowner reviews. Ask for it while the job is fresh.',
    },
  },

  /* ------------------------------------------------------ the pipelines */
  /* Two boards, thirteen stages each, identical keys and order:
     New Lead > Dial 1 > Dial 2 > Inspection Required > Quote Sent > Follow-Up >
     Nurture > Quote Accepted > Booking Required > Job Booked > Deposit
     Requested > Job Completed > Retention Claim.
     Inspection Required is used by about one job in ten or twenty, before the
     quote or after acceptance. Follow-Up and Nurture are sidings. Quote
     Accepted is where the job is won. */
  pipelines: [
    {
      id: 'residential',
      name: 'Residential',
      short: 'Residential',
      wonAt: 'quote-accepted',
      blurb: 'Homes, new builds, sheds and garages. A phone call, a written quote, an install date, and a job that is usually done in a day.',
      stages: [
        {
          key: 'new-lead', n: 1, name: 'New Lead', phase: 'sale', headline: 'The first fifteen minutes',
          clientDo: [
            'Ring within 15 minutes. No answer? Ring again straight away.',
            'No answer to either call: move the card to Dial 1. The text goes by itself.',
            'They answer and it is a job: send the quote. Sending it moves the card to Quote Sent.',
            'It needs a site visit first: move the card to Inspection Required.',
            'They ask you to ring back later: move it to Follow-Up with the time. Not now: move it to Nurture.',
            'Clearly commercial: move the card to the Commercial board.',
          ],
          means: 'A lead has landed. Nobody has rung them yet.',
          exits: 'They are rung, and either answer or do not', stalls: '15 minutes to the first call',
          intro: 'The moment someone sends the form, two things go before anyone has read it: a text saying we have the enquiry and will ring shortly, and an email that plays back what they told us and explains what happens next. Then the clock starts. If no call is logged within fifteen business minutes, the office gets an email. Ring twice, back to back. If they answer, the call decides where the card goes: a job we can price goes to Quote Sent when the quote is sent, a job that needs a look first goes to Inspection Required, a request to ring back later goes to Follow-Up, and not now goes to Nurture. If neither call is answered, the card goes to Dial 1.',
          groups: [{ title: 'The moment they enquire', messages: ['X-ACK-01', 'X-ACK-02'] }],
          alerts: [1, 7],
          tasks: [{
            title: 'CALL {{contact.first_name}}: new lead, {{contact.areas}}',
            desc:
              'Ring the new lead within 15 minutes. The acknowledgement text and email have already gone. Ring twice, back to back. No answer to either: move the card to Dial 1. If they answer and it is a job, send the quote within two business days, or move the card to Inspection Required if it needs a site visit first.',
            role: 'OFFICE',
            due: '15 minutes',
          }],
          automation: ['Routed to this board on property type: home, new build, shed, or something else.', 'Assigned to the office. Unassigned is how leads die.', 'Attribution and consent evidence written to the contact, first touch only if empty.', 'Each call is logged on the card from the app. A logged call is what stops the 15 minute timer.'],
          escalation: '15 minutes with no call logged: an email to the office. 1 hour: a text and an email to the owner. Next morning: top of the daily summary until a call is logged. Business hours only, so a midnight enquiry starts its clock at 7am.',
        },
        {
          key: 'dial-1', n: 2, name: 'Dial 1', phase: 'sale', headline: 'Two calls, then a text',
          clientDo: [
            'Nothing to send. The text goes about ten seconds after you move the card here.',
            'Ring again later the same day. There is a task.',
            'They answer or reply: move the card on, the same way as from New Lead.',
            'Still nothing after the second round: move the card to Dial 2.',
          ],
          means: 'Rung twice back to back with no answer. A text has gone.',
          exits: 'They answer or reply, or the second round of calls gets nothing', stalls: 'End of the same day',
          intro: 'Most people will not answer a number they do not know, and most of them will reply to a text. So about ten seconds after the card lands here, while the missed calls are still on their screen, a text goes saying we just tried to call and they can reply or ring back. Later the same day there is a second round of calls. If they answer or reply, the card moves on the same way as from New Lead. If the second round gets nothing, the card goes to Dial 2.',
          groups: [{ title: 'About ten seconds after the second call', messages: ['DIAL-01'] }],
          alerts: [3],
          tasks: [{
            title: 'CALL {{contact.first_name}}: second round of calls',
            desc:
              'Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails.',
            role: 'OFFICE',
            due: 'Later the same day',
          }],
          automation: ['Entering Dial 1 sends DIAL-01 about ten seconds later.', 'contact_attempts goes up by one for each call logged, and last_attempt_at is stamped.', 'Any reply pauses everything automatic on the card.'],
        },
        {
          key: 'dial-2', n: 3, name: 'Dial 2', phase: 'sale', headline: 'Three emails, then an honest close',
          clientDo: [
            'Nothing to send. The emails go on days 2, 4 and 7.',
            'Try one more call on day 4. There is a task.',
            'If they book a phone call, read their enquiry before you ring.',
            'They reply or answer: move the card on, the same way as from New Lead.',
          ],
          means: 'Two rounds of calls with no answer. The emails are running.',
          exits: 'They reply or book a call, or day 7 passes with nothing', stalls: '7 days',
          intro: 'Calls have not worked, so this stage switches to email. Day 2 is a short check-in. Day 4 offers a time to talk, with a link to book a phone call at a time that suits them. Day 7 says plainly that we are closing the enquiry off and nothing is lost, which is the message people answer. Any reply or booking stops the sequence. If day 7 passes with nothing, the card goes to Lost with the reason Unreachable, so it never sits here forever. Anyone who books the phone call, from the email or the website, gets the confirmation and reminders below.',
          groups: [
            { title: 'The emails', messages: ['DIAL-02', 'DIAL-03', 'DIAL-04'] },
            { title: 'If they book a phone call', messages: ['X-APPT-01', 'X-APPT-02', 'X-APPT-03', 'X-APPT-04'], caption: 'The day 4 email offers this call, and the website offers it straight after the form, so a booking can arrive at any point before the quote.' },
            { title: 'If they move it', messages: ['X-APPT-06'] },
          ],
          alerts: [3, 4, 5],
          tasks: [{
            title: 'CALL {{contact.first_name}}: one more try',
            desc:
              'One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way.',
            role: 'OFFICE',
            due: 'Day 4',
          }],
          automation: ['Days count from when the card enters Dial 2.', 'Any reply, booking or answered call stops the emails.', 'Day 7 passes with no reply: status Lost, reason Unreachable. No message beyond DIAL-04.'],
        },
        {
          key: 'inspection-required', n: 4, name: 'Inspection Required', phase: 'either', headline: 'A look at the site first',
          clientDo: [
            'Book the visit in the inspection calendar from the card. The confirmation and the morning text go by themselves.',
            'At the site, record the area in square metres, the foam type and the access notes on the card before you leave.',
            'Came here before the quote: send the quote, which moves the card to Quote Sent.',
            'Came here after they accepted: move the card to Booking Required.',
          ],
          means: 'The job needs a site visit before it can be quoted or booked.',
          exits: 'The visit is done, then the quote is sent or the install is ready to book', stalls: '5 days to book the visit',
          intro: 'Only about one job in ten or twenty needs this. Most are quoted from the phone call. A card comes here either before the quote, when the job cannot be priced without seeing it, or after the customer has accepted, when something needs checking before the install is booked. The visit goes in the inspection calendar, which sends a confirmation with the address and a text on the morning. Our own people go to the site, so there is nothing here about the customer not turning up. Whoever attends records the area, the foam and the access on the card from their phone before they leave.',
          groups: [
            { title: 'When the visit is booked', messages: ['X-INSP-01'] },
            { title: 'On the morning', messages: ['X-INSP-02'] },
            { title: 'If it moves', messages: ['X-APPT-06'] },
          ],
          alerts: [],
          tasks: [
            {
              title: 'BOOK {{contact.first_name}}: site inspection',
              desc:
                'Book the site inspection in the inspection calendar from the card, at a time that suits the customer. Confirm the address and access to the areas being sprayed. The confirmation and the morning text go by themselves.',
              role: 'OFFICE',
              due: '2 days',
            },
            {
              title: 'ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}',
              desc:
                'Attend the inspection. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.',
              role: 'ESTIMATOR',
              due: 'On the date',
            },
          ],
          automation: ['inspection_date set from the inspection calendar.', 'access_notes, sqm_estimate and product_type captured on site from the app, not later from memory.', 'Before the quote: sending the quote moves the card to Quote Sent. After acceptance: the card is moved to Booking Required by hand.', 'A cancelled visit clears inspection_date and puts a task on the office to rebook it.'],
        },
        {
          key: 'quote-sent', n: 5, name: 'Quote Sent', phase: 'sale', headline: 'A number they can accept with one click',
          clientDo: [
            'Ring them on day 2. There is a task.',
            'Accepted online: nothing to do. The card moves itself.',
            'Accepted by phone, or a purchase order arrived: move the card to Quote Accepted and note which option they chose.',
            'They want a callback: Follow-Up. Not now: Nurture. Gone elsewhere: Lost, with the reason.',
            'On day 21, decide. Never leave it sitting.',
          ],
          means: 'A written quote is with them, with accept and decline buttons.',
          exits: 'They accept, decline, ask to be rung later, or go quiet past day 21', stalls: '21 days',
          intro: 'The quote goes by email with a link to view it online, where the customer can accept or decline it with one click. If the job was quoted more than one way, open cell or closed cell, or two thicknesses, each option has its own accept button and the card records which one they chose. A text says it has arrived. Then the follow-up runs by itself: a text on day 2, the email on day 5 that explains why two quotes for the same job can look nothing alike, a one-line question on day 10, and on day 21 an honest note that we will close it off. Accepting online moves the card to Quote Accepted by itself. Declining closes it as Lost and sends a short thank-you. A yes on the phone, or a purchase order, is moved by hand.',
          groups: [
            { title: 'The quote', messages: ['R-QUOTE-01', 'R-QUOTE-02'] },
            { title: 'The follow-up', messages: ['R-FU-01', 'R-FU-02', 'R-FU-03', 'R-FU-04'], caption: 'Every one stops the moment they reply, accept or decline.' },
            { title: 'If they decline', messages: ['LOST-01'], caption: 'Sends when the card is marked Lost with any reason other than Unreachable, Duplicate or Spam. Nobody hears from us again after this unless they ask to.' },
          ],
          alerts: [3],
          tasks: [
            {
              title: 'CALL {{contact.first_name}}: quote follow up',
              desc:
                'Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.',
              role: 'OFFICE',
              due: 'Day 2',
            },
            {
              title: 'DECIDE {{contact.first_name}}: accepted, nurture or lost',
              desc:
                'Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting.',
              role: 'OFFICE',
              due: 'Day 21',
            },
          ],
          automation: ['Opportunity value set to the quoted figure. quote_number, quote_link and quote_sent_at on the card.', 'Accept button: the card moves to Quote Accepted and accepted_quote_option records the option chosen.', 'Decline button: status Lost, reason asked for, and LOST-01 the next business morning.', 'Optional upgrades on a quote that change the total as the customer ticks them, for example R2.5 to R4, are pending scope confirmation and are not part of this build yet.'],
        },
        {
          key: 'follow-up', n: 6, name: 'Follow-Up', phase: 'sale', headline: 'They asked us to ring back',
          clientDo: [
            'Put the callback time on the card. The task is created for that time.',
            'Ring when the task says. After the call, move the card on.',
          ],
          means: 'A conversation is live and the customer has asked for a call at a later time.',
          exits: 'The callback happens and the card moves on', stalls: 'A day past the callback time',
          intro: 'For the customer who says "ring me next week" or "call back after I have spoken to my partner". Nothing automatic goes to them here: every sequence on the card is paused, because a call at the time they chose is a better next step than another email. The time they asked for goes on the card, and a task lands at that time. After the call, the card moves on like any other: to Quote Sent, Inspection Required, Quote Accepted, Nurture, or Lost.',
          groups: [],
          alerts: [3],
          tasks: [{
            title: 'CALL {{contact.first_name}}: callback as asked',
            desc:
              'The customer asked to be rung at this time. Ring them, then move the card on: Quote Sent once a quote goes, Inspection Required if a visit is needed, Quote Accepted if they say yes, Nurture if it is not now, or Lost with a reason.',
            role: 'OFFICE',
            due: 'At the time they asked',
          }],
          automation: ['callback_at set on the card. The task is due at that time.', 'Every sequence on the card pauses while it sits here: the dial emails and the quote follow-up.', 'A day past the callback time with no move: listed in the daily summary.'],
        },
        {
          key: 'nurture', n: 7, name: 'Nurture', phase: 'sale', headline: 'Right job, wrong time',
          clientDo: [
            'Nothing to send. The emails go by themselves, only to people who opted in.',
            'At twelve months, ring them. There is a task.',
            'They come back: send a fresh quote, which moves the card to Quote Sent.',
            'Once a quarter, remove anyone who is not a real job.',
          ],
          means: 'A real job that is not happening now: not now, or not affordable yet.',
          exits: 'They come back: to Quote Sent for a fresh quote, or New Lead', stalls: 'Review quarterly',
          intro: 'A siding, not a step. Cards come here from the first call or from a quote that went quiet, when the answer is "not now" or "we cannot afford it yet". Quotes from here regularly come back after a year or two, so the card is kept rather than closed. Three emails go over three months, then a note at twelve months offering to refresh the quote. All four are marketing, so they only go to people who ticked the box on the form, and every one has an unsubscribe. Everyone in Nurture also gets a call at twelve months, whether or not they ticked the box. When they come back, the card moves to Quote Sent with a fresh quote, or back to New Lead if it needs talking through again.',
          groups: [
            { title: 'The drip, marketing consent only', messages: ['NUR-01', 'NUR-02', 'NUR-03'] },
            { title: 'A year on, marketing consent only', messages: ['NUR-04'] },
          ],
          alerts: [3],
          tasks: [
            {
              title: 'CHECK-IN {{contact.first_name}}: a year since the quote',
              desc:
                'A year since this job went to Nurture. Ring and ask whether it is back on. Quotes often come back after one or two years. If it is, refresh the quote against current prices and send it, which moves the card to Quote Sent.',
              role: 'OFFICE',
              due: '12 months',
            },
            {
              title: 'REVIEW {{contact.first_name}}: still a fit?',
              desc:
                'Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Quote Sent or New Lead. A clean list keeps the emails landing in inboxes rather than in spam.',
              role: 'OWNER',
              due: 'Quarterly',
            },
          ],
          automation: ['Sends only when consent_marketing is yes. Every message carries an unsubscribe.', 'Any reply, booking or new form fill stops the drip.', 'Unsubscribe sets do-not-market on the contact and the card stays put, so a later enquiry is still recognised.'],
        },
        {
          key: 'quote-accepted', n: 8, name: 'Quote Accepted', phase: 'won', headline: 'The moment they say yes',
          clientDo: [
            'Accepted online: nothing to do. The thank-you has gone.',
            'Accepted by phone or purchase order: move the card here and note which quote they chose.',
            'Needs a look first: move the card to Inspection Required. Otherwise: Booking Required.',
            'An add-on quote on a job already under way: send it as normal. Accepting it updates the job, not this stage.',
          ],
          means: 'They have accepted a quote, online, by phone or with a purchase order.',
          exits: 'An inspection is needed, or the install date is ready to book', stalls: '1 day',
          intro: 'The accept button moves the card here by itself. A yes on the phone, or a purchase order, is moved here by hand. Arriving here marks the job Won, stops every sales message on the card, and thanks the customer with what happens next: the install date first, reminders before the job, and the deposit invoice closer to the date, not now. The owner and the office are both told. If the job needs a look before it is booked, the card goes to Inspection Required, otherwise straight to Booking Required. A second quote on a job that is already under way, say floor protection or window sealing, does not bring a card back here: the system recognises the active job and only tells the office to update the value.',
          groups: [{ title: 'On acceptance', messages: ['X-ACC-01', 'X-ACC-02'], caption: 'Not sent for an add-on quote on a job that is already under way.' }],
          alerts: [8],
          tasks: [{
            title: 'NEXT {{contact.first_name}}: inspection or booking',
            desc:
              'The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked.',
            role: 'OFFICE',
            due: 'Same day',
          }],
          automation: ['Status set to Won. Every sales sequence on the card stops: the dial emails, the phone call reminders, the quote follow-up and the nurture drip.', 'accepted_quote_option recorded. The opportunity value is the accepted option.', 'Tag is-active-job added. While it is on, an accepted add-on quote updates the value and tells the office, without sending the thank-you again or moving the card.', 'deposit_amount set from the accepted quote where a deposit applies. Nothing is invoiced yet.', 'foam_order_type set: stock open cell or special order. It decides when the deposit is due.'],
        },
        {
          key: 'booking-required', n: 9, name: 'Booking Required', phase: 'job', headline: 'Book the install date',
          clientDo: [
            'Book the install date in the install calendar on the card, with the crew. Not in a phone calendar first.',
            'The booking moves the card to Job Booked by itself.',
          ],
          means: 'Accepted, and ready for an install date in the calendar.',
          exits: 'The install is booked in the calendar', stalls: '2 business days',
          intro: 'Kept separate from Quote Accepted because an inspection can sit between the two. The owner books the install date in the install calendar in the platform, not a phone calendar, because the booking is what moves the card to Job Booked and starts everything that follows: the confirmation, the preparation notes, the reminders and, on jobs that take one, the deposit. Long lead times are fine. A job booked three months out gets its deposit invoice two weeks before the date, not today.',
          groups: [],
          alerts: [],
          tasks: [{
            title: 'BOOK {{contact.first_name}}: install date',
            desc:
              'Book the install date in the install calendar from the card, and put the crew on it. Book it here first, not in a phone calendar, because the booking is what sends the confirmation and sets up the reminders and the deposit timing.',
            role: 'OWNER',
            due: '2 business days',
          }],
          automation: ['The install calendar booking sets job_date and crew_assigned and moves the card to Job Booked.', 'Apple and Outlook calendars sync with the install calendar. That set-up is covered by the separate calendars task.', 'Over 2 business days here: listed in the daily summary.'],
        },
        {
          key: 'job-booked', n: 10, name: 'Job Booked', phase: 'job', headline: 'In the diary, and confirmed twice',
          clientDo: [
            'Nothing to send. The booking, the reminders and the morning text go by themselves.',
            'A customer taps No: ring them that day, agree a new date, and move the booking in the calendar. The reminders follow the new date.',
            'Running late on the day? Send the saved late text from the app, one tap.',
            'No deposit on this job: the card stays here until the crew marks the job complete.',
          ],
          means: 'An install date is booked in the calendar.',
          exits: 'The deposit invoice is sent, or the crew marks the job complete', stalls: 'The job date',
          intro: 'The booking sends a text and an email with the date and the preparation list: clear access, move what you would rather not have dust near, parking close for the rig, pets elsewhere, someone over eighteen to let us in. Seven days before and again 48 hours before, a reminder goes by email and text with two buttons: yes, the date still works, or no, it does not. A no tells the team straight away and thanks the customer, and somebody rings to rearrange. The crew and the rig are moved by a person, never automatically. On the morning a text says the crew is on the way, and the crew has a one-tap text if they are running late. On jobs that take a deposit, the deposit invoice goes two weeks before the date and moves the card to Deposit Requested.',
          groups: [
            { title: 'When the date is booked', messages: ['JOB-01', 'JOB-02'] },
            { title: 'Seven days before', messages: ['REM-01', 'REM-02'], caption: 'Yes and No are buttons. Yes is noted on the card. No goes to the team.' },
            { title: '48 hours before', messages: ['REM-03', 'REM-04'] },
            { title: 'If they tap No', messages: ['REM-05'] },
            { title: 'On the morning', messages: ['JOB-04'] },
            { title: 'Crew quick-send', messages: ['JOB-06'], caption: 'Manual. Saved as a snippet in the mobile app so it is one tap, not a typed apology.' },
          ],
          alerts: [12],
          tasks: [
            {
              title: 'RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}',
              desc:
                'The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date.',
              role: 'OWNER',
              due: 'Same day',
            },
            {
              title: 'CALL {{contact.first_name}}: date not confirmed',
              desc:
                'Neither reminder got a Yes or a No. Ring to confirm the job is still on, that access is clear, and that someone over eighteen will be there to let the crew in.',
              role: 'OFFICE',
              due: 'Day before the job, if neither reminder was answered',
            },
          ],
          automation: ['job_date and crew_assigned set from the install calendar.', 'Reminders scheduled from job_date: 7 days and 48 hours before, email and text, each with Yes and No buttons. If the date moves, they re-queue.', 'Yes sets job_confirmed to Yes. No sets it to No, fires the alert and sends REM-05. No automatic rescheduling.', 'The deposit invoice is scheduled from job_date and foam_order_type, and moves the card to Deposit Requested when it goes.', 'Variations agreed on site go out from the variation document for a digital signature, for example an extra 100 sqm, and are added to the value.'],
        },
        {
          key: 'deposit-requested', n: 11, name: 'Deposit Requested', phase: 'job', headline: 'The deposit, timed to the job',
          clientDo: [
            'Nothing to send. The invoice, the reminder and the receipt text go by themselves.',
            'When the money lands, mark the deposit invoice paid. That sends the confirmation.',
            'Unpaid on the due date: you get an alert. Ring them today and decide whether the crew holds the date.',
          ],
          means: 'The deposit invoice is out. The job is booked and waiting for its date.',
          exits: 'The crew marks the job complete', stalls: 'The deposit due date',
          intro: 'Deposits are not sent at booking, because a job booked months ahead would sit on an unpaid invoice for months. The deposit invoice goes 14 days before the install date, or straight away if the job is less than 14 days out, and sending it moves the card here. It is due one business day before the job for stock open cell foam, and seven days before for special-order foam, because that material is made and shipped for the job. The accepted quote, which carries the terms and conditions, is attached. A reminder text goes two days before it is due. If it is still unpaid on the due date, the team is told so the crew can be reassigned in time. Nothing is charged to a card automatically. When it lands, a one-line text confirms it, and the card waits here for the job day. Jobs that take no deposit skip this stage.',
          groups: [
            { title: 'Two weeks before the job', messages: ['DEP-02'] },
            { title: 'Two days before it is due', messages: ['DEP-03'] },
            { title: 'When it lands', messages: ['DEP-01'] },
          ],
          alerts: [9, 13],
          tasks: [{
            title: 'CHASE {{contact.first_name}}: deposit unpaid',
            desc:
              'The deposit was due today and has not landed. Ring the customer today: most late deposits are a missed email, not a change of mind. If it will not be paid in time, tell the owner so the crew can be reassigned.',
            role: 'OFFICE',
            due: 'On the due date, if unpaid',
          }],
          automation: ['deposit_due_date worked out from job_date: one business day before for stock open cell, seven days before for special order.', 'The invoice is sent 14 days before job_date, or at once if the job is less than 14 days out, with the accepted quote attached. deposit_invoice_sent_at stamped. The 14 day send point is to confirm with Glenn.', 'Unpaid at deposit_due_date: alert to the owner and the office, and the chase task.', 'No card storage and no automatic charging.', 'deposit_received_at set when paid, which sends DEP-01.'],
        },
        {
          key: 'job-completed', n: 12, name: 'Job Completed', phase: 'job', headline: 'Done, invoiced, then the paperwork',
          clientDo: [
            'Crew: photos on the card, then mark the job complete. The invoice goes by itself.',
            'When the final invoice is paid, mark it paid. Then send the job report from the template the same day. There is a task.',
            'A job with problems: set Ask for Google review to No on the contact before the four week mark.',
            'A retention is held: put the amount and the release date on the card before marking it paid.',
          ],
          means: 'The crew has marked the job complete. The final invoice is out.',
          exits: 'The final invoice is paid', stalls: '14 days',
          intro: 'The crew marks the job complete from the app once the photos are on the card, and that sends the final invoice. The invoice carries the payment schedule, whether that is one amount or several stages with their own due dates, and the accepted quote and any purchase order are attached. A thank-you note goes separately so the paperwork never dilutes it. Reminders at day 7 and day 14 stop the moment it is paid. The job report, with photos and the certificate of completion for the building surveyor, goes only once the final invoice is fully paid. Four weeks after the job, a text asks for a Google review, but only if Ask for Google review is set to Yes on the contact. It is Yes by default, and set to No by hand for a job that had problems. Once paid, the card closes as Won, unless a retention is being held.',
          groups: [
            { title: 'When the crew marks it complete', messages: ['JOB-05', 'PAY-01'] },
            { title: 'If unpaid', messages: ['PAY-02', 'PAY-03'] },
            { title: 'Once the final invoice is paid', messages: ['RPT-01'], caption: 'Sent by hand from a saved template, because the report and certificate are attached per job.' },
            { title: 'Four weeks after the job, only if Ask for Google review is Yes', messages: ['REV-01'] },
            { title: 'Marketing consent only', messages: ['REV-02', 'REV-03'] },
          ],
          alerts: [10],
          tasks: [
            {
              title: 'PHOTOS {{opportunity.site_address}}',
              desc:
                'Photograph the finished work from the app before leaving site, and tick Photos captured. The job cannot be marked complete without them. They go into the job report, and they are the only real proof-of-work images the business has.',
              role: 'CREW_LEAD',
              due: 'Before marking it complete',
            },
            {
              title: 'VARIATIONS {{contact.first_name}}: record any extras',
              desc:
                'Anything agreed on site that was not in the quote, such as an extra 100 sqm, goes out from the variation document for the customer to sign, and onto the card the same day. Left to invoicing, it surprises the customer.',
              role: 'CREW_LEAD',
              due: 'Before marking it complete',
            },
            {
              title: 'CHASE {{contact.first_name}}: payment overdue',
              desc:
                'Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.',
              role: 'OFFICE',
              due: 'Day 14',
            },
            {
              title: 'SEND {{contact.first_name}}: job report and certificates',
              desc:
                'The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid.',
              role: 'OFFICE',
              due: 'Same day as payment',
            },
          ],
          automation: ['photos_captured is required before the job can be marked complete.', 'The final invoice is created from the accepted quote with its payment schedule, and the accepted quote and any purchase order attached. invoice_number and invoice_sent_at stamped.', 'Reminders stop the moment the invoice is marked paid. final_invoice_paid_at stamped.', 'Paid: the job report task is created. job_report_sent_at is stamped when it goes.', 'REV-01 sends 4 weeks after job_date, only when ask_for_google_review is Yes. The range agreed was 4 to 6 weeks.', 'Paid with no retention: the card closes as Won and is-active-job comes off.'],
        },
        {
          key: 'retention-claim', n: 13, name: 'Retention Claim', phase: 'job', headline: 'The money held back',
          clientDo: [
            'Put the retention amount and the release date on the card.',
            'On the release date, send the claim from the template. There is a task.',
            'When the retention is paid, mark it paid. The card closes.',
          ],
          means: 'Part of the payment is being held back until a defects period ends.',
          exits: 'The retention is paid', stalls: 'The release date',
          intro: 'Rare on a house, but it happens when a builder holds back part of the payment until a defects period ends. This stage is run by hand. The amount and the release date go on the card when the rest of the job is paid, and a task lands on the release date to send the claim. Once the retention is paid, the card closes.',
          groups: [{ title: 'On the release date', messages: ['RET-01'], caption: 'Sent by hand from a saved template, with the claim attached.' }],
          alerts: [],
          tasks: [{
            title: 'CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}',
            desc:
              'The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card.',
            role: 'OFFICE',
            due: 'On the release date',
          }],
          automation: ['retention_amount and retention_release_date set by hand.', 'A task on the release date, and another a month later if it is still unpaid.', 'Marked paid by hand: the card closes as Won and is-active-job comes off.'],
        },
      ],
    },
    {
      id: 'commercial',
      name: 'Commercial & Industrial',
      short: 'Commercial',
      wonAt: 'quote-accepted',
      blurb: 'Factories, warehouses, cold storage, agricultural facilities, data centres and mine sites. The same thirteen stages as residential, with company records, purchase orders, SWMS, inductions, site contacts and longer lead times.',
      stages: [
        {
          key: 'new-lead', n: 1, name: 'New Lead', phase: 'sale', headline: 'The first fifteen minutes, and the owner told',
          clientDo: [
            'Ring within 15 minutes, twice back to back if needed. The owner already knows it has landed.',
            'On the call, find out who decides, roughly how big it is, what the space is used for and when it is needed. Put the company, site address and a site contact on the card.',
            'Then move the card the same way as residential: Quote Sent, Inspection Required, Follow-Up, Nurture, or Dial 1 if nobody answers.',
            'Turns out to be a house: move the card to the Residential board.',
          ],
          means: 'A lead has landed on the commercial board. Nobody has rung them yet.',
          exits: 'They are rung, and either answer or do not', stalls: '15 minutes to the first call',
          intro: 'Routed here on property type, factory or farm, or moved here by hand when the message mentions a tender, a builder, or an area no house has. The text acknowledgement is the same as residential. The email is not: it asks for the five things that make the scoping call useful and mentions insurances and SWMS, because the person reading it will need them. The owner gets a text and an email the moment it lands. The office still makes the first call within fifteen minutes, and the card moves the same way as residential: to Quote Sent, Inspection Required, Follow-Up, Nurture, or Dial 1 if nobody answers.',
          groups: [{ title: 'The moment they enquire', messages: ['X-ACK-01', 'C-ACK-01'] }],
          alerts: [6, 1, 7],
          tasks: [{
            title: 'CALL {{contact.first_name}}: commercial lead, {{contact.company}}',
            desc:
              'Ring the commercial lead within 15 minutes, twice back to back if needed. Aim to come off the call knowing who decides, roughly how big it is, what the space is used for, whether it is operating during the works, and when they need it done. Put the company, site address and a site contact on the card.',
            role: 'OFFICE',
            due: '15 minutes',
          }],
          automation: ['Routed on property type: factory or warehouse, farm or agricultural. Moved here by hand on a tender, a builder, a head contractor, or a large area figure.', 'A card on the wrong board is moved, not recreated. Moving keeps the attribution and the consent record.', 'No forecast value until a real number exists. Commercial ranges from small to millions.'],
          escalation: 'The same ladder as residential: 15 minutes with no call logged, an email to the office. 1 hour, a text and an email to the owner. Next morning, top of the daily summary until a call is logged.',
        },
        {
          key: 'dial-1', n: 2, name: 'Dial 1', phase: 'sale', headline: 'Two calls, then a text',
          clientDo: [
            'Nothing to send. The text goes about ten seconds after you move the card here.',
            'Ring again later the same day. There is a task.',
            'They answer or reply: move the card on. Still nothing: Dial 2.',
          ],
          means: 'Rung twice back to back with no answer. A text has gone.',
          exits: 'They answer or reply, or the second round of calls gets nothing', stalls: 'End of the same day',
          intro: 'The same as residential. A facilities manager on site is no more likely to pick up an unknown number than a homeowner, and just as likely to reply to a text. About ten seconds after the card lands here a text goes, and a second round of calls follows later the same day.',
          groups: [{ title: 'About ten seconds after the second call', messages: ['DIAL-01'] }],
          alerts: [3],
          tasks: [{
            title: 'CALL {{contact.first_name}}: second round of calls',
            desc:
              'Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails.',
            role: 'OFFICE',
            due: 'Later the same day',
          }],
          automation: ['Entering Dial 1 sends DIAL-01 about ten seconds later.', 'contact_attempts goes up by one for each call logged.'],
        },
        {
          key: 'dial-2', n: 3, name: 'Dial 2', phase: 'sale', headline: 'Three emails, then an honest close',
          clientDo: [
            'Nothing to send. The emails go on days 2, 4 and 7.',
            'Try one more call on day 4. There is a task.',
            'They reply or book a call: move the card on.',
          ],
          means: 'Two rounds of calls with no answer. The emails are running.',
          exits: 'They reply or book a call, or day 7 passes with nothing', stalls: '7 days',
          intro: 'The same three emails as residential, on days 2, 4 and 7, with the booking link on day 4. Commercial contacts are slower to answer, so a reply after the close-off is common: if one comes, the card is reopened rather than started again. A facilities manager who books the phone call gets the same confirmation and reminders as a homeowner.',
          groups: [
            { title: 'The emails', messages: ['DIAL-02', 'DIAL-03', 'DIAL-04'] },
            { title: 'If they book a phone call', messages: ['X-APPT-01', 'X-APPT-02', 'X-APPT-03', 'X-APPT-04', 'X-APPT-06'] },
          ],
          alerts: [3, 4, 5],
          tasks: [{
            title: 'CALL {{contact.first_name}}: one more try',
            desc:
              'One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way.',
            role: 'OFFICE',
            due: 'Day 4',
          }],
          automation: ['Same close: day 7 passes with no reply, Lost with reason Unreachable.'],
        },
        {
          key: 'inspection-required', n: 4, name: 'Inspection Required', phase: 'either', headline: 'Boots on site',
          clientDo: [
            'Book the visit in the inspection calendar from the card. The confirmation email and the morning text go by themselves.',
            'Take insurances and SWMS. Record the area, product and access notes on the card before you leave.',
            'Before the quote: send the proposal, which moves the card to Quote Sent.',
            'After acceptance: move the card to Booking Required.',
          ],
          means: 'The works need a site visit before they can be priced or booked.',
          exits: 'The visit is done, then the proposal is sent or the works are ready to book', stalls: '5 days to book the visit',
          intro: 'More commercial jobs need a visit than residential ones, but most still start with a call. A card comes here before the proposal, when the works cannot be priced without seeing them, or after acceptance, when something needs checking before the dates are set. A commercial visit needs more than an address: the confirmation asks for induction requirements, PPE beyond standard, access arrangements and a site contact, and offers the insurances and SWMS in advance for their records. Our own people attend, so there is nothing here about anyone not turning up.',
          groups: [
            { title: 'On booking', messages: ['C-INSP-01'] },
            { title: 'On the morning', messages: ['X-INSP-02'] },
            { title: 'If it moves', messages: ['X-APPT-06'] },
          ],
          alerts: [],
          tasks: [
            {
              title: 'BOOK {{contact.first_name}}: site inspection',
              desc:
                'Book the site inspection in the inspection calendar from the card, at a time that suits the customer. Confirm the address and access to the areas being sprayed. The confirmation and the morning text go by themselves.',
              role: 'OFFICE',
              due: '2 days',
            },
            {
              title: 'ATTEND {{opportunity.site_address}}: inspection',
              desc:
                'Attend the visit with insurances and SWMS. Before you leave, record on the card: the area in square metres, the foam type, access notes, induction needs, and anything that will slow the crew down. Photos of problem areas help the proposal.',
              role: 'ESTIMATOR',
              due: 'On the date',
            },
          ],
          automation: ['inspection_date set from the inspection calendar.', 'On site: sqm_estimate, product_type and access_notes captured from the app.', 'A cancelled visit clears inspection_date and puts a task on the office to rebook it.'],
        },
        {
          key: 'quote-sent', n: 5, name: 'Quote Sent', phase: 'sale', headline: 'Priced, specified, documented',
          clientDo: [
            'Ring two days after it goes to confirm it reached the right person. There is a task.',
            'Accepted online: nothing to do. A verbal yes or a purchase order: move the card to Quote Accepted.',
            'Deferred to a later budget: Nurture. Gone elsewhere: Lost, with the reason.',
          ],
          means: 'A priced proposal is with them, with an online accept button.',
          exits: 'Accepted, declined, deferred, or quiet past day 21', stalls: '21 days',
          intro: 'The proposal email states scope, area, product and reference in four lines, links to the online version with its accept button, and offers to reshape the numbers for internal approval. A purchase order or a signed acceptance works as well as the button. A week later one email asks whether they need anything further and whether there is a decision date. At day 21 one email offers three answers to pick from: still live, deferred, or gone elsewhere. Any reply stops the follow-up.',
          groups: [
            { title: 'The proposal', messages: ['C-PROP-01'] },
            { title: 'The follow-up', messages: ['C-PROP-02', 'C-PROP-03'] },
          ],
          alerts: [3],
          tasks: [
            {
              title: 'CALL {{contact.first_name}}: confirm receipt',
              desc:
                'Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.',
              role: 'ESTIMATOR',
              due: '2 days',
            },
            {
              title: 'CHASE {{contact.first_name}}: decision date',
              desc:
                'Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.',
              role: 'OWNER',
              due: 'Day 7, then day 21',
            },
          ],
          automation: ['Opportunity value set to the proposal figure. quote_number, quote_link and quote_sent_at on the card.', 'Accept button: the card moves to Quote Accepted by itself.', 'Gone elsewhere: Lost with a reason. LOST-01 is not sent on commercial; the owner writes that one personally.'],
        },
        {
          key: 'follow-up', n: 6, name: 'Follow-Up', phase: 'sale', headline: 'They asked us to ring back',
          clientDo: [
            'Put the callback time on the card. The task is created for that time.',
            'Ring when the task says. After the call, move the card on.',
          ],
          means: 'A conversation is live and the client has asked for a call at a later time.',
          exits: 'The callback happens and the card moves on', stalls: 'A day past the callback time',
          intro: 'For the client who says "ring me after the board meets" or "call back once the budget is signed off". Nothing automatic goes to them here, because a scheduled call is a better next step than another email. The time goes on the card and a task lands at that time.',
          groups: [],
          alerts: [3],
          tasks: [{
            title: 'CALL {{contact.first_name}}: callback as asked',
            desc:
              'The customer asked to be rung at this time. Ring them, then move the card on: Quote Sent once a quote goes, Inspection Required if a visit is needed, Quote Accepted if they say yes, Nurture if it is not now, or Lost with a reason.',
            role: 'OFFICE',
            due: 'At the time they asked',
          }],
          automation: ['callback_at set on the card. The task is due at that time.', 'Every sequence on the card pauses while it sits here.'],
        },
        {
          key: 'nurture', n: 7, name: 'Nurture', phase: 'sale', headline: 'Real project, next budget',
          clientDo: [
            'Nothing to send. A check-in email goes every quarter to people who opted in.',
            'When it comes back, refresh the proposal and send it, which moves the card to Quote Sent.',
          ],
          means: 'A real project in a future budget cycle.',
          exits: 'It comes back: to Quote Sent for a refreshed proposal', stalls: 'Review quarterly',
          intro: 'The commercial siding. One email every quarter, marketing consent permitting, offers to refresh the proposal against current pricing within a week, or to go quiet until a named quarter. Proposals from here often come back a year or two later, so the card keeps everything it learned the first time.',
          groups: [{ title: 'Quarterly, marketing consent only', messages: ['C-FUT-01'] }],
          alerts: [3],
          tasks: [{
            title: 'CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}',
            desc:
              'Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.',
            role: 'OWNER',
            due: 'Quarterly',
          }],
          automation: ['Sends only when consent_marketing is yes.', 'Any reply stops the drip. A refreshed proposal moves the card to Quote Sent.'],
        },
        {
          key: 'quote-accepted', n: 8, name: 'Quote Accepted', phase: 'won', headline: 'The go-ahead, and the paperwork',
          clientDo: [
            'Accepted online: nothing to do. The email asking for the paperwork has gone.',
            'A verbal yes: move the card here, and chase the purchase order weekly until it lands. There is a task.',
            'Purchase order in: put the number on the card. That marks the job Won.',
            'Needs a site look first: Inspection Required. Otherwise: Booking Required.',
          ],
          means: 'The client has accepted, online, in writing or verbally.',
          exits: 'An inspection is needed, or the works are ready to book', stalls: '1 day, or 14 days waiting on a purchase order',
          intro: 'A written acceptance, whether the accept button, a signed acceptance or a purchase order, marks the job Won. A verbal yes also comes here, but the job stays Open until the paperwork lands, because commercial work is not counted on a verbal. One email thanks them and asks for what is needed to book the works in: the purchase order if their business issues one, a site contact, induction requirements and access windows. The owner and the office are told. An add-on or variation quote on a job already under way does not bring the card back here.',
          groups: [{ title: 'On acceptance', messages: ['C-PO-01'], caption: 'Not sent for an add-on or variation quote on works already under way.' }],
          alerts: [8],
          tasks: [
            {
              title: 'CHASE {{contact.first_name}}: purchase order',
              desc:
                'A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.',
              role: 'OFFICE',
              due: 'Weekly, until it lands',
            },
            {
              title: 'NEXT {{contact.first_name}}: inspection or booking',
              desc:
                'The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked.',
              role: 'OFFICE',
              due: 'Same day',
            },
          ],
          automation: ['Written acceptance or po_number: status set to Won. Verbal only: status stays Open until po_number is entered.', 'Every sales sequence on the card stops.', 'accepted_quote_option recorded. Tag is-active-job added, so add-on and variation quotes do not re-fire this stage.'],
        },
        {
          key: 'booking-required', n: 9, name: 'Booking Required', phase: 'job', headline: 'Set the programme',
          clientDo: [
            'Agree the start and finish dates with the client, then book them in the install calendar on the card.',
            'The booking moves the card to Job Booked by itself.',
          ],
          means: 'Accepted. The works dates need booking in the calendar.',
          exits: 'The works are booked in the calendar', stalls: '2 business days',
          intro: 'The owner sets the start and finish dates with the client and books them in the install calendar. Long lead times are normal here: works booked three months out still get any deposit invoice only two weeks before the start, not today. The booking moves the card to Job Booked and sends the mobilisation email.',
          groups: [],
          alerts: [],
          tasks: [{
            title: 'BOOK {{contact.first_name}}: works dates',
            desc:
              'Agree the start and finish dates with the client, then book them in the install calendar from the card with the crew. Book it there first, because the booking sends the mobilisation email and sets up the reminders.',
            role: 'OWNER',
            due: '2 business days',
          }],
          automation: ['The install calendar booking sets job_date and job_end_date and moves the card to Job Booked.', 'Apple and Outlook calendars sync with the install calendar, under the separate calendars task.'],
        },
        {
          key: 'job-booked', n: 10, name: 'Job Booked', phase: 'job', headline: 'Inductions, SWMS, access, and confirmed twice',
          clientDo: [
            'Get the crew inducted and the SWMS accepted before the start date. Two tasks cover it.',
            'A No on a reminder: ring the client today and move the booking by hand.',
            'Fridays on staged jobs: send the progress update from the template.',
            'Issue each progress claim when its stage is done.',
          ],
          means: 'The works dates are booked.',
          exits: 'The deposit invoice is sent, or the works are marked complete', stalls: 'The start date',
          intro: 'The booking sends the mobilisation email: dates, crew, SWMS, insurances and the crew list for induction, and four things back from the client, the last of which matters more than it sounds: the area has to be clear of other trades during application and cure. Seven days and 48 hours before the start, the site contact gets the same Yes or No reminders as residential. A No tells the team, and the crew is moved by a person. Each site morning the site contact gets a text naming the lead on the day. On staged jobs a weekly progress email goes on Fridays from a template, filled in by hand, and progress claims go per the programme.',
          groups: [
            { title: 'When the works are booked', messages: ['C-MOB-01'] },
            { title: 'Seven days and 48 hours before', messages: ['REM-01', 'REM-02', 'REM-03', 'REM-04'] },
            { title: 'If they tap No', messages: ['REM-05'] },
            { title: 'Each site day', messages: ['C-SITE-01'] },
            { title: 'Fridays, staged jobs', messages: ['C-PROG-01'] },
            { title: 'Progress claims, per the programme', messages: ['C-PAY-01'] },
            { title: 'Crew quick-send', messages: ['JOB-06'] },
          ],
          alerts: [12],
          tasks: [
            {
              title: 'INDUCT crew: {{opportunity.site_address}}',
              desc:
                'Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.',
              role: 'CREW_LEAD',
              due: 'Before start',
            },
            {
              title: 'SWMS {{opportunity.site_address}}: issue and confirm receipt',
              desc:
                'Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either.',
              role: 'OWNER',
              due: 'Before start',
            },
            {
              title: 'RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}',
              desc:
                'The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date.',
              role: 'OWNER',
              due: 'Same day',
            },
            {
              title: 'UPDATE {{contact.first_name}}: weekly progress',
              desc:
                'Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week\u2019s photos.',
              role: 'OWNER',
              due: 'Every Friday while live',
            },
            {
              title: 'CLAIM {{opportunity.site_address}}: progress claim',
              desc:
                'Issue the progress claim for the completed stage, put its invoice number on the card, and attach the photos, any signed variations, the accepted quote and the purchase order.',
              role: 'OFFICE',
              due: 'Per milestone',
            },
          ],
          automation: ['job_date, job_end_date, crew_assigned and a site contact set on the card.', 'Reminders at 7 days and 48 hours before job_date, with Yes and No buttons. No automatic rescheduling.', 'Variations go out from the variation document for a digital signature and are added to the value as they are signed.'],
        },
        {
          key: 'deposit-requested', n: 11, name: 'Deposit Requested', phase: 'job', headline: 'The deposit, where one applies',
          clientDo: [
            'Nothing to send. The invoice, the reminder and the receipt text go by themselves.',
            'When the money lands, mark the deposit invoice paid.',
            'Unpaid on the due date: ring them today and decide whether the crew holds.',
          ],
          means: 'The deposit invoice is out. The works are booked and waiting for their start.',
          exits: 'The works are marked complete', stalls: 'The deposit due date',
          intro: 'Many commercial jobs on a purchase order take no deposit and skip this stage. Where one applies, usually for special-order foam, the rule is the same as residential: the invoice goes 14 days before the start, with the accepted quote and the purchase order attached. It is due 7 days before for special-order foam and 1 business day before for stock open cell, and an unpaid deposit at its due date tells the team in time to reassign the crew.',
          groups: [
            { title: 'Two weeks before the start', messages: ['DEP-02'] },
            { title: 'Two days before it is due', messages: ['DEP-03'] },
            { title: 'When it lands', messages: ['DEP-01'] },
          ],
          alerts: [9, 13],
          tasks: [{
            title: 'CHASE {{contact.first_name}}: deposit unpaid',
            desc:
              'The deposit was due today and has not landed. Ring the customer today: most late deposits are a missed email, not a change of mind. If it will not be paid in time, tell the owner so the crew can be reassigned.',
            role: 'OFFICE',
            due: 'On the due date, if unpaid',
          }],
          automation: ['Same timing as residential, from job_date and foam_order_type. The 14 day send point is to confirm with Glenn.', 'No deposit on the job: the card goes from Job Booked to Job Completed.'],
        },
        {
          key: 'job-completed', n: 12, name: 'Job Completed', phase: 'job', headline: 'Works complete, claim, then close-out',
          clientDo: [
            'Crew: photos and signed variations on the card, then mark the works complete. The final claim goes by itself.',
            'When the final claim is paid, mark it paid and send the close-out pack from the template the same day.',
            'A retention is held: put the amount and the release date on the card before marking it paid.',
            'Repeat commercial clients, such as Bondor and Australian Housing: Ask for Google review is set to No.',
          ],
          means: 'The works are complete. The final claim is out.',
          exits: 'The final claim is paid', stalls: '30 days',
          intro: 'The crew marks the works complete once the photos and signed variations are on the card, and that sends the final claim with its payment schedule, the accepted quote and the purchase order attached. A short note from us confirms the works are done and offers a walk-through for their handover. The close-out pack, with photos by area, product data and the certificate of completion, goes only when the final claim is paid. The day after payment, a thank-you asks for a reference: a phone call to a future client of similar scale. A Google review request goes four weeks after the works only if Ask for Google review is Yes, and repeat commercial clients are set to No.',
          groups: [
            { title: 'When the works are complete', messages: ['C-DONE-01', 'PAY-01'] },
            { title: 'Once the final claim is paid', messages: ['RPT-01', 'C-CLOSE-01'] },
            { title: 'Four weeks after the works, only if Ask for Google review is Yes', messages: ['REV-01'] },
          ],
          alerts: [10],
          tasks: [
            {
              title: 'PHOTOS {{opportunity.site_address}}: this stage',
              desc:
                'Photograph each completed stage before moving on. The photos are the evidence behind each claim and they go into the close-out pack, so they are needed at the end of every stage, not at the end of the job.',
              role: 'CREW_LEAD',
              due: 'End of each stage',
            },
            {
              title: 'VARIATIONS {{opportunity.site_address}}: record and get signed',
              desc:
                'Record every variation agreed on site and send it from the variation document for signature the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.',
              role: 'CREW_LEAD',
              due: 'As they happen',
            },
            {
              title: 'CHASE {{contact.first_name}}: claim overdue',
              desc:
                'Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.',
              role: 'OFFICE',
              due: 'Day 30',
            },
            {
              title: 'SEND {{contact.first_name}}: job report and certificates',
              desc:
                'The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid.',
              role: 'OFFICE',
              due: 'Same day as payment',
            },
            {
              title: 'REFERENCE {{contact.first_name}}: ask, and record the answer',
              desc:
                'Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager\u2019s word is worth more on a tender than any number of homeowner reviews.',
              role: 'OWNER',
              due: 'Day 7',
            },
          ],
          automation: ['photos_captured is required before the works can be marked complete.', 'The final claim is created from the accepted quote with its payment schedule; the accepted quote and the purchase order are attached.', 'Paid: the close-out pack task, C-CLOSE-01 the next day, and the card closes unless a retention is held.', 'Payment terms on commercial claims are still to confirm with Glenn.'],
        },
        {
          key: 'retention-claim', n: 13, name: 'Retention Claim', phase: 'job', headline: 'The money held back',
          clientDo: [
            'Put the retention amount and the release date on the card.',
            'On the release date, send the claim from the template. There is a task.',
            'When the retention is paid, mark it paid. The card closes.',
          ],
          means: 'A retention is being held, usually for six to twelve months after completion.',
          exits: 'The retention is paid', stalls: 'The release date',
          intro: 'Larger commercial jobs often have part of the payment held back for six to twelve months after completion. Without a stage it is easy to forget, because nothing happens for a long time. This stage is run by hand: the amount and the release date go on the card, a task lands on the release date to send the claim from a saved template, and the card closes when the money arrives.',
          groups: [{ title: 'On the release date', messages: ['RET-01'], caption: 'Sent by hand from a saved template, with the claim attached.' }],
          alerts: [],
          tasks: [{
            title: 'CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}',
            desc:
              'The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card.',
            role: 'OFFICE',
            due: 'On the release date',
          }],
          automation: ['retention_amount and retention_release_date set by hand.', 'A task on the release date, and another a month later if it is still unpaid.', 'Marked paid by hand: the card closes as Won and is-active-job comes off.'],
        },
      ],
    },
  ],

  /* ------------------------------------------------- the whole pipeline */
  /* Both boards share stage names and order, so one view can show every open
     job across the business. It is a saved view, not a workflow. */
  overview: {
    title: 'The whole pipeline in one view',
    lede: 'Both boards use the same thirteen stages in the same order, so the whole business reads in one view: every open job, residential and commercial, stage by stage. The boards stay separate for the day-to-day work. The overview is for seeing all of it at once, and it is where the owner looks first on a Monday.',
    build: [
      'Keep the stage names and order identical on both boards. The overview depends on it, and the checker fails if the two boards drift apart.',
      'Opportunities, list view: filter on both pipelines and status Open, sort by stage, and save it as "Whole pipeline". Share it with the owner and the office. Confirm at build that the list view takes both pipelines in one filter.',
      'If the list view cannot take both pipelines, build the same thing as a contact smart list filtered on the stage tags: stage-res-<key> or stage-com-<key> for the same key, one saved filter per stage.',
      'Dashboard, "Whole pipeline": a stage funnel widget for each board side by side, both filtered to status Open, plus open value and won value, each filtered on status. Never an unfiltered value.',
      'Weekly figures such as quotes sent and quotes accepted are reported once across both boards, because the stage keys match.',
    ],
  },

  /* ------------------------------------------------------------ always on */
  alwaysOn: {
    key: 'always-on', name: 'Always on', headline: 'Whatever stage the card is in',
    clientDo: [
      'Missed a call? The caller gets a text within a minute. Ring them back within 30 minutes. There is a task.',
      'A customer replies? Everything automatic pauses for them. Answer from the app, not your own phone, so the conversation stays on the card.',
      'Someone texts STOP? They come off marketing automatically. Nothing for you to do.',
    ],
    intro: 'Two messages and four alerts run regardless of where anyone is on either board. The missed-call text-back is the single highest-value automation in the whole build: for a trade business where the phone rings while someone is up a ladder, it is the difference between a lead and a competitor\'s lead. The out-of-hours reply sets an expectation instead of leaving a text unanswered until morning.',
    groups: [{ title: 'The phone', messages: ['SYS-01'] }, { title: 'Out of hours', messages: ['SYS-02'] }],
    alerts: [2, 3, 10, 11],
    tasks: [
      {
        title: 'RING BACK {{contact.first_name}}: missed call',
        desc:
          'A call came in and nobody answered. The caller already has a text saying someone will ring back, so this is a promise the team has made.',
        role: 'OFFICE',
        due: '30 minutes',
      },
      {
        title: 'REPLY {{contact.first_name}}: they messaged',
        desc:
          'A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds.',
        role: 'Assigned user',
        due: '1 hour',
      },
    ],
    automation: ['Any inbound reply, on any channel, pauses every sales sequence on that contact until someone has looked at it. Reminders about an agreed date keep running.', 'STOP on any SMS sets do-not-SMS on the contact. The platform handles it natively, but the wording still has to be in every marketing message.', 'A weekly reconciliation compares website submissions with opportunities created. A mismatch fires the automation failure alert.'],
  },

  /* ------------------------------------------------------------- policies */
  quietHours: [
    { when: 'Monday to Friday, 7am to 6pm', alerts: 'All', tasks: 'Normal', customer: 'Normal' },
    { when: 'Saturday, 8am to 2pm', alerts: 'Critical only: 1, 2, 6, 10, 11, 12', tasks: 'Held', customer: 'Held' },
    { when: 'Outside those hours', alerts: 'None', tasks: 'Held', customer: 'Held to the next window' },
    { when: 'Sunday and public holidays', alerts: 'None', tasks: 'Held', customer: 'Held' },
  ],

  compliance: [
    { title: 'Transactional against marketing', body: 'Every message is tagged. TRANS is about an enquiry, appointment or job the person already has with us: no marketing consent needed and no unsubscribe required, though the sender is always identified. MKTG is promotional: it sends only when the person ticked the box on the form, and it always carries a working unsubscribe.' },
    { title: 'What the person actually agreed to', body: 'The form stores the exact consent wording, its version, the time and the page, and the CRM keeps that on the contact. Under the Spam Act 2003 the evidence is what someone was shown, not what the current form says, so it is never overwritten by a later submission.' },
    { title: 'Every SMS identifies the sender', body: 'Every text ends with the sign-off: Rachael, SprayIT Solutions. An unidentified SMS is the most common Spam Act failure and the easiest to avoid.' },
    { title: 'Send window', body: 'Outbound customer messages send between 8am and 8pm, Monday to Saturday, local time. Confirmations send immediately because the person is waiting for them. Chases and reminders wait for the window. The Do Not Call standard governs telemarketing calls rather than SMS to someone who enquired, so this is policy rather than law, and it exists because a 6am quote chase costs more goodwill than it earns.' },
    { title: 'Call recording', body: 'If assistant calls are recorded, callers are told at the start of the call. Victoria\'s rules on recording private conversations are strict, so this is a script requirement rather than a nice to have.' },
    { title: 'Prices come from a person, in writing', body: 'Nothing in the journey states a price, a lead time or a performance figure that has not been substantiated. The assistant is barred from quoting: a price comes from the team, in a written quote, after the job has been talked through, so it is never a guess that turns into a commitment.' },
  ],

  buildOrder: [
    { ids: 'SYS-01', why: 'Missed call text-back. Highest return of anything here.' },
    { ids: 'X-ACK-01, X-ACK-02, alert 7', why: 'The two minute acknowledgement and the 15 minute call timer.' },
    { ids: 'DIAL-01 to 04', why: 'The tried-to-call text and the three Dial 2 emails, with the honest close.' },
    { ids: 'R-QUOTE, R-FU-01 to 04, LOST-01', why: 'The quote with its accept button, the follow-up that converts quotes, and the goodbye.' },
    { ids: 'X-ACC-01, X-ACC-02, JOB-01, JOB-02, REM-01 to 05', why: 'Acceptance, the booking, and the two confirm reminders.' },
    { ids: 'DEP-01 to 03', why: 'Deposit timing by foam type, and the unpaid alert.' },
    { ids: 'JOB-04, JOB-05, PAY-01 to 03, RPT-01', why: 'The job day, the final invoice, and the job report once it is paid.' },
    { ids: 'X-APPT, X-INSP', why: 'The phone call booking and the site inspection, used by a minority of jobs.' },
    { ids: 'REV-01', why: 'The review ask, gated on Ask for Google review.' },
    { ids: 'NUR-01 to 04, REV-02, REV-03', why: 'Once there is a consented list worth mailing.' },
    { ids: 'RET-01 and the commercial set', why: 'Last. That board moves slowly enough that a person writing the email is still viable meanwhile.' },
  ],

  /* ---------------------------------------------------------- agency only */
  /* Everything below renders on agency.html and in the generated CRM
     documents. None of it appears on the client page. */

  reuseSteps: [
    'Create the custom values on the new sub-account and fill them in. That table is the whole template mechanism, including the person who signs the messages and their mobile.',
    'Create the custom fields below. The website webhook keys are fixed; map them on the way in.',
    'Build both boards with the same thirteen stages, keys and order. The whole-pipeline view depends on it.',
    'Import the messages. Anything tagged Core works unchanged for any trade or service business.',
    'Rewrite only the messages tagged Trade specific. They name the product or the physical work, so they cannot be tokenised without turning into mush.',
    'Replace the sample customers in the data file so previews read right for the new trade.',
    'Run npm run docs:crm. The checker fails on any missing sample value, any email without a preheader, any agency wording in text the client reads, and any drift between the two boards.',
  ],

  customFields: [
    {
      group: 'Contact fields, from the website webhook',
      note: 'These arrive already populated. Reference them as {{contact.<key>}}. Store the human label in each dropdown, not the form value: the webhook sends home, new-build and 1-3-months, and several emails echo these fields back to the customer. The building stage arrives as stage; map it to building_stage, because it is the building\'s stage, not the pipeline stage.',
      columns: ['Key', 'Label', 'Type', 'Options'],
      rows: [
        ['first_name, last_name', 'Name', 'Text', 'The form asks for both separately'],
        ['property_type', 'Property type', 'Dropdown', 'Home, New build, Shed or garage, Factory or warehouse, Farm or agricultural, Something else'],
        ['building_stage', 'Building stage', 'Dropdown', 'Existing building (retrofit), Under construction, Still planning'],
        ['areas', 'Areas to insulate', 'Text', 'Roof or ceiling, Walls, Underfloor, Whole property, Not sure yet'],
        ['timeframe', 'Timeframe', 'Dropdown', 'As soon as possible, Next 1 to 3 months, 3 months or more, Just researching'],
        ['heard_from', 'How did you hear about us', 'Dropdown', 'Google search, Google ad, Referral from a friend, builder or tradie, Facebook, Instagram or LinkedIn, Somewhere else'],
        ['postcode', 'Postcode', 'Text', ''],
        ['street, suburb', 'Street, suburb', 'Text', 'Optional on the form'],
        ['enquiry_message', 'Enquiry message', 'Multi-line', ''],
        ['phone_raw', 'Phone as typed', 'Text', 'Phone itself arrives in E.164, which is what the CRM matches a person on'],
        ['company', 'Company', 'Text', 'Commercial contacts. Asked on the first call.'],
      ],
    },
    {
      group: 'Contact fields, consent evidence',
      note: 'Never overwrite these on a later form fill. Under the Spam Act what matters is the wording someone actually saw, so a second submission appends a new record rather than replacing the original evidence.',
      columns: ['Key', 'Label', 'Type'],
      rows: [
        ['consent_marketing', 'Marketing consent', 'Dropdown: yes, no'],
        ['consent_text', 'Consent wording shown', 'Multi-line'],
        ['consent_at', 'Consent timestamp', 'Date'],
        ['consent_page', 'Consent page URL', 'Text'],
      ],
    },
    {
      group: 'Contact fields, attribution',
      note: 'Set the first-touch fields only if empty. Overwriting them on every visit destroys the thing they exist to measure.',
      columns: ['Key', 'Type'],
      rows: [
        ['utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id', 'Text'],
        ['gclid, gbraid, wbraid, fbclid, msclkid, ttclid', 'Text'],
        ['first_touch_at', 'Date'],
        ['first_touch_referrer, first_touch_landing', 'Text'],
        ['last_touch_referrer, last_touch_landing', 'Text'],
        ['source, form_name, submitted_at, page_title', 'Text'],
      ],
    },
    {
      group: 'Contact fields, CRM-managed',
      note: 'Not from the website. Set by workflows or by hand. ask_for_google_review replaces a review stage: it is Yes unless someone sets it to No.',
      columns: ['Key', 'Label', 'Type', 'Set by'],
      rows: [
        ['contact_attempts', 'Contact attempts', 'Number', 'Each call logged in New Lead, Dial 1 and Dial 2'],
        ['last_attempt_at', 'Last attempt', 'Date', 'Each call logged'],
        ['preferred_contact', 'Preferred contact', 'Dropdown: call, sms, email', 'Asked on the first call'],
        ['do_not_sms', 'Do not SMS', 'Checkbox', 'Manual, on request, and by STOP'],
        ['ask_for_google_review', 'Ask for Google review', 'Dropdown: Yes, No. Default Yes.', 'WF-01 sets Yes if empty. Set to No by hand for a job with problems, and for repeat commercial clients such as Bondor and Australian Housing.'],
      ],
    },
    {
      group: 'Opportunity fields',
      note: 'product_type and foam_order_type are the fields here that are genuinely trade-specific. For another client they become whatever their equivalent choices are.',
      columns: ['Key', 'Label', 'Type', 'Stage it is set'],
      rows: [
        ['site_address', 'Site address', 'Text', 'New Lead, on the first call'],
        ['access_notes', 'Access notes', 'Multi-line', 'Inspection Required, or the first call'],
        ['sqm_estimate', 'Area, sqm', 'Number', 'Inspection Required, or the first call'],
        ['product_type', 'Product', 'Dropdown: open cell, closed cell, both', 'Quote Sent'],
        ['inspection_date', 'Inspection date', 'Date', 'Inspection Required, from the inspection calendar'],
        ['callback_at', 'Callback time', 'Date and time', 'Follow-Up. Required on entry.'],
        ['quote_number', 'Quote number', 'Text', 'Quote Sent'],
        ['quote_link', 'Online quote', 'URL', 'Quote Sent, from the quote tool'],
        ['quote_sent_at', 'Quote sent', 'Date', 'Quote Sent'],
        ['accepted_quote_option', 'Accepted option', 'Text', 'Quote Accepted. Which quote the client accepted, when the job has more than one.'],
        ['po_number', 'Purchase order', 'Text', 'Quote Accepted, where the client issues one. On commercial, entering it sets Won.'],
        ['foam_order_type', 'Foam order', 'Dropdown: Stock open cell, Special order', 'Quote Accepted. Decides the deposit due date.'],
        ['deposit_amount', 'Deposit amount', 'Monetary', 'Quote Accepted, where a deposit applies'],
        ['job_date', 'Install date', 'Date', 'Job Booked, from the install calendar booking'],
        ['job_end_date', 'Finish date', 'Date', 'Job Booked, multi-day and commercial works'],
        ['crew_assigned', 'Crew', 'Text', 'Job Booked, from the install calendar'],
        ['job_confirmed', 'Date confirmed', 'Dropdown: Yes, No', 'Job Booked, by the Yes and No buttons on the reminders'],
        ['deposit_due_date', 'Deposit due', 'Date', 'Job Booked: 1 business day before job_date for stock open cell, 7 days before for special order'],
        ['deposit_invoice_sent_at', 'Deposit invoice sent', 'Date', 'Deposit Requested'],
        ['deposit_received_at', 'Deposit received', 'Date', 'Deposit Requested, when paid'],
        ['variation_amount', 'Variations', 'Monetary', 'Job Booked or Job Completed, as each variation is signed'],
        ['photos_captured', 'Photos captured', 'Checkbox', 'Job Completed. Required before the job can be marked complete.'],
        ['invoice_number, invoice_sent_at', 'Final invoice', 'Text, Date', 'Job Completed'],
        ['final_invoice_paid_at', 'Final invoice paid', 'Date', 'Job Completed, when fully paid'],
        ['job_report_sent_at', 'Job report sent', 'Date', 'Job Completed, when the report goes'],
        ['retention_amount', 'Retention held', 'Monetary', 'Job Completed, before it is marked paid'],
        ['retention_release_date', 'Retention release', 'Date', 'Job Completed, before it is marked paid'],
        ['lost_reason', 'Lost reason', 'Dropdown', 'On Lost'],
      ],
    },
  ],

  goLive: [
    'Every workflow has an error branch that alerts, so failures are not silent',
    'New Lead is assigned to the office on both boards, and no path leaves a lead unassigned',
    'The 15 minute timer emails the office, and the 1 hour step reaches the owner by text and email: a second person, not the same one',
    'Quiet hours applied to outbound customer messaging, not just internal alerts',
    'Every sequence has a stop condition on reply',
    'Entering Quote Accepted kills every sales sequence on the card, tested mid-follow-up',
    'An add-on quote accepted on a job under way updates the value and creates the office task, and does not resend the thank-you or move the card',
    'The accept and decline buttons tested on a quote with two options: the card moves, and the option chosen is recorded',
    'The Yes and No links on both reminders tested by email and by text. No fires alert 12 and sends REM-05, and nothing reschedules itself',
    'Deposit timing tested three ways: stock open cell, special order, and a job booked less than 14 days out',
    'Deposit and final invoices carry the accepted quote, and the purchase order where there is one. Payment schedules tested with a percentage stage and a fixed stage',
    'A GST invoice tested syncing to Xero before the Xero sync is promised. Only GST-free invoices have been seen reaching Xero so far',
    'Payment receipt sync agreed with the bookkeeper. If marking an invoice paid before the transfer clears breaks reconciliation, switch it off',
    'Contract and variation templates fill in the client details and go for digital signature, tested with an extra 100 sqm variation',
    'The job report task fires only when the final invoice is fully paid',
    'ask_for_google_review is Yes by default, and a contact set to No gets no review request',
    'The Whole pipeline view built and checked: every open card on both boards, in stage order',
    'Nothing live was lost when stages were deleted during the 2 October call: every workflow trigger, filter and move step points at a stage that exists, and no open card was left without a stage',
    'Old stages removed only after their cards were moved to the new ones',
    'Rachael\'s mobile confirmed as 0428 26 36 26 before any message goes',
    'Human labels stored in the dropdown fields, so echoed emails do not read "new-build"',
    'SPF and DKIM on the sending domain, and a test email checked in Gmail and Outlook',
    'Every merge field and trigger link confirmed against the platform version, with a test sent to yourself',
    'Apple and Outlook calendar sync done under the separate calendars task, and a test install booking seen on both',
    'Alert volume measured after week one. More than about fifteen a day to one person means something is wrong',
    'A test lead pushed end to end through both boards, watching what arrives and when',
  ],

  /* ------------------------------------------------------------ workflows */
  /* Every automation to build, in the platform's own building blocks.
     Step types: do, send, task, alert, wait, if, move, set, stop.
     `send` references a message id, `alert` an alert number, `task` a task
     from the stage it belongs to. The agency page and CRM-WORKFLOWS.md render
     this list. */
  /**
   * Tags, in three families plus a source.
   *
   * The families exist because lifetime is what makes a tag list usable. A
   * stage tag is true now and wrong tomorrow. A been- tag is true forever. An
   * is- tag is true until it is not. Mixing those three in one flat list is
   * how a CRM ends up with four hundred tags nobody trusts.
   *
   * The stage tags are not listed here. They are derived: stage-res- or
   * stage-com- plus the stage key, one per stage, so the 26 of them cannot
   * fall out of step with the 26 stages. Applied on entry, previous one
   * removed, by whichever workflow moves the card.
   */
  tags: {
    stageRule: 'stage- plus res or com plus the stage key. One at a time, swapped on every move. The keys match across both boards, which is what the whole-pipeline view filters on.',
    families: [
      { k: 'stage-', life: 'One at a time', why: 'Where they are right now. The card carries the stage too, but the card closes and the person does not.' },
      { k: 'been-', life: 'Never removed', why: 'What has happened to them. The tags that answer quoted but never accepted, or booked and never paid.' },
      { k: 'is-', life: 'Cleared when false', why: 'What is true right now. Every one of these has something that takes it off again.' },
      { k: 'from-', life: 'Set once', why: 'How they arrived. Set on the way in and left alone.' },
    ],
    list: [
      { t: 'been-enquired', why: 'They got in touch. Set on the very first contact, whichever way it came.' },
      { t: 'been-contacted', why: 'Somebody from the team actually spoke to them. Not the same as having tried.' },
      { t: 'been-inspected', why: 'Somebody stood in the building. Only about one job in ten or twenty.' },
      { t: 'been-quoted', why: 'A written price went out, on either board.' },
      { t: 'been-accepted', why: 'They said yes to a quote at least once.' },
      { t: 'been-booked', why: 'An install date went in the calendar.' },
      { t: 'been-lost', why: 'A quote died. Kept forever, because a lost lead two years ago is a warm one today.' },
      { t: 'been-customer', why: 'They paid the final invoice. The one tag worth having a segment for on its own.' },
      { t: 'been-review-asked', why: 'The Google review request went. Stops it going twice on a second job.' },
      { t: 'been-reviewed', why: 'They left a review.', by: 'Nothing here sets it. WF-33 only fires under four stars, so a good review is noticed by the review integration or by hand.' },
      { t: 'is-active-job', why: 'Accepted and not yet closed. While it is on, an accepted add-on or variation quote updates the job instead of re-firing the acceptance.' },
      { t: 'is-deposit-owing', why: 'The deposit invoice is out and unpaid. The filter for cards in Deposit Requested that still owe.' },
      { t: 'is-retention-held', why: 'Part of the payment is held back. The card stays open until it is paid.' },
      { t: 'is-stalled', why: 'The card has sat too long. Removed the moment anything moves.' },
      { t: 'is-unresponsive', why: 'Rung and emailed and heard nothing back. Removed on any reply.' },
      { t: 'is-nurturing', why: 'On the long drip. Removed when they come back, accept, or unsubscribe.' },
      { t: 'is-no-marketing', why: 'They said STOP or unsubscribed. Nothing marketing may send while this is on.' },
      { t: 'is-complaint', why: 'An open complaint. A person owns them until it comes off.' },
      { t: 'from-website', why: 'The quote form.' },
      { t: 'from-phone', why: 'They rang, including a missed call.' },
      { t: 'from-chat', why: 'The website assistant.', by: 'The chat sets it on the way in, before any workflow runs.' },
    ],
  },

  /**
   * Folders, numbered in journey order.
   *
   * Grouped by when a thing happens, because that is how somebody looks a
   * workflow up. Numbered because CRM folder lists sort alphabetically. Build
   * order is a separate list and stays one: a priority makes a poor filing
   * system.
   */
  folders: [
    { n: '01', name: 'Intake', why: 'The first few minutes, before anybody has read the lead, and the timer that makes sure somebody rings.', ids: ['WF-01', 'WF-02', 'WF-03', 'WF-04'] },
    { n: '02', name: 'Dial 1 and Dial 2', why: 'Two calls, the text ten seconds later, and the three emails when calls have not worked.', ids: ['WF-05', 'WF-06'] },
    { n: '03', name: 'Phone calls and site inspections', why: 'The two calendars a customer or the team books into before the quote.', ids: ['WF-07', 'WF-08', 'WF-09'] },
    { n: '04', name: 'Quote', why: 'From sending the quote to an answer: the follow-up, the accept and decline buttons, and the callback.', ids: ['WF-10', 'WF-11', 'WF-12', 'WF-13'] },
    { n: '05', name: 'Accepted, lost and nurture', why: 'The decision, whichever way it goes, and the long drip for not now.', ids: ['WF-14', 'WF-15', 'WF-16'] },
    { n: '06', name: 'Booking and reminders', why: 'From booking the install date to the morning of the job.', ids: ['WF-17', 'WF-18', 'WF-19', 'WF-20', 'WF-21'] },
    { n: '07', name: 'Deposit', why: 'Timed to the install date and the foam, never to the booking.', ids: ['WF-22', 'WF-23'] },
    { n: '08', name: 'Completion and payment', why: 'The final invoice, the job report once it is paid, and what follows the job.', ids: ['WF-24', 'WF-25', 'WF-26', 'WF-27', 'WF-28'] },
    { n: '09', name: 'Retention', why: 'The money held back for six to twelve months, run by hand with a reminder.', ids: ['WF-29'] },
    { n: '10', name: 'Always on', why: 'Watching every conversation, whatever stage the card is at.', ids: ['WF-30', 'WF-31', 'WF-32', 'WF-33'] },
    { n: '11', name: 'Reporting', why: 'Nothing a customer ever sees. Scheduled, not triggered.', ids: ['WF-34', 'WF-35'] },
  ],

  workflows: [
    {
      id: 'WF-01',
      tags: { add: ['from-website', 'been-enquired'], note: 'and the New Lead stage tag for whichever board it lands on' },
      folder: '01', name: 'Website lead intake', board: 'both',
      trigger: 'Inbound webhook from the website quote form',
      why: 'Everything downstream depends on this one being right: the contact, the consent record, the attribution, and which board the card lands on.',
      steps: [
        { t: 'do', text: 'Find or create the contact on phone (E.164), then email. Never create a duplicate for a repeat enquirer.' },
        { t: 'do', text: 'Map the fields. Store human labels in the dropdowns (Home, not home). Map the webhook field stage to building_stage.' },
        { t: 'do', text: 'Append the consent record: consent_marketing, consent_text, consent_at, consent_page. Never overwrite an earlier one.' },
        { t: 'do', text: 'Write attribution. First-touch fields only if empty. Last-touch fields always.' },
        { t: 'set', field: 'ask_for_google_review', value: 'Yes, only if it is empty' },
        { t: 'if', cond: 'property_type is Factory or warehouse, or Farm or agricultural, or the message mentions a tender, a builder, a head contractor, or an area over 500 sqm', then: [
          { t: 'do', text: 'Create the opportunity on Commercial & Industrial at New Lead, assigned to OFFICE.' },
          { t: 'alert', n: 6 },
          { t: 'alert', n: 1 },
          { t: 'send', id: 'X-ACK-01' },
          { t: 'send', id: 'C-ACK-01' },
        ], else: [
          { t: 'do', text: 'Create the opportunity on Residential at New Lead, assigned to OFFICE. property_type Something else adds a review task.' },
          { t: 'alert', n: 1 },
          { t: 'send', id: 'X-ACK-01' },
          { t: 'send', id: 'X-ACK-02' },
        ] },
        { t: 'task', title: 'CALL {{contact.first_name}}: new lead, {{contact.areas}}', desc: 'Ring the new lead within 15 minutes. The acknowledgement text and email have already gone. Ring twice, back to back. No answer to either: move the card to Dial 1. If they answer and it is a job, send the quote within two business days, or move the card to Inspection Required if it needs a site visit first.', role: 'OFFICE', due: '15 minutes' },
        { t: 'do', text: 'Start WF-02, the 15 minute timer.' },
      ],
      stops: 'Sends once per submission.',
      error: 'Any failed step: alert 11 to OWNER with the payload, and the submission logged for replay. The website already tells the visitor if the post fails, so this covers everything after the post succeeded.',
    },
    {
      id: 'WF-02',
      folder: '01', name: 'Lead not called: the 15 minute timer', board: 'both',
      trigger: 'Opportunity created in New Lead',
      why: 'Time to first contact is the one number that moves everything else. This is what makes an unrung lead impossible to ignore, without waking anyone at midnight.',
      steps: [
        { t: 'wait', for: '15 minutes, business hours only' },
        { t: 'if', cond: 'no call logged on the card', then: [{ t: 'alert', n: 7 }] },
        { t: 'wait', for: 'until 60 minutes, business hours only' },
        { t: 'if', cond: 'still no call logged', then: [{ t: 'do', text: 'Text and email to OWNER: this lead has been waiting since {{time}} with no call.' }] },
        { t: 'do', text: 'From the next morning, listed under Leads not called in the daily summary until a call is logged.' },
      ],
      stops: 'A call is logged, or the stage changes. The clock pauses outside business hours, so an 11pm enquiry starts at 7am.',
    },
    {
      id: 'WF-03',
      tags: { add: ['from-phone', 'been-enquired'] },
      folder: '01', name: 'Missed call text-back', board: 'both',
      trigger: 'Inbound call to the business number not answered',
      why: 'For a trade business where the phone rings while someone is up a ladder, the single highest-value automation on the list.',
      steps: [
        { t: 'if', cond: 'this number already got the text-back today', then: [{ t: 'stop', when: 'once per caller per day' }] },
        { t: 'do', text: 'Find or create the contact on the caller number.' },
        { t: 'send', id: 'SYS-01' },
        { t: 'alert', n: 2 },
        { t: 'task', title: 'RING BACK {{contact.first_name}}: missed call', desc: 'A call came in and nobody answered. The caller already has a text saying someone will ring back, so this is a promise the team has made.', role: 'OFFICE', due: '30 minutes' },
      ],
      stops: 'Once per caller per day.',
    },
    {
      id: 'WF-04',
      folder: '01', name: 'Out of hours reply', board: 'both',
      trigger: 'Inbound SMS outside office hours',
      why: 'Sets an expectation instead of leaving a text unanswered until morning.',
      steps: [
        { t: 'if', cond: 'this contact already got the reply today', then: [{ t: 'stop', when: 'once per contact per day' }] },
        { t: 'send', id: 'SYS-02' },
      ],
      stops: 'Once per contact per day, not once per message.',
    },
    {
      id: 'WF-05',
      folder: '02', name: 'Dial 1: the tried-to-call text', board: 'both',
      trigger: 'Stage changed to Dial 1',
      why: 'Most people will not answer an unknown number and will reply to a text. Ten seconds after the second call, the missed calls are still on their screen.',
      steps: [
        { t: 'wait', for: '10 seconds' },
        { t: 'send', id: 'DIAL-01' },
        { t: 'set', field: 'contact_attempts', value: 'plus 2 for the two calls, and last_attempt_at stamped' },
        { t: 'task', title: 'CALL {{contact.first_name}}: second round of calls', desc: 'Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails.', role: 'OFFICE', due: 'Later the same day' },
      ],
      stops: 'Sends once per lead. A reply or an answered call before the second round closes the task.',
    },
    {
      id: 'WF-06',
      tags: { add: ['is-unresponsive'], note: 'only if day 7 passes with no reply, as the card closes' },
      folder: '02', name: 'Dial 2: the email sequence', board: 'both',
      trigger: 'Stage changed to Dial 2',
      why: 'Calls have not worked, so three emails over a week, then an honest close. Capped, so a card never rots here.',
      steps: [
        { t: 'wait', for: '2 days' },
        { t: 'send', id: 'DIAL-02' },
        { t: 'wait', for: 'until day 4' },
        { t: 'send', id: 'DIAL-03' },
        { t: 'task', title: 'CALL {{contact.first_name}}: one more try', desc: 'One more call on the day the booking email goes. They have had a text and two emails, so keep it short: you are ringing about their enquiry and can talk whenever suits. Log it on the card either way.', role: 'OFFICE', due: 'Day 4' },
        { t: 'wait', for: 'until day 7' },
        { t: 'send', id: 'DIAL-04' },
        { t: 'wait', for: '1 day' },
        { t: 'if', cond: 'still in Dial 2 with no reply', then: [{ t: 'set', field: 'status', value: 'Lost, reason Unreachable' }] },
      ],
      stops: 'Customer replies on any channel, books a phone call, or the stage changes. Days count from entering Dial 2.',
    },
    {
      id: 'WF-07',
      folder: '03', name: 'Phone call booked', board: 'both',
      trigger: 'Appointment booked in the phone call calendar',
      why: 'Confirm, remind twice, and make sure whoever rings has read the enquiry. The day 4 email and the website both book into this calendar.',
      steps: [
        { t: 'do', text: 'Pause WF-06. A booking stops the Dial 2 emails.' },
        { t: 'send', id: 'X-APPT-01' },
        { t: 'send', id: 'X-APPT-02' },
        { t: 'alert', n: 4 },
        { t: 'wait', for: 'until 24 hours before the appointment' },
        { t: 'send', id: 'X-APPT-03' },
        { t: 'wait', for: 'until 2 hours before' },
        { t: 'send', id: 'X-APPT-04' },
      ],
      stops: 'Appointment moved or cancelled, which hands over to WF-08.',
    },
    {
      id: 'WF-08',
      folder: '03', name: 'Phone call or inspection moved or cancelled', board: 'both',
      trigger: 'Appointment in the phone call or inspection calendar rescheduled or cancelled',
      why: 'A hole in the diary is recoverable if it is caught early. Staff attend inspections, so there is no no-show branch.',
      steps: [
        { t: 'if', cond: 'rescheduled', then: [{ t: 'send', id: 'X-APPT-06' }, { t: 'do', text: 'WF-07 or WF-09 re-queues its reminders against the new time.' }] },
        { t: 'if', cond: 'phone call cancelled', then: [
          { t: 'alert', n: 5 },
          { t: 'task', title: 'CALL {{contact.first_name}}: phone call cancelled', desc: 'They cancelled the phone call they booked. Ring them: a cancelled call is usually a diary clash, and a short call often rebooks it. If the card is in Dial 2, the emails resume from where they paused.', role: 'OFFICE', due: 'Same day' },
        ] },
        { t: 'if', cond: 'inspection cancelled', then: [
          { t: 'set', field: 'inspection_date', value: 'cleared, so the board never shows a visit that is not happening' },
          { t: 'task', title: 'BOOK {{contact.first_name}}: site inspection', desc: 'Book the site inspection in the inspection calendar from the card, at a time that suits the customer. Confirm the address and access to the areas being sprayed. The confirmation and the morning text go by themselves.', role: 'OFFICE', due: '2 days' },
        ] },
      ],
      stops: 'Sends once per change. The card does not move.',
    },
    {
      id: 'WF-09',
      tags: { add: ['been-contacted', 'been-inspected'], note: 'been-inspected goes on the day after the visit, unless it was cancelled' },
      folder: '03', name: 'Site inspection booked', board: 'both',
      trigger: 'Appointment booked in the inspection calendar',
      why: 'One confirmation with the address, one text on the morning, and a task for whoever is going. Used by a minority of jobs, before the quote or after acceptance.',
      steps: [
        { t: 'set', field: 'inspection_date', value: 'from the appointment' },
        { t: 'do', text: 'If the card is not already in Inspection Required, move it there.' },
        { t: 'if', cond: 'residential', then: [{ t: 'send', id: 'X-INSP-01' }], else: [{ t: 'send', id: 'C-INSP-01' }] },
        { t: 'task', title: 'ATTEND {{contact.first_name}}: inspection, {{opportunity.site_address}}', desc: 'Attend the inspection. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.', role: 'ESTIMATOR', due: 'On the date' },
        { t: 'wait', for: 'until 7:00am on the day' },
        { t: 'send', id: 'X-INSP-02' },
        { t: 'wait', for: 'until the day after the visit' },
        { t: 'if', cond: 'the visit was not cancelled', then: [{ t: 'do', text: 'Add been-inspected.' }] },
      ],
      stops: 'Cancelled or moved, which hands over to WF-08.',
    },
    {
      id: 'WF-10',
      tags: { add: ['been-contacted', 'been-quoted'], remove: ['is-nurturing'] },
      folder: '04', name: 'Quote sent and the follow-up', board: 'residential',
      trigger: 'The quote is sent from the quote tool, or the card is moved to Quote Sent by hand',
      why: 'The follow-up that converts quotes: day 2, 5, 10, 21, then a decision. Never left sitting.',
      steps: [
        { t: 'move', stage: 'Quote Sent, if not already there' },
        { t: 'do', text: 'Stop WF-06 and WF-16 if either is running.' },
        { t: 'set', field: 'quote_sent_at', value: 'now. quote_number, quote_link and the value come from the quote.' },
        { t: 'send', id: 'R-QUOTE-01', note: 'as the quote tool email, with the view and accept button' },
        { t: 'send', id: 'R-QUOTE-02' },
        { t: 'task', title: 'CALL {{contact.first_name}}: quote follow up', desc: 'Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.', role: 'OFFICE', due: 'Day 2' },
        { t: 'wait', for: 'until day 2' },
        { t: 'send', id: 'R-FU-01' },
        { t: 'wait', for: 'until day 5' },
        { t: 'send', id: 'R-FU-02' },
        { t: 'wait', for: 'until day 10' },
        { t: 'send', id: 'R-FU-03' },
        { t: 'wait', for: 'until day 21' },
        { t: 'send', id: 'R-FU-04' },
        { t: 'task', title: 'DECIDE {{contact.first_name}}: accepted, nurture or lost', desc: 'Twenty-one days with no decision. Move the card: Quote Accepted if they said yes, Nurture if it is a real job at the wrong time, Follow-Up if they asked for a call later, or Lost with a reason if they went elsewhere. Never leave it sitting.', role: 'OFFICE', due: 'Day 21' },
      ],
      stops: 'Customer replies, accepts or declines, or the card leaves Quote Sent.',
    },
    {
      id: 'WF-11',
      tags: { add: ['been-contacted', 'been-quoted'], remove: ['is-nurturing'] },
      folder: '04', name: 'Proposal sent and the follow-up', board: 'commercial',
      trigger: 'The proposal is sent from the quote tool, or the card is moved to Quote Sent by hand on the Commercial board',
      why: 'The commercial follow-up: slower, plainer, and it asks for a decision date.',
      steps: [
        { t: 'move', stage: 'Quote Sent, if not already there' },
        { t: 'set', field: 'quote_sent_at', value: 'now. quote_number, quote_link and the value come from the proposal.' },
        { t: 'send', id: 'C-PROP-01' },
        { t: 'task', title: 'CALL {{contact.first_name}}: confirm receipt', desc: 'Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.', role: 'ESTIMATOR', due: '2 days' },
        { t: 'wait', for: 'until day 7' },
        { t: 'send', id: 'C-PROP-02' },
        { t: 'task', title: 'CHASE {{contact.first_name}}: decision date', desc: 'Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.', role: 'OWNER', due: 'Day 7, then day 21' },
        { t: 'wait', for: 'until day 21' },
        { t: 'send', id: 'C-PROP-03' },
      ],
      stops: 'Customer replies, accepts, or the card moves to Follow-Up, Nurture or Lost.',
    },
    {
      id: 'WF-12',
      folder: '04', name: 'Accept or decline button on a quote', board: 'both',
      trigger: 'A quote is accepted or declined online',
      why: 'One click from the customer moves the card, records which option they chose, and keeps an add-on quote on a live job from starting the welcome all over again.',
      steps: [
        { t: 'if', cond: 'accepted', then: [
          { t: 'if', cond: 'the contact has is-active-job: an add-on or variation quote on a job already under way', then: [
            { t: 'set', field: 'opportunity value', value: 'plus the accepted add-on' },
            { t: 'task', title: 'ADD-ON {{contact.first_name}}: accepted, update the job', desc: 'An add-on or variation quote on a job already under way has been accepted. Check the value on the card, add it to the invoice schedule, and tell the crew if it changes the work on the day. No thank-you has gone and the card has not moved.', role: 'OFFICE', due: 'Same day' },
            { t: 'stop', when: 'here. No thank-you, no alert, no stage move.' },
          ], else: [
            { t: 'set', field: 'accepted_quote_option', value: 'the option accepted' },
            { t: 'do', text: 'Mark the other options on the job as not chosen, so only one can be accepted.' },
            { t: 'move', stage: 'Quote Accepted' },
          ] },
        ] },
        { t: 'if', cond: 'declined', then: [
          { t: 'set', field: 'status', value: 'Lost, with the reason asked for' },
          { t: 'do', text: 'LOST-01 follows from WF-15.' },
        ] },
      ],
      stops: 'Once per button press. Phone acceptances and purchase orders are moved by hand and go straight to WF-14.',
    },
    {
      id: 'WF-13',
      tags: { add: ['been-contacted'] },
      folder: '04', name: 'Follow-Up: callback requested', board: 'both',
      trigger: 'Stage changed to Follow-Up',
      why: 'A call at the time they chose beats another email. Everything automatic waits.',
      steps: [
        { t: 'do', text: 'Require callback_at on the stage change.' },
        { t: 'do', text: 'Pause WF-06, WF-10 and WF-11 on the card.' },
        { t: 'task', title: 'CALL {{contact.first_name}}: callback as asked', desc: 'The customer asked to be rung at this time. Ring them, then move the card on: Quote Sent once a quote goes, Inspection Required if a visit is needed, Quote Accepted if they say yes, Nurture if it is not now, or Lost with a reason.', role: 'OFFICE', due: 'At the time they asked' },
        { t: 'wait', for: 'until 1 day after callback_at' },
        { t: 'if', cond: 'still in Follow-Up', then: [{ t: 'do', text: 'Listed under Callbacks overdue in the daily summary.' }] },
      ],
      stops: 'The stage changes.',
    },
    {
      id: 'WF-14',
      tags: { add: ['been-accepted', 'is-active-job'], remove: ['is-nurturing', 'is-stalled', 'is-unresponsive'] },
      folder: '05', name: 'Quote accepted', board: 'both',
      trigger: 'Stage changed to Quote Accepted, by WF-12 or by hand; and po_number entered on a commercial card waiting in Quote Accepted',
      why: 'Kills every sales sequence, marks the job Won, thanks the customer, and tells the owner and the office.',
      steps: [
        { t: 'if', cond: 'the card has come back to Quote Accepted from a later stage', then: [{ t: 'stop', when: 'here. A job is welcomed once.' }] },
        { t: 'do', text: 'Stop every sales sequence on the card: WF-06, WF-07 reminders, WF-10, WF-11, WF-13, WF-16. This is the rule that matters most on a board that runs sale and delivery together.' },
        { t: 'if', cond: 'residential', then: [
          { t: 'set', field: 'status', value: 'Won' },
          { t: 'send', id: 'X-ACC-01' },
          { t: 'send', id: 'X-ACC-02' },
        ], else: [
          { t: 'send', id: 'C-PO-01' },
          { t: 'if', cond: 'accepted online, signed, or po_number is set', then: [{ t: 'set', field: 'status', value: 'Won' }], else: [
            { t: 'task', title: 'CHASE {{contact.first_name}}: purchase order', desc: 'A verbal yes with no purchase order yet. Chase it weekly. The job stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.', role: 'OFFICE', due: 'Weekly, until it lands' },
          ] },
        ] },
        { t: 'alert', n: 8 },
        { t: 'set', field: 'deposit_amount and foam_order_type', value: 'from the accepted quote, where a deposit applies. Nothing is invoiced yet.' },
        { t: 'task', title: 'NEXT {{contact.first_name}}: inspection or booking', desc: 'The customer has accepted. Check the option they chose is on the card, then decide the next step: move the card to Inspection Required if something needs checking on site first, otherwise to Booking Required so the install date can be booked.', role: 'OFFICE', due: 'Same day' },
      ],
      stops: 'Sends once per job. Add-on quotes never reach it; WF-12 stops them first.',
    },
    {
      id: 'WF-15',
      tags: { add: ['been-lost'], remove: ['is-active-job', 'is-deposit-owing'] },
      folder: '05', name: 'Lost', board: 'both',
      trigger: 'Status changed to Lost',
      why: 'A Lost with no reason teaches nothing. A graceful goodbye brings a surprising number of jobs back.',
      steps: [
        { t: 'do', text: 'Require lost_reason. The status change form does not close without one.' },
        { t: 'do', text: 'Stop every sequence on the card: WF-06, WF-07, WF-10, WF-11, WF-16, WF-19, WF-22.' },
        { t: 'task', title: 'LOG {{contact.first_name}}: lost reason', desc: 'Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.', role: 'OFFICE', due: 'Same day' },
        { t: 'if', cond: 'residential, and the reason is not Unreachable, Duplicate or Spam', then: [{ t: 'wait', for: 'until the next business morning' }, { t: 'send', id: 'LOST-01' }] },
      ],
      stops: 'Sends once. A not now is Nurture, not Lost.',
    },
    {
      id: 'WF-16',
      tags: { add: ['been-contacted', 'is-nurturing'] },
      folder: '05', name: 'Nurture drip and the year check-in', board: 'both',
      trigger: 'Stage changed to Nurture',
      why: 'Right job, wrong time. Quotes come back after one or two years, so everyone gets a call at twelve months, and the opted-in also get the emails.',
      steps: [
        { t: 'do', text: 'Stop WF-06, WF-10 and WF-11 on the card.' },
        { t: 'if', cond: 'residential', then: [
          { t: 'task', title: 'CHECK-IN {{contact.first_name}}: a year since the quote', desc: 'A year since this job went to Nurture. Ring and ask whether it is back on. Quotes often come back after one or two years. If it is, refresh the quote against current prices and send it, which moves the card to Quote Sent.', role: 'OFFICE', due: '12 months' },
        ], else: [
          { t: 'task', title: 'CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}', desc: 'Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.', role: 'OWNER', due: 'Quarterly, recurring' },
        ] },
        { t: 'if', cond: 'consent_marketing is not yes', then: [{ t: 'stop', when: 'here for email. No marketing without the tick; the call task above still stands.' }] },
        { t: 'if', cond: 'residential', then: [
          { t: 'wait', for: 'until the next business morning' },
          { t: 'send', id: 'NUR-01' },
          { t: 'wait', for: '30 days' },
          { t: 'send', id: 'NUR-02' },
          { t: 'wait', for: '60 days' },
          { t: 'send', id: 'NUR-03' },
          { t: 'task', title: 'REVIEW {{contact.first_name}}: still a fit?', desc: 'Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Quote Sent or New Lead. A clean list keeps the emails landing in inboxes rather than in spam.', role: 'OWNER', due: 'Quarterly, recurring' },
          { t: 'wait', for: 'until 12 months after entering Nurture' },
          { t: 'send', id: 'NUR-04' },
        ], else: [
          { t: 'wait', for: '90 days, repeating' },
          { t: 'send', id: 'C-FUT-01' },
        ] },
      ],
      stops: 'Any reply, booking or new form fill, or the card moving to Quote Sent or New Lead. Unsubscribe sets do-not-market and the card stays put.',
    },
    {
      id: 'WF-17',
      folder: '06', name: 'Booking Required', board: 'both',
      trigger: 'Stage changed to Booking Required',
      why: 'The owner books the install date in the platform first, because that booking is what fires everything after it.',
      steps: [
        { t: 'if', cond: 'residential', then: [
          { t: 'task', title: 'BOOK {{contact.first_name}}: install date', desc: 'Book the install date in the install calendar from the card, and put the crew on it. Book it here first, not in a phone calendar, because the booking is what sends the confirmation and sets up the reminders and the deposit timing.', role: 'OWNER', due: '2 business days' },
        ], else: [
          { t: 'task', title: 'BOOK {{contact.first_name}}: works dates', desc: 'Agree the start and finish dates with the client, then book them in the install calendar from the card with the crew. Book it there first, because the booking sends the mobilisation email and sets up the reminders.', role: 'OWNER', due: '2 business days' },
        ] },
        { t: 'wait', for: '2 business days' },
        { t: 'if', cond: 'still in Booking Required', then: [{ t: 'do', text: 'Listed under Installs to book in the daily summary until it moves.' }] },
      ],
      stops: 'The install is booked, which moves the card to Job Booked.',
    },
    {
      id: 'WF-18',
      tags: { add: ['been-booked'] },
      folder: '06', name: 'Install booked', board: 'both',
      trigger: 'Appointment booked in the install calendar',
      why: 'Booking in the platform, not a phone calendar, is what moves the card and starts the confirmation, the reminders and the deposit timing.',
      steps: [
        { t: 'set', field: 'job_date', value: 'from the appointment, with job_end_date on multi-day works and crew_assigned from the calendar' },
        { t: 'move', stage: 'Job Booked' },
        { t: 'if', cond: 'residential', then: [
          { t: 'send', id: 'JOB-01' },
          { t: 'send', id: 'JOB-02' },
        ], else: [
          { t: 'send', id: 'C-MOB-01' },
          { t: 'task', title: 'INDUCT crew: {{opportunity.site_address}}', desc: 'Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.', role: 'CREW_LEAD', due: 'Before start' },
          { t: 'task', title: 'SWMS {{opportunity.site_address}}: issue and confirm receipt', desc: 'Issue the SWMS and get written confirmation it has been received and accepted. The crew does not start without it, and on most sites the principal contractor will not let them on without it either.', role: 'OWNER', due: 'Before start' },
        ] },
        { t: 'do', text: 'Start WF-19 (the reminders) and WF-22 (the deposit timing).' },
      ],
      stops: 'Sends once per booking. A moved booking resends JOB-01 with the new date and re-queues WF-19 and WF-22; it does not resend the preparation email.',
    },
    {
      id: 'WF-19',
      folder: '06', name: 'Job reminders, 7 days and 48 hours', board: 'both',
      trigger: 'job_date set or changed, from WF-18',
      why: 'Two chances for the customer to say the date no longer works, early enough to move a crew and a rig. Replaces the old afternoon-before text.',
      steps: [
        { t: 'if', cond: 'job_date is more than 7 days away', then: [
          { t: 'wait', for: 'until 7 days before job_date' },
          { t: 'send', id: 'REM-01' },
          { t: 'send', id: 'REM-02' },
        ] },
        { t: 'if', cond: 'job_date is more than 48 hours away', then: [
          { t: 'wait', for: 'until 48 hours before job_date' },
          { t: 'send', id: 'REM-03' },
          { t: 'send', id: 'REM-04' },
        ] },
        { t: 'wait', for: 'until 9:00am the day before job_date' },
        { t: 'if', cond: 'job_confirmed is empty: neither reminder answered', then: [
          { t: 'task', title: 'CALL {{contact.first_name}}: date not confirmed', desc: 'Neither reminder got a Yes or a No. Ring to confirm the job is still on, that access is clear, and that someone over eighteen will be there to let the crew in.', role: 'OFFICE', due: 'Day before the job, if neither reminder was answered' },
        ] },
      ],
      stops: 'The booking is cancelled, or the date moves, which restarts it against the new date.',
    },
    {
      id: 'WF-20',
      folder: '06', name: 'Yes or No on a reminder', board: 'both',
      trigger: 'The Yes or No trigger link in REM-01 to REM-04 is clicked',
      why: 'A No is told to a person straight away. The crew and the rig are only ever moved by a person.',
      steps: [
        { t: 'if', cond: 'Yes', then: [
          { t: 'set', field: 'job_confirmed', value: 'Yes. The link opens a short thank-you page. Nothing else.' },
        ] },
        { t: 'if', cond: 'No', then: [
          { t: 'set', field: 'job_confirmed', value: 'No' },
          { t: 'send', id: 'REM-05' },
          { t: 'alert', n: 12 },
          { t: 'task', title: 'RESCHEDULE {{contact.first_name}}: cannot make {{opportunity.job_date}}', desc: 'The customer tapped No on a reminder. Ring them today, agree a new date, then move the booking in the install calendar and move the crew and the rig to match. Nothing is rescheduled automatically. The reminders re-queue against the new date.', role: 'OWNER', due: 'Same day' },
          { t: 'do', text: 'Nothing is moved automatically. Moving the booking by hand re-queues WF-19 and WF-22.' },
        ] },
      ],
      stops: 'Once per click. A second No on the same booking does not alert twice.',
    },
    {
      id: 'WF-21',
      folder: '06', name: 'Job day', board: 'both',
      trigger: 'job_date arrives, scheduled from the install booking',
      why: 'The on-the-way text, and the things that must be on the card before the job can be marked complete: photos and variations.',
      steps: [
        { t: 'if', cond: 'residential', then: [
          { t: 'wait', for: 'until 6:30am on job_date' },
          { t: 'send', id: 'JOB-04' },
          { t: 'task', title: 'PHOTOS {{opportunity.site_address}}', desc: 'Photograph the finished work from the app before leaving site, and tick Photos captured. The job cannot be marked complete without them. They go into the job report, and they are the only real proof-of-work images the business has.', role: 'CREW_LEAD', due: 'Before marking it complete' },
          { t: 'task', title: 'VARIATIONS {{contact.first_name}}: record any extras', desc: 'Anything agreed on site that was not in the quote, such as an extra 100 sqm, goes out from the variation document for the customer to sign, and onto the card the same day. Left to invoicing, it surprises the customer.', role: 'CREW_LEAD', due: 'Before marking it complete' },
        ], else: [
          { t: 'wait', for: 'until 6:30am each site day between job_date and job_end_date' },
          { t: 'send', id: 'C-SITE-01' },
          { t: 'task', title: 'UPDATE {{contact.first_name}}: weekly progress', desc: 'Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week\u2019s photos.', role: 'OWNER', due: 'Every Friday while live' },
          { t: 'task', title: 'PHOTOS {{opportunity.site_address}}: this stage', desc: 'Photograph each completed stage before moving on. The photos are the evidence behind each claim and they go into the close-out pack, so they are needed at the end of every stage, not at the end of the job.', role: 'CREW_LEAD', due: 'End of each stage' },
          { t: 'task', title: 'VARIATIONS {{opportunity.site_address}}: record and get signed', desc: 'Record every variation agreed on site and send it from the variation document for signature the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.', role: 'CREW_LEAD', due: 'As they happen' },
        ] },
        { t: 'do', text: 'Guard: the job cannot be marked complete until photos_captured is ticked. Enforce it on the stage change, not with a reminder.' },
        { t: 'do', text: 'JOB-06 is a saved snippet in the mobile app, sent by hand. Not a workflow.' },
      ],
      stops: 'The job is marked complete, or the booking moves.',
    },
    {
      id: 'WF-22',
      tags: { add: ['is-deposit-owing'], note: 'when the deposit invoice goes' },
      folder: '07', name: 'Deposit timing by foam type', board: 'both',
      trigger: 'job_date set or changed, and deposit_amount is set',
      why: 'Never at booking. Sent two weeks before the job, due one business day before for stock open cell and seven days before for special order, so the crew can be reassigned in time if it does not land.',
      steps: [
        { t: 'if', cond: 'deposit_amount is empty: no deposit on this job', then: [{ t: 'stop', when: 'here. Jobs with no deposit skip Deposit Requested.' }] },
        { t: 'if', cond: 'foam_order_type is Special order', then: [{ t: 'set', field: 'deposit_due_date', value: '7 days before job_date' }], else: [{ t: 'set', field: 'deposit_due_date', value: '1 business day before job_date' }] },
        { t: 'if', cond: 'job_date is more than 14 days away', then: [{ t: 'wait', for: 'until 14 days before job_date' }] },
        { t: 'do', text: 'Create the deposit invoice from the accepted quote: the deposit amount, due on deposit_due_date, with the accepted quote and any purchase order attached. No card storage and no automatic charge.' },
        { t: 'send', id: 'DEP-02' },
        { t: 'set', field: 'deposit_invoice_sent_at', value: 'now' },
        { t: 'move', stage: 'Deposit Requested' },
        { t: 'wait', for: 'until 2 days before deposit_due_date' },
        { t: 'if', cond: 'deposit unpaid', then: [{ t: 'send', id: 'DEP-03' }] },
        { t: 'wait', for: 'until 4:00pm on deposit_due_date' },
        { t: 'if', cond: 'deposit unpaid', then: [
          { t: 'alert', n: 13 },
          { t: 'task', title: 'CHASE {{contact.first_name}}: deposit unpaid', desc: 'The deposit was due today and has not landed. Ring the customer today: most late deposits are a missed email, not a change of mind. If it will not be paid in time, tell the owner so the crew can be reassigned.', role: 'OFFICE', due: 'On the due date, if unpaid' },
        ] },
      ],
      stops: 'The deposit is paid (WF-23), the job is cancelled, or job_date moves, which re-runs it from the top against the new date. The 14 day send point is to confirm with Glenn.',
    },
    {
      id: 'WF-23',
      tags: { remove: ['is-deposit-owing'] },
      folder: '07', name: 'Deposit received', board: 'both',
      trigger: 'Deposit invoice marked paid',
      why: 'Silence after a payment is the thing customers hate most.',
      steps: [
        { t: 'set', field: 'deposit_received_at', value: 'now' },
        { t: 'send', id: 'DEP-01' },
        { t: 'alert', n: 9 },
        { t: 'do', text: 'Cancel the pending DEP-03 and the unpaid check in WF-22. The card stays in Deposit Requested until the job is marked complete.' },
      ],
      stops: 'Sends once.',
    },
    {
      id: 'WF-24',
      folder: '08', name: 'Job completed: the final invoice and the chase', board: 'both',
      trigger: 'The crew marks the job complete (stage changed to Job Completed)',
      why: 'Marking the job complete is what bills it. The invoice carries its own payment schedule and the papers that back it.',
      steps: [
        { t: 'do', text: 'Guard: photos_captured must be ticked.' },
        { t: 'do', text: 'Create the final invoice from the accepted quote: the balance after any deposit, with its payment schedule (one amount, or stages by percentage or fixed amount, each with a due date). Attach the accepted quote, and the purchase order where there is one.' },
        { t: 'set', field: 'invoice_number, invoice_sent_at', value: 'from the invoice' },
        { t: 'if', cond: 'residential', then: [
          { t: 'send', id: 'JOB-05' },
          { t: 'send', id: 'PAY-01', note: 'invoice attached' },
          { t: 'wait', for: 'until day 7' },
          { t: 'send', id: 'PAY-02' },
          { t: 'wait', for: 'until day 14' },
          { t: 'send', id: 'PAY-03' },
          { t: 'task', title: 'CHASE {{contact.first_name}}: payment overdue', desc: 'Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.', role: 'OFFICE', due: 'Day 14' },
        ], else: [
          { t: 'send', id: 'C-DONE-01' },
          { t: 'send', id: 'PAY-01', note: 'final claim attached' },
          { t: 'wait', for: 'until day 30' },
          { t: 'if', cond: 'unpaid', then: [{ t: 'task', title: 'CHASE {{contact.first_name}}: claim overdue', desc: 'Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.', role: 'OFFICE', due: 'Day 30' }] },
        ] },
      ],
      stops: 'The final invoice is marked paid. A reminder sent after someone has paid does more damage than the reminder was worth.',
    },
    {
      id: 'WF-25',
      tags: { add: ['been-customer', 'is-retention-held'], remove: ['is-active-job'], note: 'is-retention-held only when a retention is held; is-active-job comes off only when no retention is held, otherwise WF-29 takes it off' },
      folder: '08', name: 'Final invoice paid: report and close', board: 'both',
      trigger: 'Final invoice marked fully paid',
      why: 'The job report and certificates go only once the invoice is paid. Then the card closes, unless a retention is held.',
      steps: [
        { t: 'set', field: 'final_invoice_paid_at', value: 'now' },
        { t: 'task', title: 'SEND {{contact.first_name}}: job report and certificates', desc: 'The final invoice is paid. Send the job report from the saved template today, with the photos and the certificate of completion attached, then stamp Job report sent on the card. It never goes before the invoice is fully paid.', role: 'OFFICE', due: 'Same day as payment' },
        { t: 'if', cond: 'commercial', then: [
          { t: 'wait', for: '1 day' },
          { t: 'send', id: 'C-CLOSE-01' },
          { t: 'task', title: 'REFERENCE {{contact.first_name}}: ask, and record the answer', desc: 'Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager\u2019s word is worth more on a tender than any number of homeowner reviews.', role: 'OWNER', due: 'Day 7' },
        ] },
        { t: 'if', cond: 'retention_amount is set', then: [
          { t: 'move', stage: 'Retention Claim' },
          { t: 'do', text: 'Add is-retention-held. Status stays Won; the card stays open until the retention is paid.' },
        ], else: [
          { t: 'do', text: 'Close the card as Won and take is-active-job off.' },
        ] },
      ],
      stops: 'Runs once per job.',
    },
    {
      id: 'WF-26',
      tags: { add: ['been-review-asked'] },
      folder: '08', name: 'Google review request', board: 'both',
      trigger: 'job_date passes on a job marked complete',
      why: 'Controlled by one field on the contact instead of a stage. Asked once, four weeks after the job, and only where the team is happy to ask.',
      steps: [
        { t: 'wait', for: '4 weeks after job_date. The range agreed was 4 to 6 weeks.' },
        { t: 'if', cond: 'ask_for_google_review is Yes, the contact has no is-complaint tag, and been-review-asked is not on the contact', then: [
          { t: 'send', id: 'REV-01' },
        ], else: [
          { t: 'stop', when: 'here. No request.' },
        ] },
      ],
      stops: 'Asked once per contact. Never chased.',
    },
    {
      id: 'WF-27',
      folder: '08', name: 'After the job: referral and the year check-in', board: 'residential',
      trigger: 'Final invoice marked fully paid',
      why: 'Most of the work comes from people passing the name on, and a year on is when the rest of the building comes up.',
      steps: [
        { t: 'wait', for: '7 days' },
        { t: 'if', cond: 'consent_marketing is yes', then: [{ t: 'send', id: 'REV-02' }] },
        { t: 'wait', for: 'until 12 months after job_date' },
        { t: 'if', cond: 'consent_marketing is yes', then: [{ t: 'send', id: 'REV-03' }] },
      ],
      stops: 'Runs to the end. The 12 month step is scheduled on entry so it survives everything else changing.',
    },
    {
      id: 'WF-28',
      folder: '08', name: 'Progress claims', board: 'commercial',
      trigger: 'A progress claim invoice is sent while the works run',
      why: 'Staged works bill per the programme. Each claim carries its photos and the papers that back it.',
      steps: [
        { t: 'send', id: 'C-PAY-01' },
        { t: 'wait', for: '30 days from the claim' },
        { t: 'if', cond: 'that claim is unpaid', then: [{ t: 'task', title: 'CHASE {{contact.first_name}}: claim overdue', desc: 'Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.', role: 'OFFICE', due: 'Day 30' }] },
      ],
      stops: 'The claim is paid. Payment terms still to confirm with Glenn.',
    },
    {
      id: 'WF-29',
      tags: { remove: ['is-retention-held', 'is-active-job'], note: 'both come off when the retention is marked paid' },
      folder: '09', name: 'Retention claim reminder', board: 'both',
      trigger: 'Stage changed to Retention Claim',
      why: 'A retention can sit for six to twelve months. A task on the release date is what stops it being forgotten.',
      steps: [
        { t: 'do', text: 'Require retention_amount and retention_release_date.' },
        { t: 'wait', for: 'until retention_release_date' },
        { t: 'task', title: 'CLAIM {{contact.first_name}}: retention of {{opportunity.retention_amount}}', desc: 'The retention release date has arrived. Send the retention claim from the saved template with the claim attached, and note it on the card. When it is paid, mark it paid by hand, which closes the card.', role: 'OFFICE', due: 'On the release date' },
        { t: 'wait', for: '30 days' },
        { t: 'if', cond: 'still in Retention Claim', then: [{ t: 'task', title: 'CHASE {{contact.first_name}}: retention unpaid', desc: 'A month since the retention claim went and it has not been paid. Ring the accounts contact and ask where it sits, and whether anything is needed from us before it is released.', role: 'OFFICE', due: '30 days after the release date' }] },
        { t: 'do', text: 'When the retention is marked paid by hand: the card closes as Won, and is-retention-held and is-active-job come off.' },
      ],
      stops: 'The retention is marked paid by hand.',
    },
    {
      id: 'WF-30',
      tags: { remove: ['is-unresponsive', 'is-stalled'] },
      folder: '10', name: 'Customer replied', board: 'both',
      trigger: 'Inbound SMS or email from a contact with an open opportunity',
      why: 'A reply is a live conversation. Nothing automatic should talk over it.',
      steps: [
        { t: 'do', text: 'Pause the sales sequences on the contact: WF-06, WF-10, WF-11, WF-16, and the payment reminders in WF-24. Reminders about an agreed date (WF-07, WF-19, WF-22) keep running.' },
        { t: 'alert', n: 3 },
        { t: 'task', title: 'REPLY {{contact.first_name}}: they messaged', desc: 'A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds.', role: 'Assigned user', due: '1 hour' },
        { t: 'do', text: 'The sequences resume only when someone replies from the platform and chooses to resume, never automatically.' },
      ],
      stops: 'Fires on every inbound message.',
    },
    {
      id: 'WF-31',
      tags: { add: ['is-no-marketing'], remove: ['is-nurturing'] },
      folder: '10', name: 'STOP and unsubscribe', board: 'both',
      trigger: 'Inbound SMS reads STOP, or an email unsubscribe link is used',
      why: 'The platform handles most of this natively. This confirms what it does and adds the bit it does not.',
      steps: [
        { t: 'do', text: 'Native: STOP sets do-not-SMS on the contact. Unsubscribe sets do-not-email for marketing.' },
        { t: 'do', text: 'Add: remove the contact from WF-16 and WF-27, and leave the card where it is so a later enquiry is still recognised.' },
        { t: 'do', text: 'Transactional messages about a live job still send: reminders, deposit and invoice. That is lawful and expected; make sure the do-not-SMS flag is not wired to block them.' },
      ],
      stops: 'Immediate.',
    },
    {
      id: 'WF-32',
      tags: { add: ['is-stalled'] },
      folder: '10', name: 'Stalled card monitor', board: 'both',
      trigger: 'Scheduled, daily at 6:45am',
      why: 'Escalation toward visibility, not more alarms. A card stuck for forty days is a conversation to have on Monday, not an emergency.',
      steps: [
        { t: 'do', text: 'For every open card, compare time in stage with that stage\'s stall threshold from the pipeline design.' },
        { t: 'if', cond: 'over the threshold', then: [{ t: 'do', text: 'The stage task reappears at the top of the assigned user\'s list.' }] },
        { t: 'if', cond: 'over 2x the threshold', then: [{ t: 'do', text: 'Line item in the daily summary.' }] },
        { t: 'if', cond: 'over 3x the threshold', then: [{ t: 'do', text: 'Named in the weekly review, with the card.' }] },
      ],
      stops: 'Runs daily.',
    },
    {
      id: 'WF-33',
      tags: { add: ['is-complaint'] },
      folder: '10', name: 'Negative review or complaint', board: 'both',
      trigger: 'Review received under 4 stars, or is-complaint added to a contact',
      why: 'Reputation decays fast. A same-day call fixes most of them.',
      steps: [
        { t: 'alert', n: 10 },
        { t: 'task', title: 'CALL {{contact.first_name}}: review or complaint, today', desc: 'Ring them today. Most unhappy customers are fixed by one call and almost none by silence, and a public reply written before you have spoken to them tends to make it worse. Any marketing to that contact is paused until the call has happened.', role: 'OWNER', due: 'Same day' },
        { t: 'set', field: 'ask_for_google_review', value: 'No' },
        { t: 'do', text: 'Pause any marketing sequence on the contact until the call has happened.' },
      ],
      stops: 'Sends once per review or tag.',
    },
    {
      id: 'WF-34',
      folder: '11', name: 'Daily summary', board: 'both',
      trigger: 'Scheduled, 7:00am Monday to Saturday',
      why: 'Where everything that is not an emergency goes. NEEDS YOU last, because it is the section people act on.',
      steps: [
        { t: 'do', text: 'Email to OWNER and OFFICE: yesterday (enquiries, calls, quotes sent, quotes accepted), today (inspections, installs, phone calls booked, deposits due), needs you (leads not called, callbacks due, installs to book, dates not confirmed, deposits unpaid, invoices overdue, job reports to send, retentions due).' },
      ],
      stops: 'Runs daily.',
    },
    {
      id: 'WF-35',
      folder: '11', name: 'Weekly and monthly reports', board: 'both',
      trigger: 'Scheduled, Monday 7:00am and the 1st of the month',
      why: 'Read across both boards from the shared stage keys. The forecast and the committed work are shown as two lines, never one.',
      steps: [
        { t: 'do', text: 'Weekly to OWNER: enquiries by source, median time to first call, leads closed as Unreachable, quotes sent, quotes accepted, lost by reason, open value, accepted but not yet completed, cards stalled 3x, jobs completed, days from acceptance to payment, invoices outstanding, retentions held.' },
        { t: 'do', text: 'Monthly to OWNER: cost per enquiry and per accepted job by utm_source, gclid and fbclid, against paid revenue.' },
        { t: 'do', text: 'Weekly reconciliation: count of website submissions against opportunities created. A mismatch fires alert 11.' },
      ],
      stops: 'Runs on schedule.',
    },
  ],

  /* ---------------------------------------------- the client's own guide */
  guide: {
    principle: {
      title: 'You move the card. The system does the talking.',
      body: 'Every automatic message, reminder and alert in this journey is triggered by something real happening to a card: a call logged, a quote sent, a quote accepted, an install booked in the calendar, a job marked complete, an invoice paid. Some of those move the card by themselves, like the accept button on a quote or a booking in the install calendar. The rest are a move you make on the board. Either way, everything that should follow, follows. Do nothing to a card and the system nudges you, then nudges harder.',
    },
    routine: [
      { when: '7:00am', what: 'The daily summary lands in your inbox. Read the NEEDS YOU section first: leads nobody has rung, callbacks due, installs to book, dates not confirmed, deposits unpaid, invoices overdue and job reports to send.' },
      { when: 'Through the day', what: 'A short list of things can buzz your phone or land in your inbox, and they are all below. Every one is a job to do now. Nothing else interrupts you.' },
      { when: 'Your task list', what: 'Each stage creates the tasks for that stage, with a due date. Tick them off as you go. Ticking a task does not move the card. Moving the card is the separate, deliberate act.' },
      { when: 'When a customer replies', what: 'Every automatic message to that person pauses. Answer from the app, not from your own phone, so the reply sits on their card and the pause holds until you say otherwise.' },
      { when: 'Monday morning', what: 'Open the Whole pipeline view. Every open job on both boards, stage by stage, in one place.' },
    ],
    alertActions: {
      1: 'Ring them within 15 minutes, twice if the first call is not answered. The text and the email have already gone.',
      2: 'Ring them back within 30 minutes. They already have a text saying someone will.',
      3: 'Read it and answer from the app. The automatic messages have paused for this person.',
      4: 'Read their enquiry before the call, so it starts with what they told you.',
      5: 'Ring them. A cancelled call is usually a diary clash, and a short call often rebooks it.',
      6: 'The owner knows. The office still makes the first call within 15 minutes, the same as any lead.',
      7: 'Ring them now. Fifteen minutes have passed and no call is logged on the card.',
      8: 'Check the option they chose is on the card, then move it to Inspection Required or Booking Required. The owner books the install date.',
      9: 'Nothing to do. The customer has had a one-line confirmation and the date is secure.',
      10: 'Ring them today. Most of these are fixed by a call, and none of them by silence.',
      11: 'Ring Systemations. Something behind the scenes has stopped and leads may be going missing.',
      12: 'Ring them today, agree a new date, and move the booking in the calendar. Move the crew and the rig by hand. Nothing is rescheduled automatically.',
      13: 'Ring them today. If the deposit will not land in time, decide whether the crew holds the date or moves to another job.',
    },
    howTo: [
      { title: 'Move a card', body: 'Open the board, drag the card to the next column, or open the card and change its stage. Some moves happen by themselves: the accept button, an install booking, a deposit invoice going out. Everything else is a move you make.' },
      { title: 'Log a call', body: 'From the card in the app, log every call, answered or not. A logged call stops the 15 minute timer. Two calls with no answer: move the card to Dial 1 and the text goes ten seconds later.' },
      { title: 'Send a quote', body: 'Build the quote in the quote tool from the card and send it. Sending it moves the card to Quote Sent and starts the follow-up. If the job has options, open cell or closed cell, or two thicknesses, add each as its own option so the customer accepts one.' },
      { title: 'Record a yes by phone or purchase order', body: 'Move the card to Quote Accepted, note the option they chose, and put the purchase order number on the card if there is one. The thank-you goes by itself. On commercial, the purchase order number is what marks the job Won.' },
      { title: 'Quote an add-on on a job under way', body: 'Send it from the same card as normal: floor protection, window sealing, an extra area. When it is accepted the value updates and the office gets a task. The thank-you does not go again and the card does not move.' },
      { title: 'Book a site inspection', body: 'From the card, book into the inspection calendar. The confirmation and the morning text go by themselves, and whoever is attending gets a task for the day.' },
      { title: 'Book the install date', body: 'From the card, book into the install calendar, not a phone calendar. The booking moves the card to Job Booked and sets up the reminders and the deposit. To move a job, move the booking; the reminders and the deposit follow it.' },
      { title: 'When a customer taps No', body: 'You get an alert. Ring them, agree a new date, move the booking in the install calendar, and move the crew and the rig. Nothing is rescheduled for you.' },
      { title: 'Deposits', body: 'The deposit invoice goes by itself two weeks before the job, with the accepted quote attached. When the money lands, mark the invoice paid; that sends the confirmation. Nothing is charged to a card.' },
      { title: 'Variations on site', body: 'Send the variation document from its template on the card, for example an extra 100 sqm. It fills in the customer details and goes for a digital signature, and the amount is added to the job.' },
      { title: 'Mark a job complete', body: 'Crew: photos on the card, Photos captured ticked, any variations recorded, then mark the job complete from the app. That sends the final invoice with the accepted quote and any purchase order attached.' },
      { title: 'Mark the final invoice paid', body: 'When the money lands, mark it paid. The reminders stop, and a task appears to send the job report and certificates. Send them the same day, never before payment.' },
      { title: 'Ask for Google review', body: 'On the contact, set Ask for Google review to No for a job that had problems and for repeat commercial clients such as Bondor and Australian Housing. It is Yes unless someone changes it, and only Yes gets the request four weeks after the job.' },
      { title: 'Record a retention', body: 'Before marking the final invoice paid, put the retention amount and the release date on the card. The card moves to Retention Claim, and a task reminds you on the release date.' },
      { title: 'Set a job to Lost', body: 'Status to Lost and pick the reason from the list: price, went with another contractor, chose batts, timing, outside the service area, not suitable, unreachable, not the decision maker, budget withdrawn, cancelled after acceptance, duplicate, spam. It takes five seconds and it is the only way the board ever tells you why jobs are lost.' },
      { title: 'Reply to a customer', body: 'Use the conversations screen in the app. Anything sent from there sits on the card and keeps the automatic messages paused. A text from your own phone does neither.' },
      { title: 'Stop messages for someone', body: 'If a customer asks you to stop, set Do not contact on their record and every sequence stops. If they text STOP, it happens on its own and you do not need to do anything.' },
      { title: 'See the whole pipeline', body: 'Open the Whole pipeline view. It lists every open job on both boards in stage order, so you can see the business at a glance without switching boards.' },
    ],
    never: [
      'Send a confirmation, a reminder, a quote chase, a deposit or payment reminder, or a review request by hand. They all go by themselves, and a hand-sent one on top reads as nagging.',
      'Book an install date in a phone calendar first. Book it in the install calendar, or nothing that follows will fire.',
      'Move a crew because of a reminder alone. A No means ring the customer; the move is always made by a person.',
      'Send the job report or the certificates before the final invoice is fully paid.',
      'Move a card back to Quote Accepted for an add-on quote. The system handles add-ons on the card as it is.',
      'Set Lost without a reason.',
      'Text a customer from your own phone. The card never sees it, so the automatic messages keep going as if nobody had spoken.',
    ],
    ifNothing: [
      { when: 'A new lead is not rung', then: '15 minutes: an email to the office. 1 hour: a text and an email to the owner. Next morning: top of the summary until a call is logged.' },
      { when: 'Nobody answers', then: 'After two calls the card goes to Dial 1 and a text goes. After the second round, Dial 2 sends emails on days 2, 4 and 7, then the card closes as Unreachable.' },
      { when: 'A quote goes quiet', then: 'Follow-ups on days 2, 5, 10 and 21, then a task to decide. The card never sits silently.' },
      { when: 'An install is not booked', then: 'After 2 business days in Booking Required, it is listed in the summary until it moves.' },
      { when: 'Nobody answers the reminders', then: 'A call task the day before the job, to make sure it is still on.' },
      { when: 'A deposit is not paid', then: 'A reminder two days before it is due. On the due date, an alert to the owner and the office, and a task.' },
      { when: 'An invoice goes unpaid', then: 'Reminders at day 7 and day 14, then a task to ring. They stop the moment it is marked paid.' },
      { when: 'A job is paid', then: 'A task to send the job report the same day. Four weeks after the job, the review request, if Ask for Google review is Yes. For people who opted in, a referral note a week after payment and a check-in a year on.' },
      { when: 'A retention is held', then: 'A task on the release date to send the claim, and another a month later if it is still unpaid.' },
    ],
    ask: [
      'A message says something you would never say. Tell us the wording and we change it the same day.',
      'An alert fires for the wrong thing, or too often. More than about fifteen a day to one person means something is mis-set.',
      'A customer says they received a message they should not have.',
      'The morning summary stops arriving, or an enquiry from the website never appears on the board.',
      'The mobile number, the business line or any link changes. It is a one-line change and every message follows.',
    ],
  },
};
