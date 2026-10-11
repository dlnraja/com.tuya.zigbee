# Automation coverage — manual tasks vs free workflows

Updated 2026-10-11. Our own wording. Follows `docs/progress/WORKFLOW_AUDIT_2026-10-04.md`.
Rule: everything below runs on free GitHub Actions minutes with `GITHUB_TOKEN` (plus the existing
Gmail/Homey secrets where noted); AI is optional and off by default (`AI_FORCE_LOCAL=true`,
`AI_ALLOW_PAID=false`), so each workflow still works without AI.

The daily **🩺 Free self-check** section of the "🤖 Daily digest" tracking issue (#557, label
`bot-digest`) shows the live state: history-sweep progress, continuous-flow status and, for each
scheduled producer, its last scheduled run and how many commits it landed in the last 72 h.
It edits only its own section of the issue body (no comment, no commit, no publish).

## Coverage table

| Manual task | Automated by | Cadence | State | Notes |
|---|---|---|---|---|
| Strict fingerprint apply | `oss-lan-source-enrich.yml` → `scripts/leads/strict-apply.js` | Tue/Fri | ✅ | capped by `STRICT_APPLY_MAX`; commits via `safe-auto-commit` |
| Quirk records | same + `daily-digest` › inspiration › `quirks-scan.js` | weekdays | ✅ | quirk dataset kept in Actions cache |
| #557 triage | `strict-apply.js --source=issue557` | Tue/Fri | ✅ | |
| Stable backport | `oss-lan-source-enrich.yml` job `stable-backport`, `safe-sync-stable.yml` | Tue/Fri + daily | ✅ | device-compat couples only |
| Peer flow inventory | `homey-store-peer-probe.yml` + oss-lan peer probe | weekly | ✅ | |
| Post-publish check | `verified-publish-and-diagnostics.yml`, `publish-self-heal.yml`, digest Test-channel lag check | per publish / 4 h | ✅ | |
| Fork scan | oss-lan "GitHub leads scan (issues, comments, peer apps, forks + branches)" | Tue/Fri | ✅ | incremental cursor |
| Image OCR | oss-lan issue OCR, `forum-poll.yml` screenshot OCR, digest forum/inspiration tesseract | daily | ✅ | free local tesseract |
| Coverage audit | `scripts/leads/coverage-audit.js` in oss-lan | Tue/Fri | ✅ | `COVERAGE_AUDIT_MAX` |
| Dual-couple report | `scripts/leads/dual-couples.js` (oss-lan, fleet) | Tue/Fri + 2×/day | ✅ | report only |
| Gang patterns | `scripts/leads/gang-patterns.js` in oss-lan | Tue/Fri | ✅ | report only |
| Legacy enforcement | `tools/ci/enforce-dual-couple-legacy.js --sync` in `safe-auto-commit` + fleet | every auto-commit | ✅ | |
| Case variants | `ensure-case-variants.js` (closed loop, auto-fix, auto-publish, gmail-diag) | 4–6 h | ✅ | |
| Johan batch comments (incl. closed) | `johan-thread-intel.yml` → `scripts/scanners/johan-canonical-index.js` (`state=all`, closed + duplicates) | daily | ✅ | |
| Forum ingestion | `forum-poll.yml`, `daily-digest` forum watch (6 topics) | 6×/day + weekdays | ✅ | polite budget, back-off on 429 |
| Diag emails | `gmail-diagnostics.yml`, `fetch-diags.yml` | 6 h | ✅ (fixed today) | processed-message state now persisted in Actions cache |
| History sweep (`data/leads/sweep-checkpoint.json`) | `johan-thread-intel.yml` → `scripts/progress/advance-sweep.js` | daily | ✅ | last auto advance 2026-10-09 |
| Rules gates | shared `scripts/ci/rules-gates.js` (+ `.github/actions/rules-gates`), `pr-gate`, `unified-ci`, `safe-auto-commit` | every push / auto-commit | ✅ (deduplicated today) | |

## Changes made on 2026-10-11

