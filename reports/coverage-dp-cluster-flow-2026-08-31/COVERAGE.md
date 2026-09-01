# DP × Cluster × Flow coverage — 2026-08-31

Critical gaps: **0**

## Drivers / Flow
- Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5065

## Clusters
- Compose unique: 34
- Lexicon size: 34
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 121
- Registry couples (Tuya EF00-eligible): 134
- Covered: 120 (89.6%)
- Skipped brand/external soft-watch: 7
- Uncovered:
  - _TZ3000_pjb1ua0m|TS0203
  - _TZ3000_wkai4ga5|TS0044
  - _TZ3000_xffhmvhv|TS004F
  - _TZ3000_ufhtxr59|TS0044
  - _TZ3000_mtnpt6ws|TS0002
  - _TZ3210_ddigca5n|TS011F
  - _TZ3000_v5498kdm|TS0001
  - _TZE200_127x7wnl|TS0601
  - _TZE284_upt8lzi0|TS0601
  - _TZ3000_a4xycprs|TS0044
  - _TZE200_jthf7vb6|TS0601
  - _TZ3000_cvis4qmw|TS0006
  - _TZ3000_g9chy2ib|TS0003
  - _TZ3000_etufnltx|TS1002

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
