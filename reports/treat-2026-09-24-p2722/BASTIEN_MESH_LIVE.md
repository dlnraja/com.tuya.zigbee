# Bastien house live diag — 2026-09-24 (Chrome WebBridge + Homey CLI)

Logged in: Dylan (guest) on Homey account **Bastien Andrieu** · Homey **Homey Pro de Bastien** (id `65d495eb252c3ef65c879247`).

Chrome MCP (cursor-ide-browser) was **not** logged in — used **Kimi WebBridge** against real Chrome cookies.

## App tip (Athom)
| App | Installed on box | Athom Test healthy | Broken attempt |
|-----|------------------|--------------------|----------------|
| Zigbee Bastien | **1.0.93** | **1.0.93** #103 | **1.0.94** #104 `processing_failed` (socket hang up) |

→ Publish job soft-continued (P139) while Homey correctly stayed on 1.0.93. Tip-lag was **Athom reject**, not Homey ignoring updates.
→ Retry tip: **1.0.95** (P2723 + same payload as 1.0.94 fixes).

## Remotes (Zigbee tools) — high TX error (sleepy)
| Node | Name | Couple | Last seen | TX / TX Err | RX | Route |
|------|------|--------|-----------|-------------|-----|-------|
| 3 | Bouton sans fil 1 | `_TZ3000_axpdxqgu`+TS0041 | ~29m | 229 / **148 (65%)** | 74 | 0→5→3 |
| 7 | Bouton sans fil 3 | `_TZ3000_vsxvaj9i`+TS0043 | ~15m | 348 / **270 (78%)** | 161 | 0→7 |
| 18 | 2-Boutons | `_TZ3000_dzwgk7e2`+TS0042 | ~27m | 449 / **378 (84%)** | 40 | 0→6→18 |

Devices tool: remotes Ready/Available, batteries painted, drivers `button_wireless_{1,2,3}` under Zigbee Bastien.
Settings still show `enable_battery_notifications=true`, `battery_report_interval=24`, `optimization_mode=balanced`.

**P2723:** `applyEnergyOptimization` / `requestBatteryUpdate` now honor `skipBatteryReporting` (was a TX hole when settings change).

## Unknown mesh nodes (no Homey device)
| Node | IEEE | RX | Note |
|------|------|-----|------|
| 14 | a4:c1:38:bb:8f:37:ee:17 | ~946 | Not in Devices tool — orphan / unpaired |
| 15 | a4:c1:38:c1:17:76:42:f4 | ~5648 | Active RX; route via 20 |
| 19 | a4:c1:38:e6:74:3a:00:da | ~1267 | Orphan |

## Routers OK
HOBEIAN ZG-301Z + NodOn radiators + `_TZ3000_ltt60asa`+TS0004: TX err ~0%.

## Actions
1. Wait Athom Test **1.0.95** (or sideload if owner CLI)
2. Update + restart Zigbee Bastien on box
3. Press remotes → Flow → relays
4. Optional: Repair or remove Unknown nodes 14/15/19

Silent only — no forum POST.
