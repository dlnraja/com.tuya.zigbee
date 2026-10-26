# CI concurrency on a busy master (P3069)

**What went wrong (26 Oct 2026):** several workers pushed to master every few minutes. The Node 22
test workflow used `cancel-in-progress: true`, so every new push killed the run that was still going.
The seven runs started between 18:51 and 19:21 (Paris time) were all cancelled, so nobody got a
verdict on the strict job.

**What we changed:** in `.github/workflows/node22-tests.yml`, a push now lets the running job finish
(`cancel-in-progress` is only true for pull requests).

**Why this costs no extra minutes:** a concurrency group holds at most one running job and one
waiting job. When a newer push arrives, GitHub drops the older *waiting* run, not the running one. So
a burst of ten pushes gives two runs, not ten: the one already running, then one run on the newest
commit. That newest run tests every commit before it too, so nothing is skipped. Before the change, the
same burst also gave runs that were started and thrown away, which wasted minutes and never finished.

**Pull requests** keep cancelling, because only the latest head of a PR matters.

**Good to know**
- A burst can still drop some commits from the queue. That is fine, because the next run tests the
  newest commit, and it contains all the earlier ones.
- Each job keeps its `timeout-minutes: 25`, so a stuck run cannot block the group for long.
- Same setting, second batch (P3069 step 3): the push-triggered checks whose verdict matters —
  `homey-app-validate`, `syntax-check`, `doc-coverage`, `shadow-policy-check`, `ci-self-check`,
  `code-quality` and `platform-budget`. `unified-ci.yml` belongs to another work stream and keeps its
  own rule.
- Left on plain `cancel-in-progress: true` on purpose: scheduled or manual jobs (scrapers, digests,
  knowledge refreshes, Gmail checks, stale/labeler bots), where a newer run simply replaces an older one
  and nothing is lost, and PR-only workflows (`pr-gate`, `labeler`, `dependabot-auto-merge`,
  `validate`), for which the new expression would give the same result anyway. `deploy-pages` is a
  deployment, not a check; it stays as it is.

Thanks: the GitHub Actions documentation on `concurrency` groups explained the one-running,
one-waiting rule this relies on.
