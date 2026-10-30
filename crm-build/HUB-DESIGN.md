# Quote Hub: design (30 Oct 2026)

Status: design only. Nothing here is built in the live account. All tests so far are in the Dev sub-account "SprayIT Solutions - Dev". Sources: the client call transcript (latest_transcript.txt), the CRM build sheets, and API tests run on 30 Oct 2026.

## 1. What the Hub is

One web page, added to the CRM as a custom menu link, where the owner (Glenn) and the office work through jobs and write, revise and send quotes without jumping between screens. It replaces the separate quote builder menu item. It does not replace the board, conversations or payments: those stay in the platform and the Hub links to them.

Aim from the call: "one traveller", open a job, write the quote with the job details beside it, send it, go to the next one.

## 2. Words

- The record is the CRM opportunity. In Dev its label is already "Job". The mockup has a switch (Jobs, Projects, Deals) so the client can choose. Renaming is a label only and changes no data.
- Card title on the board: still to decide (job name first or contact first). Both are possible. See open questions.

## 3. Data model (what lives where)

| Thing | Lives in | Notes |
|---|---|---|
| Person | CRM contact | Standard |
| Company | CRM company (business) | Linked to a job by an association |
| Job | CRM opportunity | Name, address, stage, value, owner, source, fields |
| Contacts on a job | Associations | Main contact plus extra contacts. Tested 30 Oct. |
| Companies on a job | Association business to opportunity | Tested 30 Oct |
| Quote, revisions, line items, upgrades, payment rows, notes, terms text | The Hub's own database | Not a platform feature |
| Terms templates and quote templates | The Hub's own database | Text editable, formatting fixed |
| Price list | The Hub's own database | Real prices come from Glenn |
| Quote status | Hub database, mirrored to the job fields | Draft, Sent, Accepted, Declined, Expired, Superseded |

### Multi-company job (the Woolworths case)
One job. Main contact plus extra contacts and companies attached. Each company or contact gets its own quote, shown grouped under the job. When one accepts, the Hub marks the others Superseded and sets the job status for them as agreed (see WF-43 in HUB-WORKFLOW-CHANGES.md).
Search by address finds the job and everyone on it.

## 4. Screens

1. To do: jobs in the Quoting stage assigned to the owner, oldest first, with days waiting. "Open next". After Send it offers the next one.
2. Jobs: search (name, contact, company, address), filters (stage, owner). Job screen: details, contacts and companies, notes, quotes grouped per contact with revision tags, actions (duplicate for another company, close other options, record phone or purchase order acceptance).
3. Quote editor: form and live preview, with a job details panel beside the form (address, source, value, owner, tasks, appointments).
4. Customer page: private link, tick upgrades, Accept (confirm), Decline, expired state.
5. Quotes list, Contacts, Templates, Terms.

Quote sheet order (from the call): logo (SprayIT only), customer and address, job notes (hidden when empty), quote title, line items each with its upgrade line, total, payment schedule, terms in small print that shrinks for long text.

## 5. Rules decided on the call

- Notes sit between the quote title and the line items. Hidden when empty.
- Quote title defaults to the job name.
- Terms: dropdown (SprayIT, InjectaCore), more can be created. Text editable by the client, formatting fixed by us. Auto-shrink for long terms.
- Upgrades: one coloured line under the item, price follows the item's quantity.
- Payment schedule stays. Presets plus custom rows.
- Duplicate or add-on creates the next revision (Rev 2, Rev 3), never "(copy)". The old revision stays in the history.
- A new quote saves straight away, even with no lines.
- Contact names are clickable everywhere.
- Default validity 60 days: to confirm it means validity and not payment terms.

## 6. How the Hub talks to the CRM

```
Browser (Hub page inside the CRM)
   |  HTTPS, signed session
   v
Hub server (small, hosted by us; holds the token and the database)
   |  API calls with the private integration token
   v
CRM (contacts, companies, jobs, associations, fields, stages, tags, messages)
```

The token never reaches the browser. One token per client account. Dev token first, the live token only after sign-off.

### API calls the Hub needs, and their status

| Call | Status |
|---|---|
| List contacts, jobs, pipelines, stages, fields, users | Verified (read) |
| Create contact, company, job | Verified 30 Oct (Dev) |
| Link a company to a job | Verified 30 Oct (Dev) |
| Link extra contacts to a job (needs the pipeline ID in the request) | Verified 30 Oct (Dev) |
| Read the links back | Verified 30 Oct (Dev) |
| Delete job, company, contact, link | Verified 30 Oct (Dev) |
| Update a job: stage, status, value, owner, custom fields | Not tested. Documented as available. |
| Add and remove tags on a contact | Verified earlier (tags build step) |
| Send an email or SMS from the Hub to an extra contact | Not tested |
| Draft invoice or estimate | Read verified, create not tested |
| Workflow create, edit, read steps | Blocked: the vendor has not enabled it for our account |

### Messages stay in the platform
Workflows send the customer messages (quote email, follow-ups, thank-you). The Hub writes data and moves the card, which fires the existing workflows. Only extra contacts (not the main contact) would need the Hub to send through the API, and that is to be tested. This keeps all wording and the sender settings in one place and keeps the vendor name out of everything the customer sees.

## 7. Identity and access (to test)

The page must know which account and which user is using it. The documented routes are URL variables on the menu link and a signed user data message from the platform to the page. Which works for a custom menu link, not only a custom page, is untested. Until it works the Hub can run with a fixed account in Dev.

## 8. Phone

On the call the menu item was described as visible "on the desktop". Glenn is on site a lot. To test: does the menu link show in the mobile app, and does the Hub work at 390 px wide. The mockup has a mobile view to check the layout.

## 9. Security and privacy

- Token on the server only, never printed, never in git.
- Customer page uses a long random link per quote, no login, quote data only, expires with the quote.
- Client data stays in the client's own database, not shared across clients.
- AI assistants connected to the client's account (Dan mentioned write access) can change data: decide what they may write before switching them on.
- No vendor name in anything visible to the client or their customers.

## 10. Build phases

| Phase | What | Rough time |
|---|---|---|
| 1 | Hub front end with mock data: all screens and rules above | 3 to 4 days |
| 2 | Server and database, read real contacts and jobs from Dev | 2 days |
| 3 | Write: create job, links, stage moves, fields, tags | 1 to 2 days |
| 4 | Send, customer page, accept and decline, revisions, add-ons | 2 to 3 days |
| 5 | Workflow changes (HUB-WORKFLOW-CHANGES.md) built by Ask AI, tested in Dev | 2 to 3 days |
| 6 | Dev test with made-up contacts, then Glenn tries it, then live switch | 2 days |

About 12 to 16 working days. Phase 1 can be shown to Glenn first. Phases 5 and 6 depend on the workflow prompts, because the workflow API is off.

## 11. Open questions

1. Name: decided on 30 Oct 2026, "Jobs". The switch stays in the Hub settings but defaults to Jobs.
2. Card title on the board: job name first or contact first.
3. 60 days: quote validity or payment terms.
4. Several contacts on one job: who gets the follow-up messages.
5. Who asked for what on the call: Glenn and Rachel are two people, but the transcript labels both as one speaker, so ask each of them to confirm the points that matter (card title, daily actions).
6. Glenn's top 5 daily actions in the CRM, so the To do list matches how he works.
7. Real prices, the two terms documents, the InjectaCore example quote.
8. Does the menu link show in the mobile app.
9. Which AI tools Dan connects and what they may write.
