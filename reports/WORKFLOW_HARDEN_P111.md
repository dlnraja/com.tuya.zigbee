# P111 — Workflow test & harden (batch 1)

## Version
9.0.470

## Failures found on master (post-P110)
| Workflow | Cause | Fix |
|----------|-------|-----|
| Syntax Check | bare `setTimeout` in `HomeyCompensationLayer` | `safeSetTimeout` + documented native fallback |
| Unified CI / Auto-Publish / e2e | duplicate `boiler_switch_energy_turned_on` | removed global `.homeycompose/flow/triggers` copies (keep driver compose) |
| community-inbox | no npm ci + forum state path mismatch | npm ci + artifact download + `latest.json` fallback + poll bridge file |

## Workflows improved this pass
1. **forum-poll.yml** — upload `forum-activity-data.json` bridge
2. **community-inbox.yml** — npm ci, download latest forum-poll artifact, bridge
3. **housekeeping.yml** — npm ci
4. **publish-self-heal.yml** — npm ci on athom-heal
5. **shadow-policy-check.yml** — npm ci
6. **unified-ci.yml** + **syntax-check.yml** — `flow-card-dup-gate.js` before Homey validate

## Local gates
- `node scripts/mirror-ci-grep.js` PASS
- `node tools/ci/flow-card-dup-gate.js` PASS (4954 compose ids)
- `node .github/scripts/_validate-workflows.js` 59 files, 0 errors, 0 warnings

## Next batch
Continue one-by-one: `auto-fix-and-publish`, `auto-enrich-closed-loop`, `fetch-diags`, `e2e-dashboard-test`, `mega-crawl` schedule policy, remaining soft-warning workflows.
