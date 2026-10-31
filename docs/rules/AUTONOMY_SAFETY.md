# Autonomy safety (P3097, t644u)

Automation must stay under control, consistent, well-meaning and secure.

## Security
- Third-party actions pinned by commit SHA (Dependabot `github-actions` ecosystem keeps the pins fresh).
- Minimal `permissions:` per workflow/job; default read-only.
- Secrets never printed: mask derived values with `::add-mask::`; no `set -x` around secrets.
- No `pull_request_target` that checks out or runs PR code.
- Secret scanning (GitHub secret scanning / gitleaks) and `tools/ci/personal-data-guard.js` in CI;
  the guard also runs daily on master, stable-v5 and bastien-home (`autonomy-watchdog.yml`).
- `CODEOWNERS` covers `.github/` and `config/`.

## Control
- `scripts/ci/bot-commit-guard.sh` refuses any bot commit that stages workflows, gates, guards,
  CODEOWNERS/dependabot, the Spec Kit constitution, these rules or the kill switch.
- Kill switch `config/autonomy-paused`; learning bounded per `docs/rules/AUTOMATION_FIRST.md`.

## Consistency
- Weekly cross-branch audit (parity of scripts/tests, compose ↔ app.json drift, couples) on master,
  stable-v5 and bastien-home.

## Well-meaning
- No automatic external posting (forum, third-party GitHub threads, email). Public replies go only
  through the explicit anti-flood queue with the maintainer's approval. No spam, no Athom contact.

## Decisions (t646u)
`scripts/autonomy/decide.js` applies `config/autonomy-policy.json` (first matching rule wins) to each
event: red CI, AggregateError, new couple from Z2M/ZHA, SDK change, diagnostic crash, drift, soaked fix,
publish slot. It acts alone only when confidence ≥ 0.8 and the action is reversible; otherwise the
decision is a note for the weekly digest. Publishing stays behind auto-publish-on-push gates (P3036).
Deleting couples/drivers/tests, editing workflows/gates/secrets and external posting are refused.
Every decision is appended with its reason to `.github/state/autonomy-decisions.jsonl` (last 1000).
Both files are protected by bot-commit-guard.

## Injection & malicious input (t647u)
- Forum, issues, PRs, comments, diagnostics, mails and upstream data are inert data: never `eval`,
  never executed, never downloaded-and-run.
- In workflows, untrusted event text (`github.event.issue.title`, `…body`, `…head.ref`, commit
  messages) is never interpolated in `run:`; it goes through `env:` and is quoted in shell (tested).
- `scripts/autonomy/sanitize.js`: removes control/invisible/bidi characters, caps size (20 kB), and
  only accepts strict formats (mfr, pid, DP 1–255, cluster 0–0xFFFF) plus an allowlist of https sources
  (Z2M, herdsman-converters, ZHA quirks, Homey forum, this repo, Blakadder, JohanBendz).
- Only the deterministic engine decides, from validated structured fields; a new couple without a
  valid exact pair and trusted source is deferred. An optional AI layer may summarise text but can never
  trigger an action.
- No `pull_request_target` that checks out PR code (tested); minimal permissions; actions pinned by SHA
  (pinning of existing workflows = next step, Dependabot keeps pins fresh).
- Tests feed malicious payloads: shell injection in mfr/pid, spoofed source host, http source,
  zero-width characters, fake maintainer orders and secret references in a forum post.

## Resource guardrails (t649u)
- **CI/CD:** every job has `timeout-minutes` and every workflow a `concurrency` group; this is enforced
  by `scripts/ci/workflow-resource-gate.js` in `code-quality.yml` (today 0 offenders, so any new one
  fails). Budgets: `platform-budget.yml` / `scripts/ci/platform-budget-gate.js` (minutes, storage),
  `storage-cleanup.yml` (caches/artifacts), ≤3 attempts per signature and ≤6 self-commits/day
  (`autonomy-learn.js`), API calls with ETag and stop on 403/429 (`upstream-watch.js`), forum polling
  rate-limited in `forum-poll.yml`.
- **App runtime:** heap budget and hazard ratchet (`scripts/ci/memory-budget.js`,
  `memory-hazard-ratchet.js`, `load-heap-sim.js`, `tools/ci/homey-heap-json-gate.js`), OTA download
  skipped when the heap is high (P3091), MemwarnGuard. Bounded caches/queues, listener-leak checks,
  event-loop lag guard and per-model degradation (Pro 2016/2019/2023) are rules for all new code.
- **Software:** dependency size is held by `scripts/ci/publish-size-gate.cjs` (manifest headroom).

## Performance (t650u)
`scripts/ci/perf-budget-gate.js` measures manifest parse time and heap; report-only until 7 stable
samples exist, then budget = median × 1.3, blocking with `PERF_BLOCKING=1`. App-side optimisations
(lazy data chunks, memoised normalisers, debounced capability writes, less Zigbee traffic) are
behaviour changes: master first, soak, then port. CI parts (cache reuse, path filters, mocha shards)
go to all 3 branches.

## Granularity (t651u)
- **Kill switches:** global `config/autonomy-paused`, or per feature
  `config/autonomy-paused.{enrich,autofix,publish,learn,watch}` (`autonomy-learn.js paused <feature>`).
- **Policy overrides** in `config/autonomy-policy.json` → `overrides`, scoped by branch, workflow,
  driver family, driver, exact couple (`mfr|pid`) or DP. The most specific scope wins
  (DP > couple > driver > family > workflow > branch); an override can force an action (e.g. defer) or
  change the confidence threshold. Shipped: stable-v5 needs 0.95 for couples; Bastien never publishes
  from the engine.
- **Budgets** per signature (3/24 h) and per day (6 commits); per-workflow resources via
  `workflow-resource-gate.js`.
- **Commits:** one change per commit; reports per job (step summaries) and per driver where relevant.
