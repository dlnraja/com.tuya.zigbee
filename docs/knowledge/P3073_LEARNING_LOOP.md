# P3073 — Free, local, deterministic learning loop (design)

Status: design written 26/10/2026 20:50 CET during the repo FREEZE; implementation started 26/10/2026 23:30 CET after the rewrite.
Ground rules: free GitHub minutes only, no new cloud, AI optional (included quotas only, everything works with AI off),
additive only, manifest growth 0 (master headroom 285.5 KB), bounded structures, candidates promoted only through
existing rules (one reliable source + exact mfr+pid couple + recorded source). Reports via scripts/lib/report-writer.js
(our own words, links not quotes, credits).

## 1. CI / run learning (reuses what exists)
- Input: data/progress/automation-journal.jsonl, already filled daily by `ci-failure.cjs collect` in automation-loop.yml
  (fail / transient / recovered lines with normalised message, signature, sha, branch). No new API calls needed;
  optional `--fetch` mode re-uses scripts/automation/gh.cjs with GITHUB_TOKEN.
- New `scripts/learning/ci-signatures.cjs` (pure functions + CLI):
  - `category(msg, step, job)`: timeout-flaky, i18n-gap, size, athom-api (socket hang up / AggregateError / invalid_state),
    lint, cancelled, network, test, validate, other.
  - Ledger `data/learning/ci-signatures.json`, capped (300 signatures, LRU by lastSeen), per signature: category, workflow,
    job/step unit, first/last seen, fails, transient, recovered, branches (max 4), one normalised sample (<= 160 chars).
  - Flakiness per unit (workflow/job/step, plus the test title when the line carries a mocha `N) title` or node:test
    `not ok N - title`): recovered-on-same-sha / failures over 14 days.
  - Proposals only (report table): e.g. "timeout-flaky seen 3x recovered -> raise that test's timeout"; never edits a gate,
    a ratchet baseline or failure-patterns.json (ci-failure.cjs `learn()` already owns transient-pattern learning).
- Wiring: one additive step in automation-loop.yml after "CI failures -> journal", plus `data/learning` in the
  safe-auto-commit paths (P3069 area: notebook note first).

## 2. Device / runtime learning
- Inputs (already collected, nothing new): .github/state/diagnostics-report.json (fetch-gmail-diags, CI-only, redacted),
  data/diag-ids.json, any log file passed on the CLI (scripts/diag/diag-triage.js formats).
- New `scripts/learning/device-observations.cjs`: per EXACT couple (a file with a single couple, or a line carrying both
  ids) aggregate: DPs seen but unmapped, raw min/max, SmartDivisor votes (raw/parsed -> /1,/10,/100,/1000; anomaly when
  two divisors compete), median report interval per DP, unavailable count, MEMWARN / MEM-BUDGET count and max heap.
- Output `data/leads/learning-candidates.json`: max 200 couples x 16 DPs, `status: "candidate"`, `source` recorded,
  rolling eviction by lastSeen. Never written into drivers; promotion stays manual/rule-based.

## 3. In-app self-learning (master only, soak)
- New `lib/learning/DpScaleLearner.js`, same shape as lib/energy/PowerSelfCalibration.js (fixed table): max 16 DP slots
  per device, each = divisor votes (4 counters), raw min/max, EMA interval, sample count.
- Hook: one guarded line in lib/tuya/TuyaEF00Manager.js right after the existing SmartDivisor `smartParse` (auto-convert
  path only, never for DPs with explicit dpMappings), lazy creation on first report (nothing at pairing, no 0xEF00 sent).
- Adaptation: after restart, a divisor with >= 20 votes and >= 90 % share re-seeds SmartDivisorManager via the existing
  `rememberLearnedDivisor()` (its cache already rejects out-of-range values). Never adds or removes a capability.
- Persistence: `setStoreValue('p3073_dp_learn', compactArray)` at most once per 24 h; soak + memory test (100k samples,
  constant size). Master only until soak, entry in config/architecture/sync-decisions.json.

## 4. Upstream & community watch (user ask t590u) — plan, implement after resume
Goal: the project follows other projects and forums by itself, free and regularly, by EXTENDING existing schedules
(veille upstream, KB enrich, forum scan / forum-poll, auto-enrich-closed-loop, johan-thread-intel, oss-lan-source-enrich,
peer-complementary-enrich, daily-digest) — no new cron unless none fits.
- Sources: Zigbee2MQTT / zigbee-herdsman-converters, ZHA quirks, deCONZ, Johan's app and its forks, Athom apps + SDK
  changelog, tuya-local / localtuya / tinytuya, Hubitat drivers, Home Assistant integrations, Homey forum threads.
- Incremental: one since-last-seen cursor per source in `data/learning/upstream-cursors.json` (commit sha / release tag /
  ETag / last post id), so each run only reads the diff; polite pacing, back-off on 429/403, GITHUB_TOKEN only.
- Extraction (deterministic): new/changed exact couples, DP numbers + scales, cluster quirks, SDK deprecations; each
  becomes a bounded ledger line in `data/learning/upstream-delta-ledger.json` (cap, LRU) with source URL + license note.
- Promotion: candidates go to data/leads/* only; existing rules decide (one reliable source, exact couple, recorded
  source, our own words + CREDITS.md). Behaviour changes master first, soak, then stable.
- Reports: one weekly human summary through report-writer (links, counts, what was promoted, what waits), no public post.

## 5. Privacy
- Personal files removed in P3074 (26/10/2026, one-time history rewrite approved by the owner); the CI
  personal-data guard keeps them out. The learning files above hold device ids, counts and public links only.

## Tests (one per change)
p3073-ci-signatures (fixtures, cap, flakiness), p3073-device-observations (exact couple only, caps), p3073-dp-learner
(bounded, daily throttle, no capability change, soak), p3073-upstream-cursors (incremental, cap, back-off);
privacy: test/p3074-personal-data-guard.test.js.
