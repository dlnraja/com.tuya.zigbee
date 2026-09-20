# Complementary enrich from andiwirz/com.tuyalocal (P2619 / P2621 / P2641 / P2642)

**Doctrine:** P2520 complementary variant enrich — **UNION / append / fallback**, never wipe working Zigbee or WiFi drivers.

**Full Homey peer catalog (Live/Test tips + GitHubs):** [`COMPLEMENTARY_HOMEY_APPS.md`](./COMPLEMENTARY_HOMEY_APPS.md) · SSOT `config/architecture/complementary-homey-apps-ssot.json` (P2643)

## Credits (mandatory)

| Source | Author | License | Links |
|--------|--------|---------|-------|
| **Tuya Local** Homey app | Andi Wirz (@andiwirz) + Claude | MIT | [GitHub](https://github.com/andiwirz/com.tuyalocal) · [Store Live](https://homey.app/a/com.tuyalocal/) · [Store Test](https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/) |
| Homey Community thread | Community + Andi | — | [T154077 — App Pro: Tuya Local](https://community.homey.app/t/app-pro-tuya-local/154077) |
| Athom tip (probe) | — | — | Live **1.0.232** · Test **1.0.237** |

Also credit peers in the catalog: Johan `com.tuya.zigbee` Live **0.2.76**, Drenso `com.tuya2`, Heine `com.tuya.cloud`, Device Capabilities, HA make-all/tuya-local, Z2M/ZHA/Blakadder.

Runtime attribution: `lib/data/SourceCredits.js` → `TUYA_LOCAL_ANDIWIRZ` (+ `JOHAN_TUYA_ZIGBEE`, …).

We **do not** copy their app wholesale. We re-implement ideas into our `lib/tuya-local/*` + `drivers/wifi_*` stack so Universal Tuya / Stable / Bastien stay independent App IDs.

## What we absorbed (complementary)

| Idea (com.tuyalocal) | Our landing | Track |
|----------------------|-------------|-------|
| Protocol try order 3.3→3.4→3.1→3.5→3.2 | `UdpDiscoveryKeys.PAIRING_PROTOCOL_ORDER` | BOTH (LAN client) |
| Command gap + offline grace | `wifiLanReliabilitySettings.js` | BOTH |
| Category DP hints (rs, qccdz, ywbj, hjjcy…) | `WiFiDPRegistry.js` UNION | MASTER_ONLY (WiFi) |
| Dedicated heat pump / kettle / EV drivers | `wifi_heat_pump`, `wifi_kettle`, `wifi_ev_charger` | MASTER_ONLY |
| Fix-It helpers | `lib/wifi/WifiFixIt.js` | MASTER_ONLY |
| EV phase JSON block (L1/L2/L3) | `EvChargerPhaseJson.js` + `wifi_ev_charger` | MASTER_ONLY |
| Stale-data watchdog (HB alive, DPS dead) | `TuyaLocalClient` P2641 | BOTH |
| IR learn / smoke / weather / level DP tables | registry + docs (drivers when needed) | MASTER_ONLY |
| Charge history proven session kWh (not e/d guess) | `EvChargerChargeHistory.js` P2642 | MASTER_ONLY |
| Fire-and-forget SET (3.4/3.5 / pulse) | `wifiLanReliabilitySettings` + `TuyaLocalClient` P2642 | BOTH |
| OEM work_state IDLE/WORKING/… | `mapEvChargerWorkState` P2642 | MASTER_ONLY |

## Dual-app / Bastien

- **MASTER_ONLY:** new WiFi drivers, Fix-It UI, EV phase JSON, category catalog growth.
- **BOTH:** LAN client reliability (command gap, offline grace, stale-data reconnect) when present on Stable WiFi subset.
- **Bastien:** Zigbee mesh app — only if a future Bastien WiFi path exists; default **no** Bastien change for tuyalocal WiFi enrich.

## Contre quoi

- `npm run check:p2619` / `check:p2621` / `check:p2641` / `check:p2642`
- Never invent Zigbee `productId` from WiFi category codes.
- Never overwrite explicit `dpMappings` in a driver (registry fills **gaps only**).
- Never invent EV session kWh from ambiguous phase-JSON `e`/`d` (prefer charge history).

## Ref snapshot

Local shallow clone (dev only, not shipped): `Documents/homey/com.tuyalocal-ref` (tip **1.0.237**)  
Homey Store Test: https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/  
Prior extract: `reports/tuyalocal-ref-2026-09-20/`
