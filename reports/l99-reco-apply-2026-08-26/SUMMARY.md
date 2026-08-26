# L99 recommendation harvest — applied 2026-08-26 (P2286–P2288)

## Classify — ALL actionable items

| Item | Track | Status |
|------|-------|--------|
| Soft-expect post-createBuild / peer-test | BOTH | **done** |
| IAS leftover EF00 unit gate (pure helper) | BOTH | **done** |
| Sacred-keep publish compaction test (P2288) | BOTH | **done** |
| Expanded publish-sacred-keep couples (forum-verified) | BOTH | **done** |
| P2270 `402vrq2i` bleed metering | BOTH | **done** |
| P2270 `hlx9tnzb` bleed switch_1gang | BOTH | **done** |
| p2138 compounds (kfu8zapd, xabckq1v, 4upl1fcj, qeuvnohg, HOBEIAN 3315-S) | BOTH | **done** |
| unified-ci check:p2284–p2288 + prune-fp | MASTER | **done** |
| Stable unified-ci + package scripts + backport | STABLE | **done** |
| Stable mrpevh8p DB + TuyaUnifiedDevice wrapHandleFrame | STABLE | **done** |
| WORKFLOW_GUIDELINES §P2286 publish path | MASTER | **done** |
| Weakness V9 IAS → FIXED | BOTH | **done** |
| SoftHypothesis MISSING_PID invent | — | **hold** (doctrine: never invent) |
| D024 TH05-z ZigbeeTLc custom flash | — | **watch** (upstream only) |
| SergeP Nous/SoPhos `_TZ3000_v5498kdm` | — | **doNotTouch** |
| Forum / PM replies | — | **never** (T157628) |

## Verify (local green)

```bash
npm run check:p2269   # SSOT docs incl. PUBLISH_SSOT
npm run check:p2284 && npm run check:p2285 && npm run check:p2286 && npm run check:p2287 && npm run check:p2288
node --test test/critical/p2270-discussion-harvest-gate.test.js
node tools/ci/p2138-sacred-couple-matrix-gate.js
node tools/ci/prune-fp-collision-bleed.js --check
```

## SSOT index (update each evolution)

| SSOT | Path |
|------|------|
| Dual-app tracks | `config/architecture/dual-app-tracks.json` |
| Publish | `config/architecture/publish-ssot.json` + `docs/architecture/PUBLISH_SSOT.md` |
| Sacred keep pins | `config/architecture/publish-sacred-keep-couples.json` |
| Discovery lineage | `config/enrichment/discovery-lineage.json` |
| Resilience gaps | `config/resilience/critical-gaps.json` |
| Protocol TX/RX | `docs/architecture/PROTOCOL_TX_RX_SSOT.md` |
| L99 apply log | `reports/l99-reco-apply-2026-08-26/SUMMARY.md` |

## User action (silent)

Update Test on both apps after publish; re-pair when driver class changed (Tongou, BSEED, meter91, Peter buttons, SunBeech remote).
