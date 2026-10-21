# Build sheet 05: calendars, people, sending domain, links

By hand. Needs Glenn for the items marked GLENN. The tools cannot create or read these.

## Calendars (6)

| Calendar | Used by | Notes |
| --- | --- | --- |
| Phone call | WF-07, WF-08 | The 15 minute call booked from the day 4 email or the website. The website embeds it at the `booking_url` custom value. Reschedule and cancel links must be on. |
| Site inspection | WF-17, WF-18 | After acceptance, about one job in ten or twenty. Staff attend. |
| Install: InjectaCore rig | WF-20 | One calendar per vehicle. |
| Install: Van | WF-20 | |
| Install: Fuso truck | WF-20 | |
| Install: Mercedes rig | WF-20 | |

- Two-way sync with the Apple calendar. Bookings are made in the platform first.
- A multi-day job or two rigs means one booking per block, one in each calendar.
- Names follow the house style, number-free: `Phone call`, `Site inspection`, `Install: <vehicle>`.

## People

- OWNER and ESTIMATOR: Glenn Angus. Alerts reach him by SMS and email.
- OFFICE: Rachael Angus. Alerts reach her by email and in the app, never SMS.
- CREW_LEAD: set per job (the crew assigned on the install booking).
- Make the roles easy to change: in each workflow, assign to a user at build time and note which role it is.

## Sending domain (before go-live)

- Sender address: `info@sprayitsolutions.com.au` (the `business_email` custom value).
- Set up SPF and DKIM for the sending domain in the platform, and add the DNS records at the domain host. Until then the first email a customer gets may land in spam.
- Check with a test to a personal address and read the headers for pass.

## Numbers

- Business line 1300 177 729 is in `business_phone`. Rachael's mobile 0428 26 36 26 is in `contact_mobile`, confirmed by Glenn on 2 Oct.
- SMS sends from the account's own number. Confirm the number and that missed-call text-back (SYS-01) works with it.

## Links and triggers

- Trigger links for the Yes and No buttons in REM-01 to REM-04 and REM-06: `confirm_yes` and `confirm_no`, used by WF-22.
- Trigger link or short link for the Google review page (`review_url`, GLENN to supply the link).
- Quote tool: accept and decline buttons feed WF-12. Quote and proposal links go in `quote_link`.
- Xero connection: invoice sync. Test a GST invoice before promising it (only GST-free ones have been seen reaching Xero).

## Check

Tell Dobby when done. Dobby cannot read these, so the check is a test booking in each calendar and a test email for SPF and DKIM.
