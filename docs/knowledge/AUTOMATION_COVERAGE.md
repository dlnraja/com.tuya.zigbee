# Automation coverage without AI (P3048)

Everything the Grok Bot Homey routines do is also done by GitHub Actions, deterministically, with no AI,
no assistant and no paid service. The Grok Bot routines stay as a complement (judgement, wording of public
replies, chat). Optional AI or Firecrawl layers only run when their secret is set (`secrets.X != ''`) and
never block a job.

## Free and AI-free, step by step

| Need | Free means used | Never used |
|---|---|---|
| GitHub data (runs, logs, issues, commits, artifacts) | `GITHUB_TOKEN` of the run, polite client `scripts/automation/gh.cjs` (250 ms pause, waits on 429 / `x-ratelimit-reset`) | PAT for read, paid API |
| Forum watch | public Discourse JSON (`/latest.json`, `/t/<id>.json`) and `/raw/<topic>/<post>`, incremental pointers (`data/leads/forum-lastseen.json`, `image-ocr-cursor.json`) | login, posting |
| Screenshots | Tesseract `eng+fra` (Ubuntu apt `tesseract-ocr tesseract-ocr-fra`), sha256 hash cache `data/leads/ocr-hash-cache.json` (labels only, no OCR text, bounded to 20 000 entries) | cloud OCR, vision models |
| Upstream sources | raw.githubusercontent.com, shallow / sparse clones (Z2M, ZHA, deCONZ, Blakadder, tuya-local) | scraping services (Firecrawl is optional) |
| Compute | free GitHub-hosted minutes of a public repository | self-hosted or paid runners |
| Classification, decoders, couples | regexes and literal patterns in the repo, exact couples from a source only | LLM calls, invented couples |

## Routine → workflow map

| Grok Bot routine (Paris time) | GitHub Actions equivalent (UTC cron) | Notes |
|---|---|---|
| Shared notebook `homey/routines-context.md` (72 h read, dedup key, one line per run) | `data/progress/automation-journal.jsonl` + `scripts/automation/journal.cjs` | 72 h window, dedup by key and status, rotation above 2 000 lines into `data/progress/archive/automation-journal-YYYY-MM.jsonl`, `merge=union`, `[skip ci]` commits via `safe-auto-commit.js` in the `automation-journal` concurrency group |
| Homey CI et PRs (≈ 16:00) | `ci-autofix.yml` (on `workflow_run`), `automation-loop.yml` (05:10), `dependabot-auto-merge.yml`, existing `repo-autopilot.yml` | see "CI autofix" below |
| CI health in the digest | `automation-loop.yml` → `docs/progress/DIGEST.md` | flaky workflows, repeated signatures, combo margins |
| Weekday morning digest (≈ 08:30) | existing `daily-digest.yml` (06:16 / 07:16 UTC) + `docs/progress/DIGEST.md` from `automation-loop.yml` | no mail, no post |
| Forum watch (≈ 10:30) | existing `forum-poll.yml` (every 4 h), now Tesseract eng+fra + hash cache | posting stays out of CI |
| Enrichment loop (≈ 11:00), lead promotion (≈ 14:00) | existing `market-couples-intake.yml`, `peer-complementary-enrich.yml`, `fleet-intelligent-enrich.yml`, `auto-enrich-closed-loop.yml` | exact couples only, apply-safe tiers, provisional leads stay provisional |
| Monday upstream watch (≈ 07:00) | existing `blakadder-fetch.yml`, `market-couples-intake.yml` (Z2M/ZHA), `oss-lan-source-enrich.yml` and `kb-refresh.yml` (tuya-local), `johan-thread-intel.yml` | incremental, Firecrawl optional |
| Bases de connaissances (≈ 06:20) | existing `homey-knowledge-refresh.yml`, `kb-refresh.yml` | |
| Gmail diags (≈ 12:00) | existing `fetch-diags.yml`, `gmail-diagnostics.yml` (CI secrets; AI providers optional) | |
| Homey réponses (anti-flood) | `scripts/automation/reply-candidates.cjs` in `automation-loop.yml` → `data/progress/reply-candidates.json` | **candidates only, never posted by CI** |
| Athom publish watch | `.github/scripts/athom-publish-policy.js` (P3036 + P3048) in every upload path | CI never triggers an upload |
| Self-maintenance (t539u) | `automation-loop.yml` (self-maintain, watchdog), existing `storage-cleanup.yml` (caches / artifacts), Dependabot | see below |

## CI autofix (deterministic)

`ci-autofix.yml` listens to the non-publish CI workflows (Node 22 tests, Homey App Validate, Syntax Check,
Unified CI/CD, Validate Homey App, Platform Budget). On a failed first attempt `ci-failure.cjs handle`:

- reads the failed jobs and their logs, classifies them **transient** (network, 5xx, 429, runner shutdown,
  registry hiccup, learned literals) or **real**;
