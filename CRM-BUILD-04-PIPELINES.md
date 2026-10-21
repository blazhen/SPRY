# Build sheet 04: the two pipelines

The tools cannot edit pipelines or stages, so this is by hand: Opportunities, Pipelines. Edit both boards in place (keeps their IDs). Only 2 test opportunities exist (both on Residential, one in New Enquiry and one in Quoting), so renaming is safe. Do it after sheet 01.

Both boards end up with the same 14 stages, in this order, with these exact names:
1 New Lead, 2 Dial 1, 3 Dial 2, 4 Quoting, 5 Quote Sent, 6 Follow-Up, 7 Nurture, 8 Quote Accepted, 9 Inspection Required, 10 Booking Required, 11 Job Booked, 12 Deposit Requested, 13 Job Completed, 14 Retention Claim.

Board names stay: Residential, Commercial & Industrial.

## Residential (17 stages now)

Rename these (slot reuse, so nothing is created from scratch):
| Now | Becomes |
| --- | --- |
| New Enquiry | New Lead |
| Dialled | Dial 1 |
| Qualified | Dial 2 |
| Follow-up | Follow-Up |
| Deposit Sent | Deposit Requested |
| Assessment Booked | Inspection Required |
| Assessment No Show | Quote Accepted |
| Assessment Cancelled | Booking Required |
| Scheduled | Job Booked |
| Invoiced | Retention Claim |

Keep as they are: Quoting, Quote Sent, Nurture, Job Completed.
Delete: In Progress, Paid & Closed, Job Report.
Then drag into the order above.

## Commercial & Industrial (15 stages now)

| Now | Becomes |
| --- | --- |
| New Enquiry | New Lead |
| Contacting | Dial 1 |
| Qualified / Scoping | Dial 2 |
| Specifying | Quoting |
| Proposal Submitted | Quote Sent |
| Commercial Review | Follow-Up |
| Future Project | Nurture |
| Inspection No Show | Quote Accepted |
| Inspection Booked | Inspection Required |
| Inspection Cancelled | Booking Required |
| Mobilising | Job Booked |
| Awaiting PO | Deposit Requested |
| In Progress | Job Completed |
| Invoicing | Retention Claim |

Delete: Paid & Closed. Then drag into the order above.

## Settings on every stage

- Show in funnel and pie chart: on for all 14 on both boards.
- Win probability: leave blank. Forecast uses status, not probability (CRM-PIPELINES.md section 6).
- Do not add Won or Lost stages. Status carries it.

## After the edit

- Lost reasons: Settings, Opportunities, Lost Reasons (sheet 01 step 4).
- Saved view and dashboard "Whole pipeline": filter on the stage tags `stage-res-<key>` and `stage-com-<key>`. Build after the tags exist. If one list view cannot show both boards, use two smart lists on the tags (a fallback noted in the journey).
- The two test cards will show the new stage names. Leave them for testing.

## Check

Tell Dobby when done. It reads both boards and compares the 14 names and their order on each.
