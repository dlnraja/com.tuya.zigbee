---
description: Never block on missing user reply — cross-ref forum history + internet + code every prompt
alwaysApply: true
---

# Compensate without waiting — ALWAYS ON (P2388)

**Mandate (user):** It is OK if the user does not reply every time. On **every prompt**, the agent must **compensate and treat anyway** — do not wait for the next message to continue investigation, silent enrich, or code fixes.

## Default behaviour (every turn)

1. **Do not stall** — missing forum reply, empty diag UUID, or absent mfr+pid is **not** a stop condition. Proceed with soft hypotheses + registry + Z2M/ZHA/Blakadder/GitHub cross-ref.
2. **Mine all history** — forum silent scan (all topics), Gmail/portal diags, `reports/forum-verify-*`, `reports/inbox-*`, `data/user-impact-catalog.json`, agent transcripts. **Recurring** reports = work harder, not defer.
3. **Internet cross-ref** — when couple or interview is missing, search Z2M device pages, herdsman converters, ZHA issues, forum images/alts, GitHub issues in-repo and upstream.
4. **Silent enrich only** — implement fixes in code/CI/docs/registry; **never** auto-post Homey forum (T157628).
5. **Interview gap doctrine** — when mfr+pid absent in post/diag:
   - Document **NEED_INTERVIEW** in `PECULIARITIES.md`, `user-impact-catalog.json`, `reports/forum-verify-*/users/*.md`
   - List **expected interview fields**: `zb_manufacturer_name`, `zb_model_id`, clusters (especially 0xE002/0xEF00/0xFD), endpoint list
   - Apply **verified** fixes that help the whole device class (e.g. Linptech 0xE002 settings, curtain EF00 soft-create, button wrapHandleFrame)
   - **Never invent pid** to close a ticket
6. **Ship when ready** — BOTH reliability fixes → master + stable-v5 backport when user asks publish; do not require user confirmation to finish investigation loop.

## Anti-patterns

- “Waiting for user to send interview” as the **only** output
- Skipping old posts because “already scanned once”
- Dismissing with “update Test” without tracing RX/TX + tip version + driver match
- Forum reply / AI paste to close loops

## Preferred tools

```bash
node tools/ci/forum-silent-multi-scan.js
node tools/ci/forum-media-deep-scan.js --max=80
node tools/ci/forum-actionable-processor.js
node tools/ci/auto-investigate-need-action.js
node tools/ci/couple-absent-search.js --uuid=<prefix>
node tools/ci/user-impact-investigator.js --all-users
```

See also: `user-report-deep-investigation-always.mdc`, `l99-deep-investigation-always.mdc`, `forum-silent-humanize.mdc`.
