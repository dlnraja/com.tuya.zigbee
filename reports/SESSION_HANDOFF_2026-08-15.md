# SESSION HANDOFF — 2026-08-16 (~01:20 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Cursor rule: `.cursor/rules/operational-memory-2026-08-15.mdc` (alwaysApply).

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | tip + **P140 ZT08 DP17** (pending publish) | **9.0.531** ✅ until next Auto-Publish |
| Stable | `stable-v5` | **5.12.82** | 5.12.82 |

App ID (both): `com.dlnraja.tuya.zigbee`.

## Just shipped locally (push next) — GH #513 / P140
Root cause of ZT08 temp=0 after ZT08 driver pair (Finnamu on 9.0.505):
1. MCU needs **Unix-1970** `mcuSyncTime` then **DP17=false ~500ms** (Z2M #29627) — was missing.
2. `guessFormat` wrongly preferred `tuya_dual_2000` for hodyryli — fixed → `z2m_dual_1970`.
3. ClimateInference could lock on MCU **0°C** and smooth away the first real reading — fixed.

Files: `drivers/climate_sensor_zt08/device.js`, `lib/tuya/GlobalTimeSyncEngine.js`, `TuyaTimeSyncFormats.js`, `MCUFormatDatabase.js`, `lib/IntelligentSensorInference.js`, `test/issue-513-hodyryli-scale.test.js`.

## Sources status

| Source | Result |
|--------|--------|
| Homey Test | **9.0.531** (last verified) |
| Gmail gate | verdict **ok**, unknown=0 |
| Forum silent | 0 new FPs |
| Open issues | **#513** — awaiting retest after P140 publish |

## Athom / P139
- Do not spam republish on `socket hang up` / `processing_failed` if Test healthy.
- Never Publish Stable→Test to heal master.

## User-action leftovers (no code)
- PresentSky: re-pair dimmer as `wall_dimmer_tuya`
- Welsh / Kanbros / Peter: update Test ≥9.0.531

## Commands
```bash
git pull --ff-only origin master
gh run list --repo dlnraja/com.tuya.zigbee --limit 12
node --test test/issue-513-hodyryli-scale.test.js
node tools/ci/gmail-crash-pattern-gate.js
```

Updated: 2026-08-16T01:20Z
