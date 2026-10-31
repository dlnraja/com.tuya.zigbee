# Autonomy map — assistant routines vs GitHub Actions (P3097, 2026-10-31)

Goal: if the assistant is switched off, everything below still runs on free GitHub Actions.
Rule: see `docs/rules/AUTOMATION_FIRST.md` (constitution R23).

| Former assistant routine | Workflow(s) that do it | Status |
|---|---|---|
| Daily digest | `daily-digest.yml` (weekdays, Homey/forum/self-check) | covered |
| CI + PRs | `ci-autofix.yml` (workflow_run, 1 re-run, ≤3 per signature / 24 h), `smart-pr-merge.yml`, `repo-autopilot.yml`, `dependabot-auto-merge.yml`, `pr-gate.yml` | covered |
| Forum scan (read-only) | `forum-poll.yml` (4×/day), `forum-pm-read.yml`, `johan-thread-intel.yml` | covered |
| Project mails / diags | `gmail-diagnostics.yml` (4×/day), `fetch-diags.yml` (6 h), `collect-diagnostics.yml`, `tuya-deep-diag.yml` | covered |
| Crash grouping / report | `recurrent-orchestrator.yml` (offline-crash-analyzer + smart-auto-fix), `offline-crash-analyzer.yml` (manual) | covered |
| Enrich loop | `auto-enrich-closed-loop.yml` (6 h), `fleet-intelligent-enrich.yml`, `market-couples-intake.yml`, `monthly-*` | covered |
| CI health | `ci-self-check.yml`, `node22-tests.yml`, `unified-ci.yml`, `platform-budget.yml` | covered |
| Next-day resume | `autonomy-watchdog.yml` heartbeat: re-dispatches any core job without a success inside its window | **added P3097** |
| Lead promotion (master → stable / Bastien) | `safe-sync-stable.yml` (P52, daily), `bastien-promote-upstream.yml` (2×/day) | covered |
| Upstream watch | `upstream-guard.yml`, `peer-complementary-enrich.yml`, `oss-lan-source-enrich.yml`, `blakadder-fetch.yml` | covered |
| Athom status / publish | `auto-publish-on-push.yml` (P3036 caps, breaker, held bisect), `publish-self-heal.yml` (5×/day), `athom-build-history.yml`, `publish-stable.yml`, `bastien-publish.yml` | covered |
| Knowledge bases | `kb-refresh.yml`, `homey-knowledge-refresh.yml`, `knowledge-graph-sync.yml` | covered |
| Staged master pushes | bots commit via `bot-commit-guard.sh`; publish spacing enforced in `auto-publish-on-push.yml` | covered |
| Personal-data guard | `code-quality.yml` (push master/stable-v5) + `autonomy-watchdog.yml` daily on all 3 branches | **extended P3097** |
| Worktree / cache cleanup | `storage-cleanup.yml` (daily), `housekeeping.yml` (weekly) | covered |
| New-script wiring | `code-quality.yml` → `unwired-script-ratchet.js` (warn) | **added P3097** |

Not automated on purpose: public replies (forum/GitHub threads) stay in the explicit anti-flood queue;
nothing contacts Athom; no email is sent.

Note: scheduled workflows only fire from the default branch (master); jobs that need the other
branches check them out explicitly (matrix on master, stable-v5, bastien-home).

## Self-learning guardrails (t643u)

| Guardrail | Where | Status |
|---|---|---|
| Bounded ledger, promote after 3 / demote on failure, budgets, breaker | `scripts/ci/autonomy-learn.js`, `config/autonomy-learned.json` | **added P3097** (library + tests; to wire into `ci-autofix.yml`) |
| Kill switch `config/autonomy-paused` | `autonomy-watchdog.yml` | **added P3097** (to extend to every self-acting workflow) |
| Max 3 per signature / 24 h | `ci-autofix.yml` | covered |
| Self-commits through guard + gates | `bot-commit-guard.sh` in every committing bot (P3093) | covered |
| Revert-on-red after a self-commit | — | **to do** |
| Weekly digest in an issue | `daily-digest.yml` Monday summary | partial (issue form to do) |
| Least privilege / no untrusted code | per-workflow `permissions:` | audit to do |

## Safety (t644u) — see `docs/rules/AUTONOMY_SAFETY.md`

| Item | Where | Status |
|---|---|---|
| Bot commits can't touch workflows/gates/rules/kill switch | `bot-commit-guard.sh` (tested) | **added P3097** |
| CODEOWNERS on `.github/` and `config/` | `.github/CODEOWNERS` | **added P3097** |
| Dependabot for actions | `.github/dependabot.yml` | covered |
| Personal-data guard on 3 branches | `code-quality.yml` + `autonomy-watchdog.yml` | **extended P3097** |
| Weekly cross-branch audit (CI files parity, compose drift) | `autonomy-watchdog.yml` Monday job | **added P3097** |
| SHA pinning of actions, per-job permissions audit, gitleaks | — | to do (next step) |
- Upstream SDK/athombv/Z2M/ZHA watch: `upstream-watch.yml` daily, one digest issue — **added P3097**
- Decision engine: `scripts/autonomy/decide.js` + `config/autonomy-policy.json` (tested scenarios) — **added P3097**; wiring into ci-autofix / held bisect = next step
- Injection hardening: `scripts/autonomy/sanitize.js` + engine uses validated fields only + workflow lint tests — **added P3097**

