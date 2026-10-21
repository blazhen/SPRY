# Pilot prompt for the platform's AI workflow builder: WF-05 Dial 1

How to use: in the Dev sub-account, open Automation, Workflows, create a new workflow with the AI builder, and paste the prompt below as it is. Do not publish. Open the result, compare it with the check list at the bottom, and tell Dobby what it got right and wrong. Dev only. Nothing here sends to a real person: the workflow stays in draft, and the test uses a made-up contact with your own phone number.

## Prompt to paste

Build a workflow called "WF-05 Dial 1: tried-to-call text". Keep it in draft.

Trigger: Pipeline Stage Changed. The stage changed to "Dial 1", on the pipeline "Residential" and also on the pipeline "Commercial & Industrial". Allow each contact to enter only once.

Steps, in this order:
1. Wait 10 seconds.
2. Send an SMS to the contact with this exact text: "Hi {{contact.first_name}}, we just tried to call about your {{custom_values.trade_noun}} enquiry. Reply here or ring {{custom_values.contact_mobile}} when it suits. {{custom_values.sms_signoff}}"
3. Update the contact custom field "Contact attempts": add 2 to its current value (if it is empty, set it to 2).
4. Update the contact custom field "Last attempt at" to today's date.
5. Create a task for the contact. Title: "CALL {{contact.first_name}}: second round of calls". Description: "Second round of calls, at a different time of day from the first. Ring twice back to back again. If they answer, move the card on as from New Lead. If not, move it to Dial 2, which starts the follow-up emails." Assign it to the contact's owner (or the user Rachael if there is none). Due at the end of today.

Workflow settings: stop the workflow for a contact when they reply to a message. Do not add any other steps.

## Check list for the result (tell Dobby what differs)

1. Trigger is a stage change to Dial 1, covering both pipelines, one entry per contact.
2. The wait is 10 seconds and sits before the SMS.
3. The SMS text matches word for word, with the merge tags intact (not replaced by sample text).
4. Contact attempts adds 2 and Last attempt at is set.
5. The task has the exact title and description and is due today.
6. "Stop on reply" is on.
7. The workflow is saved as draft, not published.
8. No extra steps were invented.

## Test, once the check list passes

Create a test contact with made-up details and your own phone, give it an opportunity in Dev, move it to Dial 1, and confirm the SMS arrives after about 10 seconds. The Dev account must not send real messages, so only do this with your own number and tell Dobby before you start.
