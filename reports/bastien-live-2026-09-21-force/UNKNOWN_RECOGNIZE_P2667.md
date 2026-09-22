# P2667 — Bastien Unknown Nodes recognized + HOBEIAN light class

## Diags / dump
- Gmail harvest (local L3): 8 emails, no new FPs (blocked secrets path).
- Live Developer Tools still showed **Unknown Node** for IEEs that were previously interviewed.

## Unknown → recognized (do not invent — SSOT only)

| IEEE (Dev Tools) | Couple | Driver | Action |
|------------------|--------|--------|--------|
| `7c:c6:b6:ff:fe:a3:e1:58` | `_TZ3000_axpdxqgu`+`TS0041` | `button_wireless_1` | Remove Unknown → pair Bastien 1-btn |
| `a4:c1:38:bb:8f:37:ee:17` | `_TZ3000_dzwgk7e2`+`TS0042` | `button_wireless_2` | Remove Unknown → pair Bastien 2-btn |

Code map: `lib/zigbee/BastienIeeeIdentity.js`

## HOBEIAN when broken vs works
| State | Tip | Symptom | Fix |
|-------|-----|---------|-----|
| Broken | ≤1.0.34 | blank pid, ~5k TX, class socket Energy | tip-lag + electrical flood |
| Works | ≥1.0.40 | calm mesh, pid filled | P2662–P2665 |
| Works+ | ≥1.0.42 | `setClass(light)` | P2667 (Z2M: wall switch, no metering) |

## Virtuals (still Homey Zigbee)
vsxvaj9i→`button_wireless_3`, ltt60asa→`switch_4gang`, fllyghyj/eWeLink→`climate_sensor`

## User
1. Update Bastien ≥**1.0.42** + restart
2. Remove Unknown Nodes → re-pair under Bastien button drivers
3. Re-pair Virtuals; Repair HOBEIAN lights
4. Flows: Button pressed → lights
