# P217 — Fork & alternative-app harvest (2026-08-17)

Silent enrichment from JohanBendz PRs/issues and sister forks. No forum posts. No GPL code copy.

## Classification

| Finding | Track | Why |
|---------|-------|-----|
| Sacred-couple reroutes (garage, double outlet, Wing contact, HOBEIAN USB 2ch) | **MASTER_ONLY** first (new/moved FPs) | Pairing identity; soak on 9.0.x before stable |
| TS0203 pid default contact (not water leak) | **BOTH** candidate | Wrong pid default misroutes every unknown TS0203 |
| Dooya DP1 command on position set | **BOTH** candidate | Reliability: motor never moved on DP2 |
| HomeSuite feature managers (last-seen UI, rejoin cards, TX pacer) | **MASTER_ONLY** | Already on master; do not dump onto stable |
| HomeSuite onUninit / Poll Control skip / battery no-invent | **BOTH** | Already soaked (9.0.582 / 5.12.84) |

## Sources scanned (read-only)

JohanBendz forks recently pushed: Diddern, onesilop, map1981, MalmFredrik, ErnieV, moKorean, Mmaaikel.
dlnraja forks: jamesi8086, PDominikPL, late4marshmellow, packetninja, AreAArseth.
Alternatives: gpmachado/com.gpm.homesuite (GPL-3.0 ideas only), AreAArseth/com.hobeian, Trebbit/TuyaZigbeeExtraDevices.

## Implemented (master)

| Couple | Driver | Was | Source |
|--------|--------|-----|--------|
| `_TZE200_wfxuhoea` + TS0601 | `garage_door` | `button_wireless_plug` | Johan #1442 LoraTap + Z2M GARAGE |
| `_TZ3000_k6fvknrr` + TS011F | `double_power_point_2` | `switch_1gang` | Johan PR #1437 onesilop |
| `Wing` + TS0203 | `contact_sensor` | missing | Johan PR #1439 Diddern |
| `Wing` + ZTH11-3.0 / ZTH13-3.0 | `climate_sensor` | missing pids | Johan #1429 / #1422 |
| `HOBEIAN` + ZG-305Z | `switch_2gang` | pid on `button_wireless_2` | Johan PR #1435 map1981 |
| `Zbeacon` + TS011F | `plug_smart` | already present | Johan PR #1421 ErnieV |
| Dooya `_TZE200_3ylew7b4` position TX | `UnifiedCoverBase` DP1 | DP2-only | Johan PR #1431 (already RX multi-DP) |

## Not copied / deferred

- New `curtain_motor_dooya` / `zemismart_6gang` driver trees from Johan PRs — we already have `curtain_motor` + `switch_wall_6gang`. Behaviour reimplemented, not file-copied.
- FingerBot ~10s ignore (Johan #1438) — device MCU click-mode cooldown; our debounce is 800ms. No code change.
- HomeSuite GPL sources — ideas already classified in `.ai/KNOWLEDGE_CACHE.json`.

## Cartesian note

Adding brand `HOBEIAN` to `switch_2gang` is required for Homey pairing of `ZG-305Z`. `switch_2gang` also lists `TS0601`, so `HOBEIAN+TS0601` can appear as a second match beside soil/contact drivers. Runtime `getDriverId(HOBEIAN, ZG-305Z)` is exact; `HOBEIAN+TS0601` stays on existing soil/climate compound keys.
