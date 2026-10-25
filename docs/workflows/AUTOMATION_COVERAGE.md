# Automation coverage — manual tasks vs free workflows

Updated 2026-10-20 (first written 2026-10-11). Our own wording. Follows `docs/progress/WORKFLOW_AUDIT_2026-10-04.md`.
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
| Forum posts past lastSeen | `forum-poll.yml` → `scripts/scanners/forum-catch-up.js` (cursor `data/leads/forum-lastseen.json`) | each forum-poll run | ✅ (2026-10-20) | every post past the cursor, pages of 20, ≤60/topic and ≤240/run; sweep threads every run + 8 rotating satellites; ledger `forum-post:<t>/<n>` |
| Diag emails | `gmail-diagnostics.yml`, `fetch-diags.yml` | 6 h | ✅ (fixed today) | processed-message state now persisted in Actions cache |
| Diag findings → ledger | `gmail-diagnostics.yml` → `scripts/progress/ledger-intake.js diag` | 6 h | ✅ (2026-10-20) | `diag:<hash>`: kind, couples, identities not in a driver, error count, app version; no mail text or sender; rolling queue in the Actions cache |
| History sweep (`data/leads/sweep-checkpoint.json`) | `johan-thread-intel.yml` → `scripts/progress/advance-sweep.js` | daily | ✅ | Johan issues 15/day; our own repo 15/day since 2026-10-20 (`github.dlnraja.next`); forum 180 posts/topic/day since 2026-10-20 (was 80) |
| Rules gates | shared `scripts/ci/rules-gates.js` (+ `.github/actions/rules-gates`), `pr-gate`, `validate`, `code-quality`, `syntax-check`, `forum-poll`, `gmail-diagnostics`, `safe-auto-commit`, `auto-fix-and-publish`, `auto-publish-on-push`, `unified-ci`, `publish-stable` | every push / auto-commit | ✅ (all callers 2026-10-20) | `publish-stable` keeps a direct fallback while stable-v5 has no shared runner |
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

## Changes made on 2026-10-20

1. **Last single gate copies moved to the shared action (P2906).** `auto-fix-and-publish`
   (anti-bot + P2138; native-matrix, which was an inline line of the scaffold step; post-enrich
   anti-bot with `strip`; P2138 + regression lessons), `auto-publish-on-push` (anti-bot + P2138,
   flow titleFormatted, regression lessons) and `unified-ci` (regression lessons, anti-bot, P2138,
   P214, one step each so the order with the other gates is kept) call `.github/actions/rules-gates`
   with `only:` set to the gates they ran before. Nothing was added or dropped and every step stays
   hard. `publish-stable` runs on pushes to stable-v5, whose tree has no shared runner yet, so it
   uses the action only when the checkout has it and keeps the direct scripts as the fallback. The
   runner now prints the last 200 lines of a failing gate (folded), so logs are as complete as with
   the old direct steps. The P2749f test accepts the shared `flow-title` step.
2. **History sweep of our own repo (P2907).** `advance-sweep.js` had only a Johan loop, so
   `github.dlnraja.next` never left 1. It now also walks `dlnraja/com.tuya.zigbee` (issues and
   PRs, same title + body + comments classifier, bot comments left out) with its own chunk
   (`--dl-chunk`, default = `--chunk`, workflow `vars.SWEEP_DL_CHUNK`). Closed threads become
   done/deferred in the ledger; open threads keep their status (they still need an answer); a done
   entry is never downgraded. A 404 past the newest number stops the loop without moving the cursor
   (Johan loop too), so future issues are not skipped. The digest self-check shows both cursors and
   `swept/last` per forum thread.
3. **Forum sweep chunk 80 → 180 (P2909).** Same pages of 20 ids 0.9 s apart (under the public
   Discourse limits) and the same stop on 429/403. A chunk stopped early now also moves `sweptTo`.
   At 180/day: 140352 catches up in about 9 days, 21313 in about 12, 26439 in about 3.
4. **Ledger writers (P2908).** `scripts/progress/ledger-intake.js` (shared, additive, bounded,
   idempotent by findings hash, never touches an entry someone else closed): `gmail-diagnostics`
   writes `diag:<hash>`, `forum-poll` writes `forum-post:<topic>/<n>` (a post the history sweep
   already holds as `forum:<t>#<n>` is skipped, and the sweep skips posts the catch-up holds).
   Both commit through `safe-auto-commit` (`gmail-diag-ledger` max 4/day, `forum-ledger` max 6/day).
5. **Forum post-by-post past lastSeen (P2909, P2909b).** `scripts/scanners/forum-catch-up.js` keeps a cursor
   per topic and reads every post past it, oldest first (see the coverage table). A topic seen for
   the first time starts 40 posts before its tip; older history stays with the full-history sweep.

