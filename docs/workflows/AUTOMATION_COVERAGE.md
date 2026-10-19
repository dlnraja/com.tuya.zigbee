# Automation coverage — manual tasks vs free workflows

Updated 2026-10-19 (first written 2026-10-11). Our own wording. Follows `docs/progress/WORKFLOW_AUDIT_2026-10-04.md`.
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
| History sweep (`data/leads/sweep-checkpoint.json`) | `johan-thread-intel.yml` → `scripts/progress/advance-sweep.js` | daily | ✅ | last auto advance 2026-10-11; local forum chunk 2026-10-12 |
| Rules gates | shared `scripts/ci/rules-gates.js` (+ `.github/actions/rules-gates`), `pr-gate`, `validate`, `code-quality`, `syntax-check`, `forum-poll`, `gmail-diagnostics`, `safe-auto-commit` | every push / auto-commit | ✅ (more callers 2026-10-19) | publish paths + `unified-ci` still hold their own copies |
| Bot triage / monthly scan candidates | `scripts/progress/ingest-bot-candidates.js` → `data/progress/ledger.json` (`lead:<mfr>`, pending) | daily / monthly | ✅ (2026-10-19) | mfr only, nothing placed in a driver; read with `ledger-cli.js next lead` |
| Homey SDK / tooling watch | `homey-knowledge-refresh.yml` (Mon 05:47 + Thu 09:23 UTC) | weekly | ✅ (2026-10-19) | draft PR with data/docs only; Node bumps are proposals |

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
| `gmail-diagnostics.yml` "Light Z2M/ZHA sync" | ZHA crawl hit its 150 s timeout (`ETIMEDOUT`) every run, non-blocking | **closed 2026-10-19** (P2881, see below) |
| `auto-bot-issue-triage.yml`, `monthly-scan.yml` | wrote `.github/state/bot-auto-scan-candidates.json` (gitignored), nothing read it in a later run | **closed 2026-10-19** (P2882, hand-off to the tracked ledger) |
| `auto-close-supported.yml`, `collect-diagnostics.yml` | `git add .github/state/` part is a no-op (gitignored); `docs/` / `diagnostics/` part can still commit | documented |
| `auto-enrich-closed-loop.yml` | commits locally, no push step; output is the artifact | by design (flagged ℹ️ in self-check) |
| `blakadder-fetch.yml` | 2026-10-10 failure = non-fast-forward push on a busy master | already fixed upstream (3-try rebase/push loop) |
| `homey-knowledge-refresh.yml` | 2026-10-12 run failed (bot token refused workflow edits); 2026-10-19 schedule did not fire; a same-day re-run collided on the branch name | **fixed 2026-10-19** (P2880, see below) |

## Changes made on 2026-10-19

1. **Knowledge refresh (P2880).** The tooling script used to raise `node-version` to 24 in 34
   workflow files (node22-tests included) and push them. It is now read-only on `.github/workflows`:
   it lists the files below the Node the homey CLI asks for, as a proposal in
   `docs/knowledge/HOMEY_TOOLING_WATCH.md`. The workflow checks out with `GITHUB_TOKEN` only, never
   stages workflow files (it fails loudly if one is staged), adds the run id to the branch name when a
   same-day branch exists, and skips when a refresh PR opened in the last 6 days is still open. The
   Monday 05:47 UTC schedule did not fire on 2026-10-19 (workflow `active`; GitHub delays or drops
   scheduled runs under load), so a backup slot runs Thursday 09:23 UTC; the 6-day guard keeps it to
   one PR a week. Manual run 39212950916 opened draft PR #573 (it still carries the old Node 24 edits
   of 34 workflows, so it should be closed, not merged); run 39214217834 on the new file skipped
   correctly because of #573.
2. **ZHA light sync (P2881).** 34 of the 55 hard-coded ZHA quirk paths no longer exist upstream; each
   404 was retried with back-off, one file at a time, so the crawl always reached the 150 s timeout.
   `scripts/sync/crawl-zha.js` now lists the real files from the upstream git tree (one API call,
   the old list as fallback), does not retry 4xx answers, fetches 6 files at a time and stops at a
   deadline with a partial (uncached) result. Local run: 83 files, about 3 s.
3. **Bot candidates hand-off (P2882).** After triage, `scripts/progress/ingest-bot-candidates.js`
   copies each missing manufacturer into `data/progress/ledger.json` as `lead:<mfr>` with status
   `pending` (mfr only, pid never guessed, existing entries untouched, case-insensitive dedupe, notes
   with ids and links only). The triage and monthly-scan commit steps now also stage the ledger.
   Consumer: the daily resume (`node scripts/progress/ledger-cli.js next lead`).
4. **Shared rules gates, more callers (P2883).** `forum-poll`, `validate`, `code-quality`,
   `syntax-check`, `pr-gate` and `gmail-diagnostics` call `.github/actions/rules-gates` with `only:`
   set to exactly the gates they ran before, under the same conditions (soft stays soft). No gate was
   added or dropped.

## Remaining gaps

1. Ledger writers: bot triage and the monthly scan now write it (2026-10-19), along with the Johan
   scanner and `advance-sweep`. Still missing: gmail-diagnostics (`diag:<hash>`), forum-poll
   (`forum-post:<topic>/<n>`), oss-lan strict-apply.
2. Forum post-by-post deep harvest beyond `lastSeen` for every thread in the sweep checkpoint;
   today the digest forum watch reads the newest posts and the sweep stores per-thread `lastPost`.
3. Single gate copies still left in `auto-fix-and-publish`, `auto-publish-on-push`, `publish-stable`
   and `unified-ci`. Left alone on 2026-10-19 because another session was changing the publish path
   the same morning; move them with `only:` in a quiet window.
4. Draft PR #573 (old knowledge-refresh output with Node 24 edits in 34 workflows) needs closing by the
   owner; until then the 6-day guard makes refresh runs skip (it ages out on 2026-10-25).

## Resume sweep notes (2026-10-12)

- **Pending 3 cleared:** `johan-issue:122` already-fixed (OCR false `xu4a5rhj|TS0002`; real couples already on `switch_2gang` / `curtain_motor`); `johan-issue:451` needs-info (OCR mfr `_TZ3000_pmz6miyu` unverified); `johan-issue:465` fixed — `_TZ3000_cipibmnp|TS0224` moved `switch_1gang` → `siren`.
- **History sweep:** local `advance-sweep.js --only=forum` progressed (`progressed:true`, checkpoint `updated` 2026-10-12). Free path remains `johan-thread-intel.yml` daily cron `40 3 * * *` → `advance-sweep.js`.
- **Johan scanner:** `scripts/scanners/johan-canonical-index.js` already parses `Batch NN` and indexes closed/duplicate issues (`state=all`). No code bug found; keep deep-read for objectives text (links only in index).
- **#424 / #423 click window:** `button_wireless_4` already has opt-in `click_window_ms` + triple aggregation on master — no new quirk this run.
- **Monday `homey-knowledge-refresh.yml`:** cron `47 5 * * 1` present; Actions API listed **0 runs** for that workflow file on 2026-10-12 morning — treat as missed/not-started and re-check later or `workflow_dispatch`. Next-step: confirm workflow enabled and last success date.
- **Remaining automation gaps (unchanged):** bot-triage/monthly-scan still lack a consumer; Z2M/ZHA sync timeout inside gmail-diagnostics; ledger writers coverage; forum `lastSeen` post-by-post; finish migrating any leftover single gate copies into shared `rules-gates`.
