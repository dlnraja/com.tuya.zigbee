# Source digest rule (P3138 — t734u / t735u / t736u)

Every source reader (forum scan, Gmail/diag triage, issues/PR triage, upstream-watch, Johan/forks scanners,
KB refresh, SSOT enrich, crash-triage, upstream thread miner) produces the **same structured digest** through
`scripts/lib/source-digest.js`:

| field | meaning |
|---|---|
| problem / cause / resolution | deterministic sentence picks (no AI) |
| status | open / merged / closed-resolved / closed-unresolved (labels + state_reason) |
| implications | couples (mfr\|pid, ledger-matched), drivers, DPs, clusters, firmware, pids |
| adopt / avoid / regressions | what to copy, what never to do, what to watch after updates |
| linked, credit | source links; credited authors only |
| candidateTasks | actionable implications → `data/leads/digest-candidates.json` (never auto-applied) |
| ai | optional summary, redacted, capped, injection-filtered, never alters facts |

## Guards (all readers)
- Diff mode: per-source cursors (`since` / heads) + ETag; adaptive frequency (quiet runs back off 6h → 7d).
- No-AI deterministic fallback is the default; AI only via free local quota, treated as data.
- External text is data only: sanitized (control/bidi chars, HTML comments stripped), capped, never executed.
- Least privilege: read-only job; a separate commit job with `contents: write` via `safe-auto-commit.js`.

## Privacy (t736u) — fail closed
Only technical facts are stored (mfr, pid, DP, clusters, firmware). Redacted with context-preserving
placeholders: usernames not needed for credit (`[user-1]`), IEEE (`[IEEE-1]`), rooms (`[pièce A]`), device
names (`[nom appareil]`), clock times (`[soirée]`/`[matinée]`/`[après-midi]`), routines/presence (`[habitude]`),
coordinates (`[lieu]`), emails (`[email]`), Homey ids (`[homey-id]`). Behaviour patterns are never inferred or
stored. `scripts/ci/digest-guard.js` + `tools/ci/house-data-guard.js` run on every generated digest and ledger
before commit; any hit fails the job. Test: `test/p3138-source-digest.test.js` (planted habit string).

## Outputs
- `docs/knowledge/upstream/<owner>__<repo>.md` — bounded (200 newest digests per repo), diff-mode.
- `data/ssot/thread-digests.json` — couple → digest refs (SSOT link; joins `couple-sources.json` by key).

## Rollout status
Shared module + guard: miner (P3138) and SSOT enrich. Other readers adopt it incrementally: each must call
`build()` + `assertClean()` before writing; a reader that writes free text without it is a rule violation.

## Rollout to existing readers (P3152+, t735u)

Each reader gets `node scripts/ci/digest-guard.js --delta <paths>` right before its commit step, on the same
paths it commits. `--delta` checks only lines added vs HEAD (and untracked files), strips machine ISO-8601
run stamps, and fails closed: on a hit the paths are reset and the step exits 1, so nothing is committed.
One reader per push, all three branches.

| Reader | Workflow | Status |
|:--|:--|:--|
| forum | forum-poll.yml | P3152 |
| Gmail/diag | gmail-diagnostics.yml | pending |
| issue/PR triage | auto-bot-issue-triage.yml | pending |
| upstream-watch | upstream-watch.yml | pending |
| Johan/forks | johan-thread-intel.yml | pending |
| KB | kb-refresh.yml | pending |
| crash-triage | crash-triage.yml | pending |
