# SESSION HANDOFF — 2026-08-16 (~11:45 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Cursor rule: `.cursor/rules/operational-memory-2026-08-15.mdc` (alwaysApply).

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | **9.0.534** + P142 branding push in flight | was **9.0.533** (Finnamu OK); Auto-Publish P142 → next |
| Stable | `stable-v5` | **PR #530 MERGED** (P139 + ZT08 DP17 + TYZB01) | tip after merge publish |

App ID (both): `com.dlnraja.tuya.zigbee`.

## Finalized this session

| Item | Status |
|------|--------|
| P140 ZT08 / GH **#513** | **CLOSED** — Finnamu: values correct on 9.0.533 |
| P141 TYZB01 ZCL-only + nt4pquef DP2 | Shipped on master |
| P142 anti-slop branding | Pushed: name **Universal Tuya Zigbee**, 12 `air_purifier_*` deprecated, quieter logs |
| Stable PR **#530** | **MERGED** → `a61b999` |
| Forum silent scan | 0 new FPs |
| Auto-Publish | P142 run `31939879443` in progress — do **not** spam if Athom hang (P139) |

## User-action leftovers (no code)

- PresentSky: re-pair dimmer as `wall_dimmer_tuya` if still climate
- Peter #2137: update Test tip after P142 publish; SOS/contact retest
- Other hybrid placeholders (`_hybrid_*_needs_device_assignment` on non-purifier drivers) remain M09 warnings — next cleanup wave

## Vision (keep)

```
Universal Tuya Zigbee
master = soak / Test | stable-v5 = reliability only
Sacred Couple | silent forum | no AI paste
```

## Commands
```bash
gh run list --repo dlnraja/com.tuya.zigbee --workflow="Auto-Publish on Push" --limit 5
node --test test/issue-513-hodyryli-scale.test.js
node tools/ci/forum-silent-multi-scan.js --max=40
```

Reports: `reports/QUALITY_VISION_FORUM_P142_2026-08-16.md`, `reports/SACRED_COUPLE_DEEP_INVESTIGATION_2026-08-16.md`

Updated: 2026-08-16T09:45Z
