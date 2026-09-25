# DP × Cluster × Flow coverage — 2026-09-20

Critical gaps: **1**

## Drivers / Flow
- Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5876

## Clusters
- Compose unique: 36
- Lexicon size: 44
- Missing from lexicon: 1
  - 0xFC11 (64529)

## DP knowledge
- Knowledge couples: 209
- Registry couples (Tuya EF00-eligible): 212
- Covered: 208 (98.1%)
- Skipped brand/external soft-watch: 20
- Uncovered:
  - _TZE204_nkjintbl|TS0601
  - _TZ3000_axpdxqgu|TS0041
  - _TZ3000_vsxvaj9i|TS0043
  - _TZ3000_ltt60asa|TS0004

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
