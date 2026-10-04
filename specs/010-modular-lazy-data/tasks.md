# Tasks: spec 010
- [x] T1 Baseline: `scripts/perf/boot-heap.js` + golden couple→driver resolution file (before any change).
- [ ] T2 `lib/data/ShardLoader.js` with LRU cap + TTL and unit tests (R21).
- [ ] T3 Shard generator `scripts/gen/shard-data.js` (fingerprints.json by pid/prefix) + index; no runtime switch yet.
- [ ] T4 Switch one read path (fingerprint lookup) to ShardLoader behind a fallback to the full file; compare golden + perf.
- [ ] T5 Lazy-require audit: list heavy modules required at boot; move optional ones to first use.
- [ ] T6 Deferred non-critical layers after init (bounded scheduler).
- [ ] T7 Split files > 1500 lines behind unchanged exports (one per PR, tests green).
- [ ] T8 CI perf comparison (warn > 10 %).
- [x] T0 Research the design sources listed in spec.md (SDK v3 lifecycle/perf/memory, homey-zigbeedriver, zigbee-clusters, Athom brand apps, Johan, Aqara, IKEA, Sonoff, Hue, community Zigbee apps); write findings with links in `docs/rules/R22_ARCHITECTURE_SOURCES.md`; credits.
