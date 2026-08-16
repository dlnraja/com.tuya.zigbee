# P193 — Workflow / automation estate, both tracks (2026-08-16)

## Scope

| Track | Branch | Tip analysed | Homey |
|---|---|---|---|
| Preview | `master` | P192 + this pass | Test still **9.0.558**; draft **9.0.562 #2884** |
| LTS | `stable-v5` | `a61b99939` P139 + ZT08 DP17 | Last Publish Stable→Test **failed at Draft** (promote skipped) |

Same App ID `com.dlnraja.tuya.zigbee`. Classify: estate gate + self-heal = **MASTER_ONLY** until soak; `cancel-in-progress: false` + soak guard on `publish-stable.yml` = **BOTH** (do **not** push stable-v5 from this pass — that would trigger Publish Stable).

## Live CI after P192

- Auto-Fix **green** (strip held; bot commit only touched `mfs_db` timestamp)
- Unified CI **green**
- Auto-Publish still in flight (draft poller fix is in this tree)

## Estate (62 master workflows)

`tools/ci/workflow-estate-gate.js` now runs from `npm run check:yaml` (syntax-check) and the weekly sovereign loop.

Defects found and fixed:

| Defect | Fix |
|---|---|
| `publish-self-heal` re-triggered **Publish Stable→Test** | Watch/re-run **Auto-Publish on Push** only |
| `publish-stable` `cancel-in-progress: true` | `false` (P139) |
| `draft-to-test` same | `false` |
| `bug-report-auto-pr` commit without `[skip ci]` | added |
| Stable→Test can overwrite 9.0 soak | `refuse-stable-test-overwrite.js` + `force_test` input |
| Wednesday 03:00 cron clash (code-quality ∩ continuous-flow) | code-quality → `30 3 * * 3` |

Policy gate: 0 errors. Estate gate: 0 errors.

## Stable-v5 (do not push from here)

- 54 workflows (no master-only: self-improve, weekly-sovereign, free-scrape, agent-reach, …)
- Latest **Publish Stable to Test** failed at **Publish to Draft**; promote never ran — Test was **not** overwritten
- Backport later, surgically: `publish-stable.yml` concurrency + soak guard, `publish-self-heal.yml` master-only re-trigger, `direct-api-publish.js` draft-as-success (P192)

## Do not

- Merge/push these YAML changes onto `stable-v5` until a human wants a stable draft (guard first)
- Force `STABLE_FORCE_TEST` while 9.0.x is the Test soak
- Treat Gmail “5 new FPs” as compose candidates
