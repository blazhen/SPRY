# Invoice and estimate send-side test (Dev only, 30 Oct 2026)

Script: crm-build/tools/step22-invoice-send-test.mjs. Contact was ZZ-TEST with a made-up example.com email and no phone.
Every send used the email channel only. Run twice (first run found fixes); rows are in test-results.json, group S22.

## What works
| Call | Result |
|---|---|
| GET generate-invoice-number | 200 {invoiceNumber: "000013"}. Does not reserve the number |
| GET estimate/number/generate | 200 {estimateNumber: 7}. Integer, not reserved |
| GET invoices/settings | 200: reminderSettings, customNotification (per-event email/SMS/subject), productSettings, number prefixes |
| POST/GET/PUT/DELETE invoice template | 201/200/200/200. Deleted template reads back 404 |
| PATCH template payment-methods-configuration | 200 |
| POST invoice (draft), then POST send | send 201 "Email queued", invoice becomes status=sent, sentAt, sentBy, sentFrom, sentTo{email,phoneNo} |
| POST record-payment (cheque 5, then cash 15) | 201 each. partially_paid amountDue 15, then paid amountDue 0 |
| POST void on a sent unpaid invoice | 201, then GET reads 404 (voided invoices vanish from read) |
| POST text2pay with sentTo.email only | 201, returns invoice and invoiceUrl, status sent. No phone needed |
| POST estimate, PUT, send (email) | 201/200/201. estimateStatus=sent in the send response |

## Blocked or not tested
- Estimate to invoice: 400 estimate_not_accepted. The customer must accept the estimate first; no API accept call was found. Not tested past that.
- PATCH template late-fees-configuration: 422, needs a positive value and a type enum; enum values not found. Not tested further.
- GET /invoices/estimate/{id}: 404 (no such route). Read estimates through the list call.
- No card or payment provider was used. Manual record-payment needs no provider.

## What a template controls
Saved and returned: businessDetails (logoUrl, name, phoneNo, address, website, customValues), title, termsNotes (HTML),
invoiceNumberPrefix, items, discount, currency, paymentMethods (a card provider block per provider, enableBankDebitOnly),
attachments, tipsConfiguration, automaticTaxesEnabled, internal. Response also has configuration {precision} and
documentLayout (null by default).
Silently ignored, not stored: colour fields, header text, footer text, logo at top level, language, theme, due date
offset, payment terms. The API does not reject unknown fields, so a 201 does not prove a field is kept: read back.
Not accepted yet: lateFeesConfiguration and miscellaneousCharges need exact shapes.
So via the API: logo (businessDetails.logoUrl), business name, address, phone, website, title, terms, prefix, payment
methods. Colours, header and footer layout are not controllable here; documentLayout is the only layout hook and its
shape is unknown, so the look beyond that must be set in the platform's template screen by hand.
Notification wording (email subject and body, SMS) is set in invoices/settings customNotification, not in the template.

## Quirks
- Create invoice needs discount, businessDetails and a contact id plus name and email in contactDetails.
- Second record-payment within a few seconds returned 409 "already in progress"; wait about 5 s.
- Only drafts can be deleted. Sent unpaid invoices must be voided. Paid or part paid cannot be voided or deleted
  ("refund first"), even for a manual cash payment. A test payment cannot be undone through the API.
- Send needs userId, action (email), liveMode. A send creates a conversation for the contact with email messages and
  TYPE_ACTIVITY_INVOICE or TYPE_ACTIVITY_PAYMENT entries (9 messages after 4 sends and 2 payments).
  The conversation is created even for a contact with no phone.
- Rate limits: 100 requests per 10 s burst, 200000 per day.
- Whether sending fired workflows or staff notifications could not be seen from the API response.

## What the Hub needs for real
- Create: POST invoice (contactDetails id,name,email; items; discount; dueDate), then send with action email.
- Record payment: mode cash or cheque, card {}, cheque {number}, notes, amount; one call at a time; read back amountDue.
- Void: only after send and before any payment. Drafts are deleted, not voided.
- Estimate acceptance is a customer step; the Hub cannot convert a sent estimate itself.
- Payment provider: not needed for manual payment or send. Card payment via the invoice link needs a connected provider (not tested).

## Not cleaned up
Two ZZ-TEST invoices named "ZZ-TEST invoice A" remain in Dev (one paid, one partially paid, from the two runs) because
the platform will not void or delete invoices with a recorded payment. Zen can remove them in the screen or leave them.
