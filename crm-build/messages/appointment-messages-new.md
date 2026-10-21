# New appointment messages: phone call cancelled and no-show

## X-APPT-07 · Phone call cancelled email

- Channel: Email
- From: Rachael at SprayIT Solutions ({{custom_values.from_name_contact}})
- Subject: Your call has been cancelled
- Preview line: No problem. Pick a new time whenever it suits.
- Sent when: Phone call cancelled
- Timing: Immediately

Hi {{contact.first_name}},

Your call with us on {{appointment.start_time}} has been cancelled, so we will not ring you then.

If you would still like to talk through your {{custom_values.trade_noun}} enquiry, pick a new time that suits and we will call you then:

{{custom_values.booking_url}}

Or reply to this email, or ring {{custom_values.contact_mobile}}, whenever is convenient.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

## X-APPT-08 · Phone call cancelled text

- Channel: SMS
- Length: 173 characters before merge tags are filled in
- Sent when: Phone call cancelled
- Timing: Immediately

Your call with {{custom_values.business_short_name}} on {{appointment.start_time}} is cancelled. Want a new time? {{custom_values.booking_url}} {{custom_values.sms_signoff}}


## X-APPT-09 · Phone call no-show email

- Channel: Email
- From: Rachael at SprayIT Solutions ({{custom_values.from_name_contact}})
- Subject: We tried to call you, {{contact.first_name}}
- Preview line: We could not reach you at your booked time. Pick another one, it takes two clicks.
- Sent when: Phone call marked no-show (we rang at the booked time and could not reach them)
- Timing: Within an hour of the booked time

Hi {{contact.first_name}},

We rang you at your booked time, {{appointment.start_time}}, but could not reach you. That is fine, these things happen.

When would suit instead? Pick a new time here and we will ring you then:

{{custom_values.booking_url}}

Or reply with a day and a time, or ring {{custom_values.contact_mobile}} when you are free.

{{custom_values.contact_name}}
{{custom_values.business_name}}
{{custom_values.contact_mobile}}

## X-APPT-10 · Phone call no-show text

- Channel: SMS
- Length: 169 characters before merge tags are filled in
- Sent when: Phone call marked no-show (we rang at the booked time and could not reach them)
- Timing: Within an hour of the booked time

We tried to call you at {{appointment.start_time}} but could not get through. Pick a new time: {{custom_values.booking_url}} or reply here. {{custom_values.sms_signoff}}

