# P2321 — Complementary enrichment from alt apps + forum users (2026-08-30)

Policy: silent enrich only (T157628). Ideas from GPL apps → original MIT reimplementation. Never invent pids.

## Users / apps scanned

| Source | Who | Signal |
|--------|-----|--------|
| Forum T140352 / T155646 | **Gabriel_Pedrosa_Mach** (HomeSuite author) | Multi-gang EP isolation, rejoin, power restore, NovaDigital couples |
| Forum T140352 #2191 | **Toni_UrbanoMarquez** | `_TZE284_6ocnqlhn`+TS0601 → `din_rail_meter` (already locked) |
| Forum T99614 | SergeP / Nous | `_TZ3000_v5498kdm`+TS0001 → already P2320 `switch_1gang` |
| GitHub | gpmachado/com.gpm.homesuite v1.0.24 | Availability double-teardown race; quiet ZBMINIR2 poll; `mtnpt6ws` |
| GitHub | JohanBendz PR #1452 | `_TZ3210_ddigca5n`+TS011F metering plug |

## HomeSuite couple harvest

- Drivers: **36** · unique couples vs Universal Tuya: **61 present**, **13 missing**
- Missing mostly **SONOFF / Aqara / eWeLink** (out of Universal Tuya scope) + short mfr tokens `S/O/N/F`+BASICZBR3
- **Tuya gap taken:** `_TZ3000_mtnpt6ws`+`TS0002` (Nous L13Z / AVATTO 2-gang module)

## Ported (complementary — additive)

| Item | Track | Where |
|------|-------|--------|
| `_TZ3000_mtnpt6ws`+TS0002 → `switch_2gang` | BOTH | compose + registry `p2321-mtnpt6ws-ts0002-2gang` |
| `_TZ3210_ddigca5n`+TS011F → `plug_energy_monitor` | BOTH | compose + registry `p2321-ddigca5n-ts011f-nous-a9z` |
| Availability `destroy()` sync + idempotent unregister | BOTH | `DeviceAvailabilityManager` + `app.onUninit` |
| Device unregister on `_destroyDevice` | BOTH | `TuyaZigbeeDevice` |
| Quiet-mains 5 min `zclVersion` poll (ZBMINIR2/MINI-ZBD/BASICZBR3) | MASTER_ONLY | `TuyaZigbeeDevice._maybeStartQuietMainsAvailPoll` |

## Not copied / deferred

- Sonoff SNZB-* / Aqara FP1 / Dongle-E — different product line; leave to HomeSuite / Athom
- HomeSuite GPL sources — **no code copy**
- Gabriel bulk mfr×pid cartesian (TS0001–TS0601 for every NovaDigital mfr) — **do not invent**; keep per-pid sacred locks already in registry
- `zigbee-clusters@3.6.1` bump — track separately (SDK dep risk)

## Commands

```bash
node tools/ci/_tmp-homesuite-harvest.js   # or reports/homesuite-harvest-2026-08-30/
node node_modules/mocha/bin/mocha.js test/critical/p2321-homesuite-complementary.test.js
node tools/ci/anti-bot-regression-gate.js
```
