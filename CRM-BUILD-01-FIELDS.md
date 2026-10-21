# Build sheet 01: custom values, custom fields, lost reasons, tags

Phase 1 of CRM-BUILD-PLAN.md. All of this is done by hand in the platform screens (the connected tools cannot create or edit fields). Dobby reads the result back and ticks it off.
Read of the live account: 15 Oct 2026. Only 2 test opportunities and 4 test contacts exist, so no real data is at risk.

Rule used below: a field's key (the part after `contact.` or `opportunity.`) is fixed when the field is made and is what the messages and workflows refer to. If the live key already matches the journey, KEEP or RENAME the label. If the key differs, or the type is wrong, DELETE and CREATE again with the right key.

## Step 1. Custom values (24)

Settings, Custom Values. Create or correct all 24. Take the value from CRM-MESSAGING.md section 2. Fix this first: the live welcome text shows a blank business name, so `business_name` and `business_short_name` are probably empty or misnamed.

business_name, business_short_name, business_phone, business_phone_e164, contact_name, contact_first_name, contact_mobile, contact_mobile_e164, business_email, from_name_contact, from_name_brand, website_url, booking_url, quote_form_url, privacy_url, review_url, service_area, trade_noun, trade_verb, inspection_noun, consult_length, office_hours, quote_turnaround, sms_signoff.

Open: review_url is still a placeholder ("Google review link"); office_hours is "to confirm with Glenn". Dobby cannot read existing custom values: list yours and I will mark which to keep.

## Step 2. Opportunity fields

Create a field group per area to keep the screen tidy: Quote, Inspection and Booking, Job, Deposit and Invoice, Retention.

### Live opportunity fields (13): what to do

| Live label | Live key | Action | Why |
| --- | --- | --- | --- |
| Site Address | site_address | KEEP | Matches |
| Sqm Estimate | sqm_estimate | KEEP, rename label to "Area, sqm" | Matches |
| Quote Number | quote_number | KEEP | Matches |
| PO Number | po_number | KEEP, rename label to "Purchase order" | Matches |
| Deposit Amount | deposit_amount | KEEP | Matches (monetary) |
| Invoice Number | invoice_number | KEEP | Matches |
| Job End Date | job_end_date | KEEP, rename label to "Finish date" | Matches |
| Crew Assigned | crew_assigned | KEEP, rename label to "Crew" | Matches |
| Assessment Date | assessment_date | DELETE, then create inspection_date | Key differs |
| Job Start Date | job_start_date | DELETE, then create job_date | Key differs |
| Quote URL | quote_url | DELETE, then create quote_link (URL type) | Key and type differ |
| Claim Stage | claim_stage | DELETE | Not in the journey |
| Payment Terms | payment_terms | DELETE for now | Commercial payment terms are not settled; add back when Glenn confirms |
| Invoice URL | invoice_url | DELETE | Not in the journey; invoices live in the invoice tool |

### New opportunity fields to create (22)

| Key | Label | Type | Options |
| --- | --- | --- | --- |
| access_notes | Access notes | Multi-line text | |
| product_type | Product | Dropdown | Open cell, Closed cell, Both |
| callback_at | Callback time | Date and time | |
| quote_link | Online quote | URL | |
| quote_sent_at | Quote sent | Date | |
| accepted_quote_option | Accepted option | Text | |
| foam_order_type | Foam order | Dropdown | Stock open cell, Special order |
| inspection_date | Inspection date | Date | |
| job_date | Install date | Date | |
| vehicles_booked | Vehicles | Multi-select | InjectaCore rig, Van, Fuso truck, Mercedes rig |
| job_booked_at | Install booked on | Date | |
| job_confirmed | Date confirmed | Dropdown | Yes, No |
| deposit_due_date | Deposit due | Date | |
| deposit_invoice_sent_at | Deposit invoice sent | Date | |
| deposit_received_at | Deposit received | Date | |
| variation_amount | Variations | Monetary | |
| photos_captured | Photos captured | Checkbox | |
| invoice_sent_at | Final invoice sent | Date | |
| final_invoice_paid_at | Final invoice paid | Date | |
| job_report_sent_at | Job report sent | Date | |
| retention_amount | Retention held | Monetary | |
| retention_release_date | Retention release | Date | |

The journey's 31st opportunity field, `lost_reason`, is handled in Step 4 as the platform's own Lost Reason setting, not a custom field.

