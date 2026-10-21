# SprayIT CRM: test and go-live tasks (read this first)

For: the Slack agent that creates the ClickUp tasks, and the team member who does them.
Account: the Dev sub-account named "SprayIT Solutions - Dev" only. The live SprayIT Solutions account belongs to the client (Glenn Angus) and must never be opened, changed or tested in.

## What this is

The CRM for SprayIT Solutions has been built in the Dev account: custom fields, custom values, tags, two pipelines (14 stages each), 6 calendars, 39 email templates, and 40 workflows saved as drafts. Nothing has been turned on or tested. These tasks check that everything was built correctly, finish the missing pieces, turn the workflows on in safe stages, and prove each one works.

## The files (all in this folder)

| File | Contains | Task IDs |
| --- | --- | --- |
| TEST-A_SETUP-AND-END-TO-END.md | Safety, access, checks of the foundations, the missing pieces, the activation waves, the full end-to-end journeys, the final report | T-00 to T-39 and T-E2E, T-FINAL |
| TEST-B1_WF-01-to-WF-13.md | One check-activate-test task per workflow | T-WF-01 to T-WF-13 |
| TEST-B2_WF-14-to-WF-26.md | Same | T-WF-14 to T-WF-26 |
| TEST-B3_WF-27-to-WF-40.md | Same | T-WF-27 to T-WF-40 |

## How the Slack agent should create the ClickUp tasks

1. Create a ClickUp list called "SprayIT CRM: test and activation" in the SprayIT Solutions space.
2. Create one task per heading that starts with "T-" (for example "T-03 · ..." or "T-WF-05 · ..."). The task name is the heading text, as written.
3. Put the whole body of the section in the task description. Turn each numbered step into a checklist item, so progress shows.
4. Set the fields from the lines at the top of each task: Phase or Wave as a tag, Time as the estimate, Priority as written.
5. Make dependencies from the "Depends on" line (use ClickUp's "waiting on" link).
6. Assign every task to the same team member (the one Zen names). Due dates: leave blank. Zen sets the dates.
7. Create the tasks in the order they appear in the files. Do not skip, merge or reword any task.
8. Do not create anything in the live account, and do not message customers. These tasks only touch the Dev account.

## Rules for the team member (also put these at the top of the list description)

1. Dev only. Check the account name in the top left says "SprayIT Solutions - Dev" before every session. If it says anything else, stop.
2. Never use a real customer, and never use a real person's phone number or email. Test contacts are named "TEST ..." and use the tester's own phone and email only.
3. Do not activate a workflow before its task says so. Activate in waves, in the order in the files.
4. After each wave, turn off anything not meant to stay on, as the task says.
5. Do not redesign anything. If something is wrong, write it down. You may fix small things (a wrong name, a wrong wait time, a missing tag) and say what you changed. Anything bigger: set the task to Blocked and comment.
6. A failure report always has: the task ID, the workflow name, the step number, what you expected, what happened, and a screenshot.
7. Never print, copy or share any token or password.
8. Customers must never see the name of the software vendor. If you see it in anything a customer would receive (an email, an SMS, a link), report it.
9. When a task is done, attach the evidence the task lists and move it to Done. If you could not finish it, say exactly why.

## Order of work

Phase 0 (safety and access) then Phase 1 (check the foundations) then Phase 2 (build the missing pieces) then Phase 3 (check the 40 drafts) then Phase 4 (activate and test the workflows, wave A to G) then Phase 5 (end-to-end journeys) then T-FINAL (report).

## Contacts

Questions about the plan: Zen (CTO). Sender, calendar or domain access: Zen or Dan (Director).
