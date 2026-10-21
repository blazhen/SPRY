# SPRY: notes for Claude (this PC only, git-ignored)

## Systemations platform scope (Zen, 2026-10-16)
- All CRM building goes to the DEV sub-account only: SprayIT Solutions - Dev, location ID 5M1zrDbimF17cM16mtmR. It started blank.
- The live sub-account (SprayIT Solutions, location ID mQr1UqQmwAZZWoUzIPUs, Glenn Angus's real account) is READ-ONLY. Never write to it. The spray-crm connector is locked to live, so it is for reading only.
- Building goes through the integration token in .env (variable SPRY_CRM_TOKEN, scoped to Dev) by small scripts. Never print, copy or commit the token. Pass the web address and location ID on the command line, so the vendor's name never appears in the repo. Scripts are untracked and temporary.
- Build one step at a time, never everything at once. After each step: say what was created, check it by reading it back, then wait for Zen before the next step.
- Keep cost low: cheap models (haiku or sonnet) for routine steps, no heavy models unless a part is truly hard.
- Never message real contacts. Test contacts in Dev must use made-up details, and Dev must not send real messages.
- The plan is in CRM-BUILD-PLAN.md and CRM-BUILD-00 to 05 (untracked).
