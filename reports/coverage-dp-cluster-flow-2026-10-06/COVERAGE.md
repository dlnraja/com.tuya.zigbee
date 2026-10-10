# DP × Cluster × Flow coverage — 2026-10-06

Critical gaps: **0**

## Drivers / Flow
- Drivers: 447
- With flow.compose: 447
- Without: none
- Flow card entries (compose): 5864

## Clusters
- Compose unique: 36
- Lexicon size: 45
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 209
- Registry couples (Tuya EF00-eligible): 215
- Covered: 208 (96.7%)
- Skipped brand/external soft-watch: 20
- Uncovered:
  - _TZE204_nkjintbl|TS0601
  - _TZE200_nkjintbl|TS0601
  - _TZ3000_axpdxqgu|TS0041
  - _TZ3000_vsxvaj9i|TS0043
  - _TZ3000_ltt60asa|TS0004
  - _TZ3000_dzwgk7e2|TS0042
  - _TZ3000_fllyghyj|TS0201

## Flow heuristic smoke
```json
{
  "undeclaredReturnsNull": true,
  "remoteResolves": true,
  "sceneResolves": true,
  "capabilityResolves": true
}
```

## Commands
```bash
node tools/ci/sync-dp-couple-knowledge.js --apply
npm run audit:dp-couples
npm run flow:l99
```
