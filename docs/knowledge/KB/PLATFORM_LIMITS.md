# Platform limits (P3026)

Every limit this project can hit, where it comes from, what we measure on each branch and how much
room is left. Measured on 25/10/2026 (Paris time) with `scripts/ci/platform-budget-gate.js`, which
reads `config/platform-limits.json`. Text in our own words; sources linked, not copied.

**How to read it.** "self" = a ceiling we set ourselves from past Athom outcomes (Athom documents no
number for these). "hard" = a published platform limit. The gate warns at 80 % and fails at 90 % of
each limit (the combos cap has its own 99 % / above-cap rule, see below). It runs in **report mode**
(never fails CI); switch `"mode": "block"` in `config/platform-limits.json` once the report has
stayed green for a week on all three branches.

Run it: `node scripts/ci/platform-budget-gate.js [--publish-dir <prepared dir>] [--online] [--json]`.
CI: `.github/workflows/platform-budget.yml` (read-only: builds and prepares in RUNNER_TEMP, never
uploads to Athom, never pushes; per-ref concurrency with cancel-in-progress).

## 1. Athom upload (prepared payload, `scripts/prepare-publish.js` output)

| Limit | Kind | Value | master | stable-v5 | bastien-home |
|---|---|---|---|---|---|
| Uploaded app.json (compact) | self | 4 MiB | 3.09 (77 %) | 2.75 (69 %) | 0.48 (12 %) |
| Uncompressed payload | self | 50 MiB | 31.36 (63 %) | 37.30 (75 %) | 21.56 (43 %) — was 21.8 |
| Gzip archive | self | 20 MiB (warn 10) | 9.22 (46 %) | 15.87 (79 %) | 5.63 (28 %) — was 5.83 |
| Zigbee manufacturerName × productId | self | `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS` (15500 live, 14000 fallback) | 15470 (99.8 %) | 15498 (100 %) | 4044 (26 %) |
| Drivers in the upload | info | — | 347 | 341 | 27 |

- Largest payloads Athom accepted (from `docs/knowledge/athom-publish-outcomes.jsonl`):
  stable 5.12.449 (38.33 MB, 4631 files, app.json 3.5 MB), master 9.0.1520 (35.85 MB, 4537 files,
  app.json 3.93 MB), bastien 1.0.168 (21.11 MB). Same-size master builds also failed with
  `socket hang up`, so size alone does not explain failures (see `ATHOM_LIMITS.md`:
  `AggregateError` is not a byte threshold).
- An older commit noted Athom rejecting archives above ~16 MB (single observation). **stable-v5
  sits at 15.87 MiB gz**: the closest branch to that anecdotal line. Its driver PNGs are photo-like
  RGB images that no lossless tool shrinks further (oxipng: 0 driver files gain); only a lossy
  re-encode would, and that changes images, so it is not done.
- The combos total is filled up to the cap on purpose: prepare-publish trims unpinned case variants
  until the total fits. A prepared payload just under the cap is expected; the gate only fails when
  it is ABOVE the cap (compactor bypassed). Uncapped demand on master: 16972 couples. The cap and
  which couples survive belong to P3024b.
- Athom upload queue: already serialized. `publish.yml` uses one group for every master upload,
  the per-app publish workflows (auto-publish, stable, bastien) use per-app groups, all with
  `cancel-in-progress: false`; self-heal and draft-to-test as well. GitHub's `queue: max` (up to
  100 waiting runs per group) would avoid dropping a pending run but changes publish behaviour, so
  it is only listed here.

## 2. Homey runtime memory

| Limit | Kind | Value | master | stable-v5 | bastien-home |
|---|---|---|---|---|---|
| Boot heap, every module loaded (`scripts/perf/boot-heap.js`) | self | 45 MB (P3023 "elevated") | 33.9 (75 %) | 35.4 (79 %) | 36.3 (81 %) |
| Boot + every lazy data file parsed at once | self | 45 MB | 39.4 (88 %) | 40.9 (91 %) | 41.8 (93 %) |

- P3023 `lib/memory/MemoryBudget.js` tiers: elevated 45, high 60, critical 75 MB heap. The
  worst-case row is a pessimistic upper bound (DP catalogue + its 32 shards + fingerprints +
  fp-shards all resident together, which lazy loading avoids); reaching it only moves the app into
  the "elevated" tier, where it sheds caches. That is the budget working, not a crash.
- Homey itself (community reports, Athom publishes no number; the SDK only documents the
  `memwarn` / `cpuwarn` events): Homey Pro 2023+ warns around 120–150 MB RSS, kills after repeated
  warnings (~50 s) and immediately above ~300 MB; Homey Pro 2016–2019 around 80 MB. The worst case
  above is about a third of the Pro 2023 warning level.

## 3. GitHub Actions, repository, API

| Limit | Kind | Value | Measured | Use |
|---|---|---|---|---|
| Workflow file size | hard | 500 KB | largest 48.6 KB | 10 % |
| Concurrent jobs (Free plan) | hard | 20 (5 macOS) | — | concurrency groups + path filters |
| Job / workflow run duration | hard | 6 h / 35 days | — | — |
| Matrix jobs | hard | 256 | — | — |
| Actions cache per repo | hard | 10 GB (LRU eviction) | **10.66 GB, 341 entries** | **107 %** |
| Cache upload / download rate | hard | 200 / 1500 per min | — | — |
| GITHUB_TOKEN REST quota | hard | 1000 req/h per repo (PAT 5000/h) | 0.7 % used | — |
| Repository size | soft | 1 GB advised, 5 GB strongly | ~0.9 GB | 18 % of 5 GB, ~84 % of 1 GB |
| Single tracked file | hard | 100 MiB (warn 50) | 12.1 MB | 12 % |

