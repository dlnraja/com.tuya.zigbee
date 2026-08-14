# Multi-source sweep P127 (2026-08-14)

## Trigger
Continue analyze/improve/fix; automate max cases. Post-P126 remote at **v9.0.491** (local was behind).

## Sources scanned
| Source | Result |
|--------|--------|
| GH Actions (recent) | Unified CI last P126 green; prior P122–P125 flow-watchdog failures |
| GH Issues | **#516** humidity ÷10 (`_TZ3000_isw9u95y` TS0201); #513 climate install (needs-maintainer) |
| Gmail crash gate | ok (18 known / 0 unknown) |
| Forum | silent only (no post) |
| bare-zigbee | 6 allowlisted leftovers after migrations |
| fingerprints DB | **poisoned** secondary routes for iadro9bf / imaccztn / pcdmj88b |

## Fixes
| Area | Change |
|------|--------|
| `lib/tuya/fingerprints.json` | Sacred couples: iadro9bf→presence, imaccztn→relay, pcdmj88b→TRV, clrdrnya→presence |
| `lib/data/BOT_FORCED_DISCOVERY.json` | Expanded families for same couples |
| `UnifiedSensorBase` | `_scaleZclHumidity` + MfrHelper fallback; DATA-RETRY no longer hardcodes `/100` (GH #516 / z2m #28987) |
| Bare migrate | `led_controller_dimmable`, `pir_mmwave_sensor`, `switch_wireless`, `remote_dimmer`, `air_purifier_din`, `remote_button_wireless_usb` → TuyaZigbeeDevice / UnifiedSwitchBase |
| `air_purifier_din` | Energy multiply→divide (P126 DIN pattern) + safe-timers |
| mmWave device.js | Removed dead clrdrnya from `MAINS_POWERED_RADARS` |
| Anti-bot | REQUIRED/FORBIDDEN expanded; **FP-DB assert** on `fingerprints.json` |
| bare-zigbee gate | Nested mixin + inline `.ZigBeeDevice` detection; `tuya_dummy_device` fixed exception |
| Allowlist | 4 leftovers: blaster_remote, ir_blaster, power_clamp_meter, smartPlug_DinRail |
| `unified-ci.yml` | Wire anti-bot, bare-zigbee, unbound-catch, adaptive `--hard` |

## Gates (local)
| Gate | Result |
|------|--------|
| bare-zigbee | violations=0 (bare=6) |
| anti-bot | PASS (compose + FP-DB) |
| adaptive-double-division `--hard` | hardHits=0 (2 soft lib) |
| unbound-catch | PASS |
| gmail-crash-pattern | ok |
| fp-collision | 0 new (187 current / 231 baseline) |

## Version
**9.0.492**

## Deferrals
- `ir_blaster` (1640), `smartPlug_DinRail` (745), `power_clamp_meter`, `blaster_remote`
- FP baseline prune (42 stale iadro9bf×climate “resolved” notices) — optional follow-up `--write-baseline`
- Issue #513 climate install — needs maintainer / more interview evidence
- `re-inject-manual-fixes.js` clrdrnya/iadro9bf reinject twin (partially covered by FP-DB gate)
