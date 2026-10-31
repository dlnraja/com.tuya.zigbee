# Automation first (P3097, 2026-10-31)

The project has to keep going when no assistant is running: enrichment, CI self-repair, diagnostics,
ports and publication run on free GitHub Actions minutes (public repo) with `GITHUB_TOKEN` and the
secrets already configured. An AI layer may help, only inside included quotas, and is never required.

Rules:
1. Every fix or lesson lands together with its automation: a workflow step, a gate, a ratchet or a
   scheduled job, plus one test (dual-runner) that proves it is wired.
2. New scripts in `tools/` or `scripts/` must be called by a workflow, a `package.json` script or another
   script. `scripts/ci/unwired-script-ratchet.js` warns on new unwired ones (baseline in
   `config/unwired-scripts-baseline.json`, frozen; shrink it, never grow it by hand).
3. Workflows use cron and/or `workflow_run`, a `concurrency` group, quoted step names that contain
   `: `, and commit only through `scripts/ci/bot-commit-guard.sh`; validation goes through
   `scripts/ci/homey-validate-safe.sh`.
4. No automatic public post (forum, GitHub comments on third-party threads, email) outside the explicit
   anti-flood queue. Publishing keeps the P3036 caps and the AggregateError breaker.
5. Any automation that stops succeeding inside its window is re-dispatched by
   `autonomy-watchdog.yml` and shows in its run summary.

## Self-learning guardrails (t643u) — all required

1. **Bounded learning, data only.** What the workflows learn goes only into
   `config/autonomy-learned.json` (signature, fix, successes, failures), capped at 200 entries with the
   oldest rotated out and a 7-day event window (`scripts/ci/autonomy-learn.js`). Automation never edits
   workflows, gates or secrets on its own.
2. **Promotion / demotion.** A signature becomes an automatic fix only after 3 successes and no failure
   in the last 7 days; one failure demotes it immediately.
3. **Every self-commit** goes through `bot-commit-guard.sh`, the full gates and green CI before it
   counts. Additive only: no automatic removal of couples, drivers or tests.
4. **Budgets.** ≤3 attempts per signature / 24 h, ≤6 self-commits / day, a global breaker after 5
   failures / 24 h, and the kill switch: creating `config/autonomy-paused` stops every self-action.
5. **Least privilege.** Each workflow declares minimal `permissions:`; no `pull_request_target` running
   untrusted code; text from issues, PRs or the forum is data, never executed or interpolated in `run:`.
6. **Rollback.** If CI turns red after a self-commit, it is undone with a `git revert` commit (never a
   force-push) and its signature is demoted.
7. **Weekly digest.** One human-toned weekly summary of what was learned, fixed, reverted or blocked.