After this step: 8 kept plus 22 new = 30 opportunity fields.

## Step 3. Contact fields

### Live contact fields (7): what to do

| Live label | Live key | Action | Why |
| --- | --- | --- | --- |
| Building stage | building_stage | DELETE, create again as Dropdown | Type is Text, journey wants a dropdown |
| Areas to insulate | areas_to_insulate | DELETE, create `areas` | Key differs |
| Property type | property_type | DELETE, create again as Dropdown | Type is Text |
| Timeframe | timeframe | DELETE, create again as Dropdown | Type is Text |
| Contact Message | contact_message | DELETE, create `enquiry_message` | Key differs |
| Property Type (AI Separator) | property_type_ai_separator | DELETE (Zen, 15 Oct) | Not in the journey. Zen does not know what it is for. Before deleting, open it in the platform and check "used in" or search the workflows for it, in case one still points at it. |

If the platform blocks re-using a key right after deleting it, rename the old field first (add "-old" to its label), create the new one, then delete the old one.

### New contact fields to create (41 in total, grouped)

Group "Enquiry" (11):
| Key | Label | Type | Options |
| --- | --- | --- | --- |
| property_type | Property type | Dropdown | Home, New build, Shed or garage, Factory or warehouse, Farm or agricultural, Something else |
| building_stage | Building stage | Dropdown | Existing building (retrofit), Under construction, Still planning |
| areas | Areas to insulate | Text | |
| timeframe | Timeframe | Dropdown | As soon as possible, Next 1 to 3 months, 3 months or more, Just researching |
| heard_from | How did you hear about us | Dropdown | Google search, Google ad, Referral from a friend, builder or tradie, Facebook, Instagram or LinkedIn, Somewhere else |
| postcode | Postcode | Text | |
| street | Street | Text | |
| suburb | Suburb | Text | |
| enquiry_message | Enquiry message | Multi-line text | |
| phone_raw | Phone as typed | Text | |
| company | Company | Text | Use the platform's own Company name if the webhook maps to it |

Store the human label in each dropdown, not the form value. The form sends home, new-build and 1-3-months.

Group "Consent" (4): consent_marketing (Dropdown: yes, no), consent_text (Multi-line), consent_at (Date), consent_page (Text). Never overwritten on a later form fill.

Group "Attribution" (21), all Text except first_touch_at (Date): utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id, gclid, gbraid, wbraid, fbclid, msclkid, ttclid, first_touch_at, first_touch_referrer, first_touch_landing, last_touch_referrer, last_touch_landing, source, form_name, submitted_at, page_title.

Group "CRM" (5): contact_attempts (Number), last_attempt_at (Date), preferred_contact (Dropdown: call, sms, email), do_not_sms (Checkbox), ask_for_google_review (Dropdown: Yes, No, default Yes).

Note on the first and last name: they are the platform's own fields, not custom.

## Step 4. Lost reasons

Opportunities already carry a native Lost Reason (the opportunity data has a lost reason field). Use that instead of a custom field: Settings, Opportunities, Lost Reasons. Create these 12 exactly:
Price, Went with another contractor, Chose batts or another product, Timing project deferred, Outside service area, Not suitable for spray foam, Unreachable, Not the decision maker, Budget withdrawn, Cancelled after acceptance, Duplicate, Spam.

If the workflows cannot read the native reason, add the `lost_reason` dropdown with the same 12 options as a custom field. Decide when building WF-15.

## Step 5. Tags

Tags appear when first used, but create them now so names stay exact. Lowercase, hyphens.
- Source: from-website, from-phone, from-chat (set by the website assistant)
- Stage: stage-res-<key> and stage-com-<key> for the 14 stage keys (see CRM-PIPELINES.md section 2)
- History: been-enquired, been-contacted, been-quoted, been-accepted, been-booked, been-inspected, been-lost, been-customer, been-review-asked, been-reviewed
- State: is-active-job, is-nurturing, is-stalled, is-unresponsive, is-deposit-owing, is-retention-held, is-complaint, is-no-marketing
- Do-not: do-not-sms, do-not-email, do-not-market

Dobby cannot read the tag list. List the tags that exist and I will mark which to keep, rename or delete.

## Step 6. Check

When done, tell Dobby. It reads all fields back and compares: 30 opportunity fields, 41 contact fields, matching keys, types and options.
