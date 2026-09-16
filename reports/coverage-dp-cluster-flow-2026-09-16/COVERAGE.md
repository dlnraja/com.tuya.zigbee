# DP × Cluster × Flow coverage — 2026-09-16

Critical gaps: **0**

## Drivers / Flow
- Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5851

## Clusters
- Compose unique: 35
- Lexicon size: 44
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 198
- Registry couples (Tuya EF00-eligible): 199
- Covered: 197 (99%)
- Skipped brand/external soft-watch: 18
- Uncovered:
  - _TZB210_rkgngb5o|TS0501B
  - _TZE200_8eazvzo6|TS0601

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
