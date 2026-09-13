/* ============================================================================
   Spray It Solutions: the customer journey, as data.

   This file is the single source of truth for the journey page. Every stage,
   every message, every task and every alert lives here and nowhere else in the
   page. script.js only renders it.

   Conventions
   - Tokens are written the way the platform writes them: {{contact.first_name}},
     {{custom_values.business_phone}}, {{opportunity.quote_number}} and so on.
     The page swaps them for sample values in Preview mode and shows them raw
     in Fields mode. The "Copy" button always copies the raw version.
   - Email bodies are plain text. A blank line separates paragraphs. A block
     whose lines all begin with two spaces renders as a list: numbered if the
     lines start "1.", key/value if each line has a label then a gap, otherwise
     a plain list.
   - Nothing client-specific is hardcoded in a message body. Swapping the
     custom values below is what makes this a template.

   Adding a message: add it to `messages`, then reference its id from a stage
   group. Adding a stage: add it to the pipeline's `stages` array in order.
   ========================================================================== */

window.JOURNEY = {
  meta: {
    title: 'The Spray It Solutions customer journey',
    preparedFor: 'Glenn and Rachael, Spray It Solutions',
    preparedBy: 'Systemations',
    sourceOfTruth: 'client-journey-onepage/journey-data.js',
  },

  brand: {
    name: 'Spray It Solutions',
    shortName: 'Spray It',
    phone: '0428 26 36 26',
    phoneE164: '+61428263626',
    email: 'info@sprayitsolutions.com.au',
    website: 'sprayitsolutions.com.au',
    owner: 'Glenn',
    ownerInitials: 'G',
    signature: 'Glenn',
    hours: 'Monday to Friday, 7:00am to 5:00pm. Saturday by appointment.',
  },

  /* ---------------------------------------------------------------- roles */
  roles: [
    { key: 'OWNER', who: 'Glenn', owns: 'Commercial deals, pricing, anything escalated' },
    { key: 'OFFICE', who: 'To confirm', owns: 'First response, booking, chasing, invoicing' },
    { key: 'ESTIMATOR', who: 'To confirm, may be Glenn', owns: 'Assessments and quotes' },
    { key: 'CREW_LEAD', who: 'Per job', owns: 'Delivery stages, site photos' },
  ],

  /* ---------------------------------------------------- the swap layer */
  customValues: [
    { key: 'business_name', value: 'Spray It Solutions', note: 'Used in email' },
    { key: 'business_short_name', value: 'Spray It', note: 'Used in SMS, where characters cost money' },
    { key: 'business_phone', value: '0428 26 36 26', note: 'Human readable' },
    { key: 'business_phone_e164', value: '+61428263626', note: 'For tel: links' },
    { key: 'business_email', value: 'info@sprayitsolutions.com.au', note: 'From address and reply-to. The sending domain needs SPF and DKIM before go-live.' },
    { key: 'from_name_owner', value: 'Glenn at Spray It Solutions', note: 'From name on the personal emails' },
    { key: 'from_name_brand', value: 'Spray It Solutions', note: 'From name on confirmations and invoices' },
    { key: 'website_url', value: 'sprayitsolutions.com.au', note: 'Staging address until sign-off' },
    { key: 'booking_url', value: 'sprayitsolutions.com.au/book', note: 'The phone consult calendar, embedded on the site' },
    { key: 'quote_form_url', value: 'sprayitsolutions.com.au/contact', note: '' },
    { key: 'privacy_url', value: 'sprayitsolutions.com.au/privacy', note: 'Required in marketing email' },
    { key: 'review_url', value: 'Google review link', note: 'The Reviews tab of the Google listing. Use a trigger link so it is shortened in SMS.' },
    { key: 'owner_first_name', value: 'Glenn', note: 'Signs the personal messages' },
    { key: 'service_area', value: 'Australia-wide', note: '' },
    { key: 'trade_noun', value: 'spray foam insulation', note: 'How the work is named in a message: "your spray foam insulation enquiry"' },
    { key: 'trade_verb', value: 'insulation', note: 'The short form: "your insulation job"' },
    { key: 'assessment_noun', value: 'site assessment', note: 'What the measure-up visit is called' },
    { key: 'consult_length', value: '15 minute', note: '' },
    { key: 'office_hours', value: 'Mon to Fri, 7am to 5pm', note: 'To confirm with Glenn' },
    { key: 'quote_turnaround', value: '2 business days', note: 'The promise made at the assessment' },
    { key: 'sms_signoff', value: 'Spray It', note: 'Sender identification on every SMS' },
  ],

  /* ---------------------------------------------- sample data for previews */
  samples: {
    common: {
      'custom_values.business_name': 'Spray It Solutions',
      'custom_values.business_short_name': 'Spray It',
      'custom_values.business_phone': '0428 26 36 26',
      'custom_values.business_phone_e164': '+61428263626',
      'custom_values.business_email': 'info@sprayitsolutions.com.au',
      'custom_values.from_name_owner': 'Glenn at Spray It Solutions',
      'custom_values.from_name_brand': 'Spray It Solutions',
      'custom_values.website_url': 'sprayitsolutions.com.au',
      'custom_values.booking_url': 'sprayitsolutions.com.au/book',
      'custom_values.quote_form_url': 'sprayitsolutions.com.au/contact',
      'custom_values.privacy_url': 'sprayitsolutions.com.au/privacy',
      'custom_values.review_url': 'Google review link',
      'custom_values.owner_first_name': 'Glenn',
      'custom_values.service_area': 'Australia-wide',
      'custom_values.trade_noun': 'spray foam insulation',
      'custom_values.trade_verb': 'insulation',
      'custom_values.assessment_noun': 'site assessment',
      'custom_values.consult_length': '15 minute',
      'custom_values.office_hours': 'Mon to Fri, 7am to 5pm',
      'custom_values.quote_turnaround': '2 business days',
      'custom_values.sms_signoff': 'Spray It',
      'unsubscribe_link': 'Unsubscribe',
      'appointment.reschedule_link': 'reschedule link',
      'appointment.cancellation_link': 'cancel link',
      'appointment.title': 'Phone call with Spray It Solutions',
      'message.body': 'Yes, Thursday works. Call after 10.',
      'workflow.name': 'Lead: New Enquiry',
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
      'opportunity.assessment_date': 'Tuesday 30 September, 9:00am',
      'opportunity.quote_number': 'Q-1042',
      'opportunity.deposit_amount': '$1,000',
      'opportunity.job_start_date': 'Monday 13 October',
      'opportunity.job_end_date': 'Monday 13 October',
      'opportunity.crew_assigned': 'DJ',
      'opportunity.product_type': 'open cell',
      'opportunity.sqm_estimate': '140',
      'opportunity.invoice_number': 'INV-2087',
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
      'opportunity.assessment_date': 'Wednesday 8 October, 7:30am',
      'opportunity.proposal_due_date': 'Wednesday 15 October',
      'opportunity.quote_number': 'P-0318',
      'opportunity.deposit_amount': 'n/a',
      'opportunity.po_number': 'PO-77812',
      'opportunity.job_start_date': 'Monday 3 November',
      'opportunity.job_end_date': 'Friday 21 November',
      'opportunity.crew_assigned': 'DJ',
      'opportunity.product_type': 'closed cell',
      'opportunity.sqm_estimate': '4,200',
      'opportunity.invoice_number': 'CL-0318-1',
      'opportunity.lost_reason': 'Budget withdrawn',
    },
  },

  /* ---------------------------------------------------------- the alerts */
  /* These interrupt. Everything else waits for a digest. */
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
        'An inbound call to the business number went unanswered. The caller has already had an automatic text back, so this is the reminder that a human still owes them a call.', trigger: 'Inbound call not answered', to: 'OFFICE', channel: 'SMS', prio: 'now',
      why: 'The auto-reply already went. A human still has to ring back.',
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
      n: 4, name: 'Booking made', plain: 'A customer has booked a phone call',
      desc:
        'Somebody has booked a phone consult. It is in the diary and the confirmation has gone, so the point of the alert is to read their enquiry before the call.', trigger: 'Appointment booked', to: 'Assigned user', channel: 'In-app', prio: 'fyi',
      why: 'The diary changed.',
      body: 'BOOKED: {{contact.first_name}}, {{appointment.start_time}}. Read the enquiry before the call.',
    },
    {
      n: 5, name: 'Booking cancelled', plain: 'A customer has cancelled their call',
      desc:
        'A booked call has been cancelled, leaving a hole in the day. Caught early, a short personal note usually saves the booking.', trigger: 'Appointment cancelled', to: 'Assigned user', channel: 'SMS', prio: 'heads',
      why: 'A hole in the day, recoverable if caught early.',
      body: 'CANCELLED: {{contact.first_name}}, {{appointment.start_time}}. Slot is open. A two-line personal note often saves it.',
    },
    {
      n: 6, name: 'Commercial enquiry', plain: 'A commercial enquiry has come in',
      desc:
        'An enquiry has landed on the Commercial board. It carries the company as well as the contact, and it goes straight to the owner rather than through the round robin.', trigger: 'Opportunity created on the Commercial board', to: 'OWNER', channel: 'SMS', prio: 'now',
      why: 'Different sale, different person, immediately.',
      body: 'COMMERCIAL LEAD: {{contact.first_name}} {{contact.last_name}}, {{contact.company}}\n{{contact.property_type}} / {{contact.postcode}}\n{{contact.phone}}',
    },
    {
      n: 7, name: 'Lead unattended for an hour', plain: 'A new enquiry has sat untouched for an hour',
      desc:
        'A new enquiry has sat in the first stage for an hour of business time. The card is reassigned to the office at the same moment, so this is a handover as well as a warning.', trigger: 'Still in New Enquiry after 60 minutes', to: 'Assigned user and OWNER', channel: 'SMS', prio: 'now',
      why: 'The escalation ladder. Business hours only, and it pauses overnight.',
      body: 'UNATTENDED 60 MIN: {{contact.first_name}} {{contact.phone}}. Reassigned to office.',
    },
    {
      n: 8, name: 'Quote accepted', plain: 'A customer has accepted a quote',
      desc:
        'A job has been marked Won. It names the job and the value, and it is the signal to raise the deposit invoice and pick a date and a crew.', trigger: 'Status set to Won', to: 'OWNER and OFFICE', channel: 'SMS', prio: 'win',
      why: 'Triggers deposit, scheduling and crew.',
      body: 'WON: {{opportunity.name}}, {{opportunity.value}}. Deposit request sent. Schedule it.',
    },
    {
      n: 9, name: 'Deposit received', plain: 'A deposit has arrived',
      desc:
        'A deposit has been recorded against the card. Scheduling is unblocked, and the customer has been told the date will be confirmed within three business days.', trigger: 'deposit_received_at is set', to: 'OFFICE', channel: 'In-app', prio: 'win',
      why: 'Unblocks scheduling on the jobs that take one.',
      body: 'DEPOSIT IN: {{contact.first_name}}, {{opportunity.deposit_amount}}. Lock the date.',
    },
    {
      n: 10, name: 'Negative review or complaint', plain: 'A review under four stars, or a complaint, has come in',
      desc:
        'A review under four stars, or a contact tagged as a complaint. It carries the rating and the reviewer, so the call can be made the same day.', trigger: 'Review under 4 stars, or a complaint tag', to: 'OWNER', channel: 'SMS', prio: 'now',
      why: 'Reputation decays fast. A same-day call fixes most of them.',
      body: 'REVIEW {{review.rating}} stars from {{review.author}}. Call them today.',
    },
    {
      n: 11, name: 'Automation failure', plain: 'Something behind the scenes has stopped working',
      desc:
        'A workflow errored, or the website lead webhook returned a failure. It names the workflow and the contact. This is the only alert that means leads may be vanishing silently.', trigger: 'Workflow error, or the lead webhook returns 4xx or 5xx', to: 'OWNER', channel: 'Email', prio: 'now',
      why: 'A silent failure means leads are vanishing. The platform will not tell you loudly, so this is built deliberately.',
      body: 'WORKFLOW FAILED: {{workflow.name}} on {{contact.first_name}} {{contact.last_name}}. {{error.message}}',
    },
    {
      n: 12, name: 'Missed appointment', plain: 'Somebody did not turn up, or the crew could not get in',
      desc:
        'A booked appointment has been marked no-show on either calendar. It names the appointment and the address. A missed site visit costs half a day and a truck, which makes it the only event in this journey that spends money the moment it happens.',
      trigger: 'Appointment marked no-show', to: 'Assigned user and OWNER', channel: 'SMS', prio: 'now',
      why: 'A missed phone call costs a slot. A missed site visit costs a half day and a truck roll, and the rebooking works far better when a human rings the same day than when only the automatic text goes.',
      body: 'NO SHOW: {{contact.first_name}} {{contact.phone}}\n{{appointment.title}}, {{appointment.start_time}}\n{{opportunity.site_address}}',
      note: 'The twelfth alert, added deliberately against the rule in section 1. The argument for it is money: every other alert protects a lead, this one protects a day of crew time that has already been spent.',
    },
  ],

  /* -------------------------------------------------------- the messages */
  messages: {

    /* ------------------------------------------------ shared: acknowledgement */
    'X-ACK-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters New Enquiry', delay: 'Within 2 minutes', window: 'immediate',
      stops: 'Sends once.',
      body: 'Hi {{contact.first_name}}, {{custom_values.business_short_name}} here. We have your enquiry and one of us will call you today. Need us sooner? {{custom_values.business_phone}}',
      note: 'Fires before anyone has looked at the lead, so it promises only what automation can guarantee: that a human will call.',
    },
    'X-ACK-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Enters New Enquiry', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once.',
      subject: 'We have your enquiry, {{contact.first_name}}',
      preheader: 'One of the family will call you, usually today. Here is what you told us and what happens next.',
      body: 'Hi {{contact.first_name}},\n\nThanks for getting in touch. We have your enquiry and one of the family will call you, usually the same working day.\n\nHere is what you told us:\n\n  Property        {{contact.property_type}}\n  Needs doing     {{contact.areas}}\n  Building stage  {{contact.building_stage}}\n  Timeframe       {{contact.timeframe}}\n  Postcode        {{contact.postcode}}\n\nIf any of that is wrong, just reply to this email and we will fix it.\n\nWhat happens next:\n\n  1. We call you for a {{custom_values.consult_length}} chat about the building.\n  2. If it looks like a fit, we book a {{custom_values.assessment_noun}}.\n  3. You get a written quote with no obligation.\n\nWe cannot price {{custom_values.trade_noun}} properly without seeing the building, so nobody is going to quote you a number over the phone. The call is to work out whether it is the right answer for you at all.',
      sig: ['{{custom_values.owner_first_name}} and the team', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Echoing their answers back cuts "did that go through?" replies and catches a wrong postcode before it wastes a site visit.',
      agencyNote: 'Store the human label in each dropdown field (Home, not home) or this email echoes the raw form value.',
    },

    /* ---------------------------------------------------- shared: the chase */
    'X-CHASE-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'First call attempt not answered', delay: 'Straight after the call', window: 'business-hours',
      stops: 'The whole chase stops the moment they reply, book, or the card leaves Contacting.',
      body: 'Hi {{contact.first_name}}, tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.business_phone}} when it suits. {{custom_values.sms_signoff}}',
    },
    'X-CHASE-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'No reply', delay: 'Day 2', window: 'business-hours',
      stops: 'Stops on reply, booking, or stage change.',
      subject: 'Still keen to help with your {{custom_values.trade_noun}}',
      preheader: 'Three easy ways to pick this back up, whenever suits.',
      body: 'Hi {{contact.first_name}},\n\nWe have tried you a couple of times without luck. No rush at our end, we just do not want to keep ringing if now is a bad time.\n\nThree ways to pick this back up:\n\n  Reply to this email with a time that suits\n  Book a call yourself: {{custom_values.booking_url}}\n  Ring us on {{custom_values.business_phone}}',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
    },
    'X-CHASE-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'No reply', delay: 'Day 4', window: 'business-hours',
      stops: 'Stops on reply, booking, or stage change.',
      body: 'Hi {{contact.first_name}}, still happy to talk through your {{custom_values.trade_verb}} job whenever suits. Pick a time here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}',
    },
    'X-CHASE-04': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'No reply', delay: 'Day 7, final', window: 'business-hours',
      stops: 'Last in the sequence. The card goes to Lost, reason Unreachable.',
      subject: 'Closing this one off',
      preheader: 'We could not reach you, so we will stop ringing. Nothing is lost.',
      body: 'Hi {{contact.first_name}},\n\nWe have not been able to reach you, so we will close this enquiry off rather than keep chasing.\n\nNothing is lost. If the job comes back around, reply to this email or ring {{custom_values.business_phone}} and we will pick it straight back up.\n\nAll the best with it either way.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      note: 'The honest close is the highest-replying message in the sequence. Do not soften it into another chase or it stops working.',
    },

    /* ------------------------------------- shared: the phone consult booking */
    'X-APPT-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Phone consult booked', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking.',
      subject: 'Confirmed: {{appointment.start_time}}',
      preheader: 'We will call you on {{contact.phone}}. Reschedule or cancel with one click.',
      body: 'Hi {{contact.first_name}},\n\nYou are booked in.\n\n  When   {{appointment.start_time}}\n  What   {{appointment.title}}\n  Where  We call you on {{contact.phone}}\n\nThere is nothing to prepare. If it is handy, have a rough idea of what needs doing and when, but the call is mostly us listening.\n\nNeed to change it?\n\n  Reschedule: {{appointment.reschedule_link}}\n  Cancel: {{appointment.cancellation_link}}',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'X-APPT-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Phone consult booked', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking.',
      body: 'Booked in for {{appointment.start_time}}. We will call you on {{contact.phone}}. Change it here: {{appointment.reschedule_link}} {{custom_values.sms_signoff}}',
    },
    'X-APPT-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Phone consult upcoming', delay: '24 hours before', window: 'business-hours',
      stops: 'Cancelled with the appointment.',
      body: 'Reminder: your call with {{custom_values.business_short_name}} is tomorrow, {{appointment.start_time}}. Need to move it? {{appointment.reschedule_link}}',
    },
    'X-APPT-04': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Phone consult upcoming', delay: '2 hours before', window: 'immediate',
      stops: 'Cancelled with the appointment.',
      body: 'Your call with {{custom_values.business_short_name}} is at {{appointment.start_time}}, about 2 hours away. Talk soon.',
    },
    'X-APPT-05': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Marked no-show', delay: 'Straight away', window: 'business-hours',
      stops: 'Sends once. The chase sequence restarts from attempt 2.',
      body: 'Hi {{contact.first_name}}, we missed you just now. No problem, grab another time here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}',
    },
    'X-APPT-06': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Appointment rescheduled or cancelled', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per change.',
      subject: 'Your booking has changed',
      preheader: 'Your new time is {{appointment.start_time}}. If that is not right, ring us.',
      body: 'Hi {{contact.first_name}},\n\nThat booking has been updated.\n\n  Now   {{appointment.start_time}}\n\nIf that is not right, ring us on {{custom_values.business_phone}}.',
      sig: ['{{custom_values.business_name}}'],
      note: 'Used for both the phone consult and the site assessment, so it never names which.',
    },

    /* --------------------------------------------- shared: book the assessment */
    'X-BOOK-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Qualified', delay: 'Straight after the call', window: 'business-hours',
      stops: 'Stops when the assessment is booked.',
      body: 'Hi {{contact.first_name}}, good to talk. Grab a time for the {{custom_values.assessment_noun}} here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}',
    },
    'X-BOOK-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Enters Qualified', delay: 'Straight after the call', window: 'business-hours',
      stops: 'Stops when the assessment is booked.',
      subject: 'Booking your {{custom_values.assessment_noun}}',
      preheader: 'Pick a time for us to measure up. About an hour, and someone to let us in.',
      body: 'Hi {{contact.first_name}},\n\nThanks for the chat. Next step is the {{custom_values.assessment_noun}}, where we measure up and look at access so the quote is a real number rather than a guess.\n\nPick a time that suits: {{custom_values.booking_url}}\n\nIt takes about an hour. Someone needs to be there to let us in, and we will need to get at {{contact.areas}}.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },

    /* --------------------------------------------------- residential: assess */
    'R-ASSESS-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Assessment Booked', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking.',
      body: 'Hi {{contact.first_name}}, {{custom_values.business_short_name}} booked for {{opportunity.assessment_date}} at {{opportunity.site_address}}. Takes about an hour. {{custom_values.sms_signoff}}',
    },
    'R-ASSESS-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Assessment day', delay: '7:00am on the day', window: 'immediate',
      stops: 'Cancelled with the appointment.',
      body: 'Morning {{contact.first_name}}, we are coming to you today for the {{custom_values.assessment_noun}}. We will text when we are close. {{custom_values.sms_signoff}}',
    },

    /* -------------------------------------------------- residential: quoting */
    'R-ASSESS-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Assessment cancelled', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per cancellation.',
      body: 'Hi {{contact.first_name}}, your {{custom_values.assessment_noun}} is cancelled. Grab a new time whenever suits: {{custom_values.booking_url}} {{custom_values.sms_signoff}}',
    },
    'R-ASSESS-04': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Assessment cancelled', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per cancellation. The card goes back to Qualified at the same moment.',
      subject: 'Your {{custom_values.assessment_noun}} is cancelled',
      preheader: 'No problem at all. A new time is a couple of clicks away whenever you are ready.',
      body: 'Hi {{contact.first_name}},\n\nJust confirming the {{custom_values.assessment_noun}} at {{opportunity.site_address}} is cancelled. No problem at all.\n\nNothing else changes. We still cannot put a real number on the job without seeing the building, so whenever the timing is better, the visit is the next step.\n\nPick a new time: {{custom_values.booking_url}}\n\nOr reply with a week that suits and we will work around you.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'A cancelled site visit is usually a diary clash rather than a change of mind, so this says nothing has changed and hands back the booking link rather than asking what went wrong.',
    },
    'R-ASSESS-05': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Assessment marked no-show, or the crew could not get in', delay: 'Straight away, from site', window: 'business-hours',
      stops: 'Sends once.',
      body: 'Hi {{contact.first_name}}, we came out today for the {{custom_values.assessment_noun}} but could not get in. No problem, pick another time here: {{custom_values.booking_url}} {{custom_values.sms_signoff}}',
    },
    'R-ASSESS-06': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'owner',
      trigger: 'Assessment marked no-show', delay: 'Same day', window: 'business-hours',
      stops: 'Sends once. The card goes back to Qualified at the same moment.',
      subject: 'We came out today but could not get in',
      preheader: 'No harm done. Two things make sure the next one goes ahead.',
      body: 'Hi {{contact.first_name}},\n\nWe were at {{opportunity.site_address}} today for the {{custom_values.assessment_noun}} but could not get access, so the visit did not happen.\n\nNo harm done, it happens. When you pick a new time, two things make sure it goes ahead:\n\n  Somebody over 18 on site to let us in.\n  Clear access to {{contact.areas}}, because that is what we have come to measure.\n\nPick a new time: {{custom_values.booking_url}}\n\nIf something came up, ring {{custom_values.business_phone}} and we will find a time that definitely works.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      note: 'Trade specific: the two conditions are what actually goes wrong on a spray foam assessment. The tone stays light on purpose. The visit cost the business half a day, but a customer who feels told off does not rebook.',
    },

    'R-QUOTING-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Quoting', delay: 'Straight after the assessment', window: 'business-hours',
      stops: 'Sends once.',
      body: 'Thanks for having us today {{contact.first_name}}. Your written quote will be with you within {{custom_values.quote_turnaround}}. {{custom_values.sms_signoff}}',
      note: 'The stage is time-boxed at two days. Saying so out loud is what stops the "when is the quote coming" call, and it holds the estimator to the promise.',
    },

    /* ------------------------------------------------- residential: the quote */
    'R-QUOTE-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Enters Quote Sent', delay: 'Immediately, with the quote attached', window: 'immediate',
      stops: 'Sends once per quote.',
      subject: 'Your quote from {{custom_values.business_name}}',
      preheader: 'Quote {{opportunity.quote_number}} attached. Everything included, valid 30 days, questions welcome.',
      body: 'Hi {{contact.first_name}},\n\nYour quote is attached. Quote number {{opportunity.quote_number}}.\n\nIt covers {{contact.areas}} at {{opportunity.site_address}}, using {{opportunity.product_type}} foam.\n\nA few things worth saying plainly:\n\n  The price includes everything. No separate charge for access, setup or clean-up.\n  It is valid for 30 days, mostly because material costs move.\n  If anything in it does not make sense, ring us. We would rather explain it than have you sign something you are unsure about.\n\nAny questions at all, {{custom_values.business_phone}}.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
    },
    'R-QUOTE-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Quote Sent', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per quote.',
      body: 'Hi {{contact.first_name}}, your quote is in your inbox. Any questions, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}',
    },
    'R-FU-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Quote unanswered', delay: 'Day 2', window: 'business-hours',
      stops: 'The whole follow-up stops on reply, acceptance, or when the card leaves the stage.',
      body: 'Hi {{contact.first_name}}, did the quote come through OK? Happy to talk through any of it. {{custom_values.sms_signoff}}',
    },
    'R-FU-02': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'owner',
      trigger: 'Quote unanswered', delay: 'Day 5', window: 'business-hours',
      stops: 'Stops on reply, acceptance, or stage change.',
      subject: 'Why our number might look different',
      preheader: 'Two numbers for the same job can look nothing alike. Here is why.',
      body: 'Hi {{contact.first_name}},\n\nIf you are comparing quotes, one thing is worth knowing, because it is the reason two numbers for the "same" job can look nothing alike.\n\nInsulation is sold on R-value, and R-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind.\n\nA real wall has all of those. Cut products leave edges, edges leave gaps, and air moves through gaps carrying heat with it. That path is not in the rating at all, which is why two walls rated the same can feel completely different to live in.\n\nWe wrote the whole thing up here, with a diagram: {{custom_values.website_url}}/spray-foam#r-value\n\nNot trying to talk you out of anything. Just make sure you are comparing the finished wall, not the number on the bag.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      note: 'The one message in the journey that makes an argument. It works because it explains something the customer did not know, not because it sells.',
      agencyNote: 'Trade specific. For another client, replace it with the thing customers get wrong when comparing quotes in that trade. Keep the shape: "here is the thing nobody tells you", not "here is why we are better".',
    },
    'R-FU-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Quote unanswered', delay: 'Day 10', window: 'business-hours',
      stops: 'Stops on reply, acceptance, or stage change.',
      body: 'Hi {{contact.first_name}}, still thinking it over or has something changed? Either is fine, just want to know whether to keep the slot free. {{custom_values.sms_signoff}}',
      note: 'A real question outperforms "just checking in", because it can be answered in one word.',
    },
    'R-FU-04': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Quote unanswered', delay: 'Day 21, final', window: 'business-hours',
      stops: 'Last in the sequence. The card is then Lost or moved to Nurture, never left sitting.',
      subject: 'Should I close this off?',
      preheader: 'No reply, so I will assume the timing is off. Tell me if I am wrong.',
      body: 'Hi {{contact.first_name}},\n\nI have not heard back on quote {{opportunity.quote_number}}, so I will assume the timing is not right and close it off.\n\nIf that is wrong, just reply and we will pick it up. If you went with someone else, that is completely fine, and if you can tell me why I would genuinely find it useful.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      note: 'The "why" ask feeds the Lost reason field, which is what makes the Price against Chose batts split on the board real rather than guessed.',
    },
    'LOST-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Marked Lost, any reason except Unreachable, Duplicate or Spam', delay: 'Next business morning', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'Thanks for considering us, {{contact.first_name}}',
      preheader: 'No hard feelings. The door stays open.',
      body: 'Hi {{contact.first_name}},\n\nThanks for giving us the chance to quote on {{opportunity.site_address}}. If you went another way, we hope it goes well.\n\nIf the timing changes, or the job grows, reply to this and we will pick it up where we left off. Same number, same people, and we still have the measurements.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'A graceful goodbye is the cheapest marketing there is. A surprising number of "went with someone else" jobs come back after the other quote falls over.',
    },

    /* ------------------------------------------------- residential: nurture */
    'NUR-01': {
      channel: 'email', type: 'MKTG', reuse: 'TRADE', from: 'owner',
      trigger: 'Enters Nurture', delay: 'Next business morning', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops on unsubscribe or re-engagement.',
      subject: 'The bit about R-value nobody explains',
      preheader: 'Worth knowing before you get anywhere near comparing quotes.',
      body: 'Hi {{contact.first_name}},\n\nYou mentioned the timing was not right, which is fair enough. Here is something worth knowing before you get to the point of comparing quotes.\n\nR-value is measured on a flat, perfect, uninterrupted sample. Nothing in that test involves a stud, a pipe, a downlight, an untidy edge or wind. A real wall has all of those, and air moving through gaps carries heat with it.\n\nWhich is why two walls rated the same can feel completely different.\n\nThe full explanation, with a diagram of both walls: {{custom_values.website_url}}/spray-foam#r-value\n\nNo rush from us. When it comes back around, we will be here.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      footer: '{{unsubscribe_link}}',
    },
    'NUR-02': {
      channel: 'email', type: 'MKTG', reuse: 'TRADE', from: 'owner',
      trigger: 'In Nurture', delay: '+30 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops on unsubscribe or re-engagement.',
      subject: 'Where the heat actually goes',
      preheader: 'A third through the roof, more through the walls, and the floor nobody thinks about.',
      body: 'Hi {{contact.first_name}},\n\nA third of your heating leaves through the roof, more through the walls, and the rest through the floor. The floor is the one almost nobody insulates, and it is the one people notice most once it is done.\n\nThere is an interactive version of this on our site. Scroll and the house seals itself while the meter drops: {{custom_values.website_url}}',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      footer: '{{unsubscribe_link}}',
    },
    'NUR-03': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'owner',
      trigger: 'In Nurture', delay: '+90 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops on unsubscribe or re-engagement.',
      subject: 'Still on the list?',
      preheader: 'If the project is still on the horizon, do nothing. If it is off the table, one click and we stop.',
      body: 'Hi {{contact.first_name}},\n\nWe have been sending you the occasional note since you enquired. If the project is still somewhere on the horizon, no action needed and we will keep in touch now and then.\n\nIf it is off the table, unsubscribe below and we will leave you alone. No hard feelings.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      footer: '{{unsubscribe_link}}',
      note: 'A permission reset every 90 days keeps the list clean and the deliverability healthy. It is also the honest thing to do.',
    },

    /* ------------------------------------------------------------- the win */
    'X-WON-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Status set to Won', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once. Every sales sequence on the card is killed at the same moment.',
      subject: 'Locked in. Here is what happens next.',
      preheader: 'Four steps from here. Deposit details are on your quote.',
      body: 'Hi {{contact.first_name}},\n\nThanks for going ahead. Here is how this runs from here.\n\n  1. A deposit of {{opportunity.deposit_amount}} confirms the booking, where one applies. Details are on the quote.\n  2. We lock a start date and confirm it with you.\n  3. We send you a short note on how to prepare the space.\n  4. The crew arrives and does the work.\n\nAnything at all in the meantime, ring {{custom_values.business_phone}}.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Deposits are taken on some jobs and not others. Where none applies, the workflow branch drops line 1 and the SMS below says "we will confirm dates shortly".',
    },
    'X-WON-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Status set to Won', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once.',
      body: 'Thanks {{contact.first_name}}. Deposit details are on your quote, and we will confirm dates as soon as it lands. {{custom_values.sms_signoff}}',
    },
    'DEP-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'deposit_received_at is set', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once. Only on jobs where a deposit applies.',
      body: 'Deposit received, thanks {{contact.first_name}}. You are locked in. We will confirm your start date within 3 business days. {{custom_values.sms_signoff}}',
      note: 'Silence after a payment is the thing customers hate most. This is one line and it stops the "did you get it?" call.',
    },

    /* ------------------------------------------------- residential: the job */
    'JOB-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Scheduled', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per booking.',
      body: 'Hi {{contact.first_name}}, you are booked for {{opportunity.job_start_date}}. Prep notes are in your email. {{custom_values.sms_signoff}}',
    },
    'JOB-02': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'brand',
      trigger: 'Enters Scheduled', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per booking.',
      subject: 'Your job is booked for {{opportunity.job_start_date}}',
      preheader: 'Booked for {{opportunity.job_start_date}}. Five things to do before we arrive.',
      body: 'Hi {{contact.first_name}},\n\nYou are in the diary.\n\n  Start   {{opportunity.job_start_date}}\n  Finish  {{opportunity.job_end_date}}\n  Where   {{opportunity.site_address}}\n  Crew    {{opportunity.crew_assigned}}\n\nTo help us get in and out cleanly, before we arrive:\n\n  Clear access to {{contact.areas}}. We need room to work and to get the hose through.\n  Move anything you would rather not have dust near.\n  Make sure we can park close. The rig runs off the truck.\n  Pets somewhere else for the day, please.\n  Somebody over 18 on site to let us in.\n\nWhile we are spraying, the area needs to be empty of people and pets. Afterwards the space needs time before you use it again. That is anywhere from about an hour to a full day depending on which foam the job calls for, and the crew will tell you which applies to yours before they leave.\n\nAnything you are unsure about, ring {{custom_values.business_phone}}.',
      sig: ['{{custom_values.business_name}}'],
      note: 'Worth checking this list with the crew rather than the office, because the crew know what actually goes wrong on arrival. Re-occupancy is product dependent: as little as an hour for some foams, up to 24 hours for others, so the crew give the figure on the day.',
      agencyNote: 'Trade specific. The preparation list is the job, and for another client it is their own list.',
    },
    'JOB-03': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Job upcoming', delay: 'Day before, 4:00pm', window: 'business-hours',
      stops: 'Cancelled if the job moves.',
      body: 'Hi {{contact.first_name}}, we are with you tomorrow, {{opportunity.job_start_date}}. Access clear and pets sorted? {{custom_values.sms_signoff}}',
    },
    'JOB-04': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters In Progress', delay: 'Morning of the start', window: 'immediate',
      stops: 'Sends once per start day.',
      body: 'Morning {{contact.first_name}}, {{opportunity.crew_assigned}} is on the way to you now. {{custom_values.sms_signoff}}',
    },
    'JOB-06': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE', manual: true,
      trigger: 'Crew running late', delay: 'Sent by the crew, from a saved template', window: 'immediate',
      stops: 'Manual. One tap from the mobile app.',
      body: 'Hi {{contact.first_name}}, running about 30 minutes behind on the way to you. Sorry about that, see you shortly. {{custom_values.sms_signoff}}',
      note: 'Not automated. A saved snippet the crew can send from the app in one tap, because the alternative is a customer standing at the window at 7:30 wondering.',
    },
    'JOB-05': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'owner',
      trigger: 'Enters Invoiced', delay: 'Immediately, with photos attached', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'All done at {{opportunity.site_address}}',
      preheader: 'Photos of the finished work, your paperwork, and how to live with it.',
      body: 'Hi {{contact.first_name}},\n\nThe job is finished. Photos of the completed work are attached, along with your paperwork.\n\nWhat we did:\n\n  {{contact.areas}}, using {{opportunity.product_type}} foam\n  {{opportunity.sqm_estimate}} sqm\n\nLiving with it:\n\n  There is nothing to maintain. It does not settle, sag or need topping up.\n  If you ever cut into it for a new downlight or a pipe, seal it back up. An opening in a sealed layer costs more than the same opening in an unsealed one.\n  You may notice the place holds temperature longer and is quieter. Both are the foam doing its job.\n\nYour invoice is on its way separately.\n\nThanks for having us.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      note: 'The photos are the point. They are the customer\'s record, and they are the source of the site photography, which matters given competitors have lifted images off the old website.',
    },

    /* --------------------------------------------------- residential: paying */
    'PAY-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Enters Invoiced', delay: 'Immediately, with the invoice attached', window: 'business-hours',
      stops: 'Sends once per invoice.',
      subject: 'Invoice {{opportunity.invoice_number}}',
      preheader: 'Invoice {{opportunity.invoice_number}} attached. Payment details are on it.',
      body: 'Hi {{contact.first_name}},\n\nInvoice {{opportunity.invoice_number}} is attached for the work at {{opportunity.site_address}}.\n\nPayment details are on the invoice. Any questions about it, ring {{custom_values.business_phone}}.',
      sig: ['{{custom_values.business_name}}'],
    },
    'PAY-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Invoice unpaid', delay: 'Day 7', window: 'business-hours',
      stops: 'Stops dead the moment payment is marked.',
      body: 'Hi {{contact.first_name}}, friendly reminder that invoice {{opportunity.invoice_number}} is due. Any issues, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}',
    },
    'PAY-03': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Invoice unpaid', delay: 'Day 14', window: 'business-hours',
      stops: 'Stops dead the moment payment is marked. A reminder sent after someone has paid does more damage than the reminder was worth.',
      subject: 'Invoice {{opportunity.invoice_number}} is now overdue',
      preheader: 'A copy is attached. If something is wrong with it, ring us and we will sort it.',
      body: 'Hi {{contact.first_name}},\n\nInvoice {{opportunity.invoice_number}} is now overdue. A copy is attached.\n\nIf there is a problem with it, or you need a different arrangement, ring {{custom_values.business_phone}} and we will sort it out. We would much rather talk than chase.',
      sig: ['{{custom_values.business_name}}'],
    },

    /* --------------------------------------------- residential: after the job */
    'REV-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Enters Paid & Closed', delay: '+1 day', window: 'business-hours',
      stops: 'Ask once. Do not chase reviews.',
      body: 'Hi {{contact.first_name}}, thanks again. If you were happy with the job, a quick Google review really helps a family business: {{custom_values.review_url}} {{custom_values.sms_signoff}}',
      note: 'The link opens the Reviews tab of the Google listing directly. Ask once, by SMS, the day after payment.',
    },
    'REV-02': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'owner',
      trigger: 'In Paid & Closed', delay: '+7 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes.',
      subject: 'Know anyone else with the same problem?',
      preheader: 'Most of our work is word of mouth. You would know who.',
      body: 'Hi {{contact.first_name}},\n\nHope the place is holding its temperature.\n\nMost of our work comes from people passing our name on. If someone you know is fighting the same problem, send them our way or pass on {{custom_values.business_phone}}.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      footer: 'You are getting this because you agreed to hear from us. {{unsubscribe_link}}',
    },
    'REV-03': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'owner',
      trigger: 'In Paid & Closed', delay: '+12 months', window: 'business-hours',
      stops: 'Only if consent_marketing is yes.',
      subject: 'A year on, how is it going?',
      preheader: 'It has been a year since {{opportunity.site_address}}. Tell us how it is holding up.',
      body: 'Hi {{contact.first_name}},\n\nIt has been about a year since we did the work at {{opportunity.site_address}}. No agenda here, we just like knowing how jobs hold up.\n\nIf anything is not as you expected, tell us and we will come and look.\n\nAnd if you have taken on more of the building since, the rest of it is usually easier the second time, because we already know the place.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      footer: '{{unsubscribe_link}}',
    },

    /* ------------------------------------------------------------ always on */
    'SYS-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Inbound call missed', delay: 'Within 60 seconds', window: 'immediate',
      stops: 'Once per caller per day.',
      body: 'Sorry we missed your call. This is {{custom_values.business_short_name}}. Reply here and we will get straight back to you, or we will ring you shortly.',
      note: 'For a trade business where the phone rings while someone is up a ladder, this is the single highest-value automation on the list.',
    },
    'SYS-02': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Inbound SMS outside hours', delay: 'Immediately', window: 'immediate',
      stops: 'Once per contact per day, not once per message.',
      body: 'Thanks for your message. We are back {{custom_values.office_hours}} and will reply first thing. Urgent? {{custom_values.business_phone}}.',
    },

    /* ----------------------------------------------------------- commercial */
    'C-ACK-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Enters New Enquiry on the Commercial board', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once. The SMS acknowledgement X-ACK-01 goes too.',
      subject: 'Your enquiry, {{contact.first_name}}',
      preheader: 'We will call to scope it. Five things that make that call useful.',
      body: 'Hi {{contact.first_name}},\n\nThanks for the enquiry regarding {{contact.property_type}} at {{contact.postcode}}.\n\nWe will call you to scope it. Before that call it helps to know:\n\n  Approximate area, in square metres\n  What the space is used for, and any temperature requirement\n  Whether the building is occupied or operating during the works\n  Programme dates, if they are set\n  Who else needs to be involved in the decision\n\nWe work {{custom_values.service_area}} and hold current insurances and SWMS documentation, which we can supply on request.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Commercial buys differently. These are longer, plainer and carry no urgency devices, because the reader is a facility manager or a builder with a file open, not a homeowner.',
    },
    'C-INSP-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Enters Inspection Booked', delay: 'Immediately', window: 'immediate',
      stops: 'Sends once per booking. X-APPT-03 sends the day-before SMS reminder.',
      subject: 'Site inspection confirmed, {{opportunity.assessment_date}}',
      preheader: 'Confirmed for {{opportunity.assessment_date}}. Inductions, PPE, access and a site contact, please.',
      body: 'Hi {{contact.first_name}},\n\nConfirmed for {{opportunity.assessment_date}} at {{opportunity.site_address}}.\n\nPlease let us know before the visit:\n\n  Site induction requirements, and how long they take\n  PPE beyond standard\n  Access arrangements, including any permits or escorts\n  A site contact and mobile for the day\n\nWe will bring insurances and SWMS. If you need those in advance for your own records, reply and we will send them through.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'C-INSP-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Inspection cancelled', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once per cancellation. The card goes back to Qualified / Scoping.',
      subject: 'Site inspection cancelled, {{opportunity.site_address}}',
      preheader: 'Confirming the visit is off. Send a new date and we will work around your site.',
      body: 'Hi {{contact.first_name}},\n\nConfirming the site inspection at {{opportunity.site_address}} is cancelled.\n\nThe proposal depends on the visit. Product, thickness, access and staging cannot be specified from a drawing, and a number produced without seeing the building is a number we would have to revise later.\n\nSend us a date that works and we will fit around your site. If it is easier, tell us the constraint, a shutdown window, an induction day, a quiet period, and we will propose times inside it.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'C-INSP-03': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'owner',
      trigger: 'Inspection marked no-show, or no access on arrival', delay: 'Same day', window: 'business-hours',
      stops: 'Sends once. The card goes back to Qualified / Scoping.',
      subject: 'We attended {{opportunity.site_address}} but could not get access',
      preheader: 'The visit did not go ahead. Here is what needs to be in place for the next one.',
      body: 'Hi {{contact.first_name}},\n\nWe attended {{opportunity.site_address}} on {{opportunity.assessment_date}} but could not get onto the area, so the inspection did not happen.\n\nTo make sure the next one does, we need these confirmed before the day:\n\n  The induction booked, and how long it takes\n  Any permit or escort arranged\n  A site contact and a mobile for the day\n  Access to the areas being assessed\n\nGive us a date with those in place and we will attend.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Trade specific: on an industrial site the visit fails on inductions and permits far more often than on anyone forgetting. Naming the four things is what stops the second attempt failing the same way.',
    },

    'C-SPEC-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Enters Specifying', delay: 'Same day as the inspection', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'Proposal for {{opportunity.site_address}} by {{opportunity.proposal_due_date}}',
      preheader: 'Thanks for the site visit. Here is when the proposal lands and what it will include.',
      body: 'Hi {{contact.first_name}},\n\nThanks for the time on site today.\n\nWe are now working through product, thickness, access, plant and staging for {{contact.areas}}, roughly {{opportunity.sqm_estimate}} sqm. You will have the proposal by {{opportunity.proposal_due_date}}.\n\nIt will include the specification, programme, a SWMS summary and our insurances, so it can go straight into your approval process.\n\nIf there is a format your procurement needs it in, or it has to be split into stages for budget reasons, tell us now and we will issue it that way the first time.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'The date is set by the estimator when the card enters Specifying. Naming it is what keeps a five-day stage at five days.',
    },
    'C-PROP-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Enters Proposal Submitted', delay: 'Immediately, with the proposal attached', window: 'business-hours',
      stops: 'Sends once per proposal.',
      subject: 'Proposal, {{opportunity.site_address}}',
      preheader: 'Specification, programme and compliance documents attached. Say if procurement needs it reshaped.',
      body: 'Hi {{contact.first_name}},\n\nOur proposal is attached.\n\n  Scope       {{contact.areas}}\n  Area        {{opportunity.sqm_estimate}} sqm\n  Product     {{opportunity.product_type}}\n  Reference   {{opportunity.quote_number}}\n\nIt includes the specification, programme, and the compliance documentation you will need for your own records.\n\nIf you need it broken down differently for internal approval, or split into stages, tell us what shape it needs to be in and we will reissue it.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      note: 'The offer to reformat is deliberate. Losing a commercial job because the numbers were not in the shape procurement needed is an avoidable loss.',
    },
    'C-PROP-02': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Proposal unanswered', delay: 'Day 7', window: 'business-hours',
      stops: 'Stops on reply or stage change.',
      subject: 'Anything you need on {{opportunity.quote_number}}?',
      preheader: 'References, insurances, a revised breakdown. And is there a decision date?',
      body: 'Hi {{contact.first_name}},\n\nChecking whether you need anything further on the proposal for {{opportunity.site_address}}. References, insurances, a site visit for your own team, or a revised breakdown, all easy.\n\nAlso useful for us: is there a decision date we should be working to?',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
    },
    'C-PROP-03': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Still in Commercial Review', delay: 'Day 21', window: 'business-hours',
      stops: 'Stops on reply or stage change.',
      subject: '{{opportunity.quote_number}}, where does this sit?',
      preheader: 'Live, deferred, or gone elsewhere. Any answer helps us hold capacity.',
      body: 'Hi {{contact.first_name}},\n\nFollowing up on {{opportunity.quote_number}}. Happy either way, we just need to know whether to hold capacity.\n\n  Still live, decision pending\n  Deferred to a later budget\n  Gone elsewhere\n\nAny of those is a useful answer.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
    },
    'C-FUT-01': {
      channel: 'email', type: 'MKTG', reuse: 'CORE', from: 'owner',
      trigger: 'In Future Project', delay: 'Every 90 days', window: 'business-hours',
      stops: 'Only if consent_marketing is yes. Stops when the card moves back to Qualified.',
      subject: 'Still on the plan for {{opportunity.site_address}}?',
      preheader: 'A quarterly check-in, nothing more. Tell us when the budget cycle comes around.',
      body: 'Hi {{contact.first_name}},\n\nYou mentioned {{opportunity.site_address}} was a future-budget project, so this is the quarterly check-in as promised.\n\nIf the budget cycle has come around, we can refresh the proposal against current material pricing within a week. If it has moved further out, tell us the quarter and we will leave you alone until then.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
      footer: '{{unsubscribe_link}}',
    },
    'C-PO-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Enters Awaiting PO', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once. A weekly task chases the PO from here.',
      subject: 'Ready to proceed, {{opportunity.site_address}}',
      preheader: 'To mobilise we need four things. Programme confirmed within two working days of the PO.',
      body: 'Hi {{contact.first_name}},\n\nGood news about the award. To get this moving we need:\n\n  Purchase order or signed contract\n  Site contact for mobilisation\n  Induction dates for the crew\n  Confirmed access windows\n\nOnce the PO is with us we will confirm the programme within two working days.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
    },
    'C-MOB-01': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'brand',
      trigger: 'Status set to Won (PO received), enters Mobilising', delay: 'Immediately', window: 'business-hours',
      stops: 'Sends once. Every sales sequence on the card is killed at the same moment.',
      subject: 'Mobilising for {{opportunity.site_address}}',
      preheader: 'PO {{opportunity.po_number}} received. SWMS, insurances and crew list attached. Four things we need from you.',
      body: 'Hi {{contact.first_name}},\n\nPO {{opportunity.po_number}} received, thank you. We are mobilising.\n\n  Start       {{opportunity.job_start_date}}\n  Completion  {{opportunity.job_end_date}}\n  Crew        {{opportunity.crew_assigned}}\n\nAttached: SWMS, insurances, and the crew list for induction.\n\nWe need from you:\n\n  Induction booked for the crew before the start date\n  Confirmed access and any permits\n  Power and water availability on site\n  Confirmation the area will be clear of other trades while we spray\n\nThat last one matters more than it sounds. The area has to be free of other trades during application and cure.',
      sig: ['{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
    },
    'C-SITE-01': {
      channel: 'sms', type: 'TRANS', reuse: 'CORE',
      trigger: 'Each site day in In Progress', delay: '6:30am on the day', window: 'immediate',
      stops: 'Once per site day.',
      body: 'Morning {{contact.first_name}}, {{custom_values.business_short_name}} crew is on site at {{opportunity.site_address}} today. Lead on the day is {{opportunity.crew_assigned}}. Anything on site, ring {{custom_values.business_phone}}. {{custom_values.sms_signoff}}',
      note: 'Goes to the site contact, who is often not the person who signed the PO. Set the contact on the card when the job is mobilised.',
    },
    'C-PROG-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner', manual: true,
      trigger: 'In Progress, staged jobs', delay: 'Weekly, Friday, from a saved template', window: 'business-hours',
      stops: 'Manual. Sent by the owner from the template each Friday the job is live.',
      subject: 'Progress update: {{opportunity.site_address}}',
      preheader: 'Where the works are up to, what is next, and anything we need from you.',
      body: 'Hi {{contact.first_name}},\n\nWeekly update on {{opportunity.site_address}}.\n\n  Completed this week   [areas and sqm]\n  Next week             [areas and staging]\n  We need from you      [access, other trades, sign-off]\n\nPhotos attached. The claim for this stage follows per the programme.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'Bracketed lines are filled in by hand. Automating a progress report produces a report nobody reads, so this is a template with a Friday task attached, not a workflow.',
    },
    'C-PAY-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'brand',
      trigger: 'Progress claim issued', delay: 'Per the programme', window: 'business-hours',
      stops: 'Sends once per claim.',
      subject: 'Progress claim {{opportunity.invoice_number}}',
      preheader: 'Claim {{opportunity.invoice_number}} attached with supporting photos and sign-offs.',
      body: 'Hi {{contact.first_name}},\n\nProgress claim {{opportunity.invoice_number}} is attached for works at {{opportunity.site_address}}.\n\n  Claim covers   [stage or percentage]\n  Terms          [payment terms]\n\nSupporting photos and any sign-offs are included.',
      sig: ['{{custom_values.business_name}}'],
      note: 'Needs Glenn: payment terms for commercial work, and whether progress claims follow a percentage, a milestone, or a monthly cycle.',
    },
    'C-DONE-01': {
      channel: 'email', type: 'TRANS', reuse: 'TRADE', from: 'owner',
      trigger: 'Works complete, enters Invoicing', delay: 'Immediately, with the close-out pack attached', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'Works complete: {{opportunity.site_address}}',
      preheader: 'Close-out pack attached: photos, product data, SWMS, variations. Final claim to follow.',
      body: 'Hi {{contact.first_name}},\n\nWorks at {{opportunity.site_address}} are complete.\n\nAttached is the close-out pack:\n\n  Completion photos, by area\n  Product data sheets for the {{opportunity.product_type}} foam applied\n  SWMS and insurances as issued\n  Any variations agreed on site, itemised\n\nThe final claim follows separately. If your handover process needs a sign-off form or a walk-through, name a time and we will be there.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}'],
    },
    'C-CLOSE-01': {
      channel: 'email', type: 'TRANS', reuse: 'CORE', from: 'owner',
      trigger: 'Enters Paid & Closed', delay: '+1 day', window: 'business-hours',
      stops: 'Sends once.',
      subject: 'Thanks, {{contact.first_name}}',
      preheader: 'Final payment received. One favour, and a promise about next time.',
      body: 'Hi {{contact.first_name}},\n\nFinal payment on {{opportunity.site_address}} is in, thank you.\n\nOne favour. If the works went the way you needed, would you be willing to act as a reference for a future client of similar scale? A phone call, nothing written.\n\nAnd for next time: we hold the specification and site notes, so a second stage or another site can be scoped without starting from scratch.',
      sig: ['{{custom_values.owner_first_name}}', '{{custom_values.business_name}}', '{{custom_values.business_phone}}'],
      note: 'A reference from a facilities manager is worth more on a commercial tender than any number of homeowner reviews. Ask for it while the job is fresh.',
    },
  },

  /* ------------------------------------------------------ the pipelines */
  pipelines: [
    {
      id: 'residential',
      name: 'Residential',
      short: 'Residential',
      blurb: 'Homes, new builds, sheds and garages. One phone call, one site visit, a written quote, and a job that is usually done in a day.',
      stages: [
        {
          key: 'new-enquiry', n: 1, name: 'New Enquiry', headline: 'The first two minutes',
          clientDo: [
            'Ring them within the hour. The text and email have already gone.',
            'After your first attempt, move the card to Contacting.',
            'If it is clearly a commercial job, move the card to the Commercial board instead.',
          ],
          means: 'A lead has landed. Nobody has touched it yet.',
          exits: 'The first contact attempt is logged', stalls: '1 business hour',
          intro: 'The instant someone sends the form, two things happen before any human has read it: a text says we have it and will call today, and an email plays back what they told us. Nobody is left wondering whether the message arrived, or tempted to ring someone else while they wait. Behind it, the clock starts. Time to first contact is the one number that moves everything else in this pipeline.',
          groups: [{ title: 'The moment they enquire', messages: ['X-ACK-01', 'X-ACK-02'] }],
          alerts: [1, 7],
          tasks: [{
            title: 'CALL {{contact.first_name}}: new enquiry, {{contact.areas}}',
            desc:
              'Ring the new enquiry. The acknowledgement text and email have already gone, so this is the first human contact. Have their answers on screen: property type, what needs doing, timeframe and postcode. If it is a job worth having, move the card to Qualified. If you cannot reach them, log the attempt and the chase takes over.',
            role: 'Assigned user',
            due: '1 hour',
          }],
          automation: ['Route to this board on property type: home, new build, shed, or other.', 'Round robin assignment if more than one person can take it. Unassigned is how leads die.', 'Attribution and consent evidence written to the contact, first touch only if empty.'],
          escalation: '15 minutes: reminder to the assigned user. 60 minutes: SMS to the assigned user and Glenn, reassigned to the office. 4 hours: SMS to Glenn again. Next morning: top of the daily digest until it moves. Business hours only, so a midnight enquiry starts its clock at 7am.',
        },
        {
          key: 'contacting', n: 2, name: 'Contacting', headline: 'Five tries, then an honest close',
          clientDo: [
            'Keep trying on the days the tasks say, and log each attempt on the card.',
            'When you speak to them and it is a job you want, move the card to Qualified.',
            'If they book a phone call themselves, read their enquiry before the call.',
          ],
          means: 'At least one attempt made. No two-way conversation yet.',
          exits: 'They reply, or the attempts are exhausted', stalls: '2 days',
          intro: 'Five attempts over seven days across call, text and email, and then it stops. The last message says plainly that we are closing the enquiry off and nothing is lost, which is the message people answer. The sequence pauses the moment they reply or book, and it is capped, so a card never rots here: if the seventh day passes it goes to Lost with the reason Unreachable. Along the way, anyone who books the fifteen minute phone call, from the website or from the assistant, gets the confirmation and reminders in the second group.',
          groups: [
            { title: 'The chase', messages: ['X-CHASE-01', 'X-CHASE-02', 'X-CHASE-03', 'X-CHASE-04'] },
            { title: 'If they book the phone call', messages: ['X-APPT-01', 'X-APPT-02', 'X-APPT-03', 'X-APPT-04'], caption: 'The site offers this call straight after the form, and the assistant books into the same calendar, so a booking can arrive at any point in the first two stages.' },
            { title: 'If they cancel, move it, or do not pick up', messages: ['X-APPT-06', 'X-APPT-05'] },
          ],
          alerts: [3, 4, 5],
          tasks: [
            {
            title: 'CALL {{contact.first_name}}: attempt 2',
            desc:
              'Second call attempt. Try a different time of day from the first. Log it on the card either way, so the chase knows where it is up to.',
            role: 'Assigned user',
            due: 'Day 1',
          },
            {
            title: 'CALL {{contact.first_name}}: attempt 3',
            desc:
              'Third call attempt. If the phone is not working, reply to their enquiry email instead and note it on the card.',
            role: 'Assigned user',
            due: 'Day 2',
          },
            {
            title: 'CALL {{contact.first_name}}: attempt 4',
            desc:
              'Fourth call attempt. They have had two texts and an email by now, so keep it short: you are ringing about their enquiry and can talk whenever suits.',
            role: 'Assigned user',
            due: 'Day 4',
          },
            {
            title: 'CALL {{contact.first_name}}: final attempt',
            desc:
              'Last call before the card is closed as Unreachable. The honest close email goes the same day and it is the one people answer, so check for a reply before closing.',
            role: 'Assigned user',
            due: 'Day 7',
          },
          ],
          automation: ['contact_attempts increments on every attempt, last_attempt_at is stamped.', 'Attempts exhausted: status Lost, reason Unreachable, no message beyond X-CHASE-04.', 'A booking pauses the chase. A no-show restarts it from attempt 2.'],
        },
        {
          key: 'qualified', n: 3, name: 'Qualified', headline: 'A real job, a real number',
          clientDo: [
            'On the call, confirm the building, the areas, access and who decides.',
            'Book the site assessment in the calendar, or let them book from the link we sent.',
            'Note how they prefer to be contacted.',
          ],
          means: 'We have spoken to them and it is a job we want.',
          exits: 'The site assessment is booked', stalls: '3 days',
          intro: 'This is where a deal becomes real. On the call we have confirmed the building type, the areas, the access, the timeframe, and that we are talking to whoever decides. Everything before this stage was administration. A forecast value is set for the first time, as a default estimate by property type rather than a guess at a price, and the customer is pointed at the calendar to book the assessment. Spray foam cannot be quoted without seeing the building, and a rig should not cross the state before the job is qualified, so the phone call qualifies and the visit prices.',
          groups: [{ title: 'Straight after the call', messages: ['X-BOOK-01', 'X-BOOK-02'] }],
          alerts: [],
          tasks: [{
            title: 'BOOK {{contact.first_name}}: assessment',
            desc:
              'Get the site assessment in the diary. They have a booking link by text and email, so check whether they have used it before ringing. Confirm the address, who will be home, and access to the areas being sprayed.',
            role: 'OFFICE',
            due: '3 days',
          }],
          automation: ['Forecast value set to the default for the property type: one day of floor work for a house floor, the full-house band for a whole home.', 'preferred_contact recorded from the call.', 'If they say "not now" on the call, the card goes sideways to Nurture rather than forward.'],
        },
        {
          key: 'assessment-booked', n: 4, name: 'Assessment Booked', headline: 'We come and look',
          clientDo: [
            'Turn up and measure up. Record the area, the foam type and any access notes on the card from your phone before you leave.',
            'Mark the assessment done. The card moves to Quoting.',
            'If they cancel, nothing to do. The rebooking text and email go by themselves and the card goes back to Qualified.',
            'If you get there and cannot get in, mark it a no-show from your phone. That sends the text from site and puts a call on somebody\'s list for the same day.',
          ],
          means: 'A date and time for the site visit are in the diary.',
          exits: 'The assessment happens', stalls: 'On the date',
          intro: 'One confirmation with the address and the hour it takes, one text on the morning, and a text when the crew are close. The estimator gets a task for the day and reads the enquiry beforehand, so the visit starts with "you mentioned the floors" rather than "so what are we looking at". Three things can go wrong here and all three are handled: the visit moves, they cancel it, or the crew arrives and cannot get in. The last one is the expensive one.',
          groups: [
            { title: 'Around the visit', messages: ['R-ASSESS-01', 'R-ASSESS-02'] },
            { title: 'If it moves', messages: ['X-APPT-06'] },
            { title: 'If they cancel', messages: ['R-ASSESS-03', 'R-ASSESS-04'], caption: 'The card goes back to Qualified by itself, so the board never shows a visit that is not in the diary.' },
            { title: 'If the crew cannot get in on the day', messages: ['R-ASSESS-05', 'R-ASSESS-06'], caption: 'Half a day and a truck, already spent. The text goes from site, the email follows, and somebody rings the same day.' },
          ],
          alerts: [4, 5, 12],
          tasks: [{
            title: 'ATTEND {{contact.first_name}}: assessment, {{opportunity.site_address}}',
            desc:
              'Attend the site assessment. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote. Mark it done and the card moves to Quoting.',
            role: 'ESTIMATOR',
            due: 'On the date',
          }],
          automation: ['assessment_date and site_address set on the card.', 'On the day, access_notes, sqm_estimate and product_type are captured on site, from the mobile app, not later from memory.', 'Marked done: the card moves to Quoting and the two day clock starts.', 'Cancelled or no-show: assessment_date is cleared and the card moves back to Qualified, whose exit condition is an assessment being booked. A card is never left showing a visit that is not happening.'],
        },
        {
          key: 'quoting', n: 5, name: 'Quoting', headline: 'Two days, no more',
          clientDo: [
            'Write the quote within two business days. The customer has been told that.',
            'Attach it to the card with the quote number and move the card to Quote Sent. The email and the text go on their own.',
          ],
          means: 'Measured up. The number is being prepared.',
          exits: 'The quote is sent', stalls: '2 days',
          intro: 'A quote that takes a week loses jobs that were already won on the day of the visit. So the stage is time-boxed at two business days, the customer is told the deadline before the crew have left the driveway, and the estimator carries a task with that date on it. If the deadline passes, the quote appears at the top of the daily digest until it goes out.',
          groups: [{ title: 'Leaving the site', messages: ['R-QUOTING-01'] }],
          alerts: [],
          tasks: [{
            title: 'QUOTE {{contact.first_name}}: {{opportunity.site_address}}',
            desc:
              'Write and send the quote within two business days. The customer has been told that, so it is a promise. Put the quote number and the figure on the card, attach the document, then move the card to Quote Sent.',
            role: 'ESTIMATOR',
            due: '2 days',
          }],
          automation: ['quote_number assigned when the quote is created.', 'Over two days: the quote is listed under Quotes overdue in the daily digest.'],
        },
        {
          key: 'quote-sent', n: 6, name: 'Quote Sent', headline: 'A number they can trust',
          clientDo: [
            'Put the quoted figure on the card.',
            'Ring them on day two. There is a task for it.',
            'If they accept, set the card to Won. If they decline, set it to Lost and pick the reason. Otherwise leave it: the follow-ups run by themselves.',
          ],
          means: 'A written quote is delivered and its value is on the card.',
          exits: 'Accepted, declined, or gone quiet', stalls: '3 days',
          intro: 'The quote goes by email with the document attached, and a text says it is in their inbox. The email says three things plainly: the price includes everything, it is valid for thirty days, and if any of it does not make sense we would rather explain it than have them sign something they are unsure about. Two days later a one-line text asks whether it came through. From here the opportunity value is the real quoted figure, so the forecast finally means something.',
          groups: [{ title: 'The quote', messages: ['R-QUOTE-01', 'R-QUOTE-02'] }, { title: 'Two days later', messages: ['R-FU-01'] }],
          alerts: [3],
          tasks: [{
            title: 'CALL {{contact.first_name}}: quote follow up',
            desc:
              'Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.',
            role: 'Assigned user',
            due: 'Day 2',
          }],
          automation: ['Opportunity value updated to the quoted figure.', 'quote_sent_at stamped. The follow-up sequence schedules from it: day 2, 5, 10, 21.', 'Accepted: status Won. Declined: status Lost with a reason. Quiet after day 3: the card moves to Follow-up.'],
        },
        {
          key: 'follow-up', n: 7, name: 'Follow-up', headline: 'Day 5, day 10, day 21',
          clientDo: [
            'Nothing on days 5, 10 and 21. The messages send themselves.',
            'When they reply, answer them. Every automatic message stops the moment they do.',
            'On day 21 decide: Won, Lost with a reason, or Nurture if it is a real job at the wrong time.',
          ],
          means: 'Chasing a decision, on a schedule, not on a whim.',
          exits: 'Won, Lost, or moved to Nurture', stalls: '30 days',
          intro: 'Structured, not improvised. Day five is the one message in the whole journey that makes an argument: why two quotes for the same job can look nothing alike, because R-value is measured on a perfect sample and a real wall is not one. Day ten asks a question that can be answered in a word. Day twenty-one says we will close it off unless told otherwise, and asks why if they went elsewhere. That answer becomes the Lost reason, which is what makes the board teach anything. If the day passes with nothing, the card is Lost or Nurture. It is never left sitting.',
          groups: [{ title: 'The sequence', messages: ['R-FU-02', 'R-FU-03', 'R-FU-04'] }, { title: 'If they say no', messages: ['LOST-01'], caption: 'Sends when the card is marked Lost with any reason other than Unreachable, Duplicate or Spam. Nobody should hear from us again after this unless they ask to.' }],
          alerts: [3],
          tasks: [
            {
            title: 'DECIDE {{contact.first_name}}: close or nurture',
            desc:
              'Twenty-one days with no decision. Close the card: Won if they accepted, Lost with a reason if they went elsewhere, or Nurture if it is a real job at the wrong time. Never leave it sitting.',
            role: 'Assigned user',
            due: 'Day 21',
          },
            {
            title: 'LOG {{contact.first_name}}: lost reason',
            desc:
              'Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.',
            role: 'Assigned user',
            due: 'Same day, on Lost',
          },
          ],
          automation: ['Every message in the sequence stops the moment they reply. A chase that keeps firing after someone has answered is the fastest way to turn a won job into a complaint.', 'Lost requires a reason. The fixed list: Price, Went with another contractor, Chose batts or another product, Timing, Outside service area, Not suitable, Unreachable, Not the decision maker, Budget withdrawn, Duplicate, Spam.', 'Lost with reason Timing: the contact is added to the nurture list if consent allows.'],
        },
        {
          key: 'nurture', n: 8, name: 'Nurture', headline: 'Right job, wrong time',
          clientDo: [
            'Nothing. Three emails go out over three months, only to people who ticked the box.',
            'If they come back, move the card to Qualified.',
            'Once a quarter, glance at the list and remove anyone who is not a real job.',
          ],
          means: 'A real job that is not happening now.',
          exits: 'They re-engage, back to Qualified', stalls: 'Review quarterly',
          intro: 'A siding, not a step. Cards arrive here from Follow-up or straight from the qualifying call, and they leave backwards, to Qualified, when the person comes back. Three emails over ninety days, all marketing, so all of them send only where the person ticked the box on the form. The third one asks permission to keep going. Anyone who does not want it can leave with one click, which keeps the list honest and the deliverability healthy.',
          groups: [{ title: 'The drip, marketing consent only', messages: ['NUR-01', 'NUR-02', 'NUR-03'] }],
          alerts: [3],
          tasks: [{
            title: 'REVIEW {{contact.first_name}}: still a fit?',
            desc:
              'Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Qualified. A clean list keeps the emails landing in inboxes rather than in spam.',
            role: 'OWNER',
            due: 'Quarterly',
          }],
          automation: ['Sends only when consent_marketing is yes. Every message carries an unsubscribe.', 'Any reply, booking, or new form fill moves the card back to Qualified and stops the drip.', 'Unsubscribe sets do-not-market on the contact and the card stays put, so a later enquiry is still recognised.'],
        },
        {
          key: 'won', won: true, name: 'Won', headline: 'The moment they say yes',
          clientDo: [
            'Set the card to Won the moment they accept, not when the job is done.',
            'If the job takes a deposit, put the amount on the card and send the deposit invoice. When it lands, tick Deposit received.',
            'Pick a date and a crew, put them on the card, and move it to Scheduled.',
          ],
          means: 'Status set to Won. The card keeps moving, now on the delivery half of the board.',
          exits: 'Deposit received where one applies, then Scheduled', stalls: '',
          intro: 'Won is a status, not a stage, and it is marked when the customer accepts, not when the job is done or paid. Setting it does three things at once: thanks them and lays out the four steps from here, kills every sales sequence on the card so a quote chase can never fire at someone whose job is booked, and hands the office two tasks. Deposits are taken on some jobs and not others, so a deposit is a field on the card rather than a gate: where one applies, the request goes out and a one-line text confirms it when it lands.',
          groups: [{ title: 'On acceptance', messages: ['X-WON-01', 'X-WON-02'] }, { title: 'When the deposit lands', messages: ['DEP-01'], caption: 'Only on jobs that take a deposit. Where none applies the card moves straight to Scheduled on acceptance.' }],
          alerts: [8, 9],
          tasks: [
            {
            title: 'INVOICE {{contact.first_name}}: deposit',
            desc:
              'Send the deposit invoice, on the jobs that take one. The amount is already on the card and the customer has been told to expect it. When the money lands, tick Deposit received, which confirms it to them and unblocks scheduling.',
            role: 'OFFICE',
            due: '1 day, where a deposit applies',
          },
            {
            title: 'SCHEDULE {{contact.first_name}}: allocate crew and date',
            desc:
              'Pick a start date, a finish date and a crew, put all three on the card, then move it to Scheduled. That sends the booking text and the preparation email by itself.',
            role: 'OFFICE',
            due: '3 days',
          },
          ],
          automation: ['Every sales sequence on the card is stopped: chase, appointment reminders, quote follow-up, nurture.', 'deposit_amount set from the quote. deposit_received_at set by the office when it lands, which fires DEP-01 and the alert.', 'The opportunity value carries forward unchanged. Variations are added as they happen, not at invoicing.'],
        },
        {
          key: 'scheduled', n: 9, name: 'Scheduled', headline: 'In the diary',
          clientDo: [
            'Nothing to send. The booking, the preparation notes and the day-before reminder go by themselves.',
            'If the date moves, change it on the card. The reminder moves with it.',
          ],
          means: 'Accepted, with a date and a crew locked.',
          exits: 'The crew starts', stalls: 'On the date',
          intro: 'The booking text points at the email, and the email is the preparation list: clear access, move what you would rather not have dust near, park the rig close, pets elsewhere, someone over eighteen to let us in. It also says the space needs time before it is used again and that the crew will say how long on the day, because re-occupancy depends on the foam and is not a number to guess in writing. The afternoon before, one text asks whether access is clear.',
          groups: [{ title: 'When the date is set', messages: ['JOB-01', 'JOB-02'] }, { title: 'The day before', messages: ['JOB-03'] }],
          alerts: [],
          tasks: [{
            title: 'CONFIRM {{contact.first_name}}: day before',
            desc:
              'Quick check the afternoon before: access clear, pets sorted, somebody over eighteen home to let the crew in. The reminder text has gone; this is the call that catches what it does not.',
            role: 'OFFICE',
            due: 'Day before start',
          }],
          automation: ['job_start_date, job_end_date and crew_assigned set on the card.', 'JOB-03 is cancelled and re-queued if the date moves.'],
        },
        {
          key: 'in-progress', n: 10, name: 'In Progress', headline: 'On site',
          clientDo: [
            'Move the card to In Progress on the morning. The on-our-way text goes out.',
            'Running late? Send the saved late text from the app, one tap.',
            'Before you leave: photos of the finished work on the card, and any extras agreed on site written down. The card will not move on without the photos.',
          ],
          means: 'The crew is at the property.',
          exits: 'The work is finished', stalls: '3 days past the end date',
          intro: 'One text on the morning saying the crew is on the way, and a one-tap snippet the crew can send from the app if they are running behind, because the alternative is a customer at the window at half past seven. Two things have to happen before the card leaves this stage: photos of the finished work, and any variations agreed on site written on the card. Both are tasks on the crew lead, not the office, because the office is not there.',
          groups: [{ title: 'On the morning', messages: ['JOB-04'] }, { title: 'Crew quick-send', messages: ['JOB-06'], caption: 'Manual. Saved as a snippet in the mobile app so it is one tap, not a typed apology.' }],
          alerts: [],
          tasks: [
            {
            title: 'PHOTOS {{opportunity.site_address}}',
            desc:
              'Photograph the finished work from the app before leaving site, and tick Photos captured. The card cannot move to Invoiced without them. They go to the customer in the completion email, and they are the only real proof-of-work images the business has.',
            role: 'CREW_LEAD',
            due: 'On completion',
          },
            {
            title: 'VARIATIONS {{contact.first_name}}: record any extras',
            desc:
              'Write down anything agreed on site that was not in the quote, with the amount, and put it on the card the same day. Left to invoicing, it surprises the customer.',
            role: 'CREW_LEAD',
            due: 'On completion',
          },
          ],
          automation: ['photos_captured is a required checkbox before the card can enter Invoiced. Make it required or it will not happen.', 'variation_amount is added to the opportunity value as it is recorded.'],
        },
        {
          key: 'invoiced', n: 11, name: 'Invoiced', headline: 'Done, photographed, billed',
          clientDo: [
            'Send the invoice, put the number on the card, and move it to Invoiced. The completion email with the photos and the invoice email go by themselves.',
            'Nothing on days 7 and 14. The reminders send themselves and stop the moment you mark it paid.',
            'When the money lands, mark it paid and move the card to Paid & Closed.',
          ],
          means: 'Work complete, photos captured, invoice out.',
          exits: 'Payment received', stalls: '14 days',
          intro: 'Two emails go out on entry, deliberately separate. The first is the completion note from Glenn with the photos attached and three lines on living with the foam. The second is the invoice from the business, so the paperwork never dilutes the thank-you. A reminder text at day seven and an overdue email at day fourteen, and both stop dead the moment payment is marked, because a reminder sent after someone has paid does more damage than the reminder was worth.',
          groups: [{ title: 'On completion', messages: ['JOB-05', 'PAY-01'] }, { title: 'If unpaid', messages: ['PAY-02', 'PAY-03'] }],
          alerts: [],
          tasks: [
            {
            title: 'INVOICE {{contact.first_name}}: final',
            desc:
              'Raise the final invoice, put the number on the card, and move it to Invoiced. The completion email with the photos and the invoice email go out separately by themselves.',
            role: 'OFFICE',
            due: '1 day',
          },
            {
            title: 'CHASE {{contact.first_name}}: payment overdue',
            desc:
              'Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.',
            role: 'OFFICE',
            due: 'Day 14',
          },
          ],
          automation: ['invoice_number and invoice_sent_at set on the card.', 'Payment marked: the reminder sequence is cancelled and the card moves to Paid & Closed.'],
        },
        {
          key: 'paid-closed', n: 12, name: 'Paid & Closed', headline: 'The most valuable stage on the board',
          clientDo: [
            'Nothing. The review request goes the next day, the referral note a week later, the check-in a year on.',
            'If a review comes in under four stars you get an alert. Ring them that day.',
          ],
          means: 'Done.',
          exits: 'Closes the card', stalls: '',
          intro: 'The day after payment, one text asks for a Google review, with a link that opens the review tab directly. Asked once and never chased. A week later, for anyone who ticked the marketing box, an email asks whether they know someone with the same problem, because most of the work comes from people passing the name on. Twelve months on, a check-in with no agenda beyond knowing how the job held up, and a reminder that the rest of the building is easier the second time.',
          groups: [{ title: 'The review', messages: ['REV-01'] }, { title: 'Marketing consent only', messages: ['REV-02', 'REV-03'] }],
          alerts: [10],
          tasks: [{
            title: 'REVIEW {{contact.first_name}}: did they leave one?',
            desc:
              'Check whether the Google review arrived. If it did, nothing to do. If it did not, leave it. The ask goes once, by text, and chasing reviews costs more goodwill than it earns.',
            role: 'OFFICE',
            due: 'Day 7',
          }],
          automation: ['A review under four stars fires the alert to Glenn the same day.', 'The 12 month check-in is scheduled on entry, so it survives whatever else changes in a year.', 'Attribution fields are still on the card, so paid revenue can be reported by source, click id and campaign.'],
        },
      ],
    },
    {
      id: 'commercial',
      name: 'Commercial & Industrial',
      short: 'Commercial',
      blurb: 'Factories, warehouses, cold storage, agricultural facilities, data centres and mine sites. Scoped, specified, proposed, procured, mobilised. Months, not days, and a purchase order rather than a handshake.',
      stages: [
        {
          key: 'new-enquiry', n: 1, name: 'New Enquiry', headline: 'Straight to Glenn',
          clientDo: [
            'Glenn gets the text. Ring them within the hour.',
            'After the first attempt, move the card to Contacting.',
          ],
          means: 'A lead has landed on the commercial board. Untouched.',
          exits: 'The first attempt is logged', stalls: '1 business hour',
          intro: 'Routed here on property type, factory or farm, or by a human override when the message mentions a tender, a builder, or a square metre figure that could not be a house. The text acknowledgement is the same as residential. The email is not: it asks for the five things that make the scoping call useful, and it mentions insurances and SWMS, because the person reading it will need them. Glenn is told directly, by text, the moment it lands.',
          groups: [{ title: 'The moment they enquire', messages: ['X-ACK-01', 'C-ACK-01'] }],
          alerts: [6, 1, 7],
          tasks: [{
            title: 'CALL {{contact.first_name}}: commercial enquiry, {{contact.company}}',
            desc:
              'Ring the commercial enquiry within the hour. Aim to come off the call knowing who decides, roughly how big it is, what the space is used for, whether it is operating during the works, and when they need it done.',
            role: 'OWNER',
            due: '1 hour',
          }],
          automation: ['Route on property type: factory, farm. Override to this board on tender, builder, head contractor, or a large area figure.', 'A card in the wrong pipeline is moved, not recreated. Moving preserves the attribution and consent record.'],
          escalation: 'The same ladder as residential, except the escalation goes to Glenn rather than away from him, because commercial is his.',
        },
        {
          key: 'contacting', n: 2, name: 'Contacting', headline: 'The same chase, one day slower',
          clientDo: [
            'Keep trying on the task days. When you have a conversation, move the card to Qualified / Scoping.',
          ],
          means: 'Attempted, no conversation yet.',
          exits: 'They reply', stalls: '3 days',
          intro: 'Commercial contacts are harder to reach and slower to answer, so the stall is three days rather than two, but the sequence is the shared one. A facilities manager who booked a call from the website gets the same confirmation and reminders as a homeowner.',
          groups: [
            { title: 'The chase', messages: ['X-CHASE-01', 'X-CHASE-02', 'X-CHASE-03', 'X-CHASE-04'] },
            { title: 'If they book the phone call', messages: ['X-APPT-01', 'X-APPT-02', 'X-APPT-03', 'X-APPT-04', 'X-APPT-06', 'X-APPT-05'] },
          ],
          alerts: [3, 4, 5],
          tasks: [
            {
            title: 'CALL {{contact.first_name}}: attempt 2',
            desc:
              'Second call attempt. Try a different time of day from the first. Log it on the card either way, so the chase knows where it is up to.',
            role: 'OWNER',
            due: 'Day 1',
          },
            {
            title: 'CALL {{contact.first_name}}: attempt 3',
            desc:
              'Third call attempt. If the phone is not working, reply to their enquiry email instead and note it on the card.',
            role: 'OWNER',
            due: 'Day 3',
          },
            {
            title: 'CALL {{contact.first_name}}: final attempt',
            desc:
              'Last call before the card is closed as Unreachable. The honest close email goes the same day and it is the one people answer, so check for a reply before closing.',
            role: 'OWNER',
            due: 'Day 7',
          },
          ],
          automation: ['Same cap: attempts exhausted, Lost with reason Unreachable.'],
        },
        {
          key: 'qualified-scoping', n: 3, name: 'Qualified / Scoping', headline: 'Who decides, how big, when',
          clientDo: [
            'Find out who decides, roughly how big it is, what the space is used for and when they need it. Put the site address and a site contact on the card.',
            'Book the inspection and move the card to Inspection Booked.',
            'If it is a future budget, move the card to Future Project instead.',
          ],
          means: 'Decision maker identified. Scale and programme understood.',
          exits: 'Inspection booked', stalls: '5 days',
          intro: 'No automated message here. This stage is a conversation, usually more than one, and an email from a workflow would be noise in it. What the stage produces is a confirmed decision maker, an approximate area, a use for the space, a programme, and whether the building is operating during the works. The value stays at zero. Commercial ranges from small to millions, which is too wide to forecast from, so the card carries nothing until a real number exists.',
          groups: [],
          alerts: [],
          tasks: [{
            title: 'SCOPE {{contact.first_name}}: confirm decision maker and programme',
            desc:
              'Confirm who decides, the scale and the programme, then put the site address and a site contact on the card. Leave the value at zero: commercial ranges from small to millions, and a guess here makes the forecast worthless.',
            role: 'OWNER',
            due: '5 days',
          }],
          automation: ['No forecast value. Left at zero until the proposal.', 'site_address and a site contact set on the card.', 'A "future budget" answer on the call moves the card sideways to Future Project.'],
        },
        {
          key: 'inspection-booked', n: 4, name: 'Inspection Booked', headline: 'Boots on site',
          clientDo: [
            'Turn up with insurances and SWMS. Record area, product and access notes on the card before you leave.',
            'Move the card to Specifying and put the date you will have the proposal done on it. The customer is told that date by email.',
            'If it is cancelled, nothing to do. The card goes back to Qualified / Scoping and an email asks for a new date.',
            'If you cannot get on site, mark it a no-show. The email that follows lists what has to be in place before the next attempt.',
          ],
          means: 'A site visit is in the diary.',
          exits: 'The visit happens', stalls: 'On the date',
          intro: 'A commercial site visit needs more than an address. The confirmation asks for induction requirements, PPE beyond standard, access arrangements and a site contact, and it offers the insurances and SWMS in advance for their records. The day-before text reminder is the shared one. On an industrial site the visit fails on inductions and permits far more often than on anyone forgetting, so the no-access email names the four things rather than asking what happened.',
          groups: [
            { title: 'On booking', messages: ['C-INSP-01'] },
            { title: 'The day before, and if it moves', messages: ['X-APPT-03', 'X-APPT-06'] },
            { title: 'If it is cancelled', messages: ['C-INSP-02'] },
            { title: 'If we cannot get access on the day', messages: ['C-INSP-03'] },
          ],
          alerts: [4, 5, 12],
          tasks: [{
            title: 'ATTEND {{opportunity.site_address}}: inspection',
            desc:
              'Attend the visit. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.',
            role: 'OWNER',
            due: 'On the date',
          }],
          automation: ['assessment_date set on the card.', 'On site: sqm_estimate, product_type, access_notes captured from the app.', 'Cancelled or no access: assessment_date is cleared and the card moves back to Qualified / Scoping.'],
        },
        {
          key: 'specifying', n: 5, name: 'Specifying', headline: 'Product, thickness, access, staging',
          clientDo: [
            'Write the proposal within five days.',
            'Attach it, put the reference and the figure on the card, and move it to Proposal Submitted.',
          ],
          means: 'The proposal is being built. Product, thickness, plant, staging, WHS.',
          exits: 'Proposal issued', stalls: '5 days',
          intro: 'The commercial equivalent of the two-day quote clock, at five days. On the drive back from the inspection, one email thanks them for the time on site, names the day the proposal will land, lists what it will contain, and asks now, not later, whether procurement needs it in a particular shape. That last question is what stops a proposal being reissued three times.',
          groups: [{ title: 'Leaving the site', messages: ['C-SPEC-01'] }],
          alerts: [],
          tasks: [{
            title: 'SPEC {{opportunity.site_address}}: product, access, staging, WHS',
            desc:
              'Work out product, thickness, access, plant, staging and WHS, and build the proposal. Five days. The customer has been given that date by email, so it is a commitment.',
            role: 'OWNER',
            due: '5 days',
          }],
          automation: ['proposal_due_date set on entry and used in C-SPEC-01.', 'Over five days: listed in the daily digest.'],
        },
        {
          key: 'proposal-submitted', n: 6, name: 'Proposal Submitted', headline: 'Priced, specified, documented',
          clientDo: [
            'Ring in two days to confirm they have it.',
            'After a week with no answer, the card moves to Commercial Review by itself and the follow-ups run.',
          ],
          means: 'A priced proposal or tender has been lodged.',
          exits: 'Shortlisted, declined, or quiet', stalls: '7 days',
          intro: 'The proposal email states scope, area, product and reference in four lines, says the compliance documentation is included, and repeats the offer to reshape it for internal approval. A week later, one email asks whether they need anything further and whether there is a decision date. From here the opportunity carries its real value.',
          groups: [{ title: 'The proposal', messages: ['C-PROP-01'] }, { title: 'A week later', messages: ['C-PROP-02'] }],
          alerts: [3],
          tasks: [{
            title: 'CALL {{contact.first_name}}: confirm receipt',
            desc:
              'Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.',
            role: 'OWNER',
            due: '2 days',
          }],
          automation: ['Opportunity value set to the proposal figure.', 'quote_number and quote_sent_at set.', 'Any reply stops the follow-up.'],
        },
        {
          key: 'commercial-review', n: 7, name: 'Commercial Review', headline: 'They are deciding',
          clientDo: [
            'Answer what they ask for: references, insurances, a reshaped breakdown.',
            'Verbal yes? Move the card to Awaiting PO. Do not set it to Won yet.',
            'Deferred? Move it to Future Project. Gone elsewhere? Lost, with the reason.',
          ],
          means: 'Clarifications, value engineering, references, insurances, SWMS.',
          exits: 'A decision', stalls: '14 days',
          intro: 'Kept separate from Awaiting PO on purpose. "They are still deciding" and "they have chosen us and procurement is slow" look identical on a board and are completely different for forecasting. At day twenty-one one email offers three answers to pick from: still live, deferred, or gone elsewhere. Any of them is useful.',
          groups: [{ title: 'Three weeks in', messages: ['C-PROP-03'] }],
          alerts: [3],
          tasks: [{
            title: 'CHASE {{contact.first_name}}: decision date',
            desc:
              'Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.',
            role: 'OWNER',
            due: 'Day 7, then day 21',
          }],
          automation: ['Deferred: the card moves sideways to Future Project.', 'Gone elsewhere: Lost with a reason, and LOST-01 is not sent on commercial. Glenn writes that one himself.'],
        },
        {
          key: 'awaiting-po', n: 8, name: 'Awaiting PO', headline: 'Won in principle, paperwork pending',
          clientDo: [
            'Chase the PO weekly. There is a task.',
            'When the PO arrives, put the number on the card and set it to Won.',
          ],
          means: 'Verbally awarded. Purchase order or contract not yet received.',
          exits: 'PO or signed contract received', stalls: '14 days',
          intro: 'Never mark a commercial job Won on a verbal. This stage exists so a verbal award is visible and chased without being counted as committed work. One email lists the four things needed to mobilise, and a weekly task chases the PO until it lands.',
          groups: [{ title: 'On the verbal', messages: ['C-PO-01'] }],
          alerts: [],
          tasks: [{
            title: 'CHASE {{contact.first_name}}: PO',
            desc:
              'Weekly chase for the purchase order. The job is verbally won but stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.',
            role: 'OWNER',
            due: 'Weekly',
          }],
          automation: ['Status stays Open. Forecast value stays in the open pipeline.'],
        },
        {
          key: 'future-project', n: 9, name: 'Future Project', headline: 'Real project, next budget',
          clientDo: [
            'Nothing. A check-in email goes every quarter to people who opted in.',
            'When it comes back, move the card to Qualified / Scoping.',
          ],
          means: 'A real project in a future budget cycle.',
          exits: 'It comes back around, to Qualified', stalls: 'Review quarterly',
          intro: 'The commercial siding. One email every quarter, marketing consent permitting, which offers to refresh the proposal against current pricing within a week or to go quiet until a named quarter. When it comes back, the card goes backwards to Qualified with everything it learned the first time still on it.',
          groups: [{ title: 'Quarterly, marketing consent only', messages: ['C-FUT-01'] }],
          alerts: [],
          tasks: [{
            title: 'CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}',
            desc:
              'Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.',
            role: 'OWNER',
            due: 'Quarterly',
          }],
          automation: ['Sends only when consent_marketing is yes.', 'Any reply moves the card back to Qualified / Scoping.'],
        },
        {
          key: 'won', won: true, name: 'Won', headline: 'The purchase order',
          clientDo: [
            'Set Won on the PO, never on a verbal.',
            'Put the start and finish dates, the crew and the site contact on the card. The mobilisation email goes with the SWMS and insurances attached.',
          ],
          means: 'Status set to Won, on the PO. Never on a verbal.',
          exits: 'Enters Mobilising', stalls: '',
          intro: 'The PO is the moment. Setting Won kills every sales sequence on the card, records the PO number, and moves the job into Mobilising, whose email doubles as the thank-you. Glenn and the office both hear about it.',
          groups: [{ title: 'On the PO', messages: ['C-MOB-01'], caption: 'The mobilisation email is the won message on this board. There is no separate congratulations, because a facilities manager wants the SWMS, not a card.' }],
          alerts: [8],
          tasks: [{
            title: 'MOBILISE {{opportunity.site_address}}: programme, inductions, SWMS, materials',
            desc:
              'Purchase order received. Confirm the programme within two working days: start and finish dates, crew, site contact, induction dates and access windows, all on the card.',
            role: 'OWNER',
            due: '2 working days',
          }],
          automation: ['po_number recorded. Opportunity value confirmed to the PO figure.', 'Every sales sequence stopped.'],
        },
        {
          key: 'mobilising', n: 10, name: 'Mobilising', headline: 'Inductions, SWMS, access',
          clientDo: [
            'Get the crew inducted and the SWMS signed off before the start date. Two tasks cover it.',
            'Move the card to In Progress on the first morning.',
          ],
          means: 'PO in hand. Programme, access, inductions, SWMS, materials.',
          exits: 'Crew starts', stalls: 'On the date',
          intro: 'A house job goes from accepted to scheduled. An industrial job needs inductions, SWMS sign-off, access arrangements and often a staged programme before anyone turns up. That work is real, it takes weeks, and hiding it inside "Scheduled" would make the board lie about where the job is. The email carries the programme and the documents and asks for four things back, the last of which matters more than it sounds: the area has to be clear of other trades during application and cure.',
          groups: [{ title: 'Already sent on the PO', messages: ['C-MOB-01'] }],
          alerts: [],
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
          ],
          automation: ['job_start_date, job_end_date, crew_assigned and a site contact set on the card.'],
        },
        {
          key: 'in-progress', n: 11, name: 'In Progress', headline: 'Staged works',
          clientDo: [
            'Each site morning the site contact gets a text. Nothing to do.',
            'On Fridays, send the progress update from the template. Fill in the three lines.',
            'Photos and signed variations on the card at the end of each stage.',
          ],
          means: 'On site, possibly in stages over weeks.',
          exits: 'Works complete', stalls: 'Per the programme',
          intro: 'A text to the site contact each morning the crew is on site, naming the lead on the day. On staged jobs, a weekly progress email on Fridays from a template, filled in by hand, because an automated progress report is a report nobody reads. Photos and variations are captured as they happen, per stage, not reconstructed at the end.',
          groups: [{ title: 'Each site day', messages: ['C-SITE-01'] }, { title: 'Fridays, staged jobs', messages: ['C-PROG-01'] }],
          alerts: [],
          tasks: [
            {
            title: 'UPDATE {{contact.first_name}}: weekly progress',
            desc:
              'Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week\u2019s photos.',
            role: 'OWNER',
            due: 'Every Friday while live',
          },
            {
            title: 'PHOTOS {{opportunity.site_address}}: this stage',
            desc:
              'Photograph each completed stage before moving on. On a staged job the photos are the evidence behind the progress claim, so they are needed at the end of every stage, not at the end of the job.',
            role: 'CREW_LEAD',
            due: 'End of each stage',
          },
            {
            title: 'VARIATIONS {{opportunity.site_address}}: record and get signed',
            desc:
              'Record every variation agreed on site and get it signed the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.',
            role: 'CREW_LEAD',
            due: 'As they happen',
          },
          ],
          automation: ['Variations go on the card as they are agreed, with a signature, so the claim never surprises anyone.'],
        },
        {
          key: 'invoicing', n: 12, name: 'Invoicing', headline: 'Progress claims',
          clientDo: [
            'Issue each claim and put its number on the card.',
            'When the works are complete, move the card to Invoicing. The close-out pack goes by itself.',
            'Move to Paid & Closed only when the last claim is paid.',
          ],
          means: 'Progress claims or the final invoice are out.',
          exits: 'Final payment received', stalls: '30 days',
          intro: 'Invoicing, not Invoiced. Large jobs bill in progress claims, so the stage holds until the final payment lands rather than assuming one invoice. On completion the close-out pack goes out from Glenn with photos by area, product data, SWMS, insurances and itemised variations, and the final claim follows separately from the business, the same separation as residential.',
          groups: [{ title: 'Per the programme', messages: ['C-PAY-01'] }, { title: 'On completion', messages: ['C-DONE-01'] }],
          alerts: [],
          tasks: [
            {
            title: 'CLAIM {{opportunity.site_address}}: issue per programme',
            desc:
              'Issue the progress claim for the completed stage, put its invoice number on the card, and attach the photos and any sign-offs.',
            role: 'OFFICE',
            due: 'Per milestone',
          },
            {
            title: 'CHASE {{contact.first_name}}: claim overdue',
            desc:
              'Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.',
            role: 'OFFICE',
            due: 'Day 30',
          },
          ],
          automation: ['Each claim gets its own invoice_number. The stage holds until the last one is paid.', 'Needs Glenn: payment terms, and whether claims follow a percentage, a milestone, or a monthly cycle.'],
        },
        {
          key: 'paid-closed', n: 13, name: 'Paid & Closed', headline: 'Close-out',
          clientDo: [
            'Nothing. The thank-you and the reference request go the next day.',
            'Record their answer on the reference task.',
          ],
          means: 'Final payment in. Done.',
          exits: 'Closes the card', stalls: '',
          intro: 'No review request on the commercial board. A facilities manager is not going to leave a Google review, and asking makes the business look like it does not know its customer. What is worth asking for is a reference: a phone call to a future client of similar scale. And a reminder that the specification and site notes are kept, so a second stage or another site can be scoped without starting again.',
          groups: [{ title: 'The day after', messages: ['C-CLOSE-01'] }],
          alerts: [10],
          tasks: [{
            title: 'REFERENCE {{contact.first_name}}: ask, and record the answer',
            desc:
              'Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager\u2019s word is worth more on a tender than any number of homeowner reviews.',
            role: 'OWNER',
            due: 'Day 7',
          }],
          automation: ['Attribution survives to here, so paid commercial revenue can be reported by source.'],
        },
      ],
    },
  ],

  /* ------------------------------------------------------------ always on */
  alwaysOn: {
    key: 'always-on', name: 'Always on', headline: 'Whatever stage the card is in',
    clientDo: [
      'Missed a call? The caller gets a text within a minute. Ring them back within 30 minutes. There is a task.',
      'A customer replies? Everything automatic pauses for them. Answer from the app, not your own phone, so the conversation stays on the card.',
      'Someone texts STOP? They come off marketing automatically. Nothing for you to do.',
    ],
    intro: 'Two messages and four alerts run regardless of where anyone is in either pipeline. The missed-call text-back is the single highest-value automation in the whole build: for a trade business where the phone rings while someone is up a ladder, it is the difference between a lead and a competitor\'s lead. The out-of-hours reply sets an expectation instead of leaving a text unanswered until morning.',
    groups: [{ title: 'The phone', messages: ['SYS-01'] }, { title: 'Out of hours', messages: ['SYS-02'] }],
    alerts: [2, 3, 10, 11],
    tasks: [
      {
            title: 'RING BACK {{contact.first_name}}: missed call',
            desc:
              'A call came in and nobody answered. The caller already has a text saying you will ring back, so this is a promise with your name on it.',
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
    automation: ['Any inbound reply, on any channel, pauses every outbound sequence on that contact until a human has looked at it.', 'STOP on any SMS sets do-not-SMS on the contact. The platform handles it natively, but the wording still has to be in every marketing message.', 'A weekly reconciliation compares website submissions with opportunities created. A mismatch fires the automation failure alert.'],
  },

  /* ------------------------------------------------------------- policies */
  quietHours: [
    { when: 'Monday to Friday, 7am to 6pm', alerts: 'All', tasks: 'Normal', customer: 'Normal' },
    { when: 'Saturday, 8am to 2pm', alerts: 'Critical only: 1, 2, 6, 10, 11', tasks: 'Held', customer: 'Held' },
    { when: 'Outside those hours', alerts: 'None', tasks: 'Held', customer: 'Held to the next window' },
    { when: 'Sunday and public holidays', alerts: 'None', tasks: 'Held', customer: 'Held' },
  ],

  compliance: [
    { title: 'Transactional against marketing', body: 'Every message is tagged. TRANS is about an enquiry, appointment or job the person already has with us: no marketing consent needed and no unsubscribe required, though the sender is always identified. MKTG is promotional: it sends only when the person ticked the box on the form, and it always carries a working unsubscribe.' },
    { title: 'What the person actually agreed to', body: 'The form stores the exact consent wording, its version, the time and the page, and the CRM keeps that on the contact. Under the Spam Act 2003 the evidence is what someone was shown, not what the current form says, so it is never overwritten by a later submission.' },
    { title: 'Every SMS identifies the sender', body: 'The sign-off appears on every text. An unidentified SMS is the most common Spam Act failure and the easiest to avoid.' },
    { title: 'Send window', body: 'Outbound customer messages send between 8am and 8pm, Monday to Saturday, local time. Confirmations send immediately because the person is waiting for them. Chases and reminders wait for the window. The Do Not Call standard governs telemarketing calls rather than SMS to someone who enquired, so this is policy rather than law, and it exists because a 6am quote chase costs more goodwill than it earns.' },
    { title: 'Call recording', body: 'If assistant calls are recorded, callers are told at the start of the call. Victoria\'s rules on recording private conversations are strict, so this is a script requirement rather than a nice to have.' },
    { title: 'No numbers over the phone', body: 'Nothing in the journey states a price, a lead time or a performance figure that has not been substantiated. The assistant is barred from quoting for the same reason: spray foam cannot be priced without seeing the building, so any number given on a call is either wrong or becomes a commitment.' },
  ],

  buildOrder: [
    { ids: 'SYS-01', why: 'Missed call text-back. Highest return of anything here.' },
    { ids: 'X-ACK-01, X-ACK-02', why: 'The two minute acknowledgement.' },
    { ids: 'X-CHASE-01 to 04', why: 'The chase, with its honest close.' },
    { ids: 'X-APPT-01 to 06', why: 'So phone calls stop being no-shows.' },
    { ids: 'X-BOOK, R-ASSESS, R-QUOTING-01', why: 'From the call to the quote.' },
    { ids: 'R-QUOTE, R-FU-01 to 04, LOST-01', why: 'The follow-up that converts quotes, and the goodbye.' },
    { ids: 'X-WON, DEP-01, JOB, PAY', why: 'The delivery half.' },
    { ids: 'REV-01', why: 'The review ask.' },
    { ids: 'NUR-01 to 03, REV-02, REV-03', why: 'Once there is a consented list worth mailing.' },
    { ids: 'The commercial set', why: 'Last. That board moves slowly enough that a human writing the email is still viable.' },
  ],

  /* ---------------------------------------------------------- agency only */
  /* Everything below renders on agency.html and in the generated CRM
     documents. None of it appears on the client page. */

  reuseSteps: [
    'Create the custom values on the new sub-account and fill them in. That table is the whole template mechanism.',
    'Create the custom fields below. The website webhook keys are fixed; map them on the way in.',
    'Import the messages. Anything tagged Core works unchanged for any trade or service business.',
    'Rewrite only the messages tagged Trade specific. They name the product or the physical work, so they cannot be tokenised without turning into mush.',
    'Replace the sample customers in the data file so previews read right for the new trade.',
    'Run npm run docs:crm. The checker fails on any missing sample value, any email without a preheader, and any agency wording in text the client reads.',
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
        ['postcode', 'Postcode', 'Text', ''],
        ['street, suburb', 'Street, suburb', 'Text', 'Optional on the form'],
        ['enquiry_message', 'Enquiry message', 'Multi-line', ''],
        ['phone_raw', 'Phone as typed', 'Text', 'Phone itself arrives in E.164, which is what the CRM matches a person on'],
        ['company', 'Company', 'Text', 'Commercial contacts. Asked on the scoping call.'],
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
      note: 'Not from the website. Set by workflows.',
      columns: ['Key', 'Label', 'Type', 'Set by'],
      rows: [
        ['contact_attempts', 'Contact attempts', 'Number', 'The chase, incremented per attempt'],
        ['last_attempt_at', 'Last attempt', 'Date', 'The chase'],
        ['preferred_contact', 'Preferred contact', 'Dropdown: call, sms, email', 'Asked on the consult'],
        ['do_not_sms', 'Do not SMS', 'Checkbox', 'Manual, on request, and by STOP'],
      ],
    },
    {
      group: 'Opportunity fields',
      note: 'product_type is the one field here that is genuinely trade-specific. For another client it becomes whatever their equivalent choice is.',
      columns: ['Key', 'Label', 'Type', 'Stage it is set'],
      rows: [
        ['site_address', 'Site address', 'Text', 'Qualified'],
        ['access_notes', 'Access notes', 'Multi-line', 'Assessment'],
        ['sqm_estimate', 'Area, sqm', 'Number', 'Assessment'],
        ['product_type', 'Product', 'Dropdown: open cell, closed cell, both', 'Assessment'],
        ['assessment_date', 'Assessment date', 'Date', 'Assessment Booked'],
        ['proposal_due_date', 'Proposal due', 'Date', 'Specifying (commercial)'],
        ['quote_number', 'Quote number', 'Text', 'Quoting'],
        ['quote_sent_at', 'Quote sent', 'Date', 'Quote Sent'],
        ['deposit_amount', 'Deposit amount', 'Monetary', 'Won, where a deposit applies'],
        ['deposit_received_at', 'Deposit received', 'Date', 'Scheduled'],
        ['job_start_date, job_end_date', 'Job dates', 'Date', 'Scheduled'],
        ['crew_assigned', 'Crew', 'Text', 'Scheduled'],
        ['variation_amount', 'Variations', 'Monetary', 'In Progress'],
        ['photos_captured', 'Photos captured', 'Checkbox', 'In Progress. Required before Invoiced.'],
        ['invoice_number, invoice_sent_at', 'Invoice', 'Text, Date', 'Invoiced'],
        ['po_number', 'Purchase order', 'Text', 'Commercial, on Won'],
        ['lost_reason', 'Lost reason', 'Dropdown', 'On Lost'],
      ],
    },
  ],

  goLive: [
    'Every workflow has an error branch that alerts, so failures are not silent',
    'Round robin set on New Enquiry, and no path leaves a lead unassigned',
    'Escalation resolves to a second person, not back to the same one',
    'Quiet hours applied to outbound customer messaging, not just internal',
    'Every sequence has a stop condition on reply',
    'Setting status Won kills every sales sequence on the card',
    'Human labels stored in the dropdown fields, so echoed emails do not read "new-build"',
    'SPF and DKIM on the sending domain, and a test email checked in Gmail and Outlook',
    'Every merge field confirmed against the platform version, with a test sent to yourself',
    'Alert volume measured after week one. More than about fifteen a day to one person means something is wrong',
    'A test lead pushed end to end through both boards, watching what arrives and when',
  ],

  /* ------------------------------------------------------------ workflows */
  /* Every automation to build, in the platform's own building blocks.
     Step types: do, send, task, alert, wait, if, move, set, stop.
     `send` references a message id, `alert` an alert number, `task` a task
     from the stage it belongs to. The agency page and CRM-WORKFLOWS.md render
     this list. */
  workflows: [
    {
      id: 'WF-01', name: 'Website lead intake', board: 'both',
      trigger: 'Inbound webhook from the website quote form',
      why: 'Everything downstream depends on this one being right: the contact, the consent record, the attribution, and which board the card lands on.',
      steps: [
        { t: 'do', text: 'Find or create the contact on phone (E.164), then email. Never create a duplicate for a repeat enquirer.' },
        { t: 'do', text: 'Map the fields. Store human labels in the dropdowns (Home, not home). Map the webhook field stage to building_stage.' },
        { t: 'do', text: 'Append the consent record: consent_marketing, consent_text, consent_at, consent_page. Never overwrite an earlier one.' },
        { t: 'do', text: 'Write attribution. First-touch fields only if empty. Last-touch fields always.' },
        { t: 'if', cond: 'property_type is Factory or warehouse, or Farm or agricultural, or the message mentions a tender, a builder, a head contractor, or an area over 500 sqm', then: [
          { t: 'do', text: 'Create the opportunity on Commercial & Industrial at New Enquiry, assigned to OWNER.' },
          { t: 'alert', n: 6 },
          { t: 'send', id: 'X-ACK-01' },
          { t: 'send', id: 'C-ACK-01' },
        ], else: [
          { t: 'do', text: 'Create the opportunity on Residential at New Enquiry. Round robin assignment. property_type Something else adds a review task.' },
          { t: 'alert', n: 1 },
          { t: 'send', id: 'X-ACK-01' },
          { t: 'send', id: 'X-ACK-02' },
        ] },
        { t: 'task', title: 'CALL {{contact.first_name}}: new enquiry', desc: 'Ring the new enquiry. The acknowledgement text and email have already gone, so this is the first human contact. If it is a job worth having, move the card to Qualified. If you cannot reach them, log the attempt and the chase takes over.', role: 'Assigned user', due: '1 hour' },
        { t: 'do', text: 'Start WF-02, the unattended lead ladder.' },
      ],
      stops: 'Sends once per submission.',
      error: 'Any failed step: alert 11 to OWNER with the payload, and the submission logged for replay. The website already tells the visitor if the post fails, so this covers everything after the post succeeded.',
    },
    {
      id: 'WF-02', name: 'Unattended lead ladder', board: 'both',
      trigger: 'Opportunity created in New Enquiry',
      why: 'Time to first contact is the one number that moves everything else. This is what makes an untouched lead impossible to ignore.',
      steps: [
        { t: 'wait', for: '15 minutes, business hours only' },
        { t: 'if', cond: 'still in New Enquiry', then: [{ t: 'do', text: 'In-app reminder to the assigned user.' }] },
        { t: 'wait', for: 'until 60 minutes' },
        { t: 'if', cond: 'still in New Enquiry', then: [{ t: 'alert', n: 7 }, { t: 'do', text: 'Reassign to OFFICE (to OWNER on the commercial board).' }] },
        { t: 'wait', for: 'until 4 hours' },
        { t: 'if', cond: 'still in New Enquiry', then: [{ t: 'do', text: 'SMS to OWNER: this lead has been sitting since {{time}}.' }] },
        { t: 'do', text: 'From the next morning, listed under Leads unattended in the daily digest until it moves.' },
      ],
      stops: 'The moment the stage changes. The clock pauses outside business hours, so an 11pm enquiry starts at 7am.',
    },
    {
      id: 'WF-03', name: 'The chase', board: 'both',
      trigger: 'Stage changed to Contacting',
      why: 'Five attempts over seven days, then an honest close. Capped, so a card never rots here.',
      steps: [
        { t: 'send', id: 'X-CHASE-01' },
        { t: 'task', title: 'CALL {{contact.first_name}}: attempt 2', desc: 'Second call attempt. Try a different time of day from the first. Log it on the card either way, so the chase knows where it is up to.', role: 'Assigned user', due: 'Day 1' },
        { t: 'wait', for: '2 days' },
        { t: 'send', id: 'X-CHASE-02' },
        { t: 'task', title: 'CALL {{contact.first_name}}: attempt 3', desc: 'Third call attempt. If the phone is not working, reply to their enquiry email instead and note it on the card.', role: 'Assigned user', due: 'Day 2' },
        { t: 'wait', for: 'until day 4' },
        { t: 'send', id: 'X-CHASE-03' },
        { t: 'task', title: 'CALL {{contact.first_name}}: attempt 4', desc: 'Fourth call attempt. They have had two texts and an email by now, so keep it short: you are ringing about their enquiry and can talk whenever suits.', role: 'Assigned user', due: 'Day 4' },
        { t: 'wait', for: 'until day 7' },
        { t: 'send', id: 'X-CHASE-04' },
        { t: 'task', title: 'CALL {{contact.first_name}}: final attempt', desc: 'Last call before the card is closed as Unreachable. The honest close email goes the same day and it is the one people answer, so check for a reply before closing.', role: 'Assigned user', due: 'Day 7' },
        { t: 'wait', for: '1 day' },
        { t: 'if', cond: 'still in Contacting', then: [{ t: 'set', field: 'status', value: 'Lost, reason Unreachable' }] },
      ],
      stops: 'Customer replies on any channel, an appointment is booked, or the stage changes. Each call attempt increments contact_attempts and stamps last_attempt_at.',
    },
    {
      id: 'WF-04', name: 'Phone consult booked', board: 'both',
      trigger: 'Appointment booked in the phone consult calendar',
      why: 'Confirm, remind twice, and make sure the person who calls has read the enquiry.',
      steps: [
        { t: 'do', text: 'Remove the contact from WF-03. A booking pauses the chase.' },
        { t: 'send', id: 'X-APPT-01' },
        { t: 'send', id: 'X-APPT-02' },
        { t: 'alert', n: 4 },
        { t: 'wait', for: 'until 24 hours before the appointment' },
        { t: 'send', id: 'X-APPT-03' },
        { t: 'wait', for: 'until 2 hours before' },
        { t: 'send', id: 'X-APPT-04' },
      ],
      stops: 'Appointment cancelled or rescheduled, which hands over to WF-05.',
    },
    {
      id: 'WF-05', name: 'Consult changed, cancelled or missed', board: 'both',
      trigger: 'Appointment status changed: rescheduled, cancelled, or no-show',
      why: 'A hole in the diary is recoverable if it is caught early.',
      steps: [
        { t: 'if', cond: 'rescheduled', then: [{ t: 'send', id: 'X-APPT-06' }, { t: 'do', text: 'WF-04 restarts against the new time.' }] },
        { t: 'if', cond: 'cancelled', then: [{ t: 'send', id: 'X-APPT-06' }, { t: 'alert', n: 5 }, { t: 'do', text: 'Restart WF-03 from attempt 2.' }] },
        { t: 'if', cond: 'no-show', then: [{ t: 'send', id: 'X-APPT-05' }, { t: 'do', text: 'Restart WF-03 from attempt 2.' }] },
      ],
      stops: 'Sends once per change.',
    },
    {
      id: 'WF-06', name: 'Qualified', board: 'residential',
      trigger: 'Stage changed to Qualified',
      why: 'The deal becomes real here. A forecast value is set and the customer is pointed at the assessment calendar.',
      steps: [
        { t: 'do', text: 'Remove from WF-03.' },
        { t: 'set', field: 'opportunity value', value: 'the default estimate for the property type: one day of floor work for a house floor, the full-house band for a whole home' },
        { t: 'send', id: 'X-BOOK-01' },
        { t: 'send', id: 'X-BOOK-02' },
        { t: 'task', title: 'BOOK {{contact.first_name}}: assessment', desc: 'Get the site assessment in the diary. They have a booking link by text and email, so check whether they have used it before ringing. Confirm the address, who will be home, and access to the areas being sprayed.', role: 'OFFICE', due: '3 days' },
      ],
      stops: 'Assessment booked.',
    },
    {
      id: 'WF-07', name: 'Assessment or inspection booked', board: 'both',
      trigger: 'Appointment booked in the assessment calendar, or stage changed to Assessment Booked / Inspection Booked',
      why: 'One confirmation with the address, one text on the morning, and a task for whoever is going.',
      steps: [
        { t: 'set', field: 'assessment_date', value: 'from the appointment' },
        { t: 'if', cond: 'residential', then: [
          { t: 'send', id: 'R-ASSESS-01' },
          { t: 'task', title: 'ATTEND {{contact.first_name}}: assessment', desc: 'Get the site assessment in the diary. They have a booking link by text and email, so check whether they have used it before ringing. Confirm the address, who will be home, and access to the areas being sprayed.', role: 'ESTIMATOR', due: 'On the date' },
          { t: 'wait', for: 'until 7:00am on the day' },
          { t: 'send', id: 'R-ASSESS-02' },
        ], else: [
          { t: 'send', id: 'C-INSP-01' },
          { t: 'task', title: 'ATTEND {{opportunity.site_address}}: inspection', desc: 'Attend the visit. Before you leave, record on the card: the area in square metres, the foam type, access notes, and anything that will slow the crew down. Photos of problem areas help the quote.', role: 'OWNER', due: 'On the date' },
          { t: 'wait', for: 'until 24 hours before' },
          { t: 'send', id: 'X-APPT-03' },
        ] },
      ],
      stops: 'Cancelled or moved, which sends X-APPT-06 and re-queues the morning text against the new date.',
    },
    {
      id: 'WF-08', name: 'Quote clock', board: 'both',
      trigger: 'Stage changed to Quoting (residential) or Specifying (commercial)',
      why: 'A quote that takes a week loses jobs that were won on the day. The customer is told the deadline and the estimator carries it.',
      steps: [
        { t: 'if', cond: 'residential', then: [
          { t: 'send', id: 'R-QUOTING-01' },
          { t: 'task', title: 'QUOTE {{contact.first_name}}: {{opportunity.site_address}}', desc: 'Write and send the quote within two business days. The customer has been told that, so it is a promise. Put the quote number and the figure on the card, attach the document, then move the card to Quote Sent.', role: 'ESTIMATOR', due: '2 days' },
          { t: 'wait', for: '2 business days' },
          { t: 'if', cond: 'still in Quoting', then: [{ t: 'do', text: 'Listed under Quotes overdue in the daily digest until it moves.' }] },
        ], else: [
          { t: 'send', id: 'C-SPEC-01' },
          { t: 'task', title: 'SPEC {{opportunity.site_address}}: product, access, staging, WHS', desc: 'Work out product, thickness, access, plant, staging and WHS, and build the proposal. Five days. The customer has been given that date by email, so it is a commitment.', role: 'OWNER', due: '5 days' },
          { t: 'wait', for: '5 business days' },
          { t: 'if', cond: 'still in Specifying', then: [{ t: 'do', text: 'Listed under Proposals overdue in the daily digest.' }] },
        ] },
      ],
      stops: 'Stage changes. C-SPEC-01 needs proposal_due_date set on the card first; make the field required on entry.',
    },
    {
      id: 'WF-09', name: 'Quote sent and the follow-up', board: 'residential',
      trigger: 'Stage changed to Quote Sent',
      why: 'The follow-up that converts quotes: day 2, 5, 10, 21, then a decision. Never left sitting.',
      steps: [
        { t: 'set', field: 'quote_sent_at', value: 'now. The opportunity value is entered by hand with the quote.' },
        { t: 'send', id: 'R-QUOTE-01' },
        { t: 'send', id: 'R-QUOTE-02' },
        { t: 'task', title: 'CALL {{contact.first_name}}: quote follow up', desc: 'Ring two days after the quote went out. Ask whether it arrived and whether anything needs explaining. This one call converts more quotes than the whole automated sequence.', role: 'Assigned user', due: 'Day 2' },
        { t: 'wait', for: 'until day 2' },
        { t: 'send', id: 'R-FU-01' },
        { t: 'wait', for: 'until day 3' },
        { t: 'if', cond: 'still in Quote Sent', then: [{ t: 'move', stage: 'Follow-up' }] },
        { t: 'wait', for: 'until day 5' },
        { t: 'send', id: 'R-FU-02' },
        { t: 'wait', for: 'until day 10' },
        { t: 'send', id: 'R-FU-03' },
        { t: 'wait', for: 'until day 21' },
        { t: 'send', id: 'R-FU-04' },
        { t: 'task', title: 'DECIDE {{contact.first_name}}: close or nurture', desc: 'Twenty-one days with no decision. Close the card: Won if they accepted, Lost with a reason if they went elsewhere, or Nurture if it is a real job at the wrong time. Never leave it sitting.', role: 'Assigned user', due: 'Day 21' },
      ],
      stops: 'Customer replies, status set to Won or Lost, or the card leaves the Quote Sent and Follow-up stages.',
    },
    {
      id: 'WF-10', name: 'Proposal submitted and the review', board: 'commercial',
      trigger: 'Stage changed to Proposal Submitted',
      why: 'The commercial follow-up: slower, plainer, and it asks for a decision date.',
      steps: [
        { t: 'set', field: 'quote_sent_at', value: 'now. quote_number and the value entered by hand with the proposal.' },
        { t: 'send', id: 'C-PROP-01' },
        { t: 'task', title: 'CALL {{contact.first_name}}: confirm receipt', desc: 'Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.', role: 'OWNER', due: '2 days' },
        { t: 'wait', for: 'until day 7' },
        { t: 'send', id: 'C-PROP-02' },
        { t: 'if', cond: 'still in Proposal Submitted', then: [{ t: 'move', stage: 'Commercial Review' }] },
        { t: 'task', title: 'CHASE {{contact.first_name}}: decision date', desc: 'Ask for a decision date, not for a decision. It is an easier question to answer, and it tells you whether to hold capacity.', role: 'OWNER', due: 'Day 7, then day 21' },
        { t: 'wait', for: 'until day 21' },
        { t: 'send', id: 'C-PROP-03' },
      ],
      stops: 'Customer replies, or the card moves to Awaiting PO, Future Project, or Lost.',
    },
    {
      id: 'WF-11', name: 'Awaiting PO', board: 'commercial',
      trigger: 'Stage changed to Awaiting PO',
      why: 'A verbal award is visible and chased without being counted as committed work.',
      steps: [
        { t: 'send', id: 'C-PO-01' },
        { t: 'task', title: 'CHASE {{contact.first_name}}: PO', desc: 'Weekly chase for the purchase order. The job is verbally won but stays Open until the paperwork arrives, so this is the task that turns a promise into committed work.', role: 'OWNER', due: 'Weekly, recurring' },
      ],
      stops: 'PO received, which is when a human sets Won. Status stays Open until then.',
    },
    {
      id: 'WF-12', name: 'Lost', board: 'both',
      trigger: 'Status changed to Lost',
      why: 'A Lost with no reason teaches nothing. A graceful goodbye brings a surprising number of jobs back.',
      steps: [
        { t: 'do', text: 'Require lost_reason. The status change form does not close without one.' },
        { t: 'do', text: 'Stop every sequence on the card: WF-03, WF-04, WF-09, WF-10, WF-13.' },
        { t: 'task', title: 'LOG {{contact.first_name}}: lost reason', desc: 'Record why the job was lost, from the fixed list. It is the only thing that makes the board teach anything, and the split between Price and Chose batts points at two completely different fixes.', role: 'Assigned user', due: 'Same day' },
        { t: 'if', cond: 'residential, and the reason is not Unreachable, Duplicate or Spam', then: [{ t: 'wait', for: 'until the next business morning' }, { t: 'send', id: 'LOST-01' }] },
        { t: 'if', cond: 'reason is Timing and consent_marketing is yes', then: [{ t: 'do', text: 'Add the tag nurture, which starts WF-13.' }] },
      ],
      stops: 'Sends once.',
    },
    {
      id: 'WF-13', name: 'Nurture drip', board: 'both',
      trigger: 'Stage changed to Nurture or Future Project, or the tag nurture added',
      why: 'Right job, wrong time. Marketing, so consent-gated, with a permission reset at ninety days.',
      steps: [
        { t: 'if', cond: 'consent_marketing is not yes', then: [{ t: 'stop', when: 'immediately. No marketing without the tick.' }] },
        { t: 'if', cond: 'residential', then: [
          { t: 'wait', for: 'until the next business morning' },
          { t: 'send', id: 'NUR-01' },
          { t: 'wait', for: '30 days' },
          { t: 'send', id: 'NUR-02' },
          { t: 'wait', for: '60 days' },
          { t: 'send', id: 'NUR-03' },
          { t: 'task', title: 'REVIEW {{contact.first_name}}: still a fit?', desc: 'Quarterly review of the nurture list. Remove anyone who is not a real job, and move anyone who has come back to Qualified. A clean list keeps the emails landing in inboxes rather than in spam.', role: 'OWNER', due: 'Quarterly, recurring' },
        ], else: [
          { t: 'wait', for: '90 days, repeating' },
          { t: 'send', id: 'C-FUT-01' },
          { t: 'task', title: 'CHECK-IN {{contact.first_name}}: {{opportunity.site_address}}', desc: 'Quarterly check-in on a future-budget project. Offer to refresh the proposal against current material pricing, and ask which quarter to come back in if it has moved.', role: 'OWNER', due: 'Quarterly, recurring' },
        ] },
      ],
      stops: 'Any reply, booking or new form fill, which moves the card back to Qualified. Unsubscribe sets do-not-market and the card stays put.',
    },
    {
      id: 'WF-14', name: 'Won', board: 'both',
      trigger: 'Status changed to Won',
      why: 'Kills every sales sequence, thanks the customer, and hands the office its two tasks.',
      steps: [
        { t: 'do', text: 'Stop every sales sequence on the card: WF-03, WF-04, WF-09, WF-10, WF-11, WF-13. This is the rule that matters most on a merged board.' },
        { t: 'alert', n: 8 },
        { t: 'if', cond: 'residential', then: [
          { t: 'if', cond: 'deposit_amount is set', then: [
            { t: 'send', id: 'X-WON-01' },
            { t: 'send', id: 'X-WON-02' },
            { t: 'task', title: 'INVOICE {{contact.first_name}}: deposit', desc: 'Send the deposit invoice, on the jobs that take one. The amount is already on the card and the customer has been told to expect it. When the money lands, tick Deposit received, which confirms it to them and unblocks scheduling.', role: 'OFFICE', due: '1 day' },
          ], else: [
            { t: 'send', id: 'X-WON-01', note: 'the branch without line 1' },
            { t: 'do', text: 'SMS variant: "Thanks, we will confirm dates shortly."' },
          ] },
          { t: 'task', title: 'SCHEDULE {{contact.first_name}}: allocate crew and date', desc: 'Pick a start date, a finish date and a crew, put all three on the card, then move it to Scheduled. That sends the booking text and the preparation email by itself.', role: 'OFFICE', due: '3 days' },
        ], else: [
          { t: 'do', text: 'Require po_number on the status change form. Never Won on a verbal.' },
          { t: 'move', stage: 'Mobilising' },
          { t: 'send', id: 'C-MOB-01' },
          { t: 'task', title: 'MOBILISE {{opportunity.site_address}}: programme, inductions, SWMS, materials', desc: 'Purchase order received. Confirm the programme within two working days: start and finish dates, crew, site contact, induction dates and access windows, all on the card.', role: 'OWNER', due: '2 working days' },
        ] },
      ],
      stops: 'Sends once.',
    },
    {
      id: 'WF-15', name: 'Deposit received', board: 'residential',
      trigger: 'deposit_received_at set on the card',
      why: 'Silence after a payment is the thing customers hate most.',
      steps: [
        { t: 'send', id: 'DEP-01' },
        { t: 'alert', n: 9 },
        { t: 'do', text: 'Bring the SCHEDULE task forward to due now.' },
      ],
      stops: 'Sends once.',
    },
    {
      id: 'WF-16', name: 'Scheduled', board: 'residential',
      trigger: 'Stage changed to Scheduled',
      why: 'The booking, the preparation list, and the afternoon-before reminder.',
      steps: [
        { t: 'do', text: 'Require job_start_date, job_end_date and crew_assigned on entry.' },
        { t: 'send', id: 'JOB-01' },
        { t: 'send', id: 'JOB-02' },
        { t: 'task', title: 'CONFIRM {{contact.first_name}}: day before', desc: 'Quick check the afternoon before: access clear, pets sorted, somebody over eighteen home to let the crew in. The reminder text has gone; this is the call that catches what it does not.', role: 'OFFICE', due: 'Day before start' },
        { t: 'wait', for: 'until 4:00pm the day before job_start_date' },
        { t: 'send', id: 'JOB-03' },
      ],
      stops: 'If job_start_date changes, cancel the pending JOB-03 and re-queue it against the new date.',
    },
    {
      id: 'WF-17', name: 'Mobilising', board: 'commercial',
      trigger: 'Stage changed to Mobilising',
      why: 'The email already went with Won. This stage is two tasks that must be closed before the crew turns up.',
      steps: [
        { t: 'do', text: 'Require job_start_date, job_end_date, crew_assigned and a site contact on entry.' },
        { t: 'task', title: 'INDUCT crew: {{opportunity.site_address}}', desc: 'Get the crew inducted before the start date. Site inductions take longer than anyone plans for, and a crew turned away at the gate costs a full day.', role: 'CREW_LEAD', due: 'Before start' },
        { t: 'task', title: 'SWMS {{opportunity.site_address}}: issue and confirm receipt', desc: 'Ring two days after the proposal to confirm it arrived and reached the right person. Ask what shape procurement needs it in, before they have to ask you to reissue it.', role: 'OWNER', due: 'Before start' },
      ],
      stops: 'Stage changes to In Progress.',
    },
    {
      id: 'WF-18', name: 'In Progress', board: 'both',
      trigger: 'Stage changed to In Progress',
      why: 'The on-the-way text, and the two things that have to happen before the card can move on: photos and variations.',
      steps: [
        { t: 'if', cond: 'residential', then: [
          { t: 'send', id: 'JOB-04' },
          { t: 'task', title: 'PHOTOS {{opportunity.site_address}}', desc: 'Photograph the finished work from the app before leaving site, and tick Photos captured. The card cannot move to Invoiced without them. They go to the customer in the completion email, and they are the only real proof-of-work images the business has.', role: 'CREW_LEAD', due: 'On completion' },
          { t: 'task', title: 'VARIATIONS {{contact.first_name}}: record any extras', desc: 'Write down anything agreed on site that was not in the quote, with the amount, and put it on the card the same day. Left to invoicing, it surprises the customer.', role: 'CREW_LEAD', due: 'On completion' },
        ], else: [
          { t: 'wait', for: 'until 6:30am each site day between job_start_date and job_end_date' },
          { t: 'send', id: 'C-SITE-01' },
          { t: 'task', title: 'UPDATE {{contact.first_name}}: weekly progress', desc: 'Friday progress email from the saved template. Fill in three lines: what was completed this week, what is next, and what you need from them. Attach the week\u2019s photos.', role: 'OWNER', due: 'Every Friday while live' },
          { t: 'task', title: 'PHOTOS {{opportunity.site_address}}: this stage', desc: 'Photograph each completed stage before moving on. On a staged job the photos are the evidence behind the progress claim, so they are needed at the end of every stage, not at the end of the job.', role: 'CREW_LEAD', due: 'End of each stage' },
          { t: 'task', title: 'VARIATIONS {{opportunity.site_address}}: record and get signed', desc: 'Record every variation agreed on site and get it signed the same day. An unsigned variation on a commercial job is an argument waiting to happen at the final claim.', role: 'CREW_LEAD', due: 'As they happen' },
        ] },
        { t: 'do', text: 'Guard: the card cannot enter Invoiced or Invoicing unless photos_captured is ticked. Enforce it on the stage change, not with a reminder.' },
        { t: 'do', text: 'JOB-06 is a saved snippet in the mobile app, sent by hand. Not a workflow.' },
      ],
      stops: 'Stage changes.',
    },
    {
      id: 'WF-19', name: 'Invoiced and the payment chase', board: 'residential',
      trigger: 'Stage changed to Invoiced',
      why: 'Completion note and invoice go separately so the paperwork never dilutes the thank-you. Reminders stop dead on payment.',
      steps: [
        { t: 'do', text: 'Require invoice_number on entry. Stamp invoice_sent_at.' },
        { t: 'send', id: 'JOB-05', note: 'photos from the card attached' },
        { t: 'send', id: 'PAY-01', note: 'invoice attached' },
        { t: 'task', title: 'INVOICE {{contact.first_name}}: final', desc: 'Raise the final invoice, put the number on the card, and move it to Invoiced. The completion email with the photos and the invoice email go out separately by themselves.', role: 'OFFICE', due: '1 day' },
        { t: 'wait', for: 'until day 7' },
        { t: 'send', id: 'PAY-02' },
        { t: 'wait', for: 'until day 14' },
        { t: 'send', id: 'PAY-03' },
        { t: 'task', title: 'CHASE {{contact.first_name}}: payment overdue', desc: 'Fourteen days unpaid. Ring rather than email: most late invoices are a question, not a refusal. Mark it paid the moment the money lands, which stops the reminders dead.', role: 'OFFICE', due: 'Day 14' },
      ],
      stops: 'Invoice marked paid, or the card moves to Paid & Closed. A reminder sent after someone has paid does more damage than the reminder was worth.',
    },
    {
      id: 'WF-20', name: 'Invoicing, claims and close-out', board: 'commercial',
      trigger: 'Stage changed to Invoicing, and each time a claim is issued',
      why: 'Large jobs bill in progress claims, so the stage holds until the last one is paid.',
      steps: [
        { t: 'send', id: 'C-DONE-01', note: 'on entry, close-out pack attached' },
        { t: 'do', text: 'Each claim: set invoice_number on the card, tag claim-issued. That tag fires the next two steps.' },
        { t: 'send', id: 'C-PAY-01' },
        { t: 'task', title: 'CLAIM {{opportunity.site_address}}: issue per programme', desc: 'Issue the progress claim for the completed stage, put its invoice number on the card, and attach the photos and any sign-offs.', role: 'OFFICE', due: 'Per milestone' },
        { t: 'wait', for: '30 days from each claim' },
        { t: 'if', cond: 'that claim is unpaid', then: [{ t: 'task', title: 'CHASE {{contact.first_name}}: claim overdue', desc: 'Thirty days on an unpaid claim. Commercial payment runs are slow and usually fine, so ask the accounts contact where it sits in the run rather than chasing the site contact.', role: 'OFFICE', due: 'Day 30' }] },
      ],
      stops: 'The card moves to Paid & Closed when the final claim is paid. Payment terms still to confirm with Glenn.',
    },
    {
      id: 'WF-21', name: 'Paid & Closed', board: 'both',
      trigger: 'Stage changed to Paid & Closed',
      why: 'The most valuable stage on the board: review, referral, and a check-in a year out.',
      steps: [
        { t: 'if', cond: 'residential', then: [
          { t: 'wait', for: '1 day' },
          { t: 'send', id: 'REV-01' },
          { t: 'task', title: 'REVIEW {{contact.first_name}}: did they leave one?', desc: 'Check whether the Google review arrived. If it did, nothing to do. If it did not, leave it. The ask goes once, by text, and chasing reviews costs more goodwill than it earns.', role: 'OFFICE', due: 'Day 7' },
          { t: 'wait', for: 'until day 7' },
          { t: 'if', cond: 'consent_marketing is yes', then: [{ t: 'send', id: 'REV-02' }] },
          { t: 'wait', for: 'until 12 months' },
          { t: 'if', cond: 'consent_marketing is yes', then: [{ t: 'send', id: 'REV-03' }] },
        ], else: [
          { t: 'wait', for: '1 day' },
          { t: 'send', id: 'C-CLOSE-01' },
          { t: 'task', title: 'REFERENCE {{contact.first_name}}: ask, and record the answer', desc: 'Ask whether they would take a reference call from a future client of similar scale, and write the answer on the card. A facilities manager\u2019s word is worth more on a tender than any number of homeowner reviews.', role: 'OWNER', due: 'Day 7' },
        ] },
      ],
      stops: 'Runs to the end. The 12 month step is scheduled on entry so it survives everything else changing.',
    },
    {
      id: 'WF-22', name: 'Missed call text-back', board: 'both',
      trigger: 'Inbound call to the business number not answered',
      why: 'For a trade business where the phone rings while someone is up a ladder, the single highest-value automation on the list.',
      steps: [
        { t: 'if', cond: 'this number already got the text-back today', then: [{ t: 'stop', when: 'once per caller per day' }] },
        { t: 'do', text: 'Find or create the contact on the caller number.' },
        { t: 'send', id: 'SYS-01' },
        { t: 'alert', n: 2 },
        { t: 'task', title: 'RING BACK {{contact.first_name}}: missed call', desc: 'A call came in and nobody answered. The caller already has a text saying you will ring back, so this is a promise with your name on it.', role: 'OFFICE', due: '30 minutes' },
      ],
      stops: 'Once per caller per day.',
    },
    {
      id: 'WF-23', name: 'Out of hours reply', board: 'both',
      trigger: 'Inbound SMS outside office hours',
      why: 'Sets an expectation instead of leaving a text unanswered until morning.',
      steps: [
        { t: 'if', cond: 'this contact already got the reply today', then: [{ t: 'stop', when: 'once per contact per day' }] },
        { t: 'send', id: 'SYS-02' },
      ],
      stops: 'Once per contact per day, not once per message.',
    },
    {
      id: 'WF-24', name: 'Customer replied', board: 'both',
      trigger: 'Inbound SMS or email from a contact with an open opportunity',
      why: 'A reply is a live conversation. Nothing automatic should talk over it.',
      steps: [
        { t: 'do', text: 'Pause every outbound sequence on the contact: WF-03, WF-04 reminders, WF-09, WF-10, WF-13, WF-19.' },
        { t: 'alert', n: 3 },
        { t: 'task', title: 'REPLY {{contact.first_name}}: they messaged', desc: 'A customer has replied, so every automatic message to them has paused. Answer from the conversations screen in the app, not your own phone, so the reply sits on their card and the pause holds.', role: 'Assigned user', due: '1 hour' },
        { t: 'do', text: 'The sequences resume only when a human sends a reply from the platform and chooses to resume, never automatically.' },
      ],
      stops: 'Fires on every inbound message.',
    },
    {
      id: 'WF-25', name: 'STOP and unsubscribe', board: 'both',
      trigger: 'Inbound SMS reads STOP, or an email unsubscribe link is used',
      why: 'The platform handles most of this natively. This confirms what it does and adds the bit it does not.',
      steps: [
        { t: 'do', text: 'Native: STOP sets do-not-SMS on the contact. Unsubscribe sets do-not-email for marketing.' },
        { t: 'do', text: 'Add: remove the contact from WF-13, and leave the card where it is so a later enquiry is still recognised.' },
        { t: 'do', text: 'Transactional messages about a live job still send. That is lawful and expected; make sure the do-not-SMS flag is not wired to block them.' },
      ],
      stops: 'Immediate.',
    },
    {
      id: 'WF-26', name: 'Stalled card monitor', board: 'both',
      trigger: 'Scheduled, daily at 6:45am',
      why: 'Escalation toward visibility, not more alarms. A card stuck for forty days is a conversation to have on Monday, not an emergency.',
      steps: [
        { t: 'do', text: 'For every open card, compare time in stage with that stage\'s stall threshold from the pipeline design.' },
        { t: 'if', cond: 'over the threshold', then: [{ t: 'do', text: 'The stage task reappears at the top of the assigned user\'s list.' }] },
        { t: 'if', cond: 'over 2x the threshold', then: [{ t: 'do', text: 'Line item in the daily digest.' }] },
        { t: 'if', cond: 'over 3x the threshold', then: [{ t: 'do', text: 'Named in the weekly review, with the card.' }] },
      ],
      stops: 'Runs daily.',
    },
    {
      id: 'WF-27', name: 'Daily digest', board: 'both',
      trigger: 'Scheduled, 7:00am Monday to Saturday',
      why: 'Where everything that is not an emergency goes. NEEDS YOU last, because it is the section people act on.',
      steps: [
        { t: 'do', text: 'Email to OWNER and OFFICE: yesterday (enquiries, calls, quotes, won), today (assessments, jobs starting, calls booked), needs you (leads unattended, quotes and proposals overdue, follow-ups due, invoices overdue).' },
      ],
      stops: 'Runs daily.',
    },
    {
      id: 'WF-28', name: 'Weekly and monthly reports', board: 'both',
      trigger: 'Scheduled, Monday 7:00am and the 1st of the month',
      why: 'The forecast and the committed work are shown as two lines, never one, because the boards merge sales and delivery.',
      steps: [
        { t: 'do', text: 'Weekly to OWNER: enquiries by source, median time to first contact, enquiry to qualified, quotes sent, won, lost by reason, open value, won not yet delivered, cards stalled 3x, jobs completed, days won to paid, invoices outstanding.' },
        { t: 'do', text: 'Monthly to OWNER: cost per enquiry and per won job by utm_source, gclid and fbclid, against paid revenue.' },
        { t: 'do', text: 'Weekly reconciliation: count of website submissions against opportunities created. A mismatch fires alert 11.' },
      ],
      stops: 'Runs on schedule.',
    },
    {
      id: 'WF-29', name: 'Negative review or complaint', board: 'both',
      trigger: 'Review received under 4 stars, or the tag complaint added to a contact',
      why: 'Reputation decays fast. A same-day call fixes most of them.',
      steps: [
        { t: 'alert', n: 10 },
        { t: 'task', title: 'CALL {{contact.first_name}}: review or complaint, today', desc: 'Ring them today. Most unhappy customers are fixed by one call and almost none by silence, and a public reply written before you have spoken to them tends to make it worse. Any marketing to that contact is paused until the call has happened.', role: 'OWNER', due: 'Same day' },
        { t: 'do', text: 'Pause any marketing sequence on the contact until the call has happened.' },
      ],
      stops: 'Sends once per review or tag.',
    },
    {
      id: 'WF-30', name: 'Site visit cancelled or missed', board: 'both',
      trigger: 'Appointment in the assessment calendar cancelled or rescheduled, or marked no-show',
      why: 'A site visit that does not happen is the most expensive failure in the journey. Without this the card sits in Assessment Booked with nothing in the diary, and nobody is told.',
      steps: [
        { t: 'if', cond: 'rescheduled', then: [
          { t: 'send', id: 'X-APPT-06' },
          { t: 'do', text: 'WF-07 re-queues the morning text against the new date. The card stays where it is.' },
        ] },
        { t: 'if', cond: 'cancelled', then: [
          { t: 'alert', n: 5 },
          { t: 'if', cond: 'residential', then: [{ t: 'send', id: 'R-ASSESS-03' }, { t: 'send', id: 'R-ASSESS-04' }], else: [{ t: 'send', id: 'C-INSP-02' }] },
          { t: 'move', stage: 'Qualified, or Qualified / Scoping on commercial' },
          { t: 'task', title: 'REBOOK {{contact.first_name}}: {{custom_values.assessment_noun}} cancelled', desc: 'The visit came off the diary and the card has gone back to Qualified. A rebooking text and email have already gone. Ring if they have not picked a new time within a day: a cancelled site visit is usually a diary clash rather than a change of mind, and one call puts it straight back in.', role: 'OFFICE', due: '1 day' },
        ] },
        { t: 'if', cond: 'marked no-show', then: [
          { t: 'alert', n: 12 },
          { t: 'if', cond: 'residential', then: [{ t: 'send', id: 'R-ASSESS-05' }, { t: 'send', id: 'R-ASSESS-06' }], else: [{ t: 'send', id: 'C-INSP-03' }] },
          { t: 'move', stage: 'Qualified, or Qualified / Scoping on commercial' },
          { t: 'task', title: 'CALL {{contact.first_name}}: we could not get in today', desc: 'The crew went out and could not get access, so the visit cost half a day and produced nothing. Ring the same day. People are usually embarrassed and quick to rebook, and the longer it is left the more quietly the job dies.', role: 'Assigned user', due: 'Same day' },
        ] },
        { t: 'set', field: 'assessment_date', value: 'cleared on a cancel or a no-show, so the board never shows a visit that is not happening' },
      ],
      stops: 'Sends once per change. A reschedule does not move the card; a cancel or a no-show does.',
    },
  ],

  /* ---------------------------------------------- the client's own guide */
  guide: {
    principle: {
      title: 'You move the card. The system does the talking.',
      body: 'Every automatic message, reminder and alert in this journey is triggered by one thing: a card moving from one stage to the next on the board, or a status being set on it. Move the card when something real happens, a call made, a quote sent, a job booked, and everything that should follow, follows. Do nothing to a card and the system nudges you, then nudges harder.',
    },
    routine: [
      { when: '7:00am', what: 'The daily summary lands in your inbox. Read the NEEDS YOU section first. It lists the leads nobody has rung, the quotes over two days old, the follow-ups due and the invoices overdue.' },
      { when: 'Through the day', what: 'A short list of things can buzz your phone, and they are all below. Every one is a job to do in the next hour. Nothing else interrupts you.' },
      { when: 'Your task list', what: 'Each stage creates the tasks for that stage, with a due date. Tick them off as you go. Ticking a task does not move the card. Moving the card is the separate, deliberate act.' },
      { when: 'When a customer replies', what: 'Every automatic message to that person pauses. Answer from the app, not from your own phone, so the reply sits on their card and the pause holds until you say otherwise.' },
    ],
    alertActions: {
      1: 'Ring them within the hour. The acknowledgement text and email have already gone.',
      2: 'Ring them back within 30 minutes. They already have a text saying you will.',
      3: 'Read it and answer from the app. The automatic messages have paused for this person.',
      4: 'Read their enquiry before the call so it starts with what they told you.',
      5: 'A two-line personal note often saves the booking. The slot is open again.',
      6: 'Glenn rings them within the hour. Commercial goes to him, always.',
      7: 'Somebody else picks it up. The office has it now, and Glenn knows.',
      8: 'Send the deposit invoice if the job takes one, and pick a date and a crew.',
      9: 'Lock the date. The customer has been told you will within three business days.',
      10: 'Ring them today. Most of these are fixed by a call, and none of them by silence.',
      11: 'Ring Systemations. Something behind the scenes has stopped and leads may be vanishing.',
      12: 'Ring them the same day. If it was a site visit, half a day is already spent, and the rebooking text has gone but a call is what actually gets it back in the diary.',
    },
    howTo: [
      { title: 'Move a card', body: 'Open the board, drag the card to the next column, or open the card and change its stage. That single action is the trigger for everything automatic in this journey.' },
      { title: 'Set a job to Won', body: 'Open the card and set its status to Won. On residential, the moment they accept the quote. On commercial, when the purchase order arrives, and never on a verbal. Setting Won stops every quote chase on that card instantly.' },
      { title: 'Set a job to Lost', body: 'Status to Lost and pick the reason from the list: price, went with another contractor, chose batts, timing, outside the service area, not suitable, unreachable, not the decision maker, budget withdrawn, duplicate, spam. It takes five seconds and it is the only way the board ever tells you why jobs are lost.' },
      { title: 'Record a deposit', body: 'Put the deposit amount on the card when the quote is accepted, if the job takes one. When the money arrives, set Deposit received. The customer gets a one-line confirmation and the office gets told to lock the date.' },
      { title: 'Set the job dates', body: 'Start date, finish date and the crew go on the card, then move it to Scheduled. The booking text, the preparation email and the afternoon-before reminder all go by themselves. If the date changes, change it on the card and the reminder moves with it.' },
      { title: 'Photograph the finished work', body: 'From the app on site: open the card, add the photos, tick Photos captured. The card will not move to Invoiced without them, and they go to the customer in the completion email. They are also the only real proof-of-work images the business has.' },
      { title: 'Mark an invoice paid', body: 'When the money lands, mark the invoice paid and move the card to Paid & Closed. The payment reminders stop the moment you do, and the review request goes the next day.' },
      { title: 'Reply to a customer', body: 'Use the conversations screen in the app. Anything sent from there sits on the card and keeps the automatic messages paused. A text from your own phone does neither.' },
      { title: 'Book an assessment or inspection', body: 'From the card, book into the assessment calendar. The confirmation and the morning-of text go by themselves, and whoever is attending gets a task for the day.' },
      { title: 'Stop messages for someone', body: 'If a customer asks you to stop, set Do not contact on their record and every sequence stops. If they text STOP, it happens on its own and you do not need to do anything.' },
    ],
    never: [
      'Send a confirmation, a reminder, a quote chase, a payment reminder or a review request by hand. They all go by themselves, and a hand-sent one on top reads as nagging.',
      'Set Won on a verbal. Commercial jobs are Won on the purchase order and nothing else.',
      'Set Lost without a reason.',
      'Leave a card in Quoting past two days, or a new enquiry untouched past an hour. Both escalate, by design.',
      'Text a customer from your own phone. The card never sees it, so the automatic messages keep going as if nobody had spoken.',
    ],
    ifNothing: [
      { when: 'A new enquiry sits untouched', then: '15 minutes: a reminder. 1 hour: escalated to the office, and Glenn is told. 4 hours: Glenn again. Next morning: top of the summary until someone moves it.' },
      { when: 'Nobody answers after the first call', then: 'The chase runs by itself over seven days, text, email, text, email, then the card is closed as Unreachable. You only ring on the task days.' },
      { when: 'A quote goes quiet', then: 'Follow-ups on days 2, 5, 10 and 21, then a task to decide. The card never sits silently and it is never forgotten.' },
      { when: 'An invoice goes unpaid', then: 'A reminder at day 7, an overdue notice at day 14, then a task to chase. Both stop the moment you mark it paid.' },
      { when: 'A job is finished and paid', then: 'The review request goes the next day, the referral note a week later, the check-in a year on. Nothing to remember.' },
    ],
    ask: [
      'A message says something you would never say. Tell us the wording and we change it the same day.',
      'An alert fires for the wrong thing, or too often. More than about fifteen a day to one person means something is mis-set.',
      'A customer says they received a message they should not have.',
      'The morning summary stops arriving, or an enquiry from the website never appears on the board.',
    ],
  },
};
