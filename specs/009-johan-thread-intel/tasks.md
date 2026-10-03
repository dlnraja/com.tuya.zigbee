# Tasks 009
- [x] T1 Scanner (issues + PRs + comments + Discussions via GraphQL incl. replies, incremental cursor) in scripts/scanners/johan-canonical-index.js; Discussions soft-skip without token or when disabled (JohanBendz repo: disabled as of 2026-10-03)
- [x] T2 Structured extractor (mfr/pid/DP/cluster/firmware/links/authors), no body persisted
- [ ] T3 Optional free-AI summariser (our wording only), budget guard, off by default
- [~] T4 `needs_deep_read` status + deep-read log (rules produced, files changed): data/leads/johan-deep-read-log.json started (#797 family)
- [x] T5 Daily workflow (cron, free, concurrency, commit leads with [skip ci])
- [~] T6 Deep read #797 + similar threads (2026-10-03: #797, #1246, #1284, #964, #1291, #1461 read → docs/rules/JOHAN_797_STANDARD_ZCL_TEMP_RH.md, new temphumidsensor_zcl_ts0601; leads: zbeacon TH01 on doorwindowsensor_4, rxq4iti9 on device_radiator_valve; remaining needsDeepRead threads continue) → rules/quirks/fingerprints/docs + CREDITS
- [x] T7 Merge with spec 005 scanner (johan-canonical-index.js) to avoid two scanners

Workflow: .github/workflows/johan-thread-intel.yml (daily 03:40 UTC). needsDeepRead=true on all 670 threads after the text purge; deep-read log still to build (T4).