## Changes made on 2026-10-24/25

- **P3022** `repo-autopilot.yml` (daily, `dry_run` default true): bot PR merge/close, silent issue triage, drafts in the report artifact only.
- **P3025** `ci-self-check.yml` + `scripts/ci/workflow-hygiene-gate.js` (SHA pins, concurrency, timeouts), `scripts/ci/push-with-retry.js` / `.github/scripts/git-push-retry.sh` (rebase retry, never force), `scripts/ci/appjson-compose-drift-gate.js`, `scripts/ci/lint-ratchet.js`, `.github/scripts/athom-classify-failure.js`.
- **P3026** `platform-budget.yml` + `scripts/ci/platform-budget-gate.js` (report mode, limits in `config/platform-limits.json`, see `docs/knowledge/KB/PLATFORM_LIMITS.md`); version-free npm cache key.
- **P3024b** prepare-publish step 5a2b `scripts/maintenance/publish-baseline-gate.cjs`.
- **P3032** `doc-coverage.yml` (report mode): runs `scripts/kb/doc-coverage.js` and `scripts/kb/code-reference.js --check`, summary in the job page.
- **P3033** `storage-cleanup.yml` (daily 03:30 UTC, master only, dispatch `dry_run` default true): deletes superseded / idle / orphan Actions caches and artifacts older than 14 days, keeps the newest per family on the three release branches and every state cache; rules in `scripts/ci/storage-cleanup.js`, see `docs/knowledge/KB/PLATFORM_LIMITS.md`.

## Remaining gaps

1. Ledger writers: still missing in oss-lan strict-apply.
2. stable-v5 and bastien-home have no shared rules-gates runner; their workflows keep direct gate
   steps (master `publish-stable.yml` falls back to them). Port the runner + action when those
   branches next take a CI port.
3. Draft PR #573 (old knowledge-refresh output with Node 24 edits in 34 workflows) needs closing by the
   owner; until then the 6-day guard makes refresh runs skip (it ages out on 2026-10-25).
4. `forum-poll`: a scan/apply step writes a case variant into a driver compose (seen 2026-10-20:
   `switch_2gang`, `_TZ3000_TONRAPSK`) without syncing app.json, so the later gated
   "forum OCR leads" commit is refused by the compose-sync gate. The catch-up commit now runs before
   those steps; the OCR commit still needs its own fix (run it earlier too, or sync app.json first).
5. `data/progress/ledger.json` has several writers; two pushes in the same minute conflict on
   rebase (seen when gmail-diagnostics and forum-poll were dispatched together). The diag queue and
   the forum cursor make that lossless (re-applied next run); a merge-friendly ledger layout
   would remove it.
6. Bundled `npm run check:*` lists inside one `run:` step (e.g. `check:flow-titleformatted` in the
   unified-ci critical-test step) stay as they are: they are part of a family block, not a gate copy.

## Resume sweep notes (2026-10-12)

- **Pending 3 cleared:** `johan-issue:122` already-fixed (OCR false `xu4a5rhj|TS0002`; real couples already on `switch_2gang` / `curtain_motor`); `johan-issue:451` needs-info (OCR mfr `_TZ3000_pmz6miyu` unverified); `johan-issue:465` fixed — `_TZ3000_cipibmnp|TS0224` moved `switch_1gang` → `siren`.
- **History sweep:** local `advance-sweep.js --only=forum` progressed (`progressed:true`, checkpoint `updated` 2026-10-12). Free path remains `johan-thread-intel.yml` daily cron `40 3 * * *` → `advance-sweep.js`.
- **Johan scanner:** `scripts/scanners/johan-canonical-index.js` already parses `Batch NN` and indexes closed/duplicate issues (`state=all`). No code bug found; keep deep-read for objectives text (links only in index).
- **#424 / #423 click window:** `button_wireless_4` already has opt-in `click_window_ms` + triple aggregation on master — no new quirk this run.
- **Monday `homey-knowledge-refresh.yml`:** cron `47 5 * * 1` present; Actions API listed **0 runs** for that workflow file on 2026-10-12 morning — treat as missed/not-started and re-check later or `workflow_dispatch`. Next-step: confirm workflow enabled and last success date.
- **Remaining automation gaps (unchanged):** bot-triage/monthly-scan still lack a consumer; Z2M/ZHA sync timeout inside gmail-diagnostics; ledger writers coverage; forum `lastSeen` post-by-post; finish migrating any leftover single gate copies into shared `rules-gates`.

## Other workflows (P3032 inventory)

