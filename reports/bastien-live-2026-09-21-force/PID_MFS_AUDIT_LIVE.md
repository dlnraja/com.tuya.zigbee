# Bastien mesh PID+MFS audit (live dump 2026-09-22)

> Network key redacted — rotate Homey Zigbee key if this dump was shared publicly.

| Node | mfr | pid | Driver | compose | mfs | Action |
|------|-----|-----|--------|---------|-----|--------|
| Homey Pro | Athom B.V. | Homey Pro | EXTERNAL | — | — | OK |
| Radiateur Salon/Cuisine | NodOn | SIN-4-FP-21 | EXTERNAL (NodOn app) | — | — | OK |
| Unknown `7c:c6:b6:…` | `_TZ3000_axpdxqgu` *(via IEEE)* | TS0041 | `button_wireless_1` | OK | OK | Remove → re-pair Bastien |
| salon/cuisine | eWeLink | CK-TLSR8656-SS5-01(7014) | `climate_sensor` | OK | OK | Delete Virtual → Bastien Climate |
| 8× lights HOBEIAN | HOBEIAN | **ZG-301Z** | `switch_1gang` | OK | OK | Update ≥1.0.45 + Repair (TX ~5.3k = tip/heal not applied) |
| Sous sol / chambre principal TH | `_TZ3000_fllyghyj` | SNZB-02 | `climate_sensor` | OK | OK | Delete Virtual → Bastien Climate |
| Unknown `a4:c1:38:bb:8f:…` | `_TZ3000_dzwgk7e2` *(via IEEE)* | TS0042 | `button_wireless_2` | OK | OK | Remove → re-pair Bastien |
| Appareil Zigbee | `_TZ3000_vsxvaj9i` | TS0043 | `button_wireless_3` | OK | OK | Delete Virtual → Bastien Button 3 |
| Eclairage salon | `_TZ3000_ltt60asa` | TS0004 | `switch_4gang` | OK | OK | Delete Virtual → Bastien 4-gang |

## Verdict
- **All sacred couples locked** in compose + DeviceFingerprintDB + mfs (case forms unioned P2669b).
- **No invent pid** — Unknown Nodes resolved only via IEEE SSOT.
- HOBEIAN pid now visible as `ZG-301Z` (was blank on older tip) — good.
- Mesh flood still ~5.3k TX/node → Homey still on tip **&lt;1.0.45** or Repair not run after update.
