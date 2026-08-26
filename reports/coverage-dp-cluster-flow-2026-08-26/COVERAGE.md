# DP × Cluster × Flow coverage — 2026-08-26

Critical gaps: **0**

## Drivers / Flow
- Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5049

## Clusters
- Compose unique: 34
- Lexicon size: 34
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 78
- Registry couples: 118
- Covered: 78 (66.1%)

## Flow heuristic smoke
```json
{
  "undeclaredReturnsNull": true,
  "remoteResolves": true,
  "sceneResolves": true
}
```

## Commands
```bash
node tools/ci/sync-dp-couple-knowledge.js --apply
npm run audit:dp-couples
npm run flow:l99
```
