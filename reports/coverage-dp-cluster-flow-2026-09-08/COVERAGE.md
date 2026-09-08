# DP × Cluster × Flow coverage — 2026-09-08

Critical gaps: **0**

## Drivers / Flow
- Drivers: 431
- With flow.compose: 431
- Without: none
- Flow card entries (compose): 5819

## Clusters
- Compose unique: 34
- Lexicon size: 43
- Missing from lexicon: 0

## DP knowledge
- Knowledge couples: 121
- Registry couples (Tuya EF00-eligible): 175
- Covered: 120 (68.6%)
- Skipped brand/external soft-watch: 15
- Uncovered:
  - _TZE284_fodv6bkr|TS0601
  - _TZE284_fhvpaltk|TS0601
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
  - _TZ3210_w0qqde0g|TS011F
  - _TZE204_a2jcoyuk|TS0601
  - _TZE200_r32ctezx|TS0601
  - _TZ3000_uw3dadam|TS0202
  - _TZE284_0ints6wl|TS0601
  - _TZE200_e3oitdyu|TS0601
  - _TZE200_uj3f4wr5|TS0601
  - _TZ3000_u3nv1jwk|TS0044
  - _TZ3000_otvn3lne|TS0202
  - _TZE204_81yrt3lo|TS0601
  - _TZ3210_tgvtvdoc|TS0207
  - _TZE200_vuqzj1ej|TS0601
  - _TZE200_2aaelwxk|TS0601
  - _TZE200_kccdzaeo|TS0601
  - _TZE200_khzbklyh|TS0601
  - _TZE200_jfw0a4aa|TS0601
  - _TZE200_iba1ckek|TS0601
  - _TZE200_dfxkcots|TS0601
  - _TZE200_p0gzbqct|TS0601
  - _TZE200_fjjbhx9d|TS0601
  - _TZE200_aqnazj70|TS0601
  - _TZE200_mexisfik|TS0601
  - _TYZB01_qeqvmvti|TS0011
  - _TZE200_mja3fuja|TS0601
  - _TZE200_2ekuz3dz|TS0601
  - _TZE204_qasjif9e|TS0601
  - _TZE204_sxm7l9xa|TS0601
  - _TZE200_3towulqd|TS0601
  - _TZE200_3p5ydos3|TS0601
  - _TZ3000_mmkbptmx|TS0004
  - _TZ3000_ruxexjfz|TS0002
  - _TZ3000_3dfewsk1|TS0207
  - _TZ3000_wkai4ga5|TS0042
  - _TZE204_zenj4lxv|TS0601
  - _TZB210_rkgngb5o|TS0502B
  - _TYZB01_6g8b7at8|TS0012
  - _TZ3210_0zabbfax|TS0503B
  - _TZE204_ex3rcdha|TS0601
  - _TZE200_yjjdcqsq|TS0601

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