1. **Shared rules gates.** `scripts/ci/rules-gates.js` holds the one gate list (anti-bot,
   sacred-couple matrix, regression lessons, P214, flow titleFormatted args; profile `full` adds the
   compose ↔ app.json fingerprint sync). The composite action `.github/actions/rules-gates` wraps it.
   It replaces copy-pasted gate steps in `auto-enrich-closed-loop`, `continuous-flow`,
   `market-couples-intake`, `blakadder-fetch`, `weekly-sovereign-loop` and the inline list in
   `fleet-intelligent-enrich`. `safe-auto-commit.js` reads the same list. Workflows that ran only the
   sacred-couple matrix now get the whole core set (all green on master today, about 2 s in total).
2. **continuous-flow is manual-only.** Its daily schedule was always a dry run, and the commit step
   only runs in apply mode, so nothing was ever kept. On a fresh CI checkout its enrichers have no input,
   because their inputs are gitignored local state. Run 38041096392 shows it: 0 mfrs analysed, 0
   applied, the multi-device step exiting 1, and `enrich-sacred-couples.js` crashing on a hard-coded
   Windows path. That path is now repo-relative, and the script no longer rewrites `mfs_db.json` in
   dry-run or when nothing changed. Publish validation and family gates already run on every push in
   `unified-ci`.
3. **Gmail diagnostics state persisted.** `.github/state/**` is gitignored by policy, so the
   "commit state" steps of `gmail-diagnostics` and `fetch-diags` never staged anything. The
   processed-message list was lost every run (each run re-read the same 100 mails: "0 new FPs",
   "No … state changes to push"). Both workflows now restore and save
   `diagnostics-state.json` / `diagnostics-report.json` through the free Actions cache.
4. **Self-check accuracy.** It read only one page of 100 commits, but master gets about 90 commits a
   day, so it flagged every producer "green, nothing written". It now pages through up to 600
   commits. The continuous-flow line now reports the last manual run.

## Scheduled runs that pass but produce nothing (read-only review of run logs)

| Workflow | Finding | Status |
|---|---|---|
| `continuous-flow.yml` | hollow inputs on CI, dry-run only | schedule removed (see above) |
| `gmail-diagnostics.yml`, `fetch-diags.yml` | state never persisted; commit step is a structural no-op | cache added; the commit steps stay as no-ops for local runs |
| `gmail-diagnostics.yml` "Light Z2M/ZHA sync" | ZHA crawl hits its 150 s timeout (`ETIMEDOUT`) every run, non-blocking | **open** (needs a smaller ZHA chunk or a move to the weekly crawl) |
| `auto-bot-issue-triage.yml`, `monthly-scan.yml` | write `.github/state/bot-auto-scan-candidates.json`, documented "for the closed-loop pipeline", but the file is gitignored and nothing reads it in a later run | **open** (needs an artifact/cache hand-off plus a consumer in the closed loop) |
| `auto-close-supported.yml`, `collect-diagnostics.yml` | `git add .github/state/` part is a no-op (gitignored); `docs/` / `diagnostics/` part can still commit | documented |
| `auto-enrich-closed-loop.yml` | commits locally, no push step; output is the artifact | by design (flagged ℹ️ in self-check) |
| `blakadder-fetch.yml` | 2026-10-10 failure = non-fast-forward push on a busy master | already fixed upstream (3-try rebase/push loop) |
| `homey-knowledge-refresh.yml` | no scheduled run yet (weekly, Monday) | watch next Monday |

## Remaining gaps

1. Bot-triage candidate hand-off (above), so missing mfrs found by triage feed the closed loop.
2. ZHA light-sync timeout in gmail-diagnostics.
3. Ledger (`data/progress/ledger.json`) wired into every enrichment workflow; today only the Johan
   scanner and `advance-sweep` write it.
4. Forum post-by-post deep harvest beyond `lastSeen` for every thread in the sweep checkpoint;
   today the digest forum watch reads the newest posts and the sweep stores per-thread `lastPost`.
5. Remaining copies of single gates in `forum-poll`, `gmail-diagnostics`, `auto-fix-and-publish`,
   `auto-publish-on-push`, `publish-stable`, `pr-gate`, `unified-ci`, `syntax-check`, `validate`,
   `code-quality`. These can move to `.github/actions/rules-gates` later. They were left alone today
   to avoid clashing with parallel work on the publish and forum paths.