Listed from each file's own `name:` and header comment.

- `bastien-promote-upstream.yml` — Bastien Promote Upstream: Bastien House → Public tracks autonomous promote (P2606 / P2607) One-way only: bastien-home learnings → master → BOTH reliability → stable-v5. Never copies App ID / version. Never reverse wholesale. (cron UTC 20 6 * * *, 20 18 * * *)
- `community-inbox.yml` — 📥 Community Inbox: 📥 Community Inbox Digest (v9.0.362) Triggers: cron: 17 5 * * * + workflow_dispatch | Secrets: GITHUB_TOKEN only Generates reports/community-inbox.md — unified daily view of open issues, PRs and unans (cron UTC 17 5 * * *)
- `daily-digest.yml` — 🤖 Daily Digest: 🤖 Daily Digest (free replacement for the Grok Bot "Homey digest", "Labs digest" and "forum scan" routines) Triggers: cron weekdays (Paris 08:16 Homey, 08:49 Labs, 10:23 Forum watch, 11:41 Inspiration (cron UTC 16 6 * * 1-5, 16 7 * * 1-5, 49 6 * * 1-5, 49 7 * * 1-5, 23 8 * * 1-5, 23 9 * * 1-5, 41 9 * * 1-5, 41 10 * * 1-5, 7 7 * * 1, 7 8 * * 1, 5 10 * * 1-5, 5 11 * * 1-5)
- `flow-publish-self-heal.yml` — Flow + Publish Self-Heal (P2842): P2842 — Free flow + publish payload self-heal (no paid AI) Automates Contre quoi from P2839 hollow flows, P2840 backups bloat, P2841 zo0cfekv couple. Never forum POST. Deterministic local Node only (f (cron UTC 25 5 * * 2,5)
- `homey-app-validate.yml` — Homey App Validate (all levels): P2562 forfait + local-smart-learn (all workflows)
- `housekeeping.yml` — 🧹 Repo Housekeeping: 🧹 Repo Housekeeping (v9.0.368) Triggers: cron: 41 3 * * 1 (weekly, Monday 03:41 UTC) + workflow_dispatch Secrets: GITHUB_TOKEN only Safely tidies the repo root: only unreferenced files matching expli (cron UTC 41 3 * * 1)
- `knowledge-graph-sync.yml` — 🧠 Knowledge Graph Daily Sync: 🧠 Knowledge Graph Daily Sync Triggers: cron: 30 2 * * * + workflow_dispatch | Secrets: GITHUB_TOKEN only Doc header added 2026-07-29 (workflows genealogy enrichment). P56 — Daily knowledge graph rebu (cron UTC 30 2 * * *)
- `market-couples-intake.yml` — 📡 Market Couples Intake: Market couples intake (P2231 / P2232) Max-source sacred-couple harvest:   Blakadder + Z2M + ZHA + deCONZ + Johan + Gmail/diag/crash + forum SHADOW   + interviews + device-truth locks + own GitHub inte (cron UTC 50 4 * * *)
- `nightly-audit.yml` — 🌙 Nightly Audit: 🌙 Nightly Audit Triggers: cron: 45 3 * * * + workflow_dispatch | Secrets: GITHUB_TOKEN only Doc header added 2026-07-29 (workflows genealogy enrichment). Runs the full P57 audit + smart-data-validato (cron UTC 45 3 * * *)
- `peer-complementary-enrich.yml` — Peer Complementary Enrich (P2832): P2832 — Peer complementary enrich (Johan / Lidl / mega / prune) Autonomous free cron: UNION fingerprints into OUR drivers. Never forum POST. Never invent pid. Contre quoi: cartesian P2570 blast, wipe  (cron UTC 10 6 * * 1,4)
- `publish-diagnose.yml` — 🔬 Publish Diagnose: 🔬 Publish Diagnose Triggers: workflow_dispatch,workflow_run | Secrets: GITHUB_TOKEN only Doc header added 2026-07-29 (workflows genealogy enrichment). Auto-runs after every "🚀 Publish Stable to Test
- `smart-update.yml` — 🧠 Smart Update Orchestrator: 🧠 Smart Update Orchestrator Triggers: cron: 30 1 * * * + workflow_dispatch | Secrets: GITHUB_TOKEN only Doc header added 2026-07-29 (workflows genealogy enrichment). P2562 forfait + local-smart-learn (cron UTC 30 1 * * *)
- `version-health.yml` — 🩺 Version Health: 🩺 Version Health — crash/regression watcher (apps-api) Weekly: pulls build states from the Athom Apps API and flags versions with crashes on test/live or processing_failed builds. Complements the for (cron UTC 27 5 * * 1,4)
