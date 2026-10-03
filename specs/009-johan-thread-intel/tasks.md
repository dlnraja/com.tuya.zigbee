# Tasks 009
- [~] T1 Scanner (issues + PRs + comments, incremental cursor) done via scripts/scanners/johan-canonical-index.js; Discussions (GraphQL) still to add
- [x] T2 Structured extractor (mfr/pid/DP/cluster/firmware/links/authors), no body persisted
- [ ] T3 Optional free-AI summariser (our wording only), budget guard, off by default
- [~] T4 `needs_deep_read` status + deep-read log (rules produced, files changed)
- [x] T5 Daily workflow (cron, free, concurrency, commit leads with [skip ci])
- [ ] T6 Deep read #797 + similar threads → rules/quirks/fingerprints/docs + CREDITS
- [x] T7 Merge with spec 005 scanner (johan-canonical-index.js) to avoid two scanners

Workflow: .github/workflows/johan-thread-intel.yml (daily 03:40 UTC). needsDeepRead=true on all 670 threads after the text purge; deep-read log still to build (T4).