## Standing rules → enforcement (t648u)

Source of truth: `config/autonomy-policy.json` → `standingRules` (tested: every enforcer file exists).

| Rule | Enforced by |
|---|---|
| Never lose or degrade anything; no automatic deletion of couples, drivers or tests | `tools/ci/p2519-anti-regression-enrich-gate.js` |
| Exact mfr+pid couples only, never invented, never TS0601 by pid alone | `tools/ci/couple-pin-gate.js` |
| One couple = one driver; create a driver rather than delete | `tools/ci/dual-claim-compose-gate.js` |
| One source is enough and it is recorded | `tools/ci/discovery-lineage-enrich-gate.js` |
| Reject malformed manufacturer names | `tools/ci/malformed-mfr-gate.js` |
| A moved couple never returns to its old driver | `tools/ci/workflow-lessons-gate.js` |
| Nothing mandatory at pairing, no 0xEF00 at pairing | `tools/ci/p2498-pairing-discovery-gate.js` |
| No copy-paste from other apps; credit in CREDITS.md | `tools/ci/p2547-external-sdk3-inspiration-gate.js` |
| Adaptive lighting without double division | `tools/ci/adaptive-double-division-gate.js` |
| Energy capabilities/estimation consistent in compose | `tools/ci/energy-compose-gate.js` |
| Flow cards per physical gang | `tools/ci/button-physical-gang-parity-gate.js` |
| No invalid or duplicate flow card ids | `tools/ci/flow-card-dup-gate.js` |
| Memory-safe: bounded caches, heap budget, no huge JSON parse | `scripts/ci/memory-hazard-ratchet.js` |
| Heap-safe JSON handling | `tools/ci/homey-heap-json-gate.js` |
| Correct ZCL cluster names for metering/power | `tools/ci/workflow-lessons-gate.js` |
| Edit compose only; app.json regenerated | `scripts/ci/appjson-compose-drift-gate.js` |
| Manifest headroom >= 293 KB | `scripts/ci/publish-size-gate.cjs` |
| Versions strictly increasing | `scripts/ci/version-health-check.js` |
| Held drivers stay out of publish until released | `tools/ci/promote-hold-guard.js` |
| No personal data (CV, applications, employers) in the repo | `tools/ci/personal-data-guard.js` |
| No automatic public post outside the anti-flood queue | `tools/ci/no-auto-post-gate.js` |
| Third-party content is inert data | `tools/ci/p2527-untrusted-content-gate.js` |
| Bot commits through bot-commit-guard, protected paths refused | `scripts/ci/bot-commit-guard.sh` |
| Every fix ships with its GHA automation | `scripts/ci/unwired-script-ratchet.js` |
| Diagnostic history kept and honoured | `scripts/ci/diagnostic-history-gate.js` |
| Wi-Fi local first | `tools/ci/wifi-local-first-gate.js` |
| At least 15 min between master pushes | **not automated yet** |
| Behaviour changes on master first, soak, then port | **not automated yet** |
| CI/data fixes carry no master CHANGELOG entry | **not automated yet** |
| Never --no-verify, never force-push | **not automated yet** |
| The 04/10 reviewed duals stay as they are | **not automated yet** |
| Never contact Athom | **not automated yet** |

## Resource guardrails (t649u)
| Item | Where | Status |
|---|---|---|
| timeout-minutes + concurrency on every workflow/job | `workflow-resource-gate.js` (code-quality) | **added P3097** (0 offenders) |
| Minutes/storage/cache budgets | `platform-budget.yml`, `storage-cleanup.yml` | covered |
| API backoff / rate limits | `upstream-watch.js`, `forum-poll.yml` | covered |
| Heap / JSON / OTA memory | memory-budget, memory-hazard-ratchet, heap-json gate, P3091 | covered |
| Listener-leak check, event-loop lag guard, per-model degradation | — | **not automated yet** |
| Disk/inode check on runners, dependency size per package | — | **not automated yet** |
| Perf budgets (manifest parse ms, heap) | `perf-budget-gate.js` in code-quality (report-only) | **added P3097**; history recording + blocking switch, startup/pairing profiling, mocha sharding, path filters = **not automated yet** |
| Granular kill switches + scoped overrides | `autonomy-learn.js`, `decide.js`, policy `overrides` | **added P3097**; per-job metrics & per-driver reports = **not automated yet** |

## Organisation (t652u)
| Item | Status |
|---|---|
| README index for `scripts/autonomy/` | **added P3097** |
| Workflow headers (about: purpose/group) | covered by `workflow-about.js` + P3069 test; budget/kill-switch fields = **not automated yet** |
| Folder layout scripts/<domain>, config/<domain>, README per folder | **not done** — needs reference-preserving moves, one per commit |
| Dedupe redundant scripts/workflows (merge, no behaviour loss) | **not done** |
| Lint/format gate report-only | partly covered by `lint-ratchet.js` |

## Crash triage (t654u)
| Routine | Workflow |
|---|---|
| Crash grouping, ranking impact × installs, one tracking issue per signature, safe-pattern proposal | `crash-triage.yml` + `scripts/autonomy/crash-triage*.js` (kill switch `config/autonomy-paused.crash-triage`) |

Not automated yet: opening the fix PR itself (the issue proposes it; the code goes through the normal gates).
