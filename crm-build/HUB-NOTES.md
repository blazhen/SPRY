# Hub and CRM: working notes (30 Oct 2026)

For Claude and Zen. How everything works, what was proven, what was not. This folder is not committed. No token or secret in here.

## People and accounts
- Zen = Blazhen (CTO, builds). Dan = Director. Client: Glenn Angus (owner, quotes in HubSpot today) and Rachel (office). Both were on the latest call, probably on one shared microphone: the transcript labels all of it "Rachael Angus", so it cannot say which of them asked for what (Zen confirmed 30 Oct: Glenn is Glenn, Rachel is Rachel). Do not attribute a request to one of them without asking.
- Decided 30 Oct 2026 (Zen): the word is "Jobs".
- Dev sub-account: "SprayIT Solutions - Dev", location ID 5M1zrDbimF17cM16mtmR. All building and tests go here only.
- Live sub-account (Glenn's real one): read only, never write. The spray-crm connector in Claude is locked to live and currently fails to connect (401). Use it for reading only.
- Token: SPRY_CRM_TOKEN in `.env` (Dev only). Never print it. Updated by Zen on 30 Oct with all workflow scopes.

## How to run API scripts
- Scripts are in `crm-build/tools/stepNN-*.mjs`. Usage: `node <script> <api-base-url> <location-id> <.env path>`. Pass the address and location on the command line so the vendor name never lands in the repo. Every script refuses any location except Dev.
- Version header used: 2021-07-28 (works for reads and writes tested so far).
- Scripts to reuse: step2 (fields), step3 (values and tags), step13 (list workflows), step16 (probe workflow detail routes), step17 (read capability probe), step18 (list objects and associations), step19 (association write test with cleanup), step20 (Hub fields, tags, job update test).
- Windows tool quirk: commands whose path is built from a variable are blocked by the hook. Use literal paths.

## What the API can do (proven in Dev)
Read (HTTP 200): location, contacts, opportunities, pipelines, custom fields, custom values, tags, custom objects, associations, workflow LIST, calendars, users, conversations, email and SMS templates, invoices, estimates, products, forms, funnels, trigger links, campaigns, businesses, phone numbers.
Write, proven 30 Oct:
- Create contact, company (business), opportunity (job). Delete them.
- Update opportunity with PUT: stage (pipelineStageId), monetaryValue, customFields [{id, field_value}]. Read back matches.
- PUT /opportunities/{id}/status sets won, lost, open.
- Contact tags: POST /contacts/{id}/tags and DELETE with a body {tags:[...]}.
- Create custom fields (POST /locations/{L}/customFields with name, dataType, model) and tags (POST /locations/{L}/tags).
- Associations: GET /associations/ lists them. POST /associations/relations with {locationId, associationId, firstRecordId, secondRecordId}. Extra contacts on a job need `pipelineId` in the body too (error says "Pipeline ID is required for opportunity contact association"). Company link did not need it. GET /associations/relations/{recordId} reads links back. DELETE /associations/relations/{id} removes.
- Association keys in Dev: OPPORTUNITIES_CONTACTS_ASSOCIATION (system, main contact), OPPORTUNITIES_CONTACTS_ADDITIONAL_ASSOCIATION (extra contacts, first=contact, second=opportunity), BUSINESSES_OPPORTUNITIES_ASSOCIATION (first=business, second=opportunity), BUSINESSES_CONTACTS_ASSOCIATION.
- The opportunity object is labelled "Job" in Dev already.

## What is blocked or unknown
- Workflow API (create, edit, read steps): 403 "not enabled for location", a private beta enabled per sub-account by the vendor. Token scopes are fine. Vendor chat support (agent Rayne, 30 Oct) said it is not released and cannot be enabled. The vendor's changelog (19 Oct 2026) lists create and update endpoints, so it is real but gated. Retest now and then with step6b (tries a create) or step16. Until then workflows are built by hand or by the platform's Ask AI, using the prompts in `workflows/HUB-WORKFLOW-CHANGES.md` and the older AI-PROMPTS files.
- Untested: sending a message to an extra contact through the API, whether an API change fires a workflow trigger, how the menu link learns the account and user (docs cover URL variables and signed user data for custom pages, menu links unclear), whether the menu link shows in the mobile app, custom value and date merge format in templates.
- Media files route returned 422 on a bad probe (route exists); webhooks list path guessed wrong (404).

## Design in one paragraph
The Quote Hub is a web page added as a custom menu link. A small server (not built yet) holds the token and a database. The browser never sees the token. One Job (opportunity) can have a main contact, extra contacts and companies by associations. Each company or contact gets its own quote, held in the Hub database and grouped under the job. Hub Send writes fields (quote_number, quote_link, quote_sent_at, quote_revision, quote_valid_until, value) and moves the stage to Quote Sent, which fires the existing workflows that send the messages. Accept moves the stage to Quote Accepted (or tags hub-addon-accepted for an add-on and leaves the stage). When one company wins, the Hub marks the other quotes Superseded; the job is not Lost. WF-43 is deliberately unused. Full detail: `HUB-DESIGN.md`.

## Files
- `HUB-DESIGN.md`: the design, API status table, phases.
- `workflows/HUB-WORKFLOW-CHANGES.md`: changed and new workflows (WF-09 to 12, 14, 15 title, 41, 42, 44), fields and tags, R-QUOTE-03 and 04 wording, Ask AI prompts, tests, open questions.
- `../hub-mockup/index.html`: clickable mockup v2 (fake data, resets on reload).
- `../quote-builder/`: the earlier React app with mock data; has uncommitted edits by Zen. Not touched by this work.
- Older: CRM-BUILD-PLAN and 00 to 05 sheets, `workflows/WF-A,B,C` build sheets, `AI-PROMPT*` files, `test-tasks/` (ClickUp test tasks).

## State of Dev (30 Oct 2026)
- 43 workflows exist, none in folders. WF-00 to WF-09 (phone), WF-17 published; the rest drafts. Two named WF-09; one called "WF-01 · New Enquiry | Messaging". Needs tidy by hand.
- New today: opportunity fields quote_revision, quote_valid_until, quote_accepted_at; tags hub-addon-accepted, hub-quote-revised, hub-quote-expired, in-quote-queue.
- Test records ZZ-TEST were created and deleted in tests; none should remain.

## Facts from the call (key ones)
Notes go between quote title and line items, hidden when empty. Quote title defaults to the job name. Terms: two sets (InjectaCore, SprayIT), dropdown, small print that shrinks, text editable by the client but formatting fixed (Dan does not want clients changing layout). Upgrades are one line under the item, priced per unit. Payment schedule stays. Duplicate or add-on makes Rev 1, Rev 2 with history. A new empty quote must save. Contact names clickable. SprayIT logo only. "Default terms 60 days": unclear if validity or payment terms (R-QUOTE-01 says 30). Multi-company jobs: up to 10 companies per job, each with contacts; search by address. Cards: Glenn wants job name and contact name; undecided. Dan to connect AI tools (with write access) and push tutorial videos. Website go-live waits on the phone number approval and Irena's last look. About eight weeks to settle. We never use Slack (Dan uses it to forward files).

## Rules (repeat)
Dev only for writes. No real messages to real contacts. No em or en dashes. Never name the vendor in anything a client can see. Build one step at a time and read it back. Zen commits and pushes; leave changes uncommitted.

## Notes in the Hub (mock)

The job and contact notes lists (add, edit, delete, pin) are a Hub mock: saved in the browser only (localStorage keys hub.notes.v1 and hub.followups.v1). Reading and adding notes through the CRM API is NOT yet tested. The old single notes field on a job is kept as "Notes to put on new quotes".