- re-runs the failed jobs **once** when transient (attempt 1 only), with at most 3 automatic re-runs per
  workflow in 24 h and at most 3 occurrences of the same signature in 24 h (stricter than the 3 per
  signature asked);
- records everything else under a `workflow|job|step|normalised message` signature;
- never touches a publish workflow (name or path matching publish / release / promote / draft-to-test /
  athom / deploy-pages), never commits, never comments.

Mechanical fixes stay with the existing scripts (`repo-autopilot.yml`, `safe-auto-commit.js` gates); no
new code-writing automation was added.

## Athom upload policy in code (master)

Kept from P3036 / P3042: green CI on the SHA (or a code-identical ancestor), at most 1 successful upload
per 24 h, one lock, no upload while a build is processing, 1 retry on a transient error, breaker on a real
error, `stateMeta`, bisect mode only while `athom-bisect-state.json` says `running`.

New in P3048: **at least 120 min after the last upload of ANY of the 3 apps** for master
(`crossAppMinIntervalMin`, env override `ATHOM_CROSS_APP_MIN_INTERVAL_MIN`). The master gate refreshes the
stable and bastien build snapshots read-only. The hold is `deferred`, so the existing self-heal slot retries
later; a manual `force_publish` dispatch stays the only override. The automation never starts an upload.

## Public replies: anti-flood limits

CI never posts, comments, reacts or mails. `reply-candidates.cjs` lists an issue only when a commit pushed
to master in the last 60 days references it, CI on that commit is green, the thread is open, active in the
last 60 days, and the last message is neither from dlnraja nor from a bot; an issue listed in the last 14
days is not listed again. Limits for whoever replies (the Grok Bot routine "Homey réponses"):

- 1 reply per run, 3 per 7 days, 1 forum reply per 7 days, 14 days between two replies in one thread;
- 24 h quiet after any reply;
- stop on a warning, captcha, 403, 429, moderation or a remark about AI;
- never open / close / edit issues, react, mention third parties, answer Athom, moderators or bots, or
  revive a thread idle for more than 60 days.

## Digest `docs/progress/DIGEST.md`

Versions of master / stable-v5 / bastien-home, last known Athom outcome and P3036 gate state, failed runs
of the last 72 h, reply candidates, health over 7 days: workflows rescued by a re-run (flaky), repeated
failure signatures, margin under 17 000 combos in total and 1 008 per driver measured on the **published
payload** (artifact `platform-budget-report` of `platform-budget.yml` → `data/status/package-combos.json`),
raw source combos marked as indicative only, live caps of `auto-publish-on-push.yml`, watchdog findings.

## Self-maintenance (t539u)

- (a) `workflow-watchdog.cjs`: scheduled workflows that are disabled, stale (no scheduled run for
  2 × period + 6 h) or failing 3 times in a row, and real CI signatures repeated 3 times in 72 h →
  journal line + at most **one new issue per run**, label `automation-watch`, one per signature (marker
  `<!-- p3048-watch:SIG -->`), never a comment. Kill switch: variable `AUTOMATION_WATCH_ISSUES=false`.
- (b) Dependabot (actions + npm): `dependabot-auto-merge.yml` now waits for the PR's own workflow runs
  (`wait-pr-checks.cjs`: Homey App Validate, Node 22, Syntax) and merges with
  `--match-head-commit`, no `--auto` (master has no branch protection, `--auto` merged at once).
- (c) rotation and cleanup: journal rotation (above), OCR hash cache bounded, caches and artifacts by the
  existing `storage-cleanup.yml` (03:30 UTC).
- (d) `self-maintain.cjs`: a corrupt pointer or cache is restored from its last valid version in git
  history (20 commits), else reset to an empty skeleton; corrupt journal lines are dropped and counted.
- (e) self-improvement without AI: `ci-failure.learn` adds a literal to
  `data/automation/failure-patterns.json` only when the same normalised error was rescued by a re-run in
  2 distinct runs within 30 days and carries no code / test hint (additive, max 200, tested). Decoders and
  couples are only ever added from a source by the existing enrichment workflows — never invented.

Guards: no cron more often than hourly, `[skip ci]` commits, concurrency groups, `safe-auto-commit.js`
loop guard and daily cap, `ci-autofix` ignores re-run attempts and its own completions.

## Known limits

- Reply candidates cover GitHub issues only; forum threads still need the Grok Bot routine.
- The combo margin is as fresh as the last `platform-budget.yml` run (weekly, or on a push touching drivers).
- The per-signature cap of `ci-autofix` uses the journal, which the daily loop updates; between two loops
  the per-workflow cap (3 re-runs in 24 h, counted live from the API) is the effective guard.
- The watchdog only sees workflows with an active `schedule:`; dispatch-only workflows are not watched.