Sources: docs.github.com/en/actions/reference/limits, GitHub REST rate-limit docs, GitHub
repository-size docs. The repo is public, so standard-runner minutes and artifact storage are free.

### Actions cache: cause and fix

- 111 entries named `node-cache-Linux-x64-npm-<hash>` (~85 MB each, 9.35 GB): `setup-node` with
  `cache: npm` keys on the hash of `package-lock.json`, and every release bump rewrites the
  lockfile's own `version`, so each release produced a new npm cache. That pushes useful state
  caches (master diags 337 MB, needs-info, forum, gmail-diag, resolver state, quirks db) towards
  eviction.
- Fix (P3026, all branches): `.github/npm-cache-key.sha256` = hash of the lockfile without the
  app's own name/version (`scripts/ci/npm-cache-key.js --write`), used as
  `cache-dependency-path` by every safe `setup-node` step. A release no longer creates a cache; a
  dependency change still does. A stale key only means more downloads (`npm ci` installs from the
  lockfile either way). Six jobs that check out another ref at the root keep the default.
- Old entries are left to age out by LRU. Deleting them is an action outside the box and needs
  the owner's approval.
- Update 2026-10-25: the owner approved it; the old npm entries were removed by hand, leaving
  237 caches / 1.26 GB. The `actions/cache/usage` endpoint trails the real list for hours after
  a bulk delete (it still said 10.5 GB / 339 entries while the list held 1.26 GB), so trust the
  list (`/actions/caches`), not the usage figure, right after a cleanup.

### Automatic storage cleanup (P3033)

`.github/workflows/storage-cleanup.yml` runs every day at 03:30 UTC on master (scheduled
workflows only run from the default branch, and the cache API covers every branch of the repo,
so one copy is enough; stable-v5 and bastien-home do not get one). Manual runs take `dry_run`
(default on) and `max_deletions`. Rules live in `scripts/ci/storage-cleanup.js`:

| Object | Deleted when | Never deleted |
|---|---|---|
| Cache | an older entry of the same family on the same ref exists (family = key minus trailing hash / run id / version) | the newest entry of each family on master, stable-v5, bastien-home |
| Cache | its branch is gone or its PR is closed (`refs/pull/N/merge`) | when the branch/PR list could not be read, this rule is skipped |
| Cache | the newest entry of a non-state family was not used for 7 days | the newest entry of a state cache found in the workflows (`run_id` keys such as gmail-diag-state, resolver-state, diag-ledger-queue, quirks-db, xr-*; names with state/baseline/ledger/queue) |
| Artifact | older than 14 days | the newest artifact of a name another run downloads later (`forum-poll`, `sanitized-diagnostics-report`, `digest-leads-*`) |

The state and cross-run lists are read from the workflow files and `.github/actions/*/action.yml`
on each run, so a new state cache is protected without editing the script. Calls go through
`.github/scripts/retry-helper.js` (403/429 waits, 5xx backoff), pages are capped at 40 and
deletions at 400 per kind per run (largest first). The job summary gives counts and sizes before,
after and deleted, and a warning annotation fires when the cache is still at 80 % or more of
`gha_cache_gb` in `config/platform-limits.json`. It never fails and blocks nothing. Kill switch:
`vars.STORAGE_CLEANUP_DISABLED`; `vars.STORAGE_CLEANUP_DRY` turns the schedule into a dry run.
Stale `bot/*` PRs and branches are not touched here; `repo-autopilot.yml` (P3022) already does that.

First real run (2026-10-25 02:40 Paris): 220 caches / 1.19 GB and 251 artifacts / 12.1 MB
deleted, 0 errors. Caches went from 240 / 1.50 GB to 20 / 309 MB (3.1 % of the quota): one
newest entry per family on master (18), stable-v5 (1) and bastien-home (1). The biggest kept
families are the cross-research state caches of master (`xr-master-*`, up to ~85 MB each).
Known side effect: jobs on one ref that restore npm caches with two different lockfile hashes
(the jobs that check out another branch) keep only the newest hash, so the other one downloads
again on its next run. That costs time, not correctness.

### Other CI changes

- `.github/scripts/retry-helper.js`: a 403/429 with `x-ratelimit-remaining: 0` and no
  `Retry-After` now waits until `x-ratelimit-reset` (capped by `maxDelay`) instead of failing.
- `homey-app-validate.yml`: docs/reports/Markdown-only pushes skip it (no required status check).
- `shadow-policy-check.yml`: per-ref group, a newer push cancels the older run (read-only check).
- bastien-home and stable-v5 `.homeyignore`: `backups` (13 MB of app.json dumps on bastien were
  copied into `.homeybuild`; prepare-publish already stripped them from the upload).
- bastien-home: 880 driver PNGs recompressed losslessly (pixel-identical RGBA check), as master
  already was.

## 4. Not done, and why

- **Case-variant dedup in the manifest beyond the current compactor**: no proof that Homey's
  pairing match is case-insensitive; removing a case form could leave a device unpaired.
- **Deleting old Actions caches**: done since 2026-10-25 by the daily storage-cleanup workflow
  (P3033, owner approved), see above.
- **Lossy image compression on stable-v5**: would change images.
- **`queue: max` on the Athom publish groups**: changes publish behaviour.
- **The combos cap value**: owned by P3024b.

## Tests

`test/critical/p3026-platform-budget.test.js` (limits config, thresholds, combos rule, live cap,
report mode, npm cache key, rate-limit wait) and `test/critical/p3026-driver-images.test.js`
(PNG signature and Homey sizes for every driver image). `test/critical/p3033-storage-cleanup.test.js`
covers the cleanup rules (families, protected refs, state caches, gone refs, cap, artifact age,
workflow parsing, quota threshold).
