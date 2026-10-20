# Disabled workflows (P2916, 20/10/2026)

Disabled with `gh workflow disable`; the files are kept. These are repo-wide (every branch).
Each one last ran between July and September 2026 and failed or was cancelled, with no later run on any branch.
Re-enable: `gh workflow enable <file> -R dlnraja/com.tuya.zigbee`.

| Workflow file | Last run (UTC) | Result | Branch |
|---|---|---|---|
| monthly-enrichment.yml | 2026-09-04 | failure | master |
| monthly-device-enrichment.yml | 2026-09-04 | cancelled | master |
| monthly-community-sync.yml | 2026-09-04 | failure | master |
| verified-publish-and-diagnostics.yml | 2026-07-13 | failure | master |
| delete-johan-comments.yml | 2026-07-14 | failure | stable-v5 |
| delete-own-upstream-comments.yml | 2026-07-14 | failure | stable-v5 |
| upstream-guard.yml | 2026-07-14 | failure | stable-v5 |

Kept enabled: publish.yml (failed 11/10, inside the current window), and workflows whose old red was on
one branch only but that are green elsewhere since then (unified-ci, continuous-flow, e2e-dashboard-test,
temporal/activity/offline-crash monitors, recurrent-orchestrator, autonomous-verification, publish-stable).
